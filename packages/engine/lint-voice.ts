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
 * **The MCP server's `tools/list` is in scope as SERVED (#1806)**: every tool, argument and inlined
 * schema description, obtained by spawning the server (`mcp-served.ts`), represented by a literal list of
 * the six tool names, blind on a missing tool or a silent server. `lint-us-english.ts` trap 8 has the
 * full account. Both gates read it, so on this surface the two scopes agree.
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
 * ── THE DECISIONS LOG (#1883) — AN EIGHTH ARM: EVERY ENGINE NOTE, RENDERED ─────────────────────────
 *
 * `theme.notes` is the record of what the engine decided for a brand. It ships four ways: the MCP
 * `theme_brand` result (by default), each emitted tree's `$extensions.prism3.decisions`, the reports, and
 * the studio's Decisions log. The notes were engine-voiced ("CONFIRM", "(#898)", "hairline sentinel ON"),
 * and the voice rules above could not see most of them: only the notes a committed brand happens to
 * trigger reach `out/**`, and §2's list has no rule for shouting or an issue number.
 *
 *   - SOURCES: the corpus as shipped (each `out/<brand>.tokens.json`'s decisions, read off disk); a
 *     SWEEP of literal brand inputs (`NOTE_SWEEP`) that reaches every producer no committed brand
 *     triggers, plus one input per personality trait in the schema's enum; EVERY SCHEMA ENUM VALUE of
 *     every scalar lever, one at a time (#1893 review — a new branch on one value of a printed lever
 *     renders there); and THE SOURCE: the string literals of every `notes.push(...)` argument, read by a
 *     small scanner, for a branch no valid input reaches (a value outside the enum, a dead condition).
 *   - RULES (`NOTE_RULES`), on top of §2, `normative` and en-GB: an issue number, an all-caps word
 *     outside a short acronym list, a date, an internal id like `B4a`, and a list of maintainer terms
 *     the notes used to carry. Self-checked with the old notes' own text as positive samples.
 *   - REPRESENTED, NOT COUNTED: `PRODUCERS` names every way a note is written, by the words it opens
 *     with. Every producer must be reached (else `blind`), and every note must be claimed by one (else
 *     an `unclaimed-note` failure: a new or reworded producer the table does not know). A tripwire
 *     counts `notes.push(` in theme.ts and vocabulary.ts against a literal per file, for a new producer
 *     the sweep never reaches; `NOTES_FLOOR` catches a sweep that quietly renders less.
 *   - NAMED AS UNREACHABLE: the typography note's empty-display-tier clause (`NOTES_UNREACHABLE`).
 *
 * Every pattern here is written in this file, never built from theme.ts's templates: a pattern derived
 * from the subject matches whatever the subject says (docs/34 shape 2).
 *
 * Run: `npx tsx packages/engine/lint-voice.ts`  (exit 1 = a gated surface carries banned voice-standard
 * §2 copy, or an RFC 2119 level outside the payload channel, or a bundle or rendered note names a client,
 * or an engine note breaks the decisions-log rules or is claimed by no known producer)
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
import { voiceHits, enGb } from './prose-rules.ts';
import type { RawHit } from './prose-rules.ts';
// The MCP tools/list as served (#1806): acquisition only, see the block below `gatedHits`.
import { servedToolsList, servedStrings } from './mcp-served';

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


type Hit = { file: string; line: number | string; rule: string; match: string; context: string };

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

// ---- the DECISIONS LOG (#1883) — every note the engine writes, rendered, against rules of its own ----
// See the header section of the same name. Two sources: the notes the corpus SHIPS (each emitted tree's
// `decisions`, read off disk) and a SWEEP of literal brand inputs, because most producers fire only on a
// lever no committed brand sets. Everything below is this gate's own: the sweep inputs, the producer
// patterns and the banned patterns are written here, never derived from theme.ts or vocabulary.ts — a
// pattern built from the subject's template would match whatever the subject says (docs/34 shape 2).
const NOTE_BASE = { id: 'lint-notes', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } };
const NOTE_SWEEP: [string, Record<string, unknown>][] = [
  ['defaults', {}],
  ['modes', { modes: ['light', 'dark', 'wireframe'], customModes: [{ name: 'promo', base: 'dark' }], overrides: { light: { 'text.link.default': { palette: 'primary', step: 600 } } }, modeAnchors: { dark: { primary: 400 } }, modeLevers: { dark: { density: 'compact', easings: { emphasized: 'calm' } } } }],
  ['root, gamut, supplied status, decoupled action and link', { root: 'acme', brandColors: [{ name: 'accent', oklch: { l: 0.55, c: 0.3, h: 235 } }], actionPalette: 'accent', linkPalette: 'primary', status: { success: { h: 150, chroma: 0.15 }, danger: { h: 27, chroma: 0.2 } } }],
  ['neutral anchor', { neutral: { hue: 262, chroma: 0.008, anchor: { l: 0.6, c: 0.01, h: 262 } } }],
  ['neutral auto, link same as action', { neutral: { hue: 262, chroma: 0.008, auto: true }, linkPalette: 'primary' }],
  ['red primary', { primary: { l: 0.5, c: 0.2, h: 25 }, neutral: { hue: 25, chroma: 0.01 } }],
  ['greige primary', { primary: { l: 0.5, c: 0.03, h: 30 }, neutral: { hue: 30, chroma: 0.01 } }],
  ['primary at the edge of red', { primary: { l: 0.5, c: 0.2, h: 47 }, neutral: { hue: 47, chroma: 0.01 } }],
  ['roleColors off-hue', { primary: { l: 0.5, c: 0.15, h: 150 }, neutral: { hue: 150, chroma: 0.01 }, brandColors: [{ name: 'lime', oklch: { l: 0.7, c: 0.15, h: 135 } }], roleColors: { danger: 'lime', info: 'lime' } }],
  ['interactivePalettes over accentPalette', { brandColors: [{ name: 'accent', oklch: { l: 0.6, c: 0.1, h: 200 } }], accentPalette: 'accent', interactivePalettes: [{ name: 'accent', palette: 'accent' }] }],
  ['every opt-in at once', { controlShape: 'hairline', gradients: true, buttonLabelWeight: 'default', typography: { sizeFloor: 8, titleFloor: 16, captionFloor: 10, responsive: { fluid: false } }, disabledStrategy: 'full', outlineInteraction: 'solid-tint', neutralEmphasis: 'strong', strictInteractiveContrast: true }],
  ['radiusHairline (retired), no hover, surfaces', { radiusHairline: true, outlineInteraction: 'none', surfaces: { light: { base: 100, floorStep: 300 }, dark: { floorStep: 800 } } }],
  // #1972: a declared second tier, with the floor following it (light) and held by `floorStep` (dark).
  ['declared second tiers', { surfaces: { light: { secondary: 200 }, dark: { secondary: 700, floorStep: 800 } } }],
  ['brand inverse band', { brandColors: [{ name: 'navy', oklch: { l: 0.22, c: 0.06, h: 250 } }], surfaces: { light: { inverseBase: { palette: 'navy', step: 900 } } } }],
  ['links on neutral', { linkPalette: 'neutral' }],
  ['link set apart from a rebased action', { brandColors: [{ name: 'accent', oklch: { l: 0.6, c: 0.1, h: 200 } }], roleColors: { action: 'accent' }, linkPalette: 'primary' }],
  ['a named stop', { radiusScale: 'soft' }],
  ['a trait pre-empted by another', { personality: ['soft', 'sharp'] }],
  // Every trait the schema advertises, so each trait's approved `why` is scanned too.
  ...((Array.isArray(traitEnum) ? traitEnum : []) as string[]).map((t): [string, Record<string, unknown>] => [`personality '${t}'`, { personality: [t] }]),
];
// The PRODUCERS: one entry per way the engine writes a note, keyed by what the note opens with. `site`
// entries are the push sites and each arm of a conditional inside one; a note no `site` pattern claims is a
// producer this table does not know, which fails rather than passing unread. `fragment` entries are
// optional clauses inside one note, each of which the sweep must also reach. `corpus` entries are notes
// that exist only in an emitted tree (the regression fixture's literal list), so the sweep cannot reach
// them and the corpus read must.
type Producer = { id: string; re: RegExp; kind: 'site' | 'fragment' | 'corpus' };
const PRODUCERS: Producer[] = [
  { id: 'modes: opt-out', re: /^modes: .+ only — the brand turns off /, kind: 'site' },
  { id: 'modes: wireframe', re: /^modes: wireframe added — /, kind: 'site' },
  { id: 'custom modes', re: /^custom modes: /, kind: 'site' },
  { id: 'overrides', re: /^overrides: color overrides in /, kind: 'site' },
  { id: 'modeAnchors', re: /^modeAnchors: /, kind: 'site' },
  { id: 'modeLevers', re: /^modeLevers: /, kind: 'site' },
  { id: 'namespace', re: /^namespace: tokens emit under /, kind: 'site' },
  { id: 'primary anchor', re: /^primary: the brand color is pinned at step \d+/, kind: 'site' },
  { id: 'out of gamut', re: /^anchor '[^']+' \(oklch [^)]+\) is outside the sRGB gamut/, kind: 'site' },
  { id: 'neutral anchor', re: /^neutral: pinned to the brand's gray/, kind: 'site' },
  { id: 'neutral auto', re: /^neutral: the grays follow the primary hue/, kind: 'site' },
  { id: 'brand color', re: /^brand color: '[^']+' added/, kind: 'site' },
  { id: 'status: supplied', re: /^(success|warning|info): the brand's hue /, kind: 'site' },
  { id: 'status: default', re: /^(success|warning|info): default hue /, kind: 'site' },
  { id: 'action: default', re: /^action: the primary palette, by default/, kind: 'site' },
  { id: 'action: decoupled', re: /^action: uses the '[^']+' palette/, kind: 'site' },
  { id: 'danger: supplied', re: /^danger: the brand's hue /, kind: 'site' },
  { id: 'danger: red primary', re: /^danger: the primary \(hue [^,]+, chroma [^)]+\) is a saturated red/, kind: 'site' },
  { id: 'danger: greige primary', re: /^danger: the primary \(hue [^)]+\) is reddish/, kind: 'site' },
  { id: 'danger: not red', re: /^danger: the primary \(hue [^)]+\) is not red/, kind: 'site' },
  { id: 'danger: edge of red', re: /^danger: the primary hue \S+ sits near the edge of red/, kind: 'site' },
  { id: 'roleColors: rebase', re: /^roleColors: \w+ uses the '[^']+' palette/, kind: 'site' },
  { id: 'roleColors: off-hue', re: /^roleColors: '[^']+' \(hue [^)]+\) is \d+° from the usual/, kind: 'site' },
  { id: 'accentPalette replaced', re: /^interactivePalettes: set, so accentPalette /, kind: 'site' },
  { id: 'interactive column', re: /^interactive column: '[^']+' on the /, kind: 'site' },
  { id: 'status ramp dropped', re: /^(success|warning|info): rebased by roleColors/, kind: 'site' },
  { id: 'dimensions', re: /^dimensions: \d+px grid/, kind: 'site' },
  // #2053: the hairline is always emitted, so its old note (and its controlShape clause) is gone; a brand that
  // still sets the retired lever is told it changes nothing. Reached by the `radiusHairline, …` sweep input.
  { id: 'radius hairline retired', re: /^radius: radiusHairline is retired/, kind: 'site' },
  { id: 'motion tempo', re: /^motion: '[^']+' tempo sets the durations/, kind: 'site' },
  { id: 'motion easing per mode', re: /^motion: easing roles use a different curve per mode/, kind: 'site' },
  { id: 'shadow', re: /^shadow: 6 steps \(xs–2xl\) of two layers each, plus a one-layer inset/, kind: 'site' },
  { id: 'gradient', re: /^gradient: \d+ brand gradient/, kind: 'site' },
  { id: 'gradient: none', re: /^gradient: none — /, kind: 'site' },
  { id: 'layout', re: /^layout: \d+ breakpoints \([^)]*\); \d+-column grid/, kind: 'site' },
  { id: 'button label weight', re: /^button label weight: /, kind: 'site' },
  { id: 'typography', re: /^typography: \d+-step size ladder \([^)]+\), a fixed set rather than a ratio/, kind: 'site' },
  { id: 'typography: title.2xs included', re: /^typography: .*title\.2xs is included/, kind: 'fragment' },
  { id: 'typography: caption tier', re: /^typography: .*caption adds caption\.xs \(8px\) and caption\.sm \(10px\)/, kind: 'fragment' },
  { id: 'typography: static sizes', re: /^typography: .*Sizes are fixed at every viewport\.$/, kind: 'fragment' },
  { id: 'typography: sizeFloor 8', re: /^typography: sizeFloor 8 /, kind: 'site' },
  { id: 'disabled: full', re: /^disabled: 'full' — /, kind: 'site' },
  { id: 'disabled: reduced', re: /^disabled: 'reduced' \(default\) — /, kind: 'site' },
  { id: 'overlays: default', re: /^interactive overlays: 'overlay-neutral' \(default\)/, kind: 'site' },
  { id: 'overlays: solid-tint', re: /^interactive overlays: 'solid-tint' — /, kind: 'site' },
  { id: 'overlays: none', re: /^interactive overlays: 'none' — /, kind: 'site' },
  { id: 'surfaces: page', re: /^surfaces: the \S+ page is /, kind: 'site' },
  { id: 'surfaces: floor', re: /^surfaces: the \S+ contrast floor is set to /, kind: 'site' },
  { id: 'surfaces: second tier, floor follows', re: /^surfaces: the \S+ second tier is .+ — the contrast floor moves with it\.$/, kind: 'site' },
  { id: 'surfaces: second tier, floor declared', re: /^surfaces: the \S+ second tier is .+ — the contrast floor stays at /, kind: 'site' },
  { id: 'surfaces: inverse band', re: /^surfaces: the \S+ inverse band is a brand color/, kind: 'site' },
  { id: 'action: anchored', re: /^action: anchored at '[^']+' step \d+/, kind: 'site' },
  { id: 'link color: same as action', re: /^link color: '[^']+', the same palette as the action color,/, kind: 'site' },
  { id: 'link color: decoupled', re: /^link color: links use the '[^']+' palette instead of the action color '[^']+'/, kind: 'site' },
  { id: 'links: Use of Color', re: /^links: .*WCAG 1\.4\.1 \(Use of Color\)/, kind: 'site' },
  { id: 'neutral emphasis: strong', re: /^neutral interactive emphasis: 'strong'/, kind: 'site' },
  { id: 'neutral emphasis: subtle', re: /^neutral interactive emphasis: 'subtle'/, kind: 'site' },
  { id: 'strict contrast: on', re: /^strict interactive contrast: on — /, kind: 'site' },
  { id: 'strict contrast: off', re: /^strict interactive contrast: off \(default\) — /, kind: 'site' },
  // vocabulary.ts — the two writers whose notes theme.ts copies in (`notes.push(...resolved.notes)`).
  { id: 'vocabulary: named stop', re: /^[\w.]+ '[^']+' → [\d.]+$/, kind: 'site' },
  { id: 'vocabulary: trait', re: /^personality '[^']+' → /, kind: 'site' },
  { id: 'vocabulary: trait pre-empted', re: /^personality '[^']+' → nothing to fill; kept /, kind: 'fragment' },
  // theme.ts's regression fixture (`nbThemeFrom`): a literal list, emitted only in its own tree.
  { id: 'fixture: reference brand', re: /^reference brand: /, kind: 'corpus' },
  { id: 'fixture: dimensions', re: /^dimensions: 4px grid, 8px spacing rhythm \(numbered scale\)/, kind: 'corpus' },
  { id: 'fixture: typography', re: /^typography: 22-step size ladder \(10–160px\); weights /, kind: 'corpus' },
  { id: 'fixture: shadow', re: /^shadow: 6 steps plus inset, two layers, pure black/, kind: 'corpus' },
  { id: 'fixture: layout', re: /^layout: 5 breakpoints \(the default\)/, kind: 'corpus' },
];
// What the sweep cannot reach, named rather than skipped. The empty-display-tier clause of the
// typography note needs a display tier with no rung under the ceiling, and the schema's smallest
// ceiling ('sm') keeps at least one display size at every type scale.
const NOTES_UNREACHABLE = ['typography: empty display tier (the "below the usual 15–25" clause)'];
// The push sites, counted in the SOURCE (comments dropped), as a tripwire for a new producer the sweep
// never reaches: one the sweep reaches is an unclaimed note already. A literal per file, written here.
// theme.ts: 44 note pushes + the one that copies vocabulary.ts's notes in. vocabulary.ts: 2.
const NOTE_PUSH_SITES: Record<string, number> = { 'packages/engine/theme.ts': 46, 'packages/engine/vocabulary.ts': 2 };
// The rules a NOTE must also pass, beyond §2 and `normative`. Each is a thing an engine note has carried.
const ALLCAPS_OK = new Set(['AA', 'AAA', 'WCAG', 'OKLCH', 'HC']);
const NOTE_RULES: { rule: string; re: RegExp }[] = [
  { rule: 'issue-number', re: /#\d+/g },                                  // "(#898)", "issue #101"
  { rule: 'all-caps', re: /\b[A-Z]{2,}\b/g },                             // "CONFIRM", "NOT", "ON", "ESCAPE HATCH"
  { rule: 'date', re: /\b\d{4}-\d{2}-\d{2}\b/g },                         // "destructive 2026-09-24"
  { rule: 'internal-id', re: /\b[A-Z]{1,2}-?\d+[a-z]?\b/g },              // "B4a", "M-05"
  { rule: 'maintainer-jargon', re: /\b(sentinel|escape hatch|field-common|field-correct|research-validated|re-gated|dialect|composite spine|live-inherits|baseMd|covers all bases|regression)\b/gi },
];
const noteHits = (txt: string): RawHit[] => [
  ...NOTE_RULES.flatMap(({ rule, re }) => [...txt.matchAll(re)]
    .filter((m) => !(rule === 'all-caps' && ALLCAPS_OK.has(m[0])))
    .map((m) => ({ rule, match: m[0], index: m.index! }))),
  ...voiceHits(txt), ...normativeHits(txt),
  ...enGb(txt).map(({ word, index }) => ({ rule: 'en-GB', match: word, index })),
];
const NOTE_SELF_CHECK: { sample: string; want: string | null }[] = [
  { sample: 'action color defaults to the PRIMARY brand palette — CONFIRM this hue', want: 'all-caps' },
  { sample: 'any that miss its floor are flagged (#898)', want: 'issue-number' },
  { sample: 'AA-clean in every state (#1389/B4a, destructive 2026-09-24)', want: 'date' },
  { sample: 'AA-clean in every state (B4a)', want: 'internal-id' },
  { sample: 'radius: hairline sentinel on', want: 'maintainer-jargon' },
  { sample: 'disabled text should simply dim', want: 'banned-word' },
  { sample: 'a grayscale mode, a greyscale mode', want: 'en-GB' },
  { sample: "links: too close in color to body text for WCAG 1.4.1 — clears AA (4.5:1) in OKLCH and sRGB; hc-light and HC modes; 2xl, 3xl", want: null },
];
for (const { sample, want } of NOTE_SELF_CHECK) {
  const hits = noteHits(sample);
  if (want === null ? hits.length > 0 : !hits.some((h) => h.rule === want)) {
    selfFails.push(`decisions log: "${sample}" should${want ? ` be flagged as '${want}'` : ` NOT be flagged (got ${hits.map((h) => `${h.rule} "${h.match}"`).join(', ')})`}`);
  }
}
if (selfFails.length) {
  console.error(`\n❌ the gate's detection is broken — it cannot see what it claims to:\n`);
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}
const decisionNotes: { where: string; text: string }[] = [];
// (1) The corpus, as shipped: every brand's emitted tree, `$extensions.prism3.decisions`.
const outDir = join(repo, 'packages/engine/out');
const treeFiles = readdirSync(outDir).filter((f) => /^[a-z0-9-]+\.tokens\.json$/.test(f) && !f.includes('.base.') && !f.includes('.overlay.'));
if (treeFiles.length < 5) blind.push(`the decisions log — ${treeFiles.length} emitted brand trees in packages/engine/out, expected at least 5`);
for (const f of treeFiles) {
  let decisions: unknown;
  try {
    const find = (o: any): unknown => {
      if (!o || typeof o !== 'object') return undefined;
      if (Array.isArray(o?.prism3?.decisions)) return o.prism3.decisions;
      for (const v of Object.values(o)) { const r = find(v); if (r) return r; }
      return undefined;
    };
    decisions = find(JSON.parse(readFileSync(join(outDir, f), 'utf8')));
  } catch (e) { blind.push(`out/${f} — could not be read for the decisions log (${(e as Error).message})`); continue; }
  if (!Array.isArray(decisions) || decisions.length === 0) { blind.push(`out/${f} — carries no decisions log`); continue; }
  for (const d of decisions) decisionNotes.push({ where: `out/${f}`, text: String(d) });
}
// (2) The sweep, rendered the way the MCP server and every emitter get them: `brandTheme(...).notes`.
for (const [label, over] of NOTE_SWEEP) {
  try {
    for (const n of brandTheme({ ...NOTE_BASE, ...over } as any).notes) decisionNotes.push({ where: `sweep: ${label}`, text: n });
  } catch (e) { blind.push(`decisions-log sweep '${label}' — did not render (${(e as Error).message})`); }
}
// (3) EVERY SCHEMA ENUM VALUE, one at a time (#1893 review). A note that prints a lever's value can grow
// a branch on one value (`neutralEmphasis === 'loud' ? …`) that no hand-picked input above reaches. The
// value set is the CONTRACT's — `theme-schema.json`, the enum an agent or the studio can send — walked
// here, never theme.ts's own switch. Every scalar lever path with an `enum` is rendered at each value over
// NOTE_BASE; `modes` is rendered as `['light', <mode>]`, and `modeLevers.*` under the `dark` mode. A path
// that takes the value only inside an array or a free-keyed map (`typography.weights.*.[]`,
// `motionPersonality.easingRoles.*`) is not a lever value a note prints, and is skipped by that shape.
const schemaDoc: any = JSON.parse(readFileSync(join(repo, 'packages/engine/schema/theme-schema.json'), 'utf8'));
const enumLevers: { path: string[]; values: unknown[] }[] = [];
const walkEnums = (o: any, path: string[]): void => {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o.enum) && path.length) enumLevers.push({ path, values: o.enum });
  for (const [k, v] of Object.entries<any>(o.properties ?? {})) walkEnums(v, [...path, k]);
  if (o.additionalProperties && typeof o.additionalProperties === 'object' && path[0] === 'modeLevers' && path.length === 1) walkEnums(o.additionalProperties, [...path, 'dark']);
  for (const k of ['oneOf', 'anyOf', 'allOf']) for (const v of o[k] ?? []) walkEnums(v, path);
};
walkEnums(schemaDoc, []);
if (schemaDoc?.properties?.modes?.items?.enum) enumLevers.push({ path: ['modes'], values: schemaDoc.properties.modes.items.enum.map((m: string) => (m === 'light' ? ['light'] : ['light', m])) });
// Represented: the levers whose VALUE a note prints must each be in what the walk found, or the walk
// went blind (a schema restructure, a renamed key) and the sweep below proves nothing about them.
const ENUM_LEVERS_PRINTED = ['neutralEmphasis', 'outlineInteraction', 'disabledStrategy', 'motionPersonality.tempo', 'density', 'typography.typeScale', 'typography.displayCeiling', 'buttonLabelWeight', 'controlShape', 'radiusScale', 'modeLevers.dark.tempo', 'modeLevers.dark.density', 'modes'];
const walked = new Set(enumLevers.map((e) => e.path.join('.')));
const missingEnum = ENUM_LEVERS_PRINTED.filter((p) => !walked.has(p));
if (missingEnum.length) blind.push(`the decisions log — the schema enum walk found no ${missingEnum.join(', ')} (found ${walked.size} enum paths)`);
const setPath = (base: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> => {
  const out: any = JSON.parse(JSON.stringify(base));
  let at = out;
  for (const k of path.slice(0, -1)) at = (at[k] = at[k] && typeof at[k] === 'object' ? at[k] : {});
  at[path[path.length - 1]] = value;
  return out;
};
// Skipped by name, with the reason: the line-height and letter-spacing rung maps are ORDERED ramps
// (`tighter` < `tight` < …), so most single values are invalid alone — brandTheme refuses them — and no
// note prints a rung value. Every other enum path is rendered.
const ENUM_SKIP = ['typography.lineHeights.', 'typography.letterSpacings.', 'modeLevers.dark.lineHeights.', 'modeLevers.dark.letterSpacings.'];
let enumRenders = 0;
for (const { path, values } of enumLevers) {
  if (ENUM_SKIP.some((p) => path.join('.').startsWith(p))) continue;
  for (const v of values) {
    const label = `enum ${path.join('.')}=${JSON.stringify(v)}`;
    try {
      for (const n of brandTheme(setPath(NOTE_BASE, path, v) as any).notes) decisionNotes.push({ where: `sweep: ${label}`, text: n });
      enumRenders++;
    } catch (e) { blind.push(`decisions-log sweep '${label}' — did not render (${(e as Error).message})`); }
  }
}
// Represented, not counted: every producer is reached, and every note is claimed by a site.
const notesFound: Hit[] = [];
const reached = new Set<string>();
for (const { where, text } of decisionNotes) {
  const matched = PRODUCERS.filter((p) => p.re.test(text));
  for (const p of matched) reached.add(p.id);
  if (!matched.some((p) => p.kind !== 'fragment')) notesFound.push({ file: where, line: '-', rule: 'unclaimed-note', match: text.slice(0, 60), context: 'no producer in lint-voice.ts PRODUCERS opens this way — a new or reworded note' });
  for (const { rule, match, index } of noteHits(text)) {
    notesFound.push({ file: where, line: '-', rule, match, context: text.slice(Math.max(0, index - 55), index + 45) });
  }
}
const unreached = PRODUCERS.filter((p) => !reached.has(p.id));
if (unreached.length) blind.push(`the decisions log — ${unreached.length} producer(s) never reached by the corpus or the sweep: ${unreached.map((p) => p.id).join('; ')}`);
// Measured at 1,784 when written (81 shipped + 449 from NOTE_SWEEP + 1,254 from the enum sweep); the floor
// sits below it so a sweep that quietly stops rendering — an empty enum walk, a throwing input — fails
// here rather than scanning less.
const NOTES_FLOOR = 1700;
if (decisionNotes.length < NOTES_FLOOR) blind.push(`the decisions log — ${decisionNotes.length} notes scanned, below the floor of ${NOTES_FLOOR}`);
// (4) THE SOURCE, for the branches no render reaches (#1893 review). A note's text lives in the string
// literals of its `notes.push(...)` argument. A branch keyed on a value outside the schema enum (or behind
// a condition no input meets) never renders, so the sweeps above cannot see it; its literal text is still
// right here. This reads each push argument with a small scanner — string, template and quote escapes,
// `${…}` expressions descended into for their own literals, code outside literals ignored (so `ALL_MODES`
// and `RED_CHROMA_FLOOR` are not text) — and applies NOTE_RULES to every literal segment.
const NOTE_LITERAL_RULES = NOTE_RULES; // the same rules; a source literal is a fragment of a note
let pushArgs = 0, literalSegments = 0;
const sourceLiterals: { file: string; line: number; text: string }[] = [];
/** The literal segments of the expression starting at `i` (just after `notes.push(`), and where it ends. */
const scanArgs = (src: string, i: number): { segs: { at: number; text: string }[]; end: number } => {
  const segs: { at: number; text: string }[] = [];
  let depth = 1;
  const readQuoted = (q: string): void => {           // src[i] is the opening quote
    let j = i + 1, text = '', start = j;
    while (j < src.length && src[j] !== q) {
      if (src[j] === '\\') { text += src[j + 1]; j += 2; continue; }
      if (q === '`' && src[j] === '$' && src[j + 1] === '{') {
        if (text) segs.push({ at: start, text });
        text = '';
        // descend into the expression: its own literals count, its code does not
        let k = j + 2, d = 1;
        const saveI = i; i = k;
        while (i < src.length && d > 0) {
          const c = src[i];
          if (c === '\'' || c === '"' || c === '`') { readQuoted(c); continue; }
          if (c === '{') d++;
          else if (c === '}') d--;
          i++;
        }
        j = i; start = j; i = saveI;
        continue;
      }
      text += src[j]; j++;
    }
    if (text) segs.push({ at: start, text });
    i = j + 1;
  };
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '\'' || c === '"' || c === '`') { readQuoted(c); continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    i++;
  }
  return { segs, end: i };
};
for (const [file, want] of Object.entries(NOTE_PUSH_SITES)) {
  const src = readFileSync(join(repo, file), 'utf8');
  let got = 0;
  for (const m of src.matchAll(/\bnotes\.push\(/g)) {
    const lineStart = src.lastIndexOf('\n', m.index!) + 1;
    if (/^\s*(\/\/|\*|\/\*)/.test(src.slice(lineStart, m.index!))) continue;     // a comment naming it
    got++;
    const { segs } = scanArgs(src, m.index! + m[0].length);
    pushArgs++;
    for (const sgm of segs) { literalSegments++; sourceLiterals.push({ file, line: src.slice(0, sgm.at).split('\n').length, text: sgm.text }); }
  }
  if (got !== want) blind.push(`the decisions log — ${file} has ${got} notes.push( site(s), this gate knows ${want}: add the new producer to PRODUCERS and a NOTE_SWEEP input that reaches it, then update NOTE_PUSH_SITES`);
}
// Represented: the scanner must have read known note text, or it is reading nothing (or only code). Two
// probes from different producers, and a converse one — a code identifier in a push must NOT be read.
for (const probe of ['modes: wireframe added', ' — the brand turns off ']) {
  if (!sourceLiterals.some((l) => l.text.includes(probe))) blind.push(`the decisions log — the source scan read no literal containing '${probe}'; the scanner is broken or the note moved`);
}
if (sourceLiterals.some((l) => /ALL_MODES|RED_CHROMA_FLOOR|STATUS_DEFAULTS/.test(l.text))) blind.push('the decisions log — the source scan read a code identifier as note text; the scanner is not separating code from literals');
for (const l of sourceLiterals) {
  for (const { rule, re } of NOTE_LITERAL_RULES) {
    for (const m of l.text.matchAll(re)) {
      if (rule === 'all-caps' && ALLCAPS_OK.has(m[0])) continue;
      notesFound.push({ file: `${l.file} (source)`, line: l.line, rule, match: m[0], context: l.text.slice(0, 100) });
    }
  }
}
// The carve-out is represented, not merely present: every sidecar went through it, and it exempted
// something. Zero means the field moved or the pattern drifted, and the rule would be passing blind.
const sidecarCount = gated.filter(isPayloadSidecar).length;
if (!sidecarCount || channelFiles !== sidecarCount || channelExempted === 0) {
  blind.push(`the payload channel — ${channelFiles}/${sidecarCount} sidecars carved, ${channelExempted} contract requirements exempted (expected every sidecar and more than 0)`);
}

// ---- The MCP server's tools/list, AS SERVED (#1806) — see lint-us-english.ts's block of the same name;
// the acquisition is shared (`mcp-served.ts`), the rules and the represented-list are this gate's own.
// Every §2 rule and `normative` apply: an MCP description is agent-facing, but it is not the payload
// channel (voice-standard §4), so a `MUST` in it is a hit. Each string is scanned alone, values and keys,
// never the serialized JSON (a `\n` escape hides the next word; `mcp-served.ts` header); a hit names its
// JSON path in place of a line number. No comment stripping: these are strings, not source.
const MCP_TOOLS = ['list_levers', 'theme_brand', 'score_consumption', 'theme_from_brief', 'export_theme', 'validate_brand'];
const served = servedToolsList(repo);
let mcpToolsScanned = 0;
if ('error' in served) blind.push(`the MCP tools/list surface — ${served.error}`);
else {
  const names = served.tools.map((t) => t.name);
  const missing = MCP_TOOLS.filter((n) => !names.includes(n));
  if (missing.length) blind.push(`the MCP tools/list surface — the served list lacks ${missing.join(', ')} (served: ${names.join(', ') || 'none'})`);
  for (const tool of served.tools) {
    if (typeof tool.description !== 'string' || !tool.description.trim()) blind.push(`the MCP tool '${tool.name}' — served with no description to scan`);
    mcpToolsScanned++;
    for (const { path, text } of servedStrings(tool)) {
      gatedHits.push(...[...voiceHits(text), ...normativeHits(text)].map(({ rule, match, index }) => ({
        file: 'MCP tools/list (served)',
        line: path,
        rule,
        match,
        context: text.slice(Math.max(0, index - 55), index + 45).replace(/\s+/g, ' '),
      })));
    }
  }
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
console.log(`    ${String(mcpToolsScanned).padStart(3)}  MCP tools/list, as the server returns it (tools, #1806)`);
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

const sweepNotes = decisionNotes.filter((n) => n.where.startsWith('sweep:')).length;
console.log(`Decisions-log arm — ${decisionNotes.length} notes scanned (${decisionNotes.length - sweepNotes} from ${treeFiles.length} emitted trees, ${sweepNotes} from ${NOTE_SWEEP.length} sweep inputs and ${enumRenders} schema enum values); ${reached.size}/${PRODUCERS.length} producers reached; ${literalSegments} literal segments read from ${pushArgs} notes.push( arguments; not reachable, named: ${NOTES_UNREACHABLE.join('; ')}`);
if (notesFound.length) {
  console.error(`\n❌ ${notesFound.length} decisions-log note problem(s) (#1883):\n`);
  for (const h of notesFound.slice(0, 20)) console.error(`    ${h.file}: [${h.rule}] "${h.match}"  …${h.context}…`);
  if (notesFound.length > 20) console.error(`    … and ${notesFound.length - 20} more`);
  console.error(`\n    Every note ships: theme.notes, the MCP theme_brand result, each emitted tree's decisions and`);
  console.error(`    the studio's Decisions log. Write it in voice-standard §4's UI register — what the engine decided,`);
  console.error(`    then why; no issue numbers, all-caps or maintainer terms (provenance goes in a comment beside the`);
  console.error(`    push). An unclaimed note is a new or reworded producer: add it to PRODUCERS with a sweep input.\n`);
} else {
  console.log('  ✓ clean — every note reads in the UI register, and every one is claimed by a known producer.');
}

process.exit(gatedHits.length || clientFound.length || notesFound.length ? 1 : 0);
