/**
 * THE AGENT LINK'S ONE PROTOCOL — the command and result envelopes an agent uses to drive this plugin.
 *
 * "The plugin does the writing, the agent does the triggering and reading of the output." An agent sends a
 * COMMAND ENVELOPE; the running plugin (with its owner's agent link switched on) runs it through the SAME
 * main-thread handler the UI's button reaches, and answers with a RESULT ENVELOPE. Two transports carry
 * these envelopes and neither adds a field of its own:
 *
 *   · the FILE MAILBOX (`agent-link.ts`) — the envelopes travel through the file's root shared plugin data,
 *     so a cloud agent whose only Figma access is the hosted MCP's `use_figma` can reach the plugin;
 *   · the LOCAL DESKTOP BRIDGE (a later PR) — the same envelopes over a localhost WebSocket.
 *
 * CONTEXT-NEUTRAL, like `messages.ts`: pure data and pure functions, type-only imports, so it compiles
 * under BOTH tsconfigs (main = no DOM, ui = no plugin API) and the Node-side agent tools import it too.
 * The agent-side `use_figma` snippets are GENERATED from the constants below (`apps/plugin/agent-snippets.ts`),
 * so a key name lives in exactly one place.
 *
 * VERSIONED. `v` is `AGENT_PROTOCOL_VERSION`; a command at any other version is answered with a failed
 * result (`bad-version`), never run and never ignored. Bump it when an envelope field changes meaning or
 * a command's args change shape; adding a command does not bump it (an older plugin answers the new one
 * with `unknown-command`, which is the correct answer).
 *
 * NEVER SILENCE. Every command that carries a usable `id` gets a result: an unknown `cmd`, a bad version,
 * malformed args and a handler that threw are all FAILED RESULTS carrying an `error`. The one thing that
 * cannot be answered by id is an entry with no usable id, and the mailbox reports those on its link record
 * (`inboxError`) instead.
 *
 * NO EVAL. A command is data mapped to a handler by name (`agent-dispatch.ts`); nothing in an envelope is
 * ever executed.
 */
import type { BrandInput } from '@prism3/engine/theme';
import type { MainToUi } from './messages';

/** The protocol revision. See the header for when it moves. */
export const AGENT_PROTOCOL_VERSION = 1;

/** Every command this plugin answers, in the order the runbook documents them. Stable ids: renaming one
 *  is a breaking change for every agent that sends it, so it is a version bump, not an edit. */
export const AGENT_COMMANDS = ['status', 'apply-theme', 'build-components', 'file-setup', 'prune', 'readback'] as const;
export type AgentCmd = (typeof AGENT_COMMANDS)[number];

/** Each command's `args`, exactly as the UI sends the matching message (`messages.ts` `UiToMain`). */
export type AgentArgs = {
  /** Engine version, plugin build, the file's themed state, and which transports are listening. */
  status: Record<string, never>;
  /** A full `BrandInput`, as the UI's Apply sends it. */
  'apply-theme': { input: BrandInput };
  /** A `componentDefs` id; absent means Button, as for the UI message. */
  'build-components': { def?: string };
  /** The page scaffold + the two template assets. No payload. */
  'file-setup': Record<string, never>;
  /** `confirm: false` previews, `confirm: true` deletes — the UI's two-step prune, in one field. */
  prune: { input: BrandInput; confirm: boolean };
  /** The boot read-back (`seed-info`) plus a census of every component page. Read-only. */
  readback: Record<string, never>;
};

/** A command as it arrives — unvalidated. `parseCommand` turns it into a `ValidCommand` or a reason. */
export type AgentCommand = { v: number; id: string; cmd: string; args?: unknown; issuedAt: string };

/** A command `parseCommand` accepted: a known `cmd`, the current version, and args of that cmd's shape. */
export type ValidCommand = { [C in AgentCmd]: { v: number; id: string; cmd: C; args: AgentArgs[C]; issuedAt: string } }[AgentCmd];

export type AgentErrorCode =
  /** Not an object, or `id`/`issuedAt` missing or unusable. */
  | 'bad-envelope'
  /** `v` is not `AGENT_PROTOCOL_VERSION`. */
  | 'bad-version'
  /** `cmd` is not in `AGENT_COMMANDS`. */
  | 'unknown-command'
  /** `args` is not the shape that cmd takes. */
  | 'bad-args'
  /** The command was already queued when the owner switched the link on, so it was not run. */
  | 'stale'
  /** The handler threw past its own catch — a defect in the plugin, reported rather than swallowed. */
  | 'handler-threw';
export type AgentError = { code: AgentErrorCode; message: string };

/** One `component-progress` reading, as the UI's pill receives it, with when it arrived. */
export type AgentProgress = { at: string; phase: 'build' | 'wire'; done: number; total: number; chunkMs: number };

/** Which transport delivered the command. The protocol is the same on both; this is provenance only. */
export type AgentTransport = 'mailbox' | 'bridge';

/**
 * What a command produced, beyond ok/error.
 *
 *   · `verdict` — the terminal message the UI would have shown for this action (`apply-result`,
 *     `component-result`, `file-setup-result`, `prune-result`, `seed-info`), headline and summary
 *     included, byte for byte what the panel renders. `null` for `status`, which has no UI twin.
 *   · `data` — the structured facts behind that verdict, as objects an agent can filter: the misses by
 *     axis, the orphan and stranded lists, the component report and its telemetry, the prune plan.
 *   · `logs` — every console line the plugin printed while the command ran (the #836 / #701 / #1579
 *     telemetry included), since the agent cannot open the plugin console.
 */
export type AgentPayload = { verdict: MainToUi | null; data: Record<string, unknown>; logs: string[] };

/** The result envelope. Exactly one of `result` / `error` is present. `ok` is the action's own verdict
 *  (`result.verdict.ok`), and always false when `error` is set. */
export type AgentResult = {
  v: number;
  id: string;
  cmd: string;
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  engineVersion: string;
  transport: AgentTransport;
  result?: AgentPayload;
  error?: AgentError;
  progress?: AgentProgress[];
};

/** What the plugin publishes about its own link — the mailbox writes it to `MAILBOX.link`, `status`
 *  returns it, and the UI shows it. The agent reads it to know whether anyone is listening. */
export type AgentLinkState = {
  v: number;
  on: boolean;
  /** When the owner switched the link on, ISO; null while off. */
  since: string | null;
  engineVersion: string;
  /** The plugin build identity (#836). */
  build: string;
  /** The mailbox poll interval while on. */
  pollMs: number;
  transports: { mailbox: boolean };
  lastCommand: { id: string; cmd: string; ok: boolean; finishedAt: string; headline: string } | null;
  /** An inbox the plugin could not read, or entries it could not answer by id. */
  inboxError: string | null;
};

/** Ids go into shared-plugin-data KEY names (`result:<id>`), so they are kept to a key-safe alphabet. */
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** The id of a raw entry, if it has a usable one — what the mailbox claims by, before validation. */
export const commandId = (raw: unknown): string | null =>
  isObject(raw) && typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;

export type ParsedCommand =
  | { ok: true; command: ValidCommand }
  | { ok: false; id: string | null; cmd: string; error: AgentError };

/** Validate one raw envelope. Pure; the ONLY place a command's shape is decided, for both transports. */
export const parseCommand = (raw: unknown): ParsedCommand => {
  const id = commandId(raw);
  const cmd = isObject(raw) && typeof raw.cmd === 'string' ? raw.cmd : '';
  const fail = (code: AgentErrorCode, message: string): ParsedCommand => ({ ok: false, id, cmd, error: { code, message } });
  if (!isObject(raw)) return fail('bad-envelope', 'a command is a JSON object: {v, id, cmd, args, issuedAt}');
  if (id === null) return fail('bad-envelope', 'id must be 1–64 characters of A–Z, a–z, 0–9, dot, underscore or hyphen');
  if (raw.v !== AGENT_PROTOCOL_VERSION) {
    return fail('bad-version', `protocol version ${JSON.stringify(raw.v)} is not ${AGENT_PROTOCOL_VERSION}, the version this plugin speaks`);
  }
  if (typeof raw.issuedAt !== 'string') return fail('bad-envelope', 'issuedAt must be an ISO timestamp string');
  if (!(AGENT_COMMANDS as readonly string[]).includes(cmd)) {
    return fail('unknown-command', `unknown command '${cmd}' — this plugin answers ${AGENT_COMMANDS.join(', ')}`);
  }
  const args = raw.args === undefined ? {} : raw.args;
  if (!isObject(args)) return fail('bad-args', `args for '${cmd}' must be an object`);
  const base = { v: AGENT_PROTOCOL_VERSION, id, issuedAt: raw.issuedAt };
  switch (cmd as AgentCmd) {
    case 'apply-theme':
      if (!isObject(args.input)) return fail('bad-args', "apply-theme needs args.input: a BrandInput object, as the UI's Apply sends it");
      return { ok: true, command: { ...base, cmd: 'apply-theme', args: { input: args.input as unknown as BrandInput } } };
    case 'prune':
      if (!isObject(args.input)) return fail('bad-args', 'prune needs args.input: a BrandInput object');
      if (typeof args.confirm !== 'boolean') return fail('bad-args', 'prune needs args.confirm: false to preview, true to delete');
      return { ok: true, command: { ...base, cmd: 'prune', args: { input: args.input as unknown as BrandInput, confirm: args.confirm } } };
    case 'build-components':
      if (args.def !== undefined && (typeof args.def !== 'string' || !args.def)) {
        return fail('bad-args', 'build-components takes args.def: a component def id, or no def for Button');
      }
      return { ok: true, command: { ...base, cmd: 'build-components', args: args.def === undefined ? {} : { def: args.def } } };
    case 'status':
    case 'file-setup':
    case 'readback':
      return { ok: true, command: { ...base, cmd: cmd as 'status' | 'file-setup' | 'readback', args: {} } };
  }
};

/** A failed result for a command that was not run. */
export const failedResult = (
  p: { id: string; cmd: string; transport: AgentTransport; engineVersion: string; at: string },
  error: AgentError,
): AgentResult => ({
  v: AGENT_PROTOCOL_VERSION, id: p.id, cmd: p.cmd, ok: false, startedAt: p.at, finishedAt: p.at,
  engineVersion: p.engineVersion, transport: p.transport, error,
});

/* ── the file mailbox's layout ───────────────────────────────────────────────────────────────────────── */

/**
 * The mailbox's keys on `figma.root`'s SHARED plugin data (`setPluginData` is refused under `use_figma`;
 * shared data is not). Each key has ONE writer, so neither side ever overwrites the other's write:
 *
 *   · `inbox`             — AGENT writes: a JSON array of command envelopes, appended in send order.
 *   · `claimed`           — PLUGIN writes: the ids it has taken, written BEFORE a command runs.
 *   · `result:<id>`       — PLUGIN writes: the result envelope, or a chunk manifest when it is too big.
 *   · `result:<id>:<n>`   — PLUGIN writes: chunk n of an oversized result.
 *   · `results`           — PLUGIN writes: the ids that have a stored result, oldest first (retention).
 *   · `link`              — PLUGIN writes: an `AgentLinkState`, on switch on/off and after each command.
 */
export const MAILBOX = {
  ns: 'prism3agent',
  inbox: 'inbox',
  claimed: 'claimed',
  results: 'results',
  link: 'link',
  resultPrefix: 'result:',
  /** Results kept; older ones (and their chunks) are cleared. */
  keep: 20,
  /** The plugin's poll interval while the link is on. */
  pollMs: 1000,
  /** Largest value one key is given. Figma's documented ceiling is 100 kB per entry; this leaves room. */
  chunkBytes: 90_000,
} as const;

export const resultKey = (id: string): string => `${MAILBOX.resultPrefix}${id}`;
export const partKey = (id: string, n: number): string => `${MAILBOX.resultPrefix}${id}:${n}`;

/** What `result:<id>` holds when the result was split. Told apart from a result by `chunked`. */
export type ChunkManifest = { chunked: true; parts: number; bytes: number };

/** UTF-8 length, hand-counted: `TextEncoder` is not promised in the plugin sandbox. */
export const utf8Bytes = (s: string): number => {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) { n += 4; i++; }
    else n += 3;
  }
  return n;
};

/** Split `s` into pieces of at most `max` UTF-8 bytes, never inside a surrogate pair. `''` → `['']`. */
export const chunkUtf8 = (s: string, max: number): string[] => {
  const out: string[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const pair = c >= 0xd800 && c <= 0xdbff && i + 1 < s.length;
    const w = c < 0x80 ? 1 : c < 0x800 ? 2 : pair ? 4 : 3;
    if (bytes + w > max && i > start) { out.push(s.slice(start, i)); start = i; bytes = 0; }
    bytes += w;
    if (pair) i++;
  }
  out.push(s.slice(start));
  return out;
};
