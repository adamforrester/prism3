/**
 * Prism3 Figma plugin — the OPT-IN PRUNE detector + executor (#1521).
 *
 * A re-emit ADDS and UPDATES but never DELETES: `applyWritePlan` / `applyFloatPlan` /
 * `applyVarCollectionPlan` are create-or-update-by-name, and `applyTextStylePlan` is add-or-overwrite,
 * so a config that emits FEWER items (lower `typography.displayCeiling` drops the `2xl`/`3xl` display
 * rungs) leaves the dropped styles and variables sitting in the file. #479 / #1152 chose to REPORT that
 * drift and never delete it, because a re-emit runs after every knob change and blind-deleting on one
 * cannot tell a stale engine ghost from a variable a designer hand-bound. This module is the other half
 * the owner asked for in #1521: an EXPLICIT, opt-in delete the designer triggers with the count in front
 * of them, so the #479 / #1152 rule ("never blind-delete") holds — the user is accepting the action.
 *
 * ── WHAT IT DELETES, AND THE NAMESPACE THAT KEEPS IT SAFE ─────────────────────────────────────────
 *
 * Nothing new is scanned: the detector REUSES `orphansOf` and `strandedCollections` from `write-figma.ts`
 * — the same set subtractions the executors' reports are built on — and adds one guard, the engine's own
 * emitted NAMESPACE, so a hand-added item can never be swept up:
 *
 *   • VARIABLES — an `orphansOf` orphan (present in a plan-owned collection, absent from the plan)
 *     RESTRICTED to names carrying the brand root (`rootOf(name) === root`). A designer's hand-added
 *     variable in the `color` collection named `my-brand/x` is reported by `orphansOf` too, and this is
 *     what spares it: it is not in the engine's `<root>/…` namespace.
 *   • STRANDED COLLECTIONS — a `strandedCollections` result (no plan owns it) that is NON-EMPTY and whose
 *     every variable is in the brand-root namespace. `color.surface` left by #1148 (all `<root>/color/…`
 *     variables) prunes; a hand-made "My Tokens" collection holding `my-brand/…` variables does not, and
 *     an empty collection does not — its provenance cannot be read from a name that is not there.
 *   • TEXT STYLES — an `orphansOf` orphan whose TOP-LEVEL GROUP the plan still emits. Text styles carry
 *     NEITHER the brand root NOR the `core` tier (`figma-names.ts` header, `test-write-typography.ts`) —
 *     they are `display/2xl`, what a designer browses by hand — so the root guard cannot apply. Their
 *     namespace is the set of groups the plan emits: a dropped `display/2xl` shares the `display` group
 *     with the surviving `display/xl`, so it prunes; a hand-added `Marketing/Hero` shares no group with
 *     the plan and is left. Lowering the ceiling to drop the WHOLE `display` group therefore prunes
 *     nothing there — the conservative direction, and #1521's named case (a partial drop) is covered.
 *
 * The three sets are disjoint: variable orphans are only sought inside plan-OWNED collections, and a
 * stranded collection is by definition one no plan owns, so a name is never both a pruned variable and a
 * member of a pruned collection.
 *
 * ── PURE DETECTION, THIN EXECUTOR ─────────────────────────────────────────────────────────────────
 *
 * `computePrunePlan` is pure over plain snapshots (no `figma.*`), so the whole namespace policy is
 * unit-testable against `test-prune.ts` with no live Figma — and a mutation that drops a guard fails a
 * named assertion (docs/34). `applyPrunePlan` is the executor: it matches the plan's names against the
 * live objects and calls `.remove()`, recording (never throwing) any name it cannot find. The caller
 * (`main.ts`) recomputes the plan from a fresh read on APPLY rather than trusting a list posted back from
 * the UI, so the delete acts on the file's current orphan set, not a stale preview.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. Like `write-figma.ts`, the delete
 * surface is declared as a minimal port so the executor is drivable against an in-memory shim.
 */
import { orphansOf, strandedCollections } from './write-figma';
import { rootOf } from '@prism3/engine/figma-names';

/** A collection in the file, reduced to what the detector needs: its name and the names of the
 *  variables it holds. */
export interface FileCollection {
  name: string;
  variableNames: string[];
}

/** The snapshot `computePrunePlan` reasons over — the file on one side, the current plan on the other. */
export interface PruneInput {
  /** Every variable collection in the file, each with the names of the variables it holds. */
  collections: FileCollection[];
  /** Every local text-style name in the file. */
  textStyles: string[];
  /** Every variable name the current plan emits, across all collections — the live members of the
   *  engine namespace. A name in a plan-owned collection that is NOT here is an orphan. */
  plannedVariables: Iterable<string>;
  /** The collection names the current plan writes. An orphan can only live inside one of these; a
   *  collection outside them is a stranded-collection candidate instead. */
  plannedCollections: Iterable<string>;
  /** Every text-style name the current plan emits. */
  plannedTextStyles: Iterable<string>;
  /** The brand root every emitted variable name carries (`rootOf` of any planned name). Empty disables
   *  the variable + stranded-collection arms entirely: with no root, nothing is in-namespace, so the
   *  namespace guard prunes nothing rather than guessing. */
  root: string;
}

/** What a prune would remove — the orphaned variables per plan-owned collection, the stranded
 *  collections to delete whole, and the orphaned text styles. Every entry is already namespace-filtered,
 *  so the executor deletes exactly this and asks no further questions. */
export interface PrunePlan {
  variables: { collection: string; names: string[] }[];
  collections: string[];
  textStyles: string[];
}

/** The engine-namespace test for a VARIABLE or a collection MEMBER: it carries the brand root. `root`
 *  empty is `false` for everything — the deliberate "prune nothing" when no root is known. */
const inRoot = (name: string, root: string): boolean => root !== '' && rootOf(name) === root;

/** The TOP-LEVEL group of a text-style name (`display/2xl` → `display`, `Heading` → `Heading`). Text
 *  styles carry no brand root, so their namespace is the group the plan emits — see the header. */
const styleGroup = (name: string): string => name.split('/')[0] ?? '';

/**
 * Compute what an opt-in prune would remove — pure, namespace-guarded, reusing `orphansOf` and
 * `strandedCollections`. See the module header for the three arms and why each guard is what it is.
 */
export const computePrunePlan = (input: PruneInput): PrunePlan => {
  const { root } = input;
  const plannedVars = new Set(input.plannedVariables);
  const ownedCollections = new Set(input.plannedCollections);

  // VARIABLES — orphans inside a plan-owned collection, restricted to the engine namespace. `orphansOf`
  // is the exact subtraction the executors' orphan reports use; the `inRoot` filter is the only addition,
  // and it is what leaves a hand-added foreign-root variable alone.
  const variables: PrunePlan['variables'] = [];
  for (const c of input.collections) {
    if (!ownedCollections.has(c.name)) continue;
    const orphans = orphansOf(c.variableNames, plannedVars).filter((n) => inRoot(n, root));
    if (orphans.length) variables.push({ collection: c.name, names: orphans });
  }

  // STRANDED COLLECTIONS — no plan owns them, and every variable they hold is in-namespace. Empty ones
  // are left (no name to read provenance from); a foreign variable anywhere in one spares the whole
  // collection, because deleting it would take that hand-added variable with it.
  const byName = new Map(input.collections.map((c) => [c.name, c] as const));
  const collections = strandedCollections(
    input.collections.map((c) => c.name),
    ownedCollections,
  ).filter((name) => {
    const c = byName.get(name);
    return !!c && c.variableNames.length > 0 && c.variableNames.every((n) => inRoot(n, root));
  });

  // TEXT STYLES — orphans whose top-level group the plan still emits. Reuses `orphansOf` over the style
  // names; the group filter is the namespace guard (there is no root on a style name).
  const plannedStyles = [...input.plannedTextStyles];
  const plannedGroups = new Set(plannedStyles.map(styleGroup));
  const textStyles = orphansOf(input.textStyles, plannedStyles).filter((n) => plannedGroups.has(styleGroup(n)));

  return { variables, collections, textStyles };
};

/** Total items a prune plan would remove — the count shown to the designer before they confirm. */
export const prunePlanCount = (p: PrunePlan): number =>
  p.variables.reduce((n, g) => n + g.names.length, 0) + p.collections.length + p.textStyles.length;

/* ── the executor ─────────────────────────────────────────────────────────────────────────────── */

/** The minimal live-object surface the executor deletes through — declared as a port so the Node
 *  harness can drive `applyPrunePlan` against a shim, the same way `VariablesApi` lets `applyWritePlan`
 *  run with no real Figma. The real `Variable` / `VariableCollection` / `TextStyle` each carry a
 *  `remove()` and structurally satisfy these. */
export interface RemovableVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  remove(): void;
}
export interface RemovableCollection {
  id: string;
  name: string;
  remove(): void;
}
export interface RemovableStyle {
  name: string;
  remove(): void;
}
export interface PruneApi {
  getLocalVariableCollectionsAsync(): Promise<RemovableCollection[]>;
  getLocalVariablesAsync(): Promise<RemovableVariable[]>;
  getLocalTextStylesAsync(): Promise<RemovableStyle[]>;
}

/** What the prune executor removed — counts per kind, plus any named item it could not find live. */
export interface PruneResult {
  variables: number;
  collections: number;
  textStyles: number;
  /** Names the plan asked to remove that were not present in the live read — empty when the plan was
   *  computed from the same file state (the normal path). Recorded, never thrown, so a race that dropped
   *  a name between compute and apply is reported rather than silent. */
  misses: string[];
}

/**
 * Delete exactly what `plan` names, and nothing else. Variables are matched by (collection name,
 * variable name) — a plan-owned collection name is unique in an engine-written file — stranded
 * collections by name (which removes their variables with them, so those are never deleted twice), and
 * text styles by name. A name the plan carries but the file no longer holds is recorded in `misses`.
 */
export const applyPrunePlan = async (plan: PrunePlan, api: PruneApi): Promise<PruneResult> => {
  const collections = await api.getLocalVariableCollectionsAsync();
  const vars = await api.getLocalVariablesAsync();
  const styles = await api.getLocalTextStylesAsync();
  const misses: string[] = [];

  // Orphan variables, scoped to their own collection by id so a name shared across collections can't
  // cross-delete.
  const collByName = new Map(collections.map((c) => [c.name, c] as const));
  let variables = 0;
  for (const grp of plan.variables) {
    const coll = collByName.get(grp.collection);
    if (!coll) {
      for (const n of grp.names) misses.push(`var:${grp.collection}/${n}`);
      continue;
    }
    const want = new Set(grp.names);
    const found = new Set<string>();
    for (const v of vars) {
      if (v.variableCollectionId === coll.id && want.has(v.name)) {
        v.remove();
        found.add(v.name);
        variables++;
      }
    }
    for (const n of grp.names) if (!found.has(n)) misses.push(`var:${grp.collection}/${n}`);
  }

  // Stranded collections — the whole collection, its variables with it.
  const strand = new Set(plan.collections);
  let collectionsRemoved = 0;
  for (const c of collections) {
    if (strand.has(c.name)) {
      c.remove();
      collectionsRemoved++;
    }
  }
  const presentCollections = new Set(collections.map((c) => c.name));
  for (const name of plan.collections) if (!presentCollections.has(name)) misses.push(`collection:${name}`);

  // Orphan text styles, by name.
  const wantStyles = new Set(plan.textStyles);
  const foundStyles = new Set<string>();
  let textStyles = 0;
  for (const s of styles) {
    if (wantStyles.has(s.name)) {
      s.remove();
      foundStyles.add(s.name);
      textStyles++;
    }
  }
  for (const n of plan.textStyles) if (!foundStyles.has(n)) misses.push(`style:${n}`);

  return { variables, collections: collectionsRemoved, textStyles, misses };
};

/* ── prose (shipped in the plugin bundle; voice-standard applies) ────────────────────────────────── */

/** Non-zero count parts, in the order a designer reads them, e.g. `2 text styles, 1 variable`. */
const parts = (textStyles: number, variables: number, collections: number): string =>
  [
    [textStyles, 'text style'] as const,
    [variables, 'variable'] as const,
    [collections, 'collection'] as const,
  ]
    .filter(([n]) => n > 0)
    .map(([n, noun]) => `${n} ${noun}${n === 1 ? '' : 's'}`)
    .join(', ');

/**
 * The review text shown before a prune runs — the count, the scope, and the consequence, per the voice
 * standard's Destructive tone (name the consequence and its scope). Recessive: it states what the delete
 * touches and, as importantly, what it leaves.
 */
export const prunePreviewSummary = (p: PrunePlan): string => {
  const vars = p.variables.reduce((n, g) => n + g.names.length, 0);
  const count = prunePlanCount(p);
  if (count === 0) {
    return 'No stale items — every text style, variable and collection in this file is in the current plan.';
  }
  const one = count === 1;
  return (
    `${parts(p.textStyles.length, vars, p.collections.length)} ${one ? 'is' : 'are'} in this file but not in ` +
    `the current plan, all within this theme's namespace. Deleting ${one ? 'it' : 'them'} also removes any ` +
    `bindings made to ${one ? 'it' : 'them'}; anything outside the namespace is left in place.`
  );
};

/** The verdict text after a prune runs — what was removed, in the file's terms (no congratulation). */
export const pruneAppliedSummary = (r: PruneResult): string => {
  const total = r.variables + r.collections + r.textStyles;
  if (total === 0) return 'Nothing removed — the file held no stale items in this theme’s namespace.';
  const missNote = r.misses.length ? ` ${r.misses.length} named item${r.misses.length === 1 ? '' : 's'} could not be found.` : '';
  return `Removed ${total} stale item${total === 1 ? '' : 's'}: ${parts(r.textStyles, r.variables, r.collections)}.${missNote}`;
};
