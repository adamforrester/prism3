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
 *     PLUS, since #1577, a SECOND admission path: an orphan whose DESCRIPTION carries the signature of the
 *     one the engine's emitter writes. A style is the one surface here that already holds its own
 *     provenance — the engine writes a description on every style it emits — and reading it is what
 *     recognizes the case the group test structurally cannot: `Grid/xs`, an emitted `Grid / xs` a designer
 *     renamed, whose group is now outside the plan's. Signatures match the emitter's TEMPLATE, not the
 *     current plan's VALUES (`ENGINE_DESCRIPTION`, and the reason is written there — it is the difference
 *     between catching a shrink's stale styles and sparing exactly them). Anything matching neither test is
 *     still spared, so this widened what the designer is SHOWN, not what can be deleted unseen: the styles
 *     admitted only by signature are named in the review text.
 *   • MODES of a plan-owned collection — every mode `claimModes` (in `write-figma.ts`) does NOT claim,
 *     when the plan claims at least one. This is the #1570 arm, and it is the most destructive of the
 *     four, so it is also the only one whose items are NAMED in the preview text rather than counted:
 *     removing a mode drops that mode's value from every variable in the collection. Two guards, both
 *     load-bearing. The collection must be PLAN-OWNED (a stranded collection is offered whole, modes
 *     included, by the arm above). And the plan must be PRESENT in it — at least one claim — which does
 *     two jobs at once: it refuses to judge the modes of a collection this plan has never written, and it
 *     guarantees a survivor, since Figma refuses to remove a collection's last mode.
 *
 *     **The residual #1570 stated, and what #1581 did about it.** A mode had no provenance to read. A
 *     variable carries the brand root and a style carries its group and its description, but a mode is a
 *     bare name on a collection, so a mode a designer added by hand to a plan-owned collection (a `print`
 *     mode in `color`) was indistinguishable from one the engine emitted and then stopped emitting — and it
 *     WOULD be offered. No narrower guard could be READ: the engine's own mode vocabulary is
 *     brand-configurable (the breakpoint ladder IS the `layout` mode set), so "a name the engine could
 *     emit" is not a smaller set than "a name this plan does not emit". #1581's answer is therefore not a
 *     better guess but a WRITTEN record — `stampOwnedModes` in `write-figma.ts` stamps the engine's own
 *     mode ids onto the collection on every apply, append-only, and this arm narrows the stale set to those
 *     ids (`FileCollection.ownedModeIds`). A designer's `print` mode, added after the collection was first
 *     stamped, is now outside the set and spared.
 *
 *     Two things that did NOT change, both deliberate. A collection with NO stamp — every file written
 *     before #1581 — is judged exactly as before, because the alternative is a file the engine has not
 *     re-applied silently becoming un-cleanable. And the names are still spelled out in the review
 *     sentence, so the designer reads `layout → xs, lg, xl, 2xl` and cancels if one of those is theirs:
 *     provenance INFORMS this arm, it does not license it. Opt-in with the names in front of them is the
 *     same bargain the other three arms strike with a count.
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

/** Names per style kind — the PLAN's side of the detector, where a name is all there is. */
export type StyleNames = Record<StyleKind, string[]>;

/** A style in the FILE. `description` is the provenance (#1577): the engine writes one on every style it
 *  emits, so a style carrying an engine-shaped description is the engine's even after a rename. Optional,
 *  and a caller that supplies bare names still type-checks — absent provenance is read as no provenance,
 *  which is exactly the pre-#1577 behavior. */
export interface FileStyle {
  name: string;
  description?: string;
}

/** The FILE's styles per kind — a bare name where provenance is unavailable, a `FileStyle` where it is. */
export type FileStyles = Record<StyleKind, (string | FileStyle)[]>;

const asFileStyle = (s: string | FileStyle): FileStyle => (typeof s === 'string' ? { name: s } : s);

/** A collection in the file, reduced to what the detector needs: its name, the names of the variables it
 *  holds, and its MODES. The modes carry `modeId` as well as `name` because a name is not a key here —
 *  #1570 left files holding two modes called `sm`, only one of which any name-keyed writer can reach. */
export interface FileCollection {
  name: string;
  variableNames: string[];
  modes: VarMode[];
  /** The engine's own mode provenance (#1581) — `ownedModeIds` of the live collection, i.e. the ids the
   *  engine has stamped as written by it. ABSENT or EMPTY means no knowledge, and every mode is judged by
   *  name alone exactly as before; PRESENT narrows the stale set to ids the engine wrote, so a mode a
   *  designer added after the first stamped apply is spared instead of offered. See `stampOwnedModes`. */
  ownedModeIds?: string[];
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
  /** Every local style in the file, per kind — with its `description` where the caller can read one, which
   *  is what lets a renamed engine style be recognized (#1577). */
  styles: FileStyles;
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
  /** `byProvenance` is the subset of `names` admitted ONLY by its description's signature (#1577) — a
   *  style whose group the plan no longer emits, recognized as the engine's by what it says about itself.
   *  A subset, never an addition, so no count is derived from it; it exists so the review text can NAME
   *  those styles, the same bargain the mode arm strikes. */
  styles: { kind: StyleKind; names: string[]; byProvenance: string[] }[];
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
 *  The cost was real and measured, not hypothetical: the live test file holds a `Grid/xs` carrying the
 *  engine's own description — an emitted style someone renamed — and this rule alone leaves it behind. That
 *  was #1577, and it is why the group test is no longer the only way in: `isEngineDescription` below reads
 *  the provenance the group name cannot carry. This function is unchanged, deliberately — the rename case
 *  is answered by ADDING a second admission path, not by loosening this one, because every loosening of a
 *  character class widens what a hand-made name falls into. */
const styleGroup = (name: string): string => name.split('/')[0] ?? '';

/* ── style provenance: the description signature (#1577) ──────────────────────────────────────────── */

/**
 * Per-kind SIGNATURES of the description the engine's own emitters write. Shape, never value — and that
 * distinction is the whole reason this arm works.
 *
 * The obvious implementation is to compare a live style's description against the descriptions the CURRENT
 * plan would write, and it is precisely wrong: after a 6→2 breakpoint shrink, the four dropped grid styles
 * carry descriptions naming breakpoints the new plan does not have, so no planned description equals
 * theirs. An exact match would spare exactly the stale styles this exists to catch, and spare them in the
 * case that motivated it. So each pattern matches the TEMPLATE — the invariant prose the emitter wraps
 * around whatever the values were at the time — and the values inside it are read as wildcards.
 *
 * Kept as literal patterns HERE rather than imported from the emitters, and that is not duplication to be
 * tidied away: a recognizer built out of its subject's own expression agrees with it by construction and
 * can never fail (docs/34 shape 2). These patterns are an independent statement of what the engine writes;
 * `test-prune.ts` checks them against descriptions produced by the REAL emitters over all three committed
 * brands, so an emitter whose prose moves fails that test by name instead of silently disabling the arm.
 *
 * The clause separator in every one of these is an EM DASH (U+2014), not a hyphen — `emit-figma-styles.ts`
 * writes it, and `lint-us-english.ts` / the voice standard keep it that way.
 *
 * TWO GENERATIONS PER KIND (#1623 sign-off). The engine rewrote its style descriptions into the short Figma
 * register (`figma-description.ts`), and a client's file still holds styles written in the old words. Each
 * kind therefore matches its CURRENT template OR its LEGACY one — a stranded style from an earlier apply
 * is exactly what this arm exists to recognize, and it was written in the words the engine used then. The
 * legacy patterns are frozen: they describe text the engine no longer writes, so nothing should move them.
 */
const ENGINE_DESCRIPTION: Record<'grid' | 'effect' | 'paint', RegExp> = {
  /** `emit-figma-styles.ts` `buildFigmaGridStyles`. The trailing sentence is fixed text in the emitter and
   *  names no value at all, which makes this the strongest of the four signatures. */
  grid: new RegExp([
    /^\d+-column grid for \S+ — \d+(?:\.\d+)?px gutter, \d+(?:\.\d+)?px margin\. A static copy of the layout variables\.$/.source,
    // legacy (before the #1623 sign-off)
    /^\d+-column layout grid for the \S+ breakpoint — \d+(?:\.\d+)?px gutter, \d+(?:\.\d+)?px margin\. A static Figma grid style; the layout variable collection stays the responsive source of truth\.$/.source,
  ].join('|')),
  /** `buildFigmaShadow`: the leaf's own `shadow <key> — …` prose, plus the mode clause the emitter appends.
   *  The middle clause is a wildcard on purpose — `shadow/inset` carries `inner shadow for wells / pressed
   *  states / inputs` where every other rung carries `elevation N of M, K-layer (…)`, so requiring the
   *  elevation clause would fail to recognize the one style whose shape is different. */
  effect: new RegExp([
    /^(?:Elevation \d+ of \d+|Inner shadow for wells, pressed states and inputs) — (?:light mode|dark mode \(softer; surfaces lift instead\)|\S+ mode)$/.source,
    // legacy (before the #1623 sign-off)
    /^shadow \S+ — .+ — (?:light mode|dark mode \(reduced; surface-lift pattern\)|\S+ mode \(per-mode softness\/tint\))$/.source,
  ].join('|')),
  /** `buildFigmaGradient`: the leaf's `gradient <key> — <kind>, N stops, <interp> interpolation` prose. The
   *  emitter appends nothing here, so the signature is the leaf template and the tail is left open (the
   *  brand-gradient suffix is `tree.ts`'s, not this emitter's). */
  paint: /^gradient \S+ — (?:linear \d+(?:\.\d+)?°|radial \([^)]+\)), \d+ stops?, (?:oklch|srgb) interpolation/,
};

/**
 * Whether `description` is one the ENGINE wrote for a style of this `kind`.
 *
 * TEXT is the weak case, and it is stated rather than papered over. `emit-figma-font.ts` builds a text
 * style's description out of the style's own words — `display/lg/strong` → `display lg strong` — so unlike
 * the other three kinds there is no template prose to key on. What is checked instead is the SHAPE plus a
 * closed vocabulary: lowercase words, at least two, every one of them a word the current text plan's own
 * names are built from, and the first a top-level group the plan still emits. `display lg strong` passes
 * (a renamed `Display/LG` still describes itself in the plan's words); a hand-typed `body copy for the
 * hero` fails on `copy`/`for`/`the`/`hero`. The vocabulary comes from the plan's NAMES, which is a
 * different derivation from the emitter's description-building code, so this stays an independent claim.
 *
 * The residual: a hand-typed description made only of engine words — `label sm emphasis` typed by a
 * designer onto their own style — is indistinguishable from the engine's, and would be offered. It is
 * offered NAMED (see `styleNote`) and never deleted without the designer confirming, so the cost is a
 * sentence they have to read rather than work they lose. Text is also the kind that needs this path least:
 * a dropped typography rung keeps its top-level group, so the #1521 group test already catches it, and
 * only a rename of the FIRST segment reaches here at all.
 *
 * Since the #1623 sign-off the engine follows those words with a TAIL — `display xl strong — 48→112px
 * Clash Display, tight line-height, for hero headlines.` The words before the em dash are checked exactly
 * as before, and the tail must match the emitter's template (`TEXT_TAIL`), so a designer's own words after
 * a dash (`label sm emphasis — use for chips`) do not pass. The bare words, the legacy shape, still match.
 */
const TEXT_TAIL = /^ — \d+(?:\.\d+)?(?:→\d+(?:\.\d+)?)?px .+, \S+ line-height, for [^.]+\.$/;
export const isEngineDescription = (
  kind: StyleKind,
  description: string,
  plannedNames: readonly string[],
): boolean => {
  const d = description.trim();
  if (d === '') return false;                       // no description is no provenance, never a match
  if (kind !== 'text') return ENGINE_DESCRIPTION[kind].test(d);
  const dash = d.indexOf(' — ');
  if (dash !== -1 && !TEXT_TAIL.test(d.slice(dash))) return false;
  const words = (dash === -1 ? d : d.slice(0, dash)).split(' ');
  if (words.length < 2) return false;
  const vocabulary = new Set<string>();
  const groups = new Set<string>();
  for (const n of plannedNames) {
    for (const w of n.split(/[\/-]/)) if (w !== '') vocabulary.add(w);
    groups.add(styleGroup(n));
  }
  return groups.has(words[0]) && words.every((w) => vocabulary.has(w));
};

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
    // PROVENANCE (#1581) — where the collection carries the engine's stamp, only the ids the engine wrote
    // are offered; a mode the designer added is theirs and is left alone. An ABSENT or EMPTY stamp keeps
    // the pre-#1581 behavior exactly (every stale mode offered, named), because that is what every file
    // written before the stamp existed has, and a file the engine has not re-applied since must not
    // silently stop being cleanable. Read from the SNAPSHOT, not from Figma — this stays pure.
    const owned = c.ownedModeIds;
    const offer = owned && owned.length ? stale.filter((m) => owned.includes(m.modeId)) : stale;
    if (offer.length) modes.push({ collection: c.name, modes: offer });
  }

  // STYLES — per kind, orphans admitted by EITHER namespace test: the top-level group that kind's plan
  // still emits (#1521), or the engine's own description signature (#1577), which is the only one that can
  // recognize a style a designer RENAMED out of the group. Reuses `orphansOf` over the names, so the
  // ordering the rest of the system reads is unchanged; the two tests are the namespace guard (there is no
  // brand root on a style name). A style matching neither is spared — an addition, never a loosening.
  const styles: PrunePlan['styles'] = [];
  for (const kind of STYLE_KINDS) {
    const planned = input.plannedStyles[kind] ?? [];
    const plannedGroups = new Set(planned.map(styleGroup));
    const live = (input.styles[kind] ?? []).map(asFileStyle);
    const described = new Map(live.map((s) => [s.name, s.description ?? ''] as const));
    const byProvenance: string[] = [];
    const orphans = orphansOf(live.map((s) => s.name), planned).filter((n) => {
      if (plannedGroups.has(styleGroup(n))) return true;
      if (!isEngineDescription(kind, described.get(n) ?? '', planned)) return false;
      byProvenance.push(n);
      return true;
    });
    if (orphans.length) styles.push({ kind, names: orphans, byProvenance });
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

/** Names shown per collection in `varNote` before the tail takes over. Small on purpose: the note names
 *  the targets of the most numerous arm, so past a handful it would bury the count it sits beside rather
 *  than inform it — the same truncate-and-say-so discipline as #1579's 60 kB report cap. Held here as a
 *  named constant so the test drives a fixture past it and the cap fails by name (#1585). */
const VAR_NOTE_CAP = 8;

/**
 * The variables a prune would remove, NAMED per collection — the most numerous arm, and until #1585 the
 * one that showed only a count. A destructive action names its targets: the designer reads
 * `color → surface.raised, surface.sunken, …` and cancels if one is theirs. Capped at `VAR_NOTE_CAP` names
 * per collection with the remainder reported as `+K more`, so the note stays a summary and never becomes a
 * wall that hides the count it replaced. Every name here is in this theme's namespace — the detector's root
 * guard is what put it in the plan — so nothing outside the engine's own names is ever named for deletion.
 */
const varNote = (p: PrunePlan): string => {
  if (p.variables.length === 0) return '';
  const groups = p.variables.map((g) => {
    const shown = g.names.slice(0, VAR_NOTE_CAP);
    const extra = g.names.length - shown.length;
    const items = extra > 0 ? [...shown, `… +${extra} more`] : shown;
    return `${g.collection} → ${items.join(', ')}`;
  });
  return ` The variables are ${groups.join('; ')}.`;
};

/**
 * The styles admitted only by their description's signature (#1577), NAMED — the ones whose group the plan
 * no longer emits, so the designer cannot infer them from the plan in front of them. A rename is how a
 * style gets here, which means the name shown is the designer's own, not the engine's; saying where the
 * recognition came from is what makes that reviewable rather than surprising.
 */
const styleNote = (p: PrunePlan): string => {
  const named = p.styles.filter((g) => g.byProvenance.length);
  if (named.length === 0) return '';
  const list = named.map((g) => `${g.kind} → ${g.byProvenance.join(', ')}`).join('; ');
  const one = named.reduce((n, g) => n + g.byProvenance.length, 0) === 1;
  return ` ${list} ${one ? 'is' : 'are'} outside the groups this theme emits, and ${one ? 'is' : 'are'} ` +
    `included because ${one ? 'its' : 'their'} description is one the engine wrote — a renamed style.`;
};

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
    varNote(p) +
    modeNote(p) +
    styleNote(p)
  );
};

/** The verdict text after a prune runs — what was removed, in the file's terms (no congratulation). */
export const pruneAppliedSummary = (r: PruneResult): string => {
  const total = r.variables + r.collections + r.modes + r.styles;
  if (total === 0) return 'Nothing removed — the file held no stale items in this theme’s namespace.';
  const missNote = r.misses.length ? ` ${r.misses.length} named item${r.misses.length === 1 ? '' : 's'} could not be found.` : '';
  return `Removed ${total} stale item${total === 1 ? '' : 's'}: ${parts(r.styles, r.modes, r.variables, r.collections)}.${missNote}`;
};
