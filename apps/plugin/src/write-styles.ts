/**
 * Prism3 Figma plugin — the MAIN-THREAD STYLES write adapter (shadow/gradient lane).
 *
 * The first NON-VARIABLE write: shadow → Effect Styles, gradient → Paint Styles (Figma *Styles*, a
 * different API from `figma.variables` — `createEffectStyle` / `createPaintStyle`). The live executor
 * for the host-neutral `StylesPlan` (engine `write-plan.ts` `buildStylesPlan`), the sibling of
 * `applyWritePlan` (colour) + `applyFloatPlan` (dims/layout).
 *
 * Faithful to the emit contract:
 *   • BOTH shadow style sets — `shadow/*` (light) + `shadow-dark/*` (dark) — as separate Effect
 *     Styles (Effect Styles can't carry Figma modes; a component swaps the pair by mode).
 *   • Gradients as a single `GRADIENT_LINEAR`/`GRADIENT_RADIAL` Paint with the plan's
 *     `gradientTransform` and stops that carry resolved RGBA *and* a binding to the `palette/*`
 *     variable each came from (#236), so changing a palette colour re-themes the gradient live.
 *     #151 shipped the baked value alone; the binding is the fast-follow it deferred.
 *
 * IDEMPOTENT: find-by-name (get locals → Map) → reuse + overwrite, else create. Re-running mutates
 * the existing styles rather than duplicating.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `StylesApi` port is the
 * minimal slice of `figma.*` the executor touches, so it's unit-testable against an in-memory shim
 * (see `apps/plugin/test-write-styles.ts`); the real `figma` object structurally satisfies it.
 */
import type { StylesPlan, GradientTransform } from '@prism3/engine/write-plan';
import type { FigmaEffect } from '@prism3/engine/emit-figma-styles';

/** A colour as Figma stores it on an effect/stop — RGBA floats 0–1 (matches the engine's `FigmaColor`). */
type Rgba = { r: number; g: number; b: number; a: number };

/** Figma's variable-reference value. Structurally identical to `write-figma.ts`'s, declared here
 *  rather than imported because that module is the *variables* executor and this one only needs the
 *  shape — the two ports stay independently satisfiable by the real `figma`. */
export interface VariableAlias { type: 'VARIABLE_ALIAS'; id: string }

/** The minimal `Variable` surface this executor needs: a name to index by, and an id the alias carries. */
export interface StyleVariable { id: string; name: string }

/**
 * A Figma gradient Paint (the subset the executor sets).
 *
 * A stop carries `color` AND, when the plan traced it to a palette variable, `boundVariables.color`
 * (#236). Both, not either: Figma stores the RGBA as the stop's value and *overrides* it from the
 * bound variable when it can resolve one, so the baked colour is the correct rendering for a host
 * that cannot — and it is the right colour, not a placeholder.
 *
 * Stop bindings go through `ColorStop.boundVariables`, constructed inline while building the
 * `gradientStops` array — NOT `setBoundVariableForPaint`, which only handles `SolidPaint`. That
 * asymmetry in Figma's API is the reason this was deferred out of #151.
 */
type GradientPaint = {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  gradientTransform: GradientTransform;
  gradientStops: { position: number; color: Rgba; boundVariables?: { color: VariableAlias } }[];
};

// The Style nodes' `effects`/`paints` are WRITE-ONLY here (the executor assigns them; it never reads
// them back). Figma's real `EffectStyle.effects` / `PaintStyle.paints` are `readonly Effect[]` /
// `readonly Paint[]` supersets (e.g. `Effect.spread` is optional, and there are non-shadow effect
// kinds), so typing these fields as our narrow write shape would make `figma` fail to satisfy the
// port. We type them as `readonly unknown[]` (assignable-from our shapes, satisfied-by Figma's) — the
// value we WRITE is validated by `StylesPlan`, and the shim asserts what landed.
/** Minimal Effect Style surface — mutable name/description + a write-only effects array. */
export interface EffectStyleNode {
  name: string;
  description: string;
  effects: readonly unknown[];
}
/** Minimal Paint Style surface — mutable name/description + a write-only paints array. */
export interface PaintStyleNode {
  name: string;
  description: string;
  paints: readonly unknown[];
}

/** The minimal `figma` styles surface the executor needs — declared as a port so the Node harness can
 *  drive it with a shim. In the real plugin, the global `figma` structurally satisfies this. */
export interface StylesApi {
  getLocalEffectStylesAsync(): Promise<EffectStyleNode[]>;
  getLocalPaintStylesAsync(): Promise<PaintStyleNode[]>;
  createEffectStyle(): EffectStyleNode;
  createPaintStyle(): PaintStyleNode;
  /** The variable surface for stop binding (#236). Nested under `variables` because that is where the
   *  real `figma` puts it — so the global still satisfies this port structurally, with no adapter. */
  variables: {
    getLocalVariablesAsync(type?: string): Promise<StyleVariable[]>;
    createVariableAlias(target: StyleVariable): VariableAlias;
  };
}

/** What the styles executor did — surfaced to the UI + asserted by the harness. `bound` counts stops
 *  actually wired to a variable; `misses` names the `palette/*` targets a stop asked for and this file
 *  does not have. A miss is reported, never fatal: the baked RGBA still renders correctly. */
export type StylesApplyResult = {
  effects: { total: number; created: number };
  paints: { total: number; created: number; bound: number };
  misses: string[];
};

/**
 * Materialise the styles plan into Figma Effect + Paint Styles. Idempotent find-by-name for each:
 * reuse an existing style with the same name (overwrite its props), else create one.
 */
export const applyStylesPlan = async (plan: StylesPlan, styles: StylesApi): Promise<StylesApplyResult> => {
  // ---- Effect Styles (shadows — both light `shadow/*` and dark `shadow-dark/*`) ----
  const effectByName = new Map((await styles.getLocalEffectStylesAsync()).map((s) => [s.name, s] as const));
  let effectsCreated = 0;
  for (const row of plan.effects) {
    let s = effectByName.get(row.name);
    if (!s) { s = styles.createEffectStyle(); s.name = row.name; effectByName.set(row.name, s); effectsCreated++; }
    s.description = row.description;
    s.effects = row.effects;
  }

  // ---- Paint Styles (gradients — one GradientPaint per style, stops bound to palette/* where traced) ----
  const paintByName = new Map((await styles.getLocalPaintStylesAsync()).map((s) => [s.name, s] as const));
  // Unfiltered fetch, for the #146 reason `resolveCollection` documents: a type-filtered call returns
  // only that type, and the palette targets are COLOR while nothing here guarantees the filter matches.
  // Indexing every local variable by name is what both the FLOAT and Text Style executors already do.
  const varByName = new Map((await styles.variables.getLocalVariablesAsync()).map((v) => [v.name, v] as const));
  let paintsCreated = 0;
  let bound = 0;
  const misses: string[] = [];

  for (const row of plan.paints) {
    let s = paintByName.get(row.name);
    if (!s) { s = styles.createPaintStyle(); s.name = row.name; paintByName.set(row.name, s); paintsCreated++; }
    s.description = row.description;
    const gradientStops: GradientPaint['gradientStops'] = row.stops.map((stop) => {
      // Position + baked colour always; the binding only when the plan traced this stop to a palette
      // leaf AND this file actually has that variable. `alias: null` is the ordinary case for an
      // authored hex, so it is not a miss — only a named target we cannot find is.
      const base = { position: stop.position, color: stop.color };
      if (!stop.alias) return base;
      const v = varByName.get(stop.alias);
      if (!v) { misses.push(stop.alias); return base; }
      bound++;
      return { ...base, boundVariables: { color: styles.variables.createVariableAlias(v) } };
    });
    s.paints = [{ type: row.paintType, gradientTransform: row.gradientTransform, gradientStops }];
  }

  return {
    effects: { total: plan.effects.length, created: effectsCreated },
    paints: { total: plan.paints.length, created: paintsCreated, bound },
    misses,
  };
};
