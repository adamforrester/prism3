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
 *   3. `resolveComponentPage` inserts each `↳ <family>` page in its correct section slot.
 *   4. `assertCoverage` reads the REAL `componentDefs` registry (the oracle) and finds every id mapped;
 *      a synthetic unmapped id is reported BY NAME (the arm that fails if a def is added and not placed).
 *   5. `applyComponentPlan`'s `targetPage` option routes a built set onto the target page, leaving
 *      `currentPage` untouched — the executor half of the page-aware build.
 */
import { scaffoldSkeleton, resolveComponentPage } from './src/file-setup';
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

// ── The page shim ────────────────────────────────────────────────────────────────────────────────
// Models `figma.root`'s page list. `insertChild` is REMOVE-THEN-SPLICE (the contract `file-setup.ts`
// documents and Figma's reposition primitive follows); `createPage`/`createPageDivider` append at the end.
interface ShimPage extends PageLike { _kids: unknown[]; }
const makePagesShim = (): { api: PagesApi; children: ShimPage[]; names: () => string[] } => {
  const children: ShimPage[] = [];
  const mk = (divider: boolean): ShimPage => ({
    name: divider ? '---' : '',
    isPageDivider: divider,
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
  const { api, names } = makePagesShim();
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
}

// ── 2. Idempotent + non-destructive ──────────────────────────────────────────────────────────────
console.log('2. idempotency + non-destructive re-run');
{
  const { api, names } = makePagesShim();
  await scaffoldSkeleton(api, TAXONOMY);
  const first = names();
  const res2 = await scaffoldSkeleton(api, TAXONOMY);
  ok(JSON.stringify(names()) === JSON.stringify(first), 're-run does not change the page list');
  ok(res2.created.length === 0, 're-run creates no new pages');

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

  // An unmapped id resolves to null (caller falls back to currentPage).
  const none = await resolveComponentPage(api, 'not-a-real-def', TAXONOMY);
  ok(none === null, 'an unmapped def id resolves to null');
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
