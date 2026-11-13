/**
 * AGENT LINK gate — the file mailbox round trip, through the REAL `main.ts`.
 *
 *   npx tsx apps/plugin/test-agent-link.ts
 *
 * `main.ts` calls `figma.showUI` at module scope, which is why no earlier suite could load it (#1106's
 * note). This one installs a host model as the global `figma` (plus the two build-time globals) and then
 * imports it — so what runs is the plugin's own message switch, its own `ACTIONS` table, its own agent
 * link and its own handlers, against a host that fails the heavy writes the same way for both callers.
 * The agent side is the EXACT text `agent-snippets.ts` prints, run the way `use_figma` runs it: the body
 * of an async function whose one binding is `figma`, over the same root the plugin's poller reads.
 *
 * INDEPENDENCE (docs/34). The expected side of the parity arms is what the UI path posted to the panel,
 * which does not go through the protocol, the mailbox, the snippets or the dispatcher; the actual side goes
 * through all four. The routing arms spy on the `ACTIONS` entries AFTER import and require BOTH the UI
 * message and the agent command to reach the same entry — so pointing one agent route at a copy of a
 * handler (or handing the dispatcher a copy of the table) fails `routes/<cmd>` by name, and so does a UI
 * case that stopped going through the table.
 *
 * Arms, by name:
 *   · off: with the link off nothing in `prism3agent` is read or written by the plugin
 *   · stale: a command already queued at switch-on is answered `stale` and not run
 *   · routes/<cmd>: the UI message and the agent command reach the same `ACTIONS` entry
 *   · specs/panel, specs/agent: Documentation › Specs' `draw-specs` reaches `ACTIONS.drawSpecs` for the current page, the
 *     agent's for the whole file (#2830 Q2830.3 A)
 *   · parity/<cmd>: the agent's `result.verdict` is byte-for-byte what the UI path posted, less the panel's `lines`
 *   · #2177 agent/<cmd>, #2177 panel/<cmd>: the Activity drawer's one-line-per-item copy of a summary (`lines`) reaches
 *     the panel, and never the agent: the agent's verdict has exactly the keys, in order, its kind had before #2177 (a
 *     literal list here), so what the link sends is unchanged. (mutations: `forAgent` returning the message whole →
 *     every `#2177 agent/<cmd>` and `parity/<cmd>` of the three kinds fails; the panel's `lines` dropped → `#2177 panel/<cmd>`)
 *   · #3326 causes/<cmd>: a verdict's `causes` (the drawer's marks) reach the panel and never the agent. (mutation:
 *     `forAgent` keeping `causes` → `#3326 causes/build-components` and `parity/build-components`)
 *   · brackets/<cmd>: the panel is told the agent's command started and finished, around its verdict (S11)
 *     (mutation: the dispatcher's `onStart` call removed → every `brackets/<cmd>` fails, by name)
 *   · brackets/throw: a handler that throws still sends agent-finished, so the panel's row cannot stick
 *     (mutation: `onFinish` moved out of the `finally`, after the try → `brackets/throw` fails, by name)
 *   · envelope: every field of the result envelope, for every command
 *   · busy/panel, busy/agent, busy/agent-first: a second apply-theme sent while one is running, by the
 *     panel or an agent, is refused with `busy` and the owner's words, and the running write's verdict is
 *     byte-for-byte the baseline's (#1957). busy/release: the hold ends with the run, even one that threw.
 *     (mutations: the guard's `busy` check removed from `guarded` → busy/panel and busy/agent-first fail;
 *     the dispatcher's `refuse` removed → busy/agent fails; the `delete` moved out of the `finally` →
 *     busy/release fails, each by name)
 *   · busy/one hold (#3697 R7): while the panel's apply runs, the panel's file setup and style-guide cleanup and an
 *     agent's build and prune delete are refused as busy, each naming Theme as the holder, and the apply's verdict is the
 *     baseline's (mutation: a hold per operation, as before R7 → every `busy/one hold` arm fails by name; the style-guide cleanup's check alone put back on its own operation →
 *     `busy/one hold: the panel's style-guide cleanup arriving mid Apply Theme is refused, …`). busy/preview: a prune preview, from the panel or an agent, is not
 *     refused while a delete runs, and a second delete is (mutations: `writes` true for a preview, or the
 *     panel's prune confirm read as always true → busy/preview's preview arms fail; the delete unguarded →
 *     its control arm fails).
 *   · busy/words (#3718 D3718.1 B): a refusal names the write that holds the file, as literals: "Theme is already running. …"
 *     behind Theme, "Style guides is already running. …" behind Style guides, and Theme for a file setup or an agent's build
 *     asked for behind Theme (mutations: `refusal` worded by the asked `cmd` → the file-setup/build arm fails; the agent's
 *     `refuse` worded by the asked write → the same arm fails; the old fixed "Update file" line → every arm fails, each by name).
 *   · busy/sink: a `refused` that reaches the agent's sink fails the command with its code (mutation: the
 *     dispatcher's refusal check removed → busy/sink fails). busy/titles: `run-guard.ts`'s TITLE equals the
 *     drawer's OP_TITLE (mutation: one title changed in either file → busy/titles fails) (#1995)
 *   · one-run: the STYLE GUIDE through the same guard, with the real `styleGuide` held mid-yield (#1778): a
 *     style guide asked for from the panel or the link while the other's run draws is refused with `busy`
 *     and the owner's words, the drawing run's verdict lands once, and the next click runs (#1785) (mutation:
 *     `ACTIONS.styleGuide` not wrapped in `guarded` → one-run/agent and one-run/panel fail, by name)
 *   · foreign: on a file holding content Prism3 did not make, apply-theme from the panel and from the agent
 *     both refuse the whole write, name each collision in the same verdict, and change nothing (#1884)
 *   · claim-before-run: the id is in `claimed` while its handler runs
 *   · order: two commands sent together run in send order, one per poll
 *   · no-rerun: a claimed command is never run again, even with its result gone
 *   · failures: unknown command, bad version, bad args → failed results; an id-less entry → inboxError
 *   · chunking: a result past the per-entry budget is split and the read snippet reassembles it
 *   · retention: only the last MAILBOX.keep results survive, chunks included
 *   · run-notice/<arm> (#533, Q110 A): a `run-ended` while minimized to the strip shows one `figma.notify` with the
 *     panel's line, 6000 ms, not the error style, and Restore as its button, which restores the window; with the full
 *     window up, or after Restore, nothing is shown (mutation: `runNotice` ignoring `minimized` → run-notice/full-window
 *     and run-notice/after-restore fail by name).
 *   · strip/<arm> (#2949): minimizing to the link strip resizes the window and nothing else — the link stays on, the
 *     poll stays armed and a command sent while minimized is run; the strip skips the 380×420 floor, is never kept as
 *     the window size, ignores a late drag, and Restore returns to the size from before; Turn off (the link switched
 *     off) restores too; and Minimize works with the link off as well (#2909, the owner's direction of 2026-10-24;
 *     mutation: `if (!agentLink.state().on) return;` back in `setMinimized` → strip/off fails). EXPECTED sizes are literals here. (mutation:
 *     `setMinimized` calling `agentLink.setOn(false)` → strip/link and strip/poll fail, by name). From Minimize to
 *     Restore the link's `since` holds and no `on: false` reaches the panel or the record, so a bounce (off, then on)
 *     shows too (mutation: `setOn(false); setOn(true)` in `setMinimized` → strip/since-min, strip/since-restore and strip/no-bounce fail)
 *     strip/place-min, strip/place-drag, strip/place-restore, strip/kept-spot, strip/place-return (#3327, #3416): the
 *     first Minimize in a file shrinks in place by `resize` alone and repositions nothing, a drag message places
 *     nothing, Restore centers and keeps the strip's window-space spot for this file under a file id in root plugin
 *     data, and the next Minimize puts the strip back there (zoom 2 here) (mutation, review of #3420 S2: in place
 *     repositioned to `getPosition().canvasSpace` → strip/place-min, strip/place-drag, strip/place-restore fail)
 *   · strip-place (#3327, #3416): `stripPlacement` (in place the first time, returned as null; no inward clamp, by the
 *     edge in place or on a remembered spot; the remembered spot at zoom 1 and 2; each fallback) and `restorePlacement`
 *     (centered at zoom 1 and 2, a window larger than the canvas) against hand-worked literals (mutations, each failing
 *     by name: the lower-right corner back → strip-place/first and strip/place-min; the inward clamp back →
 *     strip-place/no-clamp; a clamp on the remembered spot only → strip-place/spot-edge, strip/place-return and
 *     strip-relaunch/return; drop the `/ zoom` → strip-place/spot-z2 and strip/place-return; the spot never checked
 *     for reach → strip-place/spot-off; the canvas top-left fallback dropped → strip-place/both-off)
 *   · strip-relaunch (#3416; review of #3420, S1): a second launch of `main.ts`, into a host whose root plugin data and
 *     `clientStorage` already hold this file's id and spot, reads the spot at start, and its first Minimize lands on it
 *     (mutation: the start-up read dropped → strip-relaunch/return fails by name). Last in the suite.
 *   · strip-text: the strip's line for each state, against literals (Q2 A, Q3 A)
 *   · reads (#3147 Phase 2a, #3309): `mailbox/<cmd>`, `envelope/<cmd>` and `no-write/<cmd>` for inspect, component-keys,
 *     audit-frames, snapshot and activity (its two panel notes and `activityExpected` in the fixture too, and an agent's own run, `activity/agent`), against `NodeShim` and the literals in `agent-read-fixture.ts`; plus inspect/unreadable,
 *     inspect/cap, keys/fixture, audit/each-count/<count>, audit/clean, audit/legacy-lists, snapshot/scale and
 *     refuse/<case>. (mutations: `readOne` assigning `n.name = n.name` → `no-write/inspect`; `locked` dropped from its
 *     entry → `envelope/inspect`, each by name)
 *   · session/<arm> (#3697 R8, the owner's A): through the mailbox, a command that changes or removes what is in the file
 *     runs only with this link session's code. session/refused (none), session/wrong (another), session/spent (past
 *     SESSION_TRIES wrong ones, the right one too) are answered `no-session` and reach no handler; session/right runs;
 *     session/previews (a preview or a read needs none); session/not-in-file (the code is in no mailbox key and no
 *     result); session/panel (the panel is told it); session/new (switching on again draws a new one); session/which
 *     (`needsSession` against a literal list). (mutations: the check in `poll` removed → session/refused, session/wrong
 *     and session/spent fail by name; the code written into the link record → session/not-in-file)
 *   · switch-off: with the link off again, nothing new is run
 *   · state: the panel receives the link state and the last command's headline
 *   · snippets: every agent-side script is short
 */
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { serializeBrandInput, deserializeBrandInput } from '@prism3/engine/persist-input';
import type { BrandInput } from '@prism3/engine/theme';
import { MAILBOX, AGENT_COMMANDS, READ_COMMANDS, AGENT_PROTOCOL_VERSION, resultKey, utf8Bytes, parseCommand } from './src/agent-protocol';
import { readFixture, ARGS, EXPECTED, canon, ACTIVITY_NOTES, activityExpected, atRead, AT, contextExpected } from './agent-read-fixture';
import { ACTIVITY_KEEP } from './src/activity-log';
import type { AgentResult, AgentLinkState } from './src/agent-protocol';
import { storeResult, SESSION_TRIES } from './src/agent-link';
import { needsSession } from './src/agent-protocol';
import { envelope, sendSnippet, readSnippet, linkSnippet } from './agent-snippets';
import { agentLinkShortStatus, agentLinkStatusText, agentLinkWord, agentStripText, agentAge } from './src/agent-link-ui';
import { createRunGuard, TITLE } from './src/run-guard';
import { restorePlacement, stripPlacement } from './src/window-place';
import { createDispatcher, ROUTES } from './src/agent-dispatch';
import { NodeShim, FileShim } from './file-shim';
import { MAX_CHANGES, overrideVerdict } from './src/set-override';
import type { OverridePlan } from './src/set-override';
import { SET_OVERRIDE_MAX } from './src/agent-protocol';
import type { NodeSpec } from './file-shim';
import { EXECUTOR_REVISION } from './src/executor-revision';
import { OP_TITLE } from '../studio/src/shell/activity';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);

/* ── the host model ─────────────────────────────────────────────────────────────────────────────────── */

/** Shared plugin data per (namespace, key), with a log of every plugin-side write to `prism3agent`. */
const store = new Map<string, string>();
const k = (ns: string, key: string) => `${ns}\u0000${key}`;
let pluginWrites: string[] = [];
let agentSide = false;
const root = {
  name: 'agent-link test file',
  type: 'DOCUMENT',
  children: [] as unknown[],
  findAllWithCriteria: () => [],
  getSharedPluginData: (ns: string, key: string) => store.get(k(ns, key)) ?? '',
  getPluginData: (key: string) => store.get(k('', key)) ?? '',
  setPluginData: (key: string, v: string) => { if (v === '') store.delete(k('', key)); else store.set(k('', key), v); },
  setSharedPluginData: (ns: string, key: string, v: string) => {
    if (ns === MAILBOX.ns && !agentSide) pluginWrites.push(key);
    if (v === '') store.delete(k(ns, key)); else store.set(k(ns, key), v);
  },
};
/** Every `prism3agent` key currently holding a value. */
const mailboxKeys = () => [...store.keys()].filter((x) => x.startsWith(`${MAILBOX.ns}\u0000`)).map((x) => x.split('\u0000')[1]);

const posted: any[] = [];
const empty = async () => [];
/** While set, `held` waits on it: the busy arms hold a write mid-run this way (#1957). */
let gate: Promise<void> | null = null;
const held = async () => { if (gate) await gate; return []; };
const host: Record<string, unknown> = {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  root,
  currentPage: { name: 'Page 1', children: [] },
  variables: { getLocalVariableCollectionsAsync: empty, getLocalVariablesAsync: empty },
  getLocalTextStylesAsync: empty, getLocalEffectStylesAsync: empty, getLocalPaintStylesAsync: empty, getLocalGridStylesAsync: empty,
  listAvailableFontsAsync: empty,
  loadAllPagesAsync: async () => undefined,
};
const g = globalThis as Record<string, unknown>;
g.figma = host;
g.__html__ = '';
g.PRISM3_BUILD = '2026-09-25T00:00:00Z tree-test0000';
g.PRISM3_DEV = true;   // the dev build's define (#2530); the run-code section sets it false for its release arm

// The poll loop runs on `setTimeout`. Captured, so the suite ticks it by hand and nothing runs behind it.
const realSetTimeout = globalThis.setTimeout;
const timers = new Map<number, () => void>();
let timerSeq = 0;

const main = await import('./src/main');
// A 0 ms timer is the plugin handing back the thread (`breathe`; #3170's `ui-ready` starts its reads that way), not a
// poll: it runs on a turn of its own, so only the poll loop's timers are held here.
g.setTimeout = ((fn: () => void, ms?: number) => { if (!ms) { setImmediate(fn); return 0; } const id = ++timerSeq; timers.set(id, fn); return id; }) as unknown as typeof setTimeout;
g.clearTimeout = ((id: number) => { timers.delete(id); }) as unknown as typeof clearTimeout;
const settle = () => new Promise<void>((r) => setImmediate(r));

/** One poller tick: fire what is scheduled, then wait until the loop has re-armed (the poll finished). */
const tick = async (): Promise<void> => {
  const due = [...timers.values()];
  timers.clear();
  for (const fn of due) fn();
  for (let i = 0; i < 400 && timers.size === 0; i++) await settle();
};
const toUi = async (m: unknown): Promise<void> => {
  (host.ui as { onmessage: (m: unknown) => void }).onmessage(m);
  for (let i = 0; i < 20; i++) await settle();
};
/** Run an agent-side script the way `use_figma` does. */
const AsyncFn = Object.getPrototypeOf(async () => undefined).constructor as new (...a: string[]) => (f: unknown) => Promise<any>;
const agent = async (js: string): Promise<any> => {
  agentSide = true;
  try { return await new AsyncFn('figma', js)({ root }); } finally { agentSide = false; }
};
/** Sends as the person's agent does: with this link session's code (#3697 R8), which the panel shows. `sendBare` leaves it
 *  out, as an agent that was not given it would. */
const send = async (cmd: string, args: unknown = {}, id?: string, session: string | null | undefined = main.agentLink.session()) => {
  const c = envelope(cmd, args, id, undefined, session ?? undefined);
  const r = await agent(sendSnippet(c));
  return { id: c.id, sent: r };
};
const sendBare = (cmd: string, args: unknown = {}, id?: string) => send(cmd, args, id, null);
const read = (id: string, path?: string[]): Promise<any> => agent(readSnippet(id, path));

/* ── spies on the ACTION TABLE ──────────────────────────────────────────────────────────────────────── */

const calls: string[] = [];
let duringCall: ((name: string) => void) | null = null;
const actions = main.ACTIONS as unknown as Record<string, (...a: unknown[]) => Promise<void>>;
for (const name of Object.keys(actions)) {
  const orig = actions[name];
  actions[name] = (...a: unknown[]) => { calls.push(name); duringCall?.(name); return orig(...a); };
}
const brand = (exampleBrands as Record<string, unknown>).aurora;

/* ── off ────────────────────────────────────────────────────────────────────────────────────────────── */
section('off — the link starts off and the plugin does not touch the mailbox');
{
  await toUi({ type: 'ui-ready' });
  const s = posted.filter((m) => m.type === 'agent-link-state').pop()?.state as AgentLinkState | undefined;
  ok(!!s && s.on === false, 'ui-ready tells the panel the link is off');
  const early = await send('status', {}, 'early-1');
  ok(early.sent.sent === 'early-1', 'the agent can queue a command while the link is off');
  await tick();
  await main.agentLink.poll();
  ok(timers.size === 0, 'no poll is scheduled while off');
  ok(pluginWrites.length === 0, `the plugin wrote nothing to ${MAILBOX.ns} while off (wrote: ${pluginWrites.join(', ') || 'nothing'})`);
  ok((await read('early-1')).pending === true, 'and the queued command has no result');
}

/* ── stale on switch-on ─────────────────────────────────────────────────────────────────────────────── */
section('stale — switching on answers what was already queued, without running it');
{
  const before = calls.length;
  await toUi({ type: 'agent-link', on: true });
  const r = (await read('early-1')) as AgentResult;
  ok(r.ok === false && r.error?.code === 'stale', `the pre-queued command is answered stale (${r.error?.code})`);
  ok(calls.length === before, 'and no handler ran');
  ok(timers.size === 1, 'the poll loop is armed');
  const link = JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.link)) as AgentLinkState;
  ok(link.on === true && link.transports.mailbox === true && !!link.since, 'the link record says on, mailbox listening');
}

/* ── status ─────────────────────────────────────────────────────────────────────────────────────────── */
section('status');
{
  const { id } = await send('status');
  await tick();
  const r = (await read(id)) as AgentResult;
  const st = (r.result?.data as { status?: any })?.status;
  ok(r.ok === true && !r.error, 'status answers ok');
  ok(st?.engineVersion === ENGINE_VERSION && st?.build === g.PRISM3_BUILD, 'with the engine version and the plugin build');
  ok(st?.file?.themed === false && st?.file?.brandInput === 'absent', "and the file's themed state (unthemed here)");
  ok(st?.link?.on === true, 'and the link state');
  // A dev build (`PRISM3_DEV` true here) answers its dev command after the stable ones (#2530); a release lists none.
  ok(JSON.stringify(st?.commands) === JSON.stringify([...AGENT_COMMANDS, 'run-code']), `and the commands this build answers: the stable ones, then run-code (${JSON.stringify(st?.commands)})`);
  ok(r.result?.verdict === null, 'status has no UI verdict — it has no UI twin');
}

/* ── routes + parity, per command ───────────────────────────────────────────────────────────────────── */
section('routes/<cmd> + parity/<cmd> — the agent reaches the UI\'s handler and gets the UI\'s verdict');
type Case = { cmd: string; args: Record<string, unknown>; ui: Record<string, unknown>; entry: string; verdictType: string };
/** The panel's post less the drawer's `lines` (#2177): what the agent link has always been sent. */
const withoutLines = (m: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!m) return m;
  // #3326: `causes` is the drawer's too, dropped with `lines` (`forAgent`). #1909: so is a refusal's `collisions`, the
  // panel's Skip or Rename list.
  const { lines: _drawer, causes: _marks, collisions: _panel, ...rest } = m;
  return rest;
};
/** Each verdict kind's keys as the agent link read them before #2177, in order: typed here, never read from the code. */
const AGENT_KEYS: Record<string, string[]> = {
  'apply-result': ['type', 'ok', 'headline', 'summary'],
  'component-result': ['type', 'ok', 'completed', 'headline', 'summary'],
  'style-guide-result': ['type', 'ok', 'headline', 'summary'],
};
const CASES: Case[] = [
  { cmd: 'apply-theme', args: { input: brand }, ui: { type: 'apply-theme', input: brand }, entry: 'applyTheme', verdictType: 'apply-result' },
  { cmd: 'build-components', args: { def: 'no-such-def' }, ui: { type: 'build-components', def: 'no-such-def' }, entry: 'buildComponents', verdictType: 'component-result' },
  { cmd: 'file-setup', args: {}, ui: { type: 'file-setup' }, entry: 'fileSetup', verdictType: 'file-setup-result' },
  { cmd: 'style-guide', args: { collections: ['color'] }, ui: { type: 'style-guide', options: { collections: ['color'] } }, entry: 'styleGuide', verdictType: 'style-guide-result' },
  { cmd: 'prune', args: { input: brand, confirm: false }, ui: { type: 'prune', input: brand, confirm: false }, entry: 'prune', verdictType: 'prune-result' },
  { cmd: 'readback', args: {}, ui: { type: 'ui-ready' }, entry: 'seedFromFile', verdictType: 'seed-info' },
  // #3137 Q3137.7 A: Clean up's usage panels, counted: the panel's message and the agent's command reach one entry.
  { cmd: 'panels-clean', args: { confirm: false }, ui: { type: 'panels-clean', confirm: false }, entry: 'panelsClean', verdictType: 'panels-clean-result' },
];
// The two update commands (#2265) have no panel twin yet (the panel's control is held for the owner), so they
// have their own section below rather than a parity case. `draw-specs`' panel twin is scoped to the current page, so it
// is not one either (`specs/panel`, below).
// `set-override` (#3394) is the agent link's alone (Q3394.2 A): its own section below, `set-override/*`.
const AGENT_ONLY = ['update-components', 'capture-baseline', 'adopt-members', 'draw-specs', 'set-override'];
ok(new Set(CASES.map((c) => c.cmd)).size + 1 + AGENT_ONLY.length + READ_COMMANDS.length === AGENT_COMMANDS.length && AGENT_ONLY.every((c) => (AGENT_COMMANDS as readonly string[]).includes(c)),
  'every write/read command has a case here (status is covered above, the agent-only commands and the node reads below)');
const results: AgentResult[] = [];
for (const c of CASES) {
  // The UI path first: what the panel was sent.
  calls.length = 0;
  posted.length = 0;
  await toUi(c.ui);
  const uiVerdict = posted.filter((m) => m.type === c.verdictType).pop();
  const uiReached = calls.includes(c.entry);
  // Then the agent path, through the mailbox.
  calls.length = 0;
  posted.length = 0;
  const { id } = await send(c.cmd, c.args);
  await tick();
  const r = (await read(id)) as AgentResult;
  results.push(r);
  ok(uiReached && calls.includes(c.entry), `routes/${c.cmd}: the UI message and the agent command both reach ACTIONS.${c.entry}`);
  ok(!!uiVerdict && JSON.stringify(r.result?.verdict) === JSON.stringify(withoutLines(uiVerdict)),
    `parity/${c.cmd}: result.verdict is exactly the '${c.verdictType}' the panel got${uiVerdict ? ` (${String(uiVerdict.headline ?? uiVerdict.summary).slice(0, 40)})` : ''}`);
  // #2177: the drawer's lines reach the panel, one per item, and never the agent.
  const keys = AGENT_KEYS[c.verdictType];
  if (keys) {
    ok(JSON.stringify(Object.keys(r.result?.verdict ?? {})) === JSON.stringify(keys),
      `#2177 agent/${c.cmd}: the agent's verdict has the keys it had before the drawer drew lines, in order (${Object.keys(r.result?.verdict ?? {}).join(', ')})`);
    const lines = uiVerdict?.lines as unknown;
    ok(Array.isArray(lines) && lines.length > 0 && lines.every((l) => typeof l === 'string' && l !== '' && String(uiVerdict.summary).includes(l)),
      `#2177 panel/${c.cmd}: the panel's verdict carries its summary's items as lines, each in the summary's words (${JSON.stringify(lines)})`);
  }
  // #3326: a verdict's causes reach the panel, and never the agent (its envelope keeps the keys it had).
  if (uiVerdict && 'causes' in uiVerdict) {
    ok(Array.isArray(uiVerdict.causes) && !('causes' in (r.result?.verdict ?? {})),
      `#3326 causes/${c.cmd}: the panel's verdict carries its causes, the agent's does not (${JSON.stringify(uiVerdict.causes)})`);
  }
  // PILLS (the owner's call): the panel shows an agent's verdict as it shows a button's — the same message,
  // except that a prune PREVIEW goes pill-only, so it can never open the confirm dialog on the owner's screen.
  const toPanel = posted.filter((m) => m.type === c.verdictType).pop();
  const isPreview = c.verdictType === 'prune-result' && uiVerdict && !uiVerdict.applied;
  ok(!!toPanel && JSON.stringify(toPanel) === JSON.stringify(isPreview ? { ...uiVerdict, pillOnly: true } : uiVerdict),
    `pills/${c.cmd}: the panel gets the agent's verdict${isPreview ? ', marked pill-only' : ''}`);
  if (isPreview) ok(!('pillOnly' in uiVerdict), 'pills/prune: the panel\'s own preview is not pill-only (its dialog still opens)');
  // BRACKETS (UI redesign S11): the panel hears that the agent's command started and finished, around its
  // verdict, so the Activity drawer can show the run as the agent's. The UI path posts neither.
  const at = (type: string): number => posted.findIndex((m) => m.type === type && (type === c.verdictType || (m.id === id && m.cmd === c.cmd)));
  ok(at('agent-started') >= 0 && at('agent-started') < at(c.verdictType) && at(c.verdictType) < at('agent-finished'),
    `brackets/${c.cmd}: the panel gets agent-started, then the verdict, then agent-finished, naming the command`);
}
// The readback also carries the component census; on a file with no component pages every page is absent.
{
  const rb = results[CASES.findIndex((c) => c.cmd === 'readback')];
  const census = (rb.result?.data as { components?: { present: boolean }[] }).components;
  ok(Array.isArray(census) && census.length > 0 && census.every((p) => p.present === false), 'readback: the component census lists every component page (absent here)');
  const pr = results[CASES.findIndex((c) => c.cmd === 'prune')];
  ok(!!(pr.result?.data as { prunePlan?: unknown }).prunePlan, 'prune: the plan behind the preview is structured data');
  const bc = results[CASES.findIndex((c) => c.cmd === 'build-components')];
  ok(Array.isArray(((bc.result?.data as { build?: { known?: unknown } }).build)?.known), 'build-components: the known def ids are structured data');
}

/* ── update-components + capture-baseline (#2265) ───────────────────────────────────────────────────── */
section('update — the dry run and the baseline capture reach their handlers, report a verdict, and refuse an apply (#2265)');
{
  for (const [cmd, entry] of [['update-components', 'updateComponents'], ['capture-baseline', 'captureBaseline'], ['adopt-members', 'adoptMembers'], ['draw-specs', 'drawSpecs']] as const) {
    calls.length = 0;
    posted.length = 0;
    const { id } = await send(cmd, { def: 'no-such-def' });
    await tick();
    const r = (await read(id)) as AgentResult;
    const v = r.result?.verdict as { type?: string; ok?: boolean; summary?: string } | null;
    ok(calls.includes(entry) && v?.type === 'component-update-result' && v.ok === false && /no-such-def/.test(String(v.summary)),
      `update/${cmd}: reaches ACTIONS.${entry}, and an unknown def is a failed component-update-result naming it (${v?.type}, ${String(v?.summary).slice(0, 50)})`);
    const at = (type: string): number => posted.findIndex((m) => m.type === type && (type === 'component-update-result' || (m.id === id && m.cmd === cmd)));
    ok(at('agent-started') >= 0 && at('agent-started') < at('component-update-result') && at('component-update-result') < at('agent-finished'),
      `update/${cmd}: the panel gets agent-started, then the verdict, then agent-finished`);
  }
  // #2830 Q2830.3 A: Documentation › Specs' Draw specs is the panel's twin of `draw-specs`, for the current page, so it is
  // no parity case (the agent's draws the whole file, and says so): the same ACTIONS entry, scoped 'page', and its
  // verdict back to the panel; the agent's command reaches it scoped 'file'. (Mutation: the panel's case calling the bare
  // handler, or scoped 'file' → `specs/panel` fails.)
  {
    const seenS: unknown[][] = [];
    const origS = actions.drawSpecs;
    actions.drawSpecs = (...a: unknown[]) => { seenS.push(a); return origS(...a); };
    posted.length = 0;
    await toUi({ type: 'draw-specs' });
    const vS = posted.filter((m) => m.type === 'component-update-result').pop() as { headline?: string; summary?: string } | undefined;
    ok(seenS.length === 1 && seenS[0][0] === undefined && seenS[0][1] === 'page' && vS?.headline === '✗ no sets to spec' && /on this page/.test(String(vS?.summary)),
      `specs/panel: the panel's draw-specs reaches ACTIONS.drawSpecs for the current page, and its verdict comes back to the panel (${JSON.stringify(seenS.map((a) => a.slice(0, 2)))}, "${vS?.headline}": ${String(vS?.summary).slice(0, 60)})`);
    seenS.length = 0;
    const ds = await send('draw-specs', {});
    await tick();
    await read(ds.id);
    actions.drawSpecs = origS;
    ok(seenS.length === 1 && seenS[0][1] === 'file', `specs/agent: the agent's draw-specs reaches the same entry for the whole file (${JSON.stringify(seenS.map((a) => a.slice(0, 2)))})`);
  }
  // No def: every set the engine projects, none of which this file holds. (That a check writes nothing is
  // `test-update-components.ts`'s, which has sets to write to.)
  posted.length = 0;
  const all = await send('update-components', {});
  await tick();
  const ra = (await read(all.id)) as AgentResult;
  const up = (ra.result?.data as { update?: { mode?: string; sets?: unknown[]; missing?: string[] } } | undefined)?.update;
  ok(ra.ok === true && up?.mode === 'preview' && Array.isArray(up.sets) && up.sets.length === 0 && (up.missing?.length ?? 0) >= 20,
    `update/all: with no def it checks every projected set, and reports each absent one as missing (${up?.missing?.length})`);
  const hash = (up as { previewHash?: unknown } | undefined)?.previewHash;
  ok(typeof hash === 'string' && /^[0-9a-f]{8}$/.test(hash), `update/hash: the check's result carries the previewHash a confirm must echo (${String(hash)})`);
  // #2265 PR 2 — the apply. Without the check's hash it is refused before any handler runs.
  calls.length = 0;
  const ap = await send('update-components', { confirm: true });
  await tick();
  const rp = (await read(ap.id)) as AgentResult;
  ok(rp.ok === false && rp.error?.code === 'bad-args' && /previewHash/.test(String(rp.error?.message)) && !calls.includes('updateComponents'),
    `update/apply needs the hash: confirm: true with no previewHash is refused as bad-args before any handler runs (${rp.error?.code})`);
  // With it, it reaches the handler carrying that hash, and the panel is told this run applies.
  const seen: unknown[][] = [];
  const orig = actions.updateComponents;
  actions.updateComponents = (...a: unknown[]) => { seen.push(a); return (orig as (...x: unknown[]) => Promise<void>)(...a); };
  posted.length = 0;
  const go = await send('update-components', { confirm: true, previewHash: 'abcdef01' });
  await tick();
  actions.updateComponents = orig;
  const started = posted.find((m) => m.type === 'agent-started' && m.id === go.id) as { apply?: unknown } | undefined;
  ok(seen.length === 1 && seen[0][1] === 'abcdef01' && seen[0][2] === undefined && started?.apply === true,
    `update/apply: confirm: true with the hash reaches ACTIONS.updateComponents with that hash, and agent-started says apply (${JSON.stringify(seen.map((a) => a[1]))}, ${String(started?.apply)})`);
  // The choices reach the handler as sent; one the protocol does not know is refused before any handler runs.
  seen.length = 0;
  actions.updateComponents = (...a: unknown[]) => { seen.push(a); return (orig as (...x: unknown[]) => Promise<void>)(...a); };
  const ch = await send('update-components', { confirm: true, previewHash: 'abcdef01', choices: { handEdits: 'accept', noBaseline: 'skip', sets: { tag: { handEdits: 'overwrite', noBaseline: 'update' } } } });
  await tick();
  const wrong = await send('update-components', { confirm: true, previewHash: 'abcdef01', choices: { handEdits: 'delete' } });
  await tick();
  actions.updateComponents = orig;
  const rw = (await read(wrong.id)) as AgentResult;
  void ch;
  ok(seen.length === 1 && JSON.stringify(seen[0][2]) === JSON.stringify({ handEdits: 'accept', noBaseline: 'skip', sets: { tag: { handEdits: 'overwrite', noBaseline: 'update' } } }) && rw.ok === false && rw.error?.code === 'bad-args',
    `update/choices: the choices reach ACTIONS.updateComponents as sent, and an unknown one is refused as bad-args (${JSON.stringify(seen.map((a) => a[2]))}, ${rw.error?.code})`);
  const check = posted.find((m) => m.type === 'agent-started' && m.id === all.id) as { apply?: unknown } | undefined;
  ok(check === undefined || check.apply === undefined, 'update/check: a check is not marked as an apply');
  // Without `confirm: true` nothing is applied, whatever else is sent (#2328 review, M5). Two layers hold this: the
  // protocol rebuilds a no-confirm command from `def` alone, and the dispatcher passes a hash and choices only on a
  // confirm. The hash sent is the file's real one, from `update/all`, so an apply let through would pass the hash
  // check rather than stop on a mismatch. Each must reach the handler as a check (no hash, no choices), come back
  // as a check, not be announced as an apply, and save no version or write any plugin data outside the mailbox.
  // End to end, each layer covers the other, so one layer mutated alone is harmless there: each is also held on its
  // own. Mutations: the protocol passing the hash through on `confirm: false` → `update/no confirm protocol`; the
  // dispatcher forwarding it whatever `confirm` says → `update/no confirm dispatch`; both → `update/no confirm` too.
  const versions: string[] = [];
  host.saveVersionHistoryAsync = async (t: string) => { versions.push(t); return { id: 'v' }; };
  const fileData = () => [...store.keys()].filter((x) => !x.startsWith(`${MAILBOX.ns}\u0000`)).map((x) => `${x}=${store.get(x)}`).sort().join('\n');
  const hashSent = typeof hash === 'string' ? hash : 'abcdef01';
  for (const [label, args] of [
    ['no confirm', { previewHash: hashSent, choices: { handEdits: 'overwrite', noBaseline: 'update' } }],
    ['confirm: false', { confirm: false, previewHash: hashSent, choices: { handEdits: 'overwrite', noBaseline: 'update' } }],
  ] as const) {
    seen.length = 0;
    versions.length = 0;
    const dataBefore = fileData();
    actions.updateComponents = (...a: unknown[]) => { seen.push(a); return (orig as (...x: unknown[]) => Promise<void>)(...a); };
    posted.length = 0;
    const nc = await send('update-components', args);
    await tick();
    actions.updateComponents = orig;
    const rn = (await read(nc.id)) as AgentResult;
    const mode = (rn.result?.data as { update?: { mode?: string } } | undefined)?.update?.mode;
    const st = posted.find((m) => m.type === 'agent-started' && m.id === nc.id) as { apply?: unknown } | undefined;
    ok(seen.length === 1 && seen[0][1] === null && seen[0][2] === undefined && mode === 'preview' && st?.apply !== true && versions.length === 0 && fileData() === dataBefore,
      `update/no confirm (${label}): a hash and choices sent without confirm: true reach ACTIONS.updateComponents as a check (hash ${JSON.stringify(seen[0]?.[1])}, choices ${JSON.stringify(seen[0]?.[2])}), come back as one (${mode}), are not announced as an apply (${String(st?.apply)}), and save no version (${versions.length}) or write any plugin data`);
  }
  delete host.saveVersionHistoryAsync;
  for (const [label, args] of [['no confirm', { previewHash: hashSent, choices: { handEdits: 'overwrite' } }], ['confirm: false', { confirm: false, previewHash: hashSent, choices: { handEdits: 'overwrite' } }]] as const) {
    const pc = parseCommand({ v: AGENT_PROTOCOL_VERSION, id: 'nc-p', cmd: 'update-components', args, issuedAt: '2026-10-08T00:00:00Z' });
    const pa = pc.ok ? (pc.command.args as Record<string, unknown>) : null;
    ok(!!pa && pa.confirm === false && !('previewHash' in pa) && !('choices' in pa),
      `update/no confirm protocol (${label}): the command is rebuilt as a check, with no previewHash and no choices (${JSON.stringify(pa)})`);
  }
  {
    const got: unknown[][] = [];
    const fake = { updateComponents: async (...a: unknown[]) => { got.push(a); } } as unknown as Parameters<(typeof ROUTES)['update-components']>[1];
    const forged = { v: AGENT_PROTOCOL_VERSION, id: 'nc-d', issuedAt: '2026-10-08T00:00:00Z', cmd: 'update-components', args: { confirm: false, previewHash: hashSent, choices: { handEdits: 'overwrite' } } } as unknown as Parameters<(typeof ROUTES)['update-components']>[0];
    await ROUTES['update-components'](forged, fake, {} as Parameters<(typeof ROUTES)['update-components']>[2], {} as Parameters<(typeof ROUTES)['update-components']>[3]);
    ok(got.length === 1 && got[0][1] === null && got[0][2] === undefined,
      `update/no confirm dispatch: a confirm: false command that carries a hash and choices reaches the handler with neither (hash ${JSON.stringify(got[0]?.[1])}, choices ${JSON.stringify(got[0]?.[2])})`);
  }
}

/* ── style-guide tables + progress (#1778) ───────────────────────────────────────────────────────────── */
section('style-guide — tables reach the handler; a table reading is progress, never a verdict (#1778)');
{
  const orig = actions.styleGuide;
  let got: unknown = null;
  actions.styleGuide = async (...a: unknown[]) => {
    got = a[0];
    const sink = a[1] as { post(m: unknown): void };
    sink.post({ type: 'style-guide-progress', done: 0, total: 2, tableMs: 0 });
    sink.post({ type: 'style-guide-progress', done: 1, total: 2, tableMs: 12 });
    sink.post({ type: 'style-guide-progress', done: 2, total: 2, tableMs: 7 });
    sink.post({ type: 'style-guide-result', ok: true, headline: '✓ style guide: 2 tables', summary: '2 tables updated in place' });
  };
  posted.length = 0;
  const { id } = await send('style-guide', { tables: ['Primary — nbds', 'Text — pds3'] });
  await tick();
  const r = (await read(id)) as AgentResult;
  actions.styleGuide = orig;
  ok(JSON.stringify(got) === JSON.stringify({ tables: ['Primary — nbds', 'Text — pds3'] }), `style-guide: args.tables reaches the handler as sent (${JSON.stringify(got)})`);
  ok(r.ok && (r.result?.verdict as { type?: string } | null)?.type === 'style-guide-result' && !('earlierVerdicts' in (r.result?.data ?? {}))
    && JSON.stringify((r.progress ?? []).map((p) => `${p.phase} ${p.done}/${p.total} ${p.chunkMs}ms`)) === JSON.stringify(['table 0/2 0ms', 'table 1/2 12ms', 'table 2/2 7ms']),
    `style-guide: each table reading streams as progress phase "table", and the verdict is the result alone (${JSON.stringify(r.progress?.map((p) => p.phase))})`);
  ok(!posted.some((m) => m.type === 'style-guide-progress'), 'style-guide: an agent run\'s table readings are not forwarded to the panel as verdicts');

  // #259 phase 2: the dimension, font-variable and text-style options reach the handler as sent.
  const p2args = { types: ['dimension', 'typography'], pixels: false, rem: true, dimensionDisplay: 'line', fontDisplay: 'letterSpacing', paragraphSpacing: true, textDecoration: false, titleCell: true, tokenNames: 'short' };
  actions.styleGuide = async (...a: unknown[]) => {
    got = a[0];
    (a[1] as { post(m: unknown): void }).post({ type: 'style-guide-result', ok: true, headline: '✓ style guide: 1 table', summary: '' });
  };
  const p2 = await send('style-guide', p2args);
  await tick();
  await read(p2.id);
  actions.styleGuide = orig;
  // `pixels` IS RETIRED (owner decision 20): accepted and ignored, never passed on as an option; the handler gets
  // `retired: ['pixels']`, which the run's notes say was ignored. Typed literally here.
  ok(JSON.stringify(got) === '{"types":["dimension","typography"],"rem":true,"dimensionDisplay":"line","fontDisplay":"letterSpacing","paragraphSpacing":true,"textDecoration":false,"titleCell":true,"tokenNames":"short","retired":["pixels"]}',
    `style-guide: the phase-2 options reach the handler as sent, and a retired pixels arrives as retired, not as an option (${JSON.stringify(got)})`);
  // Any value of it is accepted, so an older caller that sent a string is not refused either.
  actions.styleGuide = async (...a: unknown[]) => {
    got = a[0];
    (a[1] as { post(m: unknown): void }).post({ type: 'style-guide-result', ok: true, headline: '✓ style guide: 1 table', summary: '' });
  };
  const px = await send('style-guide', { pixels: 'yes' });
  await tick();
  const rpx = (await read(px.id)) as AgentResult;
  actions.styleGuide = orig;
  ok(rpx.ok === true && JSON.stringify(got) === '{"retired":["pixels"]}', `style-guide: pixels "yes" is accepted and ignored, not refused (${rpx.ok}; ${JSON.stringify(got)})`);
}

/* ── one style-guide run at a time (#1785) ──────────────────────────────────────────────────────────── */
section('one-run — a style guide asked for from one entry point while the other\'s run draws is refused with busy (#1785, #1957)');
{
  // A file the real `styleGuide` can run over: one color variable, the two cell sets, no token page (so its one table
  // is a named skip). What matters is that the run YIELDS: `realYield` is a 0ms `setTimeout`, held here apart from the
  // poll's 1000ms one, so a run stays mid-yield until `release()` — through `main.ts`'s own guard, not a stub.
  const held: (() => void)[] = [];
  const pollTimeout = g.setTimeout as unknown as (fn: () => void, ms?: number) => number;
  g.setTimeout = ((fn: () => void, ms?: number) => { if (!ms) { held.push(fn); return 0; } return pollTimeout(fn, ms); }) as unknown as typeof setTimeout;
  const release = async (): Promise<void> => {
    for (let i = 0; i < 20 && held.length; i++) { for (const fn of held.splice(0)) fn(); for (let j = 0; j < 40; j++) await settle(); }
  };
  const r0 = root as Record<string, unknown>;
  const saved = { load: host.loadAllPagesAsync, vars: host.variables, find: r0.findAllWithCriteria };
  host.loadAllPagesAsync = async () => undefined;
  // The style guide saves a named version before its first table (#2828); this fake host takes it and records nothing.
  host.saveVersionHistoryAsync = async () => ({ id: "v" });
  host.variables = {
    getLocalVariableCollectionsAsync: async () => [{ id: 'C:1', name: 'ramp', modes: [{ modeId: 'm:0', name: 'Value' }], defaultModeId: 'm:0' }],
    getLocalVariablesAsync: async () => [{ id: 'V:1', name: 'ramp/100', variableCollectionId: 'C:1', resolvedType: 'COLOR', description: '', valuesByMode: { 'm:0': { r: 1, g: 0, b: 0, a: 1 } } }],
    setBoundVariableForPaint: (p: unknown) => p,
  };
  r0.findAllWithCriteria = () => [{ name: '_style-guide-swatches', type: 'COMPONENT_SET', children: [] }, { name: '_style-guide-text-cells', type: 'COMPONENT_SET', children: [] }];
  type Verdict = { type?: string; ok?: boolean; headline?: string; summary?: string };
  const results_ = (): Verdict[] => posted.filter((m) => m.type === 'style-guide-result');
  // Main's run guard (#1957, `run-guard.ts`) is the one guard: its refusal and its words, which name the holder (#3718 D3718.1 B).
  const SG_BUSY = 'Style guides is already running. Try again when it finishes.';
  const sgRefusals = (agentFlag: boolean) => posted.filter((m) => m.type === 'refused' && m.agent === agentFlag);
  const isSgRefusal = (m: any, agentFlag: boolean) =>
    JSON.stringify(m) === JSON.stringify({ type: 'refused', code: 'busy', cmd: 'style-guide', agent: agentFlag, message: SG_BUSY, held: 'style-guide' });

  // THE PANEL FIRST: a click starts a run, which holds at its yield; the agent link then asks for one.
  posted.length = 0;
  await toUi({ type: 'style-guide', options: {} });
  const heldPanel = held.length;
  const { id: a1 } = await send('style-guide', {});
  await tick();
  const r1 = (await read(a1)) as AgentResult;
  const ar = sgRefusals(true);
  ok(heldPanel > 0 && r1.ok === false && r1.error?.code === 'busy' && r1.error?.message === SG_BUSY && ar.length === 1 && isSgRefusal(ar[0], true),
    `one-run/agent: a style guide asked for over the link while the panel's run is mid-yield is refused with busy (${r1.error?.code}: ${r1.error?.message})`);
  ok(results_().length === 0 && !posted.some((m) => m.type === 'agent-started' && m.id === a1), 'one-run/agent: the refusal is no verdict over the panel\'s run, and the agent\'s run never started');
  ok(r1.error?.message === 'Style guides is already running. Try again when it finishes.' && ar[0]?.message === 'Style guides is already running. Try again when it finishes.',
    `busy/words: a refusal behind Style guides reads "Style guides is already running. Try again when it finishes." (${r1.error?.message}; ${ar[0]?.message})`);
  await release();
  const p1 = results_();
  ok(p1.length === 1, `one-run: the panel's run then finishes and reports once (${p1.map((m) => m.headline).join(', ')})`);

  // THE AGENT FIRST: a command starts a run, which holds at its yield; a click then asks for one.
  posted.length = 0;
  const { id: a2 } = await send('style-guide', {});
  await tick();
  ok(held.length > 0 && posted.some((m) => m.type === 'agent-started' && m.id === a2 && m.cmd === 'style-guide'),
    'one-run/panel: an agent\'s run is held mid-yield, and the panel is told it started (its button goes busy on that)');
  await toUi({ type: 'style-guide', options: {} });
  const pr = sgRefusals(false);
  ok(pr.length === 1 && isSgRefusal(pr[0], false) && results_().length === 0,
    `one-run/panel: a click while the agent's run is mid-yield is refused with busy, and posts no verdict (${pr[0]?.message})`);
  await release();
  await tick();
  const r2 = (await read(a2)) as AgentResult;
  const v2 = r2.result?.verdict as Verdict | null;
  ok(v2?.type === 'style-guide-result' && results_().length === 1 && results_()[0].headline === v2.headline,
    `one-run: the agent's run then finishes, and its one verdict reaches the panel (${v2?.headline})`);

  // And the guard is open again: a click runs.
  posted.length = 0;
  await toUi({ type: 'style-guide', options: {} });
  await release();
  ok(results_().length === 1 && !posted.some((m) => m.type === 'refused'), 'one-run: once both have reported, the next click runs');

  delete host.saveVersionHistoryAsync;
  host.loadAllPagesAsync = saved.load; host.variables = saved.vars; r0.findAllWithCriteria = saved.find;
  g.setTimeout = pollTimeout as unknown as typeof setTimeout;
}

/* ── envelope ───────────────────────────────────────────────────────────────────────────────────────── */
section('envelope — every field, every command');
for (const r of results) {
  const fields = ['v', 'id', 'cmd', 'ok', 'startedAt', 'finishedAt', 'engineVersion', 'transport'];
  ok(fields.every((f) => f in r) && r.v === AGENT_PROTOCOL_VERSION && r.engineVersion === ENGINE_VERSION && r.transport === 'mailbox'
    && !Number.isNaN(Date.parse(r.startedAt)) && Date.parse(r.finishedAt) >= Date.parse(r.startedAt)
    && ('result' in r) !== ('error' in r) && Array.isArray(r.result?.logs),
  `envelope/${r.cmd}: v, id, cmd, ok, startedAt ≤ finishedAt, engineVersion, transport, exactly one of result|error, logs`);
  ok(r.ok === (r.result?.verdict as { ok?: boolean } | null)?.ok, `envelope/${r.cmd}: ok is the verdict's own ok (${r.ok})`);
}

/* ── foreign file ───────────────────────────────────────────────────────────────────────────────────── */
section('foreign — apply-theme refuses the whole write on content Prism3 did not make, from either caller (#1884)');
{
  // A file someone else built: a `color` collection with no Prism3 stamp, a same-named variable of another
  // type inside it, and an effect style under one of Prism3's names with the designer's own description.
  // Every object records any property write, and every writing method records its call, so a write the
  // pre-flight lets through is counted here whichever executor makes it.
  const writes: string[] = [];
  const rec = <T extends object>(label: string, o: T): T =>
    new Proxy(o, { set: (t, p, v) => { writes.push(`${label}.${String(p)}`); (t as Record<string | symbol, unknown>)[p] = v; return true; } });
  const write = (what: string) => () => { writes.push(what); throw new Error(`test host: ${what} is a write`); };
  const col = rec('collection color', {
    id: 'VariableCollectionId:9:1', name: 'color', modes: [{ modeId: '9:0', name: 'Mode 1' }],
    renameMode: write('renameMode'), addMode: write('addMode'),
    getSharedPluginData: () => '', setSharedPluginData: write('collection setSharedPluginData'),
  });
  const v = rec('variable', {
    id: 'VariableID:9:2', name: 'ads/color/background/primary', variableCollectionId: col.id, resolvedType: 'STRING',
    scopes: [], description: '', hiddenFromPublishing: false, valuesByMode: { '9:0': 'hand-typed' },
    setValueForMode: write('setValueForMode'),
  });
  const style = rec('effect style', {
    name: 'shadow/xs', description: 'Card shadow, our own', effects: [],
    getSharedPluginData: () => '', setSharedPluginData: write('style setSharedPluginData'),
  });
  const saved = { ...host };
  Object.assign(host, {
    variables: {
      getLocalVariableCollectionsAsync: async () => [col], getLocalVariablesAsync: async () => [v],
      createVariableCollection: write('createVariableCollection'), createVariable: write('createVariable'),
      createVariableAlias: write('createVariableAlias'),
    },
    getLocalEffectStylesAsync: async () => [style],
    createEffectStyle: write('createEffectStyle'), createPaintStyle: write('createPaintStyle'),
    createGridStyle: write('createGridStyle'), createTextStyle: write('createTextStyle'),
    loadFontAsync: async () => undefined,
  });
  try {
    const SUMMARY = 'Nothing was written. 3 conflicts with existing content: collection "color" already in this file, not created by Prism3; ' +
      'variable "ads/color/background/primary" is STRING in "color"; Prism3 writes COLOR; ' +
      'effect style "shadow/xs" already in this file, not created by Prism3';
    posted.length = 0;
    await toUi({ type: 'apply-theme', input: brand });
    const uiVerdict = posted.filter((m) => m.type === 'apply-result').pop();
    ok(uiVerdict?.ok === false && uiVerdict.headline === '✗ 3 conflicts' && String(uiVerdict.summary).startsWith(SUMMARY),
      `foreign/panel: the Apply button's verdict is "✗ 3 conflicts" and names each one (${String(uiVerdict?.headline)}: ${String(uiVerdict?.summary).slice(0, 60)}…)`);
    const { id } = await send('apply-theme', { input: brand });
    await tick();
    const r = (await read(id)) as AgentResult;
    ok(r.ok === false && !!uiVerdict && JSON.stringify(r.result?.verdict) === JSON.stringify(withoutLines(uiVerdict)),
      'foreign/agent: the agent\'s apply-theme gets the same refusal, byte for byte');
    const data = r.result?.data as { conflicts?: { kind: string; name: string }[] } | undefined;
    ok(JSON.stringify(data?.conflicts?.map((c) => `${c.kind} ${c.name}`)) ===
      JSON.stringify(['collection color', 'variable ads/color/background/primary', 'effect style shadow/xs']),
    'foreign/agent: the structured data lists every conflict, not only the capped summary');
    ok(writes.length === 0 && !store.has(k('prism3', 'brandInput')),
      `foreign: neither caller wrote anything — no variable, style or stamp, and no persisted brand (${writes.slice(0, 3).join(', ') || 'none'})`);
  } finally {
    for (const key of Object.keys(host)) if (!(key in saved)) delete host[key];
    Object.assign(host, saved);
  }
}

/* ── claim-before-run ───────────────────────────────────────────────────────────────────────────────── */
section('claim-before-run');
{
  const { id } = await send('readback');
  let claimedDuring = false;
  duringCall = () => { claimedDuring = JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.claimed) || '[]').includes(id); };
  await tick();
  duringCall = null;
  ok(claimedDuring, 'the id is in `claimed` while its handler runs');
}

/* ── brackets/throw ─────────────────────────────────────────────────────────────────────────────────── */
section('brackets/throw — a handler that throws still tells the panel the run finished');
{
  // The spy's `duringCall` runs inside the ACTIONS entry the dispatcher calls, so throwing from it is the
  // handler throwing. Without `agent-finished` the panel's Activity row stays on "Running", tagged Agent.
  posted.length = 0;
  const { id } = await send('apply-theme', { input: brand });
  duringCall = () => { throw new Error('test host: the handler threw'); };
  await tick();
  duringCall = null;
  const r = (await read(id)) as AgentResult;
  ok(r.ok === false && r.error?.code === 'handler-threw', `brackets/throw: the command fails as handler-threw (${r.error?.code})`);
  const at = (type: string): number => posted.findIndex((m) => m.type === type && m.id === id && m.cmd === 'apply-theme');
  ok(at('agent-started') >= 0 && at('agent-started') < at('agent-finished'),
    'brackets/throw: the panel still gets agent-started, then agent-finished, naming the command');
  ok(!posted.some((m) => m.type === 'apply-result'), 'brackets/throw: and no verdict, so the drawer restores the row\'s previous result');
}

/* ── busy ───────────────────────────────────────────────────────────────────────────────────────────── */
section('busy — a second write of an operation, while one is running, is refused with busy (#1957)');
{
  // The words name the write holding the file (#3718 D3718.1 B): Theme, in every arm of this section.
  const BUSY = 'Theme is already running. Try again when it finishes.';
  /** Hold the host's text-style read, so a write that reaches it waits there until `release()`. */
  const hold = (): (() => Promise<void>) => {
    let open!: () => void;
    gate = new Promise<void>((r) => { open = r; });
    return async () => { gate = null; open(); for (let i = 0; i < 40; i++) await settle(); };
  };
  // An apply's first host read is the text styles, in its font preload; it needs `loadFontAsync` to get
  // that far (this host has none, so an apply otherwise fails before its first await).
  const savedHost = { getLocalTextStylesAsync: host.getLocalTextStylesAsync, loadFontAsync: host.loadFontAsync };
  Object.assign(host, { getLocalTextStylesAsync: held, loadFontAsync: async () => undefined });
  const refusals = (agentFlag: boolean) => posted.filter((m) => m.type === 'refused' && m.agent === agentFlag);
  const isRefusal = (m: any, agentFlag: boolean, cmd = 'apply-theme', held = 'apply-theme') =>
    JSON.stringify(m) === JSON.stringify({ type: 'refused', code: 'busy', cmd, agent: agentFlag, message: BUSY, held });
  // The baseline: a lone panel apply, nothing else running.
  posted.length = 0;
  await toUi({ type: 'apply-theme', input: brand });
  const baseline = JSON.stringify(posted.filter((m) => m.type === 'apply-result').pop());
  ok(baseline !== undefined && !posted.some((m) => m.type === 'refused'), 'busy/baseline: a lone apply posts its verdict and is not refused');

  // The panel's apply is running; the panel sends a second one.
  posted.length = 0;
  let release = hold();
  await toUi({ type: 'apply-theme', input: brand });
  ok(!posted.some((m) => m.type === 'apply-result'), 'busy/panel: the first apply is held mid-write');
  await toUi({ type: 'apply-theme', input: brand });
  const pr = refusals(false);
  ok(pr.length === 1 && isRefusal(pr[0], false), `busy/panel: the second apply is refused with busy and the owner's words (${pr[0]?.message})`);
  ok(pr[0]?.message === 'Theme is already running. Try again when it finishes.',
    `busy/words: a refusal behind Theme reads "Theme is already running. Try again when it finishes." (${pr[0]?.message})`);
  await release();
  const pv = posted.filter((m) => m.type === 'apply-result');
  ok(pv.length === 1 && JSON.stringify(pv[0]) === baseline, `busy/panel: the first write is unaffected: one verdict, the baseline's (${pv.length})`);

  // The panel's apply is running; an agent sends one.
  posted.length = 0;
  release = hold();
  await toUi({ type: 'apply-theme', input: brand });
  const { id } = await send('apply-theme', { input: brand });
  await tick();
  const r = (await read(id)) as AgentResult;
  ok(r.ok === false && r.error?.code === 'busy' && r.error?.message === BUSY, `busy/agent: the agent's apply fails as busy (${r.error?.code})`);
  const ar = refusals(true);
  ok(ar.length === 1 && isRefusal(ar[0], true), 'busy/agent: the panel is told an agent\'s apply was refused');
  ok(!posted.some((m) => m.type === 'agent-started' && m.id === id), 'busy/agent: and never that it started');
  await release();
  const av = posted.filter((m) => m.type === 'apply-result');
  ok(av.length === 1 && JSON.stringify(av[0]) === baseline, 'busy/agent: the panel\'s write is unaffected');

  // An agent's apply is running; the panel sends one.
  posted.length = 0;
  release = hold();
  const first = await send('apply-theme', { input: brand });
  await tick();
  ok(posted.some((m) => m.type === 'agent-started' && m.id === first.id) && !posted.some((m) => m.type === 'apply-result'),
    'busy/agent-first: the agent\'s apply is held mid-write');
  await toUi({ type: 'apply-theme', input: brand });
  const fr = refusals(false);
  ok(fr.length === 1 && isRefusal(fr[0], false), 'busy/agent-first: the panel\'s apply is refused with busy');
  await release();
  for (let i = 0; i < 400 && timers.size === 0; i++) await settle();
  const fa = (await read(first.id)) as AgentResult;
  ok(fa.error?.code !== 'busy' && JSON.stringify(fa.result?.verdict) === JSON.stringify(withoutLines(JSON.parse(baseline))), 'busy/agent-first: the agent\'s write is unaffected: its verdict is the baseline\'s (less the panel\'s lines, #2177)');

  // Released however it ended: a new apply runs.
  posted.length = 0;
  await toUi({ type: 'apply-theme', input: brand });
  ok(!posted.some((m) => m.type === 'refused') && posted.filter((m) => m.type === 'apply-result').length === 1, 'busy/release: once the run ends, the next apply runs');
  // A write that throws releases too: the hold is dropped in a `finally`.
  const g2 = createRunGuard();
  await g2.run('apply-theme', async () => { throw new Error('test: the write threw'); }).catch(() => undefined);
  ok(!g2.busy(), 'busy/release: a write that threw releases the file');

  // ONE HOLD (#3697 R7, owner decision; was per operation, #1995). While the panel's Apply Theme is mid-write, every
  // other write is refused, the panel's and an agent's, and the refusal names both the write asked for and Theme.
  posted.length = 0;
  release = hold();
  await toUi({ type: 'apply-theme', input: brand });
  await toUi({ type: 'file-setup' });
  const fs1 = refusals(false);
  ok(fs1.length === 1 && isRefusal(fs1[0], false, 'file-setup') && !posted.some((m) => m.type === 'file-setup-result'),
    `busy/one hold: while an apply is running, the panel's file setup is refused, naming Theme as the holder (${JSON.stringify(fs1[0])})`);
  calls.length = 0;
  const bc = await send('build-components', { def: 'button' });
  await tick();
  const rbc = (await read(bc.id)) as AgentResult;
  const abc = refusals(true);
  ok(rbc.ok === false && rbc.error?.code === 'busy' && rbc.error?.message === BUSY && !calls.includes('buildComponents')
    && abc.length === 1 && isRefusal(abc[0], true, 'build-components') && !posted.some((m) => m.type === 'agent-started' && m.id === bc.id),
    `busy/one hold: an agent's build-components arriving mid Apply Theme is refused as busy before it starts, and the panel is told the holder (${rbc.error?.code}: ${rbc.error?.message}; ${JSON.stringify(abc[0])})`);
  ok(fs1[0]?.message === 'Theme is already running. Try again when it finishes.' && abc[0]?.message === 'Theme is already running. Try again when it finishes.'
    && rbc.error?.message === 'Theme is already running. Try again when it finishes.',
    `busy/words: a file setup and an agent's build refused behind Theme name Theme, not the write asked for (${fs1[0]?.message}; ${abc[0]?.message}; ${rbc.error?.message})`);
  const pc = await send('prune', { input: brand, confirm: true });
  await tick();
  const rpc = (await read(pc.id)) as AgentResult;
  ok(rpc.ok === false && rpc.error?.code === 'busy' && !calls.includes('prune'),
    `busy/one hold: an agent's prune delete arriving mid Apply Theme is refused as busy (${rpc.error?.code})`);
  posted.length = 0;
  await toUi({ type: 'style-guide-cleanup', ids: [] });
  const sgc = refusals(false);
  ok(sgc.length === 1 && isRefusal(sgc[0], false, 'style-guide') && !posted.some((m) => m.type === 'style-guide-cleanup-result'),
    `busy/one hold: the panel's style-guide cleanup arriving mid Apply Theme is refused, naming Theme as the holder, and never runs (${JSON.stringify(sgc[0])})`);
  await release();
  const ov = posted.filter((m) => m.type === 'apply-result');
  ok(ov.length === 1 && JSON.stringify(ov[0]) === baseline, 'busy/one hold: the running apply is unaffected: one verdict, the baseline\'s');
  posted.length = 0;
  await toUi({ type: 'file-setup' });
  ok(!posted.some((m) => m.type === 'refused') && posted.some((m) => m.type === 'file-setup-result'), 'busy/one hold: once the apply ends, the file setup runs');

  // PREVIEW (#1995): a prune preview writes nothing, so it is never refused, even while a prune delete runs.
  // The prune reads the file's collections, so that read holds the delete here.
  const vars = host.variables as Record<string, unknown>;
  const savedCollections = vars.getLocalVariableCollectionsAsync;
  vars.getLocalVariableCollectionsAsync = held;
  posted.length = 0;
  release = hold();
  await toUi({ type: 'prune', input: brand, confirm: true });
  ok(!posted.some((m) => m.type === 'prune-result'), 'busy/preview: the prune delete is held mid-run');
  await toUi({ type: 'prune', input: brand, confirm: true });
  ok(posted.filter((m) => m.type === 'refused').length === 1 &&
    JSON.stringify(posted.find((m) => m.type === 'refused')) === JSON.stringify({ type: 'refused', code: 'busy', cmd: 'prune', agent: false, message: 'Prune stale is already running. Try again when it finishes.', held: 'prune' }),
    'busy/preview: a second prune delete is refused (the control for the preview arms)');
  posted.length = 0;
  await toUi({ type: 'prune', input: brand, confirm: false });
  const pv2 = await send('prune', { input: brand, confirm: false });
  await tick();
  ok(!posted.some((m) => m.type === 'refused'), 'busy/preview: a prune preview from the panel, and one from an agent, are not refused while a delete runs');
  await release();
  for (let i = 0; i < 400 && timers.size === 0; i++) await settle();
  const pa = (await read(pv2.id)) as AgentResult;
  ok(posted.filter((m) => m.type === 'prune-result').length >= 2 && pa.error?.code !== 'busy' && !!pa.result,
    `busy/preview: both previews run to a verdict, and the agent's is not busy (${pa.error?.code ?? 'no error'})`);
  vars.getLocalVariableCollectionsAsync = savedCollections;
  Object.assign(host, savedHost);
}

/* ── busy/sink + busy/titles ────────────────────────────────────────────────────────────────────────── */
section('busy/sink, busy/titles — a refusal reaching the agent\'s sink fails the command; the two title tables agree (#1995)');
{
  // The dispatcher declines before the guarded call, so this path is unreachable through main.ts. Driven here
  // with a handler that posts the refusal itself, the way the guard would if `refuse` were ever bypassed.
  const MSG = 'Update file is already running. Try again when it finishes.';
  const noop = async () => undefined;
  const d = createDispatcher({
    actions: {
      applyTheme: async (_input: unknown, _choices: unknown, sink: { post(m: unknown): void }) => { sink.post({ type: 'refused', code: 'busy', cmd: 'apply-theme', agent: true, message: MSG }); },
      buildComponents: noop, fileSetup: noop, styleGuide: noop, prune: noop, seedFromFile: noop, updateComponents: noop, captureBaseline: noop, adoptMembers: noop, drawSpecs: noop, panelsClean: noop,
    } as unknown as Parameters<typeof createDispatcher>[0]['actions'],
    status: async () => ({}),
    census: async () => null,
  });
  const r = await d(envelope('apply-theme', { input: brand }), 'mailbox');
  ok(r.ok === false && r.error?.code === 'busy' && r.error?.message === MSG,
    `busy/sink: a refusal that reaches the agent's sink fails the command with its code (${r.ok}, ${r.error?.code})`);

  // Each table read from its own file; the key pairing written out here.
  const PAIRS: [keyof typeof TITLE, keyof typeof OP_TITLE][] = [
    ['apply-theme', 'apply'], ['build-components', 'components'], ['file-setup', 'filesetup'], ['style-guide', 'styleguide'], ['prune', 'prune'],
  ];
  ok(PAIRS.length === Object.keys(TITLE).length && PAIRS.every(([w, o]) => TITLE[w] === OP_TITLE[o]),
    `busy/titles: run-guard.ts's TITLE matches the drawer's OP_TITLE for every write (${PAIRS.filter(([w, o]) => TITLE[w] !== OP_TITLE[o]).map(([w]) => w).join(', ') || 'all equal'})`);
}

/* ── order ──────────────────────────────────────────────────────────────────────────────────────────── */
section('order — one command per poll, in send order');
{
  const a = await send('readback');
  const b = await send('status');
  calls.length = 0;
  await tick();
  ok(calls.join(',') === 'seedFromFile' && (await read(b.id)).pending === true, 'the first poll runs only the first command');
  await tick();
  const ra = (await read(a.id)) as AgentResult;
  const rb = (await read(b.id)) as AgentResult;
  ok(!!ra.finishedAt && !!rb.startedAt && ra.finishedAt <= rb.startedAt, 'the second poll runs the second, after the first finished');
}

/* ── no-rerun ───────────────────────────────────────────────────────────────────────────────────────── */
section('no-rerun');
{
  const { id } = await send('readback');
  await tick();
  calls.length = 0;
  store.delete(k(MAILBOX.ns, resultKey(id)));
  await tick();
  await tick();
  ok(calls.length === 0, 'a claimed command whose result is gone is not run again');
  // And the agent's next send drops claimed entries from the inbox, so the inbox holds only what waits.
  const next = await send('status');
  ok(next.sent.waiting === 1, `the inbox after a send holds only unclaimed commands (${next.sent.waiting})`);
  await tick();
}

/* ── failures ───────────────────────────────────────────────────────────────────────────────────────── */
section('failures — answered, never silent');
{
  const u = await send('paint-it-blue');
  await tick();
  const ru = (await read(u.id)) as AgentResult;
  ok(ru.ok === false && ru.error?.code === 'unknown-command' && ru.cmd === 'paint-it-blue', `unknown command → unknown-command (${ru.error?.message.slice(0, 50)})`);

  const c = { ...envelope('status', {}), v: 99 };
  await agent(sendSnippet(c));
  await tick();
  const rv = (await read(c.id)) as AgentResult;
  ok(rv.ok === false && rv.error?.code === 'bad-version', 'protocol version 99 → bad-version');

  calls.length = 0;
  const p = await send('prune', { input: brand });
  await tick();
  const rp = (await read(p.id)) as AgentResult;
  ok(rp.ok === false && rp.error?.code === 'bad-args' && calls.length === 0, 'prune without confirm → bad-args, and prune is not run');

  calls.length = 0;
  const sg = await send('style-guide', { collections: 'color' });
  await tick();
  const rs = (await read(sg.id)) as AgentResult;
  ok(rs.ok === false && rs.error?.code === 'bad-args' && calls.length === 0, 'style-guide with a string for collections → bad-args, and the style guide is not run');
  calls.length = 0;
  const sf = await send('style-guide', { valueFormat: 'cmyk' });
  await tick();
  const rf = (await read(sf.id)) as AgentResult;
  ok(rf.ok === false && rf.error?.code === 'bad-args' && calls.length === 0, 'style-guide with valueFormat cmyk → bad-args');
  for (const [args, what, re] of [[{ dimensionDisplay: 'bar' }, 'dimensionDisplay bar', /args\.dimensionDisplay/], [{ dimensionDisplay: 'radius' }, 'dimensionDisplay radius (removed: one spacing style per run)', /args\.dimensionDisplay/], [{ fontDisplay: 'color' }, 'fontDisplay color', /args\.fontDisplay/],
    [{ rem: 'yes' }, 'rem as a string', /args\.rem/], [{ textDecoration: 1 }, 'textDecoration as a number', /args\.textDecoration/], [{ titleCell: 'on' }, 'titleCell as a string', /args\.titleCell/],
    [{ tokenNames: 'path' }, 'tokenNames path', /args\.tokenNames/], [{ tokenNames: true }, 'tokenNames as a boolean', /args\.tokenNames/]] as const) {
    calls.length = 0;
    const sb = await send('style-guide', args);
    await tick();
    const rb = (await read(sb.id)) as AgentResult;
    ok(rb.ok === false && rb.error?.code === 'bad-args' && re.test(rb.error.message) && calls.length === 0, `style-guide with ${what} → bad-args, and the style guide is not run`);
  }
  for (const [tables, what] of [['Primary — nbds', 'a string'], [[], 'an empty list'], [['Primary — nbds', ''], 'an empty name'], [['Primary — nbds', '   '], 'a name of spaces alone']] as const) {
    calls.length = 0;
    const st = await send('style-guide', { tables });
    await tick();
    const rt = (await read(st.id)) as AgentResult;
    ok(rt.ok === false && rt.error?.code === 'bad-args' && /args\.tables/.test(rt.error.message) && calls.length === 0, `style-guide with ${what} for tables → bad-args, and the style guide is not run`);
  }

  // An entry with no usable id cannot be answered by id — it is reported on the link record instead.
  const q = JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.inbox));
  agentSide = true;
  root.setSharedPluginData(MAILBOX.ns, MAILBOX.inbox, JSON.stringify([...q, { v: 1, cmd: 'status' }]));
  agentSide = false;
  await tick();
  const link = JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.link)) as AgentLinkState;
  ok(!!link.inboxError && /no usable id/.test(link.inboxError), `an id-less entry → link.inboxError (${link.inboxError})`);
  agentSide = true;
  root.setSharedPluginData(MAILBOX.ns, MAILBOX.inbox, '[]');
  agentSide = false;
  await tick();
}

/* ── chunking ───────────────────────────────────────────────────────────────────────────────────────── */
section('chunking');
{
  // A synthetic result past the per-entry budget, with multi-byte text so the split is byte-counted.
  const big: AgentResult = {
    v: 1, id: 'big-1', cmd: 'readback', ok: true, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION, transport: 'mailbox',
    result: { verdict: null, data: { rows: Array.from({ length: 3000 }, (_, i) => `row ${i} ✓ ⚠️ ${'x'.repeat(80)}`) }, logs: [] },
  };
  storeResult(root, big);
  const manifest = JSON.parse(root.getSharedPluginData(MAILBOX.ns, resultKey('big-1')));
  ok(manifest.chunked === true && manifest.parts >= 3, `a ${Math.round(utf8Bytes(JSON.stringify(big)) / 1000)} kB result is stored as ${manifest.parts} chunks`);
  const partsFit = Array.from({ length: manifest.parts }, (_, n) => utf8Bytes(root.getSharedPluginData(MAILBOX.ns, `${resultKey('big-1')}:${n}`)))
    .every((b) => b <= MAILBOX.chunkBytes);
  ok(partsFit, `every chunk is ≤ ${MAILBOX.chunkBytes} UTF-8 bytes`);
  ok(JSON.stringify(await read('big-1')) === JSON.stringify(big), 'the read snippet reassembles it exactly');
  ok((await read('big-1', ['result', 'data', 'rows', '2999'])) === (big.result!.data.rows as string[])[2999], 'and --path picks one subtree');
}

/* ── retention ──────────────────────────────────────────────────────────────────────────────────────── */
section('retention');
{
  const ids: string[] = [];
  for (let i = 0; i < MAILBOX.keep + 5; i++) { ids.push((await send('status')).id); await tick(); }
  const kept = JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.results)) as string[];
  ok(kept.length === MAILBOX.keep && kept[kept.length - 1] === ids[ids.length - 1], `only the last ${MAILBOX.keep} results are indexed (${kept.length})`);
  ok(!root.getSharedPluginData(MAILBOX.ns, resultKey(ids[0])), 'an evicted result is cleared');
  ok(!kept.includes('big-1') && !mailboxKeys().some((x) => x.startsWith(resultKey('big-1'))), 'an evicted chunked result leaves no manifest and no chunk behind');
}

/* ── state ──────────────────────────────────────────────────────────────────────────────────────────── */
section('state — what the panel shows');
{
  const s = posted.filter((m) => m.type === 'agent-link-state').pop()?.state as AgentLinkState;
  ok(!!s?.lastCommand && s.lastCommand.cmd === 'status' && s.lastCommand.headline.length > 0, 'the panel is told the last command and its headline');
  // #3113 (Q3113.7 A): in operation words, with a relative age; never the command id or a clock time.
  const at = Date.parse(s.lastCommand!.finishedAt);
  ok(/^Listening for agent commands \(file mailbox, every 1 s\)\. Last: Status, .+, just now\.$/.test(agentLinkStatusText(s, at + 5000)), `the drawer's line reads: "${agentLinkStatusText(s, at + 5000)}"`);
  ok(/, 2 min ago\.$/.test(agentLinkStatusText(s, at + 150_000)) && /, 3 h ago\.$/.test(agentLinkStatusText(s, at + 3 * 3_600_000 + 1)) && /, 2 d ago\.$/.test(agentLinkStatusText(s, at + 49 * 3_600_000)),
    `its age is relative: ${['2 min', '3 h', '2 d'].join(', ')} ago (read "${agentLinkStatusText(s, at + 150_000)}")`);
  ok(agentLinkStatusText({ ...s, transports: { mailbox: true, bridge: true } }, at).includes('(file mailbox, every 1 s, and the desktop bridge)')
    && agentLinkStatusText({ ...s, transports: { mailbox: false, bridge: false } }, at).startsWith('On, but not listening')
    && agentLinkStatusText({ ...s, inboxError: 'the inbox is not a JSON array' }, at).endsWith(' Inbox error: the inbox is not a JSON array.'),
    'the bridge, no transport and an inbox error each read in words');
  ok(agentLinkStatusText(null) === agentLinkStatusText({ ...s, on: false }), 'and reads off before the first state arrives');
  // #3297: another Prism3 instance holds the desktop bridge. The full line says so after the listening sentence; the word
  // stays the mailbox's, and the note goes once this instance holds the bridge itself. Literals (the note is DRAFT).
  {
    const mb = { ...s, transports: { mailbox: true, bridge: false } };
    const heldLine = agentLinkStatusText(mb, at, true);
    ok(heldLine.startsWith('Listening for agent commands (file mailbox, every 1 s). The desktop bridge is connected to Prism3 in another file. Last: ')
      && !agentLinkStatusText(mb, at).includes('another file')
      && !agentLinkStatusText({ ...s, transports: { mailbox: true, bridge: true } }, at, true).includes('another file')
      && agentLinkWord(mb)?.text === 'Listening · mailbox',
      `link/held-line: while another file holds the bridge, the full line says so and the word holds still (read "${heldLine}")`);
  }
  // #3147 Phase 1: the bar row's word names the transport (approved, Q3204.3 A). Literals: the bridge while it is connected,
  // the mailbox otherwise; the error words are unchanged. MUTATION: the suffix dropped → this arm fails by name.
  ok(agentLinkWord({ ...s, transports: { mailbox: true, bridge: true } })?.text === 'Listening · bridge'
    && agentLinkWord({ ...s, transports: { mailbox: true, bridge: false } })?.text === 'Listening · mailbox'
    && agentLinkWord({ ...s, transports: { mailbox: false, bridge: false } })?.text === 'Not listening'
    && agentLinkWord({ ...s, on: false }) === null,
    `link/word-transport: the word names the transport (bridge: "${agentLinkWord({ ...s, transports: { mailbox: true, bridge: true } })?.text}", mailbox: "${agentLinkWord({ ...s, transports: { mailbox: true, bridge: false } })?.text}")`);
  // #3204 (Q3204.2 A): "Prism3 Studio Offline" carries no bridge, so its word says the mailbox is all there is. Literals.
  // MUTATION: the offline arm dropped from `agentLinkWord` → this arm fails by name.
  ok(agentLinkWord({ ...s, transports: { mailbox: true, bridge: false } }, false)?.text === 'Listening · mailbox only'
    && agentLinkWord({ ...s, transports: { mailbox: true, bridge: false } }, true)?.text === 'Listening · mailbox'
    && agentLinkWord({ ...s, inboxError: 'x' }, false)?.text === 'Error',
    `link/word-offline: the offline build's word is "Listening · mailbox only" (read "${agentLinkWord({ ...s, transports: { mailbox: true, bridge: false } }, false)?.text}")`);
}

/* ── the short status (#2213, the owner's AS1 A): the Activity drawer's bar row ─────────────────────────── */
section('short status — the drawer row\'s high-level words (AS1 A)');
{
  // The words are the owner's, typed here as literals; the states are built here, not read from the link.
  const base: AgentLinkState = { v: 1, on: true, since: '2026-10-06T09:00:00.000Z', engineVersion: 'x', build: 'x', pollMs: 1000,
    transports: { mailbox: true, bridge: false }, lastCommand: null, inboxError: null };
  const cases: [string, AgentLinkState | null, { text: string; error: boolean } | null][] = [
    ['no state yet', null, null],
    ['off', { ...base, on: false, since: null, transports: { mailbox: false, bridge: false } }, null],
    ['off, a stale inbox error kept', { ...base, on: false, since: null, transports: { mailbox: false, bridge: false }, inboxError: 'the inbox is not a JSON array' }, null],
    ['on, the mailbox listening', base, { text: 'Agent listening', error: false }],
    ['on, the bridge alone listening', { ...base, transports: { mailbox: false, bridge: true } }, { text: 'Agent listening', error: false }],
    ['on, no transport listening', { ...base, transports: { mailbox: false, bridge: false } }, { text: 'Agent not listening', error: true }],
    ['on, an inbox error', { ...base, inboxError: 'the inbox is not a JSON array' }, { text: 'Agent error', error: true }],
    ['on, an inbox error and no transport', { ...base, transports: { mailbox: false, bridge: false }, inboxError: 'x' }, { text: 'Agent error', error: true }],
  ];
  for (const [name, st, want] of cases) {
    const got = agentLinkShortStatus(st);
    ok(JSON.stringify(got) === JSON.stringify(want), `${name}: the short status is ${JSON.stringify(want)} (read ${JSON.stringify(got)})`);
  }
}

/* ── strip (#2949) ──────────────────────────────────────────────────────────────────────────────────── */
section('strip — minimizing resizes the window and never touches the link or its poll');
{
  const sizes: [number, number][] = [];
  const kept: [string, unknown][] = [];
  const ui = host.ui as { resize: (w: number, h: number) => void; reposition?: (x: number, y: number) => void };
  const cs = host.clientStorage as { setAsync: (k: string, v: unknown) => Promise<void> };
  const origResize = ui.resize, origSet = cs.setAsync;
  ui.resize = (w, h) => { sizes.push([w, h]); };
  // #3327: the canvas as Figma reports it, at zoom 2, and every reposition the toggle asks for. #3416: the window's
  // top-left as `getPosition` reads it, in both spaces; here window px (0,0) is canvas (100,200), and 2 px is 1 unit.
  const places: [number, number][] = [];
  const win = { x: 300, y: 100 };
  const uiAt = ui as unknown as { getPosition?: () => { windowSpace: { x: number; y: number }; canvasSpace: { x: number; y: number } } };
  uiAt.getPosition = () => ({ windowSpace: { ...win }, canvasSpace: { x: 100 + win.x / 2, y: 200 + win.y / 2 } });
  ui.reposition = (x, y) => { places.push([x, y]); win.x = (x - 100) * 2; win.y = (y - 200) * 2; };
  host.viewport = { bounds: { x: 100, y: 200, width: 800, height: 500 }, zoom: 2 };
  cs.setAsync = async (k, v) => { kept.push([k, v]); };
  const minimizedPosts = () => posted.filter((m) => m.type === 'ui-minimized').map((m) => m.minimized);
  const isOn = () => (JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.link)) as AgentLinkState).on;
  const since = () => [main.agentLink.state().since, (JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.link)) as AgentLinkState).since];
  // Every `on` the link published, to the panel and to the link record, from Minimize to Restore: a minimize that
  // bounced the link (off, then on) ends where it began, so only the trail between shows it (review of #2961).
  const linkWrites: boolean[] = [];
  const origLinkSet = root.setSharedPluginData;
  root.setSharedPluginData = (ns, key, v) => { if (ns === MAILBOX.ns && key === MAILBOX.link && v) linkWrites.push((JSON.parse(v) as AgentLinkState).on); origLinkSet(ns, key, v); };
  const offTrail = () => [...posted.filter((m) => m.type === 'agent-link-state').map((m) => (m.state as AgentLinkState).on), ...linkWrites].filter((on) => on !== true).length;
  posted.length = 0;
  ok(main.agentLink.state().on === true && timers.size === 1, 'strip/start: the link is on and its poll armed');
  await toUi({ type: 'resize-ui', width: 900, height: 700, commit: true });
  ok(JSON.stringify(sizes) === '[[900,700]]' && kept.length === 1 && kept[0][0] === 'prism3:ui-size', `strip/drag: a committed drag resizes to 900×700 and keeps it (${JSON.stringify({ sizes, kept })})`);

  const since0 = since();
  ok(typeof since0[0] === 'string' && since0[0] === since0[1], `strip/since-start: the link's since is set, the same in the state and the record (${JSON.stringify(since0)})`);
  posted.length = 0;
  linkWrites.length = 0;
  await toUi({ type: 'minimize-ui', minimized: true });
  ok(JSON.stringify(since()) === JSON.stringify(since0), `strip/since-min: minimizing keeps the link's since, in the state and the record (${JSON.stringify({ was: since0, now: since() })})`);
  ok(JSON.stringify(sizes.at(-1)) === '[480,40]', `strip/size: Minimize resizes to the strip, 480×40, under the 380×420 floor (${JSON.stringify(sizes.at(-1))})`);
  // The window's top-left was window (300,100), canvas 100+300/2, 200+100/2: the first Minimize keeps it, by `resize`
  // alone. No `reposition` at all (review of #3420, S2): a reposition to `canvasSpace` would move the window on a host
  // where `getPosition` and `reposition` address different points of it.
  ok(JSON.stringify(places) === '[]' && JSON.stringify(win) === '{"x":300,"y":100}', `strip/place-min: the first Minimize in a file shrinks in place and repositions nothing (${JSON.stringify({ places, win })})`);
  ok(JSON.stringify(minimizedPosts()) === '[true]', `strip/answer: the main thread answers ui-minimized true (${JSON.stringify(minimizedPosts())})`);
  ok(main.agentLink.state().on === true && isOn() === true, 'strip/link: minimizing leaves the link on, in the state and in the link record');
  ok(timers.size === 1, `strip/poll: the poll stays armed while minimized (${timers.size} timer)`);
  calls.length = 0;
  const { id } = await send('readback');
  await tick();
  const r = (await read(id)) as AgentResult;
  ok(r.ok === true && calls.includes('seedFromFile') && timers.size === 1, `strip/claims: a command sent while minimized is claimed and run, and the poll re-arms (${r.ok}, ${timers.size} timer)`);

  await toUi({ type: 'resize-ui', width: 600, height: 500, commit: true });
  ok(places.length === 0, `strip/place-drag: a drag message places nothing; only a toggle does (${places.length} repositions)`);
  ok(JSON.stringify(sizes.at(-1)) === '[480,40]' && kept.length === 1, `strip/late-drag: a drag message while minimized neither resizes nor keeps a size (${JSON.stringify({ last: sizes.at(-1), kept: kept.length })})`);
  ok(!kept.some(([, v]) => JSON.stringify(v) === '{"width":480,"height":40}'), 'strip/never-kept: the strip size is never kept as the window size');

  await toUi({ type: 'minimize-ui', minimized: true });
  ok(sizes.length === 2 && JSON.stringify(minimizedPosts()) === '[true]', `strip/repeat: a second Minimize does nothing (${sizes.length} resizes)`);

  // The user drags the strip to window (1200,800) before Restore.
  win.x = 1200; win.y = 800;
  await toUi({ type: 'minimize-ui', minimized: false });
  // 900×700 px at zoom 2 is 450×350 on the canvas, centered: 100+(800-450)/2, 200+(500-350)/2.
  ok(JSON.stringify(places) === '[[275,275]]', `strip/place-restore: Restore centers the window over the canvas, at zoom 2 (${JSON.stringify(places)})`);
  ok(JSON.stringify(sizes.at(-1)) === '[900,700]' && JSON.stringify(minimizedPosts()) === '[true,false]', `strip/restore: Restore returns to 900×700, the size from before, and answers ui-minimized false (${JSON.stringify({ last: sizes.at(-1), posts: minimizedPosts() })})`);
  ok(main.agentLink.state().on === true && timers.size === 1, 'strip/restore-link: after Restore the link is still on and its poll armed');
  ok(JSON.stringify(since()) === JSON.stringify(since0), `strip/since-restore: Restore keeps the link's since, in the state and the record (${JSON.stringify({ was: since0, now: since() })})`);
  ok(offTrail() === 0, `strip/no-bounce: from Minimize to Restore the link never published off, to the panel or the record (${offTrail()} off)`);
  root.setSharedPluginData = origLinkSet;

  const fid = root.getPluginData('prism3:file-id');
  const spot = kept.filter(([key]) => key.startsWith('prism3:strip-at:'));
  ok(fid.length > 0 && JSON.stringify(spot) === JSON.stringify([[`prism3:strip-at:${fid}`, { x: 1200, y: 800 }]]),
    `strip/kept-spot: Restore keeps the strip's spot, window (1200,800), for this file, keyed by its id (${JSON.stringify({ fid, spot })})`);

  await toUi({ type: 'minimize-ui', minimized: true });
  // The window is centered at canvas (275,275), window (350,150): 275+(1200-350)/2, 275+(800-150)/2.
  ok(JSON.stringify(places.at(-1)) === '[700,600]', `strip/place-return: the next Minimize puts the strip back where it was dragged (${JSON.stringify(places.at(-1))})`);
  await toUi({ type: 'agent-link', on: false });
  ok(JSON.stringify(sizes.at(-1)) === '[900,700]' && JSON.stringify(minimizedPosts()) === '[true,false,true,false]' && main.agentLink.state().on === false,
    `strip/turn-off: Turn off switches the link off and restores the full window (${JSON.stringify({ last: sizes.at(-1), posts: minimizedPosts(), on: main.agentLink.state().on })})`);
  // The owner's direction on #2909 (2026-10-24): Minimize does not depend on the link.
  await toUi({ type: 'minimize-ui', minimized: true });
  ok(JSON.stringify(sizes.at(-1)) === '[480,40]' && JSON.stringify(minimizedPosts()) === '[true,false,true,false,true]' && main.agentLink.state().on === false,
    `strip/off: with the link off, Minimize still resizes to the strip and leaves the link off (${JSON.stringify({ last: sizes.at(-1), posts: minimizedPosts(), on: main.agentLink.state().on })})`);
  await toUi({ type: 'minimize-ui', minimized: false });
  ok(JSON.stringify(sizes.at(-1)) === '[900,700]' && JSON.stringify(minimizedPosts()) === '[true,false,true,false,true,false]',
    `strip/off-restore: with the link off, Restore returns to 900×700 (${JSON.stringify({ last: sizes.at(-1), posts: minimizedPosts() })})`);

  ui.resize = origResize;
  delete ui.reposition;
  delete uiAt.getPosition;
  delete host.viewport;
  cs.setAsync = origSet;
  await toUi({ type: 'agent-link', on: true });
}

/* ── run-notice (#533, Q110 A) ──────────────────────────────────────────────────────────────────────── */
section('run-notice — a run that ends while minimized shows one short host notice; the detail stays in Activity');
{
  // The expected notice is literal: the panel's line, 6000 ms, Restore. Never read from `run-notice.ts`.
  type Notice = { message: string; timeout?: number; error?: boolean; button?: { text: string; action: () => boolean | void } };
  const notices: Notice[] = [];
  host.notify = (message: string, o: Omit<Notice, 'message'> = {}) => { notices.push({ message, ...o }); return { cancel: () => undefined }; };
  const ui = host.ui as { resize: (w: number, h: number) => void };
  const origResize = ui.resize;
  const sizes: [number, number][] = [];
  ui.resize = (w, h) => { sizes.push([w, h]); };
  const minimizedPosts = () => posted.filter((m) => m.type === 'ui-minimized').map((m) => m.minimized);
  posted.length = 0;

  await toUi({ type: 'run-ended', line: 'Update file finished.' });
  ok(notices.length === 0, `run-notice/full-window: with the full window up, a run's end shows no notice (${notices.length} shown)`);

  await toUi({ type: 'minimize-ui', minimized: true });
  await toUi({ type: 'run-ended', line: 'Update file failed.' });
  const n = notices[0];
  ok(notices.length === 1 && n.message === 'Update file failed.',
    `run-notice/shown: minimized, a run's end shows one notice with the panel's line (${JSON.stringify(notices.map((x) => x.message))})`);
  ok(n?.timeout === 6000 && !n?.error, `run-notice/snackbar: the notice stays 6000 ms and is not the host's error style (${JSON.stringify({ timeout: n?.timeout, error: n?.error })})`);
  ok(n?.button?.text === 'Restore' && typeof n?.button?.action === 'function', `run-notice/action: the notice's one button is Restore (${JSON.stringify(n?.button?.text)})`);

  await toUi({ type: 'run-ended', line: '   ' });
  await toUi({ type: 'run-ended', line: 42 });
  ok(notices.length === 1, `run-notice/empty: an empty or non-text line shows nothing (${notices.length} shown)`);

  n?.button?.action();
  for (let i = 0; i < 20; i++) await settle();
  ok(JSON.stringify(minimizedPosts()) === '[true,false]' && JSON.stringify(sizes.at(-1)) !== '[480,40]',
    `run-notice/restore: Restore on the notice brings the full window back and answers ui-minimized false (${JSON.stringify({ posts: minimizedPosts(), last: sizes.at(-1) })})`);

  await toUi({ type: 'run-ended', line: 'Set up file finished.' });
  ok(notices.length === 1, `run-notice/after-restore: once restored, a run's end shows no notice (${notices.length} shown)`);

  ui.resize = origResize;
  delete host.notify;
}

/* ── strip-place (#3327) ─────────────────────────────────────────────────────────────────────────────── */
section('strip-place — where Minimize and Restore put the window, against literals (#3327, #3416)');
{
  // One visible canvas, read at zoom 1 and at zoom 2 (the same screen: the bounds halve). Expected canvas positions
  // are worked by hand from the owner's decisions on #3327 and #3416; never computed with the functions under test.
  const z1 = { x: 100, y: 200, width: 1600, height: 1000 }, z2 = { x: 100, y: 200, width: 800, height: 500 };
  const j = (p: unknown) => JSON.stringify(p);
  const here1 = { window: { x: 300, y: 100 }, canvas: { x: 400, y: 300 } };
  const strip = (b: typeof z1, zoom: number, here: typeof here1, spot: { x: number; y: number } | null) => j(stripPlacement(b, zoom, here, spot));
  // In place is null: `main.ts` then resizes and does not reposition (review of #3420, S2).
  ok(strip(z1, 1, here1, null) === 'null', `strip-place/first: the first Minimize keeps the window's top-left, in place (${strip(z1, 1, here1, null)})`);
  // Near the lower right, a 480×40 strip at (1650,1150) runs past the canvas's edge (1700,1200): it stays.
  const edge = { window: { x: 1550, y: 950 }, canvas: { x: 1650, y: 1150 } };
  ok(strip(z1, 1, edge, null) === 'null', `strip-place/no-clamp: a strip by the edge is not pulled inward (${strip(z1, 1, edge, null)})`);
  // 400+(1000-300), 300+(900-100)
  ok(strip(z1, 1, here1, { x: 1000, y: 900 }) === '{"x":1100,"y":1100}', `strip-place/spot-z1: the remembered spot, reachable, zoom 1 (${strip(z1, 1, here1, { x: 1000, y: 900 })})`);
  // 250+(1000-300)/2, 250+(900-100)/2
  const here2 = { window: { x: 300, y: 100 }, canvas: { x: 250, y: 250 } };
  ok(strip(z2, 2, here2, { x: 1000, y: 900 }) === '{"x":600,"y":650}', `strip-place/spot-z2: the remembered spot, reachable, zoom 2 (${strip(z2, 2, here2, { x: 1000, y: 900 })})`);
  // 400+(1500-300), 300+(1000-100): (1600,1200), on the canvas, but a 480×40 strip there runs 380 past its right edge
  // (1700) and 40 past its bottom (1200). Reachable, so it goes back exactly there: no clamp on the remembered spot
  // either (review of #3420, N1; a clamp would give (1220,1160)).
  ok(strip(z1, 1, here1, { x: 1500, y: 1000 }) === '{"x":1600,"y":1200}', `strip-place/spot-edge: a remembered spot by the canvas's edge is not pulled inward (${strip(z1, 1, here1, { x: 1500, y: 1000 })})`);
  // 400+(5000-300) = 5100 is past the canvas's right edge (1700): in place instead.
  ok(strip(z1, 1, here1, { x: 5000, y: 100 }) === 'null', `strip-place/spot-off: a spot off the visible canvas falls back to in place (${strip(z1, 1, here1, { x: 5000, y: 100 })})`);
  const away = { window: { x: -900, y: 100 }, canvas: { x: -500, y: 300 } };
  ok(strip(z1, 1, away, { x: 9000, y: 100 }) === '{"x":100,"y":200}', `strip-place/both-off: spot and window both off the canvas start at its top-left (${strip(z1, 1, away, { x: 9000, y: 100 })})`);
  ok(strip(z1, 1, away, null) === '{"x":100,"y":200}', `strip-place/first-off: a first Minimize off the canvas starts at its top-left (${strip(z1, 1, away, null)})`);
  const at = (b: typeof z1, zoom: number, w: number, h: number) => j(restorePlacement(b, zoom, { width: w, height: h }));
  // 100+(1600-900)/2, 200+(1000-700)/2
  ok(at(z1, 1, 900, 700) === '{"x":450,"y":350}', `strip-place/restore-z1: the window centered, zoom 1 (${at(z1, 1, 900, 700)})`);
  // 100+(800-450)/2, 200+(500-350)/2
  ok(at(z2, 2, 900, 700) === '{"x":275,"y":275}', `strip-place/restore-z2: the window centered, zoom 2 (${at(z2, 2, 900, 700)})`);
  // A window wider and taller than the canvas keeps its top bar on screen: its top-left at the canvas's.
  ok(at({ x: 0, y: 0, width: 600, height: 400 }, 1, 900, 700) === '{"x":0,"y":0}', `strip-place/clamp: a window larger than the canvas starts at its top-left (${at({ x: 0, y: 0, width: 600, height: 400 }, 1, 900, 700)})`);
}

section('strip-text — the strip\'s line for each state (#2949, Q2 A and Q3 A)');
{
  const base: AgentLinkState = { v: 1, on: true, since: '2026-10-06T09:00:00.000Z', engineVersion: 'x', build: 'x', pollMs: 1000,
    transports: { mailbox: true, bridge: false }, lastCommand: null, inboxError: null };
  const now = Date.parse('2026-10-06T10:00:00.000Z');
  const last = (cmd: string, finishedAt: string) => ({ ...base, lastCommand: { id: 'x', cmd, ok: true, finishedAt, headline: 'h' } });
  const cases: [string, AgentLinkState | null, { cmd: string; since: number } | null, { text: string; error: boolean } | null][] = [
    ['off', { ...base, on: false }, null, null],
    ['listening, no command yet', base, null, { text: 'Agent listening · no command yet', error: false }],
    ['listening, last 2m ago', last('update-components', '2026-10-06T09:58:00.000Z'), null, { text: 'Agent listening · last: update-components 2m ago', error: false }],
    ['listening, last 45s ago', last('apply-theme', '2026-10-06T09:59:15.000Z'), null, { text: 'Agent listening · last: apply-theme 45s ago', error: false }],
    ['listening, last 3h ago', last('status', '2026-10-06T06:30:00.000Z'), null, { text: 'Agent listening · last: status 3h ago', error: false }],
    ['running for 12s', last('status', '2026-10-06T06:30:00.000Z'), { cmd: 'update-components', since: now - 12000 }, { text: 'Agent running update-components… 12s', error: false }],
    ['error, running', { ...base, inboxError: 'x' }, { cmd: 'apply-theme', since: now }, { text: 'Agent error', error: true }],
    ['not listening', { ...base, transports: { mailbox: false, bridge: false } }, null, { text: 'Agent not listening', error: true }],
  ];
  for (const [name, st, running, want] of cases) {
    const got = agentStripText(st, running, now);
    ok(JSON.stringify(got) === JSON.stringify(want), `strip-text ${name}: ${JSON.stringify(want)} (read ${JSON.stringify(got)})`);
  }
  ok([0, 59999, 60000, 3599999, 3600000].map(agentAge).join(',') === '0s,59s,1m,59m,1h', `strip-text age: 0s, 59s, 1m, 59m, 1h at the edges (${[0, 59999, 60000, 3599999, 3600000].map(agentAge).join(',')})`);
}

/* ── the read-only node commands (#3147 Phase 2a) ───────────────────────────────────────────────────── */
section('reads — inspect, component-keys, audit-frames, snapshot and activity answer as written and write nothing (#3147 Phase 2a, #3309)');
{
  // The fixture file is a NodeShim (`file-shim.ts`): every assignment, define, delete and call outside its read list is
  // logged. The expected data are literals in `agent-read-fixture.ts`, shared with the bridge suite.
  const fx = readFixture();
  const h = host as Record<string, any>;
  const saved = { children: root.children, node: h.getNodeByIdAsync, style: h.getStyleByIdAsync, variable: h.variables.getVariableByIdAsync };
  root.children = fx.pages;
  h.getNodeByIdAsync = (id: string) => fx.getNodeByIdAsync(id);
  h.getStyleByIdAsync = (id: string) => fx.getStyleByIdAsync(id);
  h.variables.getVariableByIdAsync = (id: string) => fx.getVariableByIdAsync(id);
  /** Every plugin-data and shared-plugin-data value on the root outside the mailbox's own namespace. */
  const otherData = () => JSON.stringify([...store.entries()].filter(([key]) => !key.startsWith(`${MAILBOX.ns}\u0000`)).sort());
  const MAILBOX_OWN = (key: string) => key === MAILBOX.claimed || key === MAILBOX.results || key === MAILBOX.link || key.startsWith(MAILBOX.resultPrefix);
  const run = async (cmd: string, args: unknown) => {
    const before = otherData();
    const w0 = fx.writes.length;
    pluginWrites = [];
    calls.length = 0;
    const { id } = await send(cmd, args);
    await tick();
    const r = (await read(id)) as AgentResult;
    return { r, writes: fx.writes.slice(w0), mailbox: [...pluginWrites], otherSame: otherData() === before, handlers: [...calls] };
  };
  // #3309: the panel's two run summaries, posted as the panel posts them; `activity` reads the runs after `probe.latest`.
  const probe = (await run('activity', { limit: 1 })).r.result?.data as { total: number; latest: number };
  for (const n of ACTIVITY_NOTES) await toUi(n);
  const ARMS: Array<[string, unknown, unknown]> = [
    ['inspect', ARGS.inspect, EXPECTED.inspect],
    ['component-keys', ARGS.keys, EXPECTED.keys],
    ['audit-frames', ARGS.audit, EXPECTED.audit],
    ['snapshot', ARGS.snapshot, EXPECTED.snapshot],
    ['activity', { since: probe.latest }, activityExpected(probe.latest, Math.min(probe.total + 2, ACTIVITY_KEEP), g.PRISM3_BUILD as string)],
    ['context', {}, contextExpected('agent-link test file', ENGINE_VERSION)],
  ];
  ok(ARMS.map((a) => a[0]).join() === READ_COMMANDS.join(), `reads: every read command has an arm here (${READ_COMMANDS.join(', ')})`);
  for (const [cmd, args, want] of ARMS) {
    const { r, writes, mailbox, otherSame, handlers } = await run(cmd, args);
    ok(r.ok === true && !r.error && r.cmd === cmd && r.transport === 'mailbox' && r.v === AGENT_PROTOCOL_VERSION && r.engineVersion === ENGINE_VERSION
      && r.result?.verdict === null && Array.isArray(r.result?.logs),
      `mailbox/${cmd}: answered ok over the mailbox, with no verdict (a read's value is its data) — ${JSON.stringify(r.error ?? r.result?.verdict ?? null)}`);
    ok(canon(atRead(r.result?.data)) === canon(want), `envelope/${cmd}: result.data is exactly the literal expectation — got ${canon(r.result?.data).slice(0, 400)}`);
    ok(writes.length === 0 && otherSame && handlers.length === 0 && mailbox.every(MAILBOX_OWN),
      `no-write/${cmd}: the shim logged no write (${writes.join(', ') || 'none'}), no root data outside ${MAILBOX.ns} moved, no ACTIONS handler ran, and the plugin wrote only its mailbox keys (${mailbox.join(', ')})`);
  }
  {
    const { r } = await run('inspect', ARGS.inspect);
    const d = r.result?.data as { nodes: Array<{ id: string }>; unreadable: Array<{ id: string }> };
    ok(d.unreadable.length === 1 && d.unreadable[0].id === 'X1' && d.nodes.some((n) => n.id === 'R1'),
      `inspect/unreadable: the layer that throws on read is listed unreadable and its sibling after it is still read (${JSON.stringify(d.unreadable)})`);
    const cap = await run('inspect', ARGS.inspectCap);
    const c = cap.r.result?.data as { nodes: Array<{ id: string }>; truncated: boolean };
    ok(canon({ nodeIds: c.nodes.map((n) => n.id), truncated: c.truncated }) === canon(EXPECTED.inspectCap), `inspect/cap: maxNodes 2 stops the walk at two nodes and says truncated (${JSON.stringify(c.nodes.map((n) => n.id))}, ${c.truncated})`);
    const named = await run('component-keys', ARGS.keysNamed);
    ok(canon(named.r.result?.data) === canon(EXPECTED.keysNamed), `keys/fixture: a name list keeps only those names, and a name that matches nothing is listed missing (${canon(named.r.result?.data)})`);
    const audit = (await run('audit-frames', ARGS.audit)).r.result?.data as { frames: Array<{ id: string; counts: Record<string, number> }> };
    const planted: Record<string, string> = { A1: 'legacyInstances', A2: 'unstyledText', A3: 'rawFills', A4: 'standInDividers', A5: 'badName' };
    for (const [frame, count] of Object.entries(planted)) {
      const f = audit.frames.find((x) => x.id === frame);
      ok(!!f && Object.entries(f.counts).every(([k, v]) => v === (k === count ? 1 : 0)), `audit/each-count/${count}: the frame with one planted ${count} counts exactly that one (${JSON.stringify(f?.counts)})`);
    }
    const clean = audit.frames.find((x) => x.id === 'A6');
    ok(!!clean && Object.values(clean.counts).every((v) => v === 0), `audit/clean: a clean frame counts all zeros (${JSON.stringify(clean?.counts)})`);
    const lists = await run('audit-frames', ARGS.auditLegacyLists);
    ok(canon(lists.r.result?.data) === canon(EXPECTED.auditLegacyLists), `audit/legacy-lists: a legacy text style and a legacy variable prefix count the layers that use them (${canon(lists.r.result?.data)})`);
    const shot = await run('snapshot', ARGS.snapshot);
    const asked = fx.exports[fx.exports.length - 1]?.settings as { format?: string; constraint?: { type?: string; value?: number } } | undefined;
    ok(shot.r.ok && asked?.format === 'PNG' && asked?.constraint?.type === 'SCALE' && asked?.constraint?.value === 2, `snapshot/scale: the export is asked for a PNG at the scale sent (${JSON.stringify(asked)})`);
  }
  // Refusals: answered bad-args, never run, never a handler-threw.
  for (const [label, cmd, args, code] of [
    ['inspect/no-ids', 'inspect', {}, 'bad-args'],
    ['inspect/depth', 'inspect', { ids: ['F1'], depth: 4 }, 'bad-args'],
    ['audit/no-ids', 'audit-frames', { ids: [] }, 'bad-args'],
    ['audit/bad-rule', 'audit-frames', { ids: ['A1'], nameRule: '(' }, 'bad-args'],
    ['snapshot/scale-range', 'snapshot', { id: 'F1', scale: 3 }, 'bad-args'],
    ['snapshot/missing', 'snapshot', { id: 'nope' }, 'bad-args'],
    ['activity/limit', 'activity', { limit: 0 }, 'bad-args'],
    ['activity/since', 'activity', { since: -1 }, 'bad-args'],
  ] as const) {
    const { r, writes } = await run(cmd, args);
    ok(r.ok === false && r.error?.code === code && writes.length === 0, `refuse/${label}: answered ${code} and wrote nothing (${JSON.stringify(r.error)})`);
  }
  // #3309 should-fix 1: a run an AGENT command started is the agent's, named by its command. One agent write (a build of
  // a def that does not exist, which posts a `component-result`), then the log read from the run before it. Literal.
  // (mutation: `forward` records `activityLog.post(m, 'panel', null)` → `activity/agent`)
  {
    const at0 = (await run('activity', { limit: 1 })).r.result?.data as { total: number; latest: number };
    const { r: built } = await run('build-components', { def: 'no-such-def' });
    const v = built.result?.verdict as { summary?: string } | null | undefined;
    const got = (await run('activity', { since: at0.latest })).r.result?.data;
    // The summary lists every def id this build knows, so it is the verdict the agent was answered with; the rest is literal.
    const summary = typeof v?.summary === 'string' && v.summary.startsWith("no component def with id 'no-such-def'") ? v.summary : '<no unknown-def summary>';
    const want = {
      runs: [{ seq: at0.latest + 1, op: 'components', by: 'agent', cmd: 'build-components', at: AT, verdict: { type: 'component-result', ok: false },
        headline: '✗ unknown def', summary, lines: [summary.replace(/ Built from .*$/, '').replace(/\.$/, ''), 'Built from tree-test0000 at 2026-09-25T00:00:00Z.'],
        problems: [], built: { commit: null, build: '2026-09-25T00:00:00Z tree-test0000' } }],
      total: Math.min(at0.total + 1, ACTIVITY_KEEP),
      latest: at0.latest + 1,
    };
    ok(canon(atRead(got)) === canon(want),
      `activity/agent: an agent's build-components is logged as the agent's run, named by its command — got ${canon(atRead(got)).slice(0, 300)}`);
  }
  // #3300 B: `context/protected` — each protected default, listed exactly, on its own line so a miss names the rule.
  // (mutations: the FINAL test dropped → `context/protected/final`; the walk going inside a locked node →
  // `context/protected/locked`; the `Original · ` test dropped → `context/protected/originals`)
  {
    const d = (await run('context', {})).r.result?.data as { protected: { finalPages: unknown; locked: unknown; originals: unknown } };
    const want = contextExpected('agent-link test file', ENGINE_VERSION).protected;
    ok(canon(d?.protected?.finalPages) === canon(want.finalPages), `context/protected/final: the page whose name contains FINAL is listed, and nothing on it apart (${canon(d?.protected?.finalPages)})`);
    ok(canon(d?.protected?.locked) === canon(want.locked), `context/protected/locked: each locked node is listed once, and nothing inside one apart (${canon(d?.protected?.locked)})`);
    ok(canon(d?.protected?.originals) === canon(want.originals), `context/protected/originals: the \`Original · …\` copy is listed, and nothing inside it apart (${canon(d?.protected?.originals)})`);
  }
  // #3300 B: `context/brand` — a stored brand is read back as the file's (`source: local`), and one this build cannot read
  // says so (`unreadable`) rather than `none`. Both written to the root as Apply Theme stores it, and removed after.
  {
    const key = k('prism3', 'brandInput');
    const had = store.get(key);
    store.set(key, serializeBrandInput({ id: 'example', name: 'Example', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } } as BrandInput));
    const local = (await run('context', {})).r.result?.data as { prism3?: { source?: string; brand?: unknown } };
    ok(local?.prism3?.source === 'local' && canon(local.prism3.brand) === canon({ id: 'example', name: 'Example', modes: ['light', 'dark'] }),
      `context/brand: a stored brand reads as local, with its id, name and modes (${canon(local?.prism3)})`);
    store.set(key, '{"v":999}');
    const bad = (await run('context', {})).r.result?.data as { prism3?: { source?: string; brand?: unknown } };
    ok(bad?.prism3?.source === 'unreadable' && bad.prism3.brand === null, `context/brand: a stored brand this build cannot read says unreadable, not none (${canon(bad?.prism3)})`);
    if (had === undefined) store.delete(key); else store.set(key, had);
  }
  // #3300 B (review nit 1): `context/ledger` — the ledger-derived fields, from a stored as-built ledger with two sets at
  // different engines. `button` names today's engine and a definition hash no def has, so it is due as `definition moved`;
  // `badge` names an older engine and no print, so it is due as `engine moved`. `lastBuilt` is the NEWER of the two, by
  // number: a string compare would read '0.9.0' as newer than today's '0.2xx.0'. `badge`, the older, is listed FIRST, so
  // a `lastBuilt` that keeps the first entry it meets, or never replaces it, reads '0.9.0' and fails (review nit, #3355).
  // The ledger is a typed literal in the record's own shape (`{ v: 1, sets }`), not built with `recordSets`.
  // (mutations: `lastBuilt` keeps the oldest, or never replaces the first → `context/ledger/lastBuilt`; the two reasons swapped → `context/ledger/due`)
  {
    const key = k('', 'prism3:asBuilt');
    const had = store.get(key);
    store.set(key, JSON.stringify({ v: 1, sets: {
      badge: { def: 'not-a-def-hash', rev: EXECUTOR_REVISION, engine: '0.9.0' },
      button: { def: 'not-a-def-hash', rev: EXECUTOR_REVISION, engine: ENGINE_VERSION },
    } }));
    const d = (await run('context', {})).r.result?.data as { sets?: { present?: number; due?: unknown }; prism3?: { engine?: { lastBuilt?: unknown } } };
    ok(d?.sets?.present === 2, `context/ledger/present: the two sets the ledger names are counted present (${canon(d?.sets)})`);
    ok(canon([...((d?.sets?.due ?? []) as { set: string }[])].sort((a, b) => a.set.localeCompare(b.set))) === canon([{ set: 'badge', why: 'engine moved' }, { set: 'button', why: 'definition moved' }]),
      `context/ledger/due: each due set names why — badge's older engine, button's moved definition (${canon(d?.sets?.due)})`);
    ok(d?.prism3?.engine?.lastBuilt === ENGINE_VERSION, `context/ledger/lastBuilt: the newest engine any set was built with (${canon(d?.prism3?.engine)})`);
    if (had === undefined) store.delete(key); else store.set(key, had);
  }
  // #3300 B (review nit 2): `context/caps` — the list cap and the walk cap at their real values. One page: 51 locked
  // frames, 51 `Original · ` copies, then 20,000 plain rectangles, so the walk passes 20,000 nodes. The numbers are
  // literals, not `CONTEXT_LIST_CAP` / `CONTEXT_NODE_CAP`, so a moved cap fails here.
  // (mutations: the list cap dropped → `context/caps/list`; the walk cap dropped → `context/caps/truncated`)
  {
    const many = (n: number, f: (i: number) => NodeSpec): NodeSpec[] => Array.from({ length: n }, (_, i) => f(i));
    const big = new NodeShim([{ id: 'PB', type: 'PAGE', name: 'Many', children: [
      ...many(51, (i) => ({ id: `BL${i}`, type: 'FRAME', name: `Locked ${i}`, width: 10, height: 10, locked: true })),
      ...many(51, (i) => ({ id: `BO${i}`, type: 'FRAME', name: `Original · Screen ${i}`, width: 10, height: 10 })),
      ...many(20_000, (i) => ({ id: `BR${i}`, type: 'RECTANGLE', name: `Rect ${i}`, width: 10, height: 10 })),
    ] }], { styles: {}, variables: {} });
    const was = root.children;
    root.children = big.pages;
    const d = (await run('context', {})).r.result?.data as { protected?: { locked?: unknown[]; originals?: unknown[]; counts?: { locked?: number; originals?: number } }; truncated?: unknown };
    root.children = was;
    const p = d?.protected;
    ok(p?.locked?.length === 50 && p?.counts?.locked === 51 && p?.originals?.length === 50 && p?.counts?.originals === 51,
      `context/caps/list: 50 of 51 locked nodes and 50 of 51 originals are listed, and the counts say 51 (${canon(p?.counts)}, listed ${p?.locked?.length}/${p?.originals?.length})`);
    ok(d?.truncated === true, `context/caps/truncated: a walk past 20,000 nodes stops and says truncated (${canon(d?.truncated)})`);
  }
  root.children = saved.children;
  h.getNodeByIdAsync = saved.node; h.getStyleByIdAsync = saved.style; h.variables.getVariableByIdAsync = saved.variable;
}

/* ── set-override (#3394, Q3394.1–.7 all A) ─────────────────────────────────────────────────────────────── */
section('set-override — color overrides: a preview that writes nothing, refusals by name, and a write through ACTIONS.applyTheme (#3394)');
{
  // THE FIXTURE: aurora with one stored override on a palette that is NOT the role's family (accent), the shape #3391's
  // bug mislabeled. Every expected number below is a literal, typed from an independent WCAG calculation (relative
  // luminance, sRGB, in Python) of the palette hexes, never read off `resolveAllModes`: neutral 600 #5c5c61 on white
  // 6.65, neutral 400 #8e8e92 3.26, neutral 300 #a7a7aa 2.40, accent 600 #006188 6.85; on the link floor neutral 050
  // #e9e9ea, neutral 500 #75767a 3.74 and neutral 550 #68686d 4.57, so a 4.5:1 link clamps to 550.
  const stored = { ...(brand as Record<string, unknown>), overrides: { light: { 'interactive.primary.border.rest': { palette: 'neutral', step: '600' } } } } as unknown as BrandInput;
  const BRAND_KEY = k('prism3', 'brandInput');
  const putBrand = (b: BrandInput | null): void => { if (b) store.set(BRAND_KEY, serializeBrandInput(b)); else store.delete(BRAND_KEY); };
  const storedOverrides = (): unknown => { const raw = store.get(BRAND_KEY); return raw ? deserializeBrandInput(raw)?.overrides : undefined; };
  /** Writes to the `prism3` namespace (the stored brand), counted around a call. */
  let prismWrites = 0;
  const realSet = root.setSharedPluginData;
  root.setSharedPluginData = (ns: string, key: string, v: string) => { if (ns === 'prism3') prismWrites++; realSet(ns, key, v); };
  const run = async (args: unknown): Promise<AgentResult> => { const { id } = await send('set-override', args); await tick(); return (await read(id)) as AgentResult; };
  const verdictOf = (r: AgentResult) => r.result?.verdict as { type?: string; ok?: boolean; preview?: boolean; applied?: boolean; headline?: string; summary?: string } | null;
  const dataOf = (r: AgentResult) => (r.result?.data ?? {}) as any;
  const BORDER = 'interactive.primary.border.rest';
  /** What Activity holds this session, read through the agent link's own `activity` command. */
  const activityRuns = async (): Promise<any[]> => { const { id } = await send('activity', {}); await tick(); return ((await read(id)) as AgentResult).result?.data?.runs as any[] ?? []; };

  ok(SET_OVERRIDE_MAX === MAX_CHANGES && MAX_CHANGES === 32, `set-override/max: the protocol's cap and the plan's are both 32 (${SET_OVERRIDE_MAX}, ${MAX_CHANGES})`);

  // The parse: every shape error is bad-args with its literal words, and nothing runs.
  const one = { mode: 'light', role: BORDER, palette: 'neutral', step: '400' };
  const BAD_LIST = 'set-override needs args.changes: 1 to 32 changes, each { mode, role, palette, step } or { mode, role, clear: true }';
  for (const [name, args, msg] of [
    ['none', { confirm: false }, BAD_LIST],
    ['empty', { changes: [], confirm: false }, BAD_LIST],
    ['33', { changes: Array.from({ length: 33 }, (_, i) => ({ ...one, role: `r${i}` })), confirm: false }, BAD_LIST],
    ['both', { changes: [{ ...one, clear: true }], confirm: false }, 'set-override: change 0 takes exactly palette and step, or clear: true'],
    ['no-mode', { changes: [{ role: BORDER, clear: true }], confirm: false }, 'set-override: change 0 needs a mode and a role'],
    ['twice', { changes: [one, { mode: 'light', role: BORDER, clear: true }], confirm: false }, `set-override: ${BORDER} is listed twice for light`],
    ['no-confirm', { changes: [one] }, 'set-override needs args.confirm: false to preview, true to write'],
    ['no-hash', { changes: [one], confirm: true }, 'set-override with confirm: true needs args.previewHash: the previewHash its preview returned'],
  ] as const) {
    calls.length = 0;
    const r = await run(args);
    ok(r.ok === false && r.error?.code === 'bad-args' && r.error.message === msg && !calls.includes('setOverride'), `set-override/parse/${name}: bad-args, "${r.error?.message}"`);
  }

  // No brand stored: refused, whole run, its own words.
  putBrand(null);
  const nb = await run({ changes: [one], confirm: false });
  ok(nb.ok === false && verdictOf(nb)?.headline === 'Not saved — this file holds no Prism3 brand. Write a theme first.' && dataOf(nb).refusals?.[0]?.reason === 'no-brand',
    `set-override/no-brand: "${verdictOf(nb)?.headline}"`);

  // The preview writes nothing: no stored brand, no Theme write; its verdict names the real palette both sides (#3391).
  putBrand(stored);
  prismWrites = 0;
  calls.length = 0;
  posted.length = 0;
  const pv = await run({ changes: [one], confirm: false });
  const pvd = dataOf(pv);
  ok(pv.ok === true && prismWrites === 0 && !calls.includes('applyTheme') && JSON.stringify(storedOverrides()) === JSON.stringify(stored.overrides),
    `set-override/preview-writes-nothing: ok, 0 brand writes (${prismWrites}), no Theme write (${calls.join(', ')})`);
  ok(verdictOf(pv)?.type === 'override-result' && verdictOf(pv)?.preview === true && verdictOf(pv)?.applied === false
    && verdictOf(pv)?.headline === 'Preview — 1 change; no pair moves below its minimum.'
    && verdictOf(pv)?.summary === 'Light · interactive.primary.border.rest: neutral 600 → neutral 400 (6.65:1 → 3.26:1)',
    `set-override/preview-verdict: "${verdictOf(pv)?.headline}" / "${verdictOf(pv)?.summary}"`);
  ok(JSON.stringify(pvd.changes?.[0]?.before) === JSON.stringify({ override: { palette: 'neutral', step: '600' }, resolved: { palette: 'neutral', step: '600' }, hex: '#5c5c61', ratio: 6.65, min: 3, against: 'background.primary' })
    && JSON.stringify(pvd.changes?.[0]?.after) === JSON.stringify({ override: { palette: 'neutral', step: '400' }, resolved: { palette: 'neutral', step: '400' }, hex: '#8e8e92', ratio: 3.26, min: 3, against: 'background.primary' }),
    `set-override/before-names-real-palette: before is the stored neutral 600, never the row's accent (${JSON.stringify(pvd.changes?.[0]?.before?.override)})`);
  ok(typeof pvd.previewHash === 'string' && /^[0-9a-f]{8}$/.test(pvd.previewHash) && Array.isArray(pvd.newMisses) && pvd.newMisses.length === 0,
    `set-override/preview-hash: an 8-digit previewHash, no new misses (${pvd.previewHash})`);
  ok(!(await activityRuns()).some((x: any) => x.op === 'override'), 'set-override/preview-not-logged: Activity records no run for a preview');

  // The contrast refusal: the pair, its ratio and its minimum, and nothing stored.
  calls.length = 0;
  prismWrites = 0;
  const lo = await run({ changes: [{ ...one, step: '300' }], confirm: false });
  const lr = dataOf(lo).refusals?.[0];
  ok(lo.ok === false && verdictOf(lo)?.headline === 'Not saved — 1 change puts a pair below its minimum.'
    && verdictOf(lo)?.summary === 'Light · interactive.primary.border.rest → neutral 300: 2.40:1 against background.primary — below the 3:1 minimum.'
    && lr?.reason === 'below-minimum' && lr?.ratio === 2.4 && lr?.min === 3 && lr?.against === 'background.primary' && prismWrites === 0,
    `set-override/refuses-below-minimum: "${verdictOf(lo)?.summary}" (${JSON.stringify(lr)})`);
  // A confirmed write of the same list is refused the same way, before any Theme write.
  const loHash = dataOf(lo).previewHash as string;
  calls.length = 0;
  const lw = await run({ changes: [{ ...one, step: '300' }], confirm: true, previewHash: loHash });
  ok(lw.ok === false && dataOf(lw).refusals?.[0]?.reason === 'below-minimum' && !calls.includes('applyTheme') && prismWrites === 0,
    `set-override/refuses-below-minimum-write: the confirmed write is refused too, with no Theme write (${calls.join(', ')})`);

  // The link clamp: the engine would emit 550 for an asked 300, so the change is refused rather than stored.
  const cl = await run({ changes: [{ mode: 'light', role: 'text.link.default', palette: 'neutral', step: '300' }], confirm: false });
  ok(cl.ok === false && dataOf(cl).refusals?.[0]?.reason === 'clamped'
    && verdictOf(cl)?.summary === 'Light · text.link.default → neutral 300 resolves to neutral 550 — links hold 4.5:1. Pick neutral 550 or a step with more contrast.',
    `set-override/refuses-clamped-link: "${verdictOf(cl)?.summary}"`);

  // A role the mode lacks is refused, not skipped; every refusal in a list comes back in one round.
  const un = await run({ changes: [{ mode: 'dark', role: 'interactive.primary.fill.hovr', palette: 'neutral', step: '700' }, { mode: 'light', role: 'background.secondary', palette: 'neutral', step: '100' },
    { mode: 'light', role: 'text.primary', clear: true }, { mode: 'light', role: 'text.secondary', palette: 'brand-neutral', step: '900' }], confirm: false });
  ok(un.ok === false && verdictOf(un)?.headline === "Not saved — 4 changes can't be made as sent."
    && JSON.stringify(dataOf(un).refusals?.map((x: any) => x.line)) === JSON.stringify([
      'Dark has no role interactive.primary.fill.hovr.',
      'Light · background.secondary is a ground — set it in Surfaces, so the roles measured on it follow.',
      'Light · text.primary has no override to clear.',
      'Light · text.secondary: brand-neutral is not a palette in this brand.',
    ]), `set-override/refuses-unknown-role: every refusal, in order (${JSON.stringify(dataOf(un).refusals?.map((x: any) => x.reason))})`);

  // The roles the engine sets from elsewhere, or that Studio shows read-only, are refused by name, one line each (the
  // proposal's §3 table). The brand gains a glass role and the opaque outline hover fill, so both are real roles here:
  // without the refusal, the engine throws on either and the agent reads `unreadable-brand`. A focus ring and an icon
  // carried from its text would be written, though Studio shows both rows read-only.
  putBrand({ ...(stored as Record<string, unknown>), glassRoles: { card: { palette: 'neutral.050', alpha: 80 } }, outlineInteraction: 'opaque-fill' } as unknown as BrandInput);
  const fs = await run({ changes: [{ mode: 'light', role: 'glass.card', palette: 'neutral', step: '100' }, { mode: 'light', role: 'interactive.primary.hover-fill.hover', palette: 'neutral', step: '100' },
    { mode: 'light', role: 'border.focus', palette: 'neutral', step: '600' }, { mode: 'light', role: 'interactive.primary.icon.rest', palette: 'neutral', step: '700' }], confirm: false });
  const fsr = (dataOf(fs).refusals ?? []) as any[];
  const fsLine = (i: number): string | undefined => fsr.find((x) => x.index === i)?.line;
  const fsReason = (i: number): string | undefined => fsr.find((x) => x.index === i)?.reason;
  ok(fsReason(0) === 'follows-source' && fsLine(0) === 'Light · glass.card follows its source color — change the source instead.',
    `set-override/refuses-glass: a brand glass role follows its source (${fsReason(0)}: "${fsLine(0)}")`);
  ok(fsReason(1) === 'follows-source' && fsLine(1) === 'Light · interactive.primary.hover-fill.hover follows its source color — change the source instead.',
    `set-override/refuses-hover-fill: the opaque outline hover fill follows its source (${fsReason(1)}: "${fsLine(1)}")`);
  ok(fsReason(2) === 'locked' && fsLine(2) === "Light · border.focus isn't editable in Theme yet.",
    `set-override/refuses-focus-ring: a focus ring is locked (${fsReason(2)}: "${fsLine(2)}")`);
  ok(fsReason(3) === 'locked' && fsLine(3) === 'Light · interactive.primary.icon.rest follows interactive.primary.text.rest while icons match text.',
    `set-override/refuses-carried-icon: an icon carried from its text is locked (${fsReason(3)}: "${fsLine(3)}")`);
  ok(fs.ok === false && fsr.length === 4 && verdictOf(fs)?.headline === "Not saved — 4 changes can't be made as sent.",
    `set-override/refuses-set-elsewhere: four refusals, no other, one headline (${JSON.stringify(fsr.map((x) => x.reason))}, "${verdictOf(fs)?.headline}")`);
  putBrand(stored);

  // The refusal headline counts the changes in a mode whose miss no one change owns (a dependent or a twin), all of
  // them, not only the first. No example brand reaches this shape through `planOverride` yet, so the plan is built.
  const light3 = [0, 1, 2].map((index) => ({ index, mode: 'light', role: `text.r${index}`, before: null, after: null }));
  const dep = { index: null, mode: 'light', role: 'text.dependent', reason: 'below-minimum', line: 'L', ratio: 2, min: 4.5, against: 'background.primary' };
  const hv = overrideVerdict({ ok: false, previewHash: '00000000', input: stored, changes: light3, moved: [], newMisses: [], stillBelow: [],
    contrast: { before: { total: 0, fail: 0 }, after: { total: 0, fail: 0 } }, refusals: [dep] } as unknown as OverridePlan, false);
  ok(hv.headline === 'Not saved — 3 changes put a pair below its minimum.', `set-override/headline-counts-mode: an unowned light miss counts all three light changes ("${hv.headline}")`);

  // The panel holds Theme edits the file does not: the write is refused, its preview is not.
  const pv2 = await run({ changes: [one], confirm: false });
  const hash = dataOf(pv2).previewHash as string;
  await toUi({ type: 'due-request', input: brand, seq: 1 });
  calls.length = 0;
  const tu = await run({ changes: [one], confirm: true, previewHash: hash });
  ok(tu.ok === false && verdictOf(tu)?.headline === "Not saved — Theme has changes that aren't in the file yet. Run Update file or discard them, then send this again." && !calls.includes('applyTheme'),
    `set-override/theme-unsaved: "${verdictOf(tu)?.headline}"`);
  ok((await activityRuns()).some((x: any) => x.op === 'override' && x.by === 'agent' && x.verdict?.ok === false), 'set-override/refusal-logged: a refused write is an Activity run of its own');
  await toUi({ type: 'due-request', input: stored, seq: 2 });

  // The file's brand moved after the preview: refused, nothing written.
  putBrand({ ...(stored as Record<string, unknown>), name: 'moved' } as unknown as BrandInput);
  calls.length = 0;
  const bm = await run({ changes: [one], confirm: true, previewHash: hash });
  ok(bm.ok === false && verdictOf(bm)?.headline === "Not saved — the file's brand changed after the preview. Preview again." && !calls.includes('applyTheme'),
    `set-override/brand-moved: "${verdictOf(bm)?.headline}"`);
  putBrand(stored);
  await toUi({ type: 'due-request', input: stored, seq: 3 });

  // THE WRITE, against a file model that can take the Theme write: through ACTIONS.applyTheme (the spy is the table's
  // own entry, so a copy of the handler fails here), the stored overrides, the variable alias, the panel's restore.
  const shim = new FileShim() as unknown as Record<string, unknown>;
  const grafted: Record<string, unknown> = {};
  for (const name of Object.getOwnPropertyNames(FileShim.prototype)) {
    const d = Object.getOwnPropertyDescriptor(FileShim.prototype, name)!;
    if (name === 'constructor' || typeof d.value !== 'function') continue;
    grafted[name] = host[name];
    host[name] = (...a: unknown[]) => (shim[name] as (...x: unknown[]) => unknown)(...a);
  }
  const versions: string[] = [];
  grafted.variables = host.variables; grafted.saveVersionHistoryAsync = host.saveVersionHistoryAsync;
  host.variables = shim; host.saveVersionHistoryAsync = async (title: string) => { versions.push(title); };
  const seen: unknown[][] = [];
  const origApply = actions.applyTheme;
  actions.applyTheme = (...a: unknown[]) => { seen.push(a); return origApply(...a); };
  posted.length = 0;
  const go = await run({ changes: [one], confirm: true, previewHash: hash });
  actions.applyTheme = origApply;
  const LIGHT = { [BORDER]: { palette: 'neutral', step: '400' } };
  ok(seen.length === 1 && JSON.stringify((seen[0][0] as { overrides?: { light?: unknown } }).overrides?.light) === JSON.stringify(LIGHT),
    `set-override/writes-through-apply: one ACTIONS.applyTheme call, with the planned overrides (${seen.length})`);
  ok(go.ok === true && JSON.stringify(storedOverrides()) === JSON.stringify({ light: LIGHT }), `set-override/stored: the file's brand holds the new override (${JSON.stringify(storedOverrides())})`);
  const vars = (shim as unknown as FileShim).vars;
  const v = vars.find((x: any) => x.name === 'ads/color/interactive/primary/border/rest');
  const light = (shim as unknown as FileShim).collections.find((c: any) => c.id === v?.variableCollectionId)?.modes.find((m: any) => m.name === 'light');
  const target = vars.find((x: any) => x.id === v?.valuesByMode?.[light?.modeId]?.id);
  ok(target?.name === 'ads/core/palette/neutral/400', `set-override/variable: light's border aliases ads/core/palette/neutral/400 (${target?.name})`);
  ok(versions.length === 1, `set-override/version: the Theme write saved one version first (${versions.join(' | ')})`);
  ok(verdictOf(go)?.applied === true && verdictOf(go)?.headline === 'Saved 1 color override — 972 of 972 pairs at or above their minimum.',
    `set-override/saved: "${verdictOf(go)?.headline}"`);
  const restore = posted.filter((m) => m.type === 'restore-input').pop();
  ok(JSON.stringify(restore?.input?.overrides) === JSON.stringify({ light: LIGHT }), 'set-override/restore: the panel is sent the brand the file now holds');
  ok(!posted.some((m) => m.type === 'apply-result'), 'set-override/one-verdict: the Theme write\'s own verdict is not posted; the run has one, override-result');
  const runRow = (await activityRuns()).find((x: any) => x.op === 'override' && x.verdict?.ok === true);
  ok(runRow?.by === 'agent' && runRow?.cmd === 'set-override' && JSON.stringify(runRow?.lines) === JSON.stringify(['Light · interactive.primary.border.rest: neutral 600 → neutral 400 (6.65:1 → 3.26:1)']),
    `set-override/activity: one run, the agent's, its line before → after (${JSON.stringify(runRow?.lines)})`);
  ok(OP_TITLE.override === 'Color override', `set-override/row: the drawer names the row "Color override" (${OP_TITLE.override})`);

  // The designer edits Theme while the agent's write runs: the panel keeps the edit, and is not sent the stored brand.
  await toUi({ type: 'due-request', input: { ...(stored as Record<string, unknown>), overrides: { light: LIGHT } }, seq: 5 });
  const back = { mode: 'light', role: BORDER, palette: 'neutral', step: '600' };
  const pv4 = await run({ changes: [back], confirm: false });
  actions.applyTheme = (...a: unknown[]) => {
    (host.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'due-request', input: { ...(stored as Record<string, unknown>), name: 'edited meanwhile' }, seq: 6 });
    return origApply(...a);
  };
  posted.length = 0;
  const kept = await run({ changes: [back], confirm: true, previewHash: dataOf(pv4).previewHash });
  actions.applyTheme = origApply;
  ok(kept.ok === true && !posted.some((m) => m.type === 'restore-input'), `set-override/panel-edit-kept: an edit made during the write is not reloaded over (${kept.ok}, ${posted.filter((m) => m.type === 'restore-input').length} restore)`);

  // A stored brand the engine refuses to build: refused with a verdict, never a handler error.
  const rejected = { ...(stored as Record<string, unknown>), overrides: { 'hc-light': { 'text.primary': { palette: 'neutral', step: '900' } } } } as unknown as BrandInput;
  putBrand(rejected);
  const ej = await run({ changes: [one], confirm: false });
  ok(!ej.error && verdictOf(ej)?.headline === "Not saved — this file's brand was saved by a build this plugin can't read." && /generate-only/.test(String(dataOf(ej).error)),
    `set-override/engine-refused: "${verdictOf(ej)?.headline ?? ej.error?.code}"`);
  putBrand(stored);
  await toUi({ type: 'due-request', input: stored, seq: 7 });

  // busy: a confirmed write waits on no running Theme write; a preview is never refused. The words name Theme (#3718).
  const BUSY = 'Theme is already running. Try again when it finishes.';
  let open!: () => void;
  gate = new Promise<void>((r) => { open = r; });
  const savedTs = host.getLocalTextStylesAsync;
  host.getLocalTextStylesAsync = held;
  await toUi({ type: 'apply-theme', input: stored });
  const pv3 = await run({ changes: [{ mode: 'light', role: BORDER, clear: true }], confirm: false });
  posted.length = 0;
  const bwSent = await send('set-override', { changes: [{ mode: 'light', role: BORDER, clear: true }], confirm: true, previewHash: dataOf(pv3).previewHash });
  await tick();
  const bw = (await read(bwSent.id)) as AgentResult;
  // Declined by the dispatcher's own guard (`guardFor`), before it starts: the panel never shows it running.
  ok(!posted.some((m) => m.type === 'agent-started' && m.id === bwSent.id), 'set-override/busy-declined: the busy write is declined before it starts, so the panel never shows it running');
  gate = null; open();
  for (let i = 0; i < 60; i++) await settle();
  host.getLocalTextStylesAsync = savedTs;
  ok(pv3.ok === true && bw.ok === false && bw.error?.code === 'busy' && bw.error?.message === BUSY,
    `set-override/busy: while a Theme write runs a preview answers (${pv3.ok}) and the write is busy (${bw.error?.code})`);

  for (const [name, val] of Object.entries(grafted)) host[name] = val;
  root.setSharedPluginData = realSet;
  putBrand(null);
  await toUi({ type: 'due-request', seq: 4 });
}

/* ── switch-off ─────────────────────────────────────────────────────────────────────────────────────── */
section('session — a mailbox command that changes the file needs this session\'s code (#3697 R8)');
{
  // Switched off and on here, so the posts this section reads are its own (earlier sections clear `posted`).
  await toUi({ type: 'agent-link', on: false });
  await toUi({ type: 'agent-link', on: true });
  const code = main.agentLink.session();
  ok(typeof code === 'string' && /^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/.test(code), `session/panel: the link on holds a code in the pairing code's form (${code})`);
  ok(posted.filter((m) => m.type === 'agent-link-session').pop()?.code === code, 'session/panel: and the panel is told it, to show the person');
  // Literal, not read from SESSION_COMMANDS (docs/34 shape 1).
  const want: Array<[string, unknown, boolean]> = [
    ['apply-theme', { input: {} }, true], ['run-code', { code: '' }, false], ['prune', { confirm: true }, true], ['prune', { confirm: false }, false],
    ['update-components', { confirm: true, previewHash: 'x' }, true], ['update-components', {}, false], ['panels-clean', { confirm: true }, true],
    ['panels-clean', {}, false], ['set-override', { confirm: true }, true], ['set-override', { confirm: false }, false],
    ['build-components', {}, false], ['file-setup', {}, false], ['style-guide', {}, false], ['draw-specs', {}, false],
    ['capture-baseline', {}, false], ['adopt-members', {}, false], ['status', {}, false], ['readback', {}, false], ['context', {}, false],
  ];
  const wrongWhich = want.filter(([cmd, args, need]) => needsSession({ v: 1, id: 'x', cmd, args, issuedAt: '' }) !== need);
  ok(!wrongWhich.length, `session/which: needsSession names exactly the theme write and each confirm, and no dev command (${wrongWhich.map(([c, a]) => `${c} ${JSON.stringify(a)}`).join(', ') || 'all as listed'})`);

  calls.length = 0;
  const bare = await sendBare('apply-theme', { input: brand });
  await tick();
  const rb = (await read(bare.id)) as AgentResult;
  ok(rb.ok === false && rb.error?.code === 'no-session' && !calls.includes('applyTheme'),
    `session/refused: apply-theme through the mailbox with no session code is answered no-session and not run (${rb.error?.code}; ${calls.join(', ') || 'no handler'})`);
  const del = await sendBare('prune', { input: brand, confirm: true });
  await tick();
  const rd = (await read(del.id)) as AgentResult;
  ok(rd.error?.code === 'no-session' && !calls.includes('prune') && /session/.test(rd.error?.message ?? ''),
    `session/refused: a prune confirm with no code is refused, and the message says what is missing (${rd.error?.code})`);
  const rc = await sendBare('run-code', { code: 'return 1' });
  await tick();
  ok(((await read(rc.id)) as AgentResult).error?.code === 'no-session', 'session/refused: a dev build\'s run-code through the mailbox with no code is refused too');
  const other = code === 'ZZZZ-ZZZZ' ? 'YYYY-YYYY' : 'ZZZZ-ZZZZ';
  const wrong = await send('apply-theme', { input: brand }, undefined, other);
  await tick();
  ok(((await read(wrong.id)) as AgentResult).error?.code === 'no-session' && !calls.includes('applyTheme'), 'session/wrong: another code is refused the same way');
  const preview = await sendBare('prune', { input: brand, confirm: false });
  await tick();
  ok(((await read(preview.id)) as AgentResult).error?.code !== 'no-session' && calls.includes('prune'), 'session/previews: a prune preview needs no code and reaches its handler');
  const right = await send('apply-theme', { input: brand }, undefined, code!.toLowerCase().replace('-', ' '));
  await tick();
  ok(((await read(right.id)) as AgentResult).error?.code !== 'no-session' && calls.includes('applyTheme'), 'session/right: the code as shown, typed in lower case, runs apply-theme');
  const everything = mailboxKeys().map((key) => root.getSharedPluginData(MAILBOX.ns, key)).join('\n');
  ok(!everything.includes(code!) && !everything.includes(code!.replace('-', '')), `session/not-in-file: the code is in no ${MAILBOX.ns} key, the link record and every result included`);

  for (let i = 0; i < SESSION_TRIES; i++) { await send('panels-clean', { confirm: true }, undefined, other); await tick(); }
  calls.length = 0;
  const late = await send('apply-theme', { input: brand }, undefined, code);
  await tick();
  ok(((await read(late.id)) as AgentResult).error?.code === 'no-session' && !calls.includes('applyTheme') && main.agentLink.session() === null && posted.filter((m) => m.type === 'agent-link-session').pop()?.code === null,
    `session/spent: after ${SESSION_TRIES} wrong codes the code is spent: the right one is refused too, and the panel stops showing it`);
  await toUi({ type: 'agent-link', on: false });
  ok(main.agentLink.session() === null && posted.filter((m) => m.type === 'agent-link-session').pop()?.code === null, 'session/new: switching off forgets the code');
  await toUi({ type: 'agent-link', on: true });
  const next = main.agentLink.session();
  ok(typeof next === 'string' && next !== code, `session/new: switching on again draws a new one (${next})`);
  // The off path itself forgets a LIVE code (the spent arm above had already cleared it, so it proves nothing about off).
  await toUi({ type: 'agent-link', on: false });
  ok(main.agentLink.session() === null && posted.filter((m) => m.type === 'agent-link-session').pop()?.code === null,
    'session/new: switching off forgets a live code, and the panel stops showing it');
  await toUi({ type: 'agent-link', on: true });
}

section('switch-off');
{
  await toUi({ type: 'agent-link', on: false });
  ok(timers.size === 0, 'switching off stops the poll loop');
  pluginWrites = [];
  calls.length = 0;
  const { id } = await send('readback');
  await main.agentLink.poll();
  ok(calls.length === 0 && (await read(id)).pending === true && pluginWrites.length === 0, 'a command sent while off is not run and nothing is written');
  const link = JSON.parse(root.getSharedPluginData(MAILBOX.ns, MAILBOX.link)) as AgentLinkState;
  ok(link.on === false, 'the link record says off');
}

/* ── snippets ───────────────────────────────────────────────────────────────────────────────────────── */
section('snippets — short enough to paste');
{
  const s = sendSnippet(envelope('status', {}));
  const r = readSnippet('a0000000-0000', ['result', 'verdict']);
  const l = linkSnippet();
  ok(s.length < 1000 && r.length < 1000 && l.length < 600, `send ${s.length}, read ${r.length}, link ${l.length} characters (plus a command's own args)`);
  ok(![s, r, l].some((x) => /setPluginData\(|eval\(|Function\(/.test(x)), 'none uses setPluginData (refused under use_figma) or evaluates anything');
}

g.setTimeout = realSetTimeout;

/* ── run-code (#2530, owner Q239 A): the dev build's one dev command ─────────────────────────────────── */
// After the real setTimeout is back: the command's timeout runs on it. EXPECTED is written here (values, log lines,
// error codes and the words of each message); ACTUAL is the dispatcher's envelope. `PRISM3_DEV` is the build's
// define, set on globalThis the way `PRISM3_BUILD` is above, and read at call time, so the last arm can be a release.
section('run-code — a dev build runs code in the main thread and reports in our envelope; a release build refuses it');
{
  const noop = async () => undefined;
  const d = createDispatcher({
    actions: {
      applyTheme: noop, buildComponents: noop, fileSetup: noop, styleGuide: noop, prune: noop, seedFromFile: noop,
      updateComponents: noop, captureBaseline: noop, adoptMembers: noop, drawSpecs: noop, panelsClean: noop,
    } as unknown as Parameters<typeof createDispatcher>[0]['actions'],
    status: async () => ({}),
    census: async () => null,
  });
  const run = (args: Record<string, unknown>) => d(envelope('run-code' as never, args as never), 'mailbox');
  g.PRISM3_DEV = true;
  let r = await run({ code: 'return 1 + 1;' });
  ok(r.ok === true && r.result?.data.value === 2 && r.result?.data.valueType === 'number' && r.result?.verdict === null,
    `run-code value: "return 1 + 1" comes back ok with data.value 2 and no verdict (${JSON.stringify(r.result?.data ?? r.error)})`);
  r = await run({ code: 'await new Promise((res) => setTimeout(res, 5));\nreturn { page: figma.root.name, list: [1, "two"] };' });
  ok(r.ok === true && JSON.stringify(r.result?.data.value) === JSON.stringify({ page: (host as { root: { name: string } }).root.name, list: [1, 'two'] }),
    `run-code await + figma: the code awaits, reaches figma as a global and returns an object as JSON (${JSON.stringify(r.result?.data.value)})`);
  r = await run({ code: 'console.log("first", 2);\nconsole.warn("second");\nreturn null;' });
  ok(r.ok === true && JSON.stringify(r.result?.logs) === JSON.stringify(['first 2', '[warn] second']) && r.result?.data.valueType === 'null',
    `run-code logs: the console lines printed while it ran come back in result.logs (${JSON.stringify(r.result?.logs)})`);
  r = await run({ code: 'throw new Error("boom");' });
  ok(r.ok === false && r.error?.code === 'handler-threw' && r.error?.message === 'boom',
    `run-code throw: a throw comes back as handler-threw with its message (${JSON.stringify(r.error)})`);
  r = await run({ code: 'return 1 +;' });
  ok(r.ok === false && r.error?.code === 'handler-threw' && /^run-code: the code does not parse — /.test(r.error?.message ?? ''),
    `run-code syntax: code that does not parse is refused as handler-threw, saying so (${JSON.stringify(r.error)})`);
  // A timeout stops the WAITING, not the code (#2544 review): the message says so, and a write the code makes after the
  // report still lands. EXPECTED, both halves, written here.
  g.__lateWrite = undefined;
  r = await run({ code: 'await new Promise((res) => setTimeout(res, 60));\nglobalThis.__lateWrite = "landed";\nreturn 1;', timeoutMs: 20 });
  ok(r.ok === false && r.error?.code === 'handler-threw'
    && r.error?.message === 'run-code: timed out after 20 ms; the code may still be running, and anything it writes may still land',
    `run-code timeout: a run past its timeoutMs is reported as timed out, saying its code may still be running (${JSON.stringify(r.error)})`);
  const lateAtReport = g.__lateWrite;
  await new Promise((res) => setTimeout(res, 120));
  ok(lateAtReport === undefined && g.__lateWrite === 'landed',
    `run-code timeout: the timed-out code did go on, and its write landed after the report, as the message warns (at the report ${JSON.stringify(lateAtReport)}, after ${JSON.stringify(g.__lateWrite)})`);
  // The args checks, each by its own message (#2544 review: neither was tested).
  const badTimeouts = [0, 600001, '30'].map((t) => ({ t, rr: null as unknown }));
  for (const b of badTimeouts) b.rr = await run({ code: 'return 1;', timeoutMs: b.t });
  ok(badTimeouts.every((b) => (b.rr as AgentResult).error?.code === 'bad-args' && (b.rr as AgentResult).error?.message === 'run-code takes args.timeoutMs: milliseconds from 1 to 600000'),
    `run-code args: a timeoutMs of 0, 600001 or a string is bad-args, naming the range (${badTimeouts.map((b) => `${JSON.stringify(b.t)} → ${(b.rr as AgentResult).error?.code}`).join(', ')})`);
  const rs = await d(envelope('run-code' as never, 'return 1;' as never), 'mailbox');
  const ra = await d(envelope('run-code' as never, ['return 1;'] as never), 'mailbox');
  ok([rs, ra].every((x) => x.error?.code === 'bad-args' && x.error?.message === "args for 'run-code' must be an object"),
    `run-code args: args that are a string or an array are bad-args, "args for 'run-code' must be an object" (${[rs, ra].map((x) => JSON.stringify(x.error)).join(', ')})`);
  r = await run({});
  ok(r.ok === false && r.error?.code === 'bad-args' && /needs args\.code/.test(r.error?.message ?? ''),
    `run-code args: no code is bad-args (${JSON.stringify(r.error)})`);
  g.PRISM3_DEV = false;
  r = await run({ code: 'return 1;' });
  ok(r.ok === false && r.error?.code === 'unknown-command',
    `run-code release: with PRISM3_DEV false (a release build) the command is unknown-command and nothing runs (${JSON.stringify(r.error)})`);
  g.PRISM3_DEV = true;
}

section('doc-settings — Documentation\'s settings are kept in the file and read back on ui-ready (#2909)');
{
  // The expected side is the literal the panel sent, normalized by hand here; the actual side is the file's record, read
  // again through a fresh `ui-ready`, which goes through `readDocSettings`, not the save's echo.
  posted.length = 0;
  await toUi({ type: 'doc-settings-save', settings: { panels: false, cover: false, styleGuide: { view: 'Theme', options: { rem: true } }, junk: 1 } });
  const echo = posted.find((m) => m?.type === 'doc-settings');
  ok(JSON.stringify(echo?.settings) === JSON.stringify({ panels: false, cover: false, styleGuide: { view: 'Theme', options: { rem: true } } }),
    `doc-settings/save: the save is answered with the record kept, unknown keys dropped — ${JSON.stringify(echo)}`);
  posted.length = 0;
  await toUi({ type: 'ui-ready' });
  const back = posted.find((m) => m?.type === 'doc-settings');
  ok(back?.settings?.panels === false && back?.settings?.cover === false && back?.settings?.styleGuide?.view === 'Theme',
    `doc-settings/readback: ui-ready sends the file's record back — ${JSON.stringify(back)}`);
  // A malformed switch reads as on, the default, never as off.
  await toUi({ type: 'doc-settings-save', settings: { panels: 'no', cover: null } });
  posted.length = 0;
  await toUi({ type: 'ui-ready' });
  const def = posted.find((m) => m?.type === 'doc-settings');
  ok(def?.settings?.panels === true && def?.settings?.cover === true && def?.settings?.styleGuide === null,
    `doc-settings/defaults: a malformed record reads as both switches on — ${JSON.stringify(def)}`);
}

/* ── strip-relaunch (#3416; review of #3420, S1) ─────────────────────────────────────────────────────── */
// "Remembered per file" matters most across launches, and that path is the start-up read: the file's id from root
// plugin data, then `clientStorage` under `prism3:strip-at:<id>`. So the plugin is launched a second time, into a host
// that already holds both, and its first Minimize must land on the stored spot, not in place. Last in the suite: the
// second launch takes over `figma` and the UI's message handler. (mutation: drop the start-up read in `main.ts` →
// strip-relaunch/return fails by name.)
section('strip-relaunch — a new launch puts the first Minimize on the spot this file kept');
{
  const relaunchStore = new Map<string, string>([['prism3:file-id', 'f-relaunch']]);
  const asked: string[] = [];
  const places: [number, number][] = [];
  // As in the strip section: window px (0,0) is canvas (100,200), zoom 2, the window at window (300,100).
  const win = { x: 300, y: 100 };
  let onmessage: null | ((m: unknown) => void) = null;
  const launch2: Record<string, unknown> = {
    ...host,
    ui: {
      postMessage: () => undefined,
      get onmessage() { return onmessage; },
      set onmessage(f: null | ((m: unknown) => void)) { onmessage = f; },
      resize: () => undefined,
      getPosition: () => ({ windowSpace: { ...win }, canvasSpace: { x: 100 + win.x / 2, y: 200 + win.y / 2 } }),
      reposition: (x: number, y: number) => { places.push([x, y]); },
    },
    clientStorage: {
      getAsync: async (key: string) => { asked.push(key); return key === 'prism3:strip-at:f-relaunch' ? { x: 1200, y: 800 } : undefined; },
      setAsync: async () => undefined,
    },
    root: { ...root, getPluginData: (key: string) => relaunchStore.get(key) ?? '', setPluginData: (key: string, v: string) => { relaunchStore.set(key, v); } },
    viewport: { bounds: { x: 100, y: 200, width: 800, height: 500 }, zoom: 2 },
  };
  g.figma = launch2;
  await import('./src/main?relaunch');
  for (let i = 0; i < 20; i++) await settle();
  ok(asked.includes('prism3:strip-at:f-relaunch'), `strip-relaunch/read: at start, the plugin reads this file's spot by its id (${JSON.stringify(asked)})`);
  (onmessage as unknown as (m: unknown) => void)({ type: 'minimize-ui', minimized: true });
  for (let i = 0; i < 20; i++) await settle();
  // The window at canvas (250,250), window (300,100); the kept spot window (1200,800): 250+(1200-300)/2, 250+(800-100)/2.
  ok(JSON.stringify(places) === '[[700,600]]', `strip-relaunch/return: the first Minimize after a relaunch puts the strip on the spot this file kept (${JSON.stringify(places)})`);
  g.figma = host;
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
