/**
 * Plugin GRID-STYLE write-adapter test (layout-grid lane, #1480) — drives the REAL `applyGridStylePlan`
 * executor against an in-memory `GridStylesApi` shim, so the Grid Style write is verified with no live
 * Figma.
 *
 *   npx tsx apps/plugin/test-write-grid-styles.ts
 *
 * The shim models Figma's grid-style API: `createGridStyle` mints a mutable node with
 * `name`/`description`/`layoutGrids`; `getLocalGridStylesAsync` returns them. Mirrors the sibling
 * `test-write-styles.ts` (effect/paint) shim.
 *
 * Asserts: one Grid Style per breakpoint materialises, named `Grid / <bp>`; each carries the plan's
 * COLUMNS layout grid VERBATIM (the executor is a faithful sink — the emit-side values are gated by
 * `test.ts`'s #1480 block against the layout contract, so here we assert plan→node fidelity, not the
 * numbers); re-apply is idempotent (+0 created, no duplicate styles). A light-of-a-brand with a
 * different breakpoint count yields that many styles.
 */
import { buildGridStylePlan } from '@prism3/engine/write-plan';
import { brandTheme } from '@prism3/engine/theme';
import { applyGridStylePlan } from './src/write-grid-styles';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory grid-style shim -------------------------------------------------------
class ShimGridStyle {
  description = '';
  layoutGrids: readonly unknown[] = [];
  constructor(public name = '') {}
}
class GridStylesShim {
  gridStyles: ShimGridStyle[] = [];
  async getLocalGridStylesAsync(): Promise<ShimGridStyle[]> { return this.gridStyles; }
  createGridStyle(): ShimGridStyle { const s = new ShimGridStyle(); this.gridStyles.push(s); return s; }
}

console.log('plugin GRID-STYLE write-adapter (layout grid) — executor against in-memory shim\n');

// ---- drive it: aurora (6 breakpoints — xs..2xl) ------------------------------------------
const plan = buildGridStylePlan(brandTheme(exampleBrands['aurora'] as unknown as BrandInput));
const shim = new GridStylesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies GridStylesApi
const run = () => applyGridStylePlan(plan, shim as any);

const r1 = await run();
const countAfterFirst = shim.gridStyles.length;
const r2 = await run();

// first run creates all; second is idempotent (no duplicates)
ok(r1.created === plan.length && plan.length > 0, `first run creates all grid styles (${r1.created}/${plan.length})`);
ok(r2.created === 0, `second run creates 0 (idempotent): +${r2.created}`);
ok(shim.gridStyles.length === countAfterFirst && shim.gridStyles.length === plan.length,
  `no duplicate styles across re-run (${shim.gridStyles.length} stable)`);

// every style is named `Grid / <bp>`
ok(shim.gridStyles.every((s) => s.name.startsWith('Grid / ')),
  `every grid style is named 'Grid / <bp>' (e.g. ${shim.gridStyles[0]?.name})`);

// each shim node carries the plan's COLUMNS grid VERBATIM (faithful sink; emit values gated in test.ts)
const bad: string[] = [];
for (const row of plan) {
  const s = shim.gridStyles.find((g) => g.name === row.name);
  if (!s) { bad.push(`${row.name}: not created`); continue; }
  if (s.description !== row.description) bad.push(`${row.name}: description not copied`);
  if (JSON.stringify(s.layoutGrids) !== JSON.stringify(row.layoutGrids)) bad.push(`${row.name}: layoutGrids not copied verbatim`);
  const lg = (s.layoutGrids as any[])[0];
  if (!lg || lg.pattern !== 'COLUMNS') bad.push(`${row.name}: not a COLUMNS grid`);
}
ok(bad.length === 0, 'each Grid Style carries the plan\'s COLUMNS grid verbatim (name/description/layoutGrids)'
  + (bad.length ? ` — ${bad.slice(0, 3).join('; ')}` : ''));

// ---- a 2-breakpoint brand yields exactly 2 grid styles (count-derived, #1479 interlink) --
const twoPlan = buildGridStylePlan(brandTheme({ id: 'grid2', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 }, layout: { breakpoints: [0, 768] } } as BrandInput));
const twoShim = new GridStylesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await applyGridStylePlan(twoPlan, twoShim as any);
ok(twoShim.gridStyles.map((s) => s.name).join(' | ') === 'Grid / sm | Grid / md',
  `a 2-breakpoint brand materialises exactly [Grid / sm, Grid / md] (got [${twoShim.gridStyles.map((s) => s.name).join(', ')}])`);

console.log(`\nplugin GRID-STYLE write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
