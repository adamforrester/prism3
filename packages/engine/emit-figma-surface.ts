/**
 * Prism3 engine — the `color.surface` Figma collection: the POINTER TIER (#893, #871, #1013, #1133).
 *
 * A SINGLE-MODE collection with **no colors of its own**. Every row is an alias into the
 * `color.appearance` collection, so a designer binds the short `color/text/primary` and the appearance
 * mode on `color.appearance` picks the value one hop later.
 *
 * ── IT HAD A SECOND MODE, AND #1133 TOOK IT BACK OFF ────────────────────────────────────────────
 *
 * From #893 until #1133 the collection carried two modes, `default` and `inverse`, and switching the
 * mode on an ancestor frame flipped a whole subtree to its inverse-context values. That is reverted.
 * Inverse is **name-encoded** again — a bounded set of components declares an inverse variant and binds
 * `color.appearance.*.inverse.*` by name, the shape `focus-ring` has shipped all along.
 *
 * The reasoning is in `docs/20` §9.8, and the short version is that mode-encoding only pays if you flip
 * EVERYTHING: #1128 measured 112 of 128 roles flipping, which is the number that makes a mode look
 * obviously right, and the requirement is not a full-region flip. It is a bounded set of inverse atomic
 * elements plus inverse variants of page-level blocks. No surveyed system ships an inverse mode or
 * collection (Carbon, Material 3, Fluent, Atlassian all name it), and a bounded set is exactly what a
 * name expresses and a mode cannot: a mode applies to every row in the collection or none.
 *
 * What the revert does NOT touch, because none of it was about inverse:
 *   · the appearance tier and its four modes, INCLUDING every inverse leaf — those are the values the
 *     component variants bind, and they are the point of the whole model.
 *   · the two-tier split itself (#1082/#1013). Its justification is appearance-INDEPENDENCE — a
 *     consumer binds one stable short name and never resolves an appearance mode — and that argument
 *     never mentioned inverse. The collection is single-mode now, which is what a pure indirection tier
 *     should have been.
 *   · the collection NAME. `.surface` was earned in #1089 by naming a second axis, and that rationale
 *     is genuinely weaker with one mode; it is kept anyway, argued in `docs/20` §9.8, because renaming
 *     it costs a `COLLECTION_RENAMES` entry that re-creates the chain #1097 removed and re-opens the
 *     era ambiguity that already makes `color → color.surface` an entry the map refuses to hold.
 *
 * ── WHY IT IS A POINTER TIER AND NOT A FOURTH COLOR SET ─────────────────────────────────────────
 *
 * It stores POINTERS, not values, and that is the whole economic argument. The same row resolves to
 * `rgb(207,11,44)` in nb and `#007cbb` in aurora because the values live in the `color.appearance`
 * collection where they already are. So the collection is authored ONCE and shared by every brand: it
 * does not grow with brands, and it does not grow with appearance modes.
 *
 * That second property was measured end-to-end for #1013 and it is what made the tier safe to carry
 * into DTCG: over 128 rows × 4 appearances × 5 corpus brands, a POINTER-carrying projection agrees with
 * the appearance tier in 2560 of 2560 cells, where a VALUE-carrying one disagrees in 1510. Composition
 * is a property of the pointer, not of the axes. **This is the measurement that survives #1133 intact**
 * — it is about pointers versus values, not about how many modes the pointer collection has.
 *
 * The recipe, so the numbers are reproducible rather than folkloric: resolve each alias row in each
 * appearance mode and compare with the appearance tier's own value for that mode; the counterfactual
 * bakes the row's `light` value and compares the same way. The pointer column is 100% by construction
 * — that IS the finding, since the construction is what the tier chose.
 *
 * ── DTCG CARRIES THIS TIER, PATH FOR PATH ───────────────────────────────────────────────────────
 *
 * Before #1013 this collection was Figma-only. It is not any more: `tree.ts` emits the same rows as the
 * DTCG `color.*` tier, so `color.background.primary` is an alias into `color.appearance.background.primary`
 * in both formats and the two stay reconcilable. With one mode on each side of that pairing there is
 * nothing left for DTCG to be missing — which is what #1129 was open about and what #1133 closed by
 * removing the second mode rather than by projecting it.
 *
 * ── THE ROLES WITH NO INVERSE COUNTERPART ───────────────────────────────────────────────────────
 *
 * Seventeen appearance roles have none, and they are registered with a reason in `inverse-coverage.ts`
 * — which is where to read the count, not here: it was written as eleven and went stale when #1030's six
 * `veil.*` roles joined the register, because nothing ties this sentence to `INVERSE_GAPS`.
 * That register no longer decides anything HERE — membership is uniform, every non-inverse role gets a
 * row — because a single-mode row never has to answer "and on an inverse ground?". What the register
 * bounds now is which components can declare an inverse variant at all, which is the question #1133
 * makes central. `test.ts` checks it both directions, so a gap cannot appear silently.
 *
 * The row DERIVATION lives in `surface-rows.ts`, not here, because `tree.ts` needs it too and two
 * derivations of "which roles get a pointer" would be two expressions of one fact. Re-exported below so
 * every existing importer of this module is unchanged.
 *
 * PURE — no `node:*`, no I/O. The shell in `emit-figma.ts` writes the file.
 */
import { Theme } from './theme';
import { resolveAllModes } from './modes';
import type { FigmaCollectionFile, FigmaVar } from './emit-figma-color';
import { figName, parseColor } from './emit-figma-color';
import { surfaceRows } from './surface-rows';

export { isInverseRole, type SurfaceRow, surfaceRows, surfaceRowsFor } from './surface-rows';

/**
 * Build the collection. Every variable carries `alias` — its target — and a `value` that is the
 * target's RESOLVED color, so a consumer that cannot follow aliases still renders correctly (the same
 * fallback contract every other emitted collection holds).
 *
 * Returns an ARRAY of one rather than a bare file, so `if (!light) return []` stays the guard it always
 * was and `emit-figma.ts` keeps looping instead of gaining an `undefined` branch.
 */
export const buildFigmaSurface = (theme: Theme): FigmaCollectionFile[] => {
  const modes = resolveAllModes(theme);
  const light = modes.find((m) => m.mode === 'light');
  if (!light) return [];
  const rows = surfaceRows(theme);

  return [{
    // `color.surface` rather than `color` (#1089/#1097/#1133). The suffix was earned by naming a second
    // axis and that axis is gone, so it is now the weaker claim that this is one tier of an explicitly
    // two-tier pair. Kept regardless: `color` named the VALUE tier before #1082 and would name the
    // POINTER tier after a revert, `COLLECTION_RENAMES` has no era to tell those apart, and the entry
    // would re-create the chain #1097 removed. Argued in full in `docs/20` §9.8.
    $collection: 'color.surface',
    // `Default`, capitalized, exactly like the twelve other single-mode collections — Figma requires a
    // mode name and this is the one prism3 uses. It is also what `AXIS_MODEL.none.baseMember` says, so
    // classifying this collection `none` in `axes.ts` is now literally true rather than approximately.
    $mode: 'Default',
    variables: rows.map((r): FigmaVar => {
      const resolved = light.roles[r.role];
      return {
        // Built from the row's DTCG path, in full, because that is what the name IS: this row is
        // `<root>.color.<role>` in the tree and its target is `<root>.color.appearance.<role>`.
        // Before #1097 both were assembled by hand from a `figName` call that discarded the root —
        // which meant the leading `color/` here was replacing a segment `figName` had just removed.
        name: figName(`${theme.root}.color.${r.role}`),
        resolvedType: 'COLOR',
        // ALL_SCOPES: the row stands in for whatever its target is scoped to, and a pointer is applied
        // wherever its target could be. Narrowing here would be a second, weaker copy of the
        // `color.appearance` collection's scoping, free to drift from it.
        scopes: [],
        description: `${r.role} — a pointer into the color.appearance collection, where the appearance mode picks the value`,
        value: parseColor(resolved?.hex ?? '#000000'),
        alias: { type: 'VARIABLE_ALIAS', name: figName(`${theme.root}.color.appearance.${r.role}`) },
      };
    }),
  }];
};

/**
 * ── DEF BINDINGS THIS LAYER DOES NOT CARRY (#871's parked follow-on) ────────────────────────────
 *
 * A binding outside this layer has to NAME the appearance tier (`color.appearance.<role>`), because the
 * plain `color.<role>` spelling is this layer and resolves here. So the register's question is "which
 * def reaches past the pointer tier into the value tier", and every such reach should be a decision
 * somebody made rather than a name that drifted.
 *
 * #1133 did not shrink this register's job, it broadened what an entry can mean. Under mode-encoding a
 * reach past this layer was a def that had lost its surface-responsiveness. Under name-encoding it is a
 * def binding an inverse leaf ON PURPOSE — which is the whole model — so an entry now records a
 * deliberate name-encoded inverse binding, and the staleness arm is what stops that reading being
 * assumed for a binding nobody argued.
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
      'The only inverse path any def binds, and the only def-bound path this layer cannot carry — by construction, not by omission: `isInverseRole` excludes an inverse role from being a row, because an inverse role is bound BY NAME at the appearance tier. A `color.border.inverse.focus` pointer would be a second short spelling for a leaf whose whole point is that the component names it deliberately. ' +
      '#1133 TURNED THIS ENTRY FROM AN EXCEPTION INTO THE TEMPLATE, and that is the one substantive change to this note since #1013. It used to read as a def that had missed out on surface-responsiveness and was waiting for #1028 to let it be deleted: the pointer row for `border.focus` carried `default -> color.appearance.border.focus, inverse -> color.appearance.border.inverse.focus`, so the frame mode gave a ring binding the plain path the same two values the variant got from a coordinate, and the explicit binding was redundant. ' +
      'With the surface mode reverted there is no frame mode to get them from, so the redundancy is gone and the explicit binding is the ONLY way a ring on a dark band gets the right edge. `focus-ring` declares `color: default | inverse` and binds the two ends by name — precisely the bounded, name-encoded shape #1133 chose for every inverse component — so this entry is no longer meant to die. #1028 (making `figmaProperties.variantAxes` accept an empty axis list, which is what deleting the binding would have needed, since `color` is the ring\'s only variant axis and `figmaPropertyErrors` rejects `[]` outright) stops being a prerequisite for anything here. ' +
      'It stays REGISTERED rather than being dropped from the register, because the register\'s arms are what distinguish this from a binding nobody argued: the coverage arm fails an unregistered reach into the value tier, and the staleness arm fails this entry if `focus-ring` stops naming the path. What changed is the expectation — the staleness arm now guards a binding meant to persist rather than announcing one meant to be removed.',
  },
];

/** Every path registered as sitting outside this layer. */
export const UNALIASED_PATHS: ReadonlySet<string> = new Set(UNALIASED_DEF_BINDINGS.map((b) => b.path));
