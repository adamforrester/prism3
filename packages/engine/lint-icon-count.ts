/**
 * Prism3 engine — THE ICON DEF'S METADATA STATES NO STALE GLYPH COUNT (#1293).
 *
 *   npx tsx packages/engine/lint-icon-count.ts
 *
 * WHY THIS EXISTS. #1293 is the second time in one cluster (see #1290) that a COUNT written into prose
 * went stale while the sentence around it stayed confident: `version.ts`'s 0.49.0 changelog entry said
 * the engine emits `icon` as "a set of 39 members", and by the time it merged #1012 had already made the
 * set standalone components AND the membership had grown. Nothing gated the prose against the def, so a
 * one-line grep disproved a load-bearing sentence and no test noticed.
 *
 * The durable fix #1290/#1110 teach is "name the source of truth, not the numeral" — so the prose this PR
 * touched drops the count and points at `ICON_NAMES` / `icon-glyphs.ts` instead. This gate is what makes
 * that stick: it forbids the icon def's own METADATA PROSE from ever restating a glyph count that
 * disagrees with the actual vocabulary.
 *
 * ── WHAT IT COMPARES, AND WHY THE TWO HALVES ARE INDEPENDENT (docs/34) ──────────────────────────────
 *
 * EXPECTED is `ICON_NAMES.length` — the actual vocabulary, read straight from `icon-glyphs.ts` (which is
 * itself generated from `icons/*.svg` through `icon-set.ts`). ACTUAL is any integer the icon def's prose
 * binds to a glyph-set noun. The two are authored in different files by different hands: the number in a
 * sentence is typed by a person; `ICON_NAMES.length` moves the day a glyph lands. A gate that pinned the
 * prose against a SECOND hardcoded numeral would be the exact #1110 trap — two constants agreeing with
 * each other and neither with the set (docs/34 shape 1). This one derives its expected from the set.
 *
 * ── SCOPE IS DECLARED, NOT INFERRED, AND IT IS THE ICON DEF ONLY ────────────────────────────────────
 *
 * `iconProse()` extracts a NAMED set of fields off the imported `icon` `ComponentDef` — its
 * `description`, each prop's `description`, each anatomy part's `note`, and every `codeOnly` entry. These
 * are the component's shipping DOCUMENTATION prose (they reach `apps/plugin/dist`, so `lint-us-english`
 * already scans them as an engine surface). Three surfaces are deliberately OUT of scope:
 *
 *   - The CHANGELOG genre — `version.ts` entries and `docs/00-progress.md` — is append-only history, and
 *     an entry legitimately states the count that was true when it was written ("a 40th glyph joins the
 *     set", #1012). Gating it would demand we falsify history to go green, the same reason
 *     `lint-layout-claims.ts` exempts `docs/00-progress.md`. The #1293 changelog claim is repaired once,
 *     by hand, in this PR; it is not this gate's to police.
 *   - Other defs' prose. `field-message.ts` says "#920 landed 39 glyphs" — a dated, attributed
 *     HISTORICAL fact that stays true forever. A whole-corpus scan would flag it as a false positive.
 *     The count that must track the live set is stated in the ICON def, which is where this looks.
 *   - `//` code comments and `test.ts` messages. Those carry measured analyses whose numbers move for
 *     reasons a plain count cannot capture (the 43-member set now packs into two paste chunks where 40
 *     packed into one), so bumping them mechanically would be wrong. They are a separate cluster, filed
 *     rather than swept in here.
 *
 * ── WHY A CLEAN RUN IS THE POINT, AND HOW THAT STAYS HONEST (docs/34 shape 9) ───────────────────────
 *
 * Applying #1290's lesson means the icon metadata carries NO bare glyph count today — so on the real
 * tree this gate finds nothing to compare, which is exactly the state we want it to defend. A gate whose
 * real run is legitimately empty is the shape docs/34 shape 9 warns can go quietly green while checking
 * nothing, and its prescribed construction is the one used here:
 *
 *   - a SELF-CHECK that feeds the detector a known-bad string ("a set of 39 members") and FAILS if it
 *     comes back clean, plus a known-good one that must pass — so the detector is proven live every run,
 *     independent of whether the tree currently trips it; and
 *   - a REPRESENTATION FLOOR asserting `iconProse()` actually pulled the icon def's expected fields, so a
 *     refactor that empties the scope fails loudly rather than passing over an empty set.
 *
 * The teeth are therefore future-facing: the day someone writes "the set's 44 glyphs" into the icon
 * metadata — or grows the set and leaves a "43" behind — this fires by name. Proven by the mandatory
 * mutation in #1293's progress entry.
 *
 * Dependency-free per repo convention — the def is imported, the detector is a hand-rolled regex.
 */
import { icon } from './components';
import { ICON_NAMES } from './icon-glyphs';
import type { ComponentDef } from './component-schema';

/** One extracted prose field: WHERE it lives on the def, and the text to scan. The `field` label is what
 *  a failure names, so it must point a reader at the exact string to edit. */
export type ProseField = { field: string; text: string };

/** The DECLARED scope — the icon def's shipping documentation prose, pulled by explicit path rather than
 *  a generic walk (which would rake in enum values, token refs and glyph templates and turn every one
 *  into a false-positive surface). Adding a prose field to `ComponentDef` that should be gated means
 *  adding it here on purpose. */
export const iconProse = (def: ComponentDef): ProseField[] => {
  const out: ProseField[] = [];
  if (def.description) out.push({ field: 'description', text: def.description });
  for (const p of def.props ?? []) {
    if (p.description) out.push({ field: `props.${p.name}.description`, text: p.description });
  }
  const parts = def.anatomy?.parts ?? {};
  for (const [name, part] of Object.entries(parts)) {
    if (part.note) out.push({ field: `anatomy.parts.${name}.note`, text: part.note });
  }
  (def.anatomy?.codeOnly ?? []).forEach((entry, i) => out.push({ field: `anatomy.codeOnly[${i}]`, text: entry }));
  return out;
};

/** One glyph-count claim found in prose: the integer, and the phrase it sat in (for the message). */
export type CountClaim = { count: number; phrase: string };

// A count is a claim about the glyph vocabulary when an integer is bound to a set-of-glyphs noun. The
// separator is whitespace / slash / hyphen ONLY, so "16px glyph" (px between number and noun) and
// "44×44" (no noun) are not claims — measured against the icon def's real prose, which carries pixel
// sizes, WCAG SC numbers and issue refs that must never read as glyph counts. `members`/`sources` are
// safe HERE specifically because the icon set projects one member per glyph and `sources` names the
// SVGs one-to-one; neither would mean anything else in THIS def (the reason the scope is one def).
const NOUN = '(?:glyphs?|icons?|members?|sources?)';
const AFTER_RE = new RegExp(String.raw`\b(\d{1,4})[\s/-]*${NOUN}\b`, 'gi');
const OF_RE = new RegExp(String.raw`\b(?:set|vocabulary|library)\s+of\s+(\d{1,4})\b`, 'gi');

/** Every glyph-count claim in a piece of text. Pure, and driven by BOTH the self-check and the real run
 *  — never a reimplementation on either side (docs/34 shape 2). */
export const iconCounts = (text: string): CountClaim[] => {
  const out: CountClaim[] = [];
  for (const re of [AFTER_RE, OF_RE]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) out.push({ count: Number(m[1]), phrase: m[0] });
  }
  return out;
};

/** The claims in `text` whose number disagrees with the live vocabulary. */
export const staleCounts = (text: string, expected: number): CountClaim[] =>
  iconCounts(text).filter((c) => c.count !== expected);

// ---- SELF-CHECK: can the detector still see a stale count, and still pass a clean one? --------------
// Both directions for every claim, driven through `iconCounts`/`staleCounts` — the functions the real
// run calls. A detector that cannot fire on a known-bad input is worse than none: it certifies a clean
// tree it never actually inspected (docs/34 shape 9).
const selfFails: string[] = [];

// 1. The #1293 phrasing itself must be caught, and reported as the wrong number.
if (!iconCounts('the engine emits `icon` as a set of 39 members').some((c) => c.count === 39)) {
  selfFails.push('the detector no longer finds "a set of 39 members" — the exact #1293 claim would ship again');
}
// 2. The other real shape it must catch — the count I removed from `icon.ts` this PR.
if (!iconCounts('verified across all 40 sources').some((c) => c.count === 40)) {
  selfFails.push('the detector no longer finds "40 sources" — the drift this gate was written for');
}
// 3. `set of N` with no trailing noun (the OF_RE arm), and `N-glyph` (hyphen separator).
if (!iconCounts('a vocabulary of 39 glyphs').some((c) => c.count === 39)) selfFails.push('OF_RE / plural-noun arm broke');
if (!iconCounts('a 39-glyph set').some((c) => c.count === 39)) selfFails.push('the hyphen-separated "N-glyph" form is not detected');
// 4. NO FALSE POSITIVES on the numbers the icon def's real prose actually carries. Every string below is
//    lifted from a live field — if any reads as a glyph count, the gate would fail on correct prose.
for (const clean of [
  'drawn on a square base-4/base-8 artboard at a fixed set of sizes',
  'snapping to the fixed pixel grid — 16 / 20 / 24 / 32',
  'a 16px glyph cannot be its own target',           // "px" sits between the number and the noun
  'the 44×44 (48 Android) floor for an icon-only control',
  'a meaningful icon clears 3:1; a decorative one is exempt',
  'Material Symbols moves ~11.5% of the text size down',
]) {
  if (iconCounts(clean).length) {
    selfFails.push(`false positive on real icon prose: "${clean}" → ${JSON.stringify(iconCounts(clean))}`);
  }
}
// 5. The CORRECT count is found but NOT flagged — the gate keys on disagreement, not on any numeral, so
//    prose that legitimately states the live count would pass (both directions of the same predicate).
if (iconCounts('the set of 43 glyphs').length === 0) selfFails.push('a correct-count phrasing is not even detected — staleCounts could never distinguish it');
if (staleCounts('the set of 43 glyphs', 43).length) selfFails.push('staleCounts flags a count that MATCHES the vocabulary (false positive)');
if (!staleCounts('the set of 43 glyphs', 44).length) selfFails.push('staleCounts does not flag a count that DISAGREES with the vocabulary');

// 6. The scope extractor pulls real, distinct fields from a def — proven on a hand-made def, not the
//    real one, so this assertion does not depend on icon.ts's current field count.
{
  const sample = {
    description: 'thirty-nine glyphs',
    props: [{ name: 'name', description: 'the vocabulary' } as never],
    anatomy: { parts: { glyph: { note: 'the outline' } }, codeOnly: ['a — ceiling one', 'b — ceiling two'] },
  } as unknown as ComponentDef;
  const fields = iconProse(sample).map((f) => f.field);
  for (const want of ['description', 'props.name.description', 'anatomy.parts.glyph.note', 'anatomy.codeOnly[0]', 'anatomy.codeOnly[1]']) {
    if (!fields.includes(want)) selfFails.push(`iconProse dropped the '${want}' field`);
  }
}

if (selfFails.length) {
  console.error("\n❌ the icon-count check's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- SCOPE FLOOR: did it actually read the icon def's metadata? ------------------------------------
// A clean run is the DESIGNED state (#1290 leaves no bare count in the prose), so "found nothing wrong"
// must be distinguishable from "found nothing to read". Assert the extraction pulled the icon def's
// expected shape rather than an empty set — the docs/34 shape 9 floor.
const prose = iconProse(icon);
const has = (prefix: string) => prose.some((f) => f.field.startsWith(prefix));
const floorProblems: string[] = [];
if (!has('description')) floorProblems.push('no description field');
if (prose.filter((f) => f.field.startsWith('props.')).length < 3) floorProblems.push('fewer than 3 prop descriptions');
if (!has('anatomy.parts.')) floorProblems.push('no anatomy part note');
if (prose.filter((f) => f.field.startsWith('anatomy.codeOnly')).length < 5) floorProblems.push('fewer than 5 codeOnly entries');
if (floorProblems.length) {
  console.error('\n❌ the icon-count check read less of the icon def than it promised to — its scope has gone blind:\n');
  for (const p of floorProblems) console.error(`    ${p}`);
  console.error('\n  Either the icon def was restructured (update iconProse in the same PR), or the import broke and');
  console.error('  this gate is asserting over an empty set.');
  process.exit(1);
}

// ---- THE REAL RUN ---------------------------------------------------------------------------------
const expected = ICON_NAMES.length;
const failures: { field: string; claim: CountClaim }[] = [];
for (const { field, text } of prose) {
  for (const claim of staleCounts(text, expected)) failures.push({ field, claim });
}

console.log(
  `Icon-count check — ${prose.length} icon-metadata prose field(s) scanned against ICON_NAMES.length (${expected}); ` +
    `${prose.reduce((n, f) => n + iconCounts(f.text).length, 0)} glyph-count claim(s) present.`,
);

if (failures.length) {
  console.error(`\n❌ ${failures.length} icon-metadata prose field(s) state a glyph count that disagrees with the vocabulary (${expected}):\n`);
  for (const { field, claim } of failures) {
    console.error(`    icon.${field}: "${claim.phrase}" — the set has ${expected} glyphs (ICON_NAMES.length in icon-glyphs.ts).`);
  }
  console.error('\n  Prefer naming the source ("across every source", "the `IconName` vocabulary") over restating a');
  console.error('  bare count — that is #1290/#1110\'s lesson and why this gate exists. If a count genuinely helps,');
  console.error('  it must equal ICON_NAMES.length. The changelog genre (version.ts, docs/00-progress.md) is history');
  console.error('  and out of scope; this covers the icon def\'s own shipping metadata.');
  process.exit(1);
}
console.log(`  ✓ clean — no icon-metadata prose field restates a stale glyph count.`);
