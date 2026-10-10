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
 * frame. This writes the missing artifact: one reusable Grid Style per breakpoint (`sm`, `md`, …),
 * each holding the breakpoint's `COLUMNS`/`STRETCH` grid. Figma grid styles are
 * STATIC — they cannot mode-switch off a variable — so N breakpoints = N separate styles, coexisting
 * with the numeric `layout` collection (two representations of one dataset).
 *
 * IDEMPOTENT: find Prism3's own style of that name → reuse + overwrite, else create. Re-running mutates
 * the existing styles rather than duplicating.
 *
 * ── THE NAME MOVED, THE STYLES DID NOT (#2467, owner decision Q185 A) ────────────────────────────────
 *
 * Until #2467 the styles were named `Grid / <bp>`, which Figma's styles panel shows as a `Grid` group
 * holding everything in the list. They are now the bare size, `sm` … `2xl`. A file applied before that
 * holds the old names, and layers in it use those styles, so the apply RENAMES an old `Grid / <bp>` in
 * place rather than creating `<bp>` beside it. A rename keeps the style's id, so every layer stays linked;
 * create-plus-delete would unlink them all. `LEGACY_GRID_PREFIX` is the frozen old spelling: it names
 * text the engine no longer writes, so nothing should move it.
 *
 * OWNERSHIP, NOT NAME. A bare `sm` is a name anyone might give a grid style. So a style is reused or
 * renamed only when it is Prism3's: it carries the ownership mark (`provenance.ts`, #1884), or, for one
 * written before the mark or on a host that keeps no shared plugin data, the engine's own grid-description
 * signature (`isEngineDescription`, the evidence the pre-flight already accepts). A client's own `sm`
 * matches neither and is never touched: the executor writes a new style rather than adopt it, and the
 * pre-flight (`preflight.ts`) refuses the apply before it gets that far.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `GridStylesApi` port is the
 * minimal slice of `figma.*` the executor touches, so it's unit-testable against an in-memory shim
 * (see `apps/plugin/test-write-grid-styles.ts`); the real `figma` object structurally satisfies it.
 */
import type { GridStylePlan } from '@prism3/engine/write-plan';
import { markOwned, isMarkedOwned, type Markable } from './provenance';
import { isEngineDescription, LEGACY_GRID_PREFIX } from './prune-figma';

/** Whether a grid style is Prism3's: the ownership mark, else the engine's grid-description signature.
 *  Never the name alone (#2467). Shared by the executor and the pre-flight, so the two agree on which
 *  `sm` is Prism3's. */
export const isPrism3GridStyle = (s: { description?: string } & Markable): boolean =>
  isMarkedOwned(s) || isEngineDescription('grid', s.description ?? '', []);

// The Grid Style node's `layoutGrids` is WRITE-ONLY here (the executor assigns it; it never reads it
// back), and Figma's real `GridStyle.layoutGrids` is a `readonly LayoutGrid[]` superset (it also
// admits ROWS/GRID patterns and optional fields). Typing it as our narrow write shape would make
// `figma` fail to satisfy the port, so — as in `write-styles.ts` — it is `readonly unknown[]`
// (assignable-from our shape, satisfied-by Figma's); the value we WRITE is validated by `GridStylePlan`.
/** Minimal Grid Style surface — mutable name/description + a write-only layoutGrids array. */
export interface GridStyleNode extends Markable {
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

/** What the grid-style executor did — surfaced to the UI + asserted by the harness. `renamed` counts the
 *  old `Grid / <bp>` styles moved to their bare name in place (#2467); a renamed style is not `created`. */
export type GridStyleApplyResult = { total: number; created: number; renamed: number };

/**
 * Materialise the grid-style plan into Figma Grid Styles. For each planned name: reuse Prism3's own style
 * of that name; else RENAME Prism3's own old `Grid / <bp>` to it, in place (#2467); else create one. A
 * style that is not Prism3's is never read as a match, whatever its name. No variable binding — a grid
 * style holds baked geometry, so there is no alias graph and nothing to miss.
 */
export const applyGridStylePlan = async (plan: GridStylePlan, api: GridStylesApi): Promise<GridStyleApplyResult> => {
  // A copy: a created style is added to it, and the host (or a shim) may hand back its own live list.
  const live = [...(await api.getLocalGridStylesAsync())];
  const ours = (name: string): GridStyleNode | undefined => live.find((s) => s.name === name && isPrism3GridStyle(s));
  let created = 0;
  let renamed = 0;
  for (const row of plan) {
    let s = ours(row.name);
    if (!s) {
      s = ours(LEGACY_GRID_PREFIX + row.name);
      if (s) { s.name = row.name; renamed++; }
    }
    if (!s) { s = api.createGridStyle(); s.name = row.name; live.push(s); created++; }
    markOwned(s);   // the ownership mark (#1884), created, renamed or reused — see `provenance.ts`
    s.description = row.description;
    s.layoutGrids = row.layoutGrids;
  }
  return { total: plan.length, created, renamed };
};
