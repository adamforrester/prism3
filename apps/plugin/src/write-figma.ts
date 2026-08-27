/**
 * Prism3 Figma plugin — the MAIN-THREAD write adapter (docs/22 Phase 3 / #108).
 *
 * The live executor for the host-neutral `WritePlan` (engine `write-plan.ts`). Where the CLI
 * path (`materialise-to-figma.ts`) emits plugin-JS strings to paste into `figma_execute`, this
 * runs the SAME three passes directly against `figma.variables.*` on the main thread. Same pure
 * core, real executor.
 *
 * Faithful to the materialisation contract (docs/10 §3):
 *   1. `core`'s palette slice — one Default mode, literal RGBA, primitives hidden from publishing.
 *   2. `color.appearance` create — rename mode[0] + add the rest; every var gets a literal per-mode
 *      fallback value (pass A: every alias TARGET exists before any alias binds).
 *   3. `color.appearance` aliases — bind each mode to its OWN target (pass B — the collapse-guard).
 *
 * A COLLECTION IS NO LONGER ONE PLAN'S TO OWN (#1097). `core` holds the palette, dimension and font
 * primitives, written by three different executors in three separate calls. So `upsertCollection` scopes
 * itself to the SLICE a plan owns — see the reasoning there; without it every legitimate rename in `core`
 * is refused as un-planned and the other two groups' variables report as orphans.
 *
 * IDEMPOTENT: find-by-name → update in place. Re-running on a themed file mutates the existing
 * collections/variables rather than duplicating them (so the designer can re-apply after a knob
 * change without cleanup). Uses the async getters required under `documentAccess:"dynamic-page"`
 * (`getLocalVariableCollectionsAsync` / `getLocalVariablesAsync`).
 *
 * Idempotency by name is blind to a RENAME, and that blindness is why every executor takes an optional
 * `Migration` (#1013): the rename pass sets `Variable.name`/`VariableCollection.name` in place, keeping
 * the id and therefore every binding a designer made, so a renamed token MIGRATES instead of being
 * orphaned and recreated. It is opt-in per call, refuses rather than guesses, and degrades to the
 * unmigrated write on any refusal — the policy lives in `@prism3/engine/rename-map`, the ordering here.
 *
 * A `setValueForMode` CAN FAIL FOR A REASON THAT IS NOT ABOUT THE VALUE (#680): writing a
 * `font/family/*` variable makes Figma re-resolve the text styles bound to it, which throws if the
 * resulting face is not loaded this session. `applyVarCollectionPlan` records such refusals and keeps
 * going (see `setSurviving`); `preload-fonts.ts` removes the cause before the write starts.
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `VariablesApi` port is
 * the minimal slice of `figma.variables` the executor touches, so the whole pass sequence is
 * unit-testable against an in-memory shim (see `apps/plugin/test-write.mjs`) with no real Figma.
 */
import type { WritePlan, Rgba, SurfacePlan, FloatCollectionPlan, VarCollectionPlan } from '@prism3/engine/write-plan';
import {
  renameMap, validateRenameMap, planVariableRenames, planCollectionRenames, composeVariableRenames, isRefusal,
  type RenameMap, type RenameOutcome, type MaterializationStep,
} from '@prism3/engine/rename-map';
import { MATERIALIZATION_RENAMES } from '@prism3/engine/materialization-renames';
import { CORE_COLLECTION } from '@prism3/engine/emit-figma-color';
import { coreGroupOf, ownedCoreGroup, rootOf } from '@prism3/engine/figma-names';

/** The minimal `figma.variables` surface the executor needs. Declaring it as a port (rather than
 *  reaching for the global `figma`) is what lets the Node harness drive `applyWritePlan` with a
 *  shim. In the real plugin, `figma.variables` structurally satisfies this. */
export interface VariablesApi {
  getLocalVariableCollectionsAsync(): Promise<VarCollection[]>;
  getLocalVariablesAsync(type?: string): Promise<Variable[]>;
  createVariableCollection(name: string): VarCollection;
  createVariable(name: string, collection: VarCollection, resolvedType: 'COLOR' | 'FLOAT' | 'STRING'): Variable;
  createVariableAlias(target: Variable): VariableAlias;
}
export interface VarMode { modeId: string; name: string }
export interface VarCollection {
  id: string;
  name: string;
  modes: VarMode[];
  renameMode(modeId: string, newName: string): void;
  addMode(name: string): string;
}
export interface VariableAlias { type: 'VARIABLE_ALIAS'; id: string }
/** The value a variable can hold in a mode, as the READ executor sees it (#109). A SUPERSET of the
 *  real Figma `VariableValue` union (alias | RGB(A) | number | string | boolean), so `figma.variables`
 *  structurally satisfies this port; `{ r; g; b; a? }` covers both RGB and RGBA. The write path only
 *  ever sets `Rgba | VariableAlias` (a subset), which is assignable here. */
export type ReadVarValue = VariableAlias | { r: number; g: number; b: number; a?: number } | number | string | boolean;
export interface Variable {
  id: string;
  name: string;
  variableCollectionId: string;
  scopes: string[];
  description: string;
  hiddenFromPublishing: boolean;
  // Per-mode values as Figma stores them — read by the READ executor (#109); the write path sets
  // them via setValueForMode (which takes the narrow Rgba | VariableAlias the writer produces).
  valuesByMode: Record<string, ReadVarValue>;
  setValueForMode(modeId: string, value: Rgba | VariableAlias | number | string): void;
}

/** What the executor did — surfaced to the UI + asserted by the harness. */
export type ApplyResult = {
  paletteTotal: number;
  paletteCreated: number;
  colorTotal: number;
  colorCreated: number;
  /** alias bindings written = colour vars × modes (minus any skipped null targets). */
  bound: number;
  /** unresolved bindings: a colour var or its alias target that wasn't found (should be empty). */
  misses: string[];
  /** Per-AXIS variables present in the file but absent from the plan — reported, never deleted (#479).
   *  This is the pair the live drift was measured on: the palette primitives read 222 against a 122-row
   *  plan, `color` carrying flat leaves at paths that became stateful groups. `name` is an axis key
   *  (`core/palette`), not always a collection name, since #1097. See `orphansOf`. */
  orphans: { name: string; names: string[] }[];
};

/**
 * Variables that exist in a collection the plan owns but are not in the plan — **reported, never
 * deleted** (#479).
 *
 * The write path is create-or-update-by-name, which is idempotent for adds and edits and structurally
 * blind to a RENAME: the new name is created and the old one is simply never touched again. So every
 * rename in the engine's history is still sitting in any file written before it. Measured live in Prism
 * Test File v2 — the palette primitives read 222 against a 122-row plan (a whole pre-rename palette
 * generation), and `color/interactive` read 69 against 63 (flat leaves left behind when they became
 * stateful slots).
 *
 * **Reporting is the whole change here, and the restraint is deliberate.** Deleting a variable a
 * designer may have bound to a layer is destructive and unrecoverable from the engine's side, and this
 * function cannot tell a stale ghost from a variable someone is co-authoring — both are simply "a name
 * the plan does not contain." A prune lane needs an explicit opt-in plus a "the plan fully owns this
 * collection" precondition, and the higher-value fix is a rename map that MIGRATES a variable (keeping
 * its id, and therefore every existing binding) instead of orphan-and-recreate. Both are open decisions;
 * making the drift *visible* is not, and is what this delivers.
 *
 * Sorted so a diff of two runs is readable, and so the summary's truncated head is stable rather than
 * whatever order Figma happened to return.
 */
export const orphansOf = (existing: Iterable<string>, planned: Iterable<string>): string[] => {
  const keep = new Set(planned);
  return [...existing].filter((n) => !keep.has(n)).sort();
};

/**
 * The AXIS a plan owns, as the label its orphan report carries (#1097).
 *
 * `core` is written by three executors, so a report labelled `core` from any one of them reads as a
 * statement about all 199 variables in it when it is a statement about 38. The label names the slice:
 * `core/dimension`. Non-merged collections are unchanged — `space` is still `space`.
 */
const axisLabel = (collection: string, planned: readonly string[]): string => {
  const group = ownedCoreGroup(planned);
  return group === null ? collection : `${collection}/${group}`;
};

/**
 * One rename pass, shared by every executor in a single apply (#1013).
 *
 * State, not just a map, for two reasons. The static validation must run **once, before any write**
 * and neuter the whole pass rather than per collection — so `beginMigration` is the only construction
 * point and an invalid map cannot reach `upsertCollection`. And `outcomes` accumulates across all
 * four executors, so `main.ts` reads one list instead of four result fields gaining a rename member.
 */
export type Migration = {
  /** Empty when `refusals` is non-empty: a statically-invalid map migrates NOTHING. */
  map: RenameMap;
  /** The MATERIALIZATION rules, carried on the pass rather than imported at the point of use — so that
   *  emptying `map` on a refusal disarms them TOO. They are not part of the map (they are rules, not
   *  rows) but they are part of the same migration, and a refusal that neutered only the rows would
   *  leave 370 variables per brand renaming into collections that did not move. */
  rules: readonly MaterializationStep[];
  /** Every entry the pass considered, no-ops included — "checked, none" ≠ "never checked". */
  outcomes: RenameOutcome[];
  /** Static refusals. Non-empty means the rename pass was abandoned and the write proceeded
   *  unmigrated — today's orphan-and-recreate behaviour, reported rather than silent. */
  refusals: string[];
};

/**
 * Validate once, up front — then rename every COLLECTION, once, before any executor runs (#1035).
 *
 * A statically-invalid map does NOT abort the apply: it abandons the rename pass only and degrades to
 * the pre-#1013 behaviour, which is a known state rather than a new one. The write is what the designer
 * asked for; the migration is the improvement, and a broken improvement must not cost them the write.
 *
 * ── WHY THE COLLECTION RENAMES ARE A PRE-PASS AND NOT PER-COLLECTION (#1035) ──────────────────────
 *
 * They used to live inside `upsertCollection`, which is handed ONE target name at a time. That was
 * correct while `COLLECTION_RENAMES` held one entry and became wrong the moment #1013 gave it two:
 * `color → color.appearance` and `surface → color` were a CHAIN, and a chain's correct order is a
 * property of the whole map, not of any single entry. Applied in the order the executors happen to ask
 * for their collections, `surface → color` lands first, `color` is then occupied by the surface tier,
 * and the value tier's own rename is refused — half-applied, with the two tiers' variables merged into
 * one collection and no way back. `planCollectionRenames` computes the order.
 *
 * **#1097 retargeted the second entry to `surface → color.surface`, so the shipped map is no longer a
 * chain — and the pre-pass is still the right place for it.** The reason it moved out of
 * `upsertCollection` was never only the chain: this function is also where atomicity lives (below), and
 * that obligation is independent of how many entries the map holds. A future entry can reintroduce a
 * chain without any change here, which is the property worth having.
 *
 * **ATOMICITY IS THIS FUNCTION'S OBLIGATION, and it is what makes "refused, not half-applied" true
 * rather than aspirational.** `planCollectionRenames` is pure — it plans the whole ordered sequence
 * against a simulated name set and writes nothing — so every outcome is visible before the first
 * mutation. If ANY of them is a refusal, none are applied and the whole map is neutered, exactly as a
 * static refusal neuters it: the variable rows are keyed by their collection's NEW name, so a variable
 * rename that ran against a collection that did not move would find no rows and orphan the variable it
 * was there to migrate. The two halves stand or fall together. A future edit that applies outcomes as
 * it walks them, or that keeps `map.variables` alive past a collection refusal, has deleted the
 * guarantee while leaving this comment standing.
 *
 * Async, and taking `vars`, so that construction IS the pre-pass: there is no second call for a caller
 * to forget, which is the same reasoning that made `beginMigration` the only construction point.
 */
export const beginMigration = async (
  vars: VariablesApi,
  map: RenameMap = renameMap(),
  rules: readonly MaterializationStep[] = MATERIALIZATION_RENAMES,
): Promise<Migration> => {
  const refusals = validateRenameMap(map);
  const mig: Migration = {
    map: refusals.length ? { collections: [], variables: [] } : map,
    rules: refusals.length ? [] : rules,
    outcomes: [],
    refusals,
  };
  if (!mig.map.collections.length) return mig;

  const collections = await vars.getLocalVariableCollectionsAsync();
  const planned = planCollectionRenames(collections.map((c) => c.name), mig.map.collections);
  // Every outcome is reported either way — "checked, none" ≠ "never checked" — but only a clean plan
  // is applied.
  mig.outcomes.push(...planned);
  const refused = planned.filter((o) => isRefusal(o.status));
  if (refused.length) {
    mig.refusals.push(...refused.map((o) => `collection ${o.from} -> ${o.to}: ${o.status}`));
    mig.map = { collections: [], variables: [] };
    mig.rules = [];
    return mig;
  }
  // Renaming in place keeps the collection id, and therefore every variable in it and every binding to
  // those variables. The executors re-fetch, and see the new names.
  for (const o of planned) {
    if (o.status !== 'migrated') continue;
    collections.find((c) => c.name === o.from)!.name = o.to;
  }
  return mig;
};

// Idempotent get-or-create for a collection by name (find-by-name → reuse). Scopes the returned
// var index to that collection so a name collision across collections can't cross-wire.
//
// `pass` is where a rename becomes a MIGRATION rather than an orphan (#1013) — the VARIABLE half
// of it. The COLLECTION half moved to `beginMigration` in #1035, because a chain's correct order is a
// property of the whole map and this function is handed one name at a time; read the reasoning there
// before moving it back. By the time this runs, the collection this `name` refers to already carries
// that name, which is why the find-by-name below reaches a migrated collection rather than creating a
// fresh empty one beside it.
//
// The one ordering left here is still not something a caller can get wrong, because it is not exposed:
// the variable renames land after `byName` is built and before any caller's create loop reads it.
//
// ── `planned` IS REQUIRED, AND IT ALSO DECIDES WHAT THIS CALL OWNS (#1097) ────────────────────────
//
// It used to ride along with the migration, so that a caller could not pass the pass without it. That
// pairing is now unnecessary, because `planned` is load-bearing for every caller whether or not it
// migrates: it names the slice of the collection this plan OWNS.
//
// `core` holds the palette, dimension and font primitives, and three separate executors write them.
// Un-scoped, each call would see the other two groups' 77–160 variables as names it did not plan — which
// `planVariableRenames` reads as `target-not-planned` (refusing every legitimate rename in the tier) and
// the callers' `orphansOf` reads as drift (reporting 77–160 ghosts against a file that matches the plan
// exactly). `ownedCoreGroup` derives the slice from the plan's own rows, which is what ownership means
// here rather than a guess about it, and it is positional — no brand root is spelled.
//
// The residual gap is stated rather than defended, and it is **#1109**: a `core` variable in a group NO
// plan owns is filtered out of `byName` before it can be seen, so it is invisible to all three orphan
// reports AND to the migration pass. Two ways to land there — a pre-#1097 un-rooted name (`palette/x` is
// in no group, since `coreGroupOf` reads the segment after the root) and a group the engine has stopped
// emitting. The alternative is a cross-executor planned-union, which is a wider change than this lane.
const upsertCollection = async (
  vars: VariablesApi,
  name: string,
  planned: readonly string[],
  pass?: Migration,
): Promise<{ collection: VarCollection; byName: Map<string, Variable> }> => {
  const collections = await vars.getLocalVariableCollectionsAsync();
  const collection =
    collections.find((c) => c.name === name) ??
    vars.createVariableCollection(name);
  const owns = ownedCoreGroup(planned);
  // NB: fetch ALL local variables (no type filter) — `getLocalVariablesAsync('COLOR')` returns ONLY
  // COLOR-typed vars, which would make `byName` empty for a FLOAT collection and break idempotency
  // (re-apply would re-create every FLOAT var → duplicates). We scope by `variableCollectionId`
  // anyway, so the unfiltered fetch is correct for both the colour and FLOAT (#146) executors.
  const byName = new Map(
    (await vars.getLocalVariablesAsync())
      .filter((v) => v.variableCollectionId === collection.id && (owns === null || coreGroupOf(v.name) === owns))
      .map((v) => [v.name, v] as const),
  );
  // THE BRAND ROOT, FROM THE PLAN (#1097). The rules and the contract rows both need it, and the plan is
  // the one thing in scope that carries it: every planned name is `<root>/…`, so the first segment of any of
  // them IS the root. Positional — no prefix is spelled here, which is the property `test-namespace.ts`
  // gates behaviourally for a client namespace we have never seen.
  //
  // An EMPTY plan has no root to read, and a wrong root would send every rename to `<empty>/name`. There is
  // also nothing for a migration to land on: every target would be un-planned. So the rename pass is skipped
  // rather than run against a guess — the write itself is unaffected.
  const root = planned.length ? rootOf(planned[0]) : '';
  if (pass && root) {
    // The CONTRACT rows and the MATERIALIZATION rules, composed into one list per live name, so a
    // variable needing both moves in a single step rather than through an intermediate name no plan
    // asks for. `composeVariableRenames` carries the reasoning and the fixed order.
    const rows = composeVariableRenames(name, byName.keys(), pass.map.variables, pass.rules, root);
    const outcomes = planVariableRenames(byName.keys(), planned, rows);
    pass.outcomes.push(...outcomes);
    for (const o of outcomes) {
      if (o.status !== 'migrated') continue;
      const v = byName.get(o.from)!;
      v.name = o.to;                 // id preserved → every existing binding comes with it
      byName.delete(o.from);
      byName.set(o.to, v);           // so the caller's create loop finds it and UPDATES rather than creates
    }
  }
  return { collection, byName };
};

/**
 * Materialise the colour write-plan into `figma.variables`. Runs the three passes in order —
 * palette first (the colour aliases target it), then the two-pass colour write.
 */
export const applyWritePlan = async (plan: WritePlan, vars: VariablesApi, mig?: Migration): Promise<ApplyResult> => {
  // ---- pass 1: `core`'s palette slice (one Default mode, literal RGBA, hidden primitives) ----
  // The collection is `core` since #1097 — the label comes from the engine's own emission constant, so a
  // future collection rename does not need an edit here. The palette SLICE of it is derived from the
  // planned names inside `upsertCollection`.
  const paletteNames = plan.palette.map((r) => r.name);
  const pal = await upsertCollection(vars, CORE_COLLECTION, paletteNames, mig);
  // Snapshot AFTER the migration pass, deliberately: a variable that was MIGRATED now carries a
  // planned name and is no longer drift. `orphans` keeps meaning "what we could not explain";
  // `Migration.outcomes` is "what we moved". Overlapping the two would double-report every rename.
  const palPreExisting = [...pal.byName.keys()];   // snapshot before creates
  const palModeId = pal.collection.modes[0].modeId;
  let paletteCreated = 0;
  for (const row of plan.palette) {
    let v = pal.byName.get(row.name);
    if (!v) { v = vars.createVariable(row.name, pal.collection, 'COLOR'); pal.byName.set(row.name, v); paletteCreated++; }
    v.scopes = row.scopes;
    v.description = row.description;
    v.hiddenFromPublishing = row.hidden;
    v.setValueForMode(palModeId, row.value);
  }

  // ---- pass 2: color.appearance create (N modes, literal per-mode fallback values) ----
  // `color.appearance` and not `color` since #1013: this is the VALUE tier, one mode per appearance
  // (`light`/`dark`/`hc-*`), and the short name `color` now belongs to the surface ALIAS tier written by
  // `applySurfacePlan`. Hardcoded here rather than read off the plan because `plan.color` carries no
  // name — see `SurfacePlan.name` in `write-plan.ts` for the other half of that asymmetry.
  const { modes, create, aliases } = plan.color;
  const col = await upsertCollection(vars, 'color.appearance', create.map((r) => r.name), mig);
  const colPreExisting = [...col.byName.keys()];   // snapshot before creates (and after migration)
  // Mode[0] is the collection's initial mode (rename it); the rest are added or reused by name.
  col.collection.renameMode(col.collection.modes[0].modeId, modes[0]);
  const modeIds: Record<string, string> = { [modes[0]]: col.collection.modes[0].modeId };
  for (let i = 1; i < modes.length; i++) {
    const existing = col.collection.modes.find((m) => m.name === modes[i]);
    modeIds[modes[i]] = existing ? existing.modeId : col.collection.addMode(modes[i]);
  }
  let colorCreated = 0;
  for (const row of create) {
    let v = col.byName.get(row.name);
    if (!v) { v = vars.createVariable(row.name, col.collection, 'COLOR'); col.byName.set(row.name, v); colorCreated++; }
    v.scopes = row.scopes;
    v.description = row.description;
    modes.forEach((m, i) => v!.setValueForMode(modeIds[m], row.valuesByMode[i]));
  }

  // ---- pass 3: color aliases (bind PER MODE — each mode to its OWN target) ----
  // Alias TARGETS are palette primitives (in `core`), so resolve against BOTH collections' vars, not
  // just the colour collection — mirrors the CLI pass's unscoped global name map.
  const targetByName = new Map<string, Variable>([...pal.byName, ...col.byName]);
  let bound = 0;
  const misses: string[] = [];
  for (const row of aliases) {
    const v = col.byName.get(row.name);
    if (!v) { misses.push(`var:${row.name}`); continue; }
    modes.forEach((m, i) => {
      const target = row.targetsByMode[i];
      if (!target) return; // no alias for this mode (literal-only) — leave the pass-A value
      const tv = targetByName.get(target);
      if (!tv) { misses.push(`${row.name} @${m} -> ${target}`); return; }
      v.setValueForMode(modeIds[m], vars.createVariableAlias(tv));
      bound++;
    });
  }

  return {
    paletteTotal: plan.palette.length,
    paletteCreated,
    colorTotal: create.length,
    colorCreated,
    bound,
    misses,
    // Both axes, even when clean — an empty `names` is a positive statement that the file matches the
    // plan, and a caller can tell "checked, none" from "never checked". `core/palette` is an AXIS key
    // (#1097): the label a designer reads has to say which slice of `core` was checked, because the other
    // two slices are checked by other executors and "core: 0 orphans" from one of them would read as a
    // statement about all 199 variables in it.
    orphans: [
      { name: `${CORE_COLLECTION}/palette`, names: orphansOf(palPreExisting, paletteNames) },
      { name: 'color.appearance', names: orphansOf(colPreExisting, create.map((r) => r.name)) },
    ],
  };
};

/** What the SURFACE executor did (#993). `bound` counts alias bindings actually written; `total × modes`
 *  is what a fully-resolved run binds, so `bound < total * 2` always has a matching entry in `misses`. */
export type SurfaceApplyResult = {
  total: number;
  created: number;
  bound: number;
  /** Unresolved alias targets, named. See `applySurfacePlan` for why this can never be a silent skip. */
  misses: string[];
  orphans: string[];
};

/**
 * Read a collection's variables WITHOUT creating it — `upsertCollection`'s read-only twin.
 *
 * The surface executor needs this rather than `upsertCollection` for a specific reason: an absent
 * `color.appearance` collection is the ORDERING FAILURE this whole executor is sequenced to avoid, and
 * creating an empty one would convert that into a silent success — the collection would exist, every
 * target lookup would still miss, and the next `applyWritePlan` would quietly adopt the empty shell. So
 * the absence is diagnosed, not repaired.
 *
 * It takes no `Migration` for the same ordering reason, not by omission: the only collection it reads is
 * `color.appearance`, which `applyWritePlan` has already migrated by the time this runs. Migrating here
 * as well would be a second write to the same names, with the first pass's result as its input.
 */
const findCollection = async (
  vars: VariablesApi,
  name: string,
): Promise<{ collection: VarCollection; byName: Map<string, Variable> } | null> => {
  const collection = (await vars.getLocalVariableCollectionsAsync()).find((c) => c.name === name);
  if (!collection) return null;
  const byName = new Map(
    (await vars.getLocalVariablesAsync())
      .filter((v) => v.variableCollectionId === collection.id)
      .map((v) => [v.name, v] as const),
  );
  return { collection, byName };
};

/**
 * Materialise the surface axis into `figma.variables` (#993 — #893's unbuilt half). Since #1013 the
 * collection it writes is named **`color`** and its targets live in **`color.appearance`**; the plan
 * carries the name (`plan.name`), so the swap did not touch a line of this function's body.
 *
 * Two modes, `default` and `inverse`, whose every row is an ALIAS into the `color.appearance`
 * collection. This is the axis that makes surface context work at all: bind a layer to
 * `color/text/primary`, switch the mode on an ancestor frame, and the whole subtree resolves to its
 * inverse-context values — and after #1013 that short name is the one a designer reaches for by
 * default, which is the point of the swap rather than a side effect of it.
 *
 * ── THE ORDERING DEPENDENCY, WHICH IS THE WHOLE REASON THIS IS ITS OWN EXECUTOR ──────────────────
 *
 * Every other alias pass here resolves its targets against a name map built INSIDE THE SAME CALL —
 * `applyWritePlan` maps the palette + colour vars it created moments earlier; `applyFloatPlan` and
 * `applyVarCollectionPlan` fold each collection into one `byNameGlobal` as they go. This executor
 * cannot: its targets are `color/appearance/*` variables written by a DIFFERENT call. So it reads the
 * `color.appearance` collection back out of the file, which means **it must run after `applyWritePlan`**
 * — and `main.ts` sequences it that way.
 *
 * The target map is scoped to the `color.appearance` collection ALONE, deliberately, and not merged with
 * this collection's own vars. A global map would let a target name that happened to collide resolve to a
 * `color/*` variable — an alias pointing into the collection it lives in, which would resolve but track
 * nothing. Scoping removes that class rather than defending against it. #1013 made that scoping load
 * MORE weight, not less: the two collections' variable names now differ by a single inserted segment
 * (`color/text/primary` vs `color/appearance/text/primary`), so a collision is a typo away rather than a
 * coincidence away.
 *
 * ── AN UNRESOLVED TARGET IS A REPORTED MISS — NEVER SILENT, NEVER THROWN ─────────────────────────
 *
 * Pass A writes each row's literal fallback colour before any alias binds, exactly as the other three
 * executors do. For this collection that fallback has a sharp edge: a row whose target is missing keeps
 * a literal that is CORRECT ON THE DAY IT IS WRITTEN and then silently stops tracking the brand. It
 * renders right, it passes every visual check, and it is indistinguishable from a working pointer by
 * eye — the #866 shape, where field-label's discarded text refs rendered from defaults while the
 * property sat unwired and nothing said so.
 *
 * So the miss is the only signal that exists, and it is named: `misses` joins `main.ts`'s tally, which
 * flips `ok`. Not thrown — one missing target must not cost the other 121 rows — and not skipped, since
 * a skipped row and a written one are the same thing from outside.
 *
 * The corpus measures 0 unresolved targets out of 244 per brand, which means the healthy path CANNOT
 * exercise the miss branch. `test-write.mjs` drives it deliberately, both ways: a file with no `color`
 * collection at all, and a file whose `color` collection is missing one target.
 */
export const applySurfacePlan = async (
  plan: SurfacePlan,
  vars: VariablesApi,
  mig?: Migration,
): Promise<SurfaceApplyResult> => {
  const misses: string[] = [];
  // Nothing to write (a theme with no `light` mode — `buildFigmaSurface` returns no files). Return
  // before upserting, so an empty `color` collection is never created as a side effect.
  if (plan.create.length === 0) return { total: 0, created: 0, bound: 0, misses, orphans: [] };

  // ---- pass A: create/update every row with its literal per-mode fallback colour ----
  // The surface half of the mirror (#1013): a renamed contract path carries a second Figma name here,
  // and an appearance-only migration would leave this one orphaned without saying so.
  const surf = await upsertCollection(vars, plan.name, plan.create.map((r) => r.name), mig);
  const preExisting = [...surf.byName.keys()];   // snapshot before creates (and after migration)
  surf.collection.renameMode(surf.collection.modes[0].modeId, plan.modes[0]);
  const modeIds: Record<string, string> = { [plan.modes[0]]: surf.collection.modes[0].modeId };
  for (let i = 1; i < plan.modes.length; i++) {
    const existing = surf.collection.modes.find((m) => m.name === plan.modes[i]);
    modeIds[plan.modes[i]] = existing ? existing.modeId : surf.collection.addMode(plan.modes[i]);
  }
  let created = 0;
  for (const row of plan.create) {
    let v = surf.byName.get(row.name);
    if (!v) { v = vars.createVariable(row.name, surf.collection, 'COLOR'); surf.byName.set(row.name, v); created++; }
    v.scopes = row.scopes;
    v.description = row.description;
    plan.modes.forEach((m, i) => v!.setValueForMode(modeIds[m], row.valuesByMode[i]));
  }

  // ---- pass B: bind each mode to its OWN target in the `color.appearance` collection ----
  const col = await findCollection(vars, 'color.appearance');
  if (!col) {
    // ONE named miss, not one per target. With no collection present every target fails for the same
    // single reason, and 244 restatements of it would read in the summary as 244 independent problems.
    // `bound: 0` against `total` says the rest.
    misses.push(`collection:color.appearance absent — color aliases cannot resolve (written before the appearance axis?)`);
    return { total: plan.create.length, created, bound: 0, misses, orphans: orphansOf(preExisting, plan.create.map((r) => r.name)) };
  }
  let bound = 0;
  for (const row of plan.aliases) {
    const v = surf.byName.get(row.name);
    if (!v) { misses.push(`var:${row.name}`); continue; }
    plan.modes.forEach((m, i) => {
      const target = row.targetsByMode[i];
      if (!target) return; // literal-only for this mode — leave the pass-A value
      const tv = col.byName.get(target);
      if (!tv) { misses.push(`${row.name} @${m} -> ${target}`); return; }
      v.setValueForMode(modeIds[m], vars.createVariableAlias(tv));
      bound++;
    });
  }

  return { total: plan.create.length, created, bound, misses, orphans: orphansOf(preExisting, plan.create.map((r) => r.name)) };
};

/** What the FLOAT executor did — surfaced to the UI + asserted by the harness (#146). */
export type FloatApplyResult = {
  /** one entry per axis collection: name + total vars + how many were newly created + any orphans
   *  (present in the file, absent from the plan — reported, never deleted; see `orphansOf`). */
  collections: { name: string; total: number; created: number; orphans: string[] }[];
  /** alias bindings written across all float collections (space→dimension, size→…, etc.). */
  bound: number;
  /** unresolved bindings — a var or alias target not found (should be empty). */
  misses: string[];
};

/**
 * Materialise the FLOAT-variable axes into `figma.variables` (#146) — `core/dimension`, `space`,
 * `radius`, `size`, `border-width`, `focus`, `opacity`, and `layout`. Runs the SAME two-pass shape
 * as the colour `applyWritePlan`, generalised over N collections:
 *   • pass A — per collection: upsert, set up its modes (rename mode[0], add/reuse the rest by name),
 *     then create-or-update each FLOAT var (scopes, description, hidden, literal per-mode values).
 *   • pass B — build ONE global name→Variable map across ALL float collections (the cross-collection
 *     aliases: space→dimension, size→dimension/space, radius→dimension, layout grid→space), then bind
 *     each alias per mode against it.
 * Idempotent find-by-name → update in place (re-apply = +0 created). Uses the same async getters +
 * `upsertCollection` helper as the colour path, so it drives the in-memory shim identically.
 */
export const applyFloatPlan = async (
  plans: FloatCollectionPlan[],
  vars: VariablesApi,
  mig?: Migration,
): Promise<FloatApplyResult> => {
  const collections: FloatApplyResult['collections'] = [];
  // Per-collection modeId maps, kept for pass B; and the global name→Variable map across all axes.
  const modeIdsByCollection = new Map<string, Record<string, string>>();
  const byNameGlobal = new Map<string, Variable>();

  // ---- pass A: create/update every FLOAT var in every collection (literal per-mode values) ----
  for (const p of plans) {
    const { collection, byName } = await upsertCollection(vars, p.name, p.create.map((r) => r.name), mig);
    const preExisting = [...byName.keys()];   // snapshot before creates — see applyVarCollectionPlan
    // Mode[0] is the collection's initial mode (rename it); the rest are added or reused by name.
    collection.renameMode(collection.modes[0].modeId, p.modes[0]);
    const modeIds: Record<string, string> = { [p.modes[0]]: collection.modes[0].modeId };
    for (let i = 1; i < p.modes.length; i++) {
      const existing = collection.modes.find((m) => m.name === p.modes[i]);
      modeIds[p.modes[i]] = existing ? existing.modeId : collection.addMode(p.modes[i]);
    }
    modeIdsByCollection.set(p.name, modeIds);

    let created = 0;
    for (const row of p.create) {
      let v = byName.get(row.name);
      if (!v) { v = vars.createVariable(row.name, collection, 'FLOAT'); byName.set(row.name, v); created++; }
      v.scopes = row.scopes;
      v.description = row.description;
      v.hiddenFromPublishing = row.hidden;
      p.modes.forEach((m, i) => v!.setValueForMode(modeIds[m], row.valuesByMode[i]));
    }
    const createNames = p.create.map((r) => r.name);
    collections.push({ name: axisLabel(p.name, createNames), total: p.create.length, created, orphans: orphansOf(preExisting, createNames) });
    // Fold this collection's vars into the global map (alias targets span collections).
    for (const [name, v] of byName) byNameGlobal.set(name, v);
  }

  // ---- pass B: bind aliases PER MODE against the global name map (targets exist after pass A) ----
  let bound = 0;
  const misses: string[] = [];
  for (const p of plans) {
    const modeIds = modeIdsByCollection.get(p.name)!;
    for (const row of p.aliases) {
      const v = byNameGlobal.get(row.name);
      if (!v) { misses.push(`var:${row.name}`); continue; }
      p.modes.forEach((m, i) => {
        const target = row.targetsByMode[i];
        if (!target) return; // literal-only for this mode — leave the pass-A value
        const tv = byNameGlobal.get(target);
        if (!tv) { misses.push(`${row.name} @${m} -> ${target}`); return; }
        v.setValueForMode(modeIds[m], vars.createVariableAlias(tv));
        bound++;
      });
    }
  }

  return { collections, bound, misses };
};

/** What the var-collection executor did (#237 — `core/font`/`type-sets`). */
export type VarCollectionApplyResult = {
  collections: { name: string; total: number; created: number; orphans: string[] }[];
  bound: number;      // weight-role → font/weight/N aliases written
  misses: string[];
  /** Per-value writes the HOST refused (#680) — recorded and stepped over, never thrown. Empty on every
   *  healthy apply. The reason is Figma's own message, because the only useful thing to say about a host
   *  refusal is what the host said. */
  refused: { name: string; mode: string; reason: string }[];
};

/**
 * Set one mode's value, surviving a HOST REFUSAL (#680).
 *
 * `setValueForMode` can throw for a reason that has nothing to do with the value: writing a
 * `font/family/*` variable makes Figma re-resolve every text style bound to it, and re-resolution
 * throws `unloaded font` if the resulting face is not loaded this session. One such throw used to
 * abort the entire apply — `main.ts` caught it at the top and the brand lost its colors, dimensions,
 * effects and everything else along with its type.
 *
 * `preloadFonts` is the FIX for that cause and this is the floor underneath it: a face that genuinely
 * is not installed cannot be loaded by anyone, and a brand naming one should still get every other
 * token it asked for. Same posture as `write-text-styles`' skip-with-warning — the difference between
 * "this brand lost 3 text styles" and "this brand did not apply".
 *
 * Scoped to THIS executor deliberately. Every variable a text style can bind (`fontFamily` →
 * `font/family/*`, `fontSize` → `font/size/*`, `fontWeight` → `font/weight-role/*`) lives in
 * `core/font` or `type-sets`, which are exactly the collections this function's callers write. The
 * colour and FLOAT executors have no such dependency, so wrapping them too would be defending against
 * a mechanism that cannot reach them.
 */
const setSurviving = (
  v: Variable,
  modeId: string,
  mode: string,
  value: Rgba | VariableAlias | number | string,
  refused: VarCollectionApplyResult['refused'],
): void => {
  try {
    v.setValueForMode(modeId, value);
  } catch (e) {
    refused.push({ name: v.name, mode, reason: (e as Error)?.message ?? 'setValueForMode refused the write' });
  }
};

/**
 * Materialise mixed-type variable collections into `figma.variables` (#237 — `core/font` STRING family
 * + FLOAT size/weight + FLOAT weight-role aliased, per-mode; `type-sets` FLOAT mobile/desktop). Same
 * two-pass shape as `applyFloatPlan`, but each row carries its own `resolvedType` (STRING vs FLOAT) and
 * a string|number literal, and the alias target lives per-row (`aliasByMode`) rather than a separate
 * array. Pass A creates/updates every var (literal per-mode); pass B binds the per-mode aliases against
 * ONE global name→Variable map (weight-role → `font/weight/N`, both in `core/font`). Idempotent
 * find-by-name.
 */
export const applyVarCollectionPlan = async (
  plans: VarCollectionPlan[],
  vars: VariablesApi,
  mig?: Migration,
): Promise<VarCollectionApplyResult> => {
  const collections: VarCollectionApplyResult['collections'] = [];
  const modeIdsByCollection = new Map<string, Record<string, string>>();
  const byNameGlobal = new Map<string, Variable>();
  // Host refusals (#680) — collected across both passes, reported rather than thrown.
  const refused: VarCollectionApplyResult['refused'] = [];

  // ---- pass A: create/update every var (STRING or FLOAT) with its literal per-mode value ----
  for (const p of plans) {
    const { collection, byName } = await upsertCollection(vars, p.name, p.rows.map((r) => r.name), mig);
    // Snapshot BEFORE the row loop — `byName` gains every var this pass creates, and a set read after
    // the fact would be existing+created, which still happens to give the right answer today only
    // because created names are by definition planned. Snapshotting says what we mean.
    const preExisting = [...byName.keys()];
    collection.renameMode(collection.modes[0].modeId, p.modes[0]);
    const modeIds: Record<string, string> = { [p.modes[0]]: collection.modes[0].modeId };
    for (let i = 1; i < p.modes.length; i++) {
      const existing = collection.modes.find((m) => m.name === p.modes[i]);
      modeIds[p.modes[i]] = existing ? existing.modeId : collection.addMode(p.modes[i]);
    }
    modeIdsByCollection.set(p.name, modeIds);

    let created = 0;
    for (const row of p.rows) {
      let v = byName.get(row.name);
      if (!v) { v = vars.createVariable(row.name, collection, row.resolvedType); byName.set(row.name, v); created++; }
      v.scopes = row.scopes;
      v.description = row.description;
      v.hiddenFromPublishing = row.hidden;
      p.modes.forEach((m, i) => setSurviving(v!, modeIds[m], m, row.valuesByMode[i], refused));
    }
    const rowNames = p.rows.map((r) => r.name);
    collections.push({ name: axisLabel(p.name, rowNames), total: p.rows.length, created, orphans: orphansOf(preExisting, rowNames) });
    for (const [name, v] of byName) byNameGlobal.set(name, v);
  }

  // ---- pass B: bind the per-row aliases PER MODE against the global name map ----
  let bound = 0;
  const misses: string[] = [];
  for (const p of plans) {
    const modeIds = modeIdsByCollection.get(p.name)!;
    for (const row of p.rows) {
      const v = byNameGlobal.get(row.name);
      if (!v) { misses.push(`var:${row.name}`); continue; }
      p.modes.forEach((m, i) => {
        const target = row.aliasByMode[i];
        if (!target) return; // literal-only for this mode
        const tv = byNameGlobal.get(target);
        if (!tv) { misses.push(`${row.name} @${m} -> ${target}`); return; }
        // Counted as bound only if the host accepted it — `bound` is a report of what is in the file,
        // and incrementing past a refusal would make the summary claim a binding that is not there.
        const before = refused.length;
        setSurviving(v, modeIds[m], m, vars.createVariableAlias(tv), refused);
        if (refused.length === before) bound++;
      });
    }
  }

  return { collections, bound, misses, refused };
};
