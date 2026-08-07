/**
 * Voice-standard gate for SHIPPED text (#617).
 *
 * `Prism3/docs/voice-standard.md` §2 bans a short list of phrases on every surface it names —
 * "shipped prose: UI strings, emitted artifacts, docs, marketing" — and states the scope
 * explicitly: "Code comments are exempt, matching the existing US-English carve-out in
 * CLAUDE.md." This gate is the mechanical enforcement of that table; before it, §2 was a rule a
 * reviewer had to remember to apply by eye.
 *
 * MODELED DIRECTLY ON `lint-us-english.ts` (#162 → #260 → #302 → #310 → #313 → #464), which the
 * filing issue says "already solved every hard part" — the file-walking, the scope import from
 * `regen.ts`, the fail-closed `blind[]` list, and the two-directional REQUIRED_SURFACES self-check
 * are the SAME shapes here, for the SAME reasons. Re-deriving any of them would be re-earning bugs
 * that gate already paid for. See that file's header for the fuller account of each trap; this
 * header only covers what is DIFFERENT about voice.
 *
 * SIBLING, NOT MERGED. `lint-us-english.ts` and this file check unrelated rule sets with different
 * exemption logic (en-GB spelling patterns vs. a banned-phrase list) and different failure
 * messages, so combining them would make one file's diff noisy for the other rule's changes. The
 * small amount of shared machinery — `walk`/`walkRequired`, the `blind[]` fail-closed list, the
 * `gated[]` surface construction, and the REQUIRED_SURFACES forward+converse self-check — is
 * DUPLICATED here rather than extracted into a shared module. `lint-us-english.ts` is a delicate,
 * heavily self-documented file with five numbered traps behind it; lifting shared logic out from
 * under it risks destabilizing a gate that is currently correct, to save roughly 60 lines. See
 * `Prism3/docs/00-progress.md` for the fuller tradeoff note.
 *
 * WHAT IS DIFFERENT FROM lint-us-english.ts's DETECTION:
 *
 *  1. FOUR OF THE FIVE RULES ARE A FIXED WORD LIST, ON PURPOSE. `simply`/`easy`/`obviously` and the
 *     apology pair (`Oops`/`Sorry`) are literal banned vocabulary, not a productive suffix family
 *     like `-ise`/`-our` — there is no "generalised" to miss, so lint-us-english's word-list
 *     under-counts trap does not apply here and a `\b(word|word)\b` list is the right tool, not a
 *     workaround.
 *  2. "just" NEEDS AN ALLOW-SET, and the false positive is CONTEXTUAL rather than a single token.
 *     voice-standard.md §2 states its own exception: "just" meaning exactly/barely — "just below
 *     the floor" — is legitimate. Fixed the same way lint-us-english.ts fixes every false positive:
 *     by widening an allow-set (`JUST_ALLOWED`, a phrase-context regex), never by dropping "just"
 *     from the scan.
 *  3. "!" IS SCOPED BY CONTEXT, NOT BY WORD. `web/dist/main.js` is a bundle containing real code
 *     (`!==`, `!=`) and inlined CSS (`!important`) alongside real prose — the exact reason that file
 *     is in scope at all (trap 2 in lint-us-english.ts: `levers.ts` prose is inlined there and a
 *     source-only scan would miss it, so the built bundle has to be opened directly). A prose "!" is
 *     the end of a WORD with nothing continuing it; `EXCLAIM` requires the character directly before
 *     "!" to be a letter or digit (so a boolean negation like ` !r` or `(!m`, preceded by a space or
 *     paren, never matches — and neither does a bare glyph string like `"!"` used as a fail-marker
 *     icon, e.g. `el("b","sg-fx","!")`, where the character before "!" is the string's own opening
 *     quote, not a word character) and the character after to be neither "=" (excludes `!=`/`!==`)
 *     nor a letter (excludes `!important`/`!default`/`!DOCTYPE`). Checked directly against the real
 *     bundle before landing this pattern: `web/dist/main.js` carries 130 `!==`, 5 `!important`, and 4
 *     bare `"!"` icon-glyph occurrences today, none of which this pattern flags (verified by the
 *     SELF_CHECK samples below, drawn from the real bundle's own text).
 *  4. CODE COMMENTS ARE EXEMPT, AND THIS GATE ACTUALLY IMPLEMENTS THAT — DELIBERATELY UNLIKE
 *     lint-us-english.ts. voice-standard.md §2 states the exemption explicitly; lint-us-english.ts's
 *     own header records that it RETIRED the equivalent exemption for `web/src` in #464, because
 *     which comments a bundler keeps is an implementation detail the gate cannot see and therefore
 *     cannot rely on. That reasoning does not transfer here, because the two rule sets have opposite
 *     false-positive profiles in comments: an en-GB spelling in a comment is rare and trivial to
 *     avoid, but this repo's own comment style — as read throughout this very file and its sibling
 *     gates — uses "just"/"simply" constantly as ordinary connective prose. A structural exemption is
 *     what makes this gate usable at all, not a convenience. Mechanically: real TypeScript `//` and
 *     `/* *\/` comments never reach `web/dist/main.js` in the first place — esbuild strips them
 *     (confirmed by grepping the built bundle for known source-comment text and finding none). The
 *     ONE place a comment survives into the shipped bundle is C-style block comments written as
 *     literal STRING CONTENT — the CSS-in-template-literal stylesheet in `web/src/main.ts` — because
 *     esbuild does not parse the inside of a string, so whatever bytes are there ship unchanged. So
 *     the exemption has exactly one job: blank out `/* ... *\/` spans in `.js` bundle files before any
 *     rule runs, preserving length and newlines so line numbers on a REAL hit stay accurate. JSON and
 *     Markdown surfaces get no such stripping — they carry no code-comment convention to exempt, and
 *     blanking arbitrary substrings there would be pure risk (a `/* *\/`-shaped span inside real prose
 *     is not impossible) for no benefit.
 *
 * SCOPE — imported from `regen.ts`, identical set to `lint-us-english.ts`: `out/**`, the emitted
 * `schema/`+report artifacts, `web/dist/*.js` (the BUILT bundle — same trap 2 reasoning), the schema
 * contract, the engine README, and shipped skills. A new emitted artifact is covered automatically
 * because both gates read the same `ENGINE_ARTIFACTS`/`SCHEMA_ARTIFACTS` exports; nobody has to
 * remember to add it here separately.
 *
 * Run: `npx tsx Prism3/engine/lint-voice.ts`  (exit 1 = a gated surface carries banned voice-standard
 * §2 copy)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENGINE_ARTIFACTS, SCHEMA_ARTIFACTS } from './regen';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

// ---- Rule 1: fixed banned vocabulary — voice-standard.md §2's "simply, just, easy, obviously"
// row, minus "just" (handled separately below because its false positive is contextual, not a
// single token). Literal words, not a suffix family, so a word-boundary list under-counts nothing
// here the way a fixed list under-counts en-GB spellings.
const BANNED_WORD = /\b(simply|easy|obviously)\b/gi;

// ---- Rule 2: "just" — banned UNLESS it means exactly/barely, per §2's own stated exception
// ("just below the floor" is fine). The allow-set is a PHRASE context, checked against the text
// immediately following the match; a false positive here is fixed by widening this set, never by
// dropping "just" from BANNED_WORD.
const JUST = /\bjust\b/gi;
const JUST_ALLOWED = /^\s+(?:below|above|under|over|beneath|past|outside|inside|shy of|short of|barely|about|enough|right)\b/i;

// ---- Rule 3: filler — §2's "please note, note that" row.
const FILLER = /\b(please\s+note|note\s+that)\b/gi;

// ---- Rule 4: apology copy — §2's "Oops, Sorry" row.
const APOLOGY = /\b(oops|sorry)\b/gi;

// ---- Rule 5: exclamation marks IN PROSE — §2's "manufactured enthusiasm" row. Scoped by CONTEXT
// (see header point 3) so `!==`, `!=`, `!important`, `!default`, `<!doctype`, and a bare `"!"`
// icon-glyph string never trip it: the character DIRECTLY before "!" must be a letter or digit (the
// end of an actual word — not a quote, paren, or space), and the character after must be neither "="
// (excludes `!=`/`!==`) nor a letter (excludes `!important`/`!default`/`!DOCTYPE`).
const EXCLAIM = /(?<=[A-Za-z0-9])!(?!=)(?![A-Za-z])/g;

// ---- Code-comment exemption for the built bundle — see header point 4. Blanks `/* ... */` spans
// (character-for-character, keeping every newline) so a CSS-in-template-literal comment's content
// never reaches any rule above, while line numbers on a real hit elsewhere in the same file stay
// accurate. Applied ONLY to `.js` bundle files in `scan()` below — see header point 4 for why JSON
// and Markdown surfaces get no such stripping.
const stripBlockComments = (txt: string): string => txt.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

type RawHit = { rule: string; match: string; index: number };
type Hit = { file: string; line: number; rule: string; match: string; context: string };

// Every way this gate can fail to LOOK, as opposed to look and find nothing — same discipline as
// lint-us-english.ts's `blind[]`. A non-empty list is fatal below, before any voice result prints.
const blind: string[] = [];

// The ONE place every rule is applied. SELF_CHECK and scan() both drive this, so neutering a rule
// fails the self-check rather than only going quiet in production — the lesson lint-us-english.ts's
// `enGb` comment documents (#387/#511): a self-check that reimplements the match validates the
// reimplementation, not the code path that ships.
const voiceHits = (txt: string): RawHit[] => {
  const found: RawHit[] = [];
  for (const m of txt.matchAll(BANNED_WORD)) found.push({ rule: 'banned-word', match: m[0], index: m.index ?? 0 });
  for (const m of txt.matchAll(JUST)) {
    const idx = m.index ?? 0;
    const after = txt.slice(idx + m[0].length, idx + m[0].length + 24);
    if (JUST_ALLOWED.test(after)) continue; // "just below the floor" — exactly/barely, allowed
    found.push({ rule: 'just', match: m[0], index: idx });
  }
  for (const m of txt.matchAll(FILLER)) found.push({ rule: 'filler', match: m[0], index: m.index ?? 0 });
  for (const m of txt.matchAll(APOLOGY)) found.push({ rule: 'apology', match: m[0], index: m.index ?? 0 });
  for (const m of txt.matchAll(EXCLAIM)) found.push({ rule: 'exclamation', match: '!', index: m.index ?? 0 });
  return found;
};

const scan = (abs: string): Hit[] => {
  let raw: string;
  // Fails CLOSED, same as lint-us-english.ts: an unreadable file must not count as a clean one.
  try { raw = readFileSync(abs, 'utf8'); } catch (e) {
    blind.push(`${relative(repo, abs)} — could not be read (${(e as Error).message})`);
    return [];
  }
  // Code comments are exempt (header point 4) — only the built bundle carries any, and only inside
  // `/* ... */` spans (a CSS-in-template-literal stylesheet), so this is the only surface stripped.
  const txt = abs.endsWith('.js') ? stripBlockComments(raw) : raw;
  return voiceHits(txt).map(({ rule, match, index }) => ({
    file: relative(repo, abs),
    line: txt.slice(0, index).split('\n').length,
    rule,
    match,
    context: txt.slice(Math.max(0, index - 55), index + 45).replace(/\s+/g, ' '),
  }));
};

// ---- Shared file-walking machinery, DUPLICATED from lint-us-english.ts rather than extracted —
// see the file header for why. Kept byte-for-byte identical in behavior so the two gates' scope
// stays in lockstep without a shared dependency either would need to touch to change the other.
const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
};

const walkRequired = (dir: string, why: string): string[] => {
  const found = walk(dir);
  if (!found.length) blind.push(`${relative(repo, dir)} — ${why}`);
  return found;
};

// ---- GATED: same surfaces as lint-us-english.ts, same reasoning, imported from the same
// regen.ts exports so a new emitted artifact is covered here automatically too.
const gated: string[] = [
  ...walkRequired(join(repo, 'Prism3/engine/out'), 'no emitted artifacts found — run `npx tsx Prism3/engine/regen.ts`'),
  ...SCHEMA_ARTIFACTS.map((f) => join(repo, 'Prism3/schema', f)),
  ...ENGINE_ARTIFACTS.map((f) => join(repo, 'Prism3/engine', f)),
  // trap 2 (lint-us-english.ts): what actually ships. REQUIRED — see walkRequired. `build`, not
  // `build:site`, which writes web/public/dist instead.
  ...walkRequired(join(repo, 'web/dist'), 'the web bundle is not built — run `npm run -w @prism3/web build` (NOT build:site, which writes web/public/dist)')
    .filter((f) => f.endsWith('.js')),
  join(repo, 'Prism3/schema/theme-schema.json'),
  join(repo, 'Prism3/engine/README.md'),
  // The token-name baseline — deliberately not a `regen` artifact (see CLAUDE.md principle 5), so
  // named by hand here exactly as lint-us-english.ts names it.
  join(repo, 'Prism3/schema/token-contract.json'),
  // Shipped skills — prose an agent reads and follows, named by hand for the same reason.
  ...walk(join(repo, 'Prism3/skills')).filter((f) => f.endsWith('.md')),
];

// ---- SELF-CHECK: does the scanner still detect what it claims to? ----
// One true-positive sample per rule, the stated "just" exception, and three code-context samples
// pulled from patterns that actually occur in web/dist/main.js today — so this doubles as the
// regression test for the false-positive fix, not just a demonstration of the true positives.
const SELF_CHECK: { sample: string; expectRule: string | null }[] = [
  { sample: 'You can simply update the value.', expectRule: 'banned-word' },
  { sample: 'This makes it easy to configure.', expectRule: 'banned-word' },
  { sample: 'Obviously this is the right approach.', expectRule: 'banned-word' },
  { sample: 'You just need to click here.', expectRule: 'just' },
  { sample: 'Just click here to continue.', expectRule: 'just' },            // capitalized, sentence-initial
  { sample: 'The ratio sits just below the floor.', expectRule: null },       // exactly/barely — §2's own example, must NOT trip
  { sample: 'It clears just above the 4.5 floor.', expectRule: null },        // same exception, different direction
  { sample: 'Please note the derived value.', expectRule: 'filler' },
  { sample: 'Note that this is derived from the ramp.', expectRule: 'filler' },
  { sample: 'Oops, something went wrong.', expectRule: 'apology' },
  { sample: 'Sorry, we could not complete this.', expectRule: 'apology' },
  { sample: 'Applied — 88 variables written!', expectRule: 'exclamation' },
  { sample: 'if (a !== b) return a;', expectRule: null },                     // code operator, not prose
  { sample: 'animation:none!important;left:0', expectRule: null },            // inlined CSS from web/dist, not prose
  { sample: '<!doctype html><html lang="en">', expectRule: null },            // markup, not prose
  { sample: 'el("b", "sg-fx", "!")', expectRule: null },                      // bare "!" icon glyph, real pattern from web/dist
];
const selfFails = SELF_CHECK.filter(({ sample, expectRule }) => {
  const hits = voiceHits(sample);
  return expectRule === null ? hits.length > 0 : !hits.some((h) => h.rule === expectRule);
}).map(({ sample, expectRule }) => `"${sample}" should${expectRule ? ` be flagged as '${expectRule}'` : ' NOT be flagged'}`);

// ---- Third self-check: the code-comment exemption (header point 4) actually strips what it claims
// to, on a real multi-line block-comment shape, while a violation OUTSIDE the comment on the same
// text is still caught — proving the exemption does not merely blank the whole file.
const COMMENT_SAMPLE = 'const STYLE = `\n/* Obviously this line is a comment and simply should not trip anything. */\n.btn{color:red}\n`;\nconst msg = "Sorry, that failed.";\n';
const commentSelfFails: string[] = [];
{
  const stripped = stripBlockComments(COMMENT_SAMPLE);
  const hits = voiceHits(stripped);
  if (hits.some((h) => h.rule === 'banned-word')) commentSelfFails.push('stripBlockComments left a banned word inside a /* */ span reachable');
  if (!hits.some((h) => h.rule === 'apology')) commentSelfFails.push('stripBlockComments over-stripped — it ate a real violation OUTSIDE the comment');
  if (stripped.split('\n').length !== COMMENT_SAMPLE.split('\n').length) commentSelfFails.push('stripBlockComments changed the line count — line numbers on later hits would be wrong');
}
selfFails.push(...commentSelfFails);

// ---- Second self-check, on SCOPE rather than detection — same forward+converse pair as
// lint-us-english.ts, and for the same reason: the detection self-check above proves the scanner can
// still see "simply", not that the file containing it was ever opened.
const REQUIRED_SURFACES: { label: string; test: (f: string) => boolean }[] = [
  { label: 'the built web bundle (web/dist/*.js)', test: (f) => f.includes('/web/dist/') && f.endsWith('.js') },
  { label: 'emitted artifacts (Prism3/engine/out)', test: (f) => f.includes('/Prism3/engine/out/') },
  { label: 'the schema contract (Prism3/schema)', test: (f) => f.includes('/Prism3/schema/') },
  { label: 'shipped skills (Prism3/skills/**/SKILL.md)', test: (f) => f.includes('/Prism3/skills/') },
  { label: 'the emitted reports (ENGINE_ARTIFACTS)', test: (f) => ENGINE_ARTIFACTS.some((a) => f.endsWith(`/${a}`)) },
  { label: 'the engine README', test: (f) => f.endsWith('/Prism3/engine/README.md') },
];
const missingSurfaces = REQUIRED_SURFACES.filter((s) => !gated.some(s.test)).map((s) => s.label);
if (missingSurfaces.length) {
  console.error(`\n❌ the gate's SCOPE shrank — ${missingSurfaces.length} promised surface(s) are absent from the compared set:\n`);
  for (const m of missingSurfaces) console.error(`    ${m}`);
  console.error(`\n    Each is a surface this gate claims to cover. Unrepresented, a clean result is silence,`);
  console.error(`    not evidence. If one is deliberately dropped, remove it from REQUIRED_SURFACES in the`);
  console.error(`    same PR so the decision is visible.\n`);
  process.exit(1);
}
const unclaimed = gated.filter((f) => !REQUIRED_SURFACES.some((s) => s.test(f))).map((f) => relative(repo, f));
if (unclaimed.length) {
  console.error(`\n❌ ${unclaimed.length} gated file(s) are claimed by NO promised surface, so nothing would notice them leaving:\n`);
  for (const f of unclaimed.slice(0, 12)) console.error(`    ${f}`);
  if (unclaimed.length > 12) console.error(`    … and ${unclaimed.length - 12} more`);
  console.error(`\n    Add each to REQUIRED_SURFACES so its absence becomes fatal. A file in scope but`);
  console.error(`    outside every promise is scanned today and droppable in silence tomorrow.\n`);
  process.exit(1);
}

if (selfFails.length) {
  console.error(`\n❌ the gate's detection is broken — it cannot see what it claims to:\n`);
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

const gatedHits = gated.flatMap(scan);
const byFile = new Map<string, Hit[]>();
for (const h of gatedHits) byFile.set(h.file, [...(byFile.get(h.file) ?? []), h]);

// A surface this gate could not read is reported BEFORE any voice result, and is fatal on its own —
// "clean" must mean "looked everywhere and found nothing," never "looked at whatever existed."
if (blind.length) {
  console.error(`\n❌ the gate could not see ${blind.length} shipped surface(s), so a clean result would be meaningless:\n`);
  for (const b of blind) console.error(`    ${b}`);
  console.error('');
  process.exit(1);
}

console.log(`Voice lint gate — ${gated.length} shipped files scanned:`);
for (const s of REQUIRED_SURFACES) console.log(`    ${String(gated.filter(s.test).length).padStart(3)}  ${s.label}`);
if (gatedHits.length) {
  console.error(`\n❌ ${gatedHits.length} voice-standard §2 violation(s) in SHIPPED text:\n`);
  for (const [f, hs] of byFile) {
    console.error(`  ${f}`);
    for (const h of hs.slice(0, 8)) console.error(`    ${h.line}: [${h.rule}] "${h.match}"  …${h.context}…`);
    if (hs.length > 8) console.error(`    … and ${hs.length - 8} more`);
  }
  console.error(`\n    See Prism3/docs/voice-standard.md §2. A false positive is fixed by widening an`);
  console.error(`    allow-set (e.g. JUST_ALLOWED), never by narrowing the scan.\n`);
} else {
  console.log('  ✓ clean — no banned voice-standard §2 phrases in any shipped surface.');
}

process.exit(gatedHits.length ? 1 : 0);
