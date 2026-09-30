/**
 * Voice-standard gate for SHIPPED text (#617).
 *
 * `docs/voice-standard.md` §2 bans a short list of phrases on every surface it names —
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
 * `docs/00-progress.md` for the fuller tradeoff note.
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
 *  3. "!" IS SCOPED BY CONTEXT, NOT BY WORD. `apps/studio/dist/main.js` is a bundle containing real code
 *     (`!==`, `!=`) and inlined CSS (`!important`) alongside real prose — the exact reason that file
 *     is in scope at all (trap 2 in lint-us-english.ts: `levers.ts` prose is inlined there and a
 *     source-only scan would miss it, so the built bundle has to be opened directly). A prose "!" is
 *     the end of a WORD with nothing continuing it; `EXCLAIM` requires the character directly before
 *     "!" to be a letter or digit (so a boolean negation like ` !r` or `(!m`, preceded by a space or
 *     paren, never matches — and neither does a bare glyph string like `"!"` used as a fail-marker
 *     icon, e.g. `el("b","sg-fx","!")`, where the character before "!" is the string's own opening
 *     quote, not a word character) and the character after to be neither "=" (excludes `!=`/`!==`)
 *     nor a letter (excludes `!important`/`!default`/`!DOCTYPE`). Checked directly against the real
 *     bundle before landing this pattern: `apps/studio/dist/main.js` carries 130 `!==`, 5 `!important`, and 4
 *     bare `"!"` icon-glyph occurrences today, none of which this pattern flags (verified by the
 *     SELF_CHECK samples below, drawn from the real bundle's own text).
 *  4. CODE COMMENTS ARE EXEMPT, AND THIS GATE ACTUALLY IMPLEMENTS THAT — DELIBERATELY UNLIKE
 *     lint-us-english.ts. voice-standard.md §2 states the exemption explicitly; lint-us-english.ts's
 *     own header records that it RETIRED the equivalent exemption for `apps/studio/src` in #464, because
 *     which comments a bundler keeps is an implementation detail the gate cannot see and therefore
 *     cannot rely on. That reasoning does not transfer here, because the two rule sets have opposite
 *     false-positive profiles in comments: an en-GB spelling in a comment is rare and trivial to
 *     avoid, but this repo's own comment style — as read throughout this very file and its sibling
 *     gates — uses "just"/"simply" constantly as ordinary connective prose. A structural exemption is
 *     what makes this gate usable at all, not a convenience.
 *
 *     **THIS PARAGRAPH USED TO CLAIM esbuild STRIPS SOURCE COMMENTS, AND THAT WAS WRONG (#804).** It
 *     read: *"real TypeScript `//` and `/* *\/` comments never reach `apps/studio/dist/main.js` in the
 *     first place — esbuild strips them (confirmed by grepping the built bundle for known
 *     source-comment text and finding none)"*. Measured: `apps/studio/dist/main.js` carries **300**
 *     whole-line `//` source comments today, including this repo's own `// Citation deliberately
 *     TRUNCATED rather than reworded`. The grep that "confirmed" it must have probed text that had
 *     since changed, and nothing re-ran it — the `dist/` bundle is the `build` script's output, which
 *     is NOT minified (`build:site` is the one that minifies, and it writes somewhere this gate does
 *     not read). So the exemption below was resting on a property the shipped surface never had.
 *
 *     It only ever went unnoticed because a `//` comment reaching this scan had to carry a §2 word,
 *     and for 299 of the 300 none did. #804 imported `anatomy-figma.ts` into the studio and the 300th
 *     arrived — a `//` line inside `PAYLOAD_PREAMBLE`, a template literal, which `stripPayloadComments`
 *     removes before any payload reaches Figma. A comment that ships nowhere, flagged as shipped prose.
 *
 *     Both halves are now handled: `stripLineComments` blanks whole-line `//` comments in `.js`
 *     bundles, and the SELF_CHECK below pins the two boundaries that make it safe rather than greedy —
 *     a mid-line `//` (a URL, a trailing guard comment) is left alone, because deleting a line that is
 *     *simply gone* is the exact failure `stripPayloadComments`'s own header records against a
 *     greedier `!l.includes('//')` pass.
 *
 *     The other surviving-comment case is unchanged: C-style block comments carried as
 *     literal STRING CONTENT — the studio chrome stylesheet, whose ~1,460 lines of CSS comments ship
 *     into `apps/studio/dist/main.js` verbatim because esbuild does not parse the inside of a string.
 *     **#769 moved that stylesheet out of a template literal in `apps/studio/src/main.ts` into a real
 *     `apps/studio/src/styles.css`, and the carve-out still applies unchanged — which is the point of
 *     saying so here.** The CSS is imported through esbuild's `text` loader rather than emitted as a
 *     separate asset (the plugin iframe ships `allowedDomains:["none"]` and cannot fetch a second
 *     file), so those comments still arrive in the `.js` bundle as string content, still unparsed,
 *     still the only surviving comments in it. What changed is where the bytes are AUTHORED, not
 *     where they SHIP — and this gate reads what ships. Had the CSS become a separate
 *     `dist/main.css` instead, this paragraph would be describing a stylesheet that no longer
 *     reaches the scanned surface at all, and the scope line below would have had to grow a `.css`
 *     entry to keep that prose gated. So the exemption still has exactly one job: blank out
 *     `/* ... *\/` spans in `.js` bundle files before any
 *     rule runs, preserving length and newlines so line numbers on a REAL hit stay accurate. JSON and
 *     Markdown surfaces get no such stripping — they carry no code-comment convention to exempt, and
 *     blanking arbitrary substrings there would be pure risk (a `/* *\/`-shaped span inside real prose
 *     is not impossible) for no benefit.
 *
 * SCOPE — imported from `regen.ts`: `out/**`, the emitted `schema/`+report artifacts,
 * `apps/studio/dist/*.js` (the BUILT bundle — same trap 2 reasoning), the schema contract, the engine
 * README, and shipped skills. **NO LONGER IDENTICAL to `lint-us-english.ts`, which is a defect and not
 * a decision:** #937 added `apps/plugin/dist` (main.js + ui.html) there and deliberately did not widen
 * this gate in the same PR. Measured with the surface temporarily added here: **3 §2 violations in
 * `apps/plugin/dist/main.js`**, all "simply", all in string literals rather than comments, with
 * `ui.html` not yet measured. Filed as #948; until it lands, this sentence is the only place
 * recording that the two sets diverge, because nothing asserts they agree — the both-gates rule
 * `lint-schema-classification.ts` enforces covers `schema/` files only, and neither bundle is one. A new emitted artifact is covered automatically
 * because both gates read the same `ENGINE_ARTIFACTS`/`SCHEMA_ARTIFACTS` exports; nobody has to
 * remember to add it here separately.
 *
 *
 * ── SCOPE IS PER-FILE; TEXT IS NOT (#1117) — WHY A FAILURE HERE MAY NOT BE THIS FILE'S FAULT ────
 *
 * This gate answers *"is this FILE in scope?"* Text does not respect that boundary: a mechanical copy
 * can move it out of an unscanned file into a scanned one. When it does, the failure lands on the
 * DESTINATION — a file that faithfully copied what it was given — and the fix belongs at the source.
 * So before editing the file this gate names, ask whether its text was written there.
 *
 * **ONE CROSSING IS KNOWN, DECLARED AND CLOSED, AND YOU CAN RE-DERIVE ALL THREE FACTS.** Do not take
 * this paragraph's word for it — every claim below is a command whose output decides it:
 *
 *   1. `schema/shape-index.json` is in this gate's scope, and NO `docs/` file is. `--files` prints the
 *      set this gate actually walks, so the answer comes from the gate and not from this comment.
 *      Check the denominator first — a `grep -c` of 0 over an empty list is not evidence:
 *        npx tsx packages/engine/lint-us-english.ts --files | wc -l                    # -> 122
 *        npx tsx packages/engine/lint-us-english.ts --files | grep -c 'shape-index'    # -> 1
 *        npx tsx packages/engine/lint-us-english.ts --files | grep -c '^docs/'         # -> 0
 *        npx tsx packages/engine/lint-voice.ts      --files | grep -c '^docs/'         # -> 0
 *   2. `lint-shape-index.ts --accept` copies docs/34 headings into that file verbatim:
 *        grep -n 'baseline.shapes = ' packages/engine/lint-shape-index.ts
 *   3. The crossing is CHECKED AT THE SOURCE, by ARM C of that gate, using the rule this file uses —
 *      imported from `prose-rules.ts`, never a second copy. Confirm it can fail, by name:
 *        put an en-GB spelling in a docs/34 `### N. Title` heading, then
 *        npx tsx packages/engine/lint-shape-index.ts       # must fail naming docs/34, not the JSON
 *
 * If (3) ever stops failing, this gate is once again the only thing standing between a docs/34
 * heading and a confusing failure in a file nobody wrote. A second crossing found later belongs in
 * this list with the same three commands, or it is not declared — it is remembered.
 *
 *
 * ── THE PAYLOAD CHANNEL, AND THE ONE PLACE A `MUST` MAY SHIP (#1623 AI/C-1) ─────────────────────
 *
 * voice-standard §4 permits RFC 2119 levels in the payload-agents channel and in no other, and a `MUST`
 * there only on a check the reading agent can run against a file it already has. The owner classified
 * `out/<brand>.ai.json` as that channel and moved its `MUST` onto the contrast contract. So this gate
 * carries a sixth rule, `normative`, and exactly one carve-out from it:
 *
 *   - `normative` flags `MUST` / `SHALL` / `SHOULD` (and their `NOT` forms) on EVERY gated surface.
 *   - `PAYLOAD_CHANNEL` removes from an `.ai.json` the `requirement` of a `contrast_with` entry — and
 *     only when that sentence is the check its OWN entry defines: this file's pattern, matched against
 *     the entry's `min` / `token` / `composited_over` (never against the generator's function). A `MUST`
 *     anywhere else in the file, or a requirement naming a different token or floor, is still a hit.
 *
 * The channel is fail-closed and self-checked like the scope: a sidecar that does not parse is `blind`,
 * and a run in which the carve-out removed nothing fails — a carve-out that matches nothing is either a
 * dead rule or a renamed field, and both would read as a pass.
 *
 * ── CLIENT NAMES (#1824) — A SEVENTH RULE, WITH A SCOPE OF ITS OWN ────────────────────────────────
 *
 * The repo is public, and some example briefs are real brands' briefs. Personality trait notes quoted
 * those briefs by name, and `resolveVocabulary` copied each quote into `theme.notes` — so a customer's
 * workspace would have shown another brand's name. The rule is a fixed list (`CLIENT_NAMES`), built from
 * the brands in `reference/` and the example briefs, and kept minimal: it is the one place those names are
 * written on purpose.
 *
 * ITS SCOPE IS NOT THE VOICE RULES' SCOPE, on purpose, and the difference is the part to read:
 *
 *   - IN: the three bundle files that inline the engine — `apps/studio/dist/main.js`,
 *     `apps/plugin/dist/main.js` and `apps/plugin/dist/ui.html` — scanned RAW. The voice rules exempt
 *     comments (point 4); this rule cannot, because some comments DO reach the unminified bundle. Not all
 *     of them, and not "exactly as a string": measured on this PR's build, esbuild drops top-level and
 *     function-body comments (a file header, `// ---- 1. named stops` inside `resolveVocabulary`) and keeps
 *     the ones inside an expression — an object or array literal, a call's arguments (the comments beside
 *     the TRAITS entries, a component def's fields). A comment's position decides whether it ships, so the
 *     scan reads the bundle raw rather than guessing. The plugin files are in scope here although #948
 *     still keeps them out of the voice rules; that is why `verify.ts` now runs this gate after BOTH builds.
 *   - IN: every personality note as the engine RENDERS it, one `brandTheme` call per trait in the
 *     schema's enum. No committed brand sets `personality`, so `out/**` never shows a trait note; reading
 *     the emitted corpus for them would be a scan of a surface that cannot hold the defect.
 *   - OUT: `out/**`, `schema/**`, the README and the skills. The emitted corpus includes example brands
 *     that ARE those clients, by id, file name and measured fixture, so this rule over it would fail on
 *     the corpus itself. Whether a public repo should carry those brands is the owner's call, not this
 *     gate's: filed as #1853, and this bullet is where the scope says so rather than implies it.
 *   - OUT: the studio site's source map (`dist/main.js.map`; `build-site.mjs` builds it with
 *     `sourcemap: true` and publishes it). Its `sourcesContent` is the engine's source, every comment
 *     included, so it names the corpus brands wherever the source does. That source is already public in
 *     this repository, so the map exposes nothing new; scrubbing every comment in the engine is #1853's
 *     question, not this arm's. Named here so a reader does not mistake the map's absence for an oversight.
 *
 * Represented, not merely present: each bundle must be readable AND carry the resolver's refusal message
 * (proof the trait vocabulary is inside what was read), and every enum trait must render exactly one note;
 * anything else is `blind`, fatal before a verdict. Self-checked like the other rules: one positive sample
 * per name, including the bundle's escaped apostrophe, and two converse samples (the ordinary phrase "a new
 * balance", and look-alike words) that must not trip.
 *
 * Run: `npx tsx packages/engine/lint-voice.ts`  (exit 1 = a gated surface carries banned voice-standard
 * §2 copy, or an RFC 2119 level outside the payload channel, or a bundle or rendered note names a client)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENGINE_ARTIFACTS, SCHEMA_ARTIFACTS } from './regen';
import { brandTheme } from './theme';

// ---- the RULES, imported (#1117) -------------------------------------------------------------
// The five §2 rules and `voiceHits` moved to `prose-rules.ts`, so a check at a SCOPE CROSSING applies
// the IDENTICAL function this gate applies — see that file's header for why a second copy of the rule
// is the one thing that must not exist. `stripBlockComments`/`stripLineComments` deliberately did NOT
// move: they are not rules, they are this gate's decision about which text in a BUILT BUNDLE counts as
// shipped prose. The #387/#511 property is unchanged — `scan()` and `SELF_CHECK` both drive the
// imported `voiceHits`.
import { voiceHits } from './prose-rules.ts';
import type { RawHit } from './prose-rules.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');



// ---- Code-comment exemption for the built bundle — see header point 4. Blanks `/* ... */` spans
// (character-for-character, keeping every newline) so a CSS-in-template-literal comment's content
// never reaches any rule above, while line numbers on a real hit elsewhere in the same file stay
// accurate. Applied ONLY to `.js` bundle files in `scan()` below — see header point 4 for why JSON
// and Markdown surfaces get no such stripping.
const stripBlockComments = (txt: string): string => txt.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// ---- The `//` half of the same exemption (#804 — see header point 4 for why this was missing and what
// it cost). WHOLE-LINE ONLY: the line's first non-space characters must be `//`. A mid-line `//` is left
// untouched on purpose, and the reason is `stripPayloadComments`'s own header two files over — a greedier
// `l.includes('//')` pass eats `if(!id)continue; // ...`, a real guard, and every downstream assertion
// stays green because output sampling cannot see a line that is no longer there. Here the equivalent
// greed would blank the prose half of `const msg = "Applied!"; // note`, hiding a real violation. Blanks
// character-for-character like its sibling so line numbers on a later real hit stay accurate; the leading
// whitespace is preserved for the same reason.
const stripLineComments = (txt: string): string =>
  txt.replace(/^([ \t]*)\/\/[^\n]*/gm, (m, indent: string) => indent + ' '.repeat(m.length - indent.length));


type Hit = { file: string; line: number; rule: string; match: string; context: string };

// ---- The `normative` rule (#1623 AI/C-1) — see the header's payload-channel section. Upper case only:
// the lower-case words are ordinary English, and an RFC 2119 level is the capitalized keyword.
const NORMATIVE = /\b(?:MUST|SHALL|SHOULD)(?: NOT)?\b/g;
const normativeHits = (txt: string): RawHit[] => [...txt.matchAll(NORMATIVE)].map((m) => ({ rule: 'normative', match: m[0], index: m.index! }));

// ---- The payload channel's one carve-out. A requirement is exempt only as the sentence its own entry
// defines; the patterns are this gate's, written independently of `ai-metadata.ts`.
const REQ_PLAIN = /^MUST clear (\d+(?:\.\d+)?:1) against `([^`]+)` in every mode\.$/;
const REQ_COMPOSITE = /^MUST keep `([^`]+)` at (\d+(?:\.\d+)?:1) or more on `([^`]+)` composited over `([^`]+)`, in every mode\.$/;
const isPayloadSidecar = (abs: string) => /\/packages\/engine\/out\/[^/]+\.ai\.json$/.test(abs);
let channelExempted = 0, channelFiles = 0;
/** The sidecar text with every valid contract requirement blanked, re-serialized the way the emitter
 *  writes it (2-space JSON), so line numbers on a remaining hit still point at the committed file. */
const carvePayload = (raw: string): { text: string; exempted: number } => {
  const doc = JSON.parse(raw);
  let exempted = 0;
  for (const [role, e] of Object.entries<any>(doc.color ?? {})) for (const cw of e?.contrast_with ?? []) {
    const r = String(cw?.requirement ?? '');
    const m = cw?.composited_over ? r.match(REQ_COMPOSITE) : r.match(REQ_PLAIN);
    const own = m && (cw.composited_over
      ? m[1] === cw.token && m[2] === cw.min && m[3] === role && m[4] === cw.composited_over
      : m[1] === cw.min && m[2] === cw.token);
    if (own) { cw.requirement = ''; exempted++; }
  }
  return { text: JSON.stringify(doc, null, 2) + '\n', exempted };
};

// Every way this gate can fail to LOOK, as opposed to look and find nothing — same discipline as
// lint-us-english.ts's `blind[]`. A non-empty list is fatal below, before any voice result prints.
const blind: string[] = [];



const scan = (abs: string): Hit[] => {
  let raw: string;
  // Fails CLOSED, same as lint-us-english.ts: an unreadable file must not count as a clean one.
  try { raw = readFileSync(abs, 'utf8'); } catch (e) {
    blind.push(`${relative(repo, abs)} — could not be read (${(e as Error).message})`);
    return [];
  }
  // Code comments are exempt (header point 4). The built bundle is the only surface stripped, and it
  // carries BOTH shapes: `/* ... */` spans (a CSS-in-template-literal stylesheet) and 300 whole-line
  // `//` source comments — esbuild does not strip the latter, contrary to what this gate assumed until
  // #804. Block spans go first: a `//` inside a block comment is part of that comment, not a line
  // comment, and blanking the span makes the line-pass a no-op over it either way.
  const txt = abs.endsWith('.js') ? stripLineComments(stripBlockComments(raw)) : raw;
  // The normative rule reads the same text, except that a payload sidecar first loses its valid contract
  // requirements (header: the payload channel). An unparseable sidecar is a surface this gate cannot see.
  let normText = txt;
  if (isPayloadSidecar(abs)) {
    try { const c = carvePayload(raw); normText = c.text; channelExempted += c.exempted; channelFiles++; } catch (e) {
      blind.push(`${relative(repo, abs)} — payload sidecar did not parse (${(e as Error).message})`);
      return [];
    }
  }
  return [...voiceHits(txt).map((h) => ({ ...h, src: txt })), ...normativeHits(normText).map((h) => ({ ...h, src: normText }))].map(({ rule, match, index, src }) => ({
    file: relative(repo, abs),
    line: src.slice(0, index).split('\n').length,
    rule,
    match,
    context: src.slice(Math.max(0, index - 55), index + 45).replace(/\s+/g, ' '),
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
  ...walkRequired(join(repo, 'packages/engine/out'), 'no emitted artifacts found — run `npx tsx packages/engine/regen.ts`'),
  ...SCHEMA_ARTIFACTS.map((f) => join(repo, 'packages/engine/schema', f)),
  ...ENGINE_ARTIFACTS.map((f) => join(repo, 'packages/engine', f)),
  // trap 2 (lint-us-english.ts): what actually ships. REQUIRED — see walkRequired. `build`, not
  // `build:site`, which writes apps/studio/public/dist instead.
  ...walkRequired(join(repo, 'apps/studio/dist'), 'the web bundle is not built — run `npm run -w @prism3/studio build` (NOT build:site, which writes apps/studio/public/dist)')
    .filter((f) => f.endsWith('.js')),
  join(repo, 'packages/engine/schema/theme-schema.json'),
  join(repo, 'packages/engine/README.md'),
  // The token-name baseline — deliberately not a `regen` artifact (see CLAUDE.md principle 5), so
  // named by hand here exactly as lint-us-english.ts names it.
  join(repo, 'packages/engine/schema/token-contract.json'),
  // The paint census (#758) — the second baseline kept out of `regen`, named by hand for the same reason.
  join(repo, 'packages/engine/schema/paint-census.json'),
  // The docs/34 shape-index baseline (#786) — the third, same reason. Its shape titles are quoted
  // verbatim in that gate's failure messages, so they are contributor-facing prose.
  join(repo, 'packages/engine/schema/shape-index.json'),
  // The decisions-index baseline (#886) — the fourth, same reason. Its decision titles are quoted
  // verbatim in that gate's failure messages, so they are contributor-facing prose the same way a
  // shape title is.
  join(repo, 'packages/engine/schema/decisions-index.json'),
  // The payload manifest (#674) and the NB measurement fixture (#807) — authored, out of regen, and
  // prose-carrying: a `why` per rule and a `$comment` in the first, `$source` lines and a
  // `brand.voice` in the second. Named here exactly as lint-us-english.ts names them, and
  // `lint-schema-classification.ts` now asserts that both gates name the same set, so one of them
  // going short is a failure rather than a silence.
  join(repo, 'packages/engine/schema/payload-manifest.json'),
  join(repo, 'packages/engine/schema/nb-measured.json'),
  // The component-surface baseline (#1252) — the fifth kept out of `regen`, same reason. Its `note`
  // is instruction a contributor follows after a failure, which is the register this standard is
  // strictest about. Named here exactly as lint-us-english.ts names it.
  join(repo, 'packages/engine/schema/component-surface.json'),
  // The agent-metadata JSON Schema (#1623 sign-off) — authored, kept out of `regen`, and every field in
  // it carries a `description` an agent reads to learn the sidecar, so it is shipped prose.
  join(repo, 'packages/engine/schema/ai-metadata.schema.json'),
  // The component-docs JSON Schema (#1701) — authored, kept out of `regen` for the same reason, and every
  // field in it carries a `description` an agent reads to learn `out/components/components.ai.json`.
  join(repo, 'packages/engine/schema/component-docs.schema.json'),
  // Shipped skills — prose an agent reads and follows, named by hand for the same reason.
  ...walk(join(repo, 'skills')).filter((f) => f.endsWith('.md')),
];

// ---- SELF-CHECK: does the scanner still detect what it claims to? ----
// One true-positive sample per rule, the stated "just" exception, and three code-context samples
// pulled from patterns that actually occur in apps/studio/dist/main.js today — so this doubles as the
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
  { sample: 'animation:none!important;left:0', expectRule: null },            // inlined CSS from apps/studio/dist, not prose
  { sample: '<!doctype html><html lang="en">', expectRule: null },            // markup, not prose
  { sample: 'el("b", "sg-fx", "!")', expectRule: null },                      // bare "!" icon glyph, real pattern from apps/studio/dist
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

// ---- Fourth self-check: the `//` half of the exemption (#804). Same forward+converse discipline as the
// block-comment pass above, plus the one property that makes it SAFE rather than greedy — a mid-line
// `//` must be left alone, so a violation in the code half of such a line is still caught. Without that
// converse this pass would be the `!l.includes('//')` mistake `stripPayloadComments` documents, and it
// would report as a pass.
const LINE_SAMPLE = [
  '  // Obviously this is simply a source comment and should not trip anything.',
  'const a = b !== c;',
  'const msg = "Sorry, that failed."; // a trailing comment on a real line',
  'const url = "https://example.com/just/a/path";',
].join('\n');
{
  const stripped = stripLineComments(stripBlockComments(LINE_SAMPLE));
  const hits = voiceHits(stripped);
  if (hits.some((h) => h.rule === 'banned-word')) {
    selfFails.push('stripLineComments left a banned word inside a whole-line // comment reachable');
  }
  // The converse: line 3's `Sorry` sits BEFORE its `//`, so a whole-line rule must not reach it.
  if (!hits.some((h) => h.rule === 'apology')) {
    selfFails.push('stripLineComments over-stripped — it ate a real violation on a line whose // starts mid-line');
  }
  if (stripped.split('\n').length !== LINE_SAMPLE.split('\n').length) {
    selfFails.push('stripLineComments changed the line count — line numbers on later hits would be wrong');
  }
  // A URL's `//` is mid-line, so the line survives; `just` inside a path is a real "just" by this
  // gate's rules and SHOULD be flagged. Pinned so a future widening to mid-line `//` fails here.
  if (!hits.some((h) => h.rule === 'just')) {
    selfFails.push('stripLineComments blanked a line whose only // was inside a URL — mid-line // must be left alone');
  }
}

// ---- Fifth self-check: the `normative` rule and the payload channel (#1623 AI/C-1). Forward (a MUST
// outside the channel is caught; so is a MUST inside a sidecar that is not its entry's own check) and
// converse (the entry's own requirement is not). Drives the same `carvePayload` + `normativeHits` scan does.
{
  const cases: { sample: string; want: boolean }[] = [
    { sample: 'links MUST be underlined so they are not signaled by color alone', want: true },
    { sample: 'the level SHOULD NOT be read as a promise', want: true },
    { sample: 'links must be underlined; MUSTARD is a color', want: false },
  ];
  for (const { sample, want } of cases) if ((normativeHits(sample).length > 0) !== want) selfFails.push(`normative: "${sample}" should${want ? '' : ' NOT'} be flagged`);
  const sidecar = (cw: object, extra: object = {}) => JSON.stringify({ color: { 'text.primary': { avoid_when: 'Do not use on fills.', contrast_with: [cw], ...extra } } });
  const own = { token: 'background.secondary', min: '7:1', requirement: 'MUST clear 7:1 against `background.secondary` in every mode.' };
  const comp = { token: 'text.primary', min: '4.5:1', composited_over: 'background.primary', requirement: 'MUST keep `text.primary` at 4.5:1 or more on `text.primary` composited over `background.primary`, in every mode.' };
  const channel: { name: string; raw: string; want: number }[] = [
    { name: 'its own requirement', raw: sidecar(own), want: 0 },
    { name: 'its own composite requirement', raw: sidecar(comp), want: 0 },
    { name: 'a requirement naming another token', raw: sidecar({ ...own, token: 'background.primary' }), want: 1 },
    { name: 'a requirement stating another floor', raw: sidecar({ ...own, min: '4.5:1' }), want: 1 },
    { name: 'a MUST on a usage sentence', raw: sidecar(own, { avoid_when: 'MUST not be used on fills.' }), want: 1 },
  ];
  for (const { name, raw, want } of channel) {
    const n = normativeHits(carvePayload(raw).text).length;
    if (n !== want) selfFails.push(`payload channel: ${name} gave ${n} normative hit(s), expected ${want}`);
  }
}

// ---- Second self-check, on SCOPE rather than detection — same forward+converse pair as
// lint-us-english.ts, and for the same reason: the detection self-check above proves the scanner can
// still see "simply", not that the file containing it was ever opened.
const REQUIRED_SURFACES: { label: string; test: (f: string) => boolean }[] = [
  { label: 'the built web bundle (apps/studio/dist/*.js)', test: (f) => f.includes('/apps/studio/dist/') && f.endsWith('.js') },
  { label: 'emitted artifacts (packages/engine/out)', test: (f) => f.includes('/packages/engine/out/') },
  { label: 'the schema contract (packages/engine/schema)', test: (f) => f.includes('/packages/engine/schema/') },
  // Anchored at the repo root, not a bare `/skills/` substring — see the note in lint-us-english.ts.
  { label: 'shipped skills (skills/**/SKILL.md)', test: (f) => f.startsWith(`${repo}/skills/`) },
  { label: 'the emitted reports (ENGINE_ARTIFACTS)', test: (f) => ENGINE_ARTIFACTS.some((a) => f.endsWith(`/${a}`)) },
  { label: 'the engine README', test: (f) => f.endsWith('/packages/engine/README.md') },
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

// ---- CLIENT NAMES (#1824) — a rule of its own, over a scope of its own ------------------------------
// See the header section of the same name. The list is the gate's, kept minimal, and the one place a
// client name is written on purpose: every other line of this repo that names one is a finding for this
// arm the moment it reaches a bundle. A pattern per name, each anchored at a word start so a longer word
// cannot hide it; `New Balance` is matched in its brand casing (or as a slug), because the lower-case
// phrase is ordinary English ("strike a new balance"), and a false positive is fixed by tightening the
// NAME'S PATTERN with a self-check sample, never by dropping a surface.
const CLIENT_NAMES: { name: string; re: RegExp }[] = [
  { name: 'wendy', re: /\bwendy/gi }, // wendys, Wendy's, and the bundle's escaped `Wendy\u2019s`
  { name: 'new balance', re: /\bNew[\s-]?Balance\b|\bNEW[\s-]?BALANCE\b|\bnew-?balance\b/g },
  { name: 'nb-redesign', re: /\bnb-redesign\b/gi },
];
const clientHits = (txt: string): RawHit[] =>
  CLIENT_NAMES.flatMap(({ name, re }) => [...txt.matchAll(re)].map((m) => ({ rule: `client-name:${name}`, match: m[0], index: m.index! })));
const CLIENT_SELF_CHECK: { sample: string; want: string | null }[] = [
  { sample: 'wendys', want: 'client-name:wendy' },
  { sample: 'the brand runs Wendy\\u2019s red', want: 'client-name:wendy' },
  { sample: '// New Balance', want: 'client-name:new balance' },
  { sample: 'reference/newbalance/tokens', want: 'client-name:new balance' },
  { sample: 'nb-redesign', want: 'client-name:nb-redesign' },
  { sample: 'the weights strike a new balance between the two', want: null },
  { sample: 'a snb-redesigned layout and a wendt font', want: null },
];
for (const { sample, want } of CLIENT_SELF_CHECK) {
  const hits = clientHits(sample);
  if (want === null ? hits.length > 0 : !hits.some((h) => h.rule === want)) {
    selfFails.push(`client names: "${sample}" should${want ? ` be flagged as '${want}'` : ' NOT be flagged'}`);
  }
}
if (selfFails.length) {
  console.error(`\n❌ the gate's detection is broken — it cannot see what it claims to:\n`);
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}
// The BUNDLES, named per file (#948's reasoning: a directory predicate stays satisfied by either file
// alone). RAW text — no comment stripping, unlike the voice rules: a comment inside an expression survives
// into an unminified bundle (header: CLIENT NAMES), and a client name there is a leak like one in a string.
// The source map is out of scope on purpose; the header says why.
const CLIENT_BUNDLES = ['apps/studio/dist/main.js', 'apps/plugin/dist/main.js', 'apps/plugin/dist/ui.html'];
// What proves a bundle is one that carries the personality vocabulary, so a clean scan of it means the
// trait notes were in what was read. The resolver's own refusal message: a string of the subject, and
// that is the point of a representation probe — if the vocabulary leaves a bundle, this fails loudly
// rather than scanning a bundle the issue no longer concerns and calling it clean.
const VOCABULARY_MARKER = 'unknown personality trait';

// ---- `--files`: the scanned set, printed (#1117) ----------------------------------------------
// The scope crossing noted in the header claims "no docs/ file is in this gate's scope". A grep over
// this source cannot check that claim — it matches the comment making it. This prints the set the
// gate actually walks, so the claim is decided by the gate rather than by prose about it:
//
//   npx tsx packages/engine/lint-voice.ts --files | grep -c '^docs/'    # must be 0
//
// Exits before any scanning, so it is cheap and cannot be confused with a verdict.
if (process.argv.includes('--files')) {
  for (const f of gated) console.log(relative(repo, f));
  // The client-name arm's bundles, where the voice rules do not already walk them.
  for (const b of CLIENT_BUNDLES) if (!gated.includes(join(repo, b))) console.log(b);
  process.exit(0);
}

const gatedHits = gated.flatMap(scan);

// ---- the CLIENT NAMES scan (#1824) ----
const clientFound: Hit[] = [];
const hitsIn = (label: string, txt: string): Hit[] => clientHits(txt).map(({ rule, match, index }) => ({
  file: label, line: txt.slice(0, index).split('\n').length, rule, match,
  context: txt.slice(Math.max(0, index - 55), index + 45).replace(/\s+/g, ' '),
}));
let clientBundlesRead = 0;
for (const b of CLIENT_BUNDLES) {
  let raw: string;
  try { raw = readFileSync(join(repo, b), 'utf8'); } catch (e) {
    blind.push(`${b} — could not be read for the client-name arm (${(e as Error).message}); build it: npm run -w ${b.startsWith('apps/plugin') ? '@prism3/plugin' : '@prism3/studio'} build`);
    continue;
  }
  if (!raw.includes(VOCABULARY_MARKER)) { blind.push(`${b} — carries no personality vocabulary ('${VOCABULARY_MARKER}' absent), so a clean client-name scan of it says nothing about the trait notes`); continue; }
  clientBundlesRead++;
  clientFound.push(...hitsIn(b, raw));
}
// The RENDERED notes: what `theme.notes` holds after a personality resolves, which the MCP server serves
// and the emitted tree carries as `decisions`. No committed brand sets `personality`, so `out/**` never
// shows one — this renders every trait instead. The trait list is the SCHEMA's enum, the contract an
// agent reads, not the engine's TRAITS table: a trait the schema advertises and the engine cannot render
// is blind here, not skipped.
const traitEnum: unknown = JSON.parse(readFileSync(join(repo, 'packages/engine/schema/theme-schema.json'), 'utf8'))?.properties?.personality?.items?.enum;
let notesRendered = 0;
if (!Array.isArray(traitEnum) || traitEnum.length < 9) {
  blind.push(`theme-schema.json's personality enum — expected at least 9 traits, found ${Array.isArray(traitEnum) ? traitEnum.length : 'none'}`);
} else {
  for (const t of traitEnum as string[]) {
    let notes: string[];
    try {
      notes = brandTheme({ id: 'lint', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 }, personality: [t] } as any)
        .notes.filter((n) => n.startsWith(`personality '${t}' →`));
    } catch (e) { blind.push(`personality '${t}' — did not render (${(e as Error).message})`); continue; }
    if (notes.length !== 1) { blind.push(`personality '${t}' — rendered ${notes.length} notes, expected exactly 1`); continue; }
    notesRendered++;
    clientFound.push(...hitsIn(`theme.notes (personality '${t}')`, notes[0]));
  }
}
// The carve-out is represented, not merely present: every sidecar went through it, and it exempted
// something. Zero means the field moved or the pattern drifted, and the rule would be passing blind.
const sidecarCount = gated.filter(isPayloadSidecar).length;
if (!sidecarCount || channelFiles !== sidecarCount || channelExempted === 0) {
  blind.push(`the payload channel — ${channelFiles}/${sidecarCount} sidecars carved, ${channelExempted} contract requirements exempted (expected every sidecar and more than 0)`);
}
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
  console.error(`\n    See docs/voice-standard.md §2. A false positive is fixed by widening an`);
  console.error(`    allow-set (e.g. JUST_ALLOWED), never by narrowing the scan.\n`);
} else {
  console.log('  ✓ clean — no banned voice-standard §2 phrases in any shipped surface.');
}

console.log(`Client-name arm — ${clientBundlesRead} bundles and ${notesRendered} rendered personality notes scanned (raw, comments included):`);
if (clientFound.length) {
  console.error(`\n❌ ${clientFound.length} client name(s) in a shipped bundle or a rendered note (#1824):\n`);
  for (const h of clientFound.slice(0, 20)) console.error(`    ${h.file}:${h.line}: [${h.rule}] "${h.match}"  …${h.context}…`);
  if (clientFound.length > 20) console.error(`    … and ${clientFound.length - 20} more`);
  console.error(`\n    This repo is public, and these surfaces reach a customer's workspace. Say what the text`);
  console.error(`    means without the brand: "a corpus brand", "the reference brand". Provenance that needs`);
  console.error(`    the name belongs in a file no bundle imports (test.ts holds the trait provenance).\n`);
} else {
  console.log('  ✓ clean — no client name in any of the three bundle files or any rendered personality note.');
}

process.exit(gatedHits.length || clientFound.length ? 1 : 0);
