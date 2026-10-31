/**
 * THE AGENT LINK'S TRANSPORT B, PLUGIN SIDE — the relay between the local desktop bridge's WebSocket and the
 * main thread's dispatcher. Runs in the UI IFRAME: the main thread has no network (docs/18 §1), so the
 * iframe holds the socket and forwards envelopes both ways; the main thread runs every command through the
 * same `dispatch` the mailbox uses (`agent-dispatch.ts`), so the protocol and the handlers are shared.
 *
 *   bridge ──{command}──▶ relay ──agent-command──▶ main (dispatch) ──agent-result──▶ relay ──{result}──▶ bridge
 *
 * Connected only while the main thread reports the link ON; retried every `retryMs` while on (the bridge
 * may be started after the plugin), closed the moment it goes off. It forwards a result, progress reading
 * or log line only for a command IT delivered — mailbox commands' streams stay in the plugin.
 *
 * A RECONNECT DOES NOT LOSE A RESULT (#2497). A long command (minutes of main-thread work) can outlive the
 * socket it came in on. So the commands it delivered survive a lost socket (only switching the link off
 * forgets them), and it keeps the last `keep` results by command id. On every connect its `hello` names the
 * ids it holds (`held`: still running, or a result kept), then it re-sends every kept result. The server
 * matches each by id, resolves a waiting call once and ignores a repeat, and never re-sends a command, so
 * nothing runs twice. Progress and log lines streamed while disconnected are not replayed.
 *
 * CONTEXT-NEUTRAL: the socket is injected (`open`) as a structural type, not the DOM `WebSocket`, so the
 * Node test drives this exact module against the real bridge server. The panel passes the browser's.
 */
import type { UiToMain, MainToUi } from './messages';
import type { AgentLinkState } from './agent-protocol';

/** The bridge's default port. The manifest's `allowedDomains` names exactly this origin (#3147; `devAllowedDomains` before). */
export const BRIDGE_PORT = 17331;
export const BRIDGE_URL = `ws://localhost:${BRIDGE_PORT}`;

/** The slice of a WebSocket the relay uses — the browser's and Node's both satisfy it. */
export type WsLike = {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
};
const OPEN = 1;

export type RelayDeps = {
  open(url: string): WsLike;
  post(m: UiToMain): void;
  schedule(fn: () => void, ms: number): unknown;
  cancel(h: unknown): void;
  url?: string;
  retryMs?: number;
  /** How many results to keep for re-sending after a reconnect. */
  keep?: number;
};

export const createBridgeRelay = (deps: RelayDeps) => {
  const url = deps.url ?? BRIDGE_URL;
  const retryMs = deps.retryMs ?? 2000;
  const keep = deps.keep ?? 8;
  let wanted = false;
  let ws: WsLike | null = null;
  let connected = false;
  let retry: unknown = null;
  let state: AgentLinkState | null = null;
  const mine = new Set<string>();
  /** The last `keep` results for commands this relay delivered, oldest first, re-sent on every connect. */
  const kept = new Map<string, unknown>();

  const send = (obj: unknown): void => { if (ws && ws.readyState === OPEN) ws.send(JSON.stringify(obj)); };
  const setConnected = (c: boolean): void => {
    if (c === connected) return;
    connected = c;
    deps.post({ type: 'agent-bridge', connected: c });
  };

  const connect = (): void => {
    retry = null;
    if (!wanted || ws) return;
    let sock: WsLike;
    try { sock = deps.open(url); } catch { retry = deps.schedule(connect, retryMs); return; }
    ws = sock;
    sock.onopen = () => {
      if (ws !== sock) return;
      setConnected(true);
      send({ type: 'hello', state, held: [...mine, ...kept.keys()] });
      for (const result of kept.values()) send({ type: 'result', result });
    };
    sock.onmessage = (ev) => {
      if (ws !== sock || typeof ev.data !== 'string') return;
      let m: { type?: string; command?: { id?: unknown } };
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'command' && m.command && typeof m.command === 'object') {
        if (typeof m.command.id === 'string') mine.add(m.command.id);
        deps.post({ type: 'agent-command', command: m.command });
      }
    };
    const lost = () => {
      if (ws !== sock) return;
      ws = null;
      setConnected(false);
      if (wanted && retry === null) retry = deps.schedule(connect, retryMs);
    };
    sock.onclose = lost;
    sock.onerror = () => { try { sock.close(); } catch { /* already closing */ } lost(); };
  };

  const setWanted = (on: boolean): void => {
    if (on === wanted) return;
    wanted = on;
    if (on) { connect(); return; }
    if (retry !== null) { deps.cancel(retry); retry = null; }
    const sock = ws;
    ws = null;
    mine.clear();
    kept.clear();
    setConnected(false);
    try { sock?.close(); } catch { /* already closed */ }
  };

  /** Every message the main thread posts to the UI passes through here. */
  const fromMain = (m: MainToUi): void => {
    if (m.type === 'agent-link-state') {
      state = m.state;
      setWanted(m.state.on);
      send({ type: 'state', state });
    } else if (m.type === 'agent-result' && mine.delete(m.result.id)) {
      // Kept even when sent: a socket can read OPEN and still be dead, and then the send is lost.
      kept.set(m.result.id, m.result);
      if (kept.size > keep) kept.delete(kept.keys().next().value as string);
      send({ type: 'result', result: m.result });
    } else if (m.type === 'agent-progress' && mine.has(m.id)) {
      send({ type: 'progress', id: m.id, progress: m.progress });
    } else if (m.type === 'agent-log' && mine.has(m.id)) {
      send({ type: 'log', id: m.id, line: m.line });
    }
  };

  return { fromMain, connected: () => connected };
};
