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
import { TAXONOMY, NEST_PREFIX, assertCoverage, assertPartPages, consumersOf, EXCLUDED_DEFS } from './src/file-taxonomy';
import { applyComponentPlan } from './src/write-components';
import type { CompPageTarget, CompNode } from './src/write-components';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { fieldLabel } from '@prism3/engine/components/field-label';
import { componentDefs } from '@prism3/engine/components/index';
import { emptiedLine, pageMovesDue, relocateSets } from './src/page-moves';
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
      && !handedHere.some((n) => !four.includes(n)) && new Set(handedHere).size === listedHere.length && pagesOutOfOrder(w.children, tax).length === 0;
    if (!fine) bad++;
  }
  ok(bad === 0, `order/permutations: all 24 orders converge to radio, Select, Switch, Veil (case-insensitive), moving only the listed pages and never a designer page (${bad} wrong)`);
}

// ── 3c. Subcomponents in alphabetical order too (#2568, owner decision Q265 B) ──────────────────────
// Each section is ordered within itself; no page crosses between them. Expected orders are hand-sorted LITERALS.
// #2427 — the Counter's own page under Components (owner Q283.14 A), alphabetical: after Checkbox, before Divider.
{
  const { api, children, names } = makePagesShim();
  await scaffoldSkeleton(api, TAXONOMY);
  for (const id of ['divider', 'counter', 'tabs', 'checkbox-row']) await resolveComponentPage(api, id, TAXONOMY);
  const n = names(); const ci = n.indexOf('Components');
  const span = n.slice(ci + 1, n.indexOf('---', ci + 1));
  ok(JSON.stringify(span) === JSON.stringify(['↳ Checkbox', '↳ Counter', '↳ Divider', '↳ Tabs']),
    `order/counter: the Counter page lands under Components between Checkbox and Divider (${JSON.stringify(span)})`);
  ok(pagesOutOfOrder(children).length === 0, 'order/counter: a file built only by the build reads in order');
}

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

// ── 3d. The real file (#2597): the update, file-setup and five builds move only Prism3's own pages ──────────────
// The page list of the file the owner ran the sequence on, by name and id, as a LITERAL fixture. A host shim that reads
// `insertChild`'s index the way the real list shows the host does (in the list before the page is taken out, so a
// forward move lands one slot early), and the earlier remove-then-splice reading too: the fix must hold under both.
// Every expected list below is written by hand, never read off the taxonomy or the sort.
console.log('3d. the #2597 file: update, file-setup and builds move only the component pages Prism3 owns');
{
  type Reading = 'host' | 'splice';
  interface FixturePage extends PageLike { id: string; _kids: unknown[] }
  // The order the file held before its first Update, as restored from its saved version ("Live replay results" on #2597).
  const COMPONENT_PAGES = ['↳ Buttons', '↳ Checkbox', '↳ Icon button', '↳ Radio', '↳ Select', '↳ Switch', '↳ Textarea', '↳ Text field', '↳ Tag', '↳ Tabs', '↳ Divider', '↳ Accordion', '↳ Badge', '↳ Veil'];
  const SUB_PAGES = ['↳ Field Message', '↳ Field Label', '↳ Focus Ring', '↳ Image Placeholder', '↳ Spinner'];
  // [name, id]; a divider is `---`. The pages Prism3 builds hold their sets (`_kids`), so a page recreated in place
  // of one would show up empty.
  const ORIGINAL: [string, string][] = [
    ['Cover', '1:667'], ['---', '1:669'], ['Foundations', '1:668'], ['↳ Primitive tokens', '1:670'], ['↳ Semantic tokens', '1:671'], ['↳ Icons & assets', '1:718'],
    ['---', '1:674'], ['Components', '1:673'], ...COMPONENT_PAGES.map((n, i): [string, string] => [n, `81:${100 + i}`]),
    ['---', '1:676'], ['Subcomponents', '1:675'], ...SUB_PAGES.map((n, i): [string, string] => [n, `24:${100 + i}`]),
    ['---', '1:678'], ['Sandbox', '1:677'], ['↳ Grids & layouts', '1:672'], ['↳ File Components', '1:679'], ['↳ Helpful Tools', '95:15832'],
  ];
  // The issue's reconstruction, Grids & layouts first under Foundations. The replay shows it was under Sandbox when
  // the sequence ran (the Diagnosis on #2597); both are replayed.
  const RECONSTRUCTED: [string, string][] = ORIGINAL.filter(([n]) => n !== '↳ Grids & layouts');
  RECONSTRUCTED.splice(RECONSTRUCTED.findIndex(([n]) => n === 'Foundations') + 1, 0, ['↳ Grids & layouts', '1:672']);
  const OWN_LEAVES = new Set([...COMPONENT_PAGES, ...SUB_PAGES]);
  const HEADERS = ['Cover', 'Foundations', 'Components', 'Subcomponents', 'Sandbox'];
  const FOUNDATIONS = ['↳ Primitive tokens', '↳ Semantic tokens', '↳ Icons & assets', '↳ Grids & layouts'];
  const SANDBOX = ['↳ File Components', '↳ Helpful Tools'];
  const DESIGNER = ['↳ Helpful Tools'];

  const fixture = (pages: [string, string][], reading: Reading) => {
    const children: FixturePage[] = [];
    let made = 0;
    const mk = (name: string, id: string): FixturePage => ({
      name, id, isPageDivider: name === '---', _kids: OWN_LEAVES.has(name) || name === '↳ Icons & assets' ? [{ type: 'COMPONENT_SET', name: `${name.slice(2)} set` }] : [],
      appendChild(c: unknown) { this._kids.push(c); }, findOne(pred: (n: unknown) => boolean) { return this._kids.find(pred) ?? null; },
    });
    for (const [n, id] of pages) children.push(mk(n, id));
    const api: PagesApi = {
      root: {
        get children() { return children; },
        insertChild(index: number, child: PageLike) {
          const c = child as FixturePage;
          const i = children.indexOf(c);
          const at = Math.max(0, Math.min(index, children.length));
          if (reading === 'splice') { if (i >= 0) children.splice(i, 1); children.splice(Math.min(at, children.length), 0, c); return; }
          // THE HOST'S READING: the index counts in the list as it stands, the page still in it; the old copy goes after.
          children.splice(at, 0, c);
          if (i >= 0) children.splice(i >= at ? i + 1 : i, 1);
        },
        appendChild(child: PageLike) { const i = children.indexOf(child as FixturePage); if (i >= 0) children.splice(i, 1); children.push(child as FixturePage); },
      },
      createPage() { const p = mk('', `new:${++made}`); children.push(p); return p; },
      createPageDivider() { const p = mk('---', `new:${++made}`); children.push(p); return p; },
      async setCurrentPageAsync() { /* view only */ },
      async loadAllPagesAsync() { /* nothing to load */ },
    };
    const ids = (): string[] => children.map((p) => p.id);
    const label = (): string[] => children.map((p) => (p.isPageDivider ? `--- ${p.id}` : p.name));
    return { api, children, ids, label };
  };
  // A page's place among the pages Prism3 may not move: the list with its own component-section leaves taken out.
  const fixedOrder = (kids: readonly FixturePage[]): string[] => kids.filter((p) => !OWN_LEAVES.has(p.name)).map((p) => p.id);
  const spanOf = (label: string[], header: string): string[] => { const h = label.indexOf(header); const end = label.findIndex((n, i) => i > h && n.startsWith('---')); return label.slice(h + 1, end < 0 ? undefined : end); };
  const SEQUENCE = ['accordion', 'file-setup', 'button', 'button-destructive', 'icon-button', 'icon-button-destructive'];

  // THE SHIM PIN: the host shim's reading, as a literal drawn from the live run ("Diagnosis confirmed live" on #2597:
  // a forward move landed one slot early). [A,B,C] with `insertChild(2, A)` is [B,A,C] on the host; remove-then-splice
  // would give [B,C,A]. Every host-reading arm below stands on this shim, so it is asserted, not assumed.
  for (const [reading, want] of [['host', ['B', 'A', 'C']], ['splice', ['B', 'C', 'A']]] as const) {
    const f = fixture([['A', 'a'], ['B', 'b'], ['C', 'c']], reading);
    f.api.root.insertChild(2, f.children[0]);
    ok(JSON.stringify(f.label()) === JSON.stringify(want),
      `replay/shim pin, ${reading} reading: [A,B,C] with insertChild(2, A) gives ${JSON.stringify(want)} (${JSON.stringify(f.label())})`);
  }

  for (const [world, pages] of [['file', ORIGINAL], ['reconstructed', RECONSTRUCTED]] as const) {
    for (const reading of ['host', 'splice'] as const) {
      const tag = `replay/${world}, ${reading} reading`;
      const f = fixture(pages, reading);
      const start = f.children.slice();
      const startFixed = fixedOrder(start);
      const startIds = new Set(f.ids());
      const sets = new Map(start.map((p) => [p.id, JSON.stringify(p._kids)]));
      // THE UPDATE'S PAGE ORDER: the dry run's list and the apply, as `update-apply.ts` calls them.
      const listed = pagesOutOfOrder(f.children);
      const reordered = reorderPages(f.api);
      ok(JSON.stringify(listed) === JSON.stringify(['↳ Accordion', '↳ Badge', '↳ Divider', '↳ Tabs', '↳ Tag', '↳ Text field', '↳ Field Label']) && JSON.stringify(reordered) === JSON.stringify(listed),
        `${tag}: the update lists and reorders the 7 pages the file's update reported (${JSON.stringify(reordered)})`);
      const afterUpdate = f.ids();
      // Then the rebuild of Accordion, file-setup, and the four button builds, the list recorded after each.
      const steps: string[] = [];
      for (const s of SEQUENCE) {
        const before = f.ids().join();
        if (s === 'file-setup') await scaffoldSkeleton(f.api, TAXONOMY);
        else await resolveComponentPage(f.api, s, TAXONOMY);
        if (f.ids().join() !== before) steps.push(s);
      }
      const end = f.label();
      ok(steps.length === 0 && JSON.stringify(f.ids()) === JSON.stringify(afterUpdate),
        `${tag}: after the update, file-setup and the five builds leave the page list exactly as they found it (changed by ${JSON.stringify(steps)})`);
      ok(JSON.stringify(spanOf(end, 'Components')) === JSON.stringify(['↳ Accordion', '↳ Badge', '↳ Buttons', '↳ Checkbox', '↳ Divider', '↳ Icon button', '↳ Radio', '↳ Select', '↳ Switch', '↳ Tabs', '↳ Tag', '↳ Text field', '↳ Textarea', '↳ Veil']),
        `${tag}: alphabetical/Components: the section reads A to Z straight after its header (${JSON.stringify(spanOf(end, 'Components'))})`);
      ok(JSON.stringify(spanOf(end, 'Subcomponents')) === JSON.stringify(['↳ Field Label', '↳ Field Message', '↳ Focus Ring', '↳ Image Placeholder', '↳ Spinner']),
        `${tag}: alphabetical/Subcomponents: the section reads A to Z straight after its header (${JSON.stringify(spanOf(end, 'Subcomponents'))})`);
      const endFixed = fixedOrder(f.children);
      const movedOf = (names: readonly string[]): string[] => start.filter((p) => names.includes(p.isPageDivider ? '---' : p.name))
        .filter((p) => startFixed.indexOf(p.id) !== endFixed.indexOf(p.id)).map((p) => `${p.name} ${p.id}`);
      ok(movedOf(HEADERS).length === 0, `${tag}: no header moved (${JSON.stringify(movedOf(HEADERS))})`);
      ok(movedOf(['---']).length === 0, `${tag}: no divider moved (${JSON.stringify(movedOf(['---']))})`);
      ok(movedOf(FOUNDATIONS).length === 0, `${tag}: no Foundations page moved (${JSON.stringify(movedOf(FOUNDATIONS))})`);
      ok(movedOf(SANDBOX).length === 0, `${tag}: no Sandbox page moved (${JSON.stringify(movedOf(SANDBOX))})`);
      ok(movedOf(DESIGNER).length === 0, `${tag}: no designer page moved (${JSON.stringify(movedOf(DESIGNER))})`);
      ok(JSON.stringify(endFixed) === JSON.stringify(startFixed), `${tag}: only the component-section pages Prism3 owns moved (${JSON.stringify(endFixed.filter((id, i) => startFixed[i] !== id))})`);
      const created = f.ids().filter((id) => !startIds.has(id));
      ok(created.length === 0 && f.children.length === start.length, `${tag}: no page created (${JSON.stringify(created)})`);
      ok(f.children.every((p) => sets.get(p.id) === JSON.stringify(p._kids)), `${tag}: every set is on the page it was on`);
    }
  }

  // A FORWARD MOVE under the host's reading: Tabs, at the front of its section, goes straight after Divider (the last page
  // in order that sorts before it), ahead of the designer's Notes: the one kind of move the host reads differently.
  for (const reading of ['host', 'splice'] as const) {
    const f = fixture([['Components', 'h'], ['↳ Tabs', 'a'], ['↳ Badge', 'b'], ['↳ Divider', 'c'], ['Notes', 'd'], ['↳ Veil', 'e'], ['---', 'f']], reading);
    reorderPages(f.api);
    ok(JSON.stringify(f.label()) === JSON.stringify(['Components', '↳ Badge', '↳ Divider', '↳ Tabs', 'Notes', '↳ Veil', '--- f']),
      `replay/forward move, ${reading} reading: a page moved forward lands straight after its anchor (${JSON.stringify(f.label())})`);
  }

  // A BUILD BESIDE A HEADER WITH NO DIVIDER: the designer deleted the `---` before Components. The build of a page that
  // exists creates no divider and moves nothing.
  for (const reading of ['host', 'splice'] as const) {
    const f = fixture(ORIGINAL.filter(([, id]) => id !== '1:674'), reading);
    const before = f.ids();
    for (const d of ['button', 'icon-button', 'accordion']) await resolveComponentPage(f.api, d, TAXONOMY);
    ok(JSON.stringify(f.ids()) === JSON.stringify(before), `replay/no divider for an existing header, ${reading} reading: the build creates no page and moves none (${JSON.stringify(f.ids().filter((id, i) => before[i] !== id))})`);
  }

  // A BUILD OF A PAGE THAT SITS ABOVE ITS HEADER: the designer keeps `↳ Buttons` under Foundations. The build finds it
  // there and builds onto it; it is not pulled back under Components.
  for (const reading of ['host', 'splice'] as const) {
    const pages = ORIGINAL.filter(([n]) => n !== '↳ Buttons');
    pages.splice(pages.findIndex(([, id]) => id === '1:674'), 0, ['↳ Buttons', '81:100']);
    const f = fixture(pages, reading);
    const before = f.ids();
    const got = await resolveComponentPage(f.api, 'button', TAXONOMY);
    ok(got?.name === '↳ Buttons' && JSON.stringify(f.ids()) === JSON.stringify(before),
      `replay/existing page above its header, ${reading} reading: the build returns it where it is and moves nothing (${JSON.stringify(f.label().slice(4, 10))})`);
  }

  // A BUILD IN A SECTION THAT IS NOT ALPHABETICAL: the designer keeps `↳ Icons & assets` under Sandbox. The `icon` build
  // finds it there and builds onto it; it is not pulled back under Foundations.
  for (const reading of ['host', 'splice'] as const) {
    const pages = ORIGINAL.filter(([n]) => n !== '↳ Icons & assets');
    pages.push(['↳ Icons & assets', '1:718']);
    const f = fixture(pages, reading);
    const before = f.ids();
    const got = await resolveComponentPage(f.api, 'icon', TAXONOMY);
    ok(got?.name === '↳ Icons & assets' && JSON.stringify(f.ids()) === JSON.stringify(before),
      `replay/existing page outside its non-alphabetical section, ${reading} reading: the build returns it where it is and moves nothing (${JSON.stringify(f.ids().filter((id, i) => before[i] !== id))})`);
  }

  // A CREATED HEADER LANDS AT THE END OF THE PREVIOUS SECTION'S SPAN (#2605), not after that section's furthest page:
  // on this file `↳ Grids & layouts`, a Foundations page, sits under Sandbox, and a `Components` anchored off it went
  // inside Sandbox. A divider the run creates shows as `--- new`. Mutation: the anchor back to the furthest page →
  // `created header/…` (Components after `↳ Grids & layouts`).
  const plain = (label: string[]): string[] => label.map((n) => (n.startsWith('--- new:') ? '--- new' : n));
  const TAIL = ['--- 1:676', 'Subcomponents', ...SUB_PAGES, '--- 1:678', 'Sandbox', '↳ Grids & layouts', '↳ File Components', '↳ Helpful Tools'];
  const HEAD = ['Cover', '--- 1:669', 'Foundations', '↳ Primitive tokens', '↳ Semantic tokens', '↳ Icons & assets'];
  for (const reading of ['host', 'splice'] as const) {
    for (const run of ['build', 'file-setup'] as const) {
      // The header deleted, its divider and its pages kept: it comes back where it stood, on that divider, over its pages.
      const f = fixture(ORIGINAL.filter(([, id]) => id !== '1:673'), reading);
      if (run === 'build') await resolveComponentPage(f.api, 'button', TAXONOMY); else await scaffoldSkeleton(f.api, TAXONOMY);
      const want = [...HEAD, '--- 1:674', 'Components', ...COMPONENT_PAGES, ...TAIL];
      ok(JSON.stringify(plain(f.label())) === JSON.stringify(want),
        `created header/kept pages, ${run}, ${reading} reading: Components comes back on its own divider, ahead of its pages, outside Sandbox (${JSON.stringify(plain(f.label()).slice(5, 9))} … ${JSON.stringify(plain(f.label()).slice(-6))})`);

      // The whole section gone, divider and pages too: the divider that closed Foundations is followed by Subcomponents'
      // header, not a Components page, so it stays with Subcomponents and the header gets a new divider of its own.
      const g = fixture(ORIGINAL.filter(([n, id]) => id !== '1:673' && id !== '1:674' && !COMPONENT_PAGES.includes(n)), reading);
      if (run === 'build') await resolveComponentPage(g.api, 'button', TAXONOMY); else await scaffoldSkeleton(g.api, TAXONOMY);
      const wantG = [...HEAD, '--- new', 'Components', ...(run === 'build' ? ['↳ Buttons'] : []), ...TAIL];
      ok(JSON.stringify(plain(g.label())) === JSON.stringify(wantG),
        `created header/no section left, ${run}, ${reading} reading: Components after Foundations' span, a divider each side, outside Sandbox (${JSON.stringify(plain(g.label()).slice(5, 10))} … ${JSON.stringify(plain(g.label()).slice(-6))})`);

      // A DESIGNER'S PAGE OR SECTION after the divider that closed Foundations, Components and its pages gone: the
      // divider stays with the designer's pages, and the created header goes before it on a divider of its own, so it
      // never takes `Notes` (or `Archive`'s span) into Components. Mutation: always anchor on the closing divider →
      // `created header/designer …` (Components, then `Notes` with no divider between).
      for (const designer of [[['Notes', '7:1']], [['Archive', '7:2'], ['↳ old stuff', '7:3']]] as [string, string][][]) {
        const at = ORIGINAL.findIndex(([, id]) => id === '1:674') + 1;
        const pages = ORIGINAL.filter(([n, id]) => id !== '1:673' && !COMPONENT_PAGES.includes(n));
        pages.splice(at, 0, ...designer);
        const d = fixture(pages, reading);
        if (run === 'build') await resolveComponentPage(d.api, 'button', TAXONOMY); else await scaffoldSkeleton(d.api, TAXONOMY);
        const wantD = [...HEAD, '--- new', 'Components', ...(run === 'build' ? ['↳ Buttons'] : []), '--- 1:674', ...designer.map(([n]) => n), ...TAIL];
        ok(JSON.stringify(plain(d.label())) === JSON.stringify(wantD),
          `created header/designer ${designer[0][0]}, ${run}, ${reading} reading: Components on its own divider, the designer's pages kept behind theirs (${JSON.stringify(plain(d.label()).slice(5, 12))})`);
      }
    }
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
  // #2927: a page of several defs names its usage panel's lead, one of its own defs. Two synthetic taxonomies, each
  // with the one defect, reported by the page's name.
  const leaf = (lead?: string) => ({ ...TAXONOMY, sections: [{ header: 'Components', leaves: [{ page: 'Pair', defs: ['badge', 'tag'], ...(lead ? { lead } : {}) }] }] });
  ok(assertCoverage(['badge', 'tag'], leaf()).some((p) => p.includes("'Pair'") && p.includes('lead')), 'lead/missing: a page of two defs with no lead is reported by name');
  ok(assertCoverage(['badge', 'tag'], leaf('veil')).some((p) => p.includes("'Pair'") && p.includes("'veil'")), 'lead/foreign: a lead that is not one of the page\'s defs is reported by name');
  ok(assertCoverage(['badge', 'tag'], leaf('tag')).length === 0, 'lead/named: a page whose lead is one of its defs is clean');

  // #2989 (owner decision Q656 A): a part only one def nests sits on that def's page. "Nested by" is read off the real
  // defs' `nests` (the oracle), never off the taxonomy (the subject).
  const parts = assertPartPages(componentDefs);
  ok(parts.length === 0, `parts/real: every part one def nests sits on its consumer's page, bar the standalone exemptions (problems: ${JSON.stringify(parts)})`);
  const by = consumersOf(componentDefs);
  ok([...(by.get('breadcrumb-item') ?? [])].join() === 'breadcrumbs' && [...(by.get('code-input-cell') ?? [])].join() === 'code-input',
    'parts/oracle: the step is nested by Breadcrumbs alone and the cell by Code input alone, read off the defs');
  // Two synthetic defs: a part on its own page is reported by name, and an exemption with no reason left is stale.
  const two = [{ id: 'host', anatomy: { parts: [{ kind: 'nest', nests: 'part' }] } }, { id: 'part' }];
  const apart = { ...TAXONOMY, sections: [{ header: 'Components', leaves: [{ page: 'Host', defs: ['host'] }, { page: 'Part', defs: ['part'] }] }] };
  ok(assertPartPages(two, apart, {}).some((p) => p.includes("'part'") && p.includes("'Part'") && p.includes("'Host'")), 'parts/apart: a single-consumer part on another page is reported by name, with both pages');
  ok(assertPartPages(two, apart, { part: 'test' }).length === 0, 'parts/exempt: a listed standalone def is not reported');
  const together = { ...TAXONOMY, sections: [{ header: 'Components', leaves: [{ page: 'Host', defs: ['part', 'host'], lead: 'host' }] }] };
  ok(assertPartPages(two, together, { part: 'test' }).some((p) => p.includes('stale') && p.includes("'part'")), 'parts/stale: an exemption for a part already on its consumer\'s page is reported by name');
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

// ── 7. Sets on a former page move to the page the taxonomy names now (#2989, owner decision Q656 A) ─────────
console.log('7. relocateSets: a part\'s set leaves its former page, and no page is deleted');
{
  const { api, children } = makePagesShim();
  // Nodes with plugin data, written by the literal keys the plugin stores ('prism3' / 'memberStamp', 'furniture',
  // 'docPanel'), so the arm fails if the module stops recognizing a set or its furniture by them.
  type N = { id: string; name: string; type: string; x: number; y: number; width: number; height: number; children?: N[]; data: Record<string, string>; getSharedPluginData(ns: string, k: string): string };
  const node = (id: string, name: string, type: string, x: number, y: number, data: Record<string, string> = {}, kids?: N[]): N =>
    ({ id, name, type, x, y, width: 100, height: 50, ...(kids ? { children: kids } : {}), data, getSharedPluginData(ns, k) { return ns === 'prism3' ? this.data[k] ?? '' : ''; } });
  const stamped = (id: string) => node(id, 'state=rest', 'COMPONENT', 0, 0, { memberStamp: '9.9.9|0123456789abcdef|1' });
  const pageOf = (name: string): ShimPage & { children: N[] } => {
    const p = api.createPage() as ShimPage & { children: N[] };
    p.name = name;
    Object.defineProperty(p, 'children', { get() { return p._kids; } });
    p.appendChild = (c: unknown) => { for (const q of children) { const k = q._kids.indexOf(c); if (k >= 0) q._kids.splice(k, 1); } p._kids.push(c); };
    return p;
  };
  await scaffoldSkeleton(api, TAXONOMY);
  const old = pageOf(`${NEST_PREFIX}Breadcrumb Item`);
  const cell = pageOf(`${NEST_PREFIX}Code Cell`);
  const crumbs = pageOf(`${NEST_PREFIX}Breadcrumbs`);
  const host = node('s3', 'breadcrumbs', 'COMPONENT_SET', 0, 40, {}, [stamped('m3')]);
  crumbs.appendChild(host);
  const sep = node('s1', '_breadcrumb-separator', 'COMPONENT_SET', 0, 0, {}, [stamped('m1')]);
  const item = node('s2', 'breadcrumb-item', 'COMPONENT_SET', 300, 0, {}, [stamped('m2')]);
  const label = node('f2', 'label', 'INSTANCE', 300, -30, { furniture: JSON.stringify({ v: 1, def: 'breadcrumb-item', set: 's2', kind: 'label' }) });
  const panel = node('p2', 'usage', 'FRAME', 500, 0, { docPanel: JSON.stringify({ v: 1, def: 'breadcrumb-item', set: 's2', state: 'live' }) });
  for (const n of [sep, item, label, panel]) old.appendChild(n);
  // A designer's own set by the same name, unstamped, on the cell's page, and a note of theirs: neither is Prism3's.
  const theirs = node('s9', 'code-input-cell', 'COMPONENT_SET', 0, 0, {}, [node('m9', 'state=rest', 'COMPONENT', 0, 0)]);
  cell.appendChild(theirs);
  const due = pageMovesDue(children);
  ok(JSON.stringify(due.map((m) => [m.set, m.from, m.to])) === JSON.stringify([
    ['_breadcrumb-separator', `${NEST_PREFIX}Breadcrumb Item`, `${NEST_PREFIX}Breadcrumbs`],
    ['breadcrumb-item', `${NEST_PREFIX}Breadcrumb Item`, `${NEST_PREFIX}Breadcrumbs`],
  ]), `moves/due: the two Prism3 sets on Breadcrumb Item move to Breadcrumbs, part first; a designer's set does not (${JSON.stringify(due)})`);
  const before = children.length;
  const r = await relocateSets(api, TAXONOMY);
  ok(r.moved.length === 2 && crumbs.children.includes(sep) && crumbs.children.includes(item), 'moves/made: both sets now sit on the Breadcrumbs page');
  ok(crumbs.children.includes(label) && crumbs.children.includes(panel), 'moves/furniture: the step\'s label and its live usage panel go with it');
  ok(item.id === 's2' && item.children![0].id === 'm2' && item.children![0].data.memberStamp.startsWith('9.9.9|'), 'moves/kept: the set is the same node, members and stamps as they were (moved, never rebuilt)');
  ok(label.x - item.x === -0 && label.y - item.y === -30 && panel.x - item.x === 200, 'moves/places: the set\'s own nodes keep their places around it');
  ok(sep.x >= host.x + host.width + 160 && item.x >= host.x + host.width + 160, 'moves/clear: the moved sets land past what the page already held, a set gap away');
  ok(children.length === before && children.includes(old), 'moves/never-delete: no page is removed, the emptied one included');
  ok(JSON.stringify(r.emptied) === JSON.stringify([`${NEST_PREFIX}Breadcrumb Item`]) && emptiedLine(r.emptied) === 'Breadcrumb Item is now empty, safe to delete.',
    `moves/emptied: the page left empty is reported as safe to delete (${JSON.stringify(r.emptied)})`);
  ok(cell.children.includes(theirs) && !r.emptied.includes(`${NEST_PREFIX}Code Cell`), 'moves/theirs: a designer\'s set stays, and its page is not reported');
  ok(pageMovesDue(children).length === 0 && (await relocateSets(api, TAXONOMY)).moved.length === 0, 'moves/idempotent: a second run has nothing to move');
}

console.log(failures === 0 ? '\nfile-setup: all assertions pass' : `\nfile-setup: ${failures} FAILED`);
if (failures > 0) process.exit(1);
