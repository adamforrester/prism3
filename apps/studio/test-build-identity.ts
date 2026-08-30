/**
 * Build-identity test (#836) — drives the REAL `src/build-identity.ts`, the module that answers
 * "which build is running?" for both surfaces.
 *
 *   npx tsx apps/studio/test-build-identity.ts
 *
 * WHY THIS IS TESTABLE AT ALL, and it is the same reason `test-provenance.ts` exists: the readings
 * were pulled OUT of `src/main.ts` before they were extended. `main.ts` touches `document` at import
 * time and cannot load under `tsx`, so the two `title` sentences #474 shipped had been unassertable
 * for their whole life. Both are now literals in this file, byte-for-byte, so moving them is a
 * verified move rather than a hoped-one.
 *
 * What this covers, in the order the sections run:
 *   1. the parse — first-space split, so a path's own content cannot break it
 *   2. the chip — the 210px rail's budget, and the web forms passing through untouched
 *   3. the title and the note — all three branches, including the two #474 strings
 *   4. the append rule — the separator, which is where the only real bug in this module lived
 *   5. THE DISCRIMINATOR — two trees at the same commit produce different identities. This is
 *      #836's whole claim and the property a commit SHA cannot have.
 *   6. the producer's format matches the parser's contract, and each of the main thread's two
 *      readers still reports — source checks on `build.mjs` and `apps/plugin/src/main.ts`
 *
 * Mirrors `test-provenance.ts`'s `ok(...)` style; exits non-zero on any failure.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBuildId, buildChip, buildTitle, buildNote, appendBuildNote } from './src/build-identity';

let executed = 0;
let failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (!cond) { failed += 1; console.log(`  ✗ ${label}`); }
};
const eq = (got: unknown, want: unknown, label: string): void => {
  executed += 1;
  if (got !== want) { failed += 1; console.log(`  ✗ ${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
};

/** The three shapes, as the three producers emit them. Written out rather than composed, so a change
 *  to the module cannot quietly change what this file claims the input looks like. */
const TREE_ID = '2026-08-26T14:03:07Z /tmp/p3-buildid';
const LOCAL_ID = 'local';
const COMMIT_ID = '9b68993';

// =============================================================================================
console.log('\n1. the parse — the path is the unparsed tail');

const tree = parseBuildId(TREE_ID);
eq(tree.kind, 'tree', 'a string with a space is the plugin form');
eq(tree.kind === 'tree' ? tree.builtAt : null, '2026-08-26T14:03:07Z', 'the timestamp is everything before the first space');
eq(tree.kind === 'tree' ? tree.tree : null, '/tmp/p3-buildid', 'the tree is everything after it');

// THE REASON THE TIMESTAMP GOES FIRST. This repo contains `reference/New Balance/`, so a tree path can
// hold spaces; a parse that split on the LAST space, or searched for a separator from the right, would
// truncate exactly the field that identifies the checkout. Splitting on the first space makes the
// path's own content irrelevant, which is why this is a total function and not a heuristic.
const spacey = parseBuildId('2026-08-26T14:03:07Z /Users/me/New Balance/p3 lane');
eq(spacey.kind === 'tree' ? spacey.tree : null, '/Users/me/New Balance/p3 lane',
  'a tree path containing spaces survives the parse whole');
eq(spacey.kind === 'tree' ? spacey.builtAt : null, '2026-08-26T14:03:07Z',
  'and its timestamp is still just the head');

eq(parseBuildId(LOCAL_ID).kind, 'local', "'local' is the studio dev/build form");
const commit = parseBuildId(COMMIT_ID);
eq(commit.kind, 'commit', 'a bare SHA is the deploy form');
eq(commit.kind === 'commit' ? commit.commit : null, COMMIT_ID, 'and it is carried verbatim');
// `vercel-ignore-check.mjs` builds with `'check'`. It has no output path and never renders; asserted
// so that "it reads as a commit" is a recorded decision rather than something nobody looked at.
eq(parseBuildId('check').kind, 'commit', "'check' falls through to the commit branch (that entry never renders)");

// The total-function property, stated as a round trip.
const parts = parseBuildId(TREE_ID);
eq(parts.kind === 'tree' ? `${parts.builtAt} ${parts.tree}` : null, TREE_ID, 'the tree form round-trips exactly');

// =============================================================================================
console.log('2. the chip — a 210px rail');

eq(buildChip(TREE_ID), 'p3-buildid 08-26 14:03Z', 'the chip is the last path segment plus MM-DD HH:MM, UTC-marked');
eq(buildChip('2026-08-26T14:03:07Z /Users/aforrester/Documents/Prism3'), 'Prism3 08-26 14:03Z',
  'the shared checkout reads as its own directory name — the discriminator, at chip width');

// The two dropped fields are dropped on purpose: the year, because every build in play is this year,
// and the seconds, because the chip answers "did I just build this" rather than "when exactly".
ok(!buildChip(TREE_ID).includes('2026'), 'the year is dropped');
ok(!buildChip(TREE_ID).includes(':07'), 'the seconds are dropped');
eq(buildChip(TREE_ID).split(' ').slice(1).join(' ').length, 12, 'the time is fixed-width at 12 characters');

// THE `Z`, ASSERTED — a UTC field rendered without its marker reads as tomorrow to anyone west of
// Greenwich, which is the misread #1100's review measured (chip `08-27 02:17`, clock 21:17 local) and the
// opposite of what a staleness indicator is for. One character, and nothing else in the chip carries it.
ok(buildChip(TREE_ID).endsWith('Z'), 'the chip marks its time as UTC — 08-26 14:03Z, not 08-26 14:03');
ok(!buildChip(LOCAL_ID).endsWith('Z') && !buildChip(COMMIT_ID).endsWith('Z'),
  "and the web's two forms are untouched by that — they carry no time at all");

// `.rail-build` is a wrapping flex row with no width to spare. A single token with no break opportunity
// would overflow the rail rather than wrap onto a second line, so the space between the two fields is
// load-bearing layout, not just punctuation. (`.rail-build-b` also carries `overflow-wrap:anywhere`
// for the case a branch name alone exceeds the column.)
ok(buildChip(TREE_ID).includes(' '), 'the chip has a break opportunity, so a long tree name wraps rather than overflowing');

// The web is unchanged by #836 — asserted, because this module now sits in front of a surface that
// was working and a regression there would be silent.
eq(buildChip(LOCAL_ID), 'local', "the web's local build reads exactly as it did before");
eq(buildChip(COMMIT_ID), COMMIT_ID, 'and a deploy still shows its commit verbatim');

// =============================================================================================
console.log('3. the title and the note');

// THE TWO #474 STRINGS, byte-for-byte. These were inline in `main.ts` and therefore untestable; if the
// move retyped a word, this fails. That is the only reason to hard-code prose in a test.
eq(buildTitle(LOCAL_ID), 'Built outside the deploy — no commit to report.', "the local title is #474's, unchanged");
eq(buildTitle(COMMIT_ID), `Deployed from commit ${COMMIT_ID}.`, "the deploy title is #474's, unchanged");

const title = buildTitle(TREE_ID);
ok(title.includes('/tmp/p3-buildid'), 'the title carries the WHOLE path — it has no width budget, unlike the chip');
ok(title.includes('2026-08-26T14:03:07Z'), 'and the whole timestamp, to the second');
ok(title.includes('same plugin id'), 'and says why a path is the answer — the reason is what makes it actionable');
ok(new Set([buildTitle(TREE_ID), buildTitle(LOCAL_ID), buildTitle(COMMIT_ID)]).size === 3,
  'the three titles are mutually distinguishable');

eq(buildNote(LOCAL_ID), null, 'no note for a local web build — the caller appends nothing, not an empty clause');
eq(buildNote(COMMIT_ID), null, 'and none for a deploy: the web has no run report to append to');
eq(buildNote(TREE_ID), 'Built from /tmp/p3-buildid at 2026-08-26T14:03:07Z.', 'the plugin note names the tree and the build time');
ok(buildNote(TREE_ID)!.endsWith('.'), 'the note is a sentence — it lands after prose that ends in one');

// =============================================================================================
console.log('4. the append rule — the separator');

// THE BUG THIS SECTION EXISTS FOR. The two summaries this clause lands on end differently: the theme
// write's ends in a count, and the component build's ends in `staleNote`'s full stop. A fixed `'. '`
// produced `…build into a fresh page.. Built from …` — a doubled period, on exactly the run that is
// already telling the designer something went wrong.
eq(appendBuildNote('palette 118 (+0), color 24, 4 misses', TREE_ID),
  'palette 118 (+0), color 24, 4 misses. Built from /tmp/p3-buildid at 2026-08-26T14:03:07Z.',
  'a summary ending in a count gets a full stop before the note');
eq(appendBuildNote('…or build into a fresh page.', TREE_ID),
  '…or build into a fresh page. Built from /tmp/p3-buildid at 2026-08-26T14:03:07Z.',
  'a summary already ending in a full stop gets one space and no second period');
ok(!appendBuildNote('…build into a fresh page.', TREE_ID).includes('..'),
  'no doubled period on any input — the regression this rule is for');
eq(appendBuildNote('', TREE_ID), 'Built from /tmp/p3-buildid at 2026-08-26T14:03:07Z.',
  'an empty summary yields the note alone, with no orphan separator');

// The web forms are the identity function here, so a studio build cannot grow a clause it has no
// identity to fill.
for (const [label, raw] of [['local', LOCAL_ID], ['a commit', COMMIT_ID]] as const) {
  eq(appendBuildNote('palette 118 (+0)', raw), 'palette 118 (+0)', `${label} leaves the summary untouched`);
}

// =============================================================================================
console.log('5. the discriminator — what a commit SHA cannot do');

// 2026-08-26, in one assertion. Three checkouts each held a `dist/`, all declaring plugin id
// `prism3-theming-plugin`, and Figma was loading one while a lane inspected another. The two trees
// were on DIFFERENT commits that day, so a SHA would have caught it — but #836's own body records the
// objection that survives: two worktrees on the same commit is a normal state here, and a SHA cannot
// separate them. This is that case.
const SAME_MINUTE = '2026-08-26T14:03:07Z';
const A = `${SAME_MINUTE} /tmp/p3-buildid`;
const B = `${SAME_MINUTE} /Users/aforrester/Documents/Prism3`;
ok(buildChip(A) !== buildChip(B), 'two trees built in the same second are distinguishable IN THE CHIP');
ok(buildTitle(A) !== buildTitle(B), 'and in the title');
ok(buildNote(A) !== buildNote(B), 'and in the run report');

// And the failure the tree path alone cannot see: the RIGHT tree, never rebuilt. `dist/` is gitignored,
// so no git operation updates what Figma runs — a tree can sit on exactly the right commit carrying a
// two-day-old bundle. This is why the timestamp is a second field rather than a nicety.
const STALE = '2026-08-24T09:12:00Z /tmp/p3-buildid';
const FRESH = '2026-08-26T14:03:07Z /tmp/p3-buildid';
ok(buildChip(STALE) !== buildChip(FRESH), 'the same tree at two build times is distinguishable in the chip');
ok(buildNote(STALE) !== buildNote(FRESH), 'and in the run report');
eq(buildChip(STALE), 'p3-buildid 08-24 09:12Z', 'a two-day-old bundle reads as two days old');

// Both fields reach a reader on both surfaces. Asserted as coverage rather than by eye, because the
// chip deliberately shows less than the note and it would be easy to drop a field from one of them.
for (const [surface, text] of [['chip', buildChip(FRESH)], ['title', buildTitle(FRESH)], ['note', buildNote(FRESH)!]] as const) {
  ok(text.includes('p3-buildid'), `the ${surface} names the tree`);
  ok(text.includes('08-26'), `the ${surface} carries the build date`);
}

// =============================================================================================
console.log("6. the producer's format is the parser's contract");

// The seam this closes: nothing else compares `build.mjs`'s COMPOSITION to this module's parse.
// `build.mjs` asserts the identity it composed reached both bundles, and the sections above assert
// that a string of the documented shape renders — but a `build.mjs` that emitted `<path> <timestamp>`
// would satisfy both and reach a designer as `Deployed from commit /tmp/p3-buildid`. A source check,
// which is weak, and the only link available without running the plugin build from here.
/**
 * SCAN CODE, NOT COMMENTS — and this is the second thing #1100's review caught, after the first fix was
 * still not enough. `.includes('appendBuildNote(')` is satisfied by the identifier appearing in a COMMENT
 * inside the body, and the realistic way this defect returns is not a deletion but a temporary disable
 * that never got re-enabled:
 *
 *     const postVerdict = (m: …): void =>
 *       // summary: appendBuildNote(m.summary, PRISM3_BUILD) — disabled while debugging
 *       postToUi({ ...m });
 *
 * Measured on exactly that source: `build`, `typecheck`, `test:verdict` (128/128) and this file (70/70)
 * were ALL GREEN with the headline promise deleted. So every scan below reads stripped source.
 *
 * WHY A CHARACTER SCAN RATHER THAN `lint-voice.ts`'s `stripLineComments`, which is this repo's existing
 * answer and is deliberately narrower — it blanks only WHOLE-LINE `//` comments and leaves a mid-line
 * `//` alone, because its subject is a built bundle where a greedy pass would delete a URL inside a
 * string. Both halves of that reasoning invert here: the subject is a small TypeScript source, and a
 * whole-line pass would miss the trailing-comment form (`postToUi({ ...m }); // appendBuildNote(…) off`),
 * which leaves exactly the hole this fix is for. Tracking quote state is what makes the greedy pass safe,
 * so the `//`-in-a-string hazard `stripLineComments`'s header records is handled rather than avoided.
 *
 * The failure direction is loud, not silent: an odd quote outside a string (a regex literal carrying a
 * `"`, say) puts the scan into string mode and can hide a real call — which makes an assertion FAIL, not
 * pass. SELF_CHECK below pins the four boundaries on synthetic input, so the stripper is asserted rather
 * than trusted before it is pointed at a real file.
 */
const stripComments = (src: string): string => {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && d === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      out += c; i += 1;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') { out += src[i]; i += 1; }
        out += src[i]; i += 1;
      }
      out += src[i] ?? ''; i += 1; continue;
    }
    out += c; i += 1;
  }
  return out;
};

// SELF_CHECK — the stripper's own correctness, on input written here rather than read from the tree.
// Without these, a stripper that returned `''` would make every scan below pass over nothing, which is
// the empty-corpus failure docs/34 records as this repo's most-repeated (see the floor assertion above).
ok(!stripComments('a\n  // appendBuildNote(x)\nb').includes('appendBuildNote'),
  'stripComments removes a whole-line comment — the reviewer\'s mutation');
ok(!stripComments('code(); // appendBuildNote(x) disabled').includes('appendBuildNote'),
  'and a TRAILING comment, which a whole-line pass would miss');
ok(stripComments('code(); // gone').includes('code();'),
  'while the code before it survives');
ok(!stripComments('a /* appendBuildNote(x) */ b').includes('appendBuildNote'),
  'and a block comment goes too');
ok(stripComments("const u = 'https://example.com/a'").includes('https://example.com/a'),
  "but a // INSIDE a string survives — the hazard lint-voice's stripLineComments avoids by staying narrow");
ok(stripComments('keep(1);\nkeep(2);').includes('keep(1);\nkeep(2);'),
  'and comment-free source is returned unchanged');

const HERE = dirname(fileURLToPath(import.meta.url));
const buildMjs = stripComments(readFileSync(resolve(HERE, '../plugin/build.mjs'), 'utf8'));
ok(buildMjs.includes('`${BUILT_AT} ${treeToken(TREE)}`'),
  'apps/plugin/build.mjs composes the identity as timestamp-then-space-then-token, the order parsed above');
// #1117 instance 2 — the token is DERIVED from the tree path, never the path. `dist/` is imported into
// Figma, so an absolute path there ships a developer's directory layout (and usually a username) and
// makes the build non-reproducible: two checkouts of one commit emit different bytes.
//
// A SOURCE SCAN, and deliberately the WEAKER of the two checks — it can only see this one composition
// site, so a path arriving by another route is invisible to it. The check that actually holds the
// property is `assertNoAbsolutePath` in `build.mjs`, which reads the EMITTED BUNDLE and fails the
// build. This assertion exists because that one runs only when a build runs, and because a reviewer
// reading this file should see the rule stated where the composition is asserted.
ok(!buildMjs.includes('`${BUILT_AT} ${TREE}`'),
  '#1117: the composed identity is not the bare absolute tree path');
ok(/BUILT_AT\s*=[^\n]*toISOString/.test(buildMjs),
  "and BUILT_AT is an ISO string, which is what the chip's MM-DD HH:MM slice assumes");

// EVERY TERMINAL VERDICT GOES THROUGH `postVerdict`, so none can omit the clause. `postVerdict` exists
// to make that structural, and by itself it does not: `postToUi` is still in scope, so a seventh verdict
// site could post directly and compile. This is the check that closes it, and it is a source scan because
// the alternative — narrowing `postToUi`'s own parameter — would exclude `postVerdict`'s own body from
// calling it. `test-build-verdict.mjs` cannot cover this: it drives the built `dist/ui.html` with
// synthetic messages, so it sees what the UI renders and never what the main thread chose to send.
const pluginMain = stripComments(readFileSync(resolve(HERE, '../plugin/src/main.ts'), 'utf8'));
const VERDICT_TYPES = ["type: 'apply-result'", "type: 'component-result'"];
for (let i = pluginMain.indexOf('postToUi('); i >= 0; i = pluginMain.indexOf('postToUi(', i + 1)) {
  // 120 characters reaches past `postToUi({` + a newline + indentation to the `type:` field on the next
  // line, which is how the multi-line verdict sites in that file are formatted.
  const call = pluginMain.slice(i, i + 120);
  for (const t of VERDICT_TYPES) {
    ok(!call.includes(t), `no postToUi(...) posts ${t} directly — every verdict goes through postVerdict (offset ${i})`);
  }
}

// A FLOOR, because the scan above passes trivially over a file with no verdict sites at all — a clean
// report over an empty corpus is the failure this repo has hit most often (docs/34).
const verdictSites = pluginMain.split('postVerdict({').length - 1;
ok(verdictSites >= 6, `apps/plugin/src/main.ts posts at least 6 verdicts through postVerdict (measured ${verdictSites})`);

// AND EACH READER, BY NAME — a ROUTING check cannot see the routed-to body go empty.
//
// The scan above proves every verdict passes through one function. It says nothing about what that
// function does, and #1100's reviewer proved the gap by mutation: strip `appendBuildNote` out of
// `postVerdict` and this PR's headline promise — the identity on every verdict — is deleted with
// `build`, `typecheck`, `test:verdict` and this file all still green. `assertIdentity` cannot catch it
// either, because the boot log's surviving reference is all esbuild needs to substitute the define, so
// the string still reaches the bundle while no verdict carries it. Same asymmetry in the other
// direction for the boot log. Two readers, so two assertions, each naming its own surface.
const readerBody = (decl: string, label: string): string => {
  const at = pluginMain.indexOf(decl);
  ok(at > 0, `apps/plugin/src/main.ts still has ${label}`);
  return at < 0 ? '' : pluginMain.slice(at, pluginMain.indexOf('\n\n', at));
};

const verdictReader = readerBody('const postVerdict =', "the verdict reader (`const postVerdict =`)");
ok(verdictReader.includes('appendBuildNote('), "postVerdict's own body appends the build note — the promise is 'every verdict', not 'every verdict is routed'");
ok(verdictReader.includes('PRISM3_BUILD'), 'and appends THIS build\'s identity rather than a literal');

const bootReader = readerBody('console.log(`[prism3 #836]', 'the boot log line');
ok(bootReader.includes('buildNote(PRISM3_BUILD)'), 'the boot log reports the identity — the channel that was actually being read on 2026-08-26');

// WHAT THESE TWO DO NOT DO, stated so a green run is not read as more than it is: they are SOURCE
// scans. Nothing here executes `postVerdict`, because `apps/plugin/src/main.ts` calls `figma.showUI`
// at import time and cannot load outside the sandbox — the same reason the two #474 `title` strings
// were unassertable until they moved into this module. A behavioral check needs main.ts to be
// importable under a shim, which is a restructuring rather than an assertion: filed as #1106.

// =============================================================================================
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
