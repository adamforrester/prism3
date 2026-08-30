/**
 * PROSE RULES (#1117) — the two shipped prose rule sets, in one module so a check at a SCOPE CROSSING
 * applies the identical rule the destination gate applies.
 *
 * ── WHY THIS FILE EXISTS, AND WHY IT IS NOT A DRY CLEANUP ───────────────────────────────────────
 *
 * `lint-us-english.ts` and `lint-voice.ts` answer *"is this FILE in scope?"* Text does not respect
 * that boundary: a mechanical copy moves it out of an unscanned file into a scanned one. #1117
 * measured the instance — `lint-shape-index.ts --accept` copies `### N. Title` headings out of
 * `docs/34-gate-independence.md`, which NEITHER prose gate scans, verbatim into
 * `schema/shape-index.json`, which BOTH hand-name. So an en-GB spelling in a `docs/34` heading is
 * invisible until the copy, then fails against a file whose author did not write the words.
 *
 * The fix is to check at the crossing (#1117 option 2). That needs the rule at two call sites, and
 * **a second copy of the rule is the one thing that must not happen**: a boundary check that ACCEPTS
 * what the destination REJECTS is worse than no boundary check, because it stamps approval on text
 * that will fail later against the wrong file. The two cannot drift if they are the same function, so
 * the rule lives here and both the gate and the boundary import it.
 *
 * **This is not the DRY trap `docs/34` warns about**, and the distinction is worth stating because
 * the shape looks similar. Shape 2 is a gate and its ORACLE sharing a derivation. Here the oracle is
 * the RULE (US English; `docs/voice-standard.md` §2) and the subject is a file's TEXT — moving the
 * rule into its own module changes neither side and collapses nothing. What WOULD collapse the gates
 * is a self-check that reimplements the match, which is exactly the #387/#511 defect both functions'
 * comments below record, and which this move preserves: each gate's `scan()` and its `SELF_CHECK`
 * both call the function exported here, so neutering a rule fails that gate's self-check.
 *
 * Verified by mutation rather than asserted: with `STEMS` removed from `enGb`'s loop the US-English
 * gate's own self-check fails by name, and with `EXCLAIM` removed from `voiceHits` the voice gate's
 * does. Neither goes quietly green.
 *
 * ── WHAT DID NOT MOVE ──────────────────────────────────────────────────────────────────────────
 *
 * `stripBlockComments` / `stripLineComments` stay in `lint-voice.ts`. They are not rules — they are
 * that gate's decision about which TEXT in a built bundle counts as shipped prose, and the boundary
 * check has no bundle and no comments. Scope lists, `REQUIRED_SURFACES`, `blind[]` and both
 * self-checks stay with their gates for the same reason: this module holds the rule, never the reach.
 *
 * PURE — no I/O, no imports.
 */

// ══ US ENGLISH ══════════════════════════════════════════════════════════════════════════════════

// The pattern, not a word list. `[A-Za-z]{3,}` keeps `is`/`our` themselves out.
//
// The trailing `s?` is load-bearing and was missing until #464. `our\b` matches `colour` but NOT
// `colours`, so every en-GB PLURAL — `colours`, `behaviours`, `flavours` — walked through a gate
// whose whole job was to stop them, and `ation\b` had the same hole for `generalisations`. It went
// unnoticed because the self-check below only ever sampled the singular, which is the more general
// trap: **a self-check written from the same mental model as the scan inherits its blind spot.** The
// plural case is now sampled too. Found by mutating a file into failure and watching the gate stay
// green — the reason to test a gate by breaking something rather than by reading it.
const PATTERN = /\b[A-Za-z]{3,}(?:is(?:e|ed|es|ing|ation)|our)s?\b/g;
// ...and a second scan, because ONE shape cannot cover both and the pattern alone was under-counting
// in the opposite direction from the word list it replaced.
//
// CLAUDE.md states three rules: `color` not `colour`, `gray` not `grey`, `-ize` not `-ise`. Two of
// them fall out of PATTERN — `colour`/`behaviour` end in `-our`, `-ise` is explicit. **`grey` ends in
// neither**, so PATTERN was structurally blind to a third of the standard it claimed to enforce, and
// nothing said so. `greyscale` sat in the published `theme-schema.json` contract through 90-file
// scans (#313 — the very conversion that issue was tracking).
//
// The lesson the arc had half-learned: the fix for "a word list misses `generalised`" is pattern
// PLUS list, not pattern INSTEAD OF list. Substring-matched so compounds are caught too
// (`greyscale`, `greys`, `grey-500`). A false positive here is still fixed by adding to NOT_EN_GB,
// never by narrowing either scan.
const STEMS = /\b[A-Za-z]*grey[A-Za-z]*\b/gi;
// Ordinary English that merely ENDS in those letters. Subtracting these is what makes a pattern scan
// usable; adding to this list is the correct fix for a false positive, never narrowing the pattern.
const NOT_EN_GB = new Set([
  'surprise', 'surprises', 'surprised', 'surprising', 'wise', 'otherwise', 'likewise', 'rise', 'rises',
  'arise', 'arises', 'arising', 'promise', 'promises', 'promised', 'promising', 'precise', 'concise',
  'exercise', 'exercises', 'exercised', 'exercising', 'premise', 'premises', 'compromise', 'compromises',
  'revise', 'revised', 'revises', 'devise', 'devised', 'devises', 'supervise', 'enterprise', 'expertise',
  'noise', 'raise', 'raises', 'raised', 'advertise', 'advertised', 'advertises', 'praise', 'praised',
  'cruise', 'paradise', 'franchise', 'merchandise', 'poise', 'poised', 'guise', 'disguise', 'excise',
  'incise', 'anise', 'demise', 'chastise', 'baptise',
  'your', 'yours', 'our', 'ours', 'four', 'hour', 'hours', 'pour', 'pours', 'tour', 'tours', 'detour',
  'source', 'sources', 'sourced', 'sourcing', 'resource', 'resources', 'outsource', 'flour', 'devour',
  'contour', 'contours', 'velour', 'dour', 'scour', 'sour',
]);
// The ONE place either regex is applied. `scan()` (real files) and SELF_CHECK (samples) both drive
// this, and that sharing is load-bearing — the exact opposite of the DRY trap, because here the two
// callers are the gate's *subject* and its *fixture*, not a gate and the thing it checks.
//
// It used to be duplicated: SELF_CHECK evaluated its own inline `[PATTERN, STEMS].some(...)`, so it
// validated a reimplementation rather than the shipping code path (#387; the #511 shape, found by
// mutation in the same file that already documents #511's lesson). Measured: with `STEMS` removed
// from the loop below and a real `A greyscale mode.` added to the gated engine README, every
// detection sample still passed and the gate printed `✓ clean` at exit 0. A self-check gates whatever
// it calls — so it has to call the thing that runs.
export const enGb = (txt: string): { word: string; index: number }[] => {
  const found: { word: string; index: number }[] = [];
  for (const re of [PATTERN, STEMS]) {
    for (const m of txt.matchAll(re)) {
      if (NOT_EN_GB.has(m[0].toLowerCase())) continue;
      found.push({ word: m[0], index: m.index ?? 0 });
    }
  }
  return found;
};
// ══ VOICE (docs/voice-standard.md §2) ════════════════════════════════════════════════════════════

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

export type RawHit = { rule: string; match: string; index: number };

// The ONE place every rule is applied. SELF_CHECK and scan() both drive this, so neutering a rule
// fails the self-check rather than only going quiet in production — the lesson lint-us-english.ts's
// `enGb` comment documents (#387/#511): a self-check that reimplements the match validates the
// reimplementation, not the code path that ships.
export const voiceHits = (txt: string): RawHit[] => {
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