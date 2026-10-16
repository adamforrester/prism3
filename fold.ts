/**
 * Prism3 — THE FOLD (#1807). The one writer of the lines every PR used to write.
 *
 *   npx tsx fold.ts             # fold everything pending, then regen
 *   npx tsx fold.ts --dry-run   # print the plan, write nothing
 *
 * WHY THIS EXISTS. Every PR used to write the same four places: the `ENGINE_VERSION` line, a changelog
 * entry in the comment above it (now `packages/engine/CHANGELOG.md`, Q319.3), the top of `docs/00-progress.md`, and the version stamp in every
 * emitted tree. So every open PR conflicted with every other, and merges ran one at a time (#1807
 * replayed 40 merges: 40 of 40 pairs conflicted, 35 of them only on those lines). Now a PR carries its
 * own FILES instead, and this script is the only thing that writes those lines:
 *
 *   · a change note  `packages/engine/changes/<slug>.md` — front matter `engine: patch|minor|major`,
 *     then the changelog prose. It DECLARES the bump class; it never picks a number.
 *   · a progress fragment  `docs/progress/pending/<slug>.md` — one entry, headed
 *     `## (YYYY-MM-DD) — <title>`, exactly as it would have gone at the top of the log.
 *
 * WHAT A FOLD DOES, in this order, and it validates everything before it writes anything:
 *
 *   1. Lists the pending notes and fragments. None → prints "nothing to fold" and exits 0, so running
 *      it twice is harmless (the second run lands here).
 *   2. Refuses unless the tree is clean and HEAD is on `origin/main`'s history — merge order is read
 *      from HEAD's first-parent history, and a HEAD with commits of its own would order by them.
 *   3. Orders every pending file by the first-parent commit that ADDED it: merge order. With squash
 *      merges that commit is the PR's own merge.
 *   4. ONE VERSION PER FOLD (the technical call #1807 left open, taken here): `next` = the current
 *      `ENGINE_VERSION` bumped once, by the HIGHEST level any note declares. A version names a state
 *      that existed on `main` and was stamped into every emitted tree by this fold's regen. One number
 *      per note would mint numbers no build ever ran as, and no artifact ever carried.
 *   5. Writes the constant in `version.ts`, and the fold's changelog section directly below the FOLD
 *      MARKER in `packages/engine/CHANGELOG.md` (newest fold first; each note under it, newest merge
 *      first). The changelog lived in a comment above the constant until Q319.3 moved it out verbatim.
 *   6. Prepends the fragments to `docs/00-progress.md` below its intro, newest merge first (older entries are
 *      archived under `docs/progress/archive/` by a pure move, #2583; the fold never writes there). Each
 *      entry's heading date becomes the UTC date its fragment LANDED on `main`, so the log reads in
 *      merge order and its dates stay non-increasing (the #1104 / #1170 same-day order, settled by a
 *      real oracle rather than by whoever resolved the conflict).
 *   7. Substitutes `{{ENGINE_VERSION}}` in both kinds of file with the version this fold assigns — the
 *      number is unknown when a PR is written. And the same in the rename stamps (#1816): a rename rule's
 *      `since` in `MATERIALIZATION_RENAMES`, `MATERIALIZATION_DELETIONS` and `COLLECTION_RENAMES`, and
 *      `test.ts`'s literal tables for them, where a PR writes the placeholder as a quoted string
 *      (`fold-stamps.ts`). A pending stamp with no pending note is refused: the version would not move.
 *   8. When the version moved, writes the RELEASE NOTES for it (#2650): `docs/public/releases/<next>.md` and
 *      `.json`, and the version's entry in `index.md` and `index.json` there. `packages/engine/release-notes.ts`
 *      reads the four committed records (the Figma sets, their surface digests, the coded components, the token
 *      contract) at the commit that set the current version and in this tree, classifies each change as
 *      breaking, new or fix, and carries this fold's notes verbatim under "In detail". Computed in the plan,
 *      before anything is written, so a version whose records cannot be read is refused like any other problem.
 *   9. Deletes what it folded, and runs `regen.ts` when the version moved, so the stamps follow. Then writes the
 *      release notes again over the regenerated tree, so they describe what the fold commit holds.
 *
 * THE GATES DO NOT CALL THIS FILE, AND MUST NOT (docs/34 shape 2). `lint-emission-version.ts` checks
 * that a fold's version is the exact next one and that every deleted note's prose landed under it;
 * `lint-progress-order.ts` checks that every folded fragment's entry is in the log, in landing order,
 * at its landing date. Both re-derive those facts from git with their own code. Merge order is the
 * one input they share with this script (shape 17's shared ancestor), and that is acceptable only
 * because it is ground truth — the actual order `main` recorded — rather than something derived.
 *
 * IT DOES NOT BRANCH, COMMIT OR OPEN A PR. It writes the tree and prints what to do next; the steps
 * are in `CONTRIBUTING.md` ("How to fold").
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAMP_FILES, fillStamps } from './fold-stamps';
import { RELEASES_DIR, buildRelease, foldCommits, writeRelease, type Release } from './packages/engine/release-notes';

const repo = dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = 'packages/engine/changes';
const FRAGMENTS_DIR = 'docs/progress/pending';
const VERSION_FILE = 'packages/engine/version.ts';
/** The engine changelog, moved out of `version.ts` verbatim (Q319.3). Plain Markdown lines, no comment prefix. */
const CHANGELOG_FILE = 'packages/engine/CHANGELOG.md';
const LOG_FILE = 'docs/00-progress.md';
/** Where older entries move, out of the log (#2583). Read only for the newest entry's date; never written. */
const ARCHIVE_DIR = 'docs/progress/archive';
/** The line in `CHANGELOG.md` the fold writes directly below. Matched as a PREFIX, so the rest of the
 *  line may be reworded without breaking the fold; the gate matches the same prefix independently. */
const MARKER_PREFIX = '── FOLDED CHANGE NOTES (#1807)';
const PLACEHOLDER = /\{\{ENGINE_VERSION\}\}/g;
const LEVELS = ['patch', 'minor', 'major'] as const;
type Level = typeof LEVELS[number];

const dryRun = process.argv.includes('--dry-run');

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};

const refuse = (lines: string[]): never => {
  console.error(`\n✗ fold refused — ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  console.error('\n  Nothing was written.');
  process.exit(1);
};

const pendingIn = (dir: string): string[] => {
  const abs = join(repo, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => `${dir}/${f}`);
};

// ---- 1. what is pending ------------------------------------------------------------------------
const notePaths = pendingIn(NOTES_DIR);
const fragmentPaths = pendingIn(FRAGMENTS_DIR);

console.log(`Fold (#1807)${dryRun ? ' — DRY RUN, nothing will be written' : ''}`);
console.log(`  pending: ${notePaths.length} change note(s) in ${NOTES_DIR}/, ${fragmentPaths.length} progress fragment(s) in ${FRAGMENTS_DIR}/`);

if (!notePaths.length && !fragmentPaths.length) {
  console.log('  ✓ nothing to fold. The tree is already folded; running this again changes nothing.');
  process.exit(0);
}

// ---- 2. preconditions --------------------------------------------------------------------------
if (!dryRun) {
  const st = git('status', '--porcelain');
  if (!st.ok) refuse(['`git status` failed.', `    ${st.err}`]);
  if (st.out.trim())
    refuse([
      'the working tree is not clean.',
      ...st.out.trim().split('\n').slice(0, 12).map((l) => `    ${l}`),
      '',
      '  A fold must be its own commit on top of `main`, so the diff shows exactly what it wrote.',
      '  Commit or stash first, or pass --dry-run to see the plan.',
    ]);
}
const onMain = git('merge-base', '--is-ancestor', 'HEAD', 'origin/main');
if (!onMain.ok)
  refuse([
    'HEAD is not on origin/main\'s history.',
    '',
    '  Merge order is read from HEAD\'s first-parent history, so HEAD must be a commit of `main` itself:',
    '  `git fetch origin main && git switch -c fold/<date> origin/main`, then run this again. A fold',
    '  branch that already merged main in cannot be refolded; land it and start a fresh fold.',
  ]);

// A SHALLOW clone whose history stops after the pending directory was introduced shows every file at
// its boundary commit as ADDED there, which would order the whole batch as one merge. Refuse that case.
if (git('rev-parse', '--is-shallow-repository').out.trim() === 'true') {
  const oldest = git('rev-list', '--first-parent', 'HEAD').out.trim().split('\n').pop() ?? '';
  if (git('ls-tree', '--name-only', oldest, '--', FRAGMENTS_DIR + '/').out.trim())
    refuse(['this shallow clone does not reach the commit that introduced ' + FRAGMENTS_DIR + '/, so merge order cannot be read.', '  `git fetch --unshallow`, then run this again.']);
}

// ---- 3. merge order ----------------------------------------------------------------------------
//
// One walk of HEAD's first-parent history, newest first, keeping each path's NEWEST add (a slug that
// was folded and later reused is ordered by its second arrival). `%cI` is the committer date, which a
// squash merge sets to the moment it landed.
type Landing = { sha: string; iso: string; day: string; seq: number };
const landing = new Map<string, Landing>();
{
  const log = git('log', '--first-parent', '--diff-filter=A', '--no-renames', '--format=%x00%H %cI', '--name-only', 'HEAD', '--', NOTES_DIR, FRAGMENTS_DIR);
  if (!log.ok) refuse(['`git log` failed while reading merge order.', `    ${log.err}`]);
  let seq = 0;
  for (const rec of log.out.split('\0').filter((r) => r.trim())) {
    const [head, ...files] = rec.split('\n').map((s) => s.trim()).filter(Boolean);
    const [sha, iso] = head.split(' ');
    for (const f of files)
      if (!landing.has(f)) landing.set(f, { sha, iso, day: new Date(iso).toISOString().slice(0, 10), seq });
    seq++;
  }
}
const unlanded = [...notePaths, ...fragmentPaths].filter((p) => !landing.has(p));
if (unlanded.length)
  refuse([
    `${unlanded.length} pending file(s) were never added by a commit on HEAD's first-parent history.`,
    ...unlanded.map((p) => `    ${p}`),
    '',
    '  Merge order is the order those commits appear, so a file with no such commit cannot be placed.',
    '  If it is untracked, it does not belong to a merged PR; move it out of the directory.',
  ]);
/** Newest merge first: the smaller `seq` is the more recent commit. */
const byMergeNewestFirst = (a: string, b: string): number => landing.get(a)!.seq - landing.get(b)!.seq;

// ---- 4. parse and validate ---------------------------------------------------------------------
type Note = { path: string; slug: string; level: Level; prose: string };
type Fragment = { path: string; slug: string; title: string; body: string };
const problems: string[] = [];
const slugOf = (p: string): string => p.slice(p.lastIndexOf('/') + 1, -'.md'.length);

const notes: Note[] = [];
for (const path of [...notePaths].sort(byMergeNewestFirst)) {
  const src = readFileSync(join(repo, path), 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\nengine:[ \t]*(\S+)[ \t]*\n---\n([\s\S]*)$/.exec(src);
  if (!m) { problems.push(`${path}: front matter is not exactly \`---\` / \`engine: <level>\` / \`---\``); continue; }
  const level = m[1] as Level;
  if (!LEVELS.includes(level)) { problems.push(`${path}: \`engine: ${m[1]}\` — the level is one of ${LEVELS.join(' | ')}. A change that owes no bump carries no note.`); continue; }
  const prose = m[2].trim();
  if (!prose) { problems.push(`${path}: no changelog prose after the front matter`); continue; }
  if (prose.replace(PLACEHOLDER, '').includes('{{')) { problems.push(`${path}: a \`{{\` other than the version placeholder, which would reach the changelog unsubstituted`); continue; }
  // After substitution, not before: `{{ENGINE_VERSION}} — …` becomes `0.216.0 — …`, a heading.
  const semverLead = prose.replace(PLACEHOLDER, '9.9.9').split('\n').find((l) => /^\s*\d+\.\d+\.\d+\s*[—:-]/.test(l));
  if (semverLead) { problems.push(`${path}: a line opens with a version number or the placeholder (\`${semverLead.trim().slice(0, 40)}…\`), which reads as a changelog heading once folded`); continue; }
  notes.push({ path, slug: slugOf(path), level, prose });
}

const HEADING_RE = /^## \((\d{4}-\d{2}-\d{2})\) — (.+?)\s*$/;
const fragments: Fragment[] = [];
for (const path of [...fragmentPaths].sort(byMergeNewestFirst)) {
  const src = readFileSync(join(repo, path), 'utf8').replace(/\r\n/g, '\n').trim();
  const lines = src.split('\n');
  const h = HEADING_RE.exec(lines[0] ?? '');
  if (!h) { problems.push(`${path}: the first line is not a \`## (YYYY-MM-DD) — <title>\` heading`); continue; }
  if (lines.slice(1).some((l) => l.startsWith('## '))) { problems.push(`${path}: a second \`## \` heading — a fragment is ONE entry`); continue; }
  if (src.replace(PLACEHOLDER, '').includes('{{')) { problems.push(`${path}: a \`{{\` other than the version placeholder, which would reach the log unsubstituted`); continue; }
  if (h[2].includes('{{')) { problems.push(`${path}: the heading carries a placeholder; only the body may`); continue; }
  fragments.push({ path, slug: slugOf(path), title: h[2], body: lines.slice(1).join('\n') });
}
if (problems.length) refuse([`${problems.length} pending file(s) are malformed.`, ...problems.map((p) => `    ${p}`)]);

// ---- 5. the version ----------------------------------------------------------------------------
const versionPath = join(repo, VERSION_FILE);
const versionSrc = readFileSync(versionPath, 'utf8');
const CONSTANT_RE = /^export const ENGINE_VERSION = '(\d+)\.(\d+)\.(\d+)';$/m;
const cm = CONSTANT_RE.exec(versionSrc);
if (!cm) refuse([`cannot find \`export const ENGINE_VERSION = 'X.Y.Z';\` in ${VERSION_FILE}.`]);
const [maj, min, pat] = [Number(cm![1]), Number(cm![2]), Number(cm![3])];
const current = `${maj}.${min}.${pat}`;
const level: Level | null = notes.length
  ? notes.reduce<Level>((hi, n) => (LEVELS.indexOf(n.level) > LEVELS.indexOf(hi) ? n.level : hi), 'patch')
  : null;
const next =
  level === 'major' ? `${maj + 1}.0.0`
  : level === 'minor' ? `${maj}.${min + 1}.0`
  : level === 'patch' ? `${maj}.${min}.${pat + 1}`
  : current;
if (level === 'major' && maj === 0)
  refuse([
    `a change note declares \`engine: major\` while ENGINE_VERSION is ${current}.`,
    ...notes.filter((n) => n.level === 'major').map((n) => `    ${n.path}`),
    '',
    '  Going to 1.0 is the owner\'s decision, not a side effect of a fold. The policy while ENGINE is 0.x is',
    '  `minor` for any behavior change and `patch` only when no committed artifact moved.',
  ]);
const fill = (s: string): string => s.replace(PLACEHOLDER, next);

// ---- 5b. the rename stamps (#1816) -------------------------------------------------------------
// A pending stamp names the version this fold assigns, so a fold that assigns none cannot fill it: the
// rule would read as shipped in a version that did not have it.
const stamps = STAMP_FILES.map((path) => {
  const src = readFileSync(join(repo, path), 'utf8');
  return { path, src, ...fillStamps(src, next) };
}).filter((s) => s.count > 0);
if (stamps.length && next === current)
  refuse([
    `${stamps.reduce((n, s) => n + s.count, 0)} rename stamp(s) read '{{ENGINE_VERSION}}', and no change note is pending, so the version would not move.`,
    ...stamps.map((s) => `    ${s.path}: ${s.count}`),
    '',
    '  A pending stamp names the version this fold assigns, and with no note this fold assigns none. The PR',
    '  that wrote the stamp was required to add a note in the same diff (`lint-emission-version.ts`, NOTE WITH',
    '  THE STAMP), so that note was folded without filling this stamp, deleted, or never checked. Land a',
    '  change note in a PR of its own (`engine: minor` for the rule that PR added), then fold again.',
  ]);
const today = new Date().toISOString().slice(0, 10);

// ---- 5c. the release notes (#2650) -------------------------------------------------------------
// From the commit that set the current version (the last fold) to this tree, which is HEAD: the fold runs on a
// clean tree, and nothing it writes moves a record the notes read.
let release: Release | null = null;
if (next !== current) {
  const base = foldCommits().get(current);
  if (!base)
    refuse([
      `no commit on HEAD's first-parent history sets ENGINE_VERSION to ${current}, so the release notes have no start.`,
      '  The notes for a version read the records at the fold before it. A HEAD on `main` always has that commit.',
    ]);
  try {
    release = await buildRelease({ version: next, from: current, base: base!, head: null, notes: notes.map((n) => ({ slug: n.slug, level: n.level, prose: fill(n.prose) })), date: today });
  } catch (e) {
    refuse([`the release notes for ${next} cannot be read: ${(e as Error).message}.`]);
  }
}

// ---- 6. the changelog section ------------------------------------------------------------------
const changelogPath = join(repo, CHANGELOG_FILE);
const changelogSrc = readFileSync(changelogPath, 'utf8');
let newVersionSrc = versionSrc;
let newChangelogSrc = changelogSrc;
if (notes.length) {
  const lines = changelogSrc.split('\n');
  const at = lines.findIndex((l) => l.startsWith(MARKER_PREFIX));
  if (at < 0)
    refuse([
      `the fold marker is missing from ${CHANGELOG_FILE} — no line starts with \`${MARKER_PREFIX}\`.`,
      '',
      '  It sits above the newest fold, and it is where every fold writes. Restore it rather than',
      '  choosing a new place: the gate looks for it too.',
    ]);
  // Skip the marker line and the blank spacer beneath it; the section goes straight after.
  const insertAt = lines[at + 1]?.trim() === '' ? at + 2 : at + 1;
  const section: string[] = [
    `${next} — folded ${today} from ${notes.length} change note${notes.length === 1 ? '' : 's'}, newest merge first.`,
    '',
  ];
  for (const n of notes) {
    const body = fill(n.prose).split('\n');
    body[0] = `[${n.slug} · ${n.level} · ${landing.get(n.path)!.sha.slice(0, 8)}] ${body[0]}`;
    for (const l of body) section.push(l.trim() ? l.replace(/\s+$/, '') : '');
    section.push('');
  }
  lines.splice(insertAt, 0, ...section);
  newChangelogSrc = lines.join('\n');
  newVersionSrc = versionSrc.replace(CONSTANT_RE, `export const ENGINE_VERSION = '${next}';`);
}

// ---- 7. the progress log -----------------------------------------------------------------------
const logPath = join(repo, LOG_FILE);
const logSrc = readFileSync(logPath, 'utf8');
let newLogSrc = logSrc;
if (fragments.length) {
  const logLines = logSrc.split('\n');
  const rule = logLines.findIndex((l) => l.trim() === '---');
  if (rule < 0) refuse([`${LOG_FILE} has no \`---\` rule below its intro; the fold inserts directly beneath it.`]);
  // The newest entry: the log's top one, or, if a move archived every entry, the newest archive file's (#2583).
  const archived = existsSync(join(repo, ARCHIVE_DIR))
    ? readdirSync(join(repo, ARCHIVE_DIR)).filter((f) => f.endsWith('.md') && f !== 'README.md').sort().reverse()
    : [];
  const topEntry = [logSrc, ...archived.map((f) => readFileSync(join(repo, ARCHIVE_DIR, f), 'utf8'))]
    .flatMap((s) => s.split('\n')).map((l) => HEADING_RE.exec(l)).find(Boolean);
  // Dates must stay non-increasing down the file, or the log's own date gate fails on the fold. A
  // committer clock that ran backwards, or a hand-written entry dated ahead, both land here.
  const days = fragments.map((f) => landing.get(f.path)!.day);
  for (let i = 1; i < days.length; i++)
    if (days[i] > days[i - 1])
      refuse([
        `landing dates run backwards: ${fragments[i].path} landed ${days[i]}, after ${fragments[i - 1].path} (${days[i - 1]}) by date but before it by merge order.`,
        '  A committer clock was skewed. Fold by hand for this batch, and record why in the fold PR.',
      ]);
  if (topEntry && days[days.length - 1] < topEntry[1])
    refuse([
      `the log's newest entry is dated ${topEntry[1]}, later than ${fragments[fragments.length - 1].path}'s landing date ${days[days.length - 1]}.`,
      '  An entry was written straight into the log with a date ahead of main. Correct its date first.',
    ]);
  const entries = fragments.map((f) => `## (${landing.get(f.path)!.day}) — ${f.title}\n${fill(f.body).replace(/\s+$/, '')}`);
  const block = ['', entries.join('\n\n---\n\n'), '', '---'];
  logLines.splice(rule + 1, 0, ...block);
  newLogSrc = logLines.join('\n');
}

// ---- report the plan ---------------------------------------------------------------------------
console.log(`  merge order read from HEAD ${git('rev-parse', '--short=8', 'HEAD').out.trim()}'s first-parent history`);
if (notes.length) {
  console.log(`\n  ENGINE_VERSION ${current} → ${next} (${level}, the highest level declared; one version per fold)`);
  for (const n of notes) console.log(`    ${n.level.padEnd(5)} ${n.slug}  (landed ${landing.get(n.path)!.sha.slice(0, 8)}, ${landing.get(n.path)!.day})`);
} else {
  console.log(`\n  ENGINE_VERSION stays ${current} — no change notes pending`);
}
if (stamps.length) {
  console.log(`\n  rename stamps: '{{ENGINE_VERSION}}' → '${next}'`);
  for (const s of stamps) console.log(`    ${s.path}: ${s.count}`);
}
if (release) {
  const c = release.counts;
  console.log(`\n  release notes: ${RELEASES_DIR}/${next}.md and .json — ${c.breaking} breaking, ${c.new} new, ${c.fix} fix${c.fix === 1 ? '' : 'es'}, ${release.notes.length} change note${release.notes.length === 1 ? '' : 's'}`);
  for (const i of release.items.filter((x) => x.class === 'breaking')) console.log(`    breaking: ${i.text}`);
}
if (fragments.length) {
  console.log(`\n  ${LOG_FILE}: ${fragments.length} entr${fragments.length === 1 ? 'y' : 'ies'} on top, newest merge first`);
  for (const f of fragments) console.log(`    (${landing.get(f.path)!.day}) — ${f.title.length > 90 ? `${f.title.slice(0, 89)}…` : f.title}`);
}

if (dryRun) {
  console.log('\n  --dry-run: nothing written.');
  process.exit(0);
}

// ---- 9. write, delete, regen -------------------------------------------------------------------
if (newVersionSrc !== versionSrc) writeFileSync(versionPath, newVersionSrc);
if (newChangelogSrc !== changelogSrc) writeFileSync(changelogPath, newChangelogSrc);
if (newLogSrc !== logSrc) writeFileSync(logPath, newLogSrc);
for (const s of stamps) writeFileSync(join(repo, s.path), s.out);
const releaseFiles = release ? writeRelease(release) : [];
for (const p of [...notePaths, ...fragmentPaths]) unlinkSync(join(repo, p));
console.log(`\n  wrote ${[newVersionSrc !== versionSrc && VERSION_FILE, newChangelogSrc !== changelogSrc && CHANGELOG_FILE, newLogSrc !== logSrc && LOG_FILE, ...stamps.map((s) => s.path), ...releaseFiles].filter(Boolean).join(', ')}; deleted ${notePaths.length + fragmentPaths.length} pending file(s)`);

if (next !== current) {
  console.log('  running regen.ts so every emitted stamp reads the new version …');
  const r = spawnSync('npx', ['tsx', 'packages/engine/regen.ts'], { cwd: repo, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('\n✗ regen.ts failed AFTER the fold was written. The fold itself is complete; fix the');
    console.error('  failure and run `npx tsx packages/engine/regen.ts` by hand. Do not rerun the fold:');
    console.error('  nothing is pending any more, so it would report "nothing to fold".');
    if (release) console.error(`  Then \`npx tsx packages/engine/release-notes.ts --refresh\`, so ${RELEASES_DIR}/${next}.md reads the regenerated tree.`);
    process.exit(1);
  }
  // The notes again, over the tree regen just wrote: they name what this fold ships, and a record regen moved
  // (a committed artifact that disagreed with the code) would otherwise be described as it was before.
  if (release) {
    release = await buildRelease({ version: next, from: current, base: release.base, head: null, notes: release.notes, date: today });
    writeRelease(release);
    console.log(`  ${RELEASES_DIR}/${next}.md rewritten over the regenerated tree — ${release.counts.breaking} breaking, ${release.counts.new} new, ${release.counts.fix} fix${release.counts.fix === 1 ? '' : 'es'}`);
  }
}

console.log(`
✓ folded. Next, by hand (CONTRIBUTING.md, "How to fold"):
    git add -A && git commit -m "Fold: ENGINE_VERSION ${next}"
    npm run verify
    push, and open the fold PR. Its CI is the first run of every gate over main plus this whole batch.`);
