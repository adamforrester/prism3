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
 * PAIRING (#3204, the owner's Q3204.1 A; the flow: `bridge-auth.ts`). The server opens every connection with a challenge.
 * The relay answers it with a hello proving the pairing token, which the main thread keeps in `figma.clientStorage` and
 * posts here (`agent-bridge-token`); it does not connect until that answer has arrived, so a stored token is never
 * mistaken for none. With no token it closes the socket and asks the person for the server's pairing code (`onPairing`
 * 'needed'), and stops retrying until one is entered (`pair`). The code goes out as a proof at the next challenge; the
 * token the server answers with goes to the main thread to keep (`agent-bridge-paired`), and the hello follows. A token
 * the server refuses (its secret was rotated) is dropped (`agent-bridge-unpaired`) and the code asked for again. The link
 * reads connected only once the server welcomes the hello.
 *
 * ONE BRIDGE, TWO FILES (#3297). The server lets a newer PAIRED connection replace the older one, so a reconnect wins over
 * a socket that died without a close. With Prism3's link on in two files on one machine, that made the two instances
 * evict each other on every 2 s retry, and the transport word flipped "bridge" ⇄ "mailbox" in both. Now the server closes
 * the replaced connection with `CLOSE.held`; the relay then knows another instance holds the bridge (`onHeld`), and until
 * it is welcomed again its hello carries `yield: true`, which the server refuses with `CLOSE.held` while a plugin is
 * attached instead of replacing it. Those polite retries back off from `retryMs` to `heldMaxMs`. The holder's own
 * reconnects send no `yield`, so the #2497 reconnect still replaces its dead socket.
 *
 * THE TRANSPORT WORD MOVES ONLY ON A SETTLED CHANGE (#3297). `agent-bridge` (what the main thread publishes, and so what the
 * status word reads) is reported apart from the live socket: a drop holds the last reported `connected: true` for
 * `holdMs`, and the post goes out only if no retry has been welcomed by then. A settled loss — the link switched off,
 * another instance holding the bridge, a pairing refusal — is reported at once. Commands are gated on the live socket.
 *
 * CONTEXT-NEUTRAL: the socket is injected (`open`) as a structural type, not the DOM `WebSocket`, so the
 * Node test drives this exact module against the real bridge server. The panel passes the browser's.
 */
import type { UiToMain, MainToUi } from './messages';
import type { AgentLinkState } from './agent-protocol';
import { CLOSE, helloProof, normalizeCode, pairProof } from './bridge-auth';

/** The bridge's default port. The manifest's `allowedDomains` names exactly this origin (#3147; `devAllowedDomains` before). */
export const BRIDGE_PORT = 17331;
/** Written out, not built from `BRIDGE_PORT`: esbuild cannot prove a string built from it pure, and so kept this module's
 *  constants in the offline build, which must carry no trace of the bridge (#3204). `test-agent-bridge.ts` holds the two
 *  equal. */
export const BRIDGE_URL = 'ws://localhost:17331';

/** The slice of a WebSocket the relay uses — the browser's and Node's both satisfy it. */
export type WsLike = {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code?: number }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
};
const OPEN = 1;

/** Where pairing stands, for the panel: nothing to ask; a code is needed (none kept yet, or the kept token was refused);
 *  the last code entered was wrong; or a code is on its way. */
export type BridgePairing = 'none' | 'needed' | 'refused' | 'wrong-code' | 'pairing';

export type RelayDeps = {
  open(url: string): WsLike;
  post(m: UiToMain): void;
  schedule(fn: () => void, ms: number): unknown;
  cancel(h: unknown): void;
  url?: string;
  retryMs?: number;
  /** How many results to keep for re-sending after a reconnect. */
  keep?: number;
  /** Told each time pairing changes, so the panel can ask for the code (#3204). */
  onPairing?(p: BridgePairing): void;
  /** How long a dropped socket keeps reading connected before the loss is reported (#3297). 0 reports at once. */
  holdMs?: number;
  /** The longest wait between retries while another instance holds the bridge (#3297). */
  heldMaxMs?: number;
  /** Told each time another instance starts or stops holding the bridge (#3297). */
  onHeld?(held: boolean): void;
};

export const createBridgeRelay = (deps: RelayDeps) => {
  const url = deps.url ?? BRIDGE_URL;
  const retryMs = deps.retryMs ?? 2000;
  const keep = deps.keep ?? 8;
  const holdMs = deps.holdMs ?? 5000;
  const heldMaxMs = deps.heldMaxMs ?? 30000;
  let wanted = false;
  let ws: WsLike | null = null;
  /** The live socket is welcomed: commands are heard. */
  let connected = false;
  /** What the main thread was last told (`agent-bridge`): the settled transport (#3297). */
  let reported = false;
  let holdTimer: unknown = null;
  /** Another paired instance holds the bridge (#3297): hellos `yield`, and retries back off. */
  let held = false;
  let heldDelay = retryMs;
  let retry: unknown = null;
  let state: AgentLinkState | null = null;
  const mine = new Set<string>();
  /** The last `keep` results for commands this relay delivered, oldest first, re-sent on every connect. */
  const kept = new Map<string, unknown>();
  /** The pairing token (#3204), once the main thread has said whether it keeps one (`tokenKnown`). */
  let token: string | null = null;
  let tokenKnown = false;
  /** A code the person entered, sent as a proof at the next challenge. */
  let code: string | null = null;
  let pairing: BridgePairing = 'none';
  const setPairing = (p: BridgePairing): void => { if (p !== pairing) { pairing = p; deps.onPairing?.(p); } };
  /** Waiting for the person to enter a code: nothing connects until they do. */
  const waitingForCode = (): boolean => (pairing === 'needed' || pairing === 'refused' || pairing === 'wrong-code') && code === null;

  const send = (obj: unknown): void => { if (ws && ws.readyState === OPEN) ws.send(JSON.stringify(obj)); };
  const report = (c: boolean): void => {
    if (holdTimer !== null) { deps.cancel(holdTimer); holdTimer = null; }
    if (c === reported) return;
    reported = c;
    deps.post({ type: 'agent-bridge', connected: c });
  };
  /** The live socket's state. A loss that is not `settled` holds the reported state for `holdMs` (#3297). */
  const setConnected = (c: boolean, settled = true): void => {
    connected = c;
    if (c || settled || holdMs <= 0 || !reported) { report(c); return; }
    if (holdTimer === null) holdTimer = deps.schedule(() => { holdTimer = null; if (!connected) report(false); }, holdMs);
  };
  const setHeld = (h: boolean): void => {
    if (!h) heldDelay = retryMs;
    if (h !== held) { held = h; deps.onHeld?.(h); }
  };
  /** The wait before the next retry: flat, or backing off while another instance holds the bridge. */
  const nextDelay = (): number => {
    if (!held) return retryMs;
    const d = heldDelay;
    heldDelay = Math.min(heldDelay * 2, heldMaxMs);
    return d;
  };

  const connect = (): void => {
    retry = null;
    if (!wanted || ws || !tokenKnown || waitingForCode()) return;
    let sock: WsLike;
    try { sock = deps.open(url); } catch { retry = deps.schedule(connect, nextDelay()); return; }
    ws = sock;
    let nonce = '';
    const hello = (): void => {
      send({ type: 'hello', state, held: [...mine, ...kept.keys()], proof: helloProof(token!, nonce), ...(held ? { yield: true } : {}) });
      for (const result of kept.values()) send({ type: 'result', result });
    };
    // Nothing is said on open: the server speaks first, with its challenge.
    sock.onopen = () => undefined;
    sock.onmessage = (ev) => {
      if (ws !== sock || typeof ev.data !== 'string') return;
      let m: { type?: string; command?: { id?: unknown }; nonce?: unknown; token?: unknown };
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'challenge' && typeof m.nonce === 'string') {
        nonce = m.nonce;
        if (code !== null) send({ type: 'pair', proof: pairProof(code, nonce) });
        else if (token !== null) hello();
        else { setPairing('needed'); drop(sock); }
        return;
      }
      if (m.type === 'paired' && typeof m.token === 'string') {
        token = m.token;
        code = null;
        deps.post({ type: 'agent-bridge-paired', token });
        hello();
        return;
      }
      if (m.type === 'welcome') { setPairing('none'); setHeld(false); setConnected(true); return; }
      if (!connected) return;
      if (m.type === 'command' && m.command && typeof m.command === 'object') {
        if (typeof m.command.id === 'string') mine.add(m.command.id);
        deps.post({ type: 'agent-command', command: m.command });
      }
    };
    const lost = (settled: boolean) => {
      if (ws !== sock) return;
      ws = null;
      setConnected(false, settled);
      if (wanted && retry === null && !waitingForCode()) retry = deps.schedule(connect, nextDelay());
    };
    sock.onclose = (ev) => {
      if (ws !== sock) return;
      // The server's pairing refusals (#3204): the kept token is not this server's, or the code was wrong. Either way
      // nothing is retried until the person enters a code.
      if (ev?.code === CLOSE.notPaired && code === null) {
        token = null;
        deps.post({ type: 'agent-bridge-unpaired' });
        setPairing('refused');
      } else if (ev?.code === CLOSE.wrongCode || (ev?.code === CLOSE.notPaired && code !== null)) {
        code = null;
        setPairing('wrong-code');
      }
      // #3297: another paired instance holds the bridge. A settled change: say so once, and back the retries off.
      const isHeld = ev?.code === CLOSE.held;
      if (isHeld) setHeld(true);
      lost(isHeld || ev?.code === CLOSE.notPaired || ev?.code === CLOSE.wrongCode);
    };
    // Lost first, then closed: Node's WebSocket fires `error` again inside `close()` on a socket still connecting, and the
    // `ws !== sock` guard must already hold, or a refused socket recurses until the stack overflows (#3297's refused arm).
    sock.onerror = () => { if (ws !== sock) return; lost(false); try { sock.close(); } catch { /* already closing */ } };
  };
  /** Close a socket the relay is done with, without a retry while a code is awaited. */
  const drop = (sock: WsLike): void => {
    ws = null;
    setConnected(false);
    try { sock.close(); } catch { /* already closed */ }
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
    code = null;
    setPairing('none');
    setHeld(false);
    setConnected(false);
    try { sock?.close(); } catch { /* already closed */ }
  };

  /** The person entered a pairing code: send it at the next challenge. */
  const pair = (typed: string): void => {
    code = normalizeCode(typed);
    setPairing('pairing');
    if (retry !== null) { deps.cancel(retry); retry = null; }
    connect();
  };

  /** Every message the main thread posts to the UI passes through here. */
  const fromMain = (m: MainToUi): void => {
    if (m.type === 'agent-bridge-token') {
      token = typeof m.token === 'string' && m.token ? m.token : null;
      tokenKnown = true;
      connect();
    } else if (m.type === 'agent-link-state') {
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

  return { fromMain, pair, connected: () => connected, pairing: () => pairing };
};
