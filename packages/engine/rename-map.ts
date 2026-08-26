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
 * only ever hold the handful of names the engine itself chose. #1013 gave it its first two entries
 * (`color` → `color.appearance` and `surface` → `color`), which between them are a CHAIN — so the
 * paragraphs below are about what the map actually holds rather than about a hypothetical.
 *
 * Ordering is the sharp difference, and since #1013 it is a GUARANTEE rather than a coincidence. A
 * collection rename must run **before** the find-by-name lookup it exists to fix, or
 * `upsertCollection` creates a fresh empty collection beside the old one and orphans every variable in
 * it at once — strictly worse than today's behaviour. It used to be applied *inside*
 * `upsertCollection`, above the `.find(c => c.name === name)`, on the grounds that this was the one
 * place a caller could not get the ordering wrong. **That was true of one rename and false of two:** a
 * chain's correct order is a property of the whole map, and `upsertCollection` is handed one name at a
 * time. `planCollectionRenames` orders the map topologically and the executor runs it as a single
 * pre-pass before any collection is looked up (#1035, docs/44 §3).
 *
 * A **swap** is still not supported, and refuses statically rather than half-applying. It needs a
 * two-phase temp-name design, which this is not. An earlier version of this paragraph justified the
 * refusal by saying the swap "passes through a state where find-by-name is arbitrary" because Figma
 * permits duplicate collection names. **That state is not reachable, and the correction matters
 * because it tells you which check is load-bearing:** the apply-time occupied-target guard is, not the
 * static refusal — the static refusal buys one early, legible report instead of two apply-time ones.
 * Measured in docs/44 §3.
 *
 * **That paragraph used to end by vouching for the ORDER of two tests inside the apply-time guard, and
 * it was wrong to.** It said `planCollectionRename` tests `have.has(entry.to)` first, "so both entries
 * of a swap return `target-occupied` under BOTH orders." True of a swap, and a *permanent refusal* on
 * an already-migrated file — where `to` is present precisely BECAUSE the rename already happened. The
 * source test comes first now (`planVariableRenames` always did it in that order), and this paragraph
 * is rewritten in the same change rather than left standing: a comment that outlives its code tells the
 * next reader what to expect, so they see what they were told and restore the defect on the comment's
 * own authority. That is #1049's shape, and this was a live instance of it.
 *
 * That same measurement is what separates a swap from a **chain** (`surface`→`color` alongside
 * `color`→`color.appearance`), which the static check first reported as a cycle and then, correctly, as
 * a chain it could not order. A chain is fully migratable under one order and refuses safely under the
 * other, so it was a different problem with a different fix — and #1013 is that fix. See
 * `planCollectionRenames`.
 *
 * ## When the map is wrong
 *
 * Every hazard resolves to *refuse and report*, never to a partial write, and the split between
 * static and apply-time is load-bearing:
 *
 *   - **static** (`validateRenameMap`, before any write): self-entries, VARIABLE chains, fan-**out**
 *     (one source claiming two targets), duplicate collection entries, collection CYCLES. Refusing
 *     variable chains statically is what makes the variable apply pass order-independent — no group's
 *     target can be another group's source, so outcomes don't depend on iteration order. A COLLECTION
 *     chain is no longer refused: `planCollectionRenames` orders it, which is the ordering guarantee
 *     `upsertCollection` was never in a position to give (#1035).
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

/** A collection to migrate. Authored, not derived — see the header. `since` is an `ENGINE_VERSION`
 *  (a collection name is invisible to the contract), unlike `VarRename.since`. */
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
 * The colour ROLE set is materialised into two collections, so one renamed contract path can carry
 * **two** Figma names and a one-collection map leaves the twin silently orphaned — measured at 3 of the
 * live entries before #1013. Both projections are emitted; the twin with no counterpart in a given file
 * reports `source-absent`, so over-projecting is self-correcting and under-projecting is not.
 *
 * Since #1013 the two are `color.appearance` (the VALUE tier — 242 roles, one mode per appearance) and
 * `color` (the ALIAS tier — the 128 roles that have an inverse counterpart, two surface modes). They
 * were `color` and `surface`. The measured subset relation is unchanged by the swap: 128 of the 242
 * roles are also alias-tier roles, and every alias-tier role is a value-tier role.
 *
 * **The value tier is listed first, and that is not cosmetic.** `color.appearance` is where a renamed
 * role's variable actually lives in every brand; `color` holds it only for the 128. A reader scanning
 * the projections should meet the one that fires first.
 */
export const MIRRORED_COLLECTIONS: Record<string, readonly string[]> = { color: ['color.appearance', 'color'] };

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

/**
 * A root's TIER segment — the one segment that sits between the root and the role in the value tier's
 * variable names. Per-root and closed, rather than "strip a second segment when it looks like a tier":
 * only the colour axis has two tiers, `appearance` is not any role's first segment in any brand, and
 * there is no `space/appearance/*`. A guess would be a rule about a naming convention; this is a fact
 * about two collections.
 */
const TIER_SEGMENT: Record<string, string> = { color: 'appearance' };

/**
 * The ROLE a Figma variable name carries, with its tier prefix stripped.
 *
 * `color/text/primary` (alias tier) and `color/appearance/text/primary` (value tier) are the same role
 * materialised twice, and the tier prefix is the only difference — so the ROLE is what a contract rename
 * projects, never the raw name. Stripping is also what makes the projection era-independent: a
 * deprecation recorded before #1013 spells its path with no `appearance` segment and one recorded after
 * spells it with one, and re-rooting the raw name would produce `color.appearance/text/primary` (a dot
 * where the emission has a slash) from the first and `color/appearance/appearance/…` from the second.
 */
const roleOf = (figmaName: string): string => {
  const seg = figmaName.split('/');
  const tier = TIER_SEGMENT[seg[0]];
  return seg.slice(tier !== undefined && seg[1] === tier ? 2 : 1).join('/');
};

/** Spell one role into one collection. The collection name IS the tier prefix, dots to slashes:
 *  `color.appearance` holds `color/appearance/*`, `color` holds `color/*`, `space` holds `space/*`.
 *  `core-palette` holding `palette/*` is the counterexample, and is why `PROJECTED_ROOTS` is a closed
 *  list rather than "every collection". */
const reRoot = (figmaName: string, collection: string): string =>
  [...collection.split('.'), roleOf(figmaName)].join('/');

/**
 * Every candidate Figma projection of one deprecation: the ROLE, spelled into each collection the root
 * materialises into. Empty for a root that materialises no variable collection, for a cross-root
 * rename, and for a tier-only move.
 *
 * `from` is spelled in the CURRENT materialisation (`color/appearance/<role>`), not in whatever spelling
 * a given file happens to hold. A pre-#1013 file holds `color/<role>` there instead, and the
 * MATERIALIZATION rules are what carry it to the current spelling — the executor composes the two in
 * that order (materialisation first, then contract) so a variable needing both moves in one step rather
 * than through an intermediate name no plan asks for. See `applyVariableRenames` in `write-figma.ts`.
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
  // TIER-ONLY: the contract path moved and the ROLE did not. #1013's 114 entries are all of this shape
  // (`color.background.inverse.primary` → `color.appearance.background.inverse.primary`). There is no
  // variable rename to derive from one: what changed on the Figma side is the tier prefix on every
  // variable in the collection, which is a MATERIALIZATION rename and is recorded as a rule in
  // `materialization-renames.ts`. Projecting it anyway would emit 228 self-renames — which
  // `validateRenameMap` refuses, so it would be loud rather than silent — and, worse, would put two
  // differently-derived records in front of one Figma operation.
  if (roleOf(from) === roleOf(to)) return [];
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
 * Authored collection renames. Empty was the honest state while #1013 Q4 was open; #1013 took the
 * decision, and these are its first two entries.
 *
 * **They are a CHAIN, deliberately, and the order they must apply in is not the order they are written
 * in — it is computed.** `color` has to be vacated before `surface` can be renamed into it, so
 * `planCollectionRenames` topologically orders the map and the executor applies the whole thing as one
 * pre-pass. Reordering this array changes nothing; that is the point (docs/44 §3 measured that there was
 * no map order to sort in the first place).
 *
 * `since` is an **`ENGINE_VERSION`**, not a `CONTRACT_VERSION`: a collection name is a materialisation
 * choice the contract cannot see, so the version that means anything here is the one that answers "what
 * code produced this file?"
 */
export const COLLECTION_RENAMES: CollectionRename[] = [
  // The VALUE tier vacates the short name. It keeps every variable and every id; only the collection's
  // own name moves, so a designer's bindings into it are untouched by this entry alone.
  { from: 'color', to: 'color.appearance', since: '0.25.0' },
  // The ALIAS tier takes it. This is the entry that has to wait: `color` is occupied until the one above
  // has applied, and applying this first leaves `target-occupied` and a half-migrated file.
  { from: 'surface', to: 'color', since: '0.25.0' },
];

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
  // `from → to` as a graph, so a target that is also a source can be told apart from one that closes a
  // loop. First entry wins on a duplicate source; the duplicate itself is refused separately below.
  const cEdges = new Map<string, string>();
  for (const c of map.collections) if (!cEdges.has(c.from)) cEdges.set(c.from, c.to);
  /** Does following the edges out of `entry.to` arrive back at `entry.from`? */
  const closesLoop = (entry: CollectionRename): boolean => {
    let at = entry.to;
    for (let step = 0; step <= map.collections.length && cEdges.has(at); step++) {
      at = cEdges.get(at)!;
      if (at === entry.from) return true;
    }
    return false;
  };
  const seenFrom = new Set<string>();
  const seenTo = new Set<string>();
  for (const c of map.collections) {
    if (c.from === c.to) bad.push(`collection self-rename: ${c.from} → itself`);
    // A target that is also a source is one of TWO different problems, and since #1013 only one of them
    // is still a problem (docs/44 §3, measured):
    //   • CYCLE — the walk returns to this entry's own source. NO ordering migrates it; both entries of
    //     a swap find their target occupied in both directions. A two-phase temp name is the only fix
    //     and this module does not do one, so it refuses.
    //   • CHAIN — the walk terminates. An ordering DOES exist that migrates every entry, and
    //     `planCollectionRenames` computes it. This used to refuse anyway, and the reason was honest:
    //     the apply order was the executor's sequence of `upsertCollection` calls, not the map's to
    //     choose. #1035 hoisted the renames into one pre-pass, which is where that ordering became the
    //     map's — so a chain now PASSES, and `COLLECTION_RENAMES` ships one.
    //
    // The walk is a walk and not a one-hop test because a two-entry probe cannot tell a 3-cycle from a
    // 3-chain: mutating `closesLoop` to a single hop reports every entry of `a→b→c→a` as a chain, which
    // after this change means reporting a cycle as nothing at all.
    if (cSources.has(c.to) && closesLoop(c))
      bad.push(`collection rename cycle: ${c.from} → ${c.to} closes a loop back to ${c.from} — no ordering migrates it, so a swap needs a two-phase temp name, which this does not do`);
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
 * One MATERIALIZATION transformation, restated structurally rather than imported.
 *
 * `materialization-renames.ts` owns `MaterializationRule`, and it is structurally forbidden from
 * importing this module (`docs/34` shape 11, and its own header): this one imports `figmaVarName`, so the
 * import would put a name-PRODUCING function in scope of the module whose whole job is to state the
 * transformation independently of one. Restating the shape on this side is the same trade `CollectionMove`
 * makes on that side, in the same direction, for the same reason — `write-figma.ts` is the one place both
 * are in scope at once, and it is a consumer of both rather than a definer of either.
 */
export type MaterializationStep = {
  id: string;
  since: string;
  domain: (collection: string, name: string) => boolean;
  map: (collection: string, name: string) => string;
};

/**
 * Compose the two kinds of rename into ONE per-collection list, for one collection's live names.
 *
 * A variable can need both: `surface/text/primary` in a pre-#1013 file has to reach
 * `color/text/primary` (materialization) and would then also follow any contract rename of that role.
 *
 * ── MATERIALIZATION FIRST, THEN CONTRACT — AND WHY IT IS ONE STEP, NOT TWO ────────────────────────
 *
 * The two are composed into a single `{from, to}` per live name, so a variable needing both moves ONCE.
 * Applying them as two passes would route it through an intermediate name — `color/text/primary` on the
 * way to wherever the contract sends it — and that intermediate is not in the write plan, so the first
 * pass would report `target-not-planned` and refuse, and the second would find its source absent. Two
 * correct rules, composed in the obvious way, migrating nothing and reporting a refusal for each.
 *
 * The ORDER within the composition is fixed and is not a preference: `projectionsOf` spells its `from`
 * side in the CURRENT materialisation (`color/appearance/<role>`), because that is what the emission
 * writes today. So a contract row can only be matched after the materialization step has carried the
 * live name into today's spelling.
 *
 * ── WHY EVERY CONTRACT ROW STILL PASSES THROUGH ──────────────────────────────────────────────────
 *
 * Rows whose source is not live are appended rather than dropped, so `planVariableRenames` still reports
 * them as `source-absent`. The mirror over-projects on purpose (see `MIRRORED_COLLECTIONS`) and that is
 * only safe while an absent source is a reported no-op; silently filtering them here would make the
 * report say "checked, none" where it should say "checked, not present."
 *
 * ── FAN-IN IS LEFT TO `planVariableRenames`, DELIBERATELY (#1056) ─────────────────────────────────
 *
 * Two live names can compose onto one target — a half-migrated file holding both `color/text/primary`
 * and `color/appearance/text/primary` is the realistic case. Nothing is resolved here: the rows go to
 * `planVariableRenames`, which groups by target and reports `target-occupied` or `ambiguous-source` and
 * moves NEITHER. Picking a winner here would be the destructive version of the same shape, one layer
 * below the code that exists to refuse it.
 *
 * A composition that lands back on the name it started from is dropped, not emitted as a self-rename —
 * `validateRenameMap` refuses those in the static map, and there is no reason for the composed list to
 * be able to contain one.
 */
export const composeVariableRenames = (
  collection: string,
  existing: Iterable<string>,
  contract: readonly VarRename[],
  rules: readonly MaterializationStep[],
): VarRename[] => {
  const rows = contract.filter((r) => r.collection === collection);
  const byFrom = new Map(rows.map((r) => [r.from, r] as const));
  const out: VarRename[] = [];
  const consumed = new Set<string>();
  for (const from of existing) {
    const rule = rules.find((r) => r.domain(collection, from));
    const mid = rule ? rule.map(collection, from) : from;
    const row = byFrom.get(mid);
    const to = row?.to ?? mid;
    if (to === from) continue;
    consumed.add(mid);
    out.push({ collection, from, to, since: row?.since ?? rule?.since ?? '' });
  }
  for (const r of rows) if (!consumed.has(r.from)) out.push(r);
  return out;
};

/** The order the renames must APPLY in: an entry whose TARGET is another entry's SOURCE waits for that
 *  entry, because the name has to be vacated first. A cycle admits no such order — `validateRenameMap`
 *  refuses one statically, and this falls back to input order rather than looping forever if a caller
 *  skipped that check. */
const topoOrder = (renames: readonly CollectionRename[]): CollectionRename[] => {
  const pending = [...renames];
  const out: CollectionRename[] = [];
  while (pending.length) {
    const i = pending.findIndex((e) => !pending.some((o) => o !== e && o.from === e.to));
    if (i < 0) { out.push(...pending); break; } // cycle — refused statically; keep input order
    out.push(...pending.splice(i, 1));
  }
  return out;
};

/**
 * Decide EVERY collection rename against the file, in the order they must apply, before touching
 * anything. The collection half of the #1035 pre-pass.
 *
 * ── ATOMICITY IS THE CALLER'S OBLIGATION, AND THIS FUNCTION IS WHAT MAKES IT FREE ───────────────
 *
 * This is pure: it plans the whole ordered sequence against a *simulated* name set and writes nothing.
 * So the executor can see every outcome before it renames anything, and **must**: if any outcome is a
 * refusal it applies NONE of them. That obligation is what makes "refused, not half-applied" a property
 * rather than an aspiration. Half-applying a chain leaves a file with the value tier renamed and the
 * alias tier still called `surface` — a state no run of the engine produces, so nothing downstream can
 * recognise it, and the next run reads the leftover `surface` as pre-migration and the leftover
 * `color.appearance` as done. A caller that applies outcomes as it walks them, or that skips the refusal
 * check, has deleted the guarantee while leaving this comment standing.
 *
 * ── WHY THE ORDER IS COMPUTED AND NOT AUTHORED ──────────────────────────────────────────────────
 *
 * `topoOrder` puts an entry after any entry whose source is this entry's target. For
 * `COLLECTION_RENAMES` that is `color → color.appearance` before `surface → color`, whichever order the
 * array is written in. Before #1035 the apply order was the executor's sequence of `upsertCollection`
 * calls — which happened to be the right one, for a reason documented as being about alias resolution,
 * with nothing anywhere recording that a migration depended on it (docs/44 §3).
 *
 * ── THE THREE STATES, AND THE ONE THAT LOOKS LIKE A CONFLICT ─────────────────────────────────────
 *
 * A file sits somewhere on the chain, and the middle name is present in two of the three states:
 *
 *   | file holds                    | meaning          | `color → color.appearance` reads as        |
 *   |-------------------------------|------------------|-------------------------------------------|
 *   | `color`, `surface`            | pre-migration    | migrated                                  |
 *   | `color.appearance`, `surface` | half-migrated    | source-absent (the other entry migrates)  |
 *   | `color.appearance`, `color`   | already migrated | source present AND target present         |
 *
 * That last row is the trap, and it is the one a fresh post-#1013 file is in. One entry at a time,
 * `color` is present and `color.appearance` is present, which reads as `target-occupied` — a permanent
 * refusal on a healthy file. It is not a conflict: the `color` seen there is the OTHER entry's product.
 * The test says exactly that — a source that is itself another entry's target, with this entry's target
 * already present, means this entry has already applied. A genuine conflict (a hand-made
 * `color.appearance` beside a pre-#1013 `color` and `surface`) is still caught, by the second entry,
 * whose source is nobody's target.
 */
export const planCollectionRenames = (
  existing: Iterable<string>,
  renames: readonly CollectionRename[],
): RenameOutcome[] => {
  const have = new Set(existing);
  const targets = new Set(renames.map((c) => c.to));
  const out: RenameOutcome[] = [];
  for (const entry of topoOrder(renames)) {
    const at = (status: RenameStatus): RenameOutcome =>
      ({ kind: 'collection', collection: entry.from, from: entry.from, to: entry.to, status });
    // SOURCE FIRST. The target test came first before #1013, which returned `target-occupied` on a file
    // that had already been migrated — permanently, since the condition never clears. See the header for
    // why the paragraph vouching for that order had to be rewritten in the same change as this line.
    if (!have.has(entry.from)) { out.push(at('source-absent')); continue; }
    if (have.has(entry.to)) {
      out.push(at(targets.has(entry.from) ? 'source-absent' : 'target-occupied'));
      continue;
    }
    have.delete(entry.from);
    have.add(entry.to);
    out.push(at('migrated'));
  }
  return out;
};
