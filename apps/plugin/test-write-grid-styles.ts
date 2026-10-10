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
 * Asserts: one Grid Style per breakpoint materialises, named by the bare breakpoint (`sm`, #2467 — it was
 * `Grid / <bp>` before, owner decision Q185 A); each carries the plan's
 * COLUMNS layout grid VERBATIM (the executor is a faithful sink — the emit-side values are gated by
 * `test.ts`'s #1480 block against the layout contract, so here we assert plan→node fidelity, not the
 * numbers); re-apply is idempotent (+0 created, no duplicate styles). A light-of-a-brand with a
 * different breakpoint count yields that many styles.
 *
 * #2467 adds the two arms the rename has to hold: an old `Grid / <bp>` Prism3 owns is RENAMED in place
 * (same object, same id — the layers using it stay linked), never replaced by a new style beside it; and a
 * client's own `sm`, carrying no Prism3 mark and no engine description, is never touched. Every expected
 * name below is typed as a literal, never read off the emitter (docs/34).
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
// Ids, `remove()` and shared plugin data are modeled so the #2467 arms can tell a rename (same object, same
// id) from a create-plus-delete, and read the ownership mark (`provenance.ts`).
let seq = 0;
class ShimGridStyle {
  id = `S:${++seq}`;
  description = '';
  layoutGrids: readonly unknown[] = [];
  removed = false;
  data = new Map<string, string>();
  constructor(public name = '', private owner?: GridStylesShim) {}
  getSharedPluginData(ns: string, k: string): string { return this.data.get(`${ns}/${k}`) ?? ''; }
  setSharedPluginData(ns: string, k: string, v: string): void { this.data.set(`${ns}/${k}`, v); }
  remove(): void { this.removed = true; if (this.owner) this.owner.gridStyles = this.owner.gridStyles.filter((x) => x !== this); }
}
class GridStylesShim {
  gridStyles: ShimGridStyle[] = [];
  async getLocalGridStylesAsync(): Promise<ShimGridStyle[]> { return this.gridStyles; }
  createGridStyle(): ShimGridStyle { const s = new ShimGridStyle('', this); this.gridStyles.push(s); return s; }
  /** Seeding, not a write: a style already in the file. `owned` stamps Prism3's mark on it. */
  seed(name: string, description: string, owned: boolean): ShimGridStyle {
    const s = new ShimGridStyle(name, this);
    s.description = description;
    s.layoutGrids = [{ pattern: 'COLUMNS', count: 99 }];
    if (owned) s.setSharedPluginData('prism3', 'owned', '1');
    this.gridStyles.push(s);
    return s;
  }
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

// every style is named by its bare breakpoint, in order, with no `Grid /` group (#2467, Q185 A)
ok(shim.gridStyles.map((s) => s.name).join(' | ') === 'xs | sm | md | lg | xl | 2xl',
  `every grid style is named by its bare breakpoint, no group: [xs, sm, md, lg, xl, 2xl] (got [${shim.gridStyles.map((s) => s.name).join(', ')}])`);

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
ok(twoShim.gridStyles.map((s) => s.name).join(' | ') === 'sm | md',
  `a 2-breakpoint brand materialises exactly [sm, md] (got [${twoShim.gridStyles.map((s) => s.name).join(', ')}])`);

// ---- #2467: an old `Grid / <bp>` Prism3 owns is RENAMED in place, never recreated --------------------
// A file applied before #2467: the same two styles under the old names, each carrying Prism3's mark, and
// each with an id a layer would reference. The re-apply must move the NAME on the same object.
const OLD_DESC_SM = '4-column grid for sm — 16px gutter, 16px margin. A static copy of the layout variables.';
const OLD_DESC_MD = '8-column grid for md — 16px gutter, 24px margin. A static copy of the layout variables.';
{
  const f = new GridStylesShim();
  const oldSm = f.seed('Grid / sm', OLD_DESC_SM, true);
  const oldMd = f.seed('Grid / md', OLD_DESC_MD, true);
  const ids = [oldSm.id, oldMd.id].join(',');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await applyGridStylePlan(twoPlan, f as any);
  ok(r.renamed === 2 && r.created === 0,
    `#2467 rename: an owned 'Grid / sm' and 'Grid / md' are renamed, not created (renamed ${r.renamed}, created ${r.created})`);
  ok(f.gridStyles.map((s) => `${s.id}=${s.name}`).join(',') === `${oldSm.id}=sm,${oldMd.id}=md`
    && f.gridStyles.map((s) => s.id).join(',') === ids && !oldSm.removed && !oldMd.removed,
    `#2467 rename: the file holds the SAME two style objects, ids kept, now named [sm, md] — every layer using them stays linked (got [${f.gridStyles.map((s) => `${s.id}=${s.name}${s.removed ? ' (removed)' : ''}`).join(', ')}])`);
  ok(!f.gridStyles.some((s) => s.name.startsWith('Grid / ')),
    `#2467 rename: no 'Grid / <bp>' is left beside the bare name (got [${f.gridStyles.map((s) => s.name).join(', ')}])`);
  ok(JSON.stringify(oldSm.layoutGrids) === JSON.stringify(twoPlan[0].layoutGrids),
    '#2467 rename: the renamed style carries the current plan\'s grid — renamed AND rewritten');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const again = await applyGridStylePlan(twoPlan, f as any);
  ok(again.renamed === 0 && again.created === 0 && f.gridStyles.length === 2,
    `#2467 rename: a second apply is a no-op on names (renamed ${again.renamed}, created ${again.created}, ${f.gridStyles.length} styles)`);
}
// The same, written before the ownership mark existed (#1884): no mark, the engine's description. Still
// Prism3's by the evidence the pre-flight accepts, so still renamed rather than duplicated.
{
  const f = new GridStylesShim();
  const oldSm = f.seed('Grid / sm', OLD_DESC_SM, false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await applyGridStylePlan(twoPlan, f as any);
  ok(r.renamed === 1 && oldSm.name === 'sm' && f.gridStyles.filter((s) => s.name === 'sm').length === 1,
    `#2467 rename, pre-mark: an unmarked 'Grid / sm' with the engine's description is renamed in place (renamed ${r.renamed}, [${f.gridStyles.map((s) => s.name).join(', ')}])`);
}

// ---- #2467: a CLIENT's own `sm` is never touched -------------------------------------------------------
// No Prism3 mark, the client's own description. A bare `sm` is a generic name, so the executor must judge
// it by provenance: it writes its own `sm` and leaves the client's exactly as it was.
{
  const f = new GridStylesShim();
  const client = f.seed('sm', 'Our 4-column mobile grid', false);
  const before = JSON.stringify({ name: client.name, d: client.description, g: client.layoutGrids, data: [...client.data] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await applyGridStylePlan(twoPlan, f as any);
  ok(JSON.stringify({ name: client.name, d: client.description, g: client.layoutGrids, data: [...client.data] }) === before && !client.removed,
    `#2467 client 'sm': a client's own grid style named 'sm', with no Prism3 mark, is untouched — name, description, grid and plugin data (now ${JSON.stringify({ d: client.description, mark: client.getSharedPluginData('prism3', 'owned') })})`);
  ok(r.created === 2 && r.renamed === 0,
    `#2467 client 'sm': the executor writes its own two styles rather than adopt the client's (created ${r.created}, renamed ${r.renamed})`);
}
// And a client's own `Grid / sm` (no mark, no engine description) is not Prism3's old style either.
{
  const f = new GridStylesShim();
  const client = f.seed('Grid / sm', 'Our grid', false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await applyGridStylePlan(twoPlan, f as any);
  ok(client.name === 'Grid / sm' && client.description === 'Our grid' && r.renamed === 0,
    `#2467 client 'Grid / sm': a client's own 'Grid / sm' is not renamed (renamed ${r.renamed}, its name now '${client.name}')`);
}

console.log(`\nplugin GRID-STYLE write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
