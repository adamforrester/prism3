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
 *   · parity/<cmd>: the agent's `result.verdict` is byte-for-byte what the UI path posted
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
 *   · busy/keying: while an apply runs, a different operation still runs (mutation: one hold shared by
 *     every operation → busy/keying fails). busy/preview: a prune preview, from the panel or an agent, is not
 *     refused while a delete runs, and a second delete is (mutations: `writes` true for a preview, or the
 *     panel's prune confirm read as always true → busy/preview's preview arms fail; the delete unguarded →
 *     its control arm fails).
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
 *   · switch-off: with the link off again, nothing new is run
 *   · state: the panel receives the link state and the last command's headline
 *   · snippets: every agent-side script is short
 */
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { MAILBOX, AGENT_COMMANDS, AGENT_PROTOCOL_VERSION, resultKey, utf8Bytes } from './src/agent-protocol';
import type { AgentResult, AgentLinkState } from './src/agent-protocol';
import { storeResult } from './src/agent-link';
import { envelope, sendSnippet, readSnippet, linkSnippet } from './agent-snippets';
import { agentLinkShortStatus, agentLinkStatusText } from './src/agent-link-ui';
import { createRunGuard, TITLE } from './src/run-guard';
import { createDispatcher } from './src/agent-dispatch';
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
  getSharedPluginData: (ns: string, key: string) => store.get(k(ns, key)) ?? '',
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
};
const g = globalThis as Record<string, unknown>;
g.figma = host;
g.__html__ = '';
g.PRISM3_BUILD = '2026-09-25T00:00:00Z tree-test0000';

// The poll loop runs on `setTimeout`. Captured, so the suite ticks it by hand and nothing runs behind it.
const realSetTimeout = globalThis.setTimeout;
const timers = new Map<number, () => void>();
let timerSeq = 0;

const main = await import('./src/main');
g.setTimeout = ((fn: () => void) => { const id = ++timerSeq; timers.set(id, fn); return id; }) as unknown as typeof setTimeout;
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
const send = async (cmd: string, args: unknown = {}, id?: string) => {
  const c = envelope(cmd, args, id);
  const r = await agent(sendSnippet(c));
  return { id: c.id, sent: r };
};
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
  ok(JSON.stringify(st?.commands) === JSON.stringify(AGENT_COMMANDS), 'and the commands this build answers');
  ok(r.result?.verdict === null, 'status has no UI verdict — it has no UI twin');
}

/* ── routes + parity, per command ───────────────────────────────────────────────────────────────────── */
section('routes/<cmd> + parity/<cmd> — the agent reaches the UI\'s handler and gets the UI\'s verdict');
type Case = { cmd: string; args: Record<string, unknown>; ui: Record<string, unknown>; entry: string; verdictType: string };
const CASES: Case[] = [
  { cmd: 'apply-theme', args: { input: brand }, ui: { type: 'apply-theme', input: brand }, entry: 'applyTheme', verdictType: 'apply-result' },
  { cmd: 'build-components', args: { def: 'no-such-def' }, ui: { type: 'build-components', def: 'no-such-def' }, entry: 'buildComponents', verdictType: 'component-result' },
  { cmd: 'file-setup', args: {}, ui: { type: 'file-setup' }, entry: 'fileSetup', verdictType: 'file-setup-result' },
  { cmd: 'style-guide', args: { collections: ['color'] }, ui: { type: 'style-guide', options: { collections: ['color'] } }, entry: 'styleGuide', verdictType: 'style-guide-result' },
  { cmd: 'prune', args: { input: brand, confirm: false }, ui: { type: 'prune', input: brand, confirm: false }, entry: 'prune', verdictType: 'prune-result' },
  { cmd: 'readback', args: {}, ui: { type: 'ui-ready' }, entry: 'seedFromFile', verdictType: 'seed-info' },
];
ok(new Set(CASES.map((c) => c.cmd)).size + 1 === AGENT_COMMANDS.length, 'every write/read command has a case here (status is covered above)');
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
  ok(!!uiVerdict && JSON.stringify(r.result?.verdict) === JSON.stringify(uiVerdict),
    `parity/${c.cmd}: result.verdict is exactly the '${c.verdictType}' the panel got${uiVerdict ? ` (${String(uiVerdict.headline ?? uiVerdict.summary).slice(0, 40)})` : ''}`);
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
  const p2args = { types: ['dimension', 'typography'], pixels: false, rem: true, dimensionDisplay: 'line', fontDisplay: 'letterSpacing', paragraphSpacing: true, textDecoration: false, titleCell: true };
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
  ok(JSON.stringify(got) === '{"types":["dimension","typography"],"rem":true,"dimensionDisplay":"line","fontDisplay":"letterSpacing","paragraphSpacing":true,"textDecoration":false,"titleCell":true,"retired":["pixels"]}',
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
  host.variables = {
    getLocalVariableCollectionsAsync: async () => [{ id: 'C:1', name: 'ramp', modes: [{ modeId: 'm:0', name: 'Value' }], defaultModeId: 'm:0' }],
    getLocalVariablesAsync: async () => [{ id: 'V:1', name: 'ramp/100', variableCollectionId: 'C:1', resolvedType: 'COLOR', description: '', valuesByMode: { 'm:0': { r: 1, g: 0, b: 0, a: 1 } } }],
    setBoundVariableForPaint: (p: unknown) => p,
  };
  r0.findAllWithCriteria = () => [{ name: '_style-guide-swatches', type: 'COMPONENT_SET', children: [] }, { name: '_style-guide-text-cells', type: 'COMPONENT_SET', children: [] }];
  type Verdict = { type?: string; ok?: boolean; headline?: string; summary?: string };
  const results_ = (): Verdict[] => posted.filter((m) => m.type === 'style-guide-result');
  // Main's run guard (#1957, `run-guard.ts`) is the one guard: its refusal and its words, for this operation.
  const SG_BUSY = 'Style guides is already running. Try again when it finishes.';
  const sgRefusals = (agentFlag: boolean) => posted.filter((m) => m.type === 'refused' && m.agent === agentFlag);
  const isSgRefusal = (m: any, agentFlag: boolean) =>
    JSON.stringify(m) === JSON.stringify({ type: 'refused', code: 'busy', cmd: 'style-guide', agent: agentFlag, message: SG_BUSY });

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
    ok(r.ok === false && !!uiVerdict && JSON.stringify(r.result?.verdict) === JSON.stringify(uiVerdict),
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
  const BUSY = 'Apply Theme is already running. Try again when it finishes.';
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
  const isRefusal = (m: any, agentFlag: boolean) =>
    JSON.stringify(m) === JSON.stringify({ type: 'refused', code: 'busy', cmd: 'apply-theme', agent: agentFlag, message: BUSY });
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
  ok(fa.error?.code !== 'busy' && JSON.stringify(fa.result?.verdict) === baseline, 'busy/agent-first: the agent\'s write is unaffected: its verdict is the baseline\'s');

  // Released however it ended: a new apply runs.
  posted.length = 0;
  await toUi({ type: 'apply-theme', input: brand });
  ok(!posted.some((m) => m.type === 'refused') && posted.filter((m) => m.type === 'apply-result').length === 1, 'busy/release: once the run ends, the next apply runs');
  // A write that throws releases too: the hold is dropped in a `finally`.
  const g2 = createRunGuard();
  await g2.run('apply-theme', async () => { throw new Error('test: the write threw'); }).catch(() => undefined);
  ok(!g2.busy('apply-theme'), 'busy/release: a write that threw releases the operation');

  // KEYING (#1995): the hold is per operation. While an apply is held, a file setup still runs.
  posted.length = 0;
  release = hold();
  await toUi({ type: 'apply-theme', input: brand });
  await toUi({ type: 'file-setup' });
  ok(!posted.some((m) => m.type === 'refused') && posted.some((m) => m.type === 'file-setup-result') && !posted.some((m) => m.type === 'apply-result'),
    'busy/keying: while an apply is running, a file setup still runs and is not refused');
  await release();

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
    JSON.stringify(posted.find((m) => m.type === 'refused')) === JSON.stringify({ type: 'refused', code: 'busy', cmd: 'prune', agent: false, message: 'Prune stale is already running. Try again when it finishes.' }),
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
  const MSG = 'Apply Theme is already running. Try again when it finishes.';
  const noop = async () => undefined;
  const d = createDispatcher({
    actions: {
      applyTheme: async (_input: unknown, sink: { post(m: unknown): void }) => { sink.post({ type: 'refused', code: 'busy', cmd: 'apply-theme', agent: true, message: MSG }); },
      buildComponents: noop, fileSetup: noop, styleGuide: noop, prune: noop, seedFromFile: noop,
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
    [{ rem: 'yes' }, 'rem as a string', /args\.rem/], [{ textDecoration: 1 }, 'textDecoration as a number', /args\.textDecoration/], [{ titleCell: 'on' }, 'titleCell as a string', /args\.titleCell/]] as const) {
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
  ok(/Listening — file mailbox, every 1 s · last: status/.test(agentLinkStatusText(s)), `the chip reads: "${agentLinkStatusText(s)}"`);
  ok(agentLinkStatusText(null) === agentLinkStatusText({ ...s, on: false }), 'and reads off before the first state arrives');
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

/* ── switch-off ─────────────────────────────────────────────────────────────────────────────────────── */
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
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
