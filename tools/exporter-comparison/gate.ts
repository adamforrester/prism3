/**
 * EXPORTER AGREEMENT GATE (#697) — the two DTCG exporters agree where a disagreement would be a
 * consumer-visible break, on every brand that has a Figma emission.
 *
 *   npx tsx tools/exporter-comparison/gate.ts
 *
 * `compare.ts` is a MEASUREMENT: it reports five categories of difference and refuses to fail,
 * because almost every one is "right for its host" (#697's own words) and failing a build on it
 * would report a decision nobody has made. This file is the subset of that report which is
 * assertable today — the arms where the two exporters disagreeing means one of them is wrong.
 *
 * The split is the point, and #707 recommended exactly it: gate the assertable arms, leave
 * categories 3–5 reporting until #697's byte-for-byte question is answered. Adding an arm here is a
 * claim that a difference in it is a DEFECT rather than a documented disagreement. Do not add one
 * because its number happens to be stable.
 *
 * ── WHAT IS PINNED, AND WHY EACH ONE ────────────────────────────────────────────────────────────
 *
 *   TYPES        asserted at 0, as a RULE. Same path, different `$type` is a break for every
 *                consumer in either direction — a `dimension` that arrives as a `number` fails a
 *                build, not a review. Nothing about this is corpus-specific, so it is 0 forever
 *                rather than 0-as-measured. THREE arms, because "same path" is the easy case:
 *                · 1b PAIRED TYPES  — the same claim over paths that pair by a RULE (a rename, an
 *                  axis collapse, an axis spelled as a name) and so never appear verbatim on both
 *                  sides. Also 0 as a RULE. See #747 below for why this needed its own arm.
 *                · 1c TYPE-BLIND PAIRS — 0 as a RULE, and the arm that keeps the other two honest:
 *                  a pairing that resolves no type on one side is not a pass, it is an uncompared
 *                  path. This is the assertion that stops the #747 hole from reopening quietly.
 *
 *   UNPAIRED     asserted per DIRECTION, and the two directions are NOT symmetric:
 *                · tokenpress-only  — a RULE at 0. A path TokenPress emits and prism3 does not
 *                  means the Figma round-trip invented a token, or prism3 dropped one.
 *                · prism3-only      — a MEMORY, per brand, of the paths currently known to be
 *                  unreachable and WHY. See KNOWN_UNREACHABLE below; the "why" is the gate.
 *
 *   NAMESPACE    asserted as a RULE, in BOTH of #1097's directions (ARM 2c). Every Figma VARIABLE name
 *                carries the brand root, so an exporter reading those names back must reproduce it as
 *                the one rooted top-level group — and a STYLE name deliberately does not, so the
 *                unrooted groups must hold only types a Figma style can carry (`typography`, `shadow`).
 *                The root's SPELLING is never asserted: it is a brand's own choice. Read N1–N3 in the
 *                register below before assuming the unpaired arms would have caught this — measured,
 *                they report a clean pass under a total namespace loss.
 *
 *   FLOAT32 LEAK asserted at 0, as a RULE. #703 predicted TokenPress's `roundToPrecision` cleanup
 *                could silently rewrite a value that never carried the artifact. Measured safe for
 *                8-bit-authored color (all 256 channels survive fround-then-4dp), which is what
 *                both exporters' corpora are. A leak is the prediction coming true, not a new
 *                convention.
 *
 *   AXES         asserted as DECLARED, per brand (#697). Every collection the emission carries must
 *                appear in `axes.ts`'s table, and every table entry must still be emitted. Neither
 *                direction is optional: an unclassified collection defaulting to `'none'` would be
 *                right 14 times in 18 by accident, and a declaration that cannot notice its own
 *                obsolescence is the shape #729 fixed in the verdicts.
 *
 *   OPACITY      asserted at 0 (`kind: 'scale'`), as a RULE, and it is #709's regression test at
 *                the integration level. TokenPress's own
 *                `tests/unit/opacity-percent-to-fraction.test.ts` should fail before this does; if
 *                it is green and this is red, the conversion was lost somewhere between the unit
 *                and the export.
 *
 * ── WHAT IS DELIBERATELY NOT PINNED ─────────────────────────────────────────────────────────────
 *
 * Category 3's value differences (202–261 per brand), category 4's structure and category 5's
 * bucket-C observations are all reporting-only. The largest value bucket is pure serialization
 * (`rgb(...)` vs `{colorSpace, components}`) and both spellings are valid DTCG, so a number here is
 * a description of two conventions, not a defect count.
 *
 * The divergent axis collisions (171–173 per brand) are the tempting one and are LEFT OUT ON
 * PURPOSE. They are a real consumer hazard — a path in four files with four different values, which
 * a naive ZIP merge resolves by file order — but they are a hazard created by #697's undecided axis
 * question, so pinning the count would freeze a number that the decision is supposed to move. Note
 * that it MUST be the divergent count and not the raw one if it is ever pinned: 11–14 of the ~185
 * are identical in every file and harmless, and conflating the two is the defect #729 fixed.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * This gate's two sides are two INDEPENDENT EXPORTERS run over one brand, which is as independent
 * as a comparison in this repo gets: prism3's `emit-dtcg.ts` writes the projection, and TokenPress's
 * `TokenExporter` — a separate codebase, ported whole, sharing no code with the engine — reads
 * prism3's Figma emission back out. Neither was written against the other.
 *
 * What it imports from `compare.ts` is the MEASUREMENT (`analyze`), not the expected value. The
 * expected values are here: `0`, and `KNOWN_UNREACHABLE`. That matters because the failure mode for
 * this shape of gate is importing a threshold from the thing under test — and note the specific
 * trap avoided: this file must NOT import `VERDICTS`. Three of those predicates were silently wrong
 * until #729 — each one true for a reason its own claim did not name — and a gate that failed only
 * when a verdict printed would inherit every proxy in them. It reads the report's own numbers instead.
 *
 * ARM 1b's independence needs its own sentence, because it is the one that could most easily have been
 * built as a tautology. A pairing rule asserts "these two paths are the same token". The type
 * expectation for that pair does NOT come from the rule — it comes from the CANONICAL TREE, the
 * emitter's own input, which `compare.ts` authors nothing of. A rule that named its own expected type
 * would pass by restating itself, and #747's header warned about exactly that shape before the work
 * started. The same split holds for ARM 1d: the axis is DECLARED in `axes.ts` and its members are
 * OBSERVED in the emission, and `classifyCollections` compares those two. Deriving the collection list
 * from `COLLECTION_AXIS` would have made completeness a statement about the table's agreement with
 * itself — complete by construction, and a new collection passing by never being asked about.
 *
 * The evidence for all of that is the mutation register at the bottom of this header, not this
 * paragraph. A claim of independence is only as good as the failure that demonstrates it.
 *
 * ── THE BRAND LIST IS DISCOVERED, NOT LISTED ────────────────────────────────────────────────────
 *
 * Brands come from scanning `out/figma/`, and the count is asserted at >= 3 rather than trusted.
 * A hand-written list would silently stop covering a brand added later — and a discovered list with
 * no floor silently passes when the scan returns nothing, which is the same false pass one step
 * further back (`lint-overlay-completeness.ts` and `check-consumability.mjs` both take this shape).
 *
 * ── THE LIMIT THAT WAS, AND HOW IT CLOSED (#747, on #697's axis call) ───────────────────────────
 *
 * This section used to record an open hole, found by a mutation that did NOT fail: the types arm
 * compared `$type` over the SHARED path set only, so a retype on a path that a pairing RULE explains
 * was invisible. Changing TokenPress's grid branch from `dimension` to `number` (`exporter.ts:714`)
 * left this gate GREEN, because prism3's `grid.<breakpoint>.<prop>` and TokenPress's `grid.<prop>` are
 * an axis collapse and never enter the shared set. Measured blind set: 71 paths on nb, 73 on aurora,
 * 71 on wendys — roughly 14% of each brand's paired surface, across four rules.
 *
 * The mechanism is worth keeping, because it is a shape and not a bug: `analyze` built
 * `shared = prism3 ∩ tokenpress` and type-compared over `shared`. The PATH was invisible, not the type
 * check weak — so no amount of strengthening the comparison would have found it. Only asking "which
 * paths does nothing compare?" does.
 *
 * It is closed. ARM 1b compares types across every pairing rule (each rule now declares its
 * `counterpart` — a whole token, or a named FIELD of a composite), and ARM 1c asserts that NO paired
 * path is left untyped, so the hole cannot silently reopen when a rule is added. Blind set is 0 on all
 * three brands. The remaining `againstAbsence` count (65–67) is a different thing and deliberately not
 * asserted: those are pairs where one side has no leaf at all, so there is no second type to compare.
 *
 * WHY THIS CLOSURE DEPENDED ON A DECISION, NOT EFFORT: two of the four rules exist only because a
 * Figma variable can vary a value only BY MODE, so prism3's non-appearance axes (breakpoint, viewport)
 * become modes on the way out and paths on the way back. Carrying a type across that collapse requires
 * knowing which collections' modes ARE an axis — #697's question, answered in `axes.ts`. Nothing in a
 * Figma file records it (measured: inference by "do the variables vary" does not separate them), so it
 * is DECLARED, and ARM 1d fails on an unclassified or stale declaration rather than defaulting.
 *
 * ── THE MUTATION REGISTER (docs/34: a gate is only proven by watching it fail) ───────────────────
 *
 * Every arm added for #747/#697 was verified by mutating the subject and confirming THIS gate is named
 * in the failure — not merely that the suite went red. Counts are per-run across all three brands:
 *
 *   M4  `exporter.ts:714` grid `dimension`→`number`   → ARM 1b, 32 failures  (was EXIT 0 — the
 *                                                        acceptance criterion for #747)
 *   M5  `$type: 'typography'`→`'number'`              → ARM 1b, 113 failures (rename rule)
 *   M6  both `FONT_SIZE` dispatch sites → `number`    → ARM 1b, 7 failures   (duplicate-channel rule)
 *   M7  `$type: 'shadow'`→`'number'`                  → ARM 1b, 21 failures  (axis-as-a-name rule)
 *   D1  `axes.ts` layout `breakpoint`→`none`          → ARM 2a, 57 failures  (the axis is load-bearing,
 *                                                        not decorative: grid.* stops pairing at all)
 *   D2  delete `color` from `COLLECTION_AXIS`         → ARM 1d, 3 failures   (unclassified ≠ default)
 *   D3  declare a collection nothing emits            → ARM 1d, 3 failures   (stale declaration)
 *   N1  `nsName` → identity (the root off the FLOAT   → ARM 2c, 39 failures  (partial loss: 16 unrooted
 *       and font axes' assembled names, #1097)             groups named with their types; colour kept
 *                                                          its root, so the arm caught HALF a loss)
 *   N2  `nsName` → identity AND `figName` dropping    → ARM 2c, 3 failures   (total loss — the other half
 *       the leading dotted segment (both rooting              of the arm, `rooted.length !== 1`)
 *       sites; the second is the one it is easy to
 *       miss, since colour names are walked out of
 *       the tree already rooted)
 *   N3  revert `unionTokenPress`'s `leaves(…, rootKey)` → ARMs 2a+2b, 4316 failures (the strip is
 *       to the unstripped call it replaced                    load-bearing, not cosmetic)
 *
 * WHY N1/N2 EXIST AT ALL, AND WHAT N2 MEASURED THAT NO PARAGRAPH COULD: under N2's total namespace
 * loss the UNPAIRED ARMS REPORT A CLEAN PASS — 0 tokenpress-only, 0 unexplained prism3-only, on all
 * three brands. That is not a prediction, it is the run. Paths are compared with each side's own root
 * stripped, so a rootless emission reduces to exactly the paths a rooted one does. ARM 2c is therefore
 * not a redundant restatement of 2a/2b; it is the ONLY arm that can see its subject, which is the
 * borrowed-backstop shape docs/34 names. N3 is the converse: the strip it depends on is doing real
 * work, and removing it floods the report with 4316 same-token-different-segment failures rather than
 * catching anything.
 *
 * WHAT ARM 1b STILL DOES NOT VERIFY, probed after the fact rather than assumed. It compares the two
 * sides' `$type`, so it falsifies a rule's authored `reason` only when the error CHANGES A TYPE —
 * font-fluid's did, but by luck. Two probes on the shipped `grid.*` rule:
 *
 *   · point `grid.<bp>.gutter` at `grid.margin` → fails, but through ARM 2a (it orphans the real
 *     `grid.gutter`), with `paired types` still 0.
 *   · SWAP `gutter`↔`margin` → orphans nothing, both sides `dimension`, and the gate passes FULLY
 *     GREEN — while nb's two values genuinely differ at 3 of its 5 breakpoints
 *     (`2xl` space.400/600, `md` 200/300, `xl` 300/400).
 *
 * So state it exactly: **this arm verifies that a rule's two sides agree on TYPE, not that the rule
 * paired the right two things.** Closing that needs a VALUE comparison across rule-paired pairs, which
 * the report does not carry for them today (`typed` holds types only, and the values category covers 0
 * of the 15 grid pairs). Left open deliberately, and named here rather than implied, because a green
 * `paired types` reads as "the pairings are correct" and it does not mean that.
 *
 * M6 IS THE ONE TO READ BEFORE TRUSTING A MUTATION TEST. Disabling the explicit `FONT_SIZE` check
 * alone changes NOTHING — it falls through to the defensive `dimensionScopes` list further down, which
 * that code's own comment says is there for exactly this refactor. So the first M6 attempt reported
 * EXIT 0 and looked like a second blind spot. It was a NON-MUTATION: the subject had a redundant path
 * and the behavior never moved. A mutation that does not change behavior proves nothing about the
 * gate, and it is indistinguishable from a blind spot unless you go read why. Check that the thing you
 * mutated is the thing that decides.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { analyze } from './compare.ts';

const FIGMA_OUT = 'packages/engine/out/figma';

/** The MINIMUM number of brands this gate must cover.
 *
 *  #707 recommended gating "once the harness runs on more than the two brands here", so 3 is that
 *  recommendation as an assertion. It is a floor and not an equality on purpose: a fourth brand
 *  gaining a Figma emission should extend this gate's coverage, not fail it. `wendys` is the third
 *  and was already emitting when this gate was written — the floor was met, not waived. */
const MIN_BRANDS = 3;

/**
 * prism3-only paths that are known-unreachable by TokenPress, with the reason, per brand.
 *
 * THIS IS A MEMORY, NOT A RULE, and the distinction is the reason it is written as paths-with-a-cause
 * rather than a count. A count says "2 are missing and that is fine"; this says WHICH two and WHY,
 * so a THIRD unreachable path fails even though it would keep any count-based assertion green, and
 * so a gradient becoming reachable ALSO fails — a memory that cannot notice its own obsolescence is
 * how the #708 verdict went on printing after #713 fixed it (#729).
 *
 * ── WHY THIS ARM CANNOT BE ASSERTED AT 0, AND WHAT THAT COST TO ESTABLISH ────────────────────────
 *
 * The harness reported these as "unreachable: Figma paint styles are neither variables nor effect
 * styles and TokenPress's scanner has no call that returns them". The first half is true. The second
 * half overstated it, and the difference decides whether this arm is a permanent carve-out or a
 * ticket:
 *
 *   · `figma.getLocalPaintStylesAsync()` EXISTS — `@figma/plugin-typings/plugin-api.d.ts:1481`.
 *   · TokenPress's scanner calls four channels and paint is not among them
 *     (`apps/tokenpress/src/plugin/scanner.ts:17-20`: variable collections, variables, text styles,
 *     effect styles). `code.ts:149-154` is the same four.
 *   · TokenPress has no gradient converter at all, and its own validator classifies `gradient` as
 *     experimental — "just warn, don't validate structure" (`utils/dtcg-validator.ts:288`).
 *
 * So this is a CAPABILITY GAP IN TOKENPRESS'S OWN LANE — the same shape as #709 — and NOT a property
 * of Figma's model the way motion, line-height and the typeface tier genuinely are. Those are
 * unreachable because Figma has no variable type to hold them; a gradient has a paint style sitting
 * right there behind an API call nobody makes. Filed as #731.
 *
 * Which is exactly why the entry carries `owner` and an issue: when #731 lands, aurora's gradients
 * become reachable, THIS GATE GOES RED, and whoever fixed it deletes the entry. That is the intended
 * lifecycle. An arm asserted at 0 with a comment explaining the exception would have gone green
 * forever instead, and nothing would have connected the exception to its fix.
 */
const KNOWN_UNREACHABLE: Record<string, { path: string; why: string; owner: string; issue: string }[]> = {
  aurora: [
    {
      path: 'gradient.brand',
      why: 'a Figma PAINT style; TokenPress\'s scanner reads variables + text + effect styles only, and has no gradient converter',
      owner: 'tokenpress',
      issue: '#731',
    },
    {
      path: 'gradient.glow',
      why: 'a Figma PAINT style; TokenPress\'s scanner reads variables + text + effect styles only, and has no gradient converter',
      owner: 'tokenpress',
      issue: '#731',
    },
  ],
};

const discoverBrands = (): string[] => {
  if (!existsSync(FIGMA_OUT)) return [];
  return readdirSync(FIGMA_OUT, { withFileTypes: true })
    // `core.palette.json` since #1097 — the FILE STEM, which is no longer the collection name (three
    // stems now declare `core`). A sentinel file rather than "any directory": an empty or half-written
    // brand directory must not be discovered as a brand and then pass every arm vacuously.
    .filter((e) => e.isDirectory() && existsSync(join(FIGMA_OUT, e.name, 'core.palette.json')))
    .map((e) => e.name)
    .sort();
};

const main = async (): Promise<void> => {
  const failures: string[] = [];
  const brands = discoverBrands();

  // The scope assertion, before any arm runs: a gate that promises "every brand with a Figma
  // emission" must show it found them, not report a pass over an empty list.
  if (brands.length < MIN_BRANDS) {
    console.error(
      `❌ SCOPE: found ${brands.length} brand(s) with a Figma emission under ${FIGMA_OUT}, expected at least ${MIN_BRANDS}.\n` +
        '   Either a brand\'s emission stopped being written, or this gate is scanning the wrong place.\n' +
        '   Do not lower MIN_BRANDS to make this pass — #707 gated on covering more than two brands.'
    );
    process.exit(1);
  }

  console.log(`Exporter agreement gate — ${brands.length} brands: ${brands.join(', ')}\n`);

  for (const brand of brands) {
    const r = await analyze(brand);
    const lines: string[] = [];

    // ---- ARM 1: types, a RULE at 0 -------------------------------------------------------------
    if (r.types.length > 0) {
      for (const t of r.types) {
        failures.push(
          `[${brand}] TYPE disagreement: ${t.path} — prism3 says \`${t.prism3}\`, TokenPress says \`${t.tokenpress}\`. ` +
            'A consumer-visible break in either direction.'
        );
      }
    }
    lines.push(`types: ${r.types.length}`);

    // ---- ARM 1b: types on RULE-PAIRED paths, a RULE at 0 (#747) --------------------------------
    // The same claim as ARM 1, over the paths ARM 1 structurally cannot see: a path that pairs by a
    // rename, an axis collapse or an axis-as-a-name never appears verbatim on both sides, so it never
    // enters the shared set ARM 1 walks. Separate arm rather than merged into `r.types` so the readout
    // says which arm found what — and so neither can go silent behind the other's zero.
    for (const t of r.pairedTypes) {
      failures.push(
        `[${brand}] TYPE disagreement on a RULE-PAIRED path: ${t.prism3} says \`${t.prism3Type}\`, ` +
          `${t.tokenpress} says \`${t.tokenpressType}\`. Paired by: ${t.rule.slice(0, 90)}. ` +
          'Either the two exporters disagree on this token\'s type, or the pairing rule is wrong about ' +
          'them being the same thing — read the rule\'s `counterpart` before assuming the first (#747).'
      );
    }
    lines.push(`paired types: ${r.pairedTypes.length}`);

    // ---- ARM 1c: NO paired path is left untyped, a RULE at 0 (#747's acceptance criterion) -----
    // The arm that keeps ARMs 1 and 1b honest. Both report disagreements among the paths they COMPARE;
    // neither can notice a path that nothing compares. That was the original defect: 71–73 paths per
    // brand, ~14% of the paired surface, silently uncompared while the types arm printed 0.
    //
    // ASSERTED, NOT PRINTED, and #747 asked for exactly that — "a count that is only printed goes
    // stale the way #707's figures did". A rule added later that pairs paths without resolving their
    // types fails here rather than quietly widening the hole again.
    if (r.typeBlindSpots.blind > 0) {
      failures.push(
        `[${brand}] TYPE-BLIND PAIRS: ${r.typeBlindSpots.blind} rule-paired path(s) have NO type ` +
          'comparison — the pairing claims two paths are the same token and nothing checks their ' +
          '`$type`. This is #747\'s original defect reappearing. Fix by resolving the counterpart\'s ' +
          'type in the rule (see `PathExplanation.typed`), never by removing the pairing.'
      );
    }
    lines.push(`type-blind pairs: ${r.typeBlindSpots.blind}`);

    // ---- ARM 1d: every emitted collection's axis is DECLARED (#697) -----------------------------
    // #697's Verify list: "Assert per-collection axis classification is declared, not inferred — and
    // that an unclassified collection fails rather than defaulting. Same posture as the payload
    // manifest (#674): membership-by-guess reports as a pass."
    for (const u of r.axes.unclassified) {
      failures.push(
        `[${brand}] UNCLASSIFIED COLLECTION: \`${u.collection}\` (modes: ${u.modes.join(', ') || 'none'}) ` +
          'is emitted but its axis is not declared in `tools/exporter-comparison/axes.ts`. Which axis a ' +
          'collection\'s modes represent is human knowledge Figma does not record (#697), so there is ' +
          'nothing to infer it from — classify it. Do NOT add a default: 14 of 18 entries are `none`, ' +
          'so a default would be right 14 times and silently wrong on the 15th.'
      );
    }
    for (const s of r.axes.stale) {
      failures.push(
        `[${brand}] STALE AXIS DECLARATION: \`${s}\` is declared in axes.ts but this brand's emission ` +
          'no longer carries it. Either the collection was renamed or removed — update the declaration. ' +
          'A declaration that cannot notice its own obsolescence is the shape #729 fixed.'
      );
    }
    lines.push(`axes: ${r.axes.represented.join('+')}`);

    // ---- ARM 2a: tokenpress-only paths, a RULE at 0 ---------------------------------------------
    for (const p of r.paths.unpairedTokenPress) {
      failures.push(
        `[${brand}] UNPAIRED (tokenpress-only): ${p} — TokenPress emits a path prism3 does not. ` +
          'Either the round-trip invented a token or prism3 dropped one; a pairing rule in compare.ts may also have stopped matching.'
      );
    }

    // ---- ARM 2b: prism3-only paths, a MEMORY with reasons --------------------------------------
    // Both directions. A NEW unreachable path fails (the count grew); a path that became REACHABLE
    // also fails (the memory is stale and its issue is done). Asserting only the first would let
    // this gate outlive its own carve-out.
    const known = KNOWN_UNREACHABLE[brand] ?? [];
    const knownPaths = new Set(known.map((k) => k.path));
    for (const p of r.paths.unpairedPrism3) {
      if (!knownPaths.has(p)) {
        failures.push(
          `[${brand}] UNPAIRED (prism3-only), NOT IN THE MEMORY: ${p} — prism3 emits a path TokenPress cannot produce, ` +
            'and no recorded cause covers it. Establish WHY (a Figma model limit, or a gap in one exporter\'s lane), ' +
            'then either fix it or add it to KNOWN_UNREACHABLE with the reason and an issue.'
        );
      }
    }
    for (const k of known) {
      if (!r.paths.unpairedPrism3.includes(k.path)) {
        failures.push(
          `[${brand}] STALE MEMORY: ${k.path} is recorded as unreachable (${k.issue}) but now PAIRS. ` +
            'If that issue was fixed, delete the entry — this is the intended way the carve-out ends.'
        );
      }
    }
    lines.push(
      `unpaired: ${r.paths.unpairedPrism3.length} prism3-only (${known.length} known) / ${r.paths.unpairedTokenPress.length} tokenpress-only`
    );

    // ---- ARM 2c: the brand namespace survives the round trip, a RULE (#1097) --------------------
    // THIS ARM EXISTS BECAUSE ARM 2a AND 2b CANNOT SEE ITS SUBJECT, and that is a consequence of a
    // change made in the same PR. Paths are compared with each side's own root stripped (see
    // `unionTokenPress`), so once prism3's namespace is off BOTH sides, a namespace that never reached
    // Figma at all pairs perfectly: prism3's `prism.space.100` and a rootless `space/100` both reduce
    // to `space.100`. The paths arms would report 0 and mean nothing by it.
    //
    // Before the strip was added they DID go red on a missing namespace — but only as a side effect,
    // and the same sensitivity fired on a CORRECT emission (746 prism3-only / 711 tokenpress-only on
    // aurora, the same tokens unpaired on one segment). A backstop that cannot tell the hazard from
    // the healthy case is not a backstop; docs/34 calls this the borrowed one. So the claim gets an
    // arm that states it.
    //
    // Independence: `prism3Root` is read off the DTCG projection's own top-level key, `rootKeys` off
    // the trees TokenPress built from the FIGMA emission. Two artifacts, two emitters, neither
    // authored from the other — the only way they agree is if the root really did travel through the
    // Figma variable name. Note what is NOT asserted: the root's spelling. `prism`/`nbds`/`wendys` is
    // a brand's own choice and naming it here would make this gate brand-specific (#1097's rule).
    // WHICH TYPES A FIGMA STYLE CAN CARRY — this gate's own expectation, authored here and not imported
    // from either exporter. prism3 emits exactly two style channels (text styles -> `typography`,
    // effect styles -> `shadow`); a Figma style cannot hold a dimension, a color or a number, so an
    // unrooted group carrying one of those is a VARIABLE that lost its root, which is the failure.
    const STYLE_TYPES = new Set(['typography', 'shadow']);
    const rooted = r.structure.tokenpressRootGroups.filter((g) => g.key === r.structure.prism3Root);
    const unrooted = r.structure.tokenpressRootGroups.filter((g) => g.key !== r.structure.prism3Root);

    if (rooted.length !== 1) {
      failures.push(
        `[${brand}] NAMESPACE LOST IN THE ROUND TRIP: prism3's DTCG root is \`${r.structure.prism3Root}\`, and ` +
          `NO top-level group TokenPress produced carries it. It found: ${r.structure.tokenpressRootKeys.slice(0, 8).join(', ')}. ` +
          'Since #1097 every Figma VARIABLE name begins with the brand root, so an exporter reading those ' +
          'names back must reproduce it as a top-level group. Either the emission stopped rooting its ' +
          'variable names, or something re-rooted them on the way through. The unpaired-path arms CANNOT ' +
          'catch this — they compare with each side\'s root stripped — so this arm is the only one that does.'
      );
    }
    for (const g of unrooted) {
      const nonStyle = g.types.filter((t) => !STYLE_TYPES.has(t));
      if (nonStyle.length) {
        failures.push(
          `[${brand}] UNROOTED VARIABLE GROUP: TokenPress produced a top-level group \`${g.key}\` that is not ` +
            `the brand root \`${r.structure.prism3Root}\` and holds \`${nonStyle.join(', ')}\` — types a Figma STYLE ` +
            'cannot carry, so these came from VARIABLES whose names lost their root. #1097 drops the root from ' +
            'style names ONLY (a style is picked from a flat list, a variable is found by full name).'
        );
      }
    }
    lines.push(
      `namespace: ${rooted.length === 1 ? `\`${r.structure.prism3Root}\` round-trips` : 'LOST'}` +
        `${unrooted.length ? ` + ${unrooted.length} unrooted style group(s): ${unrooted.map((g) => g.key).join('/')}` : ''}`
    );

    // ---- ARM 3: the float32 cleanup did not leak, a RULE at 0 ----------------------------------
    const leaks = r.values.filter((v) => v.float32 === 'leak');
    for (const v of leaks) {
      failures.push(
        `[${brand}] FLOAT32 LEAK: ${v.path} — the cleanup changed the value rather than restoring it ` +
          `(prism3 ${JSON.stringify(v.prism3)} vs tokenpress ${JSON.stringify(v.tokenpress)}). ` +
          'This is #703\'s predicted "silent lossy rewrite", observed.'
      );
    }
    lines.push(`float32 leaks: ${leaks.length}`);

    // ---- ARM 4: opacity scale, a RULE at 0 — #709's integration-level regression test ----------
    const scale = r.values.filter((v) => v.kind === 'scale');
    for (const v of scale) {
      failures.push(
        `[${brand}] SCALE disagreement (#709 regression): ${v.path} — ` +
          `prism3 ${JSON.stringify(v.prism3)} vs tokenpress ${JSON.stringify(v.tokenpress)}. ` +
          'apps/tokenpress/tests/unit/opacity-percent-to-fraction.test.ts should have failed first.'
      );
    }
    lines.push(`scale disagreements: ${scale.length}`);

    console.log(`  ${brand.padEnd(8)} ${lines.join(' · ')}`);
  }

  console.log('');
  if (failures.length) {
    console.error(`❌ exporter agreement gate: ${failures.length} failure(s)\n`);
    for (const f of failures) console.error(`   ${f}`);
    console.error(
      '\n   These are the arms where the two exporters disagreeing means one is WRONG. Categories 3–5\n' +
        '   of `compare.ts` are reporting-only by design and are not asserted here.'
    );
    process.exit(1);
  }
  console.log(
    `✓ the two exporters agree on every assertable arm across ${brands.length} brands: 0 type disagreements, ` +
      '0 tokenpress-only paths, 0 float32 leaks, 0 scale disagreements, and every prism3-only path accounted for.'
  );
};

main().catch((e) => {
  console.error(`gate failed to run: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
