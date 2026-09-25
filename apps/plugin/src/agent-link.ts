/**
 * THE AGENT LINK, MAIN-THREAD SIDE — the on/off state and TRANSPORT A, the file mailbox.
 *
 * OFF BY DEFAULT, NOT PERSISTED. The link starts off every time the plugin opens and is switched on only
 * by the owner, through the panel's control (`agent-link` message). While it is off the plugin reads and
 * writes nothing in the `prism3agent` namespace: a command sitting in a file's inbox does nothing until
 * someone with that file open turns the link on in THEIR plugin session.
 *
 * THE MAILBOX. A cloud agent's only Figma access is the hosted MCP's `use_figma`, which runs plugin-API
 * JavaScript against the file — so the agent and this plugin meet in the file's root shared plugin data
 * (`MAILBOX` in `agent-protocol.ts` lists the keys and who writes each). While the link is on the plugin
 * POLLS every `MAILBOX.pollMs`, and each poll:
 *
 *   1. reads `inbox` (the agent's queue) and `claimed` (its own record of what it has taken);
 *   2. takes the FIRST inbox entry not yet claimed — inbox order is send order, so commands run in order;
 *   3. writes the id into `claimed` BEFORE running it, so a re-poll (or a second plugin session with the
 *      link on) never runs it twice;
 *   4. runs it through the dispatcher — at most one command per poll, and never while one is running;
 *   5. writes the result under `result:<id>` (chunked when it is past `MAILBOX.chunkBytes`), records it
 *      in `results`, and clears results older than the last `MAILBOX.keep`;
 *   6. rewrites `link` with the last command's headline.
 *
 * POLLING, NOT A `documentchange` LISTENER. Whether — and how fast — a write made by `use_figma` reaches
 * an open plugin session through multiplayer is untested (it is the first thing to verify live). A poll
 * reads the current value whatever route delivered it; a change listener would additionally depend on
 * the host raising an event for a shared-plugin-data write made by another client, which is a second
 * unknown stacked on the first. Under `documentAccess: dynamic-page` it would also need every page loaded.
 *
 * STALE ON SWITCH-ON. Every inbox entry already present when the owner switches the link on is answered
 * with a `stale` failure instead of being run. Turning the link on must never replay a queue somebody
 * wrote an hour ago; the agent sends after the owner says the link is on (the runbook's first step).
 *
 * The retention rule keeps `claimed` from growing without bound WITHOUT ever forgetting an id the inbox
 * still holds: an id leaves `claimed` only once the agent has dropped it from `inbox`.
 */
import { AGENT_PROTOCOL_VERSION, MAILBOX, commandId, failedResult, resultKey, partKey, chunkUtf8, utf8Bytes } from './agent-protocol';
import type { AgentLinkState, AgentResult, ChunkManifest } from './agent-protocol';
import type { SharedDataPort } from './persist-figma';

/** What the controller needs from the host. `schedule`/`cancel` are `setTimeout`/`clearTimeout` live. */
export type AgentLinkDeps = {
  root: SharedDataPort;
  dispatch(raw: unknown, transport: 'mailbox'): Promise<AgentResult>;
  engineVersion: string;
  build: string;
  now?: () => Date;
  schedule(fn: () => void, ms: number): unknown;
  cancel(handle: unknown): void;
  /** Called whenever the published state changes (the panel's control re-renders from it). */
  onState?(s: AgentLinkState): void;
};

const readJson = (root: SharedDataPort, key: string): { ok: true; value: unknown } | { ok: false; error: string } => {
  const raw = root.getSharedPluginData(MAILBOX.ns, key);
  if (!raw) return { ok: true, value: null };
  try { return { ok: true, value: JSON.parse(raw) }; } catch (e) { return { ok: false, error: `${key}: ${(e as Error).message}` }; }
};
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Write one result, chunked when needed (parts first, manifest last). */
const writeResult = (root: SharedDataPort, r: AgentResult): void => {
  const json = JSON.stringify(r);
  if (utf8Bytes(json) <= MAILBOX.chunkBytes) {
    root.setSharedPluginData(MAILBOX.ns, resultKey(r.id), json);
    return;
  }
  const parts = chunkUtf8(json, MAILBOX.chunkBytes);
  // Parts first, manifest last: a reader that sees the manifest can rely on every part being there.
  parts.forEach((p, n) => root.setSharedPluginData(MAILBOX.ns, partKey(r.id, n), p));
  const manifest: ChunkManifest = { chunked: true, parts: parts.length, bytes: utf8Bytes(json) };
  root.setSharedPluginData(MAILBOX.ns, resultKey(r.id), JSON.stringify(manifest));
};

/** Clear a stored result and any chunks it was split into. */
const clearResult = (root: SharedDataPort, id: string): void => {
  const got = readJson(root, resultKey(id));
  const parts = got.ok && got.value && typeof got.value === 'object' && (got.value as ChunkManifest).chunked ? (got.value as ChunkManifest).parts : 0;
  for (let n = 0; n < parts; n++) root.setSharedPluginData(MAILBOX.ns, partKey(id, n), '');
  root.setSharedPluginData(MAILBOX.ns, resultKey(id), '');
};

/** Record that `id` now has a stored result, and drop the oldest past `MAILBOX.keep`. */
const recordResult = (root: SharedDataPort, id: string): void => {
  const got = readJson(root, MAILBOX.results);
  const ids = [...strings(got.ok ? got.value : null).filter((x) => x !== id), id];
  while (ids.length > MAILBOX.keep) clearResult(root, ids.shift() as string);
  root.setSharedPluginData(MAILBOX.ns, MAILBOX.results, JSON.stringify(ids));
};

/** Store a result for `r.id` and apply retention — the one way a result enters the mailbox. */
export const storeResult = (root: SharedDataPort, r: AgentResult): void => {
  writeResult(root, r);
  recordResult(root, r.id);
};

/** The headline the panel would show for a result, for the link record. */
const headlineOf = (r: AgentResult): string => {
  if (r.error) return `✗ ${r.error.code}`;
  const v = r.result?.verdict as { headline?: unknown; summary?: unknown } | null | undefined;
  if (v && typeof v.headline === 'string') return v.headline;
  if (v && typeof v.summary === 'string') return v.summary.slice(0, 60);
  return r.ok ? '✓ done' : '✗ failed';
};

export const createAgentLink = (deps: AgentLinkDeps) => {
  const now = deps.now ?? (() => new Date());
  const { root } = deps;
  let state: AgentLinkState = {
    v: AGENT_PROTOCOL_VERSION, on: false, since: null, engineVersion: deps.engineVersion, build: deps.build,
    pollMs: MAILBOX.pollMs, transports: { mailbox: false }, lastCommand: null, inboxError: null,
  };
  let timer: unknown = null;
  let busy = false;

  const publish = (patch: Partial<AgentLinkState>, write = true): void => {
    state = { ...state, ...patch };
    // `link` is written on switch on/off and after each command — not on every poll, which would make a
    // document change (and an undo step) every second while the link idles.
    if (write) { try { root.setSharedPluginData(MAILBOX.ns, MAILBOX.link, JSON.stringify(state)); } catch { /* reported by status */ } }
    deps.onState?.(state);
  };

  /** Inbox entries in send order, plus the ids already claimed. `null` inbox means unreadable. */
  const readQueue = (): { entries: unknown[] | null; claimed: string[]; error: string | null } => {
    const inbox = readJson(root, MAILBOX.inbox);
    const claimed = readJson(root, MAILBOX.claimed);
    if (!inbox.ok) return { entries: null, claimed: [], error: `the inbox is not JSON (${inbox.error})` };
    if (inbox.value !== null && !Array.isArray(inbox.value)) return { entries: null, claimed: [], error: 'the inbox is not a JSON array' };
    return { entries: (inbox.value as unknown[] | null) ?? [], claimed: strings(claimed.ok ? claimed.value : null), error: null };
  };

  /** Take `ids`, keeping only the claims the inbox still holds (see the header's retention rule). */
  const claim = (entries: unknown[], claimed: string[], ids: string[]): void => {
    const inInbox = new Set(entries.map(commandId).filter((x): x is string => x !== null));
    const kept = [...claimed.filter((x) => inInbox.has(x) && !ids.includes(x)), ...ids];
    root.setSharedPluginData(MAILBOX.ns, MAILBOX.claimed, JSON.stringify(kept));
  };

  /** Every entry that cannot be answered by id, described once. */
  const unanswerable = (entries: unknown[]): string | null => {
    const bad = entries.map((e, i) => (commandId(e) === null ? i : -1)).filter((i) => i >= 0);
    return bad.length ? `inbox entr${bad.length === 1 ? 'y' : 'ies'} ${bad.join(', ')} ha${bad.length === 1 ? 's' : 've'} no usable id and cannot be answered` : null;
  };

  /** Answer every unclaimed entry as `stale` — run once, at switch-on. */
  const retireStale = (): number => {
    const q = readQueue();
    if (!q.entries) return 0;
    const pending = q.entries.map(commandId).filter((id): id is string => id !== null && !q.claimed.includes(id));
    if (!pending.length) return 0;
    claim(q.entries, q.claimed, pending);
    const at = now().toISOString();
    for (const id of pending) {
      const entry = q.entries.find((e) => commandId(e) === id) as { cmd?: unknown };
      storeResult(root, failedResult(
        { id, cmd: typeof entry?.cmd === 'string' ? entry.cmd : '', transport: 'mailbox', engineVersion: deps.engineVersion, at },
        { code: 'stale', message: 'this command was already in the inbox when the agent link was switched on, so it was not run — send it again' },
      ));
    }
    return pending.length;
  };

  /** One poll: run at most one pending command. Resolves to its result, or null when there was none. */
  const poll = async (): Promise<AgentResult | null> => {
    if (!state.on || busy) return null;
    busy = true;
    try {
      const q = readQueue();
      const inboxError = q.error ?? (q.entries ? unanswerable(q.entries) : null);
      if (inboxError !== state.inboxError) publish({ inboxError });
      if (!q.entries) return null;
      const next = q.entries.find((e) => { const id = commandId(e); return id !== null && !q.claimed.includes(id); });
      if (next === undefined) return null;
      const id = commandId(next) as string;
      claim(q.entries, q.claimed, [id]);
      const r = await deps.dispatch(next, 'mailbox');
      // The dispatcher answers a bad envelope with the id it could read; the mailbox only takes entries
      // with a usable id, so the stored key and the envelope's id always agree.
      storeResult(root, { ...r, id });
      publish({ lastCommand: { id, cmd: r.cmd, ok: r.ok, finishedAt: r.finishedAt, headline: headlineOf(r) } });
      return r;
    } finally {
      busy = false;
    }
  };

  const loop = (): void => {
    timer = null;
    if (!state.on) return;
    void poll().catch(() => undefined).finally(() => {
      if (state.on && timer === null) timer = deps.schedule(loop, MAILBOX.pollMs);
    });
  };

  const setOn = (on: boolean): void => {
    if (on === state.on) { deps.onState?.(state); return; }
    if (timer !== null) { deps.cancel(timer); timer = null; }
    if (!on) { publish({ on: false, since: null, transports: { mailbox: false } }); return; }
    publish({ on: true, since: now().toISOString(), transports: { mailbox: true } });
    retireStale();
    timer = deps.schedule(loop, MAILBOX.pollMs);
  };

  return {
    setOn,
    poll,
    /** The current published state (for `status`). */
    state: (): AgentLinkState => state,
  };
};
export type AgentLink = ReturnType<typeof createAgentLink>;
