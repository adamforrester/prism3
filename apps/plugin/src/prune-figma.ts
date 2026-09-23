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
 *   • STYLES, all four kinds — an `orphansOf` orphan whose TOP-LEVEL GROUP the plan still emits. Styles
 *     carry NEITHER the brand root NOR the `core` tier (`figma-names.ts` header,
 *     `test-write-typography.ts`) — they are `display/2xl`, `shadow/lg`, `gradient/brand`, `Grid / xs`,
 *     what a designer browses by hand — so the root guard cannot apply. Their namespace is the set of
 *     groups the plan emits, PER KIND: a dropped `display/2xl` shares the `display` group with the
 *     surviving `display/xl`, so it prunes; a hand-added `Marketing/Hero` shares no group with the plan
 *     and is left. Dropping the WHOLE `display` group therefore prunes nothing there — the conservative
 *     direction. Per kind matters because the four namespaces are independent: a paint style called
 *     `shadow/x` is not in the effect plan's namespace just because the effect plan emits `shadow/*`.
 *   • MODES of a plan-owned collection — every mode `claimModes` (in `write-figma.ts`) does NOT claim,
 *     when the plan claims at least one. This is the #1570 arm, and it is the most destructive of the
 *     four, so it is also the only one whose items are NAMED in the preview text rather than counted:
 *     removing a mode drops that mode's value from every variable in the collection. Two guards, both
 *     load-bearing. The collection must be PLAN-OWNED (a stranded collection is offered whole, modes
 *     included, by the arm above). And the plan must be PRESENT in it — at least one claim — which does
 *     two jobs at once: it refuses to judge the modes of a collection this plan has never written, and it
 *     guarantees a survivor, since Figma refuses to remove a collection's last mode.
 *
 *     **The residual, stated rather than defended.** A mode has no provenance to read. A variable carries
 *     the brand root and a style carries its group, but a mode carries a bare name, so a mode a designer
 *     added by hand to a plan-owned collection (a `print` mode in `color`) is indistinguishable from one
 *     the engine emitted and then stopped emitting — and it WILL be offered. There is no narrower guard
 *     available: the engine's own mode vocabulary is brand-configurable (the breakpoint ladder IS the
 *     `layout` mode set), so "a name the engine could emit" is not a smaller set than "a name this plan
 *     does not emit". What the design does instead is make it legible: every mode is named in the review
 *     sentence, per collection, so the designer reads `layout → xs, lg, xl, 2xl` and cancels if one of
 *     those is theirs. Opt-in with the names in front of them is the same bargain the other three arms
 *     strike with a count.
 *
 * The four sets are disjoint: variable orphans and stale modes are only sought inside plan-OWNED
 * collections, and a stranded collection is by definition one no plan owns, so nothing is ever both a
 * pruned item and a member of a pruned collection.
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
import { orphansOf, strandedCollections, claimModes } from './write-figma';
import type { VarMode } from './write-figma';
import { rootOf } from '@prism3/engine/figma-names';

/** The four Figma style surfaces the engine writes, each its own API and its own namespace. `text` is
 *  `figma.getLocalTextStylesAsync`, `effect`/`paint` are `write-styles.ts`'s pair, `grid` is #1480's
 *  `createGridStyle`. Ordered as a designer reads them, and iterated in this order everywhere so a plan
 *  and a summary built from it agree. */
export type StyleKind = 'text' | 'effect' | 'paint' | 'grid';
export const STYLE_KINDS: readonly StyleKind[] = ['text', 'effect', 'paint', 'grid'];

/** Names per style kind — the file's on one side of the detector, the plan's on the other. */
export type StyleNames = Record<StyleKind, string[]>;

/** A collection in the file, reduced to what the detector needs: its name, the names of the variables it
 *  holds, and its MODES. The modes carry `modeId` as well as `name` because a name is not a key here —
 *  #1570 left files holding two modes called `sm`, only one of which any name-keyed writer can reach. */
export interface FileCollection {
  name: string;
  variableNames: string[];
  modes: VarMode[];
}

/** The modes one collection's plan declares. Given per plan rather than per collection because a
 *  collection can be written by more than one executor in a single apply — `core` is reconciled by the
 *  palette, float and font passes, and the font pass may declare modes the float pass does not — so
 *  `computePrunePlan` UNIONS every entry naming the same collection. A caller passing one plan's entry
 *  and omitting another's would offer that other plan's modes for deletion. */
export interface PlannedModes {
  collection: string;
  modes: string[];
}

/** The snapshot `computePrunePlan` reasons over — the file on one side, the current plan on the other. */
export interface PruneInput {
  /** Every variable collection in the file, each with its variables' names and its modes. */
  collections: FileCollection[];
  /** Every local style name in the file, per kind. */
  styles: StyleNames;
  /** Every variable name the current plan emits, across all collections — the live members of the
   *  engine namespace. A name in a plan-owned collection that is NOT here is an orphan. */
  plannedVariables: Iterable<string>;
  /** The collection names the current plan writes. An orphan can only live inside one of these; a
   *  collection outside them is a stranded-collection candidate instead. */
  plannedCollections: Iterable<string>;
  /** Every style name the current plan emits, per kind. */
  plannedStyles: StyleNames;
  /** The modes the plan declares, per collection — unioned across entries. A collection with no entry
   *  (or an empty one) has NO mode pruned: no declaration is no knowledge, the same posture an empty
   *  `root` takes for variables. */
  plannedModes: PlannedModes[];
  /** The brand root every emitted variable name carries (`rootOf` of any planned name). Empty disables
   *  the variable + stranded-collection arms entirely: with no root, nothing is in-namespace, so the
   *  namespace guard prunes nothing rather than guessing. */
  root: string;
}

/** What a prune would remove — the orphaned variables per plan-owned collection, the stranded
 *  collections to delete whole, the stale modes per plan-owned collection, and the orphaned styles per
 *  kind. Every entry is already namespace-filtered, so the executor deletes exactly this and asks no
 *  further questions. Modes carry their `modeId`, which is what the executor removes by: with a
 *  duplicate name present, a name cannot say which copy is the stale one. */
export interface PrunePlan {
  variables: { collection: string; names: string[] }[];
  collections: string[];
  modes: { collection: string; modes: VarMode[] }[];
  styles: { kind: StyleKind; names: string[] }[];
}

/** The engine-namespace test for a VARIABLE or a collection MEMBER: it carries the brand root. `root`
 *  empty is `false` for everything — the deliberate "prune nothing" when no root is known. */
const inRoot = (name: string, root: string): boolean => root !== '' && rootOf(name) === root;

/** The TOP-LEVEL group of a style name (`display/2xl` → `display`, `Heading` → `Heading`). Styles carry
 *  no brand root, so their namespace is the group the plan emits — see the header.
 *
 *  DELIBERATELY NOT TRIMMED. The grid emitter writes its separator with spaces (`Grid / xs`, #1480), so
 *  this yields `Grid ` there — and that is fine, because BOTH sides of the comparison come from the same
 *  emitter and match. Trimming was in the first draft of this function and a mutation proved it changed
 *  nothing on the engine's own names; where it DID change something was the conservative direction, and
 *  the wrong way round: with a trim, a designer's hand-made `Grid/wide` falls into the emitter's `Grid `
 *  namespace and gets offered for deletion. Untrimmed it does not. Pinned by name in `test-prune.ts`.
 *
 *  The cost is real and measured, not hypothetical: the live test file holds a `Grid/xs` carrying the
 *  engine's own description — an emitted style someone renamed — and this rule leaves it behind. Filed as
 *  #1577 rather than fixed here, because the fix is a provenance namespace (a style's `description`) and a
 *  decision about whether a designer's rename is drift, not a character class. */
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

  // MODES — every mode of a plan-owned collection the plan does not CLAIM (`claimModes`, the writer's own
  // rule, so the detector and the executor that writes modes cannot disagree about which copy survives).
  // Two guards: plan-owned, and the plan actually present here (≥1 claim) — which both refuses to judge a
  // collection this plan never wrote and guarantees the survivor Figma requires. See the header's residual.
  const plannedModesBy = new Map<string, Set<string>>();
  for (const pm of input.plannedModes) {
    const set = plannedModesBy.get(pm.collection) ?? new Set<string>();
    for (const m of pm.modes) set.add(m);
    plannedModesBy.set(pm.collection, set);
  }
  const modes: PrunePlan['modes'] = [];
  for (const c of input.collections) {
    if (!ownedCollections.has(c.name)) continue;
    const declared = plannedModesBy.get(c.name);
    if (!declared || declared.size === 0) continue;
    const claimed = new Set(claimModes(c.modes, [...declared]).values());
    if (claimed.size === 0) continue;
    const stale = c.modes.filter((m) => !claimed.has(m.modeId));
    if (stale.length) modes.push({ collection: c.name, modes: stale });
  }

  // STYLES — per kind, orphans whose top-level group that kind's plan still emits. Reuses `orphansOf`
  // over the style names; the group filter is the namespace guard (there is no root on a style name).
  const styles: PrunePlan['styles'] = [];
  for (const kind of STYLE_KINDS) {
    const planned = input.plannedStyles[kind] ?? [];
    const plannedGroups = new Set(planned.map(styleGroup));
    const orphans = orphansOf(input.styles[kind] ?? [], planned).filter((n) => plannedGroups.has(styleGroup(n)));
    if (orphans.length) styles.push({ kind, names: orphans });
  }

  return { variables, collections, modes, styles };
};

/** Total items a prune plan would remove — the count shown to the designer before they confirm. */
export const prunePlanCount = (p: PrunePlan): number =>
  p.variables.reduce((n, g) => n + g.names.length, 0) +
  p.collections.length +
  p.modes.reduce((n, g) => n + g.modes.length, 0) +
  p.styles.reduce((n, g) => n + g.names.length, 0);

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
  /** Read to resolve a planned `modeId` against the live collection, so a mode that has already gone is a
   *  recorded miss rather than a throw. */
  modes: VarMode[];
  removeMode(modeId: string): void;
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
  getLocalEffectStylesAsync(): Promise<RemovableStyle[]>;
  getLocalPaintStylesAsync(): Promise<RemovableStyle[]>;
  getLocalGridStylesAsync(): Promise<RemovableStyle[]>;
}

/** What the prune executor removed — counts per kind, plus any named item it could not find live. */
export interface PruneResult {
  variables: number;
  collections: number;
  modes: number;
  styles: number;
  /** Names the plan asked to remove that were not present in the live read — empty when the plan was
   *  computed from the same file state (the normal path). Recorded, never thrown, so a race that dropped
   *  a name between compute and apply is reported rather than silent. */
  misses: string[];
}

/**
 * Delete exactly what `plan` names, and nothing else. Variables are matched by (collection name,
 * variable name) — a plan-owned collection name is unique in an engine-written file — stranded
 * collections by name (which removes their variables with them, so those are never deleted twice), modes
 * by (collection name, modeId), and styles by name within their own kind. A name the plan carries but the
 * file no longer holds is recorded in `misses`.
 *
 * MODES ARE REMOVED FIRST, before the stranded collections. The two sets are disjoint by construction
 * (the detector only proposes modes inside plan-owned collections), so the order changes no outcome — but
 * it keeps the destructive-and-narrow step ahead of the destructive-and-wide one, so a throw in the
 * collection sweep cannot leave a half-reconciled mode set behind it.
 */
export const applyPrunePlan = async (plan: PrunePlan, api: PruneApi): Promise<PruneResult> => {
  const collections = await api.getLocalVariableCollectionsAsync();
  const vars = await api.getLocalVariablesAsync();
  const stylesByKind: Record<StyleKind, RemovableStyle[]> = {
    text: await api.getLocalTextStylesAsync(),
    effect: await api.getLocalEffectStylesAsync(),
    paint: await api.getLocalPaintStylesAsync(),
    grid: await api.getLocalGridStylesAsync(),
  };
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

  // Stale modes, by modeId inside their own collection. Resolved against the live mode list rather than
  // removed blind, so a mode that has already gone is a miss (named by its NAME, which is what a designer
  // recognises) instead of a throw out of Figma's `removeMode`.
  let modesRemoved = 0;
  for (const grp of plan.modes) {
    const coll = collByName.get(grp.collection);
    if (!coll) {
      for (const m of grp.modes) misses.push(`mode:${grp.collection}/${m.name}`);
      continue;
    }
    for (const m of grp.modes) {
      if (!coll.modes.some((x) => x.modeId === m.modeId)) { misses.push(`mode:${grp.collection}/${m.name}`); continue; }
      coll.removeMode(m.modeId);
      modesRemoved++;
    }
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

  // Orphan styles, by name WITHIN their kind — a `shadow/lg` effect style and a `shadow/lg` paint style
  // are two different objects on two different APIs, so the kind is part of the key.
  let stylesRemoved = 0;
  for (const grp of plan.styles) {
    const want = new Set(grp.names);
    const found = new Set<string>();
    for (const s of stylesByKind[grp.kind] ?? []) {
      if (want.has(s.name)) {
        s.remove();
        found.add(s.name);
        stylesRemoved++;
      }
    }
    for (const n of grp.names) if (!found.has(n)) misses.push(`${grp.kind}-style:${n}`);
  }

  return { variables, collections: collectionsRemoved, modes: modesRemoved, styles: stylesRemoved, misses };
};

/* ── prose (shipped in the plugin bundle; voice-standard applies) ────────────────────────────────── */

/** Non-zero count parts, in the order a designer reads them, e.g. `2 styles, 1 mode, 1 variable`. */
const parts = (styles: number, modes: number, variables: number, collections: number): string =>
  [
    [styles, 'style'] as const,
    [modes, 'mode'] as const,
    [variables, 'variable'] as const,
    [collections, 'collection'] as const,
  ]
    .filter(([n]) => n > 0)
    .map(([n, noun]) => `${n} ${noun}${n === 1 ? '' : 's'}`)
    .join(', ');

/**
 * The modes a prune would remove, NAMED per collection — the one arm whose items are spelled out rather
 * than counted, because a mode carries no provenance (see the header's residual) and removing one drops
 * its value from every variable in the collection. The designer reads `layout → xs, lg, xl, 2xl` and can
 * cancel if one of those is theirs.
 */
const modeNote = (p: PrunePlan): string =>
  p.modes.length === 0
    ? ''
    : ` The modes are ${p.modes.map((g) => `${g.collection} → ${g.modes.map((m) => m.name).join(', ')}`).join('; ')};` +
      ' removing a mode drops its value from every variable in that collection.';

/**
 * The review text shown before a prune runs — the count, the scope, and the consequence, per the voice
 * standard's Destructive tone (name the consequence and its scope). Recessive: it states what the delete
 * touches and, as importantly, what it leaves.
 */
export const prunePreviewSummary = (p: PrunePlan): string => {
  const vars = p.variables.reduce((n, g) => n + g.names.length, 0);
  const modes = p.modes.reduce((n, g) => n + g.modes.length, 0);
  const styles = p.styles.reduce((n, g) => n + g.names.length, 0);
  const count = prunePlanCount(p);
  if (count === 0) {
    return 'No stale items — every style, mode, variable and collection in this file is in the current plan.';
  }
  const one = count === 1;
  return (
    `${parts(styles, modes, vars, p.collections.length)} ${one ? 'is' : 'are'} in this file but not in ` +
    `the current plan, all within this theme's namespace. Deleting ${one ? 'it' : 'them'} also removes any ` +
    `bindings made to ${one ? 'it' : 'them'}; anything outside the namespace is left in place.` +
    modeNote(p)
  );
};

/** The verdict text after a prune runs — what was removed, in the file's terms (no congratulation). */
export const pruneAppliedSummary = (r: PruneResult): string => {
  const total = r.variables + r.collections + r.modes + r.styles;
  if (total === 0) return 'Nothing removed — the file held no stale items in this theme’s namespace.';
  const missNote = r.misses.length ? ` ${r.misses.length} named item${r.misses.length === 1 ? '' : 's'} could not be found.` : '';
  return `Removed ${total} stale item${total === 1 ? '' : 's'}: ${parts(r.styles, r.modes, r.variables, r.collections)}.${missNote}`;
};
