/**
 * US-English gate for SHIPPED text (#162 → #260 → #302 → #310 → this).
 *
 * CLAUDE.md scopes the rule to *visible UI text* and *emitted artifact prose*; code comments and
 * identifiers are a deliberate carve-out. This encodes exactly that scope so the rule stops being
 * something each pass has to remember — four PRs in a row re-derived it and three of them missed
 * something.
 *
 * Five traps, each of which caught a previous pass, are handled here rather than left to the reader:
 *
 *  1. A FIXED WORD LIST UNDER-COUNTS. `colour|grey|behaviour` misses `generalised`, `tokenisation`,
 *     `synthesising`. So this scans the `-is(e|ed|es|ing|ation)` and `-our` PATTERNS and subtracts a
 *     false-positive list (`otherwise`, `precise`, `source`, `hour`, …) — the inverse of a word list,
 *     and it fails toward reporting too much rather than too little.
 *  1b. …BUT A PATTERN ALONE UNDER-COUNTS THE OTHER WAY, which is the correction this pass makes.
 *     `grey` ends in neither `-ise` nor `-our`, so PATTERN could not see a third of the standard
 *     CLAUDE.md says this gate enforces, and `greyscale` shipped in `theme-schema.json` past 90-file
 *     scans. Stems with no productive suffix get their own substring scan (STEMS). Pattern PLUS
 *     list — replacing one with the other just moves the blind spot.
 *  2. SOURCE GREPS MISS WHAT SHIPS. `engine/levers.ts` prose is inlined into `apps/studio/dist/main.js`, so
 *     the built bundle is scanned directly. A `.ts` grep would have called the bundle clean.
 *  3. NOT LOOKING READ AS LOOKING AND FINDING NOTHING — the correction this pass makes, and the trap
 *     the first two were only half-protected from. Trap 2 puts `apps/studio/dist/main.js` in scope, but the
 *     directory is a BUILD OUTPUT: in a tree where it was never built, `walk` returned `[]`, the file
 *     count silently dropped, and the gate printed `✓ clean` having never opened the bundle. The two
 *     build scripts write to different directories (`build` → `apps/studio/dist`, `build:site` →
 *     `apps/studio/public/dist`), so running the plausible-looking one produced a confident false pass. It
 *     fooled a reviewer on #495 while the reviewer protocol named the wrong command. `readFileSync`
 *     had the same shape — `catch { return [] }` made an unreadable file count as a clean one.
 *     Both now fail closed via `blind[]`. **A gate must not report a number it did not earn**, which
 *     generalizes traps 1 and 2: each was a case of the scan being narrower than it claimed.
 *  5. ONE OF TWO BUNDLES IS NOT "THE BUILT BUNDLE" (#937). Trap 2 put `apps/studio/dist` in scope and
 *     traps 2-4 then spent four passes hardening HOW that directory is read — required, fail-closed,
 *     represented per surface. None of them asked whether it was the only one. `apps/plugin/dist` is
 *     the same kind of surface under a different name and was never scanned, so every en-GB spelling
 *     that reaches the Figma plugin and nothing else shipped past a gate whose headline said `clean`.
 *
 *     WHAT MADE IT INVISIBLE, and it is the same shape as trap 3 one level up. A `dist/` directory
 *     does not exist until something builds it, so the scanned set and the unscanned one look
 *     identical from outside: both absent in a fresh tree, both appearing after a build, neither
 *     named anywhere except in this file. The hardening in traps 3 and 4 is all *depth* on one
 *     surface — `walkRequired` proves the studio bundle was opened, `REQUIRED_SURFACES` proves it was
 *     represented — and no amount of it is *breadth*. **A gate can be exhaustively verified over a set
 *     that is itself incomplete, and every one of those verifications passes.**
 *
 *     The plugin bundle is not a smaller copy of the studio one. `ui.html` inlines the same shared
 *     `apps/studio/src` UI, so what the studio bundle already gates is gated twice; the surplus is
 *     `packages/engine/components/*.ts`, bundled into BOTH plugin files and into no gated artifact —
 *     their `description` / `note` / `aria` / `avoidWhen` / `errorPattern` prose is read by an agent
 *     and rendered in the plugin's own panels, and it reached neither `out/**` nor the studio bundle.
 *     Measured on the first run of this scan: 89 hits in `main.js`, 86 in `ui.html`, of which 34 and
 *     33 sit in comments (the open question below) and **55 and 53 are prose in string literals**,
 *     which no open question covers.
 *
 * OPEN, AND DELIBERATELY NOT DECIDED HERE. CLAUDE.md's US-English section carves comments out of the
 * standard, then narrows the carve-out for `apps/studio/src` — because a bundle cannot tell a comment
 * from a string, so an exemption this gate cannot see is not enforceable — and records as OPEN whether
 * that same narrowing extends to `packages/engine/components/*.ts`, which #849 owns. Widening the scan
 * to the plugin bundle does not answer it and must not: this file scans what ships and reports what it
 * finds. What the scan DOES establish is that #849's answer is not sufficient on its own — exempting
 * every comment in every component def still leaves 108 prose hits across the two files, because the
 * `description` and `note` fields were never comments. Those are a separate defect with a separate
 * owner (#947), not a consequence of the open decision.
 *
 * SCOPE. Everything shipped is gated, and as of this pass that includes the two surfaces previously
 * carried as "reported, never fatal": the hand-authored `theme-schema.json` contract and the engine
 * README. Both are now converted (owner decision), so the open-decision carve-out that CLAUDE.md
 * recorded is closed and there is nothing left to merely count — a surface that is clean and NOT
 * gated is just a surface waiting to regress quietly.
 *
 * Run: `npx tsx packages/engine/lint-us-english.ts`  (exit 1 = a gated surface regressed)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENGINE_ARTIFACTS, SCHEMA_ARTIFACTS } from './regen';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

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

type Hit = { file: string; line: number; word: string; context: string };

// Every way this gate can fail to LOOK, as opposed to look and find nothing. Collected rather than
// thrown so one run reports all of them; a non-empty list is fatal below.
const blind: string[] = [];

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
const enGb = (txt: string): { word: string; index: number }[] => {
  const found: { word: string; index: number }[] = [];
  for (const re of [PATTERN, STEMS]) {
    for (const m of txt.matchAll(re)) {
      if (NOT_EN_GB.has(m[0].toLowerCase())) continue;
      found.push({ word: m[0], index: m.index ?? 0 });
    }
  }
  return found;
};

const scan = (abs: string): Hit[] => {
  let txt: string;
  // Fails CLOSED. This used to `return []`, so an unreadable file was indistinguishable from a clean
  // one and counted toward the "N files scanned" headline — the gate reported a number it had not
  // earned. Same family as trap 2: not looking must never read as looking and finding nothing.
  try { txt = readFileSync(abs, 'utf8'); } catch (e) {
    blind.push(`${relative(repo, abs)} — could not be read (${(e as Error).message})`);
    return [];
  }
  return enGb(txt).map(({ word, index }) => ({
    file: relative(repo, abs),
    line: txt.slice(0, index).split('\n').length,
    word,
    context: txt.slice(Math.max(0, index - 55), index + 45).replace(/\s+/g, ' '),
  }));
};

const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
};

/**
 * `walk` for a directory whose ABSENCE is itself a failure.
 *
 * The hole this closes: `apps/studio/dist` is a build output, so a tree where it was never built silently
 * contributed zero files and the gate printed `✓ clean` without ever opening the bundle — while trap 2
 * above is the whole reason the bundle is scanned at all. Worse, the two build scripts write to
 * DIFFERENT places (`apps/studio/package.json` `build` → `apps/studio/dist`; `build-site.mjs` → `apps/studio/public/dist`), so
 * running the wrong one produced a confident false pass. That is not hypothetical: it fooled a
 * reviewer on #495, and the reviewer protocol was itself naming the wrong command.
 *
 * An empty result is treated as blindness, not cleanliness.
 */
const walkRequired = (dir: string, why: string): string[] => {
  const found = walk(dir);
  if (!found.length) blind.push(`${relative(repo, dir)} — ${why}`);
  return found;
};

// ---- GATED: visible UI text + emitted artifact prose. A hit here fails the build. ----
// Scope is IMPORTED from regen.ts rather than restated, so adding an emitted artifact there brings it
// under this gate automatically instead of quietly widening the blind spot.
const gated: string[] = [
  ...walkRequired(join(repo, 'packages/engine/out'), 'no emitted artifacts found — run `npx tsx packages/engine/regen.ts`'),
  ...SCHEMA_ARTIFACTS.map((f) => join(repo, 'packages/engine/schema', f)),
  ...ENGINE_ARTIFACTS.map((f) => join(repo, 'packages/engine', f)),
  // trap 2: what actually ships. REQUIRED — see walkRequired. Note `build`, not `build:site`: the
  // latter writes apps/studio/public/dist, which this does not scan.
  ...walkRequired(join(repo, 'apps/studio/dist'), 'the web bundle is not built — run `npm run -w @prism3/studio build` (NOT build:site, which writes apps/studio/public/dist)')
    .filter((f) => f.endsWith('.js')),
  // …and the OTHER bundle, which shipped outside this gate for as long as the gate has existed (#937).
  // Trap 2 is the reason `apps/studio/dist` is here; `apps/plugin/dist` is the identical surface with a
  // different name, and it carries strictly MORE prose — the same shared `apps/studio/src` UI, inlined,
  // PLUS the component defs, whose `description`/`note`/`aria`/`avoidWhen` fields reach no other gated
  // surface. See the header's trap 5 for why the asymmetry was invisible.
  //
  // TWO files, claimed individually below rather than by one `/apps/plugin/dist/` predicate: `build.mjs`
  // writes `main.js` (the sandbox controller) and `ui.html` (the iframe document, with the UI bundle
  // inlined because the iframe ships `allowedDomains:["none"]` and cannot fetch a second asset). A
  // single loose promise covering both would stay satisfied by either one alone — the hazard this file's
  // own root-README comment states as "a promise loose enough to describe two surfaces protects
  // neither". A third file appearing here is deliberately fatal via the converse check, not absorbed.
  ...walkRequired(join(repo, 'apps/plugin/dist'), 'the plugin bundle is not built — run `npm run -w @prism3/plugin build`')
    .filter((f) => f.endsWith('.js') || f.endsWith('.html')),
  // Converted and folded in (owner decision) — previously reported-but-not-fatal because CLAUDE.md
  // held their conversion open. Gated now: leaving a clean surface ungated only defers the regression.
  join(repo, 'packages/engine/schema/theme-schema.json'),
  join(repo, 'packages/engine/README.md'),
  // The ROOT README — the repo's front door, and the single most-read prose surface here. It was
  // outside this gate while `packages/engine/README.md` one line above sat inside it, which is how a
  // `colour` survived in it: the scope was drawn around what the ENGINE emits and what the engine
  // documents, and the file a stranger opens first belonged to neither. Same class as trap 2 — the
  // scan was narrower than the standard it claimed to enforce, and being ungated is what made that
  // invisible rather than the spelling being hard to see.
  join(repo, 'README.md'),
  // The token-name baseline (#464). Named EXPLICITLY, unlike everything above it, because it is
  // deliberately not a `regen` artifact — a baseline regen could rewrite would silently agree with
  // the deletion it exists to catch. That exemption bought a blind spot in this gate at the same
  // moment, since the comment above promises coverage follows regen. It carries prose (`note`), so
  // it is listed by hand here; any future artifact kept out of regen needs the same line.
  join(repo, 'packages/engine/schema/token-contract.json'),
  // The paint census (#758) — the second baseline kept out of `regen` for the identical reason, and so
  // listed by hand for the identical reason: it carries prose (`note`) and inherits none of the regen
  // list's coverage. This is the line the comment above predicted would be needed.
  join(repo, 'packages/engine/schema/paint-census.json'),
  // The docs/34 shape-index baseline (#786) — the third baseline kept out of `regen` for the same
  // reason, hand-named for the same reason. It carries prose in `$comment` and in every shape title,
  // and those titles are quoted verbatim in this gate's own failure messages, so an en-GB spelling in
  // one would reach a contributor's terminal.
  join(repo, 'packages/engine/schema/shape-index.json'),
  // The decisions-index baseline (#886) — the fourth baseline kept out of `regen` for the same
  // reason, hand-named for the same reason. It carries prose in `$comment` and in every decision
  // `title`, and those titles are quoted verbatim in the gate's own failure messages, so an en-GB
  // spelling in one would reach a contributor's terminal the same way a shape title would.
  join(repo, 'packages/engine/schema/decisions-index.json'),
  // The payload manifest (#674) and the NB measurement fixture — both authored, both kept out of
  // regen, and both carrying prose that until #807 no prose gate had ever opened. The manifest states
  // a `why` on every payload/ours rule plus a multi-line `$comment`, and those reasons are the whole
  // mechanism by which a human classifies an emitted artifact; `nb-measured.json` carries `$comment`,
  // a `$source` on nearly every field, and a `brand.voice` line. They are here for the reason the
  // three lines above are here, and their absence is why that reason is now ASSERTED rather than
  // repeated: `lint-schema-classification.ts` fails until every file in `schema/` has a decided
  // place, so the next authored file cannot reach main uncovered by being forgotten twice.
  join(repo, 'packages/engine/schema/payload-manifest.json'),
  join(repo, 'packages/engine/schema/nb-measured.json'),
  // Shipped skills (#492). Prose an agent reads and follows, so it ships in the same sense `out/**`
  // does — and like the token contract above it is named by hand, because skills are not a `regen`
  // artifact and so inherit none of that list's coverage.
  ...walk(join(repo, 'skills')).filter((f) => f.endsWith('.md')),
];

// ---- SELF-CHECK: does the scanner still detect what it claims to? ----
// Without this, deleting a scan makes the gate go QUIET rather than fail — which is exactly how
// `greyscale` survived here (#313). A gate whose detection silently narrows reports success forever,
// and nothing downstream can tell the difference between "clean" and "not looking".
// One sample per rule CLAUDE.md states, plus one false positive that must NOT trip.
const SELF_CHECK: { sample: string; expect: boolean }[] = [
  { sample: 'a generalised approach', expect: true },    // -ise pattern
  { sample: 'the colour of it', expect: true },          // -our pattern
  { sample: 'all the colours here', expect: true },      // …and its PLURAL, which `our\b` could not see
  { sample: 'two generalisations', expect: true },       // the same hole on the -isation branch
  { sample: 'a greyscale mode', expect: true },          // STEMS — the one with no suffix to match
  { sample: 'otherwise the source', expect: false },     // NOT_EN_GB must still subtract
  { sample: 'four hours of tours', expect: false },      // the plurals `s?` newly exposes must not trip
];
// Drives `enGb` — the same function `scan()` calls — so neutering either regex fails HERE. See the
// comment on `enGb`; reimplementing the match inline is what let a real `greyscale` ship clean.
const selfFails = SELF_CHECK.filter(({ sample, expect }) => enGb(sample).length > 0 !== expect)
  .map((c) => `"${c.sample}" should${c.expect ? '' : ' NOT'} be flagged`);
// ...and a second self-check, on SCOPE rather than detection. The one above proves the scanner can
// still recognize `colours`; it says nothing about whether the file containing it was ever opened.
// That is the gap trap 3 came through — every pattern sample passed while `apps/studio/dist` was absent.
//
// Asserted PER SURFACE, not as a total, and that distinction is the whole point. A total-count floor
// was tried first and is worthless here: dropping the entire built bundle costs exactly ONE file
// (92 → 91), so any floor loose enough to allow normal growth is also loose enough to let the bundle
// vanish. Proven by deleting the guard and watching a 91-file run report `✓ clean`. The question is
// never "how many files" but "is each surface I promise to cover actually represented".
//
// Checked in BOTH directions (#387), because the forward direction alone is the "two edits, and the
// second is the one that rots" trap this list was already twice caught by. Forward: every promised
// surface has at least one file. Converse: every gated file is claimed by some promised surface — so
// adding a surface to `gated` without a line here FAILS, rather than widening the scanned set while
// the promise list quietly stops describing it. Only the converse makes the list self-maintaining;
// the forward check can only police surfaces someone remembered to promise.
const REQUIRED_SURFACES: { label: string; test: (f: string) => boolean }[] = [
  { label: 'the built web bundle (apps/studio/dist/*.js) — trap 2', test: (f) => f.includes('/apps/studio/dist/') && f.endsWith('.js') },
  { label: 'emitted artifacts (packages/engine/out)', test: (f) => f.includes('/packages/engine/out/') },
  { label: 'the schema contract (packages/engine/schema)', test: (f) => f.includes('/packages/engine/schema/') },
  // Skills joined the scope but not this list, which is the same false-pass class the guard exists
  // for: deleting the skills walk dropped 2 files, and the gate still printed a confident `clean`.
  // CLAUDE.md already writes the rule — coverage follows `regen.ts` for everything EXCEPT surfaces
  // named by hand, and each of those needs its own line here. Skills are the second such surface,
  // and the comment adding them said so without adding the line.
  // Anchored at the repo root (#650 PR 3), not a bare `/skills/` substring. The old test could afford
  // `includes('/Prism3/skills/')` because that prefix was unique by construction; `skills/` is a
  // top-level name, so a substring test would also accept some future `apps/x/skills/…` and report
  // this surface covered by a file that is not it.
  { label: 'shipped skills (skills/**/SKILL.md)', test: (f) => f.startsWith(`${repo}/skills/`) },
  // …and these two were the THIRD and FOURTH, found by the converse check the moment it existed.
  // Both sat in `gated` and in the headline's own sentence ("reports") with no line here, so
  // dropping either scanned two fewer files and still printed `✓ clean`. Precisely the failure the
  // comment above describes, committed twice more while that comment sat directly above it — which
  // is the argument for the converse direction rather than a fifth reminder.
  { label: 'the emitted reports (ENGINE_ARTIFACTS)', test: (f) => ENGINE_ARTIFACTS.some((a) => f.endsWith(`/${a}`)) },
  { label: 'the engine README', test: (f) => f.endsWith('/packages/engine/README.md') },
  // …and the FIFTH, added with the surface rather than after it. Matched exactly, not by suffix, and
  // the hazard runs one way only. `endsWith('/README.md')` would be satisfied by the ENGINE README's
  // file, so dropping the ROOT README from `gated` would leave THIS surface still represented — by a
  // file it does not describe — and the SCOPE check above would stop firing while real en-GB shipped
  // in the front door unseen. The mirror case never arises: the engine's own line is exact too and no
  // root-level file can satisfy `endsWith('/packages/engine/README.md')`, so its absence stays fatal
  // either way. A promise loose enough to describe two surfaces protects neither.
  { label: 'the root README (the repo front door)', test: (f) => f === join(repo, 'README.md') },
  // …and the SIXTH and SEVENTH (#937) — the Figma plugin's two shipped files, matched EXACTLY and
  // separately for the reason the root-README line above states: one predicate over the directory
  // would let either file vanish while the surface still read as covered, and these two are not
  // interchangeable (one is the sandbox controller, one is the document a designer looks at).
  { label: 'the built plugin controller (apps/plugin/dist/main.js)', test: (f) => f === join(repo, 'apps/plugin/dist/main.js') },
  { label: 'the built plugin UI document (apps/plugin/dist/ui.html)', test: (f) => f === join(repo, 'apps/plugin/dist/ui.html') },
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
// The converse. An unclaimed file is not a scanning failure — it IS scanned — but it is outside every
// promise, so nothing above notices when it later leaves. Fail now, while the scope change is in
// somebody's diff, instead of on the pass that silently drops it.
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

// A surface this gate could not read is reported BEFORE any spelling result, and is fatal on its own.
// "Clean" has to mean "looked everywhere and found nothing", never "looked at whatever happened to
// exist" — otherwise a green run carries no information about the surfaces that were missing.
if (blind.length) {
  console.error(`\n❌ the gate could not see ${blind.length} shipped surface(s), so a clean result would be meaningless:\n`);
  for (const b of blind) console.error(`    ${b}`);
  console.error('');
  process.exit(1);
}

// The headline is DERIVED from the promise list, not written beside it (#387's proposed shape). The
// old sentence hardcoded "out/, emitted schema, reports, shipped skills, built bundle" — so removing
// the reports from scope still printed the word `reports`, and a reader had no way to tell the claim
// from the coverage. A count plus a hand-written list of surfaces is exactly the pair that drifts:
// the number moves on its own and the prose does not. Now every named group is one the run measured,
// and the per-group counts make an unexpectedly small group visible instead of hiding inside a total.
console.log(`US-English gate — ${gated.length} shipped files scanned:`);
for (const s of REQUIRED_SURFACES) console.log(`    ${String(gated.filter(s.test).length).padStart(3)}  ${s.label}`);
if (gatedHits.length) {
  console.error(`\n❌ ${gatedHits.length} en-GB spelling(s) in SHIPPED text:\n`);
  for (const [f, hs] of byFile) {
    console.error(`  ${f}`);
    for (const h of hs.slice(0, 8)) console.error(`    ${h.line}: ${h.word}  …${h.context}…`);
    if (hs.length > 8) console.error(`    … and ${hs.length - 8} more`);
  }
} else {
  console.log('  ✓ clean — no en-GB spellings in any shipped surface.');
}

process.exit(gatedHits.length ? 1 : 0);
