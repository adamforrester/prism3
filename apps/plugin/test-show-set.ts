/**
 * "Show the set in Figma" (#3119, owner decision 2026-11-18 A): the lookup, and the main thread's two halves, through the
 * REAL `main.ts`.
 *
 *   npx tsx apps/plugin/test-show-set.ts
 *
 * A bad Build set result offers "Show the set in Figma", only while the file holds the set. The main thread says whether it
 * does after every Build set (`set-in-file`), and `show-set` makes the set's page current and fits the view to it, or, when
 * the set has gone, answers `set-in-file` false so the offer goes. `test:chrome` section 3119 proves the drawer offers it
 * and posts `show-set`; this proves the lookup and what the main thread does with the post. It installs the shared
 * component host (`component-shim.ts`) as the global `figma`, with two pages of its own, imports `main.ts` and talks to it
 * through `figma.ui.onmessage`, as `test-theme-pref.ts` does.
 *
 * INDEPENDENCE (docs/34): the pages, nodes and expected calls are literals typed here; the actual side is what `main.ts`
 * called on the host and posted.
 *
 * Mutations this fails by name (measured 2026-11-18): `show-set`'s case dropped from `main.ts` and `buildComponents` without
 * `thenTellSet`, together → 4 of 15: `#3119 show-set makes the set's page current and fits the view to it (page Cover,
 * viewed 0)`, `#3119 show-set for a set the file lacks answers set-in-file false ([])`, `#3119 a Build set is followed by
 * set-in-file for its set, after its verdict (["component-result"], [])` and `#3119 show-set once the write ends shows the
 * set (page Cover, viewed 0)`. M1, `if (guard.held()) return;` dropped from
 * `showSet` → 1 of 15: `#3119 show-set while a write holds the file moves nothing and posts nothing (held apply-theme, page Badge,
 * viewed 1, [])`.
 */
import { makeShim } from './component-shim';
import { pageOf, setNodeOf, showSetNode } from './src/show-set';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('show the set in Figma: the lookup (show-set.ts)');
// The lookup, by `readPresent`'s rule: a set or component named the id or a former id; an icon def's `<id>/…` component.
{
  const a = { n: 'a' }, b = { n: 'b' }, c = { n: 'c' }, d = { n: 'd' };
  const found = { nodes: [a, b, c, d], kinds: ['FRAME', 'COMPONENT_SET', 'COMPONENT', 'COMPONENT_SET'], names: ['badge', 'badge', 'icon/search', 'old-tag'] };
  ok(setNodeOf(found, 'badge', false) === b, '#3119 setNodeOf finds the set named its id, never a frame of that name');
  ok(setNodeOf(found, 'icon', true) === c, '#3119 setNodeOf finds an icon def\'s first component (`<id>/…`)');
  ok(setNodeOf(found, 'icon', false) === null, '#3119 setNodeOf reads `<id>/…` only for a def drawn as components');
  ok(setNodeOf(found, 'tag', false, ['old-tag']) === d, '#3119 setNodeOf finds a set under a former id (#3770)');
  ok(setNodeOf(found, 'chip', false) === null, '#3119 setNodeOf finds nothing for a set the file lacks');
  const page = { type: 'PAGE', name: 'P' };
  const set = { type: 'COMPONENT_SET', parent: { type: 'SECTION', parent: page } };
  ok(pageOf(set) === page && pageOf({ type: 'COMPONENT_SET', parent: null }) === null, '#3119 pageOf reads up to the page, and is null off the document');
}
{
  const calls: string[] = [];
  const page = { type: 'PAGE', name: 'P' };
  const set = { type: 'COMPONENT_SET', parent: page };
  const host = { setCurrentPageAsync: async (p: unknown) => { calls.push(`page:${(p as { name: string }).name}`); }, scrollAndZoomIntoView: (ns: readonly unknown[]) => { calls.push(`view:${ns.length === 1 && ns[0] === set}`); } };
  ok(await showSetNode(host, set) && JSON.stringify(calls) === '["page:P","view:true"]', `#3119 showSetNode makes the page current, then fits the view to the set (${JSON.stringify(calls)})`);
  calls.length = 0;
  ok(!(await showSetNode(host, { type: 'COMPONENT_SET', parent: null })) && calls.length === 0, '#3119 showSetNode does nothing for a node on no page');
}

console.log('show the set in Figma: the main thread (main.ts)');
const posted: any[] = [];
const viewed: unknown[][] = [];
const shim = makeShim() as Record<string, any>;
const mkPage = (name: string, kids: { type: string; name: string }[]) => {
  const page: Record<string, unknown> = { type: 'PAGE', name, loadAsync: async () => undefined };
  const nodes = kids.map((k) => ({ ...k, parent: page }));
  page.children = nodes;
  page.findAllWithCriteria = (c: { types?: string[] }) => nodes.filter((n) => !c.types || c.types.includes(n.type));
  return { page, nodes };
};
const p1 = mkPage('Cover', []);
const p2 = mkPage('Badge', [{ type: 'COMPONENT_SET', name: 'badge' }]);
let current: unknown = p1.page;
// The shared host, copied so this file's pages, page switch and viewport stand in for its own (its fields are fixed).
const fig: Record<string, any> = {
  ...shim,
  root: {
    ...(shim.root as Record<string, unknown>), name: 'show-set test file', type: 'DOCUMENT', children: [p1.page, p2.page],
    getSharedPluginData: () => '', setSharedPluginData: () => undefined, getPluginData: () => '', setPluginData: () => undefined,
  },
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  listAvailableFontsAsync: async () => [],
  setCurrentPageAsync: async (p: unknown) => { current = p; },
  viewport: { scrollAndZoomIntoView: (ns: unknown[]) => { viewed.push(ns); } },
};
const g = globalThis as Record<string, unknown>;
g.figma = fig;
g.__html__ = '';
g.PRISM3_BUILD = '2026-11-18T00:00:00Z tree-test0000';

const main = await import('./src/main');

const send = (m: unknown): void => (fig.ui as { onmessage: (m: unknown) => void }).onmessage(m);
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 60));
const inFile = () => posted.filter((m) => m?.type === 'set-in-file');

// show-set: the set's page made current, the view fitted to the set.
send({ type: 'show-set', def: 'badge' });
await settle();
ok(current === p2.page && viewed.length === 1 && viewed[0].length === 1 && viewed[0][0] === p2.nodes[0],
  `#3119 show-set makes the set's page current and fits the view to it (page ${(current as { name?: string })?.name}, viewed ${viewed.length})`);
ok(inFile().length === 0, `#3119 show-set posts nothing when it shows the set (${JSON.stringify(inFile())})`);

// show-set for a set the file lacks: nothing moves, and the panel is told, so the offer goes.
current = p1.page; viewed.length = 0; posted.length = 0;
send({ type: 'show-set', def: 'tag' });
await settle();
ok(current === p1.page && viewed.length === 0, `#3119 show-set for a set the file lacks moves nothing (page ${(current as { name?: string })?.name}, viewed ${viewed.length})`);
ok(JSON.stringify(inFile()) === JSON.stringify([{ type: 'set-in-file', def: 'tag', inFile: false }]), `#3119 show-set for a set the file lacks answers set-in-file false (${JSON.stringify(inFile())})`);

// A Build set is followed by set-in-file for its set, after its verdict. A def the catalog lacks fails at once, so its
// build writes nothing here; the set it names is not in the file.
posted.length = 0;
await (main as { ACTIONS: { buildComponents: (def: string | undefined, sink: unknown, o?: unknown) => Promise<void> } }).ACTIONS
  .buildComponents('no-such-def', { post: (m: unknown) => { posted.push(m); }, data: () => undefined });
await settle();
const order = posted.map((m) => m?.type).filter((t) => t === 'component-result' || t === 'set-in-file');
ok(JSON.stringify(order) === '["component-result","set-in-file"]' && JSON.stringify(inFile()) === JSON.stringify([{ type: 'set-in-file', def: 'no-such-def', inFile: false }]),
  `#3119 a Build set is followed by set-in-file for its set, after its verdict (${JSON.stringify(order)}, ${JSON.stringify(inFile())})`);

// show-set while a write holds the file: refused quietly, so nothing moves and nothing is posted (the write's own page
// moves are the write's). The hold is a real Theme run through `ACTIONS`, parked on its first variables read (a read the
// set search never makes); the control is a second write refused `busy` behind it. After the hold, the same post shows
// the set, so the arm measures the guard, not a show that never moves.
{
  let releaseHold: () => void = () => undefined;
  const vars = fig.variables;
  fig.variables = { ...vars, getLocalVariableCollectionsAsync: () => new Promise((r) => { releaseHold = () => r([]); }) };
  const brand = { id: 'example', name: 'Example', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } };
  const actions = (main as unknown as { ACTIONS: Record<string, (...a: unknown[]) => Promise<void>> }).ACTIONS;
  const hold = actions.applyTheme(brand, undefined, { post: () => undefined, data: () => undefined });
  await settle();
  const second: { type?: string; code?: string; held?: string }[] = [];
  await actions.fileSetup({ post: (m: { type?: string }) => { second.push(m); }, data: () => undefined });
  current = p1.page; viewed.length = 0; posted.length = 0;
  send({ type: 'show-set', def: 'badge' });
  await settle();
  ok(second.length === 1 && second[0].code === 'busy' && second[0].held === 'apply-theme' && current === p1.page && viewed.length === 0 && inFile().length === 0,
    `#3119 show-set while a write holds the file moves nothing and posts nothing (held ${second[0]?.held}, page ${(current as { name?: string })?.name}, viewed ${viewed.length}, ${JSON.stringify(inFile())})`);
  releaseHold(); fig.variables = vars;
  await hold; await settle();
  current = p1.page; viewed.length = 0;
  send({ type: 'show-set', def: 'badge' });
  await settle();
  ok(current === p2.page && viewed.length === 1, `#3119 show-set once the write ends shows the set (page ${(current as { name?: string })?.name}, viewed ${viewed.length})`);
}

console.log(failed ? `❌ ${failed} FAILED — ${executed} assertions executed` : `✅ ALL PASS — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
