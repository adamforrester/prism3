/**
 * Prism3 Figma plugin — the MAIN-THREAD GRID-STYLE write adapter (layout-grid lane, #1480).
 *
 * The live executor for the host-neutral `GridStylePlan` (engine `write-plan.ts` `buildGridStylePlan`)
 * — the sibling of `applyStylesPlan` (effect/paint) and `applyTextStylePlan` (text). Grid Styles are a
 * DISTINCT Figma API surface (`figma.createGridStyle` / `getLocalGridStylesAsync`), the fourth style
 * class beside effect/paint/text.
 *
 * WHY THIS EXISTS. Layout already materialises as FLOAT variables (`applyFloatPlan`, the `layout`
 * collection: `grid/columns`, `grid/gutter`, `grid/margin`, `container/*`, `breakpoint/*` per
 * breakpoint mode). Those numbers are the responsive source of truth, but Figma has no
 * variable→layout-grid binding, so a number cannot BECOME a live column grid a designer applies to a
 * frame. This writes the missing artifact: one reusable Grid Style per breakpoint (`Grid / sm`,
 * `Grid / md`, …), each holding the breakpoint's `COLUMNS`/`STRETCH` grid. Figma grid styles are
 * STATIC — they cannot mode-switch off a variable — so N breakpoints = N separate styles, coexisting
 * with the numeric `layout` collection (two representations of one dataset).
 *
 * IDEMPOTENT: find-by-name (get locals → Map) → reuse + overwrite, else create. Re-running mutates the
 * existing styles rather than duplicating.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `GridStylesApi` port is the
 * minimal slice of `figma.*` the executor touches, so it's unit-testable against an in-memory shim
 * (see `apps/plugin/test-write-grid-styles.ts`); the real `figma` object structurally satisfies it.
 */
import type { GridStylePlan } from '@prism3/engine/write-plan';

// The Grid Style node's `layoutGrids` is WRITE-ONLY here (the executor assigns it; it never reads it
// back), and Figma's real `GridStyle.layoutGrids` is a `readonly LayoutGrid[]` superset (it also
// admits ROWS/GRID patterns and optional fields). Typing it as our narrow write shape would make
// `figma` fail to satisfy the port, so — as in `write-styles.ts` — it is `readonly unknown[]`
// (assignable-from our shape, satisfied-by Figma's); the value we WRITE is validated by `GridStylePlan`.
/** Minimal Grid Style surface — mutable name/description + a write-only layoutGrids array. */
export interface GridStyleNode {
  name: string;
  description: string;
  layoutGrids: readonly unknown[];
}

/** The minimal `figma` grid-style surface the executor needs — declared as a port so the Node harness
 *  can drive it with a shim. In the real plugin, the global `figma` structurally satisfies this. */
export interface GridStylesApi {
  getLocalGridStylesAsync(): Promise<GridStyleNode[]>;
  createGridStyle(): GridStyleNode;
}

/** What the grid-style executor did — surfaced to the UI + asserted by the harness. */
export type GridStyleApplyResult = { total: number; created: number };

/**
 * Materialise the grid-style plan into Figma Grid Styles. Idempotent find-by-name: reuse an existing
 * style with the same name (overwrite its props), else create one. No variable binding — a grid style
 * holds baked geometry, so there is no alias graph and nothing to miss.
 */
export const applyGridStylePlan = async (plan: GridStylePlan, api: GridStylesApi): Promise<GridStyleApplyResult> => {
  const byName = new Map((await api.getLocalGridStylesAsync()).map((s) => [s.name, s] as const));
  let created = 0;
  for (const row of plan) {
    let s = byName.get(row.name);
    if (!s) { s = api.createGridStyle(); s.name = row.name; byName.set(row.name, s); created++; }
    s.description = row.description;
    s.layoutGrids = row.layoutGrids;
  }
  return { total: plan.length, created };
};
