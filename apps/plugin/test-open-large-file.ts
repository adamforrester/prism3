/**
 * PLUGIN OPEN ON A LARGE FILE (#3110), through the real `main.ts`.
 *
 * Opening the plugin on the reference brand's master, about 60 pages, froze the plugin and the file for about 20 s, the
 * first open of a Figma session. The read at load (`file-sets`) loaded every page in one call, and Figma loads pages on
 * the main thread. This file opens the plugin on a stand-in of that file in the shim and holds three things:
 *
 *   · `open/ready`: the panel's first answer (`file-sets`, which carries the badge's count) lands with NO page loaded.
 *     It is read from the root ledger alone (`ledgerSets`), and says it is `partial`;
 *   · `open/yields`: the read that follows loads the pages one per turn of the event loop, never several between two
 *     turns, so the file answers between pages;
 *   · `open/full` and `open/ledger`: the full read still finds every set the file holds, the ones the ledger does not
 *     name included, and the ledger's answer agrees with it on what is due. Both carry `atOpen`;
 *   · `open/race`: a request the panel sends while that read is going is answered without `atOpen`.
 *
 * THE STAND-IN. 60 pages, one in ten a divider; 50 component sets, one per page from the first, each named by a
 * buildable def's id, as the build names them; a ledger at the root naming 45 of them, 3 of those due for their
 * definition, and 12 recorded with a print under an older engine whose plans have not moved, so the read at open
 * projects them (`open/printed`: current, read from their print) and `open/ready` covers the print path. Figma's page model is kept where it decides the result: a page has to be loaded before its children are
 * searched; loading one costs `PAGE_MS` of main-thread time, burned synchronously as Figma does; `loadAllPagesAsync`
 * loads every page not yet loaded in one go; and the document-wide search refuses until `loadAllPagesAsync` was called,
 * as under `documentAccess: dynamic-page`.
 *
 * "One turn" is one task: the main thread runs it to the end before Figma's panel and canvas answer again. A timer's
 * callback starts a new one, so `setTimeout` is wrapped to close the turn as each callback starts, and the message from
 * the panel starts one too. The most pages loaded inside one turn is the measure of the freeze.
 * Expected values are literals, never read from `main.ts`.
 *
 * MEASURED, NOT ASSERTED: the stage timings `main.ts` keeps when `PRISM3_OPEN_TIMINGS` is set, and the wall-clock time
 * to each answer, are printed for the PR. With `PAGE_MS` at 20 the 60 pages cost 1.2 s; the reference file's ~20 s is
 * about 330 ms a page. Set `PAGE_MS` in the environment to rescale.
 *
 * MUTATIONS, each failing by name: `ui-ready` reading the file first (`fileSets()` in place of `ledgerSets()`) →
 * `open/ready`; `printYielding` loading every page after each projection → `open/ready`; `loadPagesYielding` as one `loadAllPagesAsync` → `open/yields`; `ledgerSets` dropping `partial` →
 * `open/partial`; the read after open posted untagged → `open/full`; `styleGuideCatalog` back on `loadAllPagesAsync`
 * → `open/yields`; `checkSets`, prune, `styleGuide` or `styleGuideCleanup` loading every page in one call →
 * `entry/check`, `entry/prune`, `entry/style-guide`, `entry/style-guide-cleanup`; the read after open's error answer
 * posted untagged → `open/error`.
 *
 * #3129 Q833 A, THE ADD QUEUE through the same `main.ts`: `queue/read` (every read reports the queue without the sets the
 * file holds and without a def the engine does not define), `queue/read-only` (reads clear no key), `queue/write`,
 * `queue/tidy` (a queue write clears the stale keys) and `queue/remove`. Mutations failing by name: `queuedFor` reading the
 * raw keys → `queue/read`; `fileDue` posting `queued: []` → `queue/read` (its live-recount case); the stale clear
 * dropped from `addQueue` → `queue/tidy`.
 *
 * Also held: `open/race`, the checklist's own request asked while the read after open is still going, is answered
 * without `atOpen`, so the panel keeps it over the read after open (`host-session.ts`, `awaitingRead`).
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs } from '@prism3/engine/components/index';
import { materializerFor } from './src/brand-def';
import { SWAP_TARGET } from './src/build-deps';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { entryFor, LEDGER_KEY, LEDGER_V } from './src/as-built-ledger';
import exampleBrands from '@prism3/engine/schema/example-brands.json';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const PAGE_MS = Number(process.env.PAGE_MS ?? 20);
const PAGES = 60;
const SETS = 50;
const RECORDED = 45;
const DUE = 3;
/** Recorded with a print under an older engine, plans unchanged: the read at open must print them to call them current
 *  (#3090 review of cc9fe14f), and printing must load no page. */
const PRINTED = 12;
const OLD_ENGINE = '0.0.0-before';

/* ── the stand-in file ─────────────────────────────────────────────────────────────────────────────── */

const burn = (ms: number): void => { const end = Date.now() + ms; while (Date.now() < end) { /* the main thread, held */ } };
let loads = 0;
let inTurn = 0;
let worstTurn = 0;
let allCalled = false;
const loadOne = (p: { loaded: boolean }): void => {
  if (p.loaded) return;
  p.loaded = true;
  loads++;
  inTurn++;
  worstTurn = Math.max(worstTurn, inTurn);
  burn(PAGE_MS);
};

const shim = makeShim({ vars: [], styles: [], effects: [] }) as Record<string, any>;
const buildable = componentDefs.filter((d) => d.figmaProperties && !d.figmaProperties.emitAsComponents);
ok(buildable.length >= SETS, `the stand-in has ${SETS} buildable defs to name its sets by (${buildable.length} buildable)`);
const setIds = buildable.slice(0, SETS).map((d) => d.id);

type Page = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; loaded: boolean; children: Node[];
  loadAsync(): Promise<void>; findAllWithCriteria(c: { types?: string[] }): Node[] };
const mkNode = (type: string, name: string, children: Node[] = []): Node => {
  const n = (shim.createFrame as () => Node)();
  n.type = type;
  n.name = name;
  for (const c of children) (n.children as Node[]).push(c);
  return n;
};
const pages: Page[] = [];
let placed = 0;
for (let i = 0; i < PAGES; i++) {
  const divider = i % 10 === 9;
  const children = !divider && placed < SETS ? [mkNode('COMPONENT_SET', setIds[placed++], [mkNode('COMPONENT', 'Variant=Default')])] : [];
  pages.push({
    id: `PAGE:${i + 1}`, name: divider ? '---' : `Page ${i + 1}`, type: 'PAGE', isPageDivider: divider, loaded: false, children,
    async loadAsync() { loadOne(this); },
    findAllWithCriteria(c) {
      if (!this.loaded) throw new Error(`page ${this.name} searched before it was loaded`);
      const all = this.children.flatMap((n) => [n, ...((n.children as Node[] | undefined) ?? [])]);
      return all.filter((n) => !c.types || c.types.includes(n.type as string));
    },
  });
}
ok(placed === SETS, `the stand-in places ${SETS} sets on its ${PAGES} pages (${placed})`);

const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
const mat = materializerFor(null);
const ledger = Object.fromEntries(setIds.slice(0, RECORDED).map((id, i) => {
  const m = mat(componentDefs.find((d) => d.id === id)!);
  if (i >= DUE && i < DUE + PRINTED) return [id, { ...entryFor(m, figmaAnatomySet(m, { swapTarget: SWAP_TARGET })), engine: OLD_ENGINE }];
  const e = entryFor(m);
  return [id, i < DUE ? { ...e, def: 'moved000moved000' } : e];
}));
pluginData.set(LEDGER_KEY, JSON.stringify({ v: LEDGER_V, sets: ledger }));
// #3129 Q833 A, the add queue at the root (`add-queue.ts`): a set the file holds and the ledger records, a set it does
// not hold, and a def the engine does not define. Only the second is the queue a read reports (Q3129.2 A, Q3129.3 A).
const ABSENT = buildable[SETS].id;
const LATER = buildable[SETS + 1].id;
sharedData.set(`prism3:addQueue.${setIds[0]}`, '2026-10-28T09:00:00.000Z');
sharedData.set(`prism3:addQueue.${ABSENT}`, '2026-10-28T09:00:00.000Z');
sharedData.set('prism3:addQueue.retired-def', '2026-10-28T09:00:00.000Z');
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'large-file stand-in',
  type: 'DOCUMENT',
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  getSharedPluginDataKeys: (ns: string) => [...sharedData.keys()].filter((k) => k.startsWith(`${ns}:`)).map((k) => k.slice(ns.length + 1)),
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
  // Under `dynamic-page`, a document-wide search refuses until `loadAllPagesAsync` was called.
  findAllWithCriteria: (c: { types?: string[] }) => {
    if (!allCalled) throw new Error('figma.root.findAllWithCriteria before figma.loadAllPagesAsync (dynamic-page)');
    return pages.flatMap((p) => p.findAllWithCriteria(c));
  },
  findAll: (pred?: (n: Node) => boolean) => {
    if (!allCalled) throw new Error('figma.root.findAll before figma.loadAllPagesAsync (dynamic-page)');
    return pages.flatMap((p) => p.children.flatMap((n) => [n, ...((n.children as Node[] | undefined) ?? [])])).filter((n) => !pred || pred(n));
  },
});

const posted: { at: number; loads: number; msg: any }[] = [];
const t0 = { at: 0 };
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push({ at: Date.now() - t0.at, loads, msg: m }); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  loadAllPagesAsync: async () => { for (const p of pages) loadOne(p); allCalled = true; },
  setCurrentPageAsync: async () => undefined,
  // No variable in the stand-in: prune and the style guide read the collections before their page loads.
  variables: { ...(shim.variables as object), getLocalVariableCollectionsAsync: async () => [], getLocalVariablesAsync: async () => [] },
  getNodeByIdAsync: async () => null,
  listAvailableFontsAsync: async () => [],
  getLocalPaintStylesAsync: shim.getLocalPaintStylesAsync ?? (async () => []),
  getLocalGridStylesAsync: shim.getLocalGridStylesAsync ?? (async () => []),
});
const g = globalThis as Record<string, unknown>;
// Each timer callback is a task of its own, as in Figma's sandbox, so it closes the turn before it runs.
const realTimeout = globalThis.setTimeout;
g.setTimeout = ((fn: (...a: unknown[]) => void, ms?: number, ...a: unknown[]) => realTimeout(() => { inTurn = 0; fn(...a); }, ms)) as unknown as typeof setTimeout;
g.figma = shim;
g.__html__ = '';
g.PRISM3_BUILD = '2026-10-28T00:00:00Z tree-test0000';
const timings: { stage: string; ms: number }[] = [];
g.PRISM3_OPEN_TIMINGS = timings;

await import('./src/main');

/* ── open the plugin ───────────────────────────────────────────────────────────────────────────────── */

console.log(`plugin open on a ${PAGES}-page, ${SETS}-set stand-in (#3110), ${PAGE_MS} ms a page`);
loads = 0; inTurn = 0; worstTurn = 0;
t0.at = Date.now();
const send = (m: unknown): void => (shim.ui as { onmessage: (m: unknown) => void }).onmessage(m);
send({ type: 'ui-ready' });
const sets = () => posted.filter((p) => p.msg?.type === 'file-sets');
// While the read after open runs, the panel opens Update file's checklist (its own `file-sets-request`, under the
// panel's brand, Q699 A) and Style guides (`style-guide-catalog-request`, which needs every page). Neither may load
// the rest in one go, and the checklist's answer must be told apart from the read after open, which may land after it.
for (let i = 0; i < 200 && loads < 10; i++) await new Promise((res) => realTimeout(res, 1));
const loadsAtAsk = loads;
send({ type: 'file-sets-request', input: { ...(JSON.parse(sharedData.get('prism3:brandInput') ?? '{}')), density: 'compact' } });
send({ type: 'style-guide-catalog-request' });
const done = () => posted.find((p) => p.msg?.type === 'hand-edits' && p.msg.done === true);
for (let i = 0; i < 2000 && !done(); i++) await new Promise((res) => realTimeout(res, 5));

const first = sets()[0];
const full = sets().find((p) => p.msg.atOpen === true && p.msg.partial !== true);
const answer = sets().find((p) => p.msg.atOpen !== true);
ok(first !== undefined && first.loads === 0,
  `open/ready: the panel's first answer lands with no page loaded (${first ? `${first.loads} of ${PAGES} pages loaded, at ${first.at} ms` : 'no answer'})`);
ok(first?.msg?.partial === true, `open/partial: that answer says it is the ledger's alone (partial ${first?.msg?.partial})`);
const firstDue = Object.entries((first?.msg?.due ?? {}) as Record<string, { state: string }>).filter(([, d]) => d.state === 'due').map(([id]) => id);
ok(first?.msg?.present?.length === RECORDED && firstDue.length === DUE,
  `open/ledger: it names the ${RECORDED} sets the ledger records, ${DUE} of them due (${first?.msg?.present?.length} present, ${firstDue.length} due)`);
const printedIds = setIds.slice(DUE, DUE + PRINTED);
const printedRead = printedIds.map((id) => first?.msg?.due?.[id]?.state);
ok(printedRead.length === PRINTED && printedRead.every((st) => st === 'current'),
  `open/printed: the ${PRINTED} sets recorded with a print under an older engine, plans unchanged, are printed at open and read current (${JSON.stringify([...new Set(printedRead)])})`);
ok(first?.msg?.atOpen === true, `open/tagged: it is tagged as the host's read after open (atOpen ${first?.msg?.atOpen})`);
ok(answer !== undefined && answer.msg.present?.length === SETS && loadsAtAsk > 0 && loadsAtAsk < PAGES,
  `open/race: the checklist's request, asked mid-read (${loadsAtAsk} of ${PAGES} pages loaded), is answered untagged, so the panel can tell it from the read after open (${answer ? `${answer.msg.present?.length} present` : 'no answer'})`);
ok(posted.some((p) => p.msg?.type === 'style-guide-catalog'), `open/catalog: Style guides' read, asked mid-read, answers (${posted.some((p) => p.msg?.type === 'style-guide-catalog')})`);
ok(full !== undefined && full.msg.partial === undefined && full.msg.present?.length === SETS && !full.msg.error,
  `open/full: the full read follows, tagged as the read after open, and finds all ${SETS} sets, the ${SETS - RECORDED} the ledger does not name included (${full ? `${full.msg.present?.length} present, partial ${full.msg.partial}, error ${full.msg.error ?? 'none'}` : 'no answer'})`);
const fullDue = Object.entries((full?.msg?.due ?? {}) as Record<string, { state: string }>).filter(([, d]) => d.state === 'due').map(([id]) => id);
ok(JSON.stringify(fullDue) === JSON.stringify(firstDue), `open/agree: the ledger's answer and the full read agree on what is due (${JSON.stringify(firstDue)} vs ${JSON.stringify(fullDue)})`);
ok(loads === PAGES, `open/control: the read after the answer does load every page, once (${loads} page loads)`);
ok(worstTurn <= 1, `open/yields: no turn of the event loop loads more than one page, the reads asked mid-read included (worst ${worstTurn})`);
ok(done() !== undefined, `open/pass: the hand-edit pass runs after the read and ends (${done() ? `at ${done()!.at} ms` : 'no end in 10 s'})`);

console.log('\n  measured (not asserted):');
console.log(`    first answer (panel ready)  ${first?.at ?? '—'} ms, ${first?.loads ?? '—'} pages loaded`);
console.log(`    full read                   ${full?.at ?? '—'} ms`);
console.log(`    hand-edit pass done         ${done()?.at ?? '—'} ms`);
console.log(`    most pages in one turn      ${worstTurn} (${worstTurn * PAGE_MS} ms held)`);
for (const t of timings) console.log(`    stage ${t.stage.padEnd(22)}${t.ms} ms`);

/* ── the add queue (#3129 Q833 A) ──────────────────────────────────────────────────────────────────── */

// Every read reports the queue without the sets the file holds and without a def the engine cannot build, and never
// writes; a queue write sets its keys, clears the ones a read leaves out, and answers with the queue. Literals typed here.
console.log('\n  the add queue (#3129)');
ok(JSON.stringify(first?.msg?.queued) === JSON.stringify([ABSENT]) && JSON.stringify(full?.msg?.queued) === JSON.stringify([ABSENT]),
  `queue/read: the ledger's answer and the full read report the queue minus the set the file holds and the retired def (${JSON.stringify([first?.msg?.queued, full?.msg?.queued])})`);
{
  // The badge's live recount reports the same queue: the panel replaces its queue with each recount's (host-session).
  const from = posted.length;
  send({ type: 'due-request', input: JSON.parse(sharedData.get('prism3:brandInput') ?? '{}'), seq: 1 });
  const got = () => posted.slice(from).find((p) => p.msg?.type === 'file-due');
  for (let i = 0; i < 2000 && !got(); i++) await new Promise((res) => realTimeout(res, 5));
  ok(JSON.stringify(got()?.msg?.queued) === JSON.stringify([ABSENT]),
    `queue/read: the live recount's file-due answer reports the same queue as the other two reads (${JSON.stringify(got()?.msg?.queued ?? null)})`);
}
ok(sharedData.get(`prism3:addQueue.${setIds[0]}`) !== '' && sharedData.get('prism3:addQueue.retired-def') !== '',
  'queue/read-only: the reads cleared no key (Q3129.2 A: reads never write)');
{
  const from = posted.length;
  send({ type: 'add-queue', ids: [LATER], on: true });
  const got = () => posted.slice(from).find((p) => p.msg?.type === 'add-queue');
  for (let i = 0; i < 2000 && !got(); i++) await new Promise((res) => realTimeout(res, 5));
  ok(JSON.stringify(got()?.msg?.queued) === JSON.stringify([ABSENT, LATER]) && !!sharedData.get(`prism3:addQueue.${LATER}`),
    `queue/write: add-queue on queues the set in its own key and answers with the queue (${JSON.stringify(got()?.msg ?? null)})`);
  ok(sharedData.get(`prism3:addQueue.${setIds[0]}`) === '' && sharedData.get('prism3:addQueue.retired-def') === '',
    `queue/tidy: the write clears the key of the set the file holds and of the retired def (${JSON.stringify([sharedData.get(`prism3:addQueue.${setIds[0]}`), sharedData.get('prism3:addQueue.retired-def')])})`);
  const from2 = posted.length;
  send({ type: 'add-queue', ids: [ABSENT, LATER], on: false });
  const got2 = () => posted.slice(from2).find((p) => p.msg?.type === 'add-queue');
  for (let i = 0; i < 2000 && !got2(); i++) await new Promise((res) => realTimeout(res, 5));
  ok(JSON.stringify(got2()?.msg?.queued) === JSON.stringify([]) && sharedData.get(`prism3:addQueue.${ABSENT}`) === '',
    `queue/remove: add-queue off empties the keys and answers with an empty queue (${JSON.stringify(got2()?.msg ?? null)})`);
}

/* ── every other entry that needs every page, each on a file not yet read ──────────────────────────── */

// Each entry runs on the stand-in with its pages unloaded again, as on a fresh open of the file, so the read it does is its
// own. One that loads every page in one call holds the thread for all of them (worst 51 or 60 here); one per turn holds
// it for one. `entry/*` names the entry, so a mutation reverting one of them fails by that entry's name.
const reply = (type: string, from: number) => posted.slice(from).find((p) => p.msg?.type === type);
const entry = async (label: string, msg: unknown, answer: string): Promise<void> => {
  for (const p of pages) p.loaded = false;
  allCalled = false; loads = 0; inTurn = 0; worstTurn = 0;
  const from = posted.length;
  send(msg);
  for (let i = 0; i < 4000 && !reply(answer, from); i++) await new Promise((res) => realTimeout(res, 5));
  ok(reply(answer, from) !== undefined && loads === PAGES && worstTurn <= 1,
    `entry/${label}: it loads every page, one per turn (${loads} of ${PAGES} loaded, worst ${worstTurn} in one turn, ${reply(answer, from) ? `answered ${answer}${reply(answer, from)!.msg.summary ? `: ${reply(answer, from)!.msg.summary}` : ""}` : `no ${answer}`})`);
};
const stored = JSON.parse(sharedData.get('prism3:brandInput') ?? '{}');
await entry('check', { type: 'update-check-request', defs: setIds.slice(0, DUE), input: stored }, 'update-check');
// Prune plans from the brand it is sent, so it is sent a whole one; the stand-in stores none.
await entry('prune', { type: 'prune', input: exampleBrands['aurora'], confirm: false }, 'prune-result');
await entry('style-guide', { type: 'style-guide', options: {} }, 'style-guide-result');
await entry('style-guide-cleanup', { type: 'style-guide-cleanup', ids: [] }, 'style-guide-cleanup-result');

/* ── a read after open that fails ──────────────────────────────────────────────────────────────────── */

// The full read after open, failing, still says it is the read after open: an error the panel did not ask for must not
// replace an answer it did (`host-session.ts`). The document-wide search refuses, so the read answers with its error.
{
  for (const p of pages) p.loaded = false;
  allCalled = false;
  const from = posted.length;
  const search = root.findAllWithCriteria;
  root.findAllWithCriteria = () => { throw new Error('the stand-in refuses the search'); };
  send({ type: 'ui-ready' });
  const failedRead = () => posted.slice(from).find((p) => p.msg?.type === 'file-sets' && p.msg.error);
  for (let i = 0; i < 4000 && !failedRead(); i++) await new Promise((res) => realTimeout(res, 5));
  ok(failedRead()?.msg?.atOpen === true,
    `open/error: a read after open that fails is still tagged as the read after open (${failedRead() ? `atOpen ${failedRead()!.msg.atOpen}, error ${failedRead()!.msg.error}` : 'no error answer'})`);
  const end = posted.length;
  for (let i = 0; i < 4000 && !posted.slice(end).some((p) => p.msg?.type === 'hand-edits' && p.msg.done === true); i++) await new Promise((res) => realTimeout(res, 5));
  root.findAllWithCriteria = search;
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
