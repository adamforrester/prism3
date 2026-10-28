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
 * definition. Figma's page model is kept where it decides the result: a page has to be loaded before its children are
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
 * `open/ready`; `loadPagesYielding` as one `loadAllPagesAsync` → `open/yields`; `ledgerSets` dropping `partial` →
 * `open/partial`; the read after open posted untagged → `open/full`; `styleGuideCatalog` back on `loadAllPagesAsync`
 * → `open/yields`.
 *
 * Also held: `open/race`, the checklist's own request asked while the read after open is still going, is answered
 * without `atOpen`, so the panel keeps it over the read after open (`host-session.ts`, `awaitingRead`).
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs } from '@prism3/engine/components/index';
import { materializerFor } from './src/brand-def';
import { entryFor, LEDGER_KEY, LEDGER_V } from './src/as-built-ledger';

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
  const e = entryFor(mat(componentDefs.find((d) => d.id === id)!));
  return [id, i < DUE ? { ...e, def: 'moved000moved000' } : e];
}));
pluginData.set(LEDGER_KEY, JSON.stringify({ v: LEDGER_V, sets: ledger }));
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'large-file stand-in',
  type: 'DOCUMENT',
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
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

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
