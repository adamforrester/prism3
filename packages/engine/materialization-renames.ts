/**
 * Prism3 engine — MATERIALIZATION RENAMES: the rule artifact, and the accounting over it (#1039).
 *
 * A MATERIALIZATION rename is one the contract cannot see. `DEPRECATIONS` records a guaranteed token
 * PATH moving, and `rename-map.ts` derives the Figma variable migration from it — one authored record,
 * two consumers, and a forcing function (`token-contract.ts --accept`) that makes the record exist at
 * the moment the rename happens. That covers renames of the thing we promise.
 *
 * It does not cover renames of how we MATERIALIZE it. The Figma collection a variable lands in, the
 * namespace folder its name sits under, the dot-vs-dash spelling of `core-palette` — none of those are
 * contract paths, so none of them touch `DEPRECATIONS`, and nothing anywhere records them. `docs/44`
 * names three: `surface`↔`color`, the namespace folder, and `core-*`→`core.*`. #1039 shipped the
 * mechanism with none of them; **#1013 landed the first as the two rules below, and #1097 the other two
 * as the THIRD — one rule, not two.** All three of `docs/44`'s named cases are now recorded.
 *
 * That the namespace folder and the `core` tier are ONE rule is not tidiness. `multiplyClaimed` fails a
 * key two rules both claim, and every primitive is in the domain of both halves — `palette/red/550`
 * gains the namespace AND the tier. Two rules would have to be written as one-claims-what-the-other-does-not,
 * which is a pairing stated twice and checkable in neither. One rule states the final name once.
 *
 * The colour swap needed both halves of the record at once, which is the clearest available statement of
 * why they are one mechanism. The COLLECTION renames live in `rename-map.ts`'s `COLLECTION_RENAMES`
 * (`color` → `color.appearance`, `surface` → `color`); the VARIABLE renames inside those collections are
 * the rules here. Figma treats the two as independent operations, so a record covering only one of them
 * describes a migration that half-happens.
 *
 * ── WHY A RULE AND A DIFF, WHEN NEITHER WORKS ALONE ─────────────────────────────────────────────
 *
 * `docs/44` §5, decided against three costed options, and the shape of the argument is worth carrying
 * here because it is what the two checks below are FOR:
 *
 *   - A **rule** supplies the PAIRING. An emission diff yields a set of removals and a set of
 *     additions and cannot say which removal became which addition — and the pairing is the whole
 *     question, because a binding follows an id and the id follows the pairing.
 *   - A **diff** supplies the COMPULSION. A rule is authored, so nothing makes it exist; that is the
 *     same objection `rename-map.ts`'s header raises against a hand-authored Figma-side list, and it
 *     is unchanged. `regen` rewrites `out/figma/**` and `regen --check` proves the committed copy
 *     matches live, so the diff fires automatically and cannot be forgotten.
 *
 * So: rules propose the pairing, and check 1 proves the accounting over them is total.
 *
 * ── THE SPELLING, SETTLED HERE (#1039) ──────────────────────────────────────────────────────────
 *
 * `MATERIALIZATION_RENAMES`, US, against `docs/44` §7's proposed `MATERIALISATION_RENAMES`. The doc's
 * own filename is `44-materialization-renames.md` and the repo's rule is US English, so the en-GB
 * const would have shipped a file and its contents disagreeing.
 *
 * **Identifiers are exempt from `lint-us-english.ts`, which is exactly why this needed deciding rather
 * than defaulting.** Both spellings pass every gate. What they do not both survive is a grep: a reader
 * searching one spelling finds the doc and not the code, or the code and not the doc, and neither
 * result says the other exists. An exemption from a gate is not an absence of a rule.
 *
 * ── PURE, AND FORBIDDEN FROM IMPORTING THE EMITTERS ─────────────────────────────────────────────
 *
 * This module imports nothing from `write-plan.ts`, `emit-figma-*.ts` or anything else that produces a
 * variable name, and that restriction is `docs/34` **shape 11** — the named risk of this whole design.
 *
 * A rule written as *"what `figName` now does minus what it used to do"*, checked against `figName`'s
 * output, has the emitter sitting below BOTH sides of the comparison: two independent-looking
 * implementations with one subject underneath, green while that subject moves arbitrarily. A gate
 * cannot reliably tell an independently stated rule from a derived one, so the restraint has to be
 * structural — a rule states its transformation LITERALLY (`ns + '/' + name`), and this module has no
 * emitter in scope to call even by accident.
 *
 * The asymmetry with `rename-map.ts` is deliberate rather than an inconsistency. That module IMPORTS
 * `figmaVarName` on purpose, because re-deriving the dotted→slash mapping would be a second copy of a
 * shared fact that must not diverge. Here the point is the opposite: the namespace transformation must
 * be a SECOND EXPRESSION of the change, because a second expression is what the check compares against.
 *
 * ── WHAT MAKES CHECK 1 AN ORACLE AND NOT A MIRROR — DO NOT REFACTOR THIS AWAY ───────────────────
 *
 * Check 1's `from` side comes from **the committed emission at the merge base**: names produced by a
 * DIFFERENT REVISION of the emitter, sitting in git, not recomputable by the code under test.
 *
 * **Any later refactor that reads the `from` side from the live emitter deletes the gate and reports a
 * pass.** It would look like a simplification — the same walk, one fewer git call — and it is the #708
 * situation one layer up: the duplicated walk IS the gate. `regen --check` is what makes the committed
 * tree a faithful witness rather than a stale copy, so the two guarantees compose: regen proves the
 * commit matches its own emitter, and this proves this emitter's output accounts for that commit's.
 *
 * PURE — no `node:*`, no I/O, no top-level work. `lint-materialization-renames.ts` is the script that
 * feeds it git; `test.ts` feeds it a synthesized fixture. Two callers, one accounting, and #988's rule
 * about which side of the script/library line a file sits on.
 */

/** `collection :: name`, the identity of an emitted Figma variable. The collection is part of the key
 *  because a name is only unique within one — `palette/white` and a same-named variable in another
 *  collection are two variables, and an accounting keyed on the name alone would pair them. */
export type VarKey = string;

export const varKey = (collection: string, name: string): VarKey => `${collection} :: ${name}`;

/**
 * One materialization transformation.
 *
 * A SINGLE PAIR IS THE DEGENERATE CASE — a `domain` matching one key and a `map` returning one string.
 * That is why this is one mechanism and not three: `docs/44` §4 costed a per-pair list and rejected it
 * on the corpus's own variance (`core-palette` is 122/162/182 variables across the three brands while
 * `core-dimension` is 38/37/37), so a pair list is per-brand authored data that a new brand ships
 * without, where a rule is one brand-independent line.
 *
 * `map` returns the NAME only, never the collection. A collection rename is a different Figma
 * operation with a different failure mode and it already has `COLLECTION_RENAMES`; letting a rule move
 * a variable between collections would put one record in front of two operations.
 *
 * ── `root` IS A PARAMETER AND NOT A CONSTANT, AND THAT IS THE #1097 DEFECT CLASS (`docs/44` §7) ────
 *
 * Since #1097 every emitted variable name begins with the brand's own `theme.root` — `prism` by default,
 * `nbds` for New Balance, whatever a client picks. **A rule may therefore not spell the first segment**,
 * for the same reason no read path may: Prism2 hardcoded `pds/` and the bug was invisible in testing,
 * because you test with the brand whose prefix you hardcoded. Two of this corpus's three Figma-emitting
 * brands root at `prism`, so a hardcoded `prism/` would be caught by one brand in three.
 *
 * So the root arrives as an argument, from a source independent of the names being checked: the gate reads
 * it from `out/<brand>.tokens.json`'s single top-level key, and the apply path takes it from the write
 * plan's own rows. It is deliberately NOT read out of `out/figma/**` — that is the accounting's AFTER side,
 * and taking the root from there would define the rule's domain in terms of the very names it is checking.
 */
export type MaterializationRule = {
  /** Stable, and used in every report line — a rule is identified by this in both checks. */
  id: string;
  /** The `ENGINE_VERSION` that made the change. */
  since: string;
  /** What moved and why, to `INVERSE_GAPS`' standard: enough that a reader can weigh the decision. */
  why: string;
  domain: (collection: string, name: string, root: string) => boolean;
  map: (collection: string, name: string, root: string) => string;
};

/**
 * The primitive tier's segment and the three groups inside it, **stated literally for the third time in
 * the repo** — `theme.ts` exports `CORE_TIER`, `figma-names.ts` spells it for the read direction, and this
 * is the write-record's own spelling. `figma-names.ts`'s header carries the full argument; the short form
 * is that a rule which imported the emitter's constant would agree with the emitter by construction, and
 * this module's entire value is being a SECOND expression of the change (`docs/34` shape 11).
 *
 * **Deduplicating these three deletes two gates and reports a pass.** They are not a DRY violation.
 */
const CORE_TIER = 'core';
const CORE_GROUPS: readonly string[] = ['palette', 'dimension', 'font'];

/**
 * #1039 shipped this EMPTY, because `docs/44` §8 left open whether the value tier's 242 variables would
 * move to `color/appearance/*` at the swap or keep `color/*` under a renamed collection. **#1013 decided
 * it: both the collections and the variables inside them are renamed**, and these are the two rules that
 * record it. §8's first open question is closed.
 *
 * Both transformations are stated LITERALLY — a string prefix swapped for a string prefix, with no
 * emitter in scope to call. That is `docs/34` shape 11 and it is the whole reason the accounting can
 * check anything: a rule written as "whatever `figName` now does" would sit below both sides of the
 * comparison. The prefixes below are therefore a SECOND expression of the change, and if the emitters
 * move without these moving, check 1 reports the unaccounted removals by name.
 */
export const MATERIALIZATION_RENAMES: MaterializationRule[] = [
  {
    id: 'appearance-tier-1013',
    since: '0.26.0',
    why:
      'The value tier gave up the short name `color` to the alias tier and its variables took the matching '
      + 'prefix, so `color/text/primary` is now the POINTER that follows the surface axis and '
      + '`color/appearance/text/primary` is one appearance\'s paint. A designer who binds the short name '
      + 'gets the layer that re-themes; before #1013 they got the one that does not.',
    domain: (collection, name) =>
      collection === 'color.appearance' && name.startsWith('color/') && !name.startsWith('color/appearance/'),
    map: (_collection, name) => `color/appearance/${name.slice('color/'.length)}`,
  },
  {
    id: 'surface-to-color-1013',
    since: '0.26.0',
    why:
      'The alias tier kept its axis and changed its name: `surface/text/primary` became '
      + '`color/text/primary`. The axis is still surface (two modes, `default` and `inverse`) — what moved '
      + 'is which of the two tiers a designer reaches by default, which is the point of #1013 rather than '
      + 'a side effect of it.',
    domain: (collection, name) => collection === 'color' && name.startsWith('surface/'),
    map: (_collection, name) => `color/${name.slice('surface/'.length)}`,
  },
  {
    id: 'namespace-and-core-tier-1097',
    since: '0.27.0',
    why:
      'Every variable took the brand namespace as its first segment and the primitives took a `core` tier '
      + 'under it: `color/background/primary` became `<root>/color/background/primary`, and '
      + '`palette/red/550` became `<root>/core/palette/red/550`. Both halves are one rule because a '
      + 'primitive is in the domain of both and two rules claiming one key is what `multiplyClaimed` '
      + 'refuses. The point of the namespace is that a client\'s variables sit in their own folder rather '
      + 'than colliding with whatever else a shared file holds, and the point of the tier is that after it '
      + 'a variable\'s name IS its DTCG path — `prism.core.palette.red.550` (#1102) with slashes for dots. '
      + 'Figma STYLES keep the transform they already had and drop both segments; that exception is stated '
      + 'in `docs/10` because "names track their DTCG path" is now true-with-one-exception rather than just true.',
    // POSITIONAL, and the two halves read in opposite directions on purpose.
    //
    // The domain asks whether the name is ALREADY rooted, which is the idempotence question and the only
    // one answerable without knowing what the old first segments were: a post-#1097 name starts with the
    // root, a pre-#1097 name does not. Enumerating the pre-#1097 first segments instead (`color`, `space`,
    // `palette`, …) would be per-brand authored data of exactly the kind `docs/44` §4 rejected, and it
    // would go stale the first time a brand emitted a group this list had not heard of.
    //
    // The map keys the tier on the NAME's first segment rather than on the collection, because the tier is
    // a fact about the DTCG path (`prism.palette.*` → `prism.core.palette.*`) and not about where Figma
    // happens to put it. Verified against the corpus at the merge base: `palette/*`, `dimension/*` and
    // `font/*` occur in no collection but the three `core-*` ones, and `font-fluid/*` — which stays
    // OUTSIDE the tier — is a different first segment, not a prefix match on `font`.
    //
    // One brand-root value would defeat this: a client rooting at `color` makes `color/appearance/…` read
    // as already-namespaced. The accounting reports those keys as unaccounted removals, loudly, which is
    // the right outcome for a namespace that collides with the engine's own top-level names.
    domain: (_collection, name, root) => !name.startsWith(`${root}/`),
    map: (_collection, name, root) =>
      CORE_GROUPS.includes(name.split('/')[0]) ? `${root}/${CORE_TIER}/${name}` : `${root}/${name}`,
  },
];

// ---- the accounting ---------------------------------------------------------------------------

/** One rule's claim about one BEFORE key: it says this key is gone and this other key is its image. */
export type Claim = { rule: string; from: VarKey; to: VarKey };

export type Accounting = {
  beforeCount: number;
  afterCount: number;
  removed: VarKey[];
  added: VarKey[];
  /** Every claim the rules make over the WHOLE before-set — the denominator, not just the fired ones. */
  claims: Claim[];
  /** A key that left the emission and no rule claimed. The forcing function's own arm. */
  unaccountedRemovals: VarKey[];
  /** A key that entered the emission and is no claim's image — i.e. a NEW TOKEN, in the normal case.
   *  Reported, never a failure: see `isTotal` for why the two directions are not symmetric (#1053). */
  unaccountedAdditions: VarKey[];
  /** A claim the emission contradicts — see `contradiction` for the two ways. */
  contradictedClaims: Array<Claim & { contradiction: string }>;
  /** A removed key claimed by more than one rule — "exactly one rule" is the doc's word. */
  multiplyClaimed: Array<{ key: VarKey; rules: string[] }>;
};

/**
 * THE WHOLE-SET ACCOUNTING (`docs/44` §5).
 *
 * ── THE CLAUSE THAT IS THE ENTIRE CHECK, AND THE INTUITIVE IMPLEMENTATION OMITS IT ──────────────
 *
 * Every rule is evaluated over **`before` in its entirety**, never over `removed`. Iterating the diff
 * and confirming each removal is claimed feels complete and is not:
 *
 *     A rule claiming a rename that DID NOT HAPPEN is never exercised, so the check reports clean.
 *
 * Measured over the real corpus by simulating the namespace rename against a `color`-only emission
 * (`docs/44` §5, reproduced by `test.ts`): diff-driven accounting reports **TOTAL — blind**, whole-set
 * accounting reports the claims contradicted, by name. An over-claiming rule is inert at apply time —
 * `rename-map.ts`'s `target-not-planned` refuses it — so it is a REPORTING hole rather than a
 * destructive one, which is exactly the kind that survives for years.
 *
 * The loop below is therefore `for (const key of before)` and not `for (const key of removed)`, and
 * that one word is the difference between the two columns of the doc's table.
 */
const account = (
  before: ReadonlySet<VarKey>,
  after: ReadonlySet<VarKey>,
  rules: readonly MaterializationRule[],
  /** Parsed back out of a key. Kept as a parameter so the accounting never re-splits a string it did
   *  not build — a `::` inside a variable name would make a split-based parse silently wrong. */
  parse: (key: VarKey) => { collection: string; name: string },
  /** The BRAND ROOT every name in this comparison is expected to carry (#1097) — see
   *  `MaterializationRule` for why it is an argument rather than a literal, and where each caller sources
   *  it. One accounting covers one brand, which is what makes a single value correct here. */
  root: string,
  /** WHICH SET THE RULES ARE EVALUATED OVER — the entire difference between the doc's two columns.
   *  `'whole-set'` walks `before`; `'diff'` walks only what was removed. The diff and addition sets are
   *  computed from `before` either way, so the two differ in exactly one thing: whether a rule that
   *  claims a rename which did not happen is ever asked about. */
  walk: 'whole-set' | 'diff',
): Accounting => {
  const removed = [...before].filter((k) => !after.has(k)).sort();
  const added = [...after].filter((k) => !before.has(k)).sort();
  /** Did the emission move at all in this comparison? See the contradiction branch below. */
  const moved = removed.length > 0 || added.length > 0;

  const claims: Claim[] = [];
  const contradicted: Array<Claim & { contradiction: string }> = [];
  const claimedFrom = new Map<VarKey, string[]>();
  const claimedTo = new Set<VarKey>();

  // ── THE WHOLE BEFORE-SET, when `walk` says so. Not `removed`. This is the load-bearing line. ──
  for (const key of (walk === 'whole-set' ? before : removed)) {
    const { collection, name } = parse(key);
    for (const rule of rules) {
      if (!rule.domain(collection, name, root)) continue;
      const to = varKey(collection, rule.map(collection, name, root));
      const claim: Claim = { rule: rule.id, from: key, to };
      claims.push(claim);
      claimedFrom.set(key, [...(claimedFrom.get(key) ?? []), rule.id]);
      claimedTo.add(to);

      // A rule that claims a key which is STILL EMITTED is contradicted by the emission. This branch is
      // unreachable from a `removed`-driven loop, and it is the over-claiming row of the doc's table.
      //
      // GATED ON THE EMISSION HAVING MOVED, and the gate is about ATTRIBUTION rather than strictness.
      // Ungated, this arm also fires on a rule that is simply STALE — one pointing at a name that never
      // moved — because "stale" and "over-claiming" are the same predicate evaluated at different times.
      // Measured: mutation M3 installed a stale rule and tripped BOTH checks. That is not extra safety,
      // it is a worse report — check 1 is the forcing function, it needs git and a base ref, and a PR
      // that renames nothing would fail a git-dependent gate for a reason having nothing to do with git.
      // Staleness is check 2's arm: no git, every run, and it catches this case unconditionally.
      //
      // The over-claiming ROW of the doc's table is unaffected, because there the emission DID move: the
      // `color`-only rename leaves 242 removals per brand, so `moved` is true and every non-`color`
      // claim is still contradicted by name (1368 across three brands). Re-verified after this gate.
      if (after.has(key)) {
        if (moved) contradicted.push({ ...claim, contradiction: `still emitted — the rule says it moved and it did not` });
        continue;
      }
      // It did leave, but not to where the rule said. A different failure from "nobody claimed it": the
      // pairing is stated and wrong, which is worse than absent because it will be applied.
      if (!after.has(to))
        contradicted.push({ ...claim, contradiction: `gone, but its claimed image '${to}' is not emitted either` });
    }
  }

  const unaccountedRemovals = removed.filter((k) => !claimedFrom.has(k));
  const unaccountedAdditions = added.filter((k) => !claimedTo.has(k));
  const multiplyClaimed = removed
    .filter((k) => (claimedFrom.get(k) ?? []).length > 1)
    .map((k) => ({ key: k, rules: claimedFrom.get(k)! }));

  return {
    beforeCount: before.size,
    afterCount: after.size,
    removed,
    added,
    claims,
    unaccountedRemovals,
    unaccountedAdditions,
    contradictedClaims: contradicted,
    multiplyClaimed,
  };
};

/**
 * THE DIFF-DRIVEN ACCOUNTING — the WRONG one, kept so the difference is demonstrable rather than
 * asserted.
 *
 * Identical to `accountFor` except that it iterates `removed` instead of `before`. It exists for one
 * reason: `test.ts` runs both over the same over-claiming fixture and shows this one reporting TOTAL
 * where the real one reports the contradicted claims. Without it, "the whole-set clause is
 * load-bearing" is a sentence in a comment; with it, it is a number in a test.
 *
 * NOT EXPORTED TO THE GATE, and `lint-materialization-renames.ts` must never call it.
 */
export const accountForDiffDriven = (
  before: ReadonlySet<VarKey>,
  after: ReadonlySet<VarKey>,
  rules: readonly MaterializationRule[],
  parse: (key: VarKey) => { collection: string; name: string },
  root: string,
): Accounting => account(before, after, rules, parse, root, 'diff');

/**
 * THE ACCOUNTING THE GATE USES. `walk: 'whole-set'` is fixed here and is not a parameter the caller
 * chooses — the option exists so the wrong one can be DEMONSTRATED, not so it can be selected.
 */
export const accountFor = (
  before: ReadonlySet<VarKey>,
  after: ReadonlySet<VarKey>,
  rules: readonly MaterializationRule[],
  parse: (key: VarKey) => { collection: string; name: string },
  root: string,
): Accounting => account(before, after, rules, parse, root, 'whole-set');

/**
 * TOTAL means: nothing left unclaimed, no claim contradicted, no key claimed twice. Used by both the
 * gate and the tests so "clean" has one definition.
 *
 * ── ADDITIONS ARE NOT A FAILURE, AND THE ASYMMETRY IS THE POINT (#1053) ─────────────────────────
 *
 * `unaccountedAdditions` is deliberately **absent** from this conjunction. Removals and additions look
 * symmetric and are not:
 *
 *   - An unclaimed **REMOVAL** might be a silent rename. That is the thing this whole mechanism exists
 *     to catch: a name vanished, a binding that followed it is now pointing at a variable the engine
 *     has stopped writing, and nothing else in the repo would notice.
 *   - An unclaimed **ADDITION** is a new token. **There is nothing it could be hiding.** A rename's
 *     tell is always on the removal side, because a rename is a name LEAVING; the arrival is what every
 *     ordinary additive change also does.
 *
 * Enumerated rather than asserted — every way an addition could be suspicious is already caught by a
 * different arm, so this one carried no detection power of its own:
 *
 *   · a rename whose removal no rule claims        → `unaccountedRemovals`
 *   · a rule claiming `A → B` where `A` was never removed (over-claiming)
 *                                                  → `contradictedClaims` ("still emitted")
 *   · a rule claiming `A → B` where `B` never appears (broken rule)
 *                                                  → `contradictedClaims` ("claimed image is not emitted")
 *
 * That last one is worth stating because it is easy to believe it moved to check 2's "every image is
 * emitted" arm. **It did not, and this was measured rather than reasoned.** Check 2 walks the CURRENT
 * emission and matches rule domains against it; a removed domain member is not in the current emission,
 * so check 2 never reaches it and never checks its image. Check 1's contradiction arm is the only thing
 * holding that case. Do not weaken it.
 *
 * What the addition arm cost, meanwhile, was every additive change: with the artifact empty, EVERY
 * added key is unaccounted, so the gate failed any PR that adds a token (#1051 was blocked by it).
 *
 * `unaccountedAdditions` is still COMPUTED and still REPORTED — when a run is already failing, naming
 * the keys that arrived is real diagnostic value, because a mis-mapped rule's contradiction says the
 * claimed image is missing without saying what appeared instead. Diagnostic value, not detection value;
 * one belongs in the report and the other in the verdict, and conflating them is what shipped the bug.
 */
export const isTotal = (a: Accounting): boolean =>
  a.unaccountedRemovals.length === 0
  && a.contradictedClaims.length === 0
  && a.multiplyClaimed.length === 0;

// ---- reading an emission ----------------------------------------------------------------------

/** The shape of one emitted Figma collection file — `out/figma/<brand>/<collection>[.<mode>].json`. */
type EmittedFile = { $collection?: unknown; variables?: unknown };

/**
 * Pull `(collection, name)` keys out of one emitted file's parsed JSON.
 *
 * Deliberately tolerant of a file that carries no `variables` array: three of the eighteen collections
 * (`text-styles`, `shadow-styles`, `gradient-styles`) hold ZERO variables because they are Figma
 * STYLES — a different API and a different rename operation, excluded by `docs/44` §6.4. An empty
 * array from those is correct rather than a parse failure to report.
 *
 * A file with no `$collection` IS a failure and throws: the collection is half the key, so a file that
 * cannot name itself would contribute keys that silently collide with another collection's.
 */
export const keysFromEmittedFile = (parsed: unknown, whence: string): VarKey[] => {
  const f = parsed as EmittedFile;
  if (typeof f?.$collection !== 'string' || !f.$collection)
    throw new Error(`${whence}: no $collection — the collection is half of every key, so a file that cannot name itself would collide with another's`);
  if (!Array.isArray(f.variables)) return [];
  return f.variables.map((v, i) => {
    const name = (v as { name?: unknown })?.name;
    if (typeof name !== 'string' || !name)
      throw new Error(`${whence}: variables[${i}] has no name`);
    return varKey(f.$collection as string, name);
  });
};

/** The key parser the accounting takes. Splits on the FIRST ` :: ` only, so a name containing the
 *  separator cannot shift the collection — the reason `accountFor` takes this rather than splitting. */
export const parseVarKey = (key: VarKey): { collection: string; name: string } => {
  const i = key.indexOf(' :: ');
  if (i < 0) throw new Error(`malformed var key: ${JSON.stringify(key)}`);
  return { collection: key.slice(0, i), name: key.slice(i + 4) };
};

// ---- recollecting the before-set through a COLLECTION rename (#1013) --------------------------

/** The shape of a collection rename, structurally rather than by import. `rename-map.ts` owns the type,
 *  and importing it here would pull `figmaVarName` into scope transitively — a name-producing function
 *  this module is structurally forbidden from being able to call (`docs/34` shape 11, and the header). */
export type CollectionMove = { from: string; to: string };

/**
 * WHERE EACH COLLECTION AT A PAST MERGE BASE NOW LIVES — the accounting's recollection map, and
 * **deliberately not `COLLECTION_RENAMES`** (#1097).
 *
 * The two lists look interchangeable and are relative to different points in time, which is why sharing
 * one was safe until #1013 and unsafe after it:
 *
 *   · `COLLECTION_RENAMES` is a MIGRATION list. Each entry is relative to whenever that rename shipped,
 *     and it is applied to a designer's file, which may sit anywhere on the chain. It holds
 *     `color → color.appearance`, because a PRE-#1013 file's `color` is the value tier.
 *   · this list is an ACCOUNTING list. Every entry is relative to the MERGE BASE, which is a single
 *     commit, and it is applied to names read out of git at that commit. A POST-#1013 base's `color` is
 *     the ALIAS tier, so the same `from` has to go to `color.surface`.
 *
 * One `from`, two answers, both correct in their own frame. `recollect` is single-step and takes the FIRST
 * match, so putting both in one array makes the answer depend on array order — a silent misattribution of
 * all 128 alias-tier keys per brand, reported as unaccounted removals against rules that are correct.
 * `test.ts` asserts no `from` appears twice here, because that ambiguity is the whole reason this exists.
 *
 * The lane that added the `core` entries deliberately shipped **no `COLLECTION_RENAMES` entries at all**:
 * the collections were merged for owners who work from an empty file, so there is nothing to migrate. The
 * accounting still needs to know where the keys went, and that need is what this list serves — it forces
 * no Figma operation and never reaches a designer's file.
 *
 * ── STALE ENTRIES GO INERT RATHER THAN WRONG, WHICH IS WHY THIS IS APPEND-ONLY ──────────────────────
 *
 * Once #1097 is on `main` the merge base emits `core` and `color.surface`, so no key carries a `from`
 * below and every entry claims nothing. That is the same property `COLLECTION_RENAMES` relies on and it is
 * what makes leaving them here safe. Do not prune them: a reader landing on a `core-palette` in an old
 * emission needs to find the record, and an entry that has gone inert costs nothing.
 */
export const ACCOUNTING_COLLECTION_MOVES: readonly CollectionMove[] = [
  // #1097 — the three primitive collections merged into one. `core.palette.json`, `core.dimension.json`
  // and `core.font.json` are three FILES that all declare `$collection: 'core'`; the file stem stopped
  // being the collection name in the same change, which is why nothing here can be derived from a filename.
  { from: 'core-palette', to: 'core' },
  { from: 'core-dimension', to: 'core' },
  { from: 'core-font', to: 'core' },
  // #1089 — the alias tier names its axis, so both colour collections do. The variables inside kept their
  // `color/*` tails and no DTCG path moved; only the mode picker's label did.
  { from: 'color', to: 'color.surface' },
];

/**
 * Move one BEFORE key into the collection its variable now lives in — **a single step, never a walk.**
 *
 * The accounting is keyed on `collection :: name` and a rule's `map` returns the name only (deliberately
 * — see `MaterializationRule`). So a collection rename moves every key in that collection out from under
 * every rule at once: with `color` renamed to `color.appearance`, the before-set holds
 * `color :: color/text/primary`, the after-set holds `color.appearance :: color/appearance/text/primary`,
 * and no name-only rule can bridge those two keys. Recollecting the before-set is what puts both sides in
 * one collection so the rules can be asked the only question they are able to answer.
 *
 * Without it #1013 was unaccountable rather than merely unaccounted: every one of the 370 keys per brand
 * would read as an unaccounted removal AND an unaccounted addition, and the documented remedy — "write a
 * rule" — could not have been carried out, because no rule of this shape exists.
 *
 * ── SINGLE-STEP, AND THE TRANSITIVE VERSION IS WRONG RATHER THAN JUST SLOWER ─────────────────────
 *
 * `COLLECTION_RENAMES` holds a CHAIN: `surface → color` alongside `color → color.appearance`. Following
 * it to a fixed point would send `surface :: surface/text/primary` to `color.appearance`, which is not
 * where that variable went — it went to `color`, one hop. The two entries describe two different
 * collections moving at the same moment, not one collection moving twice. A `while` loop here would
 * misattribute all 128 alias-tier keys per brand, and the accounting would then report them as
 * unaccounted removals against rules that are correct.
 *
 * **This is the exact inverse of the apply side, and the asymmetry is the point.**
 * `planCollectionRenames` DOES need topological order, because it walks one live name set and each rename
 * observes the previous one's effect. Nothing is mutated here: the before-set is a snapshot of a past
 * state, and every key in it is recollected against the same map. One mechanism ordered and one not, for
 * a single reason — whether the steps share a mutable subject.
 *
 * `renames` is REQUIRED and has no default. Defaulting it to `COLLECTION_RENAMES` would let a caller
 * recollect against the live map when it meant a fixture, and `test.ts` drives this with synthetic maps:
 * the failure mode would be a test that agrees with production because it forgot to disagree.
 */
export const recollect = (key: VarKey, renames: readonly CollectionMove[]): VarKey => {
  const { collection, name } = parseVarKey(key);
  const hit = renames.find((c) => c.from === collection);
  return hit ? varKey(hit.to, name) : key;
};

/** `recollect` over a whole before-set — what `lint-materialization-renames.ts` composes into its `from`
 *  side. A set, so two keys recollecting onto one are collapsed the way the emission would collapse them
 *  rather than double-counted. */
export const recollectAll = (
  before: ReadonlySet<VarKey>,
  renames: readonly CollectionMove[],
): Set<VarKey> => new Set([...before].map((k) => recollect(k, renames)));
