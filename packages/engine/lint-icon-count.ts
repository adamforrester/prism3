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
 * `iconProse()` extracts a NAMED set of fields off the imported `icon` `ComponentDef`: every prose field
 * that ships. That is `summary`, `description`, each prop's `description`, each anatomy part's `note`, every
 * `codeOnly` entry, and the `accessibility`, `content`, `docs`, `ai`, `motion` and
 * `composition.replacesPatterns` prose (#3062). These reach `out/components/components.ai.json`, the docs
 * page and `apps/plugin/dist`. Until #3062 it read only the first four, so a count written in `summary` or
 * `docs.usage` shipped unseen (docs/34 shape 15). `notes` is the one prose field left out: it is
 * maintainer-only and ships nowhere. The SHIPPED COVERAGE arm below holds the list to the emission rather than
 * to this paragraph. Three surfaces are deliberately OUT of scope:
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
 * ── AND THE PROVIDER-LOGO DEF, WHICH STATES NO COUNT AT ALL (#2343) ────────────────────────────────────
 *
 * The second icon type takes the same check, one notch stricter. The owner will supply about a dozen providers
 * and the list is data (Q-B7 amended), so the `provider-logo` def's prose states NO count of marks or providers:
 * any integer bound to a mark noun fails, whether or not it matches `PROVIDER_LOGO_SOURCES` today. The same
 * self-check proves the mark detector live, and the same kind of floor proves the scope was read.
 *
 * Dependency-free per repo convention — the def is imported, the detector is a hand-rolled regex.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { providerLogo, icon } from './components';
import { ICON_NAMES } from './icon-glyphs';
import type { ComponentDef } from './component-schema';
import { codeOnlyText } from './code-only-register';

/** One extracted prose field: WHERE it lives on the def, and the text to scan. The `field` label is what
 *  a failure names, so it must point a reader at the exact string to edit. */
export type ProseField = { field: string; text: string };

/** The DECLARED scope — the icon def's shipping documentation prose, pulled by explicit path rather than
 *  a generic walk (which would rake in enum values, token refs and glyph templates and turn every one
 *  into a false-positive surface). Adding a prose field to `ComponentDef` that should be gated means
 *  adding it here on purpose. */
export const iconProse = (def: ComponentDef): ProseField[] => {
  const out: ProseField[] = [];
  const one = (field: string, text: string | undefined) => { if (text) out.push({ field, text }); };
  const each = (field: string, list: readonly string[] | undefined) => (list ?? []).forEach((text, i) => one(`${field}[${i}]`, text));
  one('summary', def.summary);
  one('description', def.description);
  for (const p of def.props ?? []) one(`props.${p.name}.description`, p.description);
  const parts = def.anatomy?.parts ?? {};
  for (const [name, part] of Object.entries(parts)) one(`anatomy.parts.${name}.note`, part.note);
  each('anatomy.codeOnly', codeOnlyText(def.anatomy?.codeOnly));
  // #3062: the rest of what ships. Named by path, for the reason in the doc comment above.
  const a = def.accessibility;
  one('accessibility.role', a?.role); each('accessibility.wcag', a?.wcag); one('accessibility.keyboard', a?.keyboard);
  one('accessibility.focus', a?.focus); one('accessibility.aria', a?.aria);
  for (const [k, text] of Object.entries(def.content ?? {})) one(`content.${k}`, text);
  one('docs.usage', def.docs?.usage); each('docs.do', def.docs?.do); each('docs.dont', def.docs?.dont);
  one('docs.contentGuidelines', def.docs?.contentGuidelines);
  one('ai.primaryPurpose', def.ai?.primaryPurpose); one('ai.whenToUse', def.ai?.whenToUse); one('ai.avoidWhen', def.ai?.avoidWhen);
  each('ai.triggerKeywords', def.ai?.triggerKeywords);
  one('motion.enter', def.motion?.enter); one('motion.exit', def.motion?.exit); one('motion.reduceMotion', def.motion?.reduceMotion);
  each('composition.replacesPatterns', def.composition?.replacesPatterns);
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
    summary: 'one line',
    description: 'thirty-nine glyphs',
    props: [{ name: 'name', description: 'the vocabulary' } as never],
    anatomy: { parts: { glyph: { note: 'the outline' } }, codeOnly: [{ class: 'semantics', disposition: 'refused', description: 'a — ceiling one' }, { class: 'motion', disposition: 'refused', description: 'b — ceiling two' }] },
    accessibility: { role: 'img', wcag: ['1.1.1'], keyboard: 'none', focus: 'none', aria: 'hidden' },
    content: { labelPattern: 'a noun' },
    docs: { usage: 'use it', do: ['do one'], dont: ['dont one'], contentGuidelines: 'name it' },
    ai: { primaryPurpose: 'show', whenToUse: 'when', avoidWhen: 'avoid', triggerKeywords: ['kw'] },
    motion: { enter: 'none', exit: 'none', reduceMotion: 'static' },
    composition: { replacesPatterns: ['old way'] },
  } as unknown as ComponentDef;
  const fields = iconProse(sample).map((f) => f.field);
  for (const want of ['summary', 'description', 'props.name.description', 'anatomy.parts.glyph.note', 'anatomy.codeOnly[0]', 'anatomy.codeOnly[1]',
    'accessibility.role', 'accessibility.wcag[0]', 'accessibility.keyboard', 'accessibility.focus', 'accessibility.aria', 'content.labelPattern',
    'docs.usage', 'docs.do[0]', 'docs.dont[0]', 'docs.contentGuidelines', 'ai.primaryPurpose', 'ai.whenToUse', 'ai.avoidWhen', 'ai.triggerKeywords[0]',
    'motion.enter', 'motion.exit', 'motion.reduceMotion', 'composition.replacesPatterns[0]']) {
    if (!fields.includes(want)) selfFails.push(`iconProse dropped the '${want}' field`);
  }
}
// 7. #3062's own case: a count in `summary` reaches the detector. Driven through `iconProse` on a def whose ONLY
//    count is in `summary`, so an extractor that drops the field fails here. The mark detector's twin is below.
{
  const summaryOnly = { summary: 'One of 74 marks, a set of 39 glyphs.', description: 'no count here' } as unknown as ComponentDef;
  const seen = iconProse(summaryOnly).filter((f) => f.field === 'summary');
  if (!seen.some((f) => iconCounts(f.text).some((c) => c.count === 39))) selfFails.push('a glyph count in `summary` does not reach the detector (#3062)');
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
// #3062: one floor per shipped surface, typed here from each def as it stands, so a surface the extractor stops
// reading fails by name. A def that drops a surface on purpose lowers its line here in the same PR.
type Floor = [prefix: string, min: number][];
const floorMisses = (prose: ProseField[], floor: Floor): string[] =>
  floor.flatMap(([prefix, min]) => {
    const n = prose.filter((f) => f.field === prefix || f.field.startsWith(prefix.endsWith('.') ? prefix : `${prefix}[`)).length;
    return n < min ? [`fewer than ${min} \`${prefix}\` field(s) (read ${n})`] : [];
  });
const SURFACES = (props: number, codeOnly: number, a11y: number): Floor => [
  ['summary', 1], ['description', 1], ['props.', props], ['anatomy.parts.', 1], ['anatomy.codeOnly', codeOnly],
  ['accessibility.', a11y], ['content.', 1], ['docs.usage', 1], ['docs.do', 3], ['docs.dont', 3], ['docs.contentGuidelines', 1],
  ['ai.primaryPurpose', 1], ['ai.whenToUse', 1], ['ai.avoidWhen', 1], ['motion.', 1],
];
const prose = iconProse(icon);
const floorProblems = floorMisses(prose, SURFACES(3, 5, 5));
if (floorProblems.length) {
  console.error('\n❌ the icon-count check read less of the icon def than it promised to — its scope has gone blind:\n');
  for (const p of floorProblems) console.error(`    ${p}`);
  console.error('\n  Either the icon def was restructured (update iconProse in the same PR), or the import broke and');
  console.error('  this gate is asserting over an empty set.');
  process.exit(1);
}

// ---- THE PROVIDER-LOGO DEF: NO COUNT AT ALL (#2343) ----------------------------------------------------
// Its own noun list: `providers`, `marks` and `logos` are what a sentence about the mark set would count, and
// `members`/`sources` mean one member and one file per mark here as they do for the icon set.
const MARK_NOUN = '(?:marks?|logos?|providers?|members?|sources?|networks?)';
const MARK_AFTER_RE = new RegExp(String.raw`\b(\d{1,4})[\s/-]*${MARK_NOUN}\b`, 'gi');
const MARK_OF_RE = new RegExp(String.raw`\b(?:set|vocabulary|library|list)\s+of\s+(\d{1,4})\b`, 'gi');
export const markCounts = (text: string): CountClaim[] => {
  const out: CountClaim[] = [];
  for (const re of [MARK_AFTER_RE, MARK_OF_RE]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) out.push({ count: Number(m[1]), phrase: m[0] });
  }
  return out;
};
{
  const bad: string[] = [];
  if (!markCounts('the set of 12 marks').some((c) => c.count === 12)) bad.push('"the set of 12 marks" is not detected');
  if (!markCounts('about 12 providers').some((c) => c.count === 12)) bad.push('"12 providers" is not detected');
  if (!markCounts('a 19-mark set').some((c) => c.count === 19)) bad.push('the hyphenated "19-mark" form is not detected');
  // #3062's case, through the extractor: a def whose only count is in `summary`.
  const summaryOnly = { summary: 'One of 74 marks: sign-in, payment and social.', description: 'no count here' } as unknown as ComponentDef;
  if (!iconProse(summaryOnly).some((f) => f.field === 'summary' && markCounts(f.text).some((c) => c.count === 74))) bad.push('a mark count in `summary` does not reach the detector (#3062)');
  for (const clean of ['Square marks are 24 by 24, payment tiles 32 by 20', 'logos 24 high at their own width', 'The height: 20, 24 or 32px']) {
    if (markCounts(clean).length) bad.push(`false positive on real provider-logo prose: "${clean}" → ${JSON.stringify(markCounts(clean))}`);
  }
  if (bad.length) {
    console.error("\n❌ the provider-logo count check's own detection is broken:\n");
    for (const b of bad) console.error(`    ${b}`);
    process.exit(1);
  }
}
const markProse = iconProse(providerLogo);
const markFloor = floorMisses(markProse, SURFACES(2, 3, 3));
if (markFloor.length) {
  console.error('\n❌ the provider-logo count check read less of the provider-logo def than it promised to:\n');
  for (const p of markFloor) console.error(`    ${p}`);
  process.exit(1);
}
const markFailures = markProse.flatMap(({ field, text }) => markCounts(text).map((claim) => ({ field, claim })));

// ---- SHIPPED COVERAGE (#3062): every prose string the emission ships for each def is in the scanned set ----
// The floors above are typed from the defs as they stand; this arm asks the EMISSION instead, so a prose field
// added to the schema and projected into `components.ai.json` is caught the day it ships, not the day someone
// remembers this file. Independent of `iconProse` (docs/34 shape 15): the walk is a generic one over the
// emitted JSON, written here, and the only authored part is the list of keys that hold identifiers or
// enumerated values rather than prose. Each is excluded by its path, with the reason it cannot carry a count.
const NOT_PROSE = new Set([
  'id', 'name', 'aliases[]', 'category', 'status', 'states[]',     // identifiers and lifecycle enums
  'props[].name', 'props[].type', 'props[].default', 'props[].values[]', // the code API, typechecked
  'ai.commonPartners[]', 'composition.composesWith[]', 'composition.alternativeTo[]', // def ids, resolved
  'composition.supersedes[]', 'composition.supersededBy[]', 'composition.planned[]',  // against the registry
  'syncBoundary[].class', 'syncBoundary[].disposition',             // register ids and disposition names (#3441)
]);
const aiJson = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'out/components/components.ai.json'), 'utf8')) as { components: Record<string, unknown> };
const coverageProblems: string[] = [];
for (const def of [icon, providerLogo]) {
  const entry = aiJson.components?.[def.id];
  if (!entry) { coverageProblems.push(`${def.id}: no entry in components.ai.json`); continue; }
  const scanned = new Set(iconProse(def).map((f) => f.text));
  const leaves: { path: string; text: string }[] = [];
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'string') leaves.push({ path, text: v });
    else if (Array.isArray(v)) v.forEach((x) => walk(x, `${path}[]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(entry, '');
  const prosePaths = leaves.filter((l) => !NOT_PROSE.has(l.path) && !l.path.startsWith('variants.'));
  if (prosePaths.length < 20) coverageProblems.push(`${def.id}: only ${prosePaths.length} shipped prose string(s) found in components.ai.json; the walk has gone blind`);
  const unscanned = prosePaths.filter((l) => !scanned.has(l.text));
  for (const l of unscanned) coverageProblems.push(`${def.id}.${l.path} ships and is not scanned: "${l.text.slice(0, 60)}"`);
  console.log(`Shipped coverage — ${def.id}: ${prosePaths.length} prose string(s) in components.ai.json, ${prosePaths.length - unscanned.length} scanned.`);
}
if (coverageProblems.length) {
  console.error('\n❌ a prose field ships for the icon or provider-logo def and this gate does not read it (#3062):\n');
  for (const p of coverageProblems) console.error(`    ${p}`);
  console.error('\n  Add the field to iconProse (and its line to the floor), or, if it holds an identifier and no prose, to NOT_PROSE.');
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

if (markFailures.length) {
  console.error(`\n❌ ${markFailures.length} provider-logo prose field(s) state a count of marks — the provider list is data (owner decision on #2343, Q-B7 amended), so the provider-logo def states none:\n`);
  for (const { field, claim } of markFailures) console.error(`    provider-logo.${field}: "${claim.phrase}"`);
  console.error('\n  Name the source instead ("every mark in the set", "the ProviderLogoName list").');
  process.exit(1);
}
console.log(`Provider-logo count check — ${markProse.length} provider-logo prose field(s) scanned; no count of marks may be stated.`);
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
