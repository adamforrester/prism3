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
 * #3170, THE HANG AFTER #3111. A page search costs `SEARCH_MS` of main-thread time, so a search of the whole file costs
 * it once per page in one turn, as Figma's does, and the panel's live recount (`due-request`) arrives 250 ms after each
 * `file-sets`, as the studio sends it. Arms: `open/paint-first` (the `ui-ready` turn loads, searches and projects
 * nothing), `open/no-walk` (no whole-file search from open to the hand-edit pass's end), `open/search-yields` (one page
 * searched per turn at most), `open/one-read` (requests asked mid-read share it: each page searched at most twice) and
 * `open/plans` (the pass projects one set per turn). Mutations failing by name: the reads back in the `ui-ready` turn →
 * `open/paint-first`; `readPresent` on one whole-file search → `open/no-walk`; the pass searching `figma` → `open/no-walk`;
 * no shared read → `open/one-read`; every set projected at once → `open/plans`; `isSetUp(figma.root)` in `fileSets` or
 * Style guides' catalog → `open/no-walk`. A write between two pages of the read after open: `open/write-shared` (a
 * request after it reads the file anew) and `open/write-cache` (the older read's answer is not kept as `presentCache`).
 * Mutations failing by name: `guarded` no longer dropping the read or moving `presentGen` → `open/write-shared`; the
 * older read's answer cached without the generation check → `open/write-cache`.
 *
 * #3177, THE UPDATE CHECK AND APPLY over every set, each on the stand-in with its pages unloaded: `update/check-no-walk`,
 * `update/apply-no-walk` (no whole-file search during either), `update/search-yields` (one page searched per turn),
 * `update/one-read` (each page read once per run, and by the apply once more after a write to the set on it) and
 * `update/answers`. Mutations failing by name: the dry run without the run's read (`runHost`) → `entry/check`,
 * `update/one-read`, `update/answers`; the apply without it → `update/apply-no-walk`, `update/search-yields`,
 * `update/one-read`; the criteria searched in one turn → `update/search-yields`; the apply's dry run reading again →
 * `update/one-read`; the furniture drawn on `figma` → `update/apply-no-walk`. The executor's lookups, the re-reads after a
 * write and the twin comparison are `test-run-read.ts`'s, which builds a set the executor can write.
 *
 * #3189, CAPTURE BASELINE AND ADOPT on the same host, each over every def, driven through `ACTIONS` with an agent's sink
 * (both are agent commands): `capture/no-walk`, `adopt/no-walk` (no whole-file search, one page a turn at most),
 * `capture/one-read`, `adopt/one-read` (each page searched once per criterion, never once per set), `capture/answers`,
 * `adopt/answers` (the answer a whole-file search gives, as literals; its digest is printed, and matched the one before
 * #3189) and `capture/progress`, `adopt/progress` (check, a reading per def in order, finish). Mutations failing by name:
 * the capture without the run's read (`runHost`) → `capture/no-walk`, `capture/one-read`; Adopt without it →
 * `adopt/no-walk`, `adopt/one-read`; a page left out of the run's read → `capture/answers`, `adopt/answers`; the capture's
 * or Adopt's readings not posted → `capture/progress`, `adopt/progress`. And `capture/fixed`, `adopt/fixed` (#3209, the
 * #3210 review): both again over a host and root whose methods are fixed, as Figma's are, each giving the plain host's
 * answer. Mutation: `withRoot` put back as a `Proxy` → `capture/fixed`, `adopt/fixed`.
 *
 * Also held: `open/race`, the checklist's own request asked while the read after open is still going, is answered
 * without `atOpen`, so the panel keeps it over the read after open (`host-session.ts`, `awaitingRead`).
 */
import { fixHostMethods, makeShim } from './component-shim';
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
/** #3170: searching one loaded page's nodes costs `SEARCH_MS` of main-thread time, so a document-wide search costs it
 *  once per page, all in one turn, as Figma's does. */
const SEARCH_MS = Number(process.env.SEARCH_MS ?? 5);
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
/** #3170: pages searched inside one turn (a document-wide search is every page at once), and document-wide searches. */
let searchedInTurn = 0;
let worstSearch = 0;
let docSearches = 0;
/** #3170: the turn each page load and page search ran in, and how often each page was searched. */
let turnNo = 0;
const loadTurns: number[] = [];
const searchTurns: number[] = [];
const searchesOf = new Map<string, number>();
const searchOne = (): void => {
  searchTurns.push(turnNo);
  searchedInTurn++;
  worstSearch = Math.max(worstSearch, searchedInTurn);
  burn(SEARCH_MS);
};
const loadOne = (p: { loaded: boolean }): void => {
  if (p.loaded) return;
  p.loaded = true;
  loads++;
  loadTurns.push(turnNo);
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
  for (const c of children) { (n.children as Node[]).push(c); c.parent = n; }
  return n;
};
const pages: Page[] = [];
let placed = 0;
for (let i = 0; i < PAGES; i++) {
  const divider = i % 10 === 9;
  const children = !divider && placed < SETS ? [mkNode('COMPONENT_SET', setIds[placed++], [mkNode('COMPONENT', 'Variant=Default')])] : [];
  const page: Page = {
    id: `PAGE:${i + 1}`, name: divider ? '---' : `Page ${i + 1}`, type: 'PAGE', isPageDivider: divider, loaded: false, children,
    async loadAsync() { loadOne(this); },
    findAllWithCriteria(c) {
      if (!this.loaded) throw new Error(`page ${this.name} searched before it was loaded`);
      searchOne();
      searchesOf.set(this.id, (searchesOf.get(this.id) ?? 0) + 1);
      const all = this.children.flatMap((n) => [n, ...((n.children as Node[] | undefined) ?? [])]);
      return all.filter((n) => !c.types || c.types.includes(n.type as string));
    },
  };
  // Each node's parent, as in Figma: the run's re-read after a write finds the page a set sits on by it (#3177).
  for (const n of children) n.parent = page as unknown as Node;
  pages.push(page);
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
    docSearches++;
    return pages.flatMap((p) => p.findAllWithCriteria(c));
  },
  findAll: (pred?: (n: Node) => boolean) => {
    if (!allCalled) throw new Error('figma.root.findAll before figma.loadAllPagesAsync (dynamic-page)');
    docSearches++;
    for (const _ of pages) searchOne();
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
g.setTimeout = ((fn: (...a: unknown[]) => void, ms?: number, ...a: unknown[]) => realTimeout(() => { inTurn = 0; searchedInTurn = 0; turnNo++; fn(...a); }, ms)) as unknown as typeof setTimeout;
g.figma = shim;
g.__html__ = '';
g.PRISM3_BUILD = '2026-10-28T00:00:00Z tree-test0000';
const timings: { stage: string; ms: number; turn?: number }[] = [];
// Each stage is stamped with the turn it ended in (#3170), so a test can tell work done in one turn from work spread out.
timings.push = (...e: { stage: string; ms: number }[]) => Array.prototype.push.call(timings, ...e.map((x) => ({ ...x, turn: turnNo })));
g.PRISM3_OPEN_TIMINGS = timings;

const { ACTIONS } = await import('./src/main');

/* ── open the plugin ───────────────────────────────────────────────────────────────────────────────── */

console.log(`plugin open on a ${PAGES}-page, ${SETS}-set stand-in (#3110), ${PAGE_MS} ms a page`);
loads = 0; inTurn = 0; worstTurn = 0; searchedInTurn = 0; worstSearch = 0; docSearches = 0; loadTurns.length = 0; searchTurns.length = 0; searchesOf.clear();
t0.at = Date.now();
// A message from the panel starts a turn of its own.
const send = (m: unknown): void => { inTurn = 0; searchedInTurn = 0; turnNo++; (shim.ui as { onmessage: (m: unknown) => void }).onmessage(m); };
// #3170: the panel as it is at open. It asks for the badge's live recount (`due-request`) 250 ms after each `file-sets`
// lands (`DUE_AFTER`, `DUE_DEBOUNCE_MS` in the studio), against the brand it restored, so the first one arrives while the
// read after open is still going, before that read has found the file's sets.
let panelLive = true;
let dueAsked = 0;
const dueSeqAt: number[] = [];
const panelPost = (shim.ui as { postMessage: (m: unknown) => void }).postMessage;
(shim.ui as { postMessage: (m: unknown) => void }).postMessage = (m: unknown) => {
  panelPost(m);
  if (panelLive && (m as { type?: string })?.type === 'file-sets') realTimeout(() => {
    if (!panelLive) return;
    dueSeqAt.push(loads);
    send({ type: 'due-request', input: JSON.parse(sharedData.get('prism3:brandInput') ?? '{}'), seq: 1000 + ++dueAsked });
  }, 250);
};
// #3170: the event loop's longest stall from open to the hand-edit pass's end, read by a heartbeat on the real timer: how
// long the panel and the file wait, at worst, for the thread. Measured, not asserted (it is wall-clock).
let lag = 0;
let beating = true;
const beat = (): void => { const at = Date.now(); realTimeout(() => { lag = Math.max(lag, Date.now() - at - 1); if (beating) beat(); }, 1); };
beat();
const timingsAtOpen = timings.length;
send({ type: 'ui-ready' });
const readyTurn = turnNo;
const postedInReady = posted.length;
await Promise.resolve();
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
// The live recounts the panel asked meanwhile, answered.
for (let i = 0; i < 400 && posted.filter((p) => p.msg?.type === 'file-due' && p.msg.seq > 1000).length < dueAsked; i++) await new Promise((res) => realTimeout(res, 5));
panelLive = false;
beating = false;

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
// #3170 Q3170.1 A: the read after open says how far it has got, a page at a time, for the panel's status strip: page 0 of
// N as it starts (the strip's indeterminate "Reading this file…"), then each page once, in order, all before the full read.
const reads = posted.filter((p) => p.msg?.type === 'run-progress' && p.msg.run === 'read');
ok(JSON.stringify(reads.map((p) => p.msg.done)) === JSON.stringify(Array.from({ length: PAGES + 1 }, (_, i) => i)) && reads.every((p) => p.msg.total === PAGES && p.msg.phase === 'work')
  && !!full && reads.every((p) => posted.indexOf(p) < posted.indexOf(full)),
  `open/read-progress: the read after open posts page 0 to ${PAGES} of ${PAGES}, once each, in order, before its answer; the reads asked mid-read post none (${reads.length} readings, ${JSON.stringify(reads.slice(0, 3).map((p) => p.msg.done))}…)`);
ok(loads === PAGES, `open/control: the read after the answer does load every page, once (${loads} page loads)`);
ok(worstTurn <= 1, `open/yields: no turn of the event loop loads more than one page, the reads asked mid-read included (worst ${worstTurn})`);
ok(done() !== undefined, `open/pass: the hand-edit pass runs after the read and ends (${done() ? `at ${done()!.at} ms` : 'no end in 10 s'})`);

// #3170: the hang after #3111. The page loads were off the path, but each read still searched the whole file in one turn,
// the hand-edit pass once per set, and projected every set's plans in one turn; and the badge's first recount, asked
// while the read after open was going, started a second read beside it.
{
  const readyWork = [...loadTurns, ...searchTurns].filter((t) => t === readyTurn).length
    + timings.slice(timingsAtOpen).filter((t) => t.turn === readyTurn && (t.stage === 'print' || t.stage === 'plan')).length;
  const readyPosts = posted.slice(0, postedInReady).map((p) => p.msg?.type);
  ok(readyWork === 0 && readyPosts.includes('doc-settings') && readyPosts.some((t) => typeof t === 'string' && t.startsWith('restore-input')),
    `open/paint-first: the turn that answers ui-ready posts the brand and the settings and loads, searches and projects nothing (${readyWork} pieces of work in it; posted ${JSON.stringify(readyPosts)})`);
  ok(docSearches === 0, `open/no-walk: from open to the hand-edit pass's end, the live recounts included, nothing searches the whole file in one turn (${docSearches} document-wide searches)`);
  ok(worstSearch <= 1, `open/search-yields: no turn searches more than one page (worst ${worstSearch})`);
  const most = Math.max(0, ...searchesOf.values());
  ok(searchesOf.size === PAGES && most <= 2,
    `open/one-read: the requests asked while the read after open is going share it; each page is searched at most twice, once for that read and once for the hand-edit pass (${searchesOf.size} of ${PAGES} pages searched, most ${most} times)`);
  const plans = timings.slice(timingsAtOpen).filter((t) => t.stage === 'plan');
  const planTurns = new Set(plans.map((t) => t.turn));
  ok(plans.length === SETS && planTurns.size === plans.length,
    `open/plans: the hand-edit pass projects one set's plans per turn (${plans.length} projections in ${planTurns.size} turns, ${SETS} sets)`);
}

console.log('\n  measured (not asserted):');
console.log(`    first answer (panel ready)  ${first?.at ?? '—'} ms, ${first?.loads ?? '—'} pages loaded`);
console.log(`    full read                   ${full?.at ?? '—'} ms`);
console.log(`    hand-edit pass done         ${done()?.at ?? '—'} ms`);
console.log(`    most pages in one turn      ${worstTurn} (${worstTurn * PAGE_MS} ms held)`);
console.log(`    most pages searched in one turn ${worstSearch} (${worstSearch * SEARCH_MS} ms held)`);
console.log(`    document-wide searches      ${docSearches}`);
console.log(`    live recounts at open       ${dueAsked} (asked at ${JSON.stringify(dueSeqAt)} pages loaded)`);
console.log(`    longest stall of the loop   ${lag} ms`);
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
  // #3170: the read searches a page at a time, so the pages refuse too.
  const pageSearch = pages.map((p) => p.findAllWithCriteria);
  for (const p of pages) p.findAllWithCriteria = () => { throw new Error('the stand-in refuses the search'); };
  send({ type: 'ui-ready' });
  const failedRead = () => posted.slice(from).find((p) => p.msg?.type === 'file-sets' && p.msg.error);
  for (let i = 0; i < 4000 && !failedRead(); i++) await new Promise((res) => realTimeout(res, 5));
  ok(failedRead()?.msg?.atOpen === true,
    `open/error: a read after open that fails is still tagged as the read after open (${failedRead() ? `atOpen ${failedRead()!.msg.atOpen}, error ${failedRead()!.msg.error}` : 'no error answer'})`);
  const end = posted.length;
  for (let i = 0; i < 4000 && !posted.slice(end).some((p) => p.msg?.type === 'hand-edits' && p.msg.done === true); i++) await new Promise((res) => realTimeout(res, 5));
  root.findAllWithCriteria = search;
  pages.forEach((p, i) => { p.findAllWithCriteria = pageSearch[i]; });
}

/* ── a write between two pages of the read after open ──────────────────────────────────────────────── */

// #3170 review of 3985bd7b: the shared read is dropped as a write starts and ends (`guarded`), and a read begun before
// the write never leaves its answer as `presentCache`. The read after open is let search a few pages, then a guarded
// build runs and adds a set to a page that read has already searched, so only a read begun after the write can see it.
// The shim cannot draw a real build on these pages, so the build is sent a def id the engine does not know (a guarded
// write that answers at once) and the stand-in adds the set as the build posts its verdict, inside the write's hold.
// `open/write-shared`: the checklist's request after the write is answered from a new read, not the one begun before it.
// `open/write-cache`: the badge's recount asked as that older read ends is answered from the file as the write left it.
{
  for (const p of pages) p.loaded = false;
  allCalled = false;
  const from = posted.length;
  const searchedAt = searchTurns.length;
  const ADDED = ABSENT;
  const hook = (shim.ui as { postMessage: (m: unknown) => void }).postMessage;
  (shim.ui as { postMessage: (m: unknown) => void }).postMessage = (m: unknown) => {
    if ((m as { type?: string })?.type === 'component-result') pages[0].children.push(mkNode('COMPONENT_SET', ADDED, [mkNode('COMPONENT', 'Variant=Default')]));
    hook(m);
  };
  send({ type: 'ui-ready' });
  for (let i = 0; i < 2000 && searchTurns.length - searchedAt < 5; i++) await new Promise((res) => realTimeout(res, 1));
  const midRead = searchTurns.length - searchedAt;
  send({ type: 'build-components', def: 'no-such-def' });
  for (let i = 0; i < 200 && !reply('component-result', from); i++) await new Promise((res) => realTimeout(res, 1));
  (shim.ui as { postMessage: (m: unknown) => void }).postMessage = hook;
  // The checklist asks once the write is done; the badge asks the moment the older read posts its answer.
  const asked = posted.length;
  send({ type: 'file-sets-request', input: stored });
  const olderRead = () => posted.slice(from).find((p) => p.msg?.type === 'file-sets' && p.msg.atOpen === true && p.msg.partial !== true);
  for (let i = 0; i < 4000 && !olderRead(); i++) await new Promise((res) => realTimeout(res, 1));
  const recountAt = posted.length;
  send({ type: 'due-request', input: stored, seq: 2 });
  const checklist = () => posted.slice(asked).find((p) => p.msg?.type === 'file-sets' && p.msg.atOpen !== true);
  const recount = () => posted.slice(recountAt).find((p) => p.msg?.type === 'file-due' && p.msg.seq === 2);
  for (let i = 0; i < 4000 && !(checklist() && recount()); i++) await new Promise((res) => realTimeout(res, 5));
  const end = posted.length;
  for (let i = 0; i < 4000 && !posted.slice(end).some((p) => p.msg?.type === 'hand-edits' && p.msg.done === true); i++) await new Promise((res) => realTimeout(res, 5));
  const holds = (p?: { msg: any }) => !!p && (p.msg.present as string[]).includes(ADDED) && p.msg.present.length === SETS + 1;
  ok(reply('component-result', from) !== undefined && midRead >= 5 && midRead < PAGES && olderRead() !== undefined && !olderRead()!.msg.present.includes(ADDED),
    `open/write-setup: the build ran while the read after open was ${midRead} of ${PAGES} pages in, and that read did not see the set it added (${olderRead() ? `${olderRead()!.msg.present.length} present` : 'no read after open'})`);
  ok(holds(checklist()),
    `open/write-shared: the checklist's request after the write reads the file anew, not the read begun before it (${checklist() ? `${checklist()!.msg.present.length} present, the added set ${checklist()!.msg.present.includes(ADDED) ? 'in' : 'missing'}` : 'no answer'})`);
  ok(holds(recount()),
    `open/write-cache: the badge's recount after the older read ends counts the set the write added; that read's answer is not kept (${recount() ? `${recount()!.msg.present.length} present, the added set ${recount()!.msg.present.includes(ADDED) ? 'in' : 'missing'}` : 'no answer'})`);
  pages[0].children.pop();
}

/* ── the Update check and apply (#3177) ────────────────────────────────────────────────────────────── */

// #3177, the Update half of #3170: the panel's Update check (`update-check-request`) and its apply (`update-sets`, under
// the check's hash), over every set the stand-in holds, as after a theme change. Each runs on the stand-in with its pages
// unloaded, as on a fresh open. The stand-in's sets have no variables to bind, so the apply refuses each set at its
// preflight and writes no member: it measures the reads, which are this issue, not the writes (#3170 part 2).
//   · `update/check-no-walk`, `update/apply-no-walk`: no search of the whole file, in one turn, during either.
//   · `update/search-yields`: no turn searches more than one page.
//   · `update/one-read`: one read per run. The check searches each page once per criterion it reads (3: components and
//     sets, the furniture by its tag, the usage panels by theirs), never once per set. So does the apply, and it reads
//     a page once more after it draws the canvas furniture of the set on it (`rereadAfter`), never more.
//   · `update/answers`: the check answers for every set, and the apply under its hash is not refused whole.
// MEASURED, NOT ASSERTED: whole-file searches, the most pages searched in one turn, the longest stall and each run's time.
console.log('\n  the Update check and apply (#3177)');
const UPDATE_READS = 3;
const update = async (label: string, msg: unknown, answer: string): Promise<{ msg: any; searches: number; worst: number; most: number; least: number; lag: number; ms: number } | null> => {
  for (const p of pages) p.loaded = false;
  allCalled = false; loads = 0; inTurn = 0; worstTurn = 0; docSearches = 0; worstSearch = 0; searchesOf.clear();
  const from = posted.length;
  let stall = 0;
  let on = true;
  const tick = (): void => { const at = Date.now(); realTimeout(() => { stall = Math.max(stall, Date.now() - at - 1); if (on) tick(); }, 1); };
  tick();
  const at = Date.now();
  send(msg);
  for (let i = 0; i < 24000 && !reply(answer, from); i++) await new Promise((res) => realTimeout(res, 5));
  const ms = Date.now() - at;
  on = false;
  const got = reply(answer, from);
  const counts = pages.map((p) => searchesOf.get(p.id) ?? 0);
  const out = got ? { msg: got.msg, searches: docSearches, worst: worstSearch, most: Math.max(...counts), least: Math.min(...counts), lag: stall, ms } : null;
  console.log(`    ${label}: ${out ? `${out.searches} whole-file searches, most pages searched in one turn ${out.worst}, each page searched ${out.least}–${out.most} times, longest stall ${out.lag} ms, ${out.ms} ms in all` : `no ${answer}`}`);
  return out;
};
{
  const check = await update('check', { type: 'update-check-request', defs: setIds, input: stored }, 'update-check');
  const apply = check ? await update('apply', { type: 'update-sets', defs: setIds, previewHash: check.msg.previewHash, handEdits: 'keep', input: stored }, 'component-update-result') : null;
  ok(!!check && check.searches === 0, `update/check-no-walk: the Update check over ${SETS} sets searches no whole file in one turn (${check ? `${check.searches} whole-file searches` : 'no answer'})`);
  ok(!!apply && apply.searches === 0, `update/apply-no-walk: the apply under the check's hash searches no whole file in one turn (${apply ? `${apply.searches} whole-file searches` : 'no answer'})`);
  ok(!!check && !!apply && check.worst <= 1 && apply.worst <= 1, `update/search-yields: no turn of the check or the apply searches more than one page (worst ${check?.worst ?? '—'} and ${apply?.worst ?? '—'})`);
  ok(!!check && !!apply && check.least === UPDATE_READS && check.most === UPDATE_READS && apply.least === UPDATE_READS && apply.most <= 2 * UPDATE_READS,
    `update/one-read: each run reads the file once, every page searched ${UPDATE_READS} times, never once per set; the apply reads a page again only once after a write to the set on it (check ${check ? `${check.least}–${check.most}` : '—'}, apply ${apply ? `${apply.least}–${apply.most}` : '—'})`);
  // MEASURED: each answer whole, digested, so a run before and after #3177 can be compared answer for answer.
  const digest = (m: unknown): string => { let h = 2166136261; for (const ch of JSON.stringify(m)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h.toString(16); };
  console.log(`    answers: check ${check ? digest(check.msg) : '—'} (previewHash ${check?.msg?.previewHash ?? '—'}), apply ${apply ? digest(apply.msg) : '—'}`);
  const sets = (check?.msg?.sets ?? []) as unknown[];
  const named = sets.length + ((check?.msg?.missing ?? []) as unknown[]).length + ((check?.msg?.refused ?? []) as unknown[]).length;
  ok(!!check && !check.msg.error && named === SETS && !!apply && !/changed since the check/.test(String(apply.msg.summary ?? '')),
    `update/answers: the check answers for all ${SETS} sets and the apply runs under its hash (${check ? `${sets.length} read, ${named} named` : 'no check'}; ${apply ? String(apply.msg.headline ?? '') : 'no apply'})`);
}

/* ── Capture baseline and Adopt (#3189) ────────────────────────────────────────────────────────────── */

// #3189, the same shape as #3177 on the two other commands of the update's host: `capture-baseline` and `adopt-members`,
// over every def (no `def`, as an agent sends them), each on the stand-in with its pages unloaded. Both are agent
// commands, so they are driven through `ACTIONS` with an agent's sink, as the agent link does.
//   · `capture/no-walk`, `adopt/no-walk`: no search of the whole file, in one turn, and no turn searches more than one page.
//   · `capture/one-read`, `adopt/one-read`: one read per run, every page searched once per criterion it reads (3), never
//     once per set. Both write plugin data only, which adds no node, so neither reads a page again.
//   · `capture/answers`, `adopt/answers`: the result is the one a whole-file search gives (literals below): every stand-in
//     set read in the targets' order, its one hand-made member skipped and none recorded (capture) or claimed by Adopt
//     (adopt), every other def missing, Adopt never offered for a single-component def, nothing refused.
//   · `capture/progress`, `adopt/progress`: the run posts its readings for the status strip (`run-progress`, its own
//     `run`): `check` before the read, then `work` for each def in the targets' order, `done` counting those before it,
//     then `finish` with every def done.
// MEASURED, NOT ASSERTED: the longest stall, each run's time, and each answer digested for a before/after comparison.
console.log('\n  Capture baseline and Adopt (#3189)');
{
  const all = componentDefs.filter((d) => d.figmaProperties).map((d) => d.id);
  const singles = componentDefs.filter((d) => d.figmaProperties?.emitAsComponents).map((d) => d.id);
  const digest = (m: unknown): string => { let h = 2166136261; for (const ch of JSON.stringify(m)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h.toString(16); };
  type Sink = { post(m: any): void; data(d: Record<string, unknown>): void };
  const agentRun = async (label: string, go: (sink: Sink) => Promise<void>) => {
    for (const p of pages) p.loaded = false;
    allCalled = false; loads = 0; inTurn = 0; worstTurn = 0; docSearches = 0; worstSearch = 0; searchesOf.clear();
    const from = posted.length;
    const verdicts: any[] = [];
    const data: any[] = [];
    let stall = 0;
    let on = true;
    const tick = (): void => { const at = Date.now(); realTimeout(() => { stall = Math.max(stall, Date.now() - at - 1); if (on) tick(); }, 1); };
    tick();
    const at = Date.now();
    // The agent's command starts a turn of its own, as a message from the panel does.
    inTurn = 0; searchedInTurn = 0; turnNo++;
    await go({ post: (m) => verdicts.push(m), data: (d) => data.push(d) });
    on = false;
    const counts = pages.map((p) => searchesOf.get(p.id) ?? 0);
    const readings = posted.slice(from).map((p) => p.msg).filter((m) => m?.type === 'run-progress' && m.run === label);
    const out = { verdict: verdicts.find((m) => m?.type === 'component-update-result'), update: data.find((d) => d.update)?.update, searches: docSearches, worst: worstSearch, most: Math.max(...counts), least: Math.min(...counts), readings };
    console.log(`    ${label}: ${out.searches} whole-file searches, most pages searched in one turn ${out.worst}, each page searched ${out.least}–${out.most} times, ${readings.length} readings, longest stall ${stall} ms, ${Date.now() - at} ms in all; answer ${digest(out.update ?? null)}, verdict ${digest(out.verdict ?? null)}`);
    return out;
  };
  // An answer first: a run that failed searched nothing, and must not pass for one that searched no whole file.
  const readsOnce = (r: { update: unknown; searches: number; worst: number }) => !!r.update && r.searches === 0 && r.worst <= 1;
  const oneRead = (r: { most: number; least: number }) => r.least === UPDATE_READS && r.most === UPDATE_READS;
  const progressed = (r: { readings: any[] }) => {
    const [first, ...rest] = r.readings;
    const work = rest.slice(0, -1);
    const last = rest[rest.length - 1];
    return !!first && first.phase === 'check' && first.done === 0 && first.total === all.length
      && work.length === all.length && work.every((w, i) => w.phase === 'work' && w.item === all[i] && w.done === i && w.total === all.length)
      && !!last && last.phase === 'finish' && last.done === all.length && last.total === all.length;
  };
  const sameIds = (a: unknown, b: readonly string[]) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
  const handMade = (s: any) => s.skipped.length === 1 && s.skipped[0].member === 'Variant=Default';

  const cap = await agentRun('capture', (sink) => ACTIONS.captureBaseline(undefined, sink as never));
  ok(readsOnce(cap), `capture/no-walk: Capture baseline over every def searches no whole file in one turn, one page a turn at most (${cap.searches} whole-file searches, worst ${cap.worst})`);
  ok(oneRead(cap), `capture/one-read: Capture baseline reads the file once, every page searched ${UPDATE_READS} times, never once per set (${cap.least}–${cap.most})`);
  const cu = cap.update;
  ok(!!cu && sameIds(cu.sets?.map((s: any) => s.set), setIds) && cu.sets.every((s: any) => s.recorded === 0 && handMade(s))
    && sameIds(cu.missing, all.filter((id) => !setIds.includes(id))) && cu.refused?.length === 0,
    `capture/answers: every one of the ${SETS} stand-in sets read in order, its hand-made member skipped, the other ${all.length - SETS} defs missing, none refused (${cu ? `${cu.sets?.length} sets, ${cu.missing?.length} missing, ${cu.refused?.length} refused` : 'no answer'})`);
  ok(progressed(cap), `capture/progress: Capture baseline posts check, a reading per def (${all.length}) in order, and finish (${cap.readings.map((m: any) => m.phase[0]).join('').replace(/w+/, (w: string) => `w×${w.length}`) || 'none'})`);

  const ad = await agentRun('adopt', (sink) => ACTIONS.adoptMembers(undefined, sink as never));
  ok(readsOnce(ad), `adopt/no-walk: Adopt over every def searches no whole file in one turn, one page a turn at most (${ad.searches} whole-file searches, worst ${ad.worst})`);
  ok(oneRead(ad), `adopt/one-read: Adopt reads the file once, every page searched ${UPDATE_READS} times, never once per set (${ad.least}–${ad.most})`);
  const au = ad.update;
  ok(!!au && sameIds(au.sets?.map((s: any) => s.set), setIds) && au.sets.every((s: any) => s.adopted === 0 && handMade(s))
    && sameIds(au.missing, all.filter((id) => !setIds.includes(id) && !singles.includes(id))) && sameIds(au.notOffered, singles) && au.refused?.length === 0,
    `adopt/answers: every one of the ${SETS} stand-in sets read in order, its hand-made member skipped, the single-component defs not offered, the rest missing, none refused (${au ? `${au.sets?.length} sets, ${au.missing?.length} missing, ${au.notOffered?.length ?? 0} not offered, ${au.refused?.length} refused` : 'no answer'})`);
  ok(progressed(ad), `adopt/progress: Adopt posts check, a reading per def (${all.length}) in order, and finish (${ad.readings.map((m: any) => m.phase[0]).join('').replace(/w+/, (w: string) => `w×${w.length}`) || 'none'})`);

  // #3209 on these two commands (#3210 review): on Figma the host's methods, and its root's, are own data properties
  // neither writable nor configurable, so a `Proxy` over either whose `get` trap hands back a bound copy throws on the
  // first read. Capture baseline and Adopt are driven again through `ACTIONS`, over a `figma` and a root copied from the
  // stand-in with every method fixed (`fixHostMethods`). Each must give the answer the plain host gave: the action catches
  // a throw and posts `✗ record failed` / `✗ adopt failed` with no answer, which fails the arm by name.
  // Mutation: `withRoot` put back as a `new Proxy(host, …v.bind(t))` → `capture/fixed`, `adopt/fixed`.
  const plain = g.figma;
  // A copy with every own descriptor, not a spread: the root's `children` is a non-enumerable getter, as a page list is.
  const copy = <T extends object>(o: T): T => Object.defineProperties({}, Object.getOwnPropertyDescriptors(o)) as T;
  const fixed = fixHostMethods(Object.assign(copy(shim), { root: fixHostMethods(copy(root)) }));
  g.figma = fixed;
  const premise = Object.getOwnPropertyDescriptor(fixed, 'getLocalTextStylesAsync');
  ok(premise?.configurable === false && premise?.writable === false && Object.getOwnPropertyDescriptor(fixed.root, 'findAllWithCriteria')?.configurable === false,
    'fixed/premise: the host carries getLocalTextStylesAsync, and its root findAllWithCriteria, fixed, as Figma does');
  const capF = await agentRun('capture', (sink) => ACTIONS.captureBaseline(undefined, sink as never));
  ok(!!capF.update && digest(capF.update) === digest(cu), `capture/fixed: Capture baseline on a host whose methods are fixed gives the plain host's answer (${capF.update ? `answer ${digest(capF.update)} vs ${digest(cu)}` : `${capF.verdict?.headline}: ${String(capF.verdict?.summary).slice(0, 300)}`})`);
  const adF = await agentRun('adopt', (sink) => ACTIONS.adoptMembers(undefined, sink as never));
  ok(!!adF.update && digest(adF.update) === digest(au), `adopt/fixed: Adopt on a host whose methods are fixed gives the plain host's answer (${adF.update ? `answer ${digest(adF.update)} vs ${digest(au)}` : `${adF.verdict?.headline}: ${String(adF.verdict?.summary).slice(0, 300)}`})`);
  g.figma = plain;
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
