/**
 * ONE READ OF THE FILE PER UPDATE RUN (#3177, `src/run-read.ts`).
 *
 * The Update check and apply searched the whole file several times per set, each search in one turn of the main thread.
 * A run now reads the file once, a page per turn, and every lookup it makes is answered from that read by a root that
 * stands in for the file's. The large-file stand-in (`test-open-large-file.ts`, `update/*`) measures the reads through
 * the real `main.ts`, but its sets are refused before anything is written. This file holds what it cannot reach:
 *
 *   THE READ (`readRun`, against a paged stand-in with the whole-file search as the oracle):
 *     run/same          each lookup the run answers is the document-wide search's answer: the same nodes, in the same
 *                       order, for the components and sets together and apart, the furniture by its tag and the
 *                       usage panels by theirs.
 *     run/no-walk       the read and every lookup it covers search no whole file.
 *     run/yields        no turn searches more than one page.
 *     run/live          a node the run renames reads under its new name; one it removes is left out.
 *     run/reread        a node a write adds on a page is found once that page is read again (`rereadAfter`), and only
 *                       that page is searched for it. Mutation: `rereadAfter` returning at once → `run/reread`.
 *     run/order, run/new-page, run/pass-through   pages reordered answer in their new order; a page made by the run
 *                       is searched when first asked for; a lookup the read does not cover is the file's own.
 *
 *   THE APPLY, ONE OBJECT AS HOST AND EXECUTOR as `figma` is in the plugin, on a set the real executor built, a plan
 *   change applied in place, against a twin file read by document-wide search:
 *     apply/same        the dry run, its hash and the apply's result are the twin's, field for field.
 *     apply/no-walk     no search of the whole file, the executor's own lookups included. Mutation: the executor
 *                       handed the file's root (`api = fileApi` in `applyUpdate`) → `apply/no-walk`.
 *     apply/reread      the page the set sits on is read again after its write and after its furniture is drawn, the
 *                       other page never. Mutations: the re-read after a set's write dropped → `apply/reread`; the
 *                       re-read after its furniture dropped → `apply/reread`.
 *
 * Expected values are literals or the twin's, never read from the module under test.
 * Run: `npx tsx apps/plugin/test-run-read.ts`
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { NS } from './src/persist-figma';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node } from './component-shim';
import { previewUpdate } from './src/update-plan';
import { applyUpdate, previewHashOf, type ApplyHost } from './src/update-apply';
import { readRun, rereadAfter, withRoot, type Criteria } from './src/run-read';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the read, against a paged stand-in ────────────────────────────────────────────────────────────── */

console.log('one read of the file per Update run (#3177)\n\n  the read');
type N = { id: string; type: string; name: string; parent?: N; children: N[]; removed?: boolean; tags: Record<string, string>;
  getSharedPluginData(ns: string, k: string): string; findAllWithCriteria?(c: Criteria): N[]; loadAsync?(): Promise<void> };
let seq = 0;
const node = (type: string, name: string, kids: N[] = [], tags: Record<string, string> = {}): N => {
  const n: N = { id: `n${++seq}`, type, name, children: kids, tags, getSharedPluginData: (ns, k) => n.tags[`${ns}:${k}`] ?? '' };
  for (const k of kids) k.parent = n;
  return n;
};
let turn = 0;
let pagesInTurn = new Set<string>();
let worst = 0;
let docSearches = 0;
const pageSearches = new Map<string, number>();
const breathe = async (): Promise<void> => { turn++; pagesInTurn = new Set(); };
/** Figma's search, by criteria: every node under `from` in tree order, of a type asked for, carrying every plugin-data
 *  key asked for. The oracle the run's answers are held to. */
const search = (from: readonly N[], c: Criteria): N[] => {
  const out: N[] = [];
  const walk = (n: N): void => {
    if (c.types.includes(n.type) && (!c.sharedPluginData || c.sharedPluginData.keys.every((k) => n.getSharedPluginData(c.sharedPluginData!.namespace, k) !== ''))) out.push(n);
    n.children.forEach(walk);
  };
  from.forEach(walk);
  return out;
};
const page = (name: string, kids: N[]): N => {
  const p = node('PAGE', name, kids);
  p.findAllWithCriteria = (c) => {
    pagesInTurn.add(p.id);
    worst = Math.max(worst, pagesInTurn.size);
    pageSearches.set(p.name, (pageSearches.get(p.name) ?? 0) + 1);
    return search(p.children, c);
  };
  p.loadAsync = async () => undefined;
  return p;
};
const FURN = { namespace: 'prism3', keys: ['furniture'] };
const PANEL = { namespace: 'prism3', keys: ['docPanel'] };
const READ: Criteria[] = [{ types: ['COMPONENT_SET', 'COMPONENT'] }, { types: ['INSTANCE'], sharedPluginData: FURN }, { types: ['FRAME'], sharedPluginData: PANEL }];
const set = (name: string) => node('COMPONENT_SET', name, [node('COMPONENT', 'size=sm'), node('COMPONENT', 'size=lg')]);
const label = (setId: string) => node('INSTANCE', 'label', [], { 'prism3:furniture': setId });
const s1 = set('button'), s2 = set('tag'), s3 = set('badge');
const pages = [
  page('Buttons', [s1, label(s1.id), node('FRAME', 'panel', [], { 'prism3:docPanel': s1.id }), node('COMPONENT', 'icon/plus'), node('INSTANCE', 'loose')]),
  page('---', []),
  page('Tags', [node('FRAME', 'wrap', [s2, node('COMPONENT', 'icon/x')]), label(s2.id), s3]),
];
const file = {
  get children() { return pages; },
  findAllWithCriteria: (c: Criteria) => { docSearches++; return search(pages, c); },
  findAll: (fn: (n: N) => boolean) => { docSearches++; const out: N[] = []; const w = (n: N) => { if (fn(n)) out.push(n); n.children.forEach(w); }; pages.forEach((p) => p.children.forEach(w)); return out; },
  getSharedPluginData: () => 'root-data',
};
const root = await readRun(file, READ, breathe);
const ids = (ns: readonly unknown[]) => (ns as N[]).map((n) => `${n.type}:${n.name}`).join(',');
const asked: Criteria[] = [{ types: ['COMPONENT_SET', 'COMPONENT'] }, { types: ['COMPONENT'] }, { types: ['COMPONENT_SET'] }, { types: ['INSTANCE'], sharedPluginData: FURN }, { types: ['FRAME'], sharedPluginData: PANEL }];
const sameAll = (): { good: boolean; seen: string } => {
  const was = docSearches;
  const pairs = asked.map((c) => [ids(root.findAllWithCriteria(c)), ids(search(pages, c))]);
  docSearches = was;
  return { good: pairs.every(([a, b]) => a === b), seen: pairs.map(([a, b]) => (a === b ? 'same' : `${a} ≠ ${b}`)).join('; ') };
};
{
  const searchedAtRead = docSearches;
  const s = sameAll();
  ok(s.good, `run/same: each lookup is the whole-file search's answer, in its order (${s.seen})`);
  ok(searchedAtRead === 0 && docSearches === 0, `run/no-walk: the read and the lookups it covers search no whole file (${docSearches} whole-file searches)`);
  ok(worst === 1 && [...pageSearches.values()].every((n) => n === READ.length), `run/yields: one page searched per turn, each page once per criterion (worst ${worst} pages in a turn; ${JSON.stringify(Object.fromEntries(pageSearches))})`);
  ok((root as unknown as { getSharedPluginData(): string }).getSharedPluginData() === 'root-data' && (root as unknown as { children: N[] }).children === pages, `run/root: every other member is the file's own`);
}
{
  s2.children[0].name = 'size=md';
  s3.children[1].removed = true;
  s3.children.splice(1, 1);
  const s = sameAll();
  ok(s.good && ids(root.findAllWithCriteria({ types: ['COMPONENT'] })).includes('size=md'), `run/live: a node renamed reads under its new name, one removed is left out (${s.seen})`);
}
{
  const added = node('COMPONENT', 'size=xl');
  added.parent = s2;
  s2.children.push(added);
  const before = ids(root.findAllWithCriteria({ types: ['COMPONENT'] })).includes('size=xl');
  pageSearches.clear(); worst = 0; pagesInTurn = new Set();
  await rereadAfter(root, [s2]);
  const s = sameAll();
  ok(!before && s.good && ids(root.findAllWithCriteria({ types: ['COMPONENT'] })).includes('size=xl') && JSON.stringify(Object.fromEntries(pageSearches)) === JSON.stringify({ Tags: 3 }) && worst === 1,
    `run/reread: a member a write added is found once its page is read again, and only that page is searched (before ${before}; ${s.seen}; ${JSON.stringify(Object.fromEntries(pageSearches))})`);
}
{
  pages.reverse();
  const s = sameAll();
  pages.reverse();
  ok(s.good, `run/order: pages reordered answer in their new order (${s.seen})`);
  const made = page('Badges', [set('chip')]);
  pages.push(made);
  const t = sameAll();
  pages.pop();
  ok(t.good && docSearches === 0, `run/new-page: a page made during the run is searched when first asked for (${t.seen})`);
  const other: Criteria = { types: ['TEXT'] };
  const was = docSearches;
  root.findAllWithCriteria(other);
  ok(docSearches === was + 1, `run/pass-through: a lookup the read does not cover is the file's own search (${docSearches - was})`);
}

/* ── the apply, one object as host and executor ────────────────────────────────────────────────────── */

console.log('\n  the apply');
const TAG = 'tag';
const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(componentDefs.find((x) => x.id === id)!, { swapTarget: SWAP_TARGET });
const planComps = (n: { swapTarget?: string; nestTarget?: string; nestOverrides?: readonly { type: string; value: string }[]; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
/** Each plan with `content`'s gap moved to `space/999`: every member is out of date, and updated in place. */
const moveGap = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.map((p) => {
  const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
  (q.root.children!.find((c) => c.name === 'content')!.bound as Record<string, string>).itemSpacing = 'space/999';
  return q;
});
/** A file holding one set the executor built, on the first of two pages, read by the whole-file search (`paged`
 *  false) or a page at a time (`paged` true). One object is the host and the executor's port, as `figma` is. */
/** A page a node can be moved onto, Figma's way: out of whichever page held it. */
const movable = (name: string, kids: N[] = []): N => {
  const p = page(name, kids) as N & { appendChild(c: N): void };
  p.appendChild = (c: N) => { const from = c.parent; if (from) { const i = from.children.indexOf(c); if (i >= 0) from.children.splice(i, 1); } p.children.push(c); c.parent = p; };
  return p;
};
const world = async (paged: boolean, more: N[] = []) => {
  const plans = plansOf(TAG);
  const comps: Node[] = [];
  const pg = { children: comps as Node[], type: 'PAGE', id: 'P:1', name: 'Tags' } as unknown as { children: Node[]; type: string; id: string; name: string; findAllWithCriteria?(c: Criteria): unknown[] };
  const api = makeShim({
    looseHost: 'wraps the root in a Proxy that substitutes findAllWithCriteria to count whole-file searches',
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0', 'space/999'])],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page: pg as never,
    liveRoot: true,
    identities: true,
    scaleConstrained: true,
  }) as Record<string, any>;
  const built = await applyComponentPlan(plans, api as never);
  if (built.misses.length) throw new Error(`premise: ${TAG} built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  // The file's search: its sets as the page holds them (live nodes), the shim's components, and tagged nodes by tag.
  const tree = (c: Criteria): unknown[] => {
    const out: unknown[] = [];
    const walk = (n: Node): void => {
      const tagged = !c.sharedPluginData || c.sharedPluginData.keys.every((k) => ((n.getSharedPluginData as ((a: string, b: string) => string) | undefined)?.(c.sharedPluginData!.namespace, k) ?? '') !== '');
      if (n.type !== 'COMPONENT' && c.types.includes(String(n.type)) && tagged) out.push(n);
      if (n.type !== 'INSTANCE') ((n.children as Node[] | undefined) ?? []).forEach(walk);
    };
    pg.children.forEach(walk);
    if (c.types.includes('COMPONENT') && !c.sharedPluginData) out.push(...(api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as unknown[]));
    return out;
  };
  let whole = 0;
  const searched = new Map<string, number>();
  const empty = { children: [] as Node[], type: 'PAGE', id: 'P:2', name: 'Notes', findAllWithCriteria: (_c: Criteria) => { searched.set('Notes', (searched.get('Notes') ?? 0) + 1); return []; } };
  if (paged) pg.findAllWithCriteria = (c) => { searched.set('Tags', (searched.get('Tags') ?? 0) + 1); return tree(c); };
  /** The file's pages, in their order: the set's, an empty one, then `more`. One list, so a page made or moved is in it. */
  const all: unknown[] = [pg, empty, ...more];
  // The set's page, as Figma's: its parent, so the run finds the page to read again, and the executor's target page.
  Object.assign(pg, { appendChild: (c: Node) => { pg.children.push(c); c.parent = pg as unknown as Node; }, findOne: (f: (n: unknown) => boolean) => pg.children.find(f) ?? null });
  for (const n of pg.children) n.parent = pg as unknown as Node;
  const fileRoot = new Proxy(api.root as object, {
    get(t, p) {
      if (p === 'children') return all;
      if (p === 'insertChild') return (i: number, c: N) => { const at = all.indexOf(c as never); if (at >= 0) all.splice(at, 1); all.splice(i, 0, c as never); };
      if (p === 'findAllWithCriteria') return (c: Criteria) => { whole++; return tree(c); };
      if (p === 'findAll') return (fn: (n: unknown) => boolean) => { whole++; return (api.root.findAll as (f: typeof fn) => unknown[])(fn); };
      const v = Reflect.get(t, p);
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  // A page made by the run (#2989's move to a page the file lacks): searched as any other, appended to the file.
  api.createPage = () => { const p = movable(''); all.push(p); return p; };
  api.createPageDivider = () => { const p = movable('---'); (p as { isPageDivider?: boolean }).isPageDivider = true; all.push(p); return p; };
  const host = withRoot(api, fileRoot) as unknown as ApplyHost;
  return { host, plans, whole: () => whole, searched, reset: () => { whole = 0; searched.clear(); } };
};
{
  const twin = await world(false);
  const w = await world(true);
  w.reset();
  const run = async (x: Awaited<ReturnType<typeof world>>) => {
    const targets = [{ def: TAG, plans: moveGap(x.plans) }];
    const pre = await previewUpdate(x.host, targets, breathe);
    const res = await applyUpdate(x.host, x.host as never, targets, previewHashOf(pre), { breathe, furnish: async () => undefined, today: '2026-10-30' });
    return { pre, res };
  };
  const a = await run(twin);
  const b = await run(w);
  const strip = (r: unknown) => JSON.stringify(r);
  ok(a.pre.sets[0]?.counts.update === 45 && strip(a.pre) === strip(b.pre) && previewHashOf(a.pre) === previewHashOf(b.pre),
    `apply/same: the dry run and its hash are the twin's (${a.pre.sets[0]?.counts.update} to update; hash ${previewHashOf(b.pre)} vs ${previewHashOf(a.pre)})`);
  ok(a.res.outcomes[0]?.updated.length === 45 && strip(a.res) === strip(b.res),
    `apply/same: the apply's result is the twin's, field for field (${b.res.outcomes[0]?.updated.length} updated in place; ${strip(a.res) === strip(b.res) ? 'same' : `${strip(b.res).slice(0, 200)} ≠ ${strip(a.res).slice(0, 200)}`})`);
  ok(w.whole() === 0, `apply/no-walk: the check and the apply, the executor's lookups included, search no whole file (${w.whole()} whole-file searches; the twin made ${twin.whole()})`);
  // The check reads each page once (3 criteria), the apply once more, then the set's page again after its write and
  // after its furniture: 3 + 3 + 3 + 3 = 12 on its page, 3 + 3 on the other.
  ok(JSON.stringify(Object.fromEntries(w.searched)) === JSON.stringify({ Tags: 12, Notes: 6 }),
    `apply/reread: the set's page is read again after its write and after its furniture, the other page never (${JSON.stringify(Object.fromEntries(w.searched))})`);
}

// A set on its former page (#2989) moves to the page the taxonomy names now, which the file lacks, so the run makes it.
// The run read both pages before the move; after it, every page is read again, or the moved set answers twice: once from
// its old page's read and once from the page made, and the furniture's lookup (`furnishUpdate`) skips a set it finds
// twice. `apply/moved`: the lookup after the move finds it once. Mutation: the re-read after the move dropped →
// `apply/moved`.
{
  const mkPage = (name: string, kids: N[] = [], divider = false): N => { const p = movable(name, kids); (p as { isPageDivider?: boolean }).isPageDivider = divider; return p; };
  // Built by Prism3: its member carries the stamp, so the move is due (`page-moves.ts`).
  const step = node('COMPONENT_SET', 'breadcrumb-item', [node('COMPONENT', 'state=rest', [], { [`${NS}:${STAMP_KEY}`]: '9.9.9|0123456789abcdef|1' })]);
  const more = [mkPage('Cover'), mkPage('---', [], true), mkPage('Components'), mkPage('---', [], true), mkPage('Subcomponents'), mkPage('↳ Breadcrumb Item', [step])];
  const w = await world(true, more);
  const targets = [{ def: TAG, plans: w.plans }];
  const pre = await previewUpdate(w.host, targets, breathe);
  const found: number[] = [];
  const res = await applyUpdate(w.host, w.host as never, targets, previewHashOf(pre), { breathe, today: '2026-10-30',
    furnish: async (_d, _s, file) => { found.push((file.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as N[]).filter((n) => n.name === 'breadcrumb-item').length); } });
  ok(JSON.stringify(res.relocated?.map((m) => m.to)) === JSON.stringify(['↳ Breadcrumbs']) && (w.host.root.children as unknown as N[]).some((p) => p.name === '↳ Breadcrumbs' && p.children.includes(step)) && JSON.stringify(found) === '[1]',
    `apply/moved: after the run moves a set to a page it made, the run's lookup finds it once (${JSON.stringify(res.relocated ?? res.refusedAll ?? null)}; found ${JSON.stringify(found)})`);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
