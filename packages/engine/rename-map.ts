/**
 * Rename map — MIGRATE a variable instead of orphan-and-recreate (#1013).
 *
 * `write-figma.ts` is create-or-update **by name**. That is idempotent for adds and edits and
 * structurally blind to a rename: the new name is created, the old one is never touched. Every
 * binding a designer made against the old name keeps pointing at a variable the engine has stopped
 * writing. `orphansOf` makes that visible (#479); nothing migrates it. This module is the migration.
 *
 * The mechanism is one line of Figma API, checked in the typings rather than assumed:
 * `Variable.name` and `VariableCollection.name` are both **writable**, and `.id` is `readonly` on
 * both (`@figma/plugin-typings/plugin-api.d.ts`). A binding stores the variable **id**, so setting
 * `.name` carries every existing binding across. That is the whole reason a rename map is worth more
 * than a prune lane: it is the non-destructive half of the same problem.
 *
 * ## What the map is keyed on: derived from `DEPRECATIONS`, not authored
 *
 * The variable map is **derived** from `version.ts`'s `DEPRECATIONS` — the engine's existing record
 * of "this guaranteed path was renamed to that one." One authored record, two consumers.
 *
 * The deciding property is a forcing function. `token-contract.ts --accept` refuses a MAJOR bump
 * unless `CONTRACT_VERSION` was raised, and prints "If a removal is a RENAME, add a DEPRECATIONS
 * entry"; `classify` refuses a `replacedBy` that is not in the live guaranteed set. So a rename is
 * recorded **by a gate, at the moment it happens**, and the record cannot rot into a pointer at
 * nothing. A second, Figma-side, hand-authored list has no forcing function at all: it is a rule
 * performed by memory, and the failure is silent — the rename ships, the list does not gain an
 * entry, and nothing anywhere notices.
 *
 * The derivation has its own failure mode, and it is the one the gate exists for: get the
 * DTCG→Figma transform wrong and every `from` is a name no file contains, so the map migrates
 * nothing and reports a clean run. Zero migrations is indistinguishable from a healthy file. The
 * `test.ts` section pins the transform against the emitted corpus in **both** directions — every
 * derived `to` resolves in the live emission, no derived `from` is still emitted — plus a floor on
 * how many entries materialise, and a named assertion that exactly the entries with no Figma
 * counterpart are the ones that have none.
 *
 * ## Migrating a COLLECTION vs a VARIABLE: different operations
 *
 * A collection rename is one write that preserves every child id and every child name. It is also
 * **invisible to `DEPRECATIONS`** — the Figma collection name is a materialisation choice, not a
 * contract path — so `COLLECTION_RENAMES` is *authored*, and stays small for the same reason: it can
 * only ever hold the handful of names the engine itself chose. It ships **empty**: #1013 Q4 (whether
 * the alias layer and the value layer swap names) is an open decision, and pre-authoring the entry
 * would take that decision by shipping it into designers' files. The mechanism is what this delivers.
 *
 * Ordering is the sharp difference. A collection rename must run **before** the find-by-name lookup
 * it exists to fix, or `upsertCollection` creates a fresh empty collection beside the old one and
 * orphans every variable in it at once — strictly worse than today's behaviour. So it is applied
 * inside `upsertCollection`, above the `.find(c => c.name === name)`, which is the only place that
 * ordering can't be got wrong by a caller.
 *
 * A **swap** is deliberately not supported, and refuses statically rather than half-applying. Figma
 * permits duplicate collection names, so `color`→`surface` alongside `surface`→`color` passes through
 * a state where find-by-name is arbitrary; that needs a two-phase temp-name design, which this is not.
 *
 * ## When the map is wrong
 *
 * Every hazard resolves to *refuse and report*, never to a partial write, and the split between
 * static and apply-time is load-bearing:
 *
 *   - **static** (`validateRenameMap`, before any write): self-entries, chains, fan-**out** (one
 *     source claiming two targets), duplicate collection entries, cycles. Refusing chains statically
 *     is what makes the apply pass order-independent — no group's target can be another group's
 *     source, so outcomes don't depend on iteration order.
 *   - **apply-time** (`planVariableRenames`): `from` absent (`source-absent` — the *normal* case, a
 *     fresh file or one already migrated); `to` already held by a different variable
 *     (`target-occupied` — merging would lose one side's bindings); fan-**in** with more than one
 *     source live (`ambiguous-source` — refuse the group, migrate neither, and let the file be the
 *     disambiguator rather than an authored preference).
 *
 * Fan-in is legitimate in the map and is **not** a static refusal: two historical paths really do
 * point at one live path today (a 3.0.0 entry and a 4.0.0 entry both landing on
 * `color/interactive/<palette>/inverse/border/rest`). It is a correct contract record and an ambiguous
 * migration, which is exactly why the two checks live in different places.
 *
 * The precondition that makes a wrong map **inert instead of destructive**: a migration only applies
 * when `to` is a name the current plan is about to write (`target-not-planned` otherwise). A stale or
 * fat-fingered entry cannot rename a live variable to a name the engine has stopped emitting — the
 * one way this operation could manufacture an orphan out of a healthy variable.
 *
 * Reversibility, per the restraint `orphansOf` states: a migration is `name = to` on a preserved id,
 * so its inverse is `name = from`, and every applied migration is reported with both names — enough
 * to reverse by hand. There is deliberately no undo command; that would be a second write path into
 * a file the engine did not author.
 *
 * Pure and host-neutral (imports `DEPRECATIONS` and nothing else) so `test.ts` drives it with no
 * Figma present, in the same split as `write-plan.ts` vs `write-figma.ts`.
 */
import { DEPRECATIONS, type Deprecation } from './version';
// The dotted-path → slash-path mapping is stated ONCE, in `anatomy-figma`, precisely so a second copy
// cannot drift from the emitters. Re-deriving it here would be a duplicate that this module's own gate
// could not distinguish from the original.
import { figmaVarName } from './anatomy-figma';

/** A variable to migrate, scoped to the collection it lives in. */
export type VarRename = {
  /** Figma collection name — an entry only applies while writing that collection. */
  collection: string;
  /** The Figma variable name to migrate FROM (history). */
  from: string;
  /** The Figma variable name to migrate TO (what the plan writes today). */
  to: string;
  /** The `CONTRACT_VERSION` that retired `from`, carried through for the report. */
  since: string;
};

/** A collection to migrate. Authored, not derived — see the header. */
export type CollectionRename = { from: string; to: string; since: string };

export type RenameMap = { collections: CollectionRename[]; variables: VarRename[] };

/** What actually happened, per entry the pass considered. `migrated` is the only write. */
export type RenameStatus =
  | 'migrated'
  | 'source-absent'
  | 'target-occupied'
  | 'target-not-planned'
  | 'ambiguous-source';

export type RenameOutcome = {
  kind: 'collection' | 'variable';
  /** For a variable, the collection it lives in; for a collection, its own `from` name. */
  collection: string;
  from: string;
  to: string;
  status: RenameStatus;
};

/** Statuses a reader must see: a refusal is a wrong map, and must not read as a clean run. */
export const isRefusal = (s: RenameStatus): boolean =>
  s === 'target-occupied' || s === 'target-not-planned' || s === 'ambiguous-source';

/**
 * The `color` collection's aliases are mirrored into a second collection, `surface`, under a subset
 * of the same suffixes (measured: 122 of 236 `color` suffixes are also `surface` suffixes, and every
 * `surface` suffix is a `color` suffix). So one renamed contract path can carry **two** Figma names
 * in two collections, and a color-only map leaves the surface twin silently orphaned — measured at 3
 * of the live entries today. Both projections are emitted; the mirror that has no counterpart in a
 * given file simply reports `source-absent`, so over-projecting is self-correcting and
 * under-projecting is not.
 */
export const MIRRORED_COLLECTIONS: Record<string, readonly string[]> = { color: ['color', 'surface'] };

/**
 * Contract roots that are ALSO the name of an emitted Figma variable collection — measured, 9 of the 18
 * guaranteed roots. Only these project: a deprecation on any other root has no variable to migrate, and
 * emitting an entry for it would produce a map row that can never fire and can never be reported. An
 * entry nothing will ever look at is worse than no entry, because it inflates the map's own count.
 *
 * The other 9 are excluded for three different reasons, and none of them is "we forgot": `palette`,
 * `font`, `dimension` and `type` live in collections named `core-palette` / `core-font` /
 * `core-dimension` / `type-sets`, so projecting them would need a prefix rule that is a guess about a
 * naming convention rather than a fact about the emission; `shadow` materialises as Figma STYLES, where
 * a rename is a different operation on a different API; `motion`, `breakpoint`, `container` and `grid`
 * have no variable counterpart at all (Figma has no easing variable, and the rest are consumed as
 * values, not bound). A deprecation landing on any of them fails the `test.ts` arm that pins the
 * unprojected set by NAME — so it forces the decision rather than skipping it quietly.
 *
 * `test.ts` asserts every root here is genuinely an emitted collection name, against the corpus. That
 * check is the reason this can be an authored list at all: the claim is verified against the emission
 * rather than trusted.
 */
export const PROJECTED_ROOTS: readonly string[] = [
  'border-width', 'color', 'control', 'focus', 'icon', 'opacity', 'radius', 'size', 'space',
];

/** Re-root a Figma variable name into a mirror collection: `color/a/b` → `surface/a/b`. */
const reRoot = (figmaName: string, collection: string): string =>
  [collection, ...figmaName.split('/').slice(1)].join('/');

/**
 * Every candidate Figma projection of one deprecation: the first path segment names the collection,
 * plus any mirror of it. Empty for a root that materialises no variable collection.
 *
 * Candidates are *not* filtered against the live emission here — this module is pure and has no disk.
 * Filtering happens twice downstream, and both are stronger than a static list would be: at apply
 * time by `target-not-planned`, and in `test.ts` against the emitted corpus for all three brands.
 */
export const projectionsOf = (d: Deprecation): VarRename[] => {
  const root = d.path.split('.')[0];
  const from = figmaVarName(d.path);
  const to = figmaVarName(d.replacedBy);
  if (!PROJECTED_ROOTS.includes(root)) return [];
  // A rename that moves between roots would change which collection the variable lives in — that is
  // a move, not a rename, and Figma has no such operation. Refuse to project it at all.
  if (d.replacedBy.split('.')[0] !== root) return [];
  return (MIRRORED_COLLECTIONS[root] ?? [root]).map((collection) => ({
    collection,
    from: reRoot(from, collection),
    to: reRoot(to, collection),
    since: d.since,
  }));
};

/** The derived variable map. Callers filter by collection; the executor does exactly that. */
export const deriveVariableRenames = (deps: readonly Deprecation[] = DEPRECATIONS): VarRename[] =>
  deps.flatMap(projectionsOf);

/**
 * Authored collection renames. **Empty is the honest state** — see the header: #1013 Q4 is an open
 * decision, and the point of landing the mechanism first is that taking it later costs nothing.
 */
export const COLLECTION_RENAMES: CollectionRename[] = [];

/** The map the executor uses. */
export const renameMap = (): RenameMap => ({
  collections: COLLECTION_RENAMES,
  variables: deriveVariableRenames(),
});

/**
 * Static refusals — everything checkable without a file. Returns one string per problem; a non-empty
 * result must abort the rename pass **before** any write. Fan-IN is absent by design (see header).
 */
export const validateRenameMap = (map: RenameMap): string[] => {
  const bad: string[] = [];

  for (const r of map.variables) {
    if (r.from === r.to) bad.push(`variable self-rename: [${r.collection}] ${r.from} → itself`);
  }
  // Per collection: a target that is also a source is a CHAIN (order-dependent); one source with two
  // targets is fan-OUT (unresolvable — which binding wins?).
  const byCollection = new Map<string, VarRename[]>();
  for (const r of map.variables) byCollection.set(r.collection, [...(byCollection.get(r.collection) ?? []), r]);
  for (const [collection, rows] of byCollection) {
    const sources = new Set(rows.map((r) => r.from));
    for (const r of rows) {
      if (sources.has(r.to)) bad.push(`variable rename chain: [${collection}] ${r.from} → ${r.to}, which is itself a source`);
    }
    const targetsBySource = new Map<string, Set<string>>();
    for (const r of rows) targetsBySource.set(r.from, new Set([...(targetsBySource.get(r.from) ?? []), r.to]));
    for (const [from, targets] of targetsBySource) {
      if (targets.size > 1) bad.push(`variable fan-out: [${collection}] ${from} claims ${targets.size} targets (${[...targets].sort().join(', ')})`);
    }
  }

  const cSources = new Set(map.collections.map((c) => c.from));
  const seenFrom = new Set<string>();
  const seenTo = new Set<string>();
  for (const c of map.collections) {
    if (c.from === c.to) bad.push(`collection self-rename: ${c.from} → itself`);
    // Covers a two-entry swap and any longer cycle: in a swap each entry's target is the other's source.
    if (cSources.has(c.to)) bad.push(`collection rename cycle: ${c.from} → ${c.to}, which is itself a source — a swap needs a two-phase temp name, which this does not do`);
    if (seenFrom.has(c.from)) bad.push(`duplicate collection source: ${c.from} appears twice`);
    if (seenTo.has(c.to)) bad.push(`duplicate collection target: two collections claim ${c.to}`);
    seenFrom.add(c.from);
    seenTo.add(c.to);
  }

  return bad;
};

/**
 * Decide every variable rename for ONE collection against the file, before touching anything.
 *
 * `existing` is the variable names the file already holds in this collection; `planned` is the names
 * this write is about to produce. Grouped by target, because fan-in is only resolvable by looking at
 * the whole group: with one source live it is an ordinary migration, with two it is ambiguous and
 * neither moves.
 *
 * Returns an outcome for every entry considered, including the no-ops — a caller must be able to tell
 * "checked, nothing to do" from "never checked."
 */
export const planVariableRenames = (
  existing: Iterable<string>,
  planned: Iterable<string>,
  renames: readonly VarRename[],
): RenameOutcome[] => {
  const have = new Set(existing);
  const want = new Set(planned);
  const groups = new Map<string, VarRename[]>();
  for (const r of renames) groups.set(r.to, [...(groups.get(r.to) ?? []), r]);

  const out: RenameOutcome[] = [];
  for (const [to, group] of groups) {
    const at = (r: VarRename, status: RenameStatus): RenameOutcome =>
      ({ kind: 'variable', collection: r.collection, from: r.from, to: r.to, status });
    const live = group.filter((r) => have.has(r.from));
    if (!want.has(to)) out.push(...group.map((r) => at(r, 'target-not-planned')));
    else if (live.length === 0) out.push(...group.map((r) => at(r, 'source-absent')));
    else if (have.has(to)) out.push(...live.map((r) => at(r, 'target-occupied')));
    else if (live.length > 1) out.push(...live.map((r) => at(r, 'ambiguous-source')));
    else out.push(at(live[0], 'migrated'));
  }
  // Stable order so two runs diff cleanly and a truncated report head is not arbitrary.
  return out.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
};

/**
 * Decide the collection rename for ONE wanted collection name, before the find-by-name that would
 * otherwise create a duplicate beside it. `null` when no entry targets `wanted` — the common case.
 *
 * The plan-membership precondition is implicit and stronger here than for a variable: `wanted` IS a
 * name this write is about to use, so a `to` that no plan asks for is never even looked up.
 */
export const planCollectionRename = (
  existing: Iterable<string>,
  wanted: string,
  renames: readonly CollectionRename[],
): RenameOutcome | null => {
  const have = new Set(existing);
  const entry = renames.find((c) => c.to === wanted);
  if (!entry) return null;
  const at = (status: RenameStatus): RenameOutcome =>
    ({ kind: 'collection', collection: entry.from, from: entry.from, to: entry.to, status });
  if (have.has(entry.to)) return at('target-occupied');
  if (!have.has(entry.from)) return at('source-absent');
  return at('migrated');
};
