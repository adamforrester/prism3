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
 *   · envelope: every field of the result envelope, for every command
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
import { agentLinkStatusText } from './src/agent-link-ui';

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
