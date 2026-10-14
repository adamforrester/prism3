/**
 * FILE-SETUP test (#1554) — drives the page-scaffolding and page-aware placement against in-memory shims,
 * so the first page-creation code in the repo is verified with no live Figma.
 *
 *   npx tsx apps/plugin/test-file-setup.ts
 *
 * Four things are checked, and each is independent of its subject in the `docs/34` sense:
 *   1. `scaffoldSkeleton` lays the taxonomy spine in order on a fresh file (Cover, native dividers,
 *      section headers, the Foundations placeholders, File Components) — the ORDER is asserted against a
 *      literal spine written from the owner's taxonomy, not read back off the config.
 *   2. It is IDEMPOTENT and NON-DESTRUCTIVE — a re-run creates nothing new, and a component page the build
 *      inserted between placeholders is not reordered by a later scaffold.
 *   3. `resolveComponentPage` inserts each `↳ <family>` page in its correct section slot; in the alphabetical
 *      Components section, at its place by name (3b, #2568), where `pagesOutOfOrder` and `reorderPages` (the
 *      update's dry run and apply) are checked too: every orders' pages converge, a designer page never moves.
 *      Subcomponents is alphabetical as well (3c, Q265 B), each section within itself, no page crossing between.
 *   4. `assertCoverage` reads the REAL `componentDefs` registry (the oracle) and finds every id mapped;
 *      a synthetic unmapped id is reported BY NAME (the arm that fails if a def is added and not placed).
 *   5. `applyComponentPlan`'s `targetPage` option routes a built set onto the target page, leaving
 *      `currentPage` untouched — the executor half of the page-aware build.
 *   6. Every page file-setup CREATES carries a solid #FFFFFF canvas (#1565, owner-directed), dividers get
 *      none, and a re-run does not repaint a page a designer has recolored — the #FFFFFF is written on
 *      creation only, the same non-destructive posture as the page list itself. The expected paint is
 *      written literally in the assertion, not read off `file-setup.ts`, so it fails if the constant drifts.
 */
import { scaffoldSkeleton, resolveComponentPage, pagesOutOfOrder, reorderPages } from './src/file-setup';
import type { PagesApi, PageLike } from './src/file-setup';
import { TAXONOMY, NEST_PREFIX, assertCoverage, EXCLUDED_DEFS } from './src/file-taxonomy';
import { applyComponentPlan } from './src/write-components';
import type { CompPageTarget, CompNode } from './src/write-components';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { fieldLabel } from '@prism3/engine/components/field-label';
import { componentDefs } from '@prism3/engine/components/index';
import { makeShim } from './component-shim';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};

// A page carries a solid #FFFFFF canvas (#1565). The expected paint is written LITERALLY here — the
// { r:1, g:1, b:1 } target and the SOLID type — not read back off `file-setup.ts`'s constant, so the
// arm is independent of its subject: change the constant's color and this predicate goes false.
const isSolidWhite = (p: PageLike): boolean => {
  const bg = (p.backgrounds ?? []) as ReadonlyArray<{ type?: string; color?: { r: number; g: number; b: number } }>;
  const paint = bg[0];
  return !!paint && paint.type === 'SOLID' && paint.color?.r === 1 && paint.color?.g === 1 && paint.color?.b === 1;
};

// ── The page shim ────────────────────────────────────────────────────────────────────────────────
// Models `figma.root`'s page list. `insertChild` is REMOVE-THEN-SPLICE (the contract `file-setup.ts`
// documents and Figma's reposition primitive follows); `createPage`/`createPageDivider` append at the end.
interface ShimPage extends PageLike { _kids: unknown[]; }
const makePagesShim = (): { api: PagesApi; children: ShimPage[]; names: () => string[] } => {
  const children: ShimPage[] = [];
  const mk = (divider: boolean): ShimPage => ({
    name: divider ? '---' : '',
    isPageDivider: divider,
    // Unset until `ensureNamed` writes it — dividers stay unset (they never pass through `ensureNamed`),
    // which is exactly what the divider arm below asserts. The real `PageNode` ships a gray default; the
    // shim ships none so the test can tell "file-setup wrote a fill" from "a fill was already there".
    backgrounds: undefined as readonly unknown[] | undefined,
    _kids: [],
    appendChild(c: unknown) { this._kids.push(c); },
    findOne(pred: (n: unknown) => boolean) { return this._kids.find(pred) ?? null; },
  });
  const api: PagesApi = {
    root: {
      get children() { return children; },
      insertChild(index: number, child: PageLike) {
        const i = children.indexOf(child as ShimPage);
        if (i >= 0) children.splice(i, 1);
        children.splice(Math.max(0, Math.min(index, children.length)), 0, child as ShimPage);
      },
      appendChild(child: PageLike) {
        const i = children.indexOf(child as ShimPage);
        if (i >= 0) children.splice(i, 1);
        children.push(child as ShimPage);
      },
    },
    createPage() { const p = mk(false); children.push(p); return p; },
    createPageDivider() { const p = mk(true); children.push(p); return p; },
    async setCurrentPageAsync() { /* view only */ },
    async loadAllPagesAsync() { /* nothing to load in the shim */ },
  };
  // Render the page list as names, dividers shown as `---`, for order assertions.
  const names = (): string[] => children.map((p) => (p.isPageDivider ? '---' : p.name));
  return { api, children, names };
};

// ── 1. Fresh scaffold lays the spine in order ────────────────────────────────────────────────────
console.log('1. scaffoldSkeleton on a fresh file');
{
  const { api, children, names } = makePagesShim();
  const res = await scaffoldSkeleton(api, TAXONOMY);
  const EXPECTED = [
    'Cover',
    '---', 'Foundations', `${NEST_PREFIX}Primitive tokens`, `${NEST_PREFIX}Semantic tokens`, `${NEST_PREFIX}Grids & layouts`,
    '---', 'Components',
    '---', 'Subcomponents',
    '---', 'Sandbox', `${NEST_PREFIX}File Components`,
  ];
  ok(JSON.stringify(names()) === JSON.stringify(EXPECTED), `spine matches taxonomy order (got ${JSON.stringify(names())})`);
  ok(res.fileComponentsPage !== null && res.fileComponentsPage.name === `${NEST_PREFIX}File Components`, 'File Components page returned for the asset build');
  ok(names().filter((n) => n === '---').length === 4, 'exactly 4 native dividers, one before each section');
  ok(!names().includes(`${NEST_PREFIX}Icons & assets`) && !names().includes(`${NEST_PREFIX}Buttons`), 'no def-bearing leaf pre-created (those are on-demand)');

  // #1565 — every page file-setup creates carries a solid #FFFFFF canvas (Cover, headers, the Foundations
  // placeholders, File Components). Dividers have no canvas and must stay unfilled — the arm that fails if
  // the white fill is ever applied to a divider (which would tint the page-list separator).
  const namedPages = children.filter((p) => !p.isPageDivider);
  ok(namedPages.length > 0 && namedPages.every(isSolidWhite), `every scaffolded page has a solid #FFFFFF canvas (${namedPages.length} pages)`);
  ok(children.filter((p) => p.isPageDivider).every((p) => (p.backgrounds ?? []).length === 0), 'divider pages get no canvas fill');
}

// ── 2. Idempotent + non-destructive ──────────────────────────────────────────────────────────────
console.log('2. idempotency + non-destructive re-run');
{
  const { api, children, names } = makePagesShim();
  await scaffoldSkeleton(api, TAXONOMY);
  const first = names();

  // #1565 — a designer recolors a page. A re-run must NOT repaint it white: the fill is written on
  // creation only, so this black survives every later scaffold. This is the arm that fails if the white
  // is ever moved out of `ensureNamed`'s create branch onto every reconcile.
  const cover = children.find((p) => p.name === TAXONOMY.cover) as (ShimPage | undefined);
  ok(cover !== undefined && isSolidWhite(cover), 'the Cover page was created white');
  if (cover) cover.backgrounds = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  const res2 = await scaffoldSkeleton(api, TAXONOMY);
  ok(JSON.stringify(names()) === JSON.stringify(first), 're-run does not change the page list');
  ok(res2.created.length === 0, 're-run creates no new pages');
  ok(cover !== undefined && !isSolidWhite(cover), 're-run does not repaint a designer-recolored page (non-destructive)');

  // Build `icon` → inserts Icons & assets between Semantic tokens and Grids & layouts.
  await resolveComponentPage(api, 'icon', TAXONOMY);
  const withIcon = names();
  const si = withIcon.indexOf(`${NEST_PREFIX}Semantic tokens`);
  const ii = withIcon.indexOf(`${NEST_PREFIX}Icons & assets`);
  const gi = withIcon.indexOf(`${NEST_PREFIX}Grids & layouts`);
  ok(si < ii && ii < gi, `Icons & assets sits between Semantic tokens and Grids & layouts (${si} < ${ii} < ${gi})`);

  // A later scaffold must not move the on-demand Icons & assets page.
  await scaffoldSkeleton(api, TAXONOMY);
  ok(JSON.stringify(names()) === JSON.stringify(withIcon), 'a later scaffold does not reorder the built component page');
}

// ── 3. resolveComponentPage positions each family page ───────────────────────────────────────────
console.log('3. resolveComponentPage positions leaves correctly');
{
  const { api, names } = makePagesShim();
  await scaffoldSkeleton(api, TAXONOMY);
  await resolveComponentPage(api, 'button', TAXONOMY);
  const n = names();
  const ci = n.indexOf('Components');
  const bi = n.indexOf(`${NEST_PREFIX}Buttons`);
  // The divider that precedes Subcomponents is the first `---` after Components.
  const nextDivider = n.indexOf('---', ci + 1);
  ok(ci < bi && bi < nextDivider, `Buttons sits after the Components header and before the next divider (${ci} < ${bi} < ${nextDivider})`);

  // Idempotent: building the same family again returns the same page, no duplicate.
  const again = await resolveComponentPage(api, 'button', TAXONOMY);
  ok(n.filter((x) => x === `${NEST_PREFIX}Buttons`).length === 1 && again?.name === `${NEST_PREFIX}Buttons`, 'a second build of the same family does not duplicate its page');

  // #1670 — the owner placed the spinner under Subcomponents (2026-09-26), beside Focus Ring / Field Label /
  // Field Message. The section is named LITERALLY here, not read off the config, so moving the leaf to
  // another section fails this arm by name.
  await resolveComponentPage(api, 'spinner', TAXONOMY);
  const s = names();
  const subi = s.indexOf('Subcomponents');
  const spi = s.indexOf(`${NEST_PREFIX}Spinner`);
  const afterSub = s.indexOf('---', subi + 1);
  ok(subi >= 0 && subi < spi && spi < afterSub, `#1670 Spinner sits in the Subcomponents section, after its header and before the next divider (${subi} < ${spi} < ${afterSub})`);

  // An unmapped id resolves to null (caller falls back to currentPage).
  const none = await resolveComponentPage(api, 'not-a-real-def', TAXONOMY);
  ok(none === null, 'an unmapped def id resolves to null');
}

// ── 3b. Component pages in alphabetical order (#2568, owner decision Q260 A) ───────────────────────
// The expected orders are LITERALS, sorted by hand from the visible names, never read off the taxonomy or the sort.
console.log('3b. component pages: alphabetical on insert, reordered by the update, designer pages left alone');
{
  const { api, children, names } = makePagesShim();
  await scaffoldSkeleton(api, TAXONOMY);
  const span = (): string[] => { const n = names(); const ci = n.indexOf('Components'); return n.slice(ci + 1, n.indexOf('---', ci + 1)); };
  // Built out of taxonomy order, as the live file was: Tabs, then Divider, then Badge, then Buttons, then Icon button.
  for (const id of ['tabs', 'divider', 'badge', 'button', 'icon-button']) await resolveComponentPage(api, id, TAXONOMY);
  ok(JSON.stringify(span()) === JSON.stringify(['↳ Badge', '↳ Buttons', '↳ Divider', '↳ Icon button', '↳ Tabs']),
    `order/new page: each new component page lands at its alphabetical place (${JSON.stringify(span())})`);
  ok(pagesOutOfOrder(children).length === 0, 'order/new page: a file built only by the build reads in order');

  // A DESIGNER'S PAGE in the section, and the component pages shuffled by hand around it.
  const notes = api.createPage(); notes.name = 'Notes';
  const at = (name: string) => children.findIndex((p) => p.name === name);
  api.root.insertChild(at('↳ Divider'), notes);
  api.root.insertChild(at('↳ Badge'), children[at('↳ Tabs')]);   // Tabs to the front
  // Now: Tabs, Badge, Buttons, Notes, Divider, Icon button. A new page still lands by name, Notes untouched.
  const notesAt = at('Notes');
  await resolveComponentPage(api, 'checkbox-row', TAXONOMY);
  ok(JSON.stringify(span()) === JSON.stringify(['↳ Tabs', '↳ Badge', '↳ Buttons', '↳ Checkbox', 'Notes', '↳ Divider', '↳ Icon button']),
    `order/new page among others: Checkbox goes after Buttons, the last page that sorts before it, and the build moves no existing page (${JSON.stringify(span())})`);
  ok(at('Notes') === notesAt + 1 && at('Notes') - at('↳ Checkbox') === 1, 'order/new page among others: the designer page only shifted by the one inserted before it');

  // THE DRY RUN'S LIST: Tabs, the one page dropped at the front, and no other; the designer page never.
  const listed = pagesOutOfOrder(children);
  ok(JSON.stringify(listed) === JSON.stringify(['↳ Tabs']),
    `order/dry run: lists the out-of-order component page and no other (${JSON.stringify(listed)})`);

  // THE APPLY: the designer page is never handed to `insertChild`, keeps its slot, and the section converges.
  const handed: string[] = [];
  const insert = api.root.insertChild.bind(api.root);
  const before = names();
  const done = reorderPages({ root: { get children() { return children; }, insertChild: (i, p) => { handed.push(p.name); insert(i, p); } } });
  ok(JSON.stringify(span()) === JSON.stringify(['↳ Badge', '↳ Buttons', '↳ Checkbox', 'Notes', '↳ Divider', '↳ Icon button', '↳ Tabs']),
    `order/apply: component pages alphabetical around the designer page (${JSON.stringify(span())})`);
  const near = (n: string[], x: string) => [n[n.indexOf(x) - 1], n[n.indexOf(x) + 1]];
  ok(!handed.includes('Notes') && JSON.stringify(near(names(), 'Notes')) === JSON.stringify(near(before, 'Notes')),
    `order/designer page: never moved, same neighbors (${JSON.stringify(near(before, 'Notes'))} → ${JSON.stringify(near(names(), 'Notes'))}; moved ${JSON.stringify(handed)})`);
  ok(JSON.stringify(done) === JSON.stringify(listed), `order/apply: reports what the dry run listed (${JSON.stringify(done)})`);
  const outside = (n: string[]) => n.filter((_, i) => i < n.indexOf('Components') || i > n.indexOf('---', n.indexOf('Components')));
  ok(JSON.stringify(outside(names())) === JSON.stringify(outside(before)), 'order/apply: no page outside the component pages moved, none created or deleted');
  const settled = names();
  ok(pagesOutOfOrder(children).length === 0 && reorderPages(api).length === 0 && JSON.stringify(names()) === JSON.stringify(settled), 'order/converges: the next check lists nothing and a second apply moves nothing');

  // EVERY PERMUTATION of four component pages around two designer pages converges and keeps the designer slots.
  const four = ['↳ Veil', '↳ Select', '↳ radio', '↳ Switch'];
  const perms = (xs: string[]): string[][] => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
  let bad = 0;
  for (const order of perms(four)) {
    const w = makePagesShim();
    const tax = { ...TAXONOMY, sections: [{ header: 'Components', alphabetical: true, leaves: four.map((n) => ({ page: n.slice(2), defs: ['x'] })) }] };
    for (const n of ['Components', order[0], 'A designer page', order[1], order[2], 'Another', order[3]]) w.api.createPage().name = n;
    w.api.createPageDivider();
    const handedHere: string[] = [];
    const ins = w.api.root.insertChild.bind(w.api.root);
    const listedHere = pagesOutOfOrder(w.children, tax);
    reorderPages({ root: { get children() { return w.children; }, insertChild: (i, p) => { handedHere.push(p.name); ins(i, p); } } }, tax);
    const got = w.names();
    const own = got.filter((n) => four.includes(n));
    const fine = JSON.stringify(own) === JSON.stringify(['↳ radio', '↳ Select', '↳ Switch', '↳ Veil'])
      && got[0] === 'Components' && got[got.length - 1] === '---' && got.indexOf('A designer page') < got.indexOf('Another')
      && !handedHere.some((n) => !four.includes(n)) && handedHere.length === listedHere.length && pagesOutOfOrder(w.children, tax).length === 0;
    if (!fine) bad++;
  }
  ok(bad === 0, `order/permutations: all 24 orders converge to radio, Select, Switch, Veil (case-insensitive), moving only the listed pages and never a designer page (${bad} wrong)`);
}

// ── 3c. Subcomponents in alphabetical order too (#2568, owner decision Q265 B) ──────────────────────
// Each section is ordered within itself; no page crosses between them. Expected orders are hand-sorted LITERALS.
console.log('3c. subcomponent pages: alphabetical within their own section, no page crossing between sections');
{
  const spanOf = (n: string[], header: string): string[] => { const h = n.indexOf(header); return n.slice(h + 1, n.indexOf('---', h + 1)); };
  // (a) Built out of taxonomy order: each new Subcomponents page lands at its alphabetical place.
  {
    const { api, children, names } = makePagesShim();
    await scaffoldSkeleton(api, TAXONOMY);
    // #2457 — the flush icon button joins the section (owner Q283.14 A), between Field Message and Focus Ring.
    for (const id of ['spinner', 'field-message', 'flush-icon-button', 'image-placeholder', 'focus-ring', 'field-label']) await resolveComponentPage(api, id, TAXONOMY);
    ok(JSON.stringify(spanOf(names(), 'Subcomponents')) === JSON.stringify(['↳ Field Label', '↳ Field Message', '↳ Flush Icon Button', '↳ Focus Ring', '↳ Image Placeholder', '↳ Spinner']),
      `order/sub new page: each new Subcomponents page lands at its alphabetical place (${JSON.stringify(spanOf(names(), 'Subcomponents'))})`);
    ok(pagesOutOfOrder(children).length === 0, 'order/sub new page: a file built only by the build reads in order');
  }
  // (b) A designer page inside Subcomponents keeps its neighbors while the section is put in order around it.
  {
    const { api, children, names } = makePagesShim();
    await scaffoldSkeleton(api, TAXONOMY);
    for (const id of ['field-label', 'focus-ring', 'image-placeholder', 'spinner']) await resolveComponentPage(api, id, TAXONOMY);
    const at = (name: string) => children.findIndex((p) => p.name === name);
    const memo = api.createPage(); memo.name = 'Sub notes';
    api.root.insertChild(at('↳ Image Placeholder'), memo);
    api.root.insertChild(at('↳ Field Label'), children[at('↳ Spinner')]);   // Spinner to the front
    // Now: Spinner, Field Label, Focus Ring, Sub notes, Image Placeholder.
    const before = names();
    const listed = pagesOutOfOrder(children);
    const handed: string[] = [];
    const insert = api.root.insertChild.bind(api.root);
    reorderPages({ root: { get children() { return children; }, insertChild: (i, p) => { handed.push(p.name); insert(i, p); } } });
    const near = (n: string[], x: string) => [n[n.indexOf(x) - 1], n[n.indexOf(x) + 1]];
    ok(JSON.stringify(listed) === JSON.stringify(['↳ Spinner'])
      && JSON.stringify(spanOf(names(), 'Subcomponents')) === JSON.stringify(['↳ Field Label', '↳ Focus Ring', 'Sub notes', '↳ Image Placeholder', '↳ Spinner'])
      && !handed.includes('Sub notes') && JSON.stringify(near(names(), 'Sub notes')) === JSON.stringify(near(before, 'Sub notes')),
      `order/sub designer page: Subcomponents put in order, the designer page never moved and keeps its neighbors (listed ${JSON.stringify(listed)}; ${JSON.stringify(spanOf(names(), 'Subcomponents'))}; moved ${JSON.stringify(handed)})`);
  }
  // (c) Both sections shuffled, and one section's page dropped by hand into the other: each section is put in order
  // within itself, and every page stays in the section it was found in.
  {
    const { api, children, names } = makePagesShim();
    await scaffoldSkeleton(api, TAXONOMY);
    for (const id of ['badge', 'tabs', 'divider', 'spinner', 'focus-ring', 'field-label']) await resolveComponentPage(api, id, TAXONOMY);
    const at = (name: string) => children.findIndex((p) => p.name === name);
    const moveAfter = (x: string, anchor: string) => { const p = children[at(x)]; const rest = children.filter((c) => c !== p); api.root.insertChild(rest.indexOf(children[at(anchor)]) + 1, p); };
    moveAfter('↳ Tabs', 'Components');           // Components: Tabs, Badge, Divider
    moveAfter('↳ Spinner', 'Subcomponents');     // Subcomponents: Spinner, Field Label, Focus Ring
    moveAfter('↳ Badge', '↳ Focus Ring');        // Badge dropped into Subcomponents, last
    moveAfter('↳ Field Label', '↳ Divider');     // Field Label dropped into Components, last
    const compBefore = spanOf(names(), 'Components'), subBefore = spanOf(names(), 'Subcomponents');
    ok(JSON.stringify(compBefore) === JSON.stringify(['↳ Tabs', '↳ Divider', '↳ Field Label']) && JSON.stringify(subBefore) === JSON.stringify(['↳ Spinner', '↳ Focus Ring', '↳ Badge']),
      `order/no crossing: the shuffled file is the one this arm means (${JSON.stringify(compBefore)}; ${JSON.stringify(subBefore)})`);
    reorderPages(api);
    const comp = spanOf(names(), 'Components'), sub = spanOf(names(), 'Subcomponents');
    // A stray page counts as a designer's in the section it sits in, so it is never moved, let alone out of it.
    ok(JSON.stringify(comp) === JSON.stringify(['↳ Divider', '↳ Tabs', '↳ Field Label']) && JSON.stringify(sub) === JSON.stringify(['↳ Focus Ring', '↳ Spinner', '↳ Badge']),
      `order/no crossing: each section in order within itself, no page moved between Components and Subcomponents (Components ${JSON.stringify(compBefore)} → ${JSON.stringify(comp)}; Subcomponents ${JSON.stringify(subBefore)} → ${JSON.stringify(sub)})`);
  }
}

// ── 4. Taxonomy coverage of the real registry ────────────────────────────────────────────────────
console.log('4. taxonomy coverage of componentDefs');
{
  const ids = componentDefs.map((d) => d.id);
  const problems = assertCoverage(ids);
  ok(problems.length === 0, `every registered def is mapped or excluded (problems: ${JSON.stringify(problems)})`);
  ok(EXCLUDED_DEFS.length === 0, 'no def is currently excluded (all 23 map to a page)');

  // BY-NAME arm: a synthetic registry with an unmapped id is reported, naming that id — the failure a
  // real def-addition would trigger. Independent of the config: the oracle is the id list.
  const ghost = assertCoverage([...ids, 'ghost-widget']);
  ok(ghost.some((p) => p.includes("'ghost-widget'")), 'an unmapped registered id is reported by name');
  // And a stale mapping (an id in the config that the registry does not have) is reported too.
  const short = assertCoverage(ids.filter((id) => id !== 'veil'));
  ok(short.some((p) => p.includes("'veil'")), 'a mapping whose def left the registry is reported by name');
}

// ── 5. targetPage routes placement off currentPage ───────────────────────────────────────────────
console.log('5. applyComponentPlan targetPage routing');
{
  const plans = figmaAnatomySet(fieldLabel, { swapTarget: 'icon/FPO-default-icon' });
  const currentKids: unknown[] = [];
  const shim = makeShim({ page: { children: currentKids as never[] } }) as never;
  const targetKids: CompNode[] = [];
  let targetAppends = 0;
  // #1561 — a real page CARRIES AN ID (the type requires it now); `combineAsVariants(fresh, target)` reads
  // it on the live host. The pre-#1561 version of this test passed an id-less `{ appendChild, findOne }`
  // adapter — exactly the shape `main.ts` shipped — and passed, because the shim did not model the host's
  // id read. That is the #1554 regression this arm now guards.
  const targetPage: CompPageTarget = {
    id: 'PAGE:target',
    appendChild(child: CompNode) { targetAppends++; targetKids.push(child); },
    findOne() { return null; },
  };
  const r = await applyComponentPlan(plans, shim, { targetPage, chunk: 1000 });
  ok(r.set !== null, `the set assembled (${r.set})`);
  ok(targetAppends > 0, `built roots were appended to the target page (${targetAppends} appends)`);
  ok(currentKids.length === 0, 'currentPage received nothing — placement routed to the target page');

  // #1561 BY-NAME MUTATION — an id-less target (the #1554 adapter) must fail the way the live host fails.
  // `combineAsVariants` reads `parent.id`; the shim now models that, so a variant-set build onto an id-less
  // target throws "Expected node id to be a string, got undefined" here instead of only in Figma.
  const idlessKids: unknown[] = [];
  const idlessShim = makeShim({ page: { children: idlessKids as never[] } }) as never;
  const idlessTarget = { appendChild() {}, findOne() { return null; } } as unknown as CompPageTarget;
  let hostErr = '';
  try { await applyComponentPlan(plans, idlessShim, { targetPage: idlessTarget, chunk: 1000 }); }
  catch (e) { hostErr = (e as Error).message; }
  ok(/combineAsVariants: Expected node id to be a string/.test(hostErr),
    `an id-less target page fails combineAsVariants by name (#1561) — got: ${hostErr || '(no throw)'}`);
}

console.log(failures === 0 ? '\nfile-setup: all assertions pass' : `\nfile-setup: ${failures} FAILED`);
if (failures > 0) process.exit(1);
