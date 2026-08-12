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
 *                rather than 0-as-measured.
 *
 *   UNPAIRED     asserted per DIRECTION, and the two directions are NOT symmetric:
 *                · tokenpress-only  — a RULE at 0. A path TokenPress emits and prism3 does not
 *                  means the Figma round-trip invented a token, or prism3 dropped one.
 *                · prism3-only      — a MEMORY, per brand, of the paths currently known to be
 *                  unreachable and WHY. See KNOWN_UNREACHABLE below; the "why" is the gate.
 *
 *   FLOAT32 LEAK asserted at 0, as a RULE. #703 predicted TokenPress's `roundToPrecision` cleanup
 *                could silently rewrite a value that never carried the artifact. Measured safe for
 *                8-bit-authored color (all 256 channels survive fround-then-4dp), which is what
 *                both exporters' corpora are. A leak is the prediction coming true, not a new
 *                convention.
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
 * ── THE BRAND LIST IS DISCOVERED, NOT LISTED ────────────────────────────────────────────────────
 *
 * Brands come from scanning `out/figma/`, and the count is asserted at >= 3 rather than trusted.
 * A hand-written list would silently stop covering a brand added later — and a discovered list with
 * no floor silently passes when the scan returns nothing, which is the same false pass one step
 * further back (`lint-overlay-completeness.ts` and `check-consumability.mjs` both take this shape).
 *
 * ── THE LIMIT, FOUND BY A MUTATION THAT DID *NOT* FAIL — TRACKED AS #747 ────────────────────────
 *
 * THE TYPES ARM ONLY SEES PATHS THAT PAIR. It compares `$type` over the SHARED path set, so a
 * retype on a path that a pairing RULE explains is invisible to it. Measured: changing TokenPress's
 * grid branch from `dimension` to `number` (`exporter.ts:714`) left this gate GREEN, because prism3's
 * `grid.<breakpoint>.<prop>` and TokenPress's `grid.<prop>` are an axis collapse and never enter the
 * shared set. The same mutation on `FONT_SIZE` — which does pair — produced 66 failures.
 *
 * The blind set is wider than that one rule, and this is the number to hold: 71 paths on nb, 73 on
 * aurora, 71 on wendys — roughly 14% of each brand's paired surface, across FOUR rules (38 renamed
 * `type.*`/`typography.*`, 11 duplicate-emitted `font-fluid.*`, 15 axis-collapsed `grid.*`, 7
 * `shadow-dark.*` crossing as a name). So a green types arm does not mean "no type disagreements";
 * it means "none among the paths that pair".
 *
 * It is stated rather than papered over — but a header comment is a MEMORY, NOT A QUEUE, so the work
 * is filed as **#747**, with the failing mutation as its acceptance test, and #697 carries "must
 * close #747" in its own Verify list. Two of the four rules exist only because #697's axis question
 * is undecided, which is why that is where it belongs. Do not close #747 by narrowing this paragraph:
 * the prose is honest and the hole is real, and editing the description is the move that makes a gate
 * look stronger without being stronger.
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
    .filter((e) => e.isDirectory() && existsSync(join(FIGMA_OUT, e.name, 'core-palette.json')))
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
