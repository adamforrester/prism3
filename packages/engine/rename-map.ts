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
 * (`color` → `color.appearance` and `surface` → `color`), which between them were a CHAIN; #1097
 * retargeted the second to `surface` → `color.surface` and the chain went. **#1148 retired both and the
 * map holds ONE entry, `color.appearance` → `color`** — see the register for why retiring them was
 * forced rather than tidy. The ordering machinery below stays, and its coverage lives in a fixture; the
 * paragraphs are about a shape the map HELD, which is worth knowing precisely because the next entry
 * could reintroduce it.
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
 * **Since #1097 no shipped entry exercises that ordering, and that is a coverage fact worth stating
 * where the code is.** The chain arms in `test.ts` drive an authored pair, not `COLLECTION_RENAMES`; one
 * of them was pointed at the live map and went from proving the sort to proving nothing the moment the
 * chain left the data, silently. If a future entry reintroduces a chain, the fixture is already there —
 * do not delete it on the grounds that the map is simple today.
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
 *     `upsertCollection` was never in a position to give (#1035). The shipped map stopped holding one at
 *     #1097; the guarantee is unchanged.
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
import { DEPRECATIONS, satisfiesBump, type Deprecation } from './version';
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

/* ── THERE IS NO MIRROR (#1148) ────────────────────────────────────────────────────────────────────
 *
 * `MIRRORED_COLLECTIONS` — `{ color: ['color.appearance', 'color.surface'] }` — is DELETED rather than
 * reduced to `{ color: ['color'] }`, and the distinction is `docs/34` shape 9: an identity mirror is a
 * register that mirrors nothing, and the next reader has to derive that from its contents instead of
 * reading it. `projectionsOf`'s `?? [root]` fallback is now the only path, which is what "one collection"
 * means expressed as code.
 *
 * WHAT THE MIRROR WAS FOR, so its loss is not mistaken for a simplification. The colour role set was
 * materialised TWICE — `color.appearance` (the value tier, one mode per appearance) and `color.surface`
 * (the pointer tier, the non-inverse roles only) — so one renamed contract path carried TWO Figma names,
 * and a one-collection map left the twin silently orphaned (measured at 3 of the live entries before
 * #1013). Emitting both projections fixed that: the twin with no counterpart in a given file reported
 * `source-absent`, so over-projecting was self-correcting and under-projecting was not.
 *
 * #1148 removes the second materialisation, not the safeguard's reasoning. One role is one variable in
 * one collection, so there is no twin left to under-project — the asymmetry the mirror existed to
 * absorb is gone with the tier that created it. If a second colour collection ever returns, this is
 * the register to bring back, and `planVariableRenames`'s branch-order comment (#1087) is where the
 * over-projection was absorbed.
 */

/**
 * Contract roots that are ALSO the name of an emitted Figma variable collection — measured, 9 of the 16
 * guaranteed roots. Only these project: a deprecation on any other root has no variable to migrate, and
 * emitting an entry for it would produce a map row that can never fire and can never be reported. An
 * entry nothing will ever look at is worse than no entry, because it inflates the map's own count.
 *
 * The other 7 are excluded for three different reasons, and none of them is "we forgot": `core` and
 * `type` live in collections whose variables are named after a GROUP inside them (`core` holds
 * `palette/*`, `dimension/*` and `font/*`; `type-sets` holds `font-fluid/*`), so projecting them would
 * need a prefix rule that is a guess about a naming convention rather than a fact about the emission;
 * `shadow` materialises as Figma STYLES, where a rename is a different operation on a different API;
 * `motion`, `breakpoint`, `container` and `grid` have no variable counterpart at all (Figma has no
 * easing variable, and the rest are consumed as values, not bound). A deprecation landing on any of them
 * fails the `test.ts` arm that pins the unprojected set by NAME — so it forces the decision rather than
 * skipping it quietly.
 *
 * ── `core` IS AN EMITTED COLLECTION NAME SINCE #1097, AND IS STILL NOT LISTED ──────────────────────
 *
 * The three primitive collections merged into one called `core`, so for the first time the root and a
 * collection agree — and `reRoot` would spell `core/palette/red/550`, which is exactly what the emission
 * carries below the brand root. Adding it would nonetheless produce nothing: no deprecation has `core` as
 * its PATH root. #1102's 164 entries move INTO the tier (`palette.red.550` → `core.palette.red.550`), so
 * their path root is `palette`/`dimension`/`font`, and a cross-root replacement is refused as a MOVE in
 * any case. An inert entry is the thing this list exists to avoid, so the decision is recorded here
 * rather than taken speculatively — and the `test.ts` arm that pins the unprojected set by name is what
 * forces it to be re-taken the first time a rename lands INSIDE the tier.
 *
 * `test.ts` asserts every root here is genuinely an emitted collection name, against the corpus. That
 * check is the reason this can be an authored list at all: the claim is verified against the emission
 * rather than trusted.
 */
export const PROJECTED_ROOTS: readonly string[] = [
  'border-width', 'color', 'control', 'focus', 'icon', 'opacity', 'radius', 'size', 'space',
];

/**
 * A root's TIER segment — the one segment that sat between the root and the role in the value tier's
 * variable names. Per-root and closed, rather than "strip a second segment when it looks like a tier":
 * only the colour axis ever had two tiers, `appearance` is not any role's first segment in any brand,
 * and there is no `space/appearance/*`. A guess would be a rule about a naming convention; this is a
 * fact about the emission.
 *
 * **HISTORICAL SINCE #1148, AND LOAD-BEARING FOR EXACTLY THAT REASON.** No live variable carries an
 * `appearance` segment any more — there is one colour collection and its names are `color/<role>`. The
 * entry stays because `DEPRECATIONS` spells each `path` in the era that retired it, and two eras' worth
 * of them are spelled `color.appearance.<role>`. Delete it and `roleOf` reads `appearance/` as part of
 * the role, so the TIER-ONLY guard in `projectionsOf` stops firing and #1148's own 243 entries project
 * `color/appearance/<role>` → `color/<role>` as contract renames. Those spellings are not wrong — they
 * are the materialisation rule `color-one-collection-1148` states, arrived at from the other register —
 * which is the failure: two differently-derived records in front of one Figma operation, reported by
 * `lint-materialization-renames.ts` as CLAIMED BY MORE THAN ONE RULE. Loud, then, rather than silent,
 * which is the only reason this note can be short.
 */
const TIER_SEGMENT: Record<string, string> = { color: 'appearance' };

/**
 * The ROLE a Figma variable name carries, with its tier prefix stripped.
 *
 * Stripping is what makes the projection ERA-INDEPENDENT, and that is now its whole job. A deprecation
 * recorded before #1013 spells its path with no `appearance` segment, one recorded between #1013 and
 * #1148 spells it with one, and one recorded since spells it without again; re-rooting the raw name
 * would produce `color.appearance/text/primary` (a dot where the emission has a slash) from the middle
 * era. Reduced to the role, all three eras name the same thing, which is what a contract rename is
 * actually about.
 *
 * It also used to reconcile the two live materialisations of one role — `color/text/primary` in the
 * pointer tier and `color/appearance/text/primary` in the value tier. #1148 left one, so that half of
 * the reason is history; see the note where `MIRRORED_COLLECTIONS` was.
 */
const roleOf = (figmaName: string): string => {
  const seg = figmaName.split('/');
  const tier = TIER_SEGMENT[seg[0]];
  return seg.slice(tier !== undefined && seg[1] === tier ? 2 : 1).join('/');
};

/* ── AND NO `NAME_PREFIX` EXCEPTION EITHER (#1148) ──────────────────────────────────────────────────
 *
 * `NAME_PREFIX` — `{ 'color.surface': ['color'] }` — went with the collection it was about. It existed
 * because #1089 named the pointer tier's AXIS (`color.surface`) while its variables kept their `color/*`
 * tails, so `reRoot`'s split-the-collection-name-on-dots rule would have spelled `color/surface/<role>`,
 * a name no brand emitted — and silently, since a row whose target is absent is a reported no-op by
 * design. With one collection named `color` holding `color/*`, the split rule is simply true again.
 *
 * It is DELETED rather than left as an empty record, same reason as the mirror above: an empty lookup is
 * `docs/34` shape 9, a vocabulary that reads as a pass. If a collection is ever again named something
 * other than the prefix its variables carry, this is the exception to reinstate.
 */

/** Spell one role into one collection: the collection name is the variables' prefix, dots to slashes —
 *  `color` holds `color/*`, `space` holds `space/*`. `core` holding `palette/*`, `dimension/*` and
 *  `font/*` is the counterexample that keeps `PROJECTED_ROOTS` a closed list rather than "every
 *  collection".
 *
 *  The BRAND ROOT is deliberately absent here (#1097). Every emitted name carries it, and these rows do
 *  not: they are tails, derived from `DEPRECATIONS`, where nothing is brand-specific.
 *  `composeVariableRenames` is the one layer that puts it on — see its header. */
const reRoot = (figmaName: string, collection: string): string =>
  [...collection.split('.'), roleOf(figmaName)].join('/');

/**
 * Every candidate Figma projection of one deprecation: the ROLE, spelled into each collection the root
 * materialises into. Empty for a root that materialises no variable collection, for a cross-root
 * rename, and for a tier-only move.
 *
 * `from` is spelled in the CURRENT materialisation (`color/<role>` since #1148), not in whatever spelling
 * a given file happens to hold. A #1013-to-#1147 file holds `color/appearance/<role>` there instead, and
 * the MATERIALIZATION rules are what carry it to the current spelling — the executor composes the two in
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
  // TIER-ONLY: the contract path moved and the ROLE did not. There is no variable rename to derive from
  // one: what changed on the Figma side is the tier prefix on every variable in the collection, which is
  // a MATERIALIZATION rename and is recorded as a rule in `materialization-renames.ts`. Projecting it
  // anyway would emit self-renames — which `validateRenameMap` refuses, so it would be loud rather than
  // silent — and, worse, would put two differently-derived records in front of one Figma operation.
  //
  // TWO ERAS OF ENTRIES ARE THIS SHAPE, IN OPPOSITE DIRECTIONS, and the guard is one line for both.
  // #1013's 114 added the tier (`color.background.inverse.primary` → `color.appearance.…`) and #1148's
  // 243 take it away again (`color.appearance.background.primary` → `color.background.primary`). `roleOf`
  // is what makes the direction irrelevant; `TIER_SEGMENT` is what makes `roleOf` work, and its note
  // says what a deletion there costs.
  if (roleOf(from) === roleOf(to)) return [];
  // ONE row, because one role is one variable — the root IS the collection since #1148. This read
  // `(MIRRORED_COLLECTIONS[root] ?? [root]).map(...)` while the colour axis materialised twice; the note
  // where that register was says what the mirror bought and what would bring it back.
  return [{ collection: root, from: reRoot(from, root), to: reRoot(to, root), since: d.since }];
};

/** Strictly newer, in terms of the one semver comparator this repo owns — `'patch'` accepts an
 *  increment at any level, so this is "b < a" and not "b is a patch behind a". */
const newer = (a: string, b: string): boolean => satisfiesBump(b, a, 'patch');

/**
 * The derived variable map. Callers filter by collection; the executor does exactly that.
 *
 * **COLLAPSED BY SPELLING, and #1140 is why.** Two deprecations can project the SAME Figma rename,
 * because `projectionsOf` follows the ROLE and one role is reachable from more than one contract path.
 * #1013's entry for `color.background.inverse.primary` and #1140's for
 * `color.appearance.background.inverse.primary` both strip to the same pair —
 * `color/appearance/background/inverse/primary` → `color/appearance/inverse/background/primary`. That is
 * not a mistake in either record: `replacedBy` follows the LIVE name by rule (`version.ts`), so a
 * historical entry acquires a role delta it did not itself cause the moment a later release moves the
 * role.
 *
 * **Without this collapse the duplicate is not merely noisy — it is a REFUSAL.**
 * `planVariableRenames` groups by target and reads two live rows as `ambiguous-source`, which is right
 * for genuine fan-in (two DIFFERENT old names claiming one new one) and wrong for one name recorded
 * twice. Measured on the live map at #1140: 532 rows, 306 distinct, and every one of the 113 inverse
 * renames refused in a designer's file that held the old names — the exact stranding #893 sequenced the
 * whole mechanism to prevent, arriving through the migration record rather than through the emission.
 *
 * The survivor keeps the GREATEST `since`, not the first one seen. The field answers "at which contract
 * version did this Figma name stop being written?", and for a role that moved in 8.0.0 the answer is
 * 8.0.0 however old the other entry's own retirement is.
 */
export const deriveVariableRenames = (deps: readonly Deprecation[] = DEPRECATIONS): VarRename[] => {
  const bySpelling = new Map<string, VarRename>();
  for (const r of deps.flatMap(projectionsOf)) {
    const key = `${r.collection}|${r.from}|${r.to}`;
    const held = bySpelling.get(key);
    if (!held || newer(r.since, held.since)) bySpelling.set(key, r);
  }
  return [...bySpelling.values()];
};

/**
 * Authored collection renames. Empty was the honest state while #1013 Q4 was open; #1013 gave it two
 * entries, and **#1148 retired both and left one.**
 *
 * `since` is an **`ENGINE_VERSION`**, not a `CONTRACT_VERSION`: a collection name is a materialisation
 * choice the contract cannot see, so the version that means anything here is the one that answers "what
 * code produced this file?"
 *
 * **That stamping is asserted, and only became asserted after it had already gone wrong.** #1013's two
 * entries first shipped reading `0.25.0` — the version of a different, concurrent change — because
 * `MATERIALIZATION_RENAMES` was gated against exactly this drift and this map was not. `test.ts` carries
 * the mirror arm; it is a tripwire on the next version bump rather than a durable rule, and the
 * reasoning for why that is the right shape today is at the assertion.
 *
 * **When that arm goes red after a version bump, restamping an entry to the new version is the wrong
 * fix** — it is the false provenance record all over again. A stamp is historical and stays put; the arm
 * is what expires. Its failure message says so at length. (#1097 established the corollary: a RETARGET
 * is not a restamp either — it moved the alias entry's target and left its `since` alone, because the
 * field answers when the SOURCE name was retired, not when the entry was last edited.)
 *
 * ── WHY #1148 RETIRED THE TWO #1013 ENTRIES, WHICH IS FORCED AND NOT TIDYING ─────────────────────
 *
 * Retiring an entry from a MIGRATION list normally strands whoever has not migrated yet, so neither
 * removal is casual. Both are compelled, for different reasons, and each would break something if left:
 *
 *   · **`color` → `color.appearance` would form a CYCLE** with the new entry — `color.appearance` →
 *     `color` → `color.appearance`. `closesLoop` refuses a cycle statically, and `validateRenameMap`'s
 *     result aborts the whole pass before any write, so leaving it in place does not strand one
 *     collection: it neuters every rename in the map, variables included. This is the one edit in #1148
 *     that fails loudly if got wrong, and it fails on the FIRST run rather than on some file's shape.
 *   · **`surface` → `color.surface` would rename a designer's collection INTO A NAME NOTHING WRITES.**
 *     That is precisely the #1108 stranding this entry was retargeted to fix, arriving again from the
 *     other direction: #1089 moved the target out from under it, and #1148 deletes the target outright.
 *     Left standing, a pre-#1013 file's `surface` collection is renamed to `color.surface`, no executor
 *     ever writes that collection again, and every variable and binding in it is stranded in a
 *     collection nothing owns — reported by nothing.
 *
 * **A pre-#1013 `surface` collection is therefore no longer migrated at all, and that is the honest
 * outcome rather than a gap.** It held the ALIAS tier, which #1148 deletes; there is nothing left for it
 * to become. It is left in place, holding stale aliases, exactly as a hand-made collection would be —
 * see the note in `write-figma.ts` about what the deletion of `applySurfacePlan` takes with it.
 */
export const COLLECTION_RENAMES: CollectionRename[] = [
  // The VALUE tier takes the short name back. It keeps every variable and every id — only the
  // collection's own name moves — so every binding a designer made into `color.appearance` survives
  // untouched, which is the whole reason the collapse renames this tier rather than the pointer tier.
  //
  // **THE DIRECTION IS FORCED BY THE FIGMA API AND IS NOT A PREFERENCE.**
  // `Variable.variableCollectionId` is `readonly` (`@figma/plugin-typings`), so a variable can never be
  // re-parented: the only way one collection's contents end up under another collection's NAME is to
  // rename that collection. Renaming the POINTER tier onto `color` instead would orphan the values and
  // all four appearance modes — strictly worse, and unrecoverable by any later run.
  //
  // TWO CONSEQUENCES FOR AN EXISTING FILE, both refuse-or-report rather than corruption, and both
  // measured rather than reasoned about:
  //   · A file written at 0.27.0–0.29.0 holds `color.appearance` + `color.surface`. This entry migrates,
  //     and `color.surface` is left ORPHANED — Figma cannot merge it, so it keeps its variables and its
  //     bindings, which go on resolving through their aliases. Nothing reports it now that
  //     `applySurfacePlan`'s `orphans` is gone; filed as #1152 rather than papered over.
  //   · A file written in the narrow 0.26.x window — after #1013, before #1089 named the pointer tier's
  //     axis — holds `color.appearance` + `color`, because the pointer tier was briefly called `color`.
  //     This entry's target is occupied by a collection that is NOT another entry's product, so
  //     `planCollectionRenames` returns `target-occupied` and the executor's atomicity rule applies NONE
  //     of the map. Safe, loud, and the recovery is one manual rename of that stale `color` collection
  //     out of the way. A two-phase temp name is the only mechanical fix and this module does not do one.
  { from: 'color.appearance', to: 'color', since: '0.30.0' },
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
    //     map's — so a chain PASSES. `COLLECTION_RENAMES` shipped one at #1013 and holds one entry
    //     since #1148, so today nothing exercises this from the live map; the fixture in `test.ts` is
    //     deliberate rather than redundant, and its own comment says so.
    //
    // **THE CYCLE BRANCH IS WHY #1148 COULD NOT SIMPLY ADD ITS ENTRY.** `color.appearance` → `color`
    // beside #1013's `color` → `color.appearance` is a 2-cycle, which is refused here — and
    // `validateRenameMap`'s non-empty result aborts the pass before any write, so the cost is not one
    // stranded collection but every rename in the map. See `COLLECTION_RENAMES`.
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
    // NO LIVE SOURCE IS TESTED FIRST, and the order is the whole of #1087.
    //
    // Reversed — `target-not-planned` first — a row with nothing to migrate is reported as a REFUSAL
    // rather than as the benign no-op it is, and `isRefusal()` counts it. Measured: **37 of the 80
    // derived rows** came back `target-not-planned` on a FRESH, EMPTY file, where by construction no
    // source exists and nothing could have been migrated by any ordering. All 37 are MIRROR rows in the
    // group's PARTIAL member — the alias tier, which carries 128 of the value tier's 242 names — and
    // every one has a twin in the other member that is planned and does migrate, so nothing was ever
    // lost: the user was warned about a filter doing its job.
    //
    // Named by ROLE rather than by tier ON PURPOSE, because the tiers were renamed underneath this
    // comment while the fix was in review. The partial member was `surface` before #1082 and is `color`
    // after it, with the value tier moving to `color.appearance`; a sentence naming them was correct
    // when written and inverted one merge later. The 37 were re-measured on both layouts — identical in
    // count, in split, and in emission-wide resolution (0 of 37), across all three brands — which is
    // the evidence that this is the branch order and not the arrangement.
    //
    // This module's own header already described the correct behaviour: *"the mirror that has no
    // counterpart in a given file simply reports `source-absent`, so over-projecting is
    // self-correcting."* That is the design; the branch order was not it. `projectionsOf` over-projected
    // DELIBERATELY, and this is where the over-projection was supposed to be absorbed quietly.
    //
    // **#1148 REMOVED THE OVER-PROJECTION AND THE BRANCH ORDER IS STILL THE FIX.** One colour collection
    // means one row per rename, so none of the 37 mirror no-ops exists any more and the measurement above
    // is history. The order stays because the reason generalises past the mirror: a fresh file has NO
    // sources for any row, and reporting all of them as refusals would make a clean first run read as
    // dozens of failures. Restoring the old order would go quiet on that until someone ran the plugin on
    // an empty file — which is #1087's own failure mode, one register later.
    //
    // A source that IS present with an unplanned target is still `target-not-planned` — a real refusal,
    // because a variable exists and cannot be renamed to a name the plan does not write. That case is
    // untouched, which is what makes this a reordering rather than a weakening.
    if (live.length === 0) out.push(...group.map((r) => at(r, 'source-absent')));
    else if (!want.has(to)) out.push(...group.map((r) => at(r, 'target-not-planned')));
    else if (have.has(to)) out.push(...live.map((r) => at(r, 'target-occupied')));
    // Two live rows mean two DIFFERENT old names claiming one new one — genuine fan-in, unresolvable.
    // It reads that way only because the rows reaching here are distinct by spelling:
    // `deriveVariableRenames` collapses the same rename recorded under two contract paths (see its
    // header, #1140), and `test.ts` pins the map duplicate-free. Undo that and this branch starts
    // reporting one name recorded twice as ambiguous, refusing a migration that is not in doubt at all.
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
  domain: (collection: string, name: string, root: string) => boolean;
  map: (collection: string, name: string, root: string) => string;
};

/**
 * Carry one live name through the materialization rules until none of them claims it (#1097).
 *
 * ── A CHAIN, WHERE THE ACCOUNTING IS SINGLE-APPLICATION, AND THE ASYMMETRY IS THE POINT ────────────
 *
 * `accountFor` asks each rule about each key ONCE and fails a key two rules both claim, because a claim is
 * a PAIRING and two pairings for one name is an ambiguity, not a composition. That is right for a record
 * of one commit's diff: the merge base is a single point in time and every key moved once.
 *
 * A designer's file is not a single point in time. It can sit two eras back — `color/appearance/text/primary`
 * in a #1013-to-#1096 file has to reach `<root>/color/text/primary`, which is #1097's rule and then #1148's.
 * Applying only the first match would leave `<root>/color/appearance/text/primary`, a name no plan contains
 * since the collapse, so `planVariableRenames` would report `target-not-planned` and migrate nothing — a
 * correct record and a refused migration, which is the failure this function exists to avoid.
 *
 * **The two hops #1013 introduced are gone and this is still a chain, which is the useful part.** #1148
 * retired both `-1013` rules (see `MATERIALIZATION_RENAMES`), so the example above is a NEW pair rather than
 * the old one restated — the mechanism outlived the rules it was written for, and a reader should expect the
 * next era to need it too rather than assume the chain is vestigial.
 *
 * Exactly the same shape as `recollect` versus `planCollectionRenames`, one layer down and in the same
 * direction: the side that reads a snapshot is single-step, the side that walks a live file composes.
 *
 * Terminating because every rule's domain excludes its own image — #1097's because a rooted name is already
 * rooted, #1148's because no role group is called `appearance`. The cap and the self-map guard are
 * belt-and-braces for a future rule that forgets: a malformed rule stops the walk instead of spinning, and
 * the name it stopped at then fails `planVariableRenames` visibly.
 *
 * `since` is the LAST rule applied — the most recent materialisation the name passed through, which is what
 * a reader of the outcome wants when a name crossed two eras.
 */
const materialize = (
  collection: string,
  name: string,
  root: string,
  rules: readonly MaterializationStep[],
): { name: string; since: string } => {
  let cur = name;
  let since = '';
  for (let i = 0; i <= rules.length; i++) {
    const rule = rules.find((r) => r.domain(collection, cur, root));
    if (!rule) break;
    const next = rule.map(collection, cur, root);
    if (next === cur) break;                     // a rule that maps its own domain member to itself
    cur = next;
    since = rule.since;
  }
  return { name: cur, since };
};

/**
 * Compose the two kinds of rename into ONE per-collection list, for one collection's live names.
 *
 * A variable can need both: `color/appearance/on-inverse/text/primary` in a #1013-to-#1139 file has to
 * reach `<root>/color/inverse/text/primary` — the `appearance/` segment is materialization (#1148) and the
 * `on-inverse` → `inverse` relocation is a contract rename (#1140).
 *
 * ── MATERIALIZATION FIRST, THEN CONTRACT — AND WHY IT IS ONE STEP, NOT TWO ────────────────────────
 *
 * The two are composed into a single `{from, to}` per live name, so a variable needing both moves ONCE.
 * Applying them as two passes would route it through an intermediate name — `<root>/color/on-inverse/text/primary`
 * on the way to wherever the contract sends it — and that intermediate is not in the write plan, so the first
 * pass would report `target-not-planned` and refuse, and the second would find its source absent. Two
 * correct rules, composed in the obvious way, migrating nothing and reporting a refusal for each.
 *
 * The ORDER within the composition is fixed and is not a preference: `projectionsOf` spells its `from`
 * side in the CURRENT materialisation (`color/<role>` since #1148), because that is what the emission
 * writes today. So a contract row can only be matched after the materialization step has carried the
 * live name into today's spelling.
 *
 * ── AND WHERE THE BRAND ROOT ENTERS (#1097) ───────────────────────────────────────────────────────
 *
 * Every emitted name now begins with the brand's `theme.root`, and the contract rows do not carry it —
 * they are TAILS, because `projectionsOf` derives them from `DEPRECATIONS`, where nothing is
 * brand-specific. So this function is the single place the root is put on and taken off: the
 * materialization walk produces a rooted name, the contract lookup happens on its tail, and the row's
 * target is rooted again on the way out. One layer knows the root, and it is the layer #1097 says owns it.
 *
 * ── WHY EVERY CONTRACT ROW STILL PASSES THROUGH ──────────────────────────────────────────────────
 *
 * Rows whose source is not live are appended rather than dropped, so `planVariableRenames` still reports
 * them as `source-absent`. The map is a record of every rename since 2.0.0 and most of it is absent from
 * any given file — a fresh file matches none of it — so "not present" is the common case and must read as
 * one. Silently filtering these here would make the report say "checked, none" where it should say
 * "checked, not present." (Until #1148 the mirror over-projected on purpose too, which made this the
 * mechanism absorbing that as well; the mirror is gone and the rule is unchanged.)
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
  /** The brand's `theme.root` — the first segment of every name the engine emits since #1097. REQUIRED
   *  and undefaulted: a wrong root makes every row's target un-plannable, and there is no value that is
   *  right for more than one brand. `write-figma.ts` derives it from the write plan's own rows. */
  root: string,
): VarRename[] => {
  const rows = contract.filter((r) => r.collection === collection);
  const byFrom = new Map(rows.map((r) => [r.from, r] as const));
  const out: VarRename[] = [];
  const consumed = new Set<string>();
  const prefix = `${root}/`;
  for (const from of existing) {
    const mid = materialize(collection, from, root, rules);
    // THE CONTRACT ROWS ARE TAILS, AND THE ROOT IS ADDED HERE (#1097).
    //
    // `projectionsOf` spells `color/appearance/<role>` — the DTCG path below the brand root, with slashes.
    // It has no brand in scope and should not: the root is a MATERIALISATION fact, which is the whole thesis
    // of #1097, so it enters at the materialisation layer rather than in the contract projection. Threading
    // a root through `renameMap()` instead would put a brand-specific value inside the derivation from
    // `DEPRECATIONS`, where nothing is brand-specific.
    const tail = mid.name.startsWith(prefix) ? mid.name.slice(prefix.length) : mid.name;
    const row = byFrom.get(tail);
    const to = row ? `${prefix}${row.to}` : mid.name;
    if (to === from) continue;
    consumed.add(tail);
    out.push({ collection, from, to, since: row?.since ?? mid.since });
  }
  // Rooted on the way out too, so `planVariableRenames` reports `source-absent` against a name spelled the
  // way the file spells names. An un-rooted `from` here would be absent from EVERY file rather than from
  // this one, which is a different fact wearing the same report line.
  for (const r of rows)
    if (!consumed.has(r.from)) out.push({ ...r, from: `${prefix}${r.from}`, to: `${prefix}${r.to}` });
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
 * `topoOrder` puts an entry after any entry whose source is this entry's target. For the map as #1013
 * shipped it that was `color → color.appearance` before `surface → color`, whichever order the array is
 * written in. Before #1035 the apply order was the executor's sequence of `upsertCollection` calls —
 * which happened to be the right one, for a reason documented as being about alias resolution, with
 * nothing anywhere recording that a migration depended on it (docs/44 §3).
 *
 * ── THE THREE STATES, AND THE ONE THAT LOOKS LIKE A CONFLICT ─────────────────────────────────────
 *
 * **Unreachable from `COLLECTION_RENAMES` since #1097 and still unreachable at #1148, for a second
 * reason: the map holds ONE entry, so no source can be another entry's target, `topoOrder` has nothing
 * to reorder, and the `targets.has(entry.from)` branch below cannot fire.** The branch and this table
 * both stay — the state is reachable from any future chain, and the `test.ts` arms that cover it drive an
 * authored pair rather than the live map, deliberately. Read the rest of this section as the shape the
 * mechanism handles, not as a description of today's data.
 *
 * A file sits somewhere on the chain, and the middle name is present in two of the three states:
 *
 *   | file holds                    | meaning          | `color → color.appearance` reads as        |
 *   |-------------------------------|------------------|-------------------------------------------|
 *   | `color`, `surface`            | pre-migration    | migrated                                  |
 *   | `color.appearance`, `surface` | half-migrated    | source-absent (the other entry migrates)  |
 *   | `color.appearance`, `color`   | already migrated | source present AND target present         |
 *
 * That last row is the trap, and it is the one a fresh post-#1013 file was in. One entry at a time,
 * `color` is present and `color.appearance` is present, which reads as `target-occupied` — a permanent
 * refusal on a healthy file. It is not a conflict: the `color` seen there is the OTHER entry's product.
 * The test says exactly that — a source that is itself another entry's target, with this entry's target
 * already present, means this entry has already applied. A genuine conflict (a hand-made
 * `color.appearance` beside a pre-#1013 `color` and `surface`) was still caught, by the second entry,
 * whose source is nobody's target.
 *
 * ── AND AT #1148 THAT SHAPE APPEARS FOR REAL, WHICH IS THE OPPOSITE CASE ─────────────────────────
 *
 * The single entry is `color.appearance` → `color`, so a file holding BOTH now reads `target-occupied`
 * and means it: `color.appearance` is the source, `color` is nobody's product, and the two collections
 * are genuinely distinct things competing for one name. **Do not reach for the `targets.has` escape
 * hatch here** — it exists to recognise a rename that has already applied, and nothing has applied. The
 * file is a 0.26.x artefact whose pointer tier was briefly called `color` (before #1089 named its axis),
 * and the honest outcome is the refusal, with the atomicity rule above discarding the whole map. One
 * manual rename clears it. Widening the branch to cover this would silently merge a designer's stale
 * pointer collection into the value tier and lose one side's bindings, which is the exact loss
 * `target-occupied` was introduced to prevent.
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
      // `targets.has(entry.from)`: this entry's source is another entry's TARGET, so its presence beside
      // our own target means we already applied and the `from` we can see is the other entry's product —
      // not a conflict. Unreachable from `COLLECTION_RENAMES` since #1097 removed the chain, and kept for
      // the next one; the arms that exercise it use an authored chain, not the shipped map.
      out.push(at(targets.has(entry.from) ? 'source-absent' : 'target-occupied'));
      continue;
    }
    have.delete(entry.from);
    have.add(entry.to);
    out.push(at('migrated'));
  }
  return out;
};
