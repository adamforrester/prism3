/**
 * Prism3 engine — the `color` Figma collection: the SURFACE ALIAS TIER (#893, #871, #1013).
 *
 * A collection with two modes — `default` and `inverse` — and **no colors of its own**. Every row
 * is an alias into the `color.appearance` collection: `default` points at the page token, `inverse`
 * at its inverse counterpart. Binding `color/text/primary` to a layer and switching the mode on an
 * ancestor frame swaps the whole subtree to its inverse-context values.
 *
 * ── IT HOLDS THE NAME `color`, AND THAT IS THE POINT OF #1013 ────────────────────────────────────
 *
 * This layer used to be called `surface` and the value layer `color`. #1013 swapped them, in both
 * formats: the value layer is now `color.appearance` (Figma collection and DTCG tier alike) and this
 * one is `color` — spelled `color.surface` as a Figma collection since #1089, though the DTCG tier and
 * the variable prefix are both still `color/*`; see line 97. The names now say which layer a designer is
 * meant to reach for — the two-tier rule the rest of the emission already follows, where the `core`
 * primitives sit below `color` rather than beside it.
 *
 * The consequence is the whole reason the swap was worth a MAJOR: **a component def that binds
 * `color.<role>` is surface-responsive with no def change at all**, because the name it already
 * binds resolves here, and the mode on an ancestor frame picks `default` or `inverse`.
 *
 * ── WHY IT IS AN ALIAS LAYER AND NOT A FOURTH COLOR SET ─────────────────────────────────────────
 *
 * It stores POINTERS, not values, and that is the whole economic argument. The same row resolves to
 * `rgb(207,11,44)` in nb and `#007cbb` in aurora because the values live in the `color.appearance`
 * collection where they already are. So the collection is authored ONCE and shared by every brand: it
 * does not grow with brands, and it does not grow with appearance modes.
 *
 * That second property was measured end-to-end for #1013 and it is what made the swap safe to carry
 * into DTCG: over 128 rows × 4 appearances × 5 corpus brands, a POINTER-carrying surface projection
 * agrees with the appearance tier in 2560 of 2560 cells, where a VALUE-carrying one disagrees in
 * 1510. Composition is a property of the pointer, not of the axes — see #1027.
 *
 * The recipe, so the numbers are reproducible rather than folkloric: resolve each alias row in each
 * appearance mode and compare with the appearance tier's own value for that mode; the counterfactual
 * bakes the row's `light` value and compares the same way. The pointer column is 100% by construction
 * — that IS the finding, since the construction is what the swap chose.
 *
 * **The economy is sound only while every brand ships the identical inverse NAME set.** Measured
 * 113/113/113/113 with zero divergence across the four corpus brands, and held by
 * `token-contract.json`. What it does NOT test is a brand needing `inverse` to point at a
 * structurally DIFFERENT semantic role rather than a different value — see the header of `gate.ts`
 * and #893's acceptance check. Four generated brands agreeing cannot test that.
 *
 * ── DTCG CARRIES THIS TIER, BUT NOT ITS SECOND MODE ─────────────────────────────────────────────
 *
 * Before #1013 this collection was Figma-only. It is not any more: `tree.ts` emits the same 128 rows
 * as the DTCG `color.*` tier, so `color.background.primary` is an alias into
 * `color.appearance.background.primary` in both formats and the two stay reconcilable.
 *
 * What DTCG does NOT carry is the `inverse` MODE. Per `tools/exporter-comparison/axes.ts` the
 * conforming projection carries appearance overlays only; a surface overlay is a fifth overlay file
 * per brand and a decision about where the surface axis lives in the extension namespace, which is
 * #1027's work and deliberately not this file's. So the inverse pairing exists here, in this
 * collection's second mode, and in DTCG only as the default column.
 *
 * ── THE GAPS, AND WHY THIS FILE DOES NOT DECIDE THEM ────────────────────────────────────────────
 *
 * Eleven roles have no inverse counterpart. A row for one of them has to either point `inverse` at
 * the same token as `default` (SELF-ALIAS) or not exist (OMIT), and the two are not interchangeable:
 * self-aliasing makes every name resolve at the cost of making a deliberate gap look like a filled
 * one, while omitting keeps the gap legible at the cost of a name that does not resolve.
 *
 * The answer depends on WHY each gap exists, so it is read from `inverse-coverage.ts` per entry
 * rather than decided here or collapsed to one global rule. That register is checked both directions
 * by `test.ts`, so a disposition cannot rot into a claim about a gap that has since closed.
 *
 * The row DERIVATION itself lives in `surface-rows.ts`, not here, because `tree.ts` needs it too and
 * two derivations of "which roles pair" would be two expressions of one fact. Re-exported below so
 * every existing importer of this module is unchanged.
 *
 * PURE — no `node:*`, no I/O. The shell in `emit-figma.ts` writes the files.
 */
import { Theme } from './theme';
import { resolveAllModes } from './modes';
import { INVERSE_GAP_PATHS, gapDisposition } from './inverse-coverage';
import type { FigmaCollectionFile, FigmaVar } from './emit-figma-color';
import { figName, parseColor } from './emit-figma-color';
import { SURFACE_MODES, surfaceRows } from './surface-rows';

export {
  SURFACE_MODES, type SurfaceMode, isInverseRole, inverseCounterpart, type SurfaceRow,
  surfaceRows, surfaceRowsFor,
} from './surface-rows';

/**
 * Build the two mode files. Every variable carries `alias` — the mode's target — and a `value` that
 * is the target's RESOLVED color, so a consumer that cannot follow aliases still renders correctly
 * (the same fallback contract every other emitted collection holds).
 */
export const buildFigmaSurface = (theme: Theme): FigmaCollectionFile[] => {
  const modes = resolveAllModes(theme);
  const light = modes.find((m) => m.mode === 'light');
  if (!light) return [];
  const rows = surfaceRows(theme);

  return SURFACE_MODES.map((mode): FigmaCollectionFile => ({
    // `color.surface` rather than `color` (#1089/#1097). The two tiers are two entries in the same
    // picker, and only one of them named its axis: `color.appearance` said which axis it switches on
    // and `color` said nothing, so the pair read as "the appearance one, and the default one" rather
    // than as two axes. The variables inside keep their `color/*` names — the DTCG path does not move.
    $collection: 'color.surface',
    $mode: mode,
    variables: rows.map((r): FigmaVar => {
      const target = mode === 'default' ? r.default : r.inverse;
      const resolved = light.roles[target];
      return {
        // Built from the row's DTCG path, in full, because that is what the name IS: this row is
        // `<root>.color.<role>` in the tree and its target is `<root>.color.appearance.<target>`.
        // Before #1097 both were assembled by hand from a `figName` call that discarded the root —
        // which meant the leading `color/` here was replacing a segment `figName` had just removed.
        name: figName(`${theme.root}.color.${r.role}`),
        resolvedType: 'COLOR',
        // ALL_SCOPES: the row stands in for whatever its target is scoped to, and a surface-context
        // binding is applied at the layer rather than picked per slot. Narrowing here would be a
        // second, weaker copy of the `color.appearance` collection's scoping, free to drift from it.
        scopes: [],
        description: `${r.role} for the ${mode} surface context — an alias into the color.appearance collection${r.default === r.inverse ? ' (no inverse counterpart: the same token is correct in both modes, see inverse-coverage.ts)' : ''}`,
        value: parseColor(resolved?.hex ?? '#000000'),
        alias: { type: 'VARIABLE_ALIAS', name: figName(`${theme.root}.color.appearance.${target}`) },
      };
    }),
  }));
};

/** Roles deliberately absent from the collection, for the emitter's summary line. */
export const surfaceOmitted = (): string[] =>
  [...INVERSE_GAP_PATHS].filter((p) => gapDisposition(p) === 'omit').sort();

/**
 * ── DEF BINDINGS THIS LAYER DOES NOT CARRY (#871's parked follow-on) ────────────────────────────
 *
 * Before #1013 a binding outside this layer was silently non-responsive: the def kept resolving
 * against a real token, it just stopped tracking the surface, with **no error anywhere**. After the
 * swap it is louder but not loud enough to go unregistered — a binding outside the layer now has to
 * NAME the appearance tier (`color.appearance.<role>`), because the plain `color.<role>` spelling is
 * this layer and resolves here. So the register's question moved with the rename: it is no longer
 * "which def-bound role has no row" but "which def reaches past this layer into the value tier."
 *
 * Measured across `componentDefs`: 57 distinct color bindings, 56 of them plain `color.<role>` paths
 * with a row here, one reaching into `color.appearance.*`.
 *
 * `test.ts` checks this BOTH directions. An unregistered binding outside the layer fails by path; an
 * entry whose path has since gained a row — or which no def binds any more — fails as stale. Neither
 * direction alone is enough, and it is the same standard `INVERSE_GAPS` is held to above: the first
 * arm stops a binding drifting out of the layer unnoticed, the second stops an entry going on
 * asserting a decision after the thing it described stopped being true.
 */
export type UnaliasedBinding = {
  /** The contract path the def binds, exactly as `ComponentDef.tokens` spells it. */
  path: string;
  /** `<def id>:<token slot>` — the binding site, so the staleness arm can find it. */
  boundBy: string;
  /** Why it sits outside the layer, and what would move it in. */
  why: string;
};

export const UNALIASED_DEF_BINDINGS: UnaliasedBinding[] = [
  {
    path: 'color.appearance.border.inverse.focus',
    boundBy: 'focus-ring:border.inverse',
    why:
      'The only inverse path any def binds, and the only def-bound path this layer cannot carry — by construction, not by omission: `isInverseRole` excludes an inverse role from being a row, because inverse-ness is what the MODES express. A `border.inverse.focus` row would have to answer what its own inverse mode is, and there is no such thing as a double inverse. ' +
      'So it is not a defect in either place. `focus-ring` declares `color: default | inverse` and binds the two ends explicitly, which was the right shape before this layer existed and is redundant after it: the row for `border.focus` already reads `default -> color.appearance.border.focus, inverse -> color.appearance.border.inverse.focus`, so a ring binding the plain path gets the SAME two values from the frame mode that the variant gets from a coordinate. ' +
      'Removing the binding therefore costs no value and no token — the path stays emitted and stays contract-guaranteed; only this def stops naming it. What it costs is the axis: `color` is the ring\'s ONLY variant axis, and `figmaProperties.variantAxes` must be non-empty (measured against `figmaPropertyErrors`, which rejects `[]` outright), so dropping it un-projects the def — regressing #795 and breaking the five hosts that resolve `nests: \'focus-ring\'` by name. That prerequisite is a schema decision, not a binding edit — filed as #1028 — which is why this entry exists instead of the removal, and why the staleness arm matters more than the coverage arm: this entry is meant to die. ' +
      '#1013 moved the path rather than the argument: the def now names `color.appearance.border.inverse.focus`, because after the swap the plain `color.border.inverse.focus` spelling would be a name this layer does not emit. Nothing above changes.',
  },
];

/** Every path registered as sitting outside this layer. */
export const UNALIASED_PATHS: ReadonlySet<string> = new Set(UNALIASED_DEF_BINDINGS.map((b) => b.path));
