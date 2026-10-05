/**
 * BUILD STYLE GUIDES — the main thread's side of the page (UI redesign S11.2), through the REAL `main.ts`.
 *
 *   npx tsx apps/plugin/test-style-guide-page.ts
 *
 * `main.ts` calls `figma.showUI` at module scope, so, as `test-agent-link.ts` does, this installs a host model as the
 * global `figma` and imports it: what runs is the plugin's own message switch, its own run guard and its own
 * `styleGuide` handler. The file is small and typed here: three color collections, one opacity variable (a later
 * phase) and one text style, and the cell sets and token pages each switched on or off per arm.
 *
 * INDEPENDENCE (docs/34). Every expected value is a literal written here: the titles, the pages, the table each
 * variable is drawn in, the order of the messages. Nothing is computed with `catalogFor`, `planStyleGuide` or
 * `isSetUp`, so a change to any of them that moves what the page is told fails here by name.
 *
 * Arms, by name:
 *   · catalog/request: the page's request is answered with one `style-guide-catalog`, its tables and items literal
 *   · catalog/setup: Set up file has run only with both cell sets AND both token pages (owner decision P8)
 *     (mutation: `isSetUp` stops reading the pages → catalog/setup's "sets, no pages" arm fails)
 *   · catalog/error: a read that throws is answered with an empty catalog and the host's words, never silence
 *   · events/panel: a panel run posts its table list, then each table's move, all before its verdict
 *     (mutation: `onPlan` not wired in `main.ts` → events/panel fails)
 *   · events/agent: a run for any other sink posts no table list and no table move, so the agent link's sink never
 *     takes one for a verdict
 *   · cancel: `style-guide-cancel` mid-run stops after the table being drawn, and the verdict says how far it got
 *     (mutation: the `style-guide-cancel` case does not set the stop → cancel fails)
 *   · cancel/idle: a cancel with nothing running does not stop the next run
 */
let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);

/* ── the host model ─────────────────────────────────────────────────────────────────────────────────── */
const PRIM = '↳ Primitive tokens';
const SEM = '↳ Semantic tokens';
const pageNode = (name: string) => ({ name, type: 'PAGE', children: [] as unknown[], appendChild: () => undefined, findAllWithCriteria: () => [] });
const SETS = [{ name: '_style-guide-swatches', type: 'COMPONENT_SET', children: [] }, { name: '_style-guide-text-cells', type: 'COMPONENT_SET', children: [] }];
const file = { sets: true, pages: [] as string[], throwOnRead: false };
const root = {
  name: 'style guide page test file',
  type: 'DOCUMENT',
  get children() { return file.pages.map(pageNode); },
  getSharedPluginData: () => '',
  setSharedPluginData: () => undefined,
  findAllWithCriteria: () => (file.sets ? SETS : []),
};
const cols = [
  { id: 'C:ramp', name: 'ramp', modes: [{ modeId: 'r:0', name: 'Value' }], defaultModeId: 'r:0' },
  { id: 'C:alt', name: 'alt', modes: [{ modeId: 'a:0', name: 'Light' }, { modeId: 'a:1', name: 'Dark' }], defaultModeId: 'a:0' },
  { id: 'C:more', name: 'more', modes: [{ modeId: 'm:0', name: 'Value' }], defaultModeId: 'm:0' },
];
const vars = [
  { id: 'V:1', name: 'ramp/100', variableCollectionId: 'C:ramp', resolvedType: 'COLOR', description: '', valuesByMode: { 'r:0': { r: 1, g: 0, b: 0, a: 1 } } },
  { id: 'V:2', name: 'alt/text/primary', variableCollectionId: 'C:alt', resolvedType: 'COLOR', description: '', valuesByMode: { 'a:0': { type: 'VARIABLE_ALIAS', id: 'V:1' }, 'a:1': { r: 0, g: 0, b: 1, a: 1 } } },
  { id: 'V:3', name: 'more/fade/50', variableCollectionId: 'C:more', resolvedType: 'COLOR', description: '', valuesByMode: { 'm:0': { r: 0, g: 0, b: 0, a: 0.5 } } },
  { id: 'V:4', name: 'more/opacity/50', variableCollectionId: 'C:more', resolvedType: 'FLOAT', description: '', valuesByMode: { 'm:0': 50 }, scopes: ['OPACITY'] },
];
const styles = [{ id: 'S:1', name: 'body/md', description: '', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 }, paragraphSpacing: 0, textDecoration: 'NONE', boundVariables: {} }];

const posted: any[] = [];
const host: Record<string, unknown> = {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  root,
  currentPage: { name: 'Page 1', children: [] },
  loadAllPagesAsync: async () => { if (file.throwOnRead) throw new Error('the file could not be read'); },
  loadFontAsync: async () => undefined,
  createFrame: () => ({}),
  variables: {
    getLocalVariableCollectionsAsync: async () => cols,
    getLocalVariablesAsync: async () => vars,
    setBoundVariableForPaint: (p: unknown) => p,
  },
  getLocalTextStylesAsync: async () => styles,
  getLocalEffectStylesAsync: async () => [], getLocalPaintStylesAsync: async () => [], getLocalGridStylesAsync: async () => [],
  listAvailableFontsAsync: async () => [],
};
const g = globalThis as Record<string, unknown>;
g.figma = host;
g.__html__ = '';
g.PRISM3_BUILD = '2026-10-05T00:00:00Z tree-test0000';

// `realYield` is a 0ms `setTimeout`: held here, so a run stays between two tables until `release()`.
const realSetTimeout = globalThis.setTimeout;
const held: (() => void)[] = [];
g.setTimeout = ((fn: () => void, ms?: number) => { if (!ms) { held.push(fn); return 0; } return realSetTimeout(fn, ms); }) as unknown as typeof setTimeout;
const main = await import('./src/main');
const settle = () => new Promise<void>((r) => setImmediate(r));
const toMain = async (m: unknown): Promise<void> => {
  (host.ui as { onmessage: (m: unknown) => void }).onmessage(m);
  for (let i = 0; i < 40; i++) await settle();
};
/** Let one held yield go, and the run reach its next one. */
const step = async (): Promise<void> => { for (const fn of held.splice(0)) fn(); for (let j = 0; j < 40; j++) await settle(); };
/** Let every held yield go until the run ends (it settles first, so a run just started reaches its first yield). */
const release = async (): Promise<void> => {
  for (let i = 0; i < 60; i++) { for (let j = 0; j < 40; j++) await settle(); if (!held.length) return; for (const fn of held.splice(0)) fn(); }
};
const ofType = (t: string): any[] => posted.filter((m) => m.type === t);

/* ── catalog ────────────────────────────────────────────────────────────────────────────────────────── */
section('catalog — what the page is told before a run');
{
  file.sets = true; file.pages = ['Cover', PRIM, SEM];
  posted.length = 0;
  await toMain({ type: 'style-guide-catalog-request' });
  const got = ofType('style-guide-catalog');
  const c = got[0]?.catalog;
  ok(got.length === 1 && posted.length === 1 && !('error' in got[0]), `catalog/request: one style-guide-catalog answers the request, and nothing else is posted (${posted.map((m) => m.type).join(', ')})`);
  // Literals: each collection's one color is the only group in it, so its table is titled by the collection: ramp's
  // step and more's translucent step primitive, alt's aliased role semantic. The opacity variable no phase draws; the
  // text style.
  ok(JSON.stringify(c?.tables) === JSON.stringify([
    { key: 'color|C:ramp|ramp', title: 'Ramp', kind: 'color', page: 'Primitive tokens', rows: 1 },
    { key: 'color|C:alt|alt/text', title: 'Alt', kind: 'color', page: 'Semantic tokens', rows: 1 },
    { key: 'color|C:more|more/fade', title: 'More', kind: 'color', page: 'Primitive tokens', rows: 1 },
    { key: 'typography|text-styles|body', title: 'Text styles', kind: 'text', page: 'Semantic tokens', rows: 1 },
  ]), `catalog/request: the tables, in draw order, with their kinds and pages (${JSON.stringify(c?.tables?.map((t: any) => t.title))})`);
  ok(JSON.stringify(c?.collections) === JSON.stringify([
    { id: 'C:ramp', name: 'ramp', modes: ['Value'], items: [{ name: 'ramp/100', table: 0, value: '#FF0000' }] },
    { id: 'C:alt', name: 'alt', modes: ['Light', 'Dark'], items: [{ name: 'alt/text/primary', table: 1, value: '#FF0000' }] },
    { id: 'C:more', name: 'more', modes: ['Value'], items: [{ name: 'more/fade/50', table: 2, value: '#000000 · 50%' }, { name: 'more/opacity/50', table: -1, value: '50' }] },
    { id: 'text-styles', name: 'Text styles', modes: [], textStyles: true, items: [{ name: 'body/md', table: 3, value: '' }] },
  ]), `catalog/request: each collection's variables with their table (-1 for the later-phase opacity) and default-mode value, then the text styles (${JSON.stringify(c?.collections?.map((x: any) => x.items))})`);
  ok(c?.setUp === true && JSON.stringify(c?.notes) === JSON.stringify(['No saved brand in this file, so the contrast column reads "—" — Apply theme saves one', 'Not drawn until a later phase: 1 opacity variable']),
    `catalog/request: set up, and the planner's notes for an unfiltered run (${JSON.stringify(c?.notes)})`);

  const setUpWith = async (sets: boolean, pages: string[]): Promise<unknown> => {
    file.sets = sets; file.pages = pages;
    posted.length = 0;
    await toMain({ type: 'style-guide-catalog-request' });
    return ofType('style-guide-catalog')[0]?.catalog?.setUp;
  };
  const none = await setUpWith(false, ['Cover']);
  const setsOnly = await setUpWith(true, ['Cover']);
  const onePage = await setUpWith(true, ['Cover', PRIM]);
  const pagesOnly = await setUpWith(false, ['Cover', PRIM, SEM]);
  const all = await setUpWith(true, ['Cover', SEM, PRIM]);
  ok(none === false && setsOnly === false && onePage === false && pagesOnly === false && all === true,
    `catalog/setup: set up only with both cell sets and both token pages — none ${none}, sets, no pages ${setsOnly}, one page ${onePage}, pages, no sets ${pagesOnly}, both ${all}`);

  file.throwOnRead = true;
  posted.length = 0;
  await toMain({ type: 'style-guide-catalog-request' });
  file.throwOnRead = false;
  const err = ofType('style-guide-catalog')[0];
  ok(err?.error === 'the file could not be read' && JSON.stringify(err.catalog) === JSON.stringify({ setUp: false, collections: [], tables: [], notes: [] }),
    `catalog/error: a read that throws is answered, empty, with the host's words (${JSON.stringify(err)})`);
}

/* ── the panel's run, table by table ─────────────────────────────────────────────────────────────────── */
section('events — a panel run says which table it is on, and how each went');
{
  // Both cell sets, no token pages: every table is a named skip, so each one's move is `failed` with the reason.
  file.sets = true; file.pages = ['Cover'];
  posted.length = 0;
  await toMain({ type: 'style-guide', options: {} });
  await release();
  const seq = posted.filter((m) => m.type === 'style-guide-tables' || m.type === 'style-guide-table' || m.type === 'style-guide-result')
    .map((m) => (m.type === 'style-guide-tables' ? `tables:${m.tables.map((t: any) => `${t.title}@${t.page}`).join('|')}` : m.type === 'style-guide-table' ? `${m.index}:${m.status}${m.reason ? `(${m.reason})` : ''}` : 'result'));
  const noPrim = 'this file has no ↳ Primitive tokens page, and Set up file adds it';
  const noSem = 'this file has no ↳ Semantic tokens page, and Set up file adds it';
  ok(JSON.stringify(seq) === JSON.stringify([
    'tables:Ramp@Primitive tokens|Alt@Semantic tokens|More@Primitive tokens|Text styles@Semantic tokens',
    '0:drawing', `0:failed(${noPrim})`, '1:drawing', `1:failed(${noSem})`, '2:drawing', `2:failed(${noPrim})`, '3:drawing', `3:failed(${noSem})`,
    'result',
  ]), `events/panel: the table list, then each table drawing and then failed with its reason, all before the one verdict (${JSON.stringify(seq)})`);

  // Any other sink is not the panel's: no list, no moves; the verdict as before.
  const sunk: any[] = [];
  const run = main.ACTIONS.styleGuide({}, { post: (m: unknown) => { sunk.push(m); }, data: () => undefined });
  await release();
  await run;
  ok(!sunk.some((m) => m.type === 'style-guide-tables' || m.type === 'style-guide-table') && sunk.filter((m) => m.type === 'style-guide-result').length === 1,
    `events/agent: a run for another sink posts no table list and no table move (${[...new Set(sunk.map((m) => m.type))].join(', ')})`);
}

/* ── cancel ──────────────────────────────────────────────────────────────────────────────────────────── */
section('cancel — stop after the table being drawn (owner decision P7)');
{
  file.sets = true; file.pages = ['Cover'];
  posted.length = 0;
  await toMain({ type: 'style-guide', options: {} });
  // The run holds at the yield after each table: once after the first, and after one step, after the second.
  await step();
  const before = ofType('style-guide-table').map((m) => `${m.index}:${m.status}`);
  await toMain({ type: 'style-guide-cancel' });
  await release();
  const after = ofType('style-guide-table').map((m) => `${m.index}:${m.status}`);
  const res = ofType('style-guide-result');
  ok(JSON.stringify(after) === JSON.stringify(['0:drawing', '0:failed', '1:drawing', '1:failed']) && res.length === 1
    && JSON.stringify(res[0].stopped) === JSON.stringify({ done: 2, total: 4 }) && /Stopped after table 2 of 4\. The tables already drawn stay/.test(res[0].summary),
    `cancel: sent while the run is between tables 2 and 3, it stops there: two tables reached, the verdict says "Stopped after table 2 of 4" (before ${JSON.stringify(before)}; after ${JSON.stringify(after)}; ${JSON.stringify(res[0]?.stopped)})`);

  // Nothing running: the cancel is dropped, and the next run draws every table.
  posted.length = 0;
  await toMain({ type: 'style-guide-cancel' });
  await toMain({ type: 'style-guide', options: {} });
  await release();
  const all = ofType('style-guide-table').filter((m) => m.status !== 'drawing').length;
  const r2 = ofType('style-guide-result')[0];
  ok(all === 4 && r2 && !('stopped' in r2), `cancel/idle: a cancel with nothing running does not stop the next run (${all} of 4 tables reached; stopped ${JSON.stringify(r2?.stopped)})`);
}

g.setTimeout = realSetTimeout;
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
