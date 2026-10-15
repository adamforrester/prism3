/**
 * PROGRESS-LOG ORDER GATE (#931) — `docs/00-progress.md` is newest-entry-first by convention, and
 * nothing checks it.
 *
 *   npx tsx packages/engine/lint-progress-order.ts
 *
 * ── THE GAP THIS CLOSES ─────────────────────────────────────────────────────────────────────────
 *
 * A rebase or a merge routinely lands the incoming progress entry SECOND, because git merges the
 * two entries cleanly — different lines, no textual conflict, nothing reports anything. Three
 * occurrences in 24 hours across two lanes (#931), all caught only because a human happened to
 * notice and moved the entry back to the top by hand.
 *
 * Not because nobody wrote a gate for this file — it is exempt from every one that touches it
 * (`lint-advisory-expiry.ts`, `lint-decisions-index.ts`, `lint-layout-claims.ts`,
 * `lint-shape-index.ts`, `lint-voice.ts`), and every exemption is correct: the file is an
 * append-only dated log, so an entry describing the repo as it was in July is accurate prose
 * forever, and holding it to a present-tense standard would force it to falsify itself. That
 * argument is about CONTENT. It was applied file-wide, so it also covered ORDERING — a structural
 * property none of those five gates was ever asking about. Same species of gap as
 * `docs/43-agent-instruction-surface.md` §3 found in two of `CLAUDE.md`'s own three "pinned"
 * regions: a check built to answer one narrow question reads, from the outside, like coverage of
 * the whole file, and the property nobody was asking about falls through in plain sight. A file
 * that accumulates a genre exemption in gate after gate is worth a second look at what ELSE lives
 * in it besides the content those exemptions were written for.
 *
 * ── WHY THIS ONE IS GATEABLE, UNLIKE #923's CLASS ───────────────────────────────────────────────
 *
 * #923 argues some hazards fire during a shell command with no tree state to assert against. This
 * is the opposite case: the ordering of a committed markdown file IS tree state, present in every
 * checkout, checkable offline with no host and no shell.
 *
 * ── THE CHECK, AND THE docs/34 SHAPE-1 TEST IT HAS TO PASS ─────────────────────────────────────
 *
 * EXPECTED is `sorted(dates, descending)` — a genuine transformation of the parsed dates, computed
 * by this file's own sort, never a re-read of the file re-labeled. ACTUAL is the dates as they
 * appear in the file, in heading order. When the file is correctly ordered the two are already
 * equal and the gate passes; when an entry lands out of place they differ at the first point of
 * disagreement and the gate fails, naming every subsequent point of disagreement too. That is the
 * shape-1 test (docs/34 #1: "the gate reads the declaration it is checking") — EXPECTED is DERIVED
 * from ACTUAL by an operation that can produce a different sequence, not restated from it, so this
 * cannot be "simplified" into comparing the file to itself without silently deleting the check.
 * Ties sort stably (Array.prototype.sort is stable since ES2019), so same-day entries keep their
 * original relative order rather than being treated as a violation of each other.
 *
 * ── THE PARSE FLOOR (docs/34 shape 9) ───────────────────────────────────────────────────────────
 *
 * If `HEADING_RE` matches zero lines, the gate FAILS rather than reporting a vacuous pass — the
 * same discipline `lint-doc-gates.ts`'s region floor uses, and the same failure mode it exists to
 * refuse. A future reformatting of the heading (a different dash, a dropped parenthesis) that stops
 * matching must go red and say so, not pass silently over nothing.
 *
 * ── WHAT THIS DOES NOT CHECK, STATED PLAINLY SO A GREEN RUN IS NOT READ AS MORE THAN IT IS ───────
 *
 * The date arm proves one structural property: the dated headings appear in non-increasing date
 * order. (That an entry is PRESENT for a PR is checked since #1807 — the CARRIES AN ENTRY arm below —
 * but only that a fragment file exists, not what it says.) Nothing here checks that an entry is correct, that the stated date is
 * the real date the work happened, or that an entry's content matches what shipped. A rebase that
 * silently drops a whole entry, or backdates one to dodge this check, is invisible here — that is
 * prose, and review is its only guard, same limit `lint-decisions-index.ts`'s header states for its
 * own doc.
 *
 * ── SCOPE ────────────────────────────────────────────────────────────────────────────────────────
 *
 * `docs/00-progress.md`, per #931, plus its pending fragments since #1807 (`docs/progress/pending/`,
 * the same log before it is folded), plus its archive since #2583 (`docs/progress/archive/`, the same log
 * after it is moved out: the log, then each archive file newest first, read as ONE sequence by every arm,
 * so an archived entry is still date-ordered and still found by title) — other append-only dated logs (`_research/_inbound/` in the
 * knowledge-base repo has the same genre) are out of scope and were explicitly left there rather
 * than folded in.
 *
 * The heading pattern is deliberately narrow: `## (YYYY-MM-DD) — <title>`, the convention every
 * entry since this file adopted per-entry headings has used. Older headings that predate that
 * convention (`## Latest (2026-07-21) — ...`, `## 2026-07-03 — ...`, `## Current status
 * (2026-07-01)`, and non-dated section headings in the same historical tail) do not match and are
 * invisible to this gate BY CONSTRUCTION, not by an exemption list — they were never entries in the
 * sense this check parses, and widening the pattern to reach them is a different, undecided task.
 * With 398 real matches in the current file this scope choice does not starve the floor above.
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): two entries transposed · the heading pattern
 * changed so it matches nothing (fails the floor, not silently) · appending a new entry at the top
 * with today's date (still passes — the positive control). See the PR for the mutation transcript.
 *
 * ── #1807: FRAGMENTS, AND THE ORDER THE DATE SORT COULD NEVER SEE ───────────────────────────────
 *
 * Since #1807 a PR does not write this file. It adds ONE entry as its own file,
 * `docs/progress/pending/<slug>.md`, and `fold.ts` later moves a batch of them to the top of the log,
 * newest MERGE first, each dated with the UTC day its fragment landed on `main`. Three arms follow:
 *
 *   FRAGMENT SHAPE — every pending fragment is one entry: its first line matches `HEADING_RE`, no second
 *                    `## ` heading, no `{{` placeholder in the heading, a plain lowercase file name. The
 *                    fold refuses a malformed fragment, so it fails here, at the PR that wrote it.
 *   FOLDED ENTRIES — every fragment that landed on `main`'s first-parent history (as HEAD reaches it) and is no longer pending
 *                    has an entry in the log: same title, dated the day it LANDED, and the folded entries
 *                    appear in the order they landed, newest first. This is #1104 / #1170's same-day
 *                    order with a real oracle at last: the date sort ties same-day entries and so can
 *                    never order them, and merge order can. It also catches a fold (or a merge
 *                    resolution) that deleted a pending fragment without its entry reaching the log.
 *   CARRIES AN ENTRY — every PR adds at least one fragment, except a FOLD (owner decision, 2026-09-30,
 *                    #1807 §7.3). SUBJECT: `git diff --name-status <merge base> HEAD -- docs/progress/pending`.
 *                    A fold is recognized by CONTENT, never by a branch name. FOLD-SHAPED: the diff deletes
 *                    a pending fragment or change note AND the FOLDED ENTRIES arm passed. PURE: it also
 *                    touches nothing a fold does not write (the log, the pending directories, version.ts,
 *                    CHANGELOG.md, out/, the release notes under docs/public/releases/ (#2650), and the three
 *                    rename-stamp files when their whole diff is the fold filling `'{{ENGINE_VERSION}}'` with
 *                    its version, #1816). Only a pure fold is exempt from carrying a fragment, so a fold PR that fixes a
 *                    semantic conflict carries one for the fix, and a normal PR cannot pass as a fold by
 *                    hand-moving another PR's fragment into the log. Skipped ONLY on a push run
 *                    (`GITHUB_EVENT_NAME=push`); anywhere else, a HEAD equal to its base or an
 *                    unresolvable base FAILS rather than printing n/a.
 *   ONE WRITER (log) — outside a fold-shaped diff, ANY change to the log fails, whether or not the diff
 *                    also carries a fragment: a new heading, and an edit to an existing entry too. A
 *                    correction travels as a fragment of its own. (Fold-shaped, not pure: a fold that also
 *                    fixes a semantic conflict still writes the log.)
 *   LEAVES NOTHING PENDING (#2663) — a diff that deletes a pending fragment or change note is a fold, and on
 *                    the tree it merges into no fragment or note is still pending, except one the diff adds
 *                    itself. A fold cut on one commit of `main` and merged on a later one left the later
 *                    commits' files pending, and every other arm passed it as a pure fold. The merged tree is
 *                    HEAD on CI's merge ref; on a branch, HEAD less what the base ref consumed since the
 *                    merge base, plus what it added; and HEAD over its first parent on a push run, which this
 *                    arm does NOT skip.
 *                    `test.ts` (f) runs it over a scratch history: a stale fold fails it on its branch, its
 *                    merge ref and its squash's push run; the fold re-cut on the moved main passes; so does
 *                    #1880's fixture (a), whose leftovers main's own fold consumed. MUTATIONS VERIFIED
 *                    (#2663, each fails a named (f) case): the arm returning early · the push-run call
 *                    removed · the base ref's additions dropped · main's consumption not subtracted (also
 *                    fails #1880 (a)).
 *   ALREADY IN THE LOG — a pending fragment whose title is already an entry heading fails: a fold wrote
 *                    the entry and left the fragment, which the next fold would write again.
 *   NO PLACEHOLDER — the log never carries a literal `{{`: a folded entry still holding `{{ENGINE_VERSION}}`
 *                    was not folded by `fold.ts` (#1823 review).
 *   ARCHIVE MOVE (#2583) — a diff that writes `docs/progress/archive/` is a PURE MOVE: the log and the archive,
 *                    read at the merge base and at HEAD as one sequence cut at every `## ` line, hold the
 *                    same sections in the same order, each byte-identical. Only the preamble above each file's
 *                    first `## ` line may differ. A dropped, duplicated, edited, reordered or added section
 *                    fails by name, and a pure move is the one diff besides a fold that ONE WRITER lets
 *                    change the log. MUTATIONS VERIFIED (#2583, each fails ARCHIVE MOVE by name): one archived
 *                    entry dropped · one duplicated · one byte changed inside one · two transposed. The same
 *                    move without the archive half (entries only deleted from the log) fails ONE WRITER.
 *
 * A shallow clone is accepted as long as it reaches the commit that introduced the pending directory;
 * past that boundary every file looks ADDED at once, and merge order would be invented, so it refuses.
 *
 * INDEPENDENCE (docs/34). The folded-entries arm's oracle is `git log --first-parent`, read here with
 * this file's own code. `fold.ts` reads the same history, which is shape 17's shared ancestor; it is
 * acceptable only because the ancestor is GROUND TRUTH — the order `main` actually recorded — not an
 * artifact anything derives. What this arm gates is everything between that history and the file: the
 * fold's ordering, its dating, its insertion and its deletion. Never import `fold.ts` here to "share the
 * parsing": that would gate the fold with the fold. The date arm stays exactly as it was, a second,
 * wholly independent check on the same file.
 *
 * The arm reads HEAD's first-parent history, and trusts a landing only where that history is `main`'s
 * own: a fragment counts when the commit that added it is on `main`'s first-parent chain (`origin/main`,
 * then `main`; HEAD itself on a push run, which is `main`). On a PR's merge ref (CI) the first parent IS
 * `main`, so every fragment `main` landed is seen. On a branch that merged `main` in, the fragments that
 * arrived through that merge are simply not seen — less coverage, never a false failure. Until #1880 the
 * code did not keep that promise: one merge of `main` carries every fragment `main` landed since the last
 * merge as ONE add, so they shared a landing commit, the tie fell back to file-name order, and a correct
 * fold failed locally (#1880; #1921 is the same tie, reached by a branch that merged `main` before and
 * after a fold). What the branch loses locally, CI's merge ref still checks.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAMP_PATHS, onlyFilledStamps } from './rename-stamp-audit';

const repo = join(import.meta.dirname, '../..');
const FILE = 'docs/00-progress.md';
const ARCHIVE = 'docs/progress/archive';
const HEADING_RE = /^## \((\d{4}-\d{2}-\d{2})\) — (.+?)\s*$/;
/** An archive file is named for the months it holds: `2026-09.md`, or `2026-07-08.md` for July and August. */
const ARCHIVE_NAME_RE = /^\d{4}-\d{2}(-\d{2})?\.md$/;
const isArchiveFile = (name: string): boolean => name.endsWith('.md') && name !== 'README.md';
/** The archive files, newest first: the order they continue the log in (#2583). */
const archiveFiles = (names: string[]): string[] => names.filter(isArchiveFile).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

type Entry = { file: string; line: number; date: string; title: string; ord: number };

// THE LOG AND ITS ARCHIVE ARE ONE SEQUENCE (#2583): the log, then each archive file newest first. Every arm
// below reads that sequence, so an entry moved to the archive is still ordered, still found by title, and
// still checked for a placeholder. `ord` is an entry's place in it, the order the folded-entries arm compares.
const archiveNow = existsSync(join(repo, ARCHIVE)) ? archiveFiles(readdirSync(join(repo, ARCHIVE))).map((f) => `${ARCHIVE}/${f}`) : [];
const sources = [FILE, ...archiveNow].map((file) => ({ file, src: readFileSync(join(repo, file), 'utf8') }));
const entries: Entry[] = [];
for (const { file, src } of sources)
  src.split('\n').forEach((line, i) => {
    const m = HEADING_RE.exec(line);
    if (m) entries.push({ file, line: i + 1, date: m[1], title: m[2], ord: entries.length });
  });

console.log('Progress-log order gate (#931)');

if (entries.length === 0) {
  console.error(
    `\n✗ PARSE FLOOR: 0 heading(s) matched ${HEADING_RE} in ${FILE} or ${ARCHIVE}/. Either the file has genuinely ` +
      `lost every dated entry (check by hand — it has not) or the heading format changed and this ` +
      `detector is looking at nothing. A pattern that stops matching must fail loudly, never pass ` +
      `over an empty set (docs/34 shape 9). Do not widen the pattern to make this pass — find out ` +
      `what changed and fix the mismatch.`,
  );
  process.exit(1);
}

const inLog = entries.filter((e) => e.file === FILE).length;
console.log(`  ${entries.length} dated entr${entries.length === 1 ? 'y' : 'ies'} found (${inLog} in ${FILE}, ${entries.length - inLog} in ${archiveNow.length} archive file(s))`);

const actual = entries.map((e) => e.date);
// EXPECTED: a real transformation of ACTUAL, not a restatement of it — descending, ties stable.
const expected = [...actual].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

const disagreements: number[] = [];
for (let i = 0; i < actual.length; i++) {
  if (actual[i] !== expected[i]) disagreements.push(i);
}

let failed = false;

// Diagnose in the units a human fixes: which entry sits below which, and by how much.
const outOfOrder: string[] = [];
for (let i = 1; i < entries.length; i++) {
  if (entries[i].date > entries[i - 1].date) {
    outOfOrder.push(
      `${entries[i].file}:${entries[i].line} — "(${entries[i].date}) — ${entries[i].title}" sits BELOW ` +
        `${entries[i - 1].file}:${entries[i - 1].line} — "(${entries[i - 1].date}) — ${entries[i - 1].title}", ` +
        `but ${entries[i].date} is a LATER date. Move the newer entry above the older one.`,
    );
  }
}

if (disagreements.length === 0) {
  console.log('  ✓ date order — every dated entry appears in descending date order.');
} else {
  failed = true;
  console.error(
    `\n✗ ${outOfOrder.length} entr${outOfOrder.length === 1 ? 'y' : 'ies'} out of order (${disagreements.length} ` +
      `position(s) disagree with the sorted sequence):\n`,
  );
  for (const o of outOfOrder) console.error(`  · ${o}\n`);
  console.error(
    '  Most rebases land the incoming entry second with no textual conflict — check `git log --oneline\n' +
      '  -1 docs/00-progress.md` on both sides of the merge and move the newer entry back to the top.\n',
  );
}

// ---- #1807 ---------------------------------------------------------------------------------------
const PENDING = 'docs/progress/pending';
/** Read only to recognize a fold that consumed notes, and to find one it left pending (#2663); `lint-emission-version.ts`
 *  owns everything else about them. */
const NOTES = 'packages/engine/changes';
const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};
const cannotRun = (why: string, detail: string): never => {
  console.error(`\n✗ CANNOT RUN — ${why}\n    ${detail}\n  An arm that cannot read its oracle fails rather than passing over nothing (docs/34 shape 9).`);
  process.exit(1);
};
const isFragment = (name: string): boolean => name.endsWith('.md') && name !== 'README.md';
/** A file of the log or its archive cut at every `## ` line: the preamble above the first is dropped, and each
 *  section's trailing blank lines and `---` separator are trimmed, since where a file ends is formatting. */
const sectionsOf = (text: string): string[] => {
  const out: string[] = [];
  let cur: string[] | null = null;
  const close = () => {
    if (!cur) return;
    while (cur.length > 1 && /^(---)?\s*$/.test(cur[cur.length - 1])) cur.pop();
    out.push(cur.join('\n'));
  };
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) { close(); cur = [line]; } else if (cur) cur.push(line);
  }
  close();
  return out;
};

// FRAGMENT SHAPE
const pendingNow = existsSync(join(repo, PENDING)) ? readdirSync(join(repo, PENDING)).filter(isFragment).sort() : [];
const shapeFails: string[] = [];
for (const f of pendingNow) {
  const where = `${PENDING}/${f}`;
  if (!/^[a-z0-9][a-z0-9._-]*\.md$/.test(f)) shapeFails.push(`${where}: the file name is not lowercase letters, digits, '.', '-' and '_' (use the branch name with '/' → '-')`);
  const lines = readFileSync(join(repo, where), 'utf8').replace(/\r\n/g, '\n').trim().split('\n');
  const h = HEADING_RE.exec(lines[0] ?? '');
  if (!h) shapeFails.push(`${where}: the first line is not a \`## (YYYY-MM-DD) — <title>\` heading`);
  if (lines.join('\n').replace(/\{\{ENGINE_VERSION\}\}/g, '').includes('{{'))
    shapeFails.push(`${where}: a \`{{\` other than the version placeholder — the fold would copy it into the log, where a literal \`{{\` fails`);
  if (h && h[2].includes('{{')) shapeFails.push(`${where}: the heading carries a placeholder; only the body may (the title is how the gate finds the entry once folded)`);
  const extra = lines.slice(1).findIndex((l) => l.startsWith('## '));
  if (extra >= 0) shapeFails.push(`${where}:${extra + 2}: a second \`## \` heading — a fragment is ONE entry; use \`###\` inside it`);
}
// ALREADY IN THE LOG (#1823 re-review, the reviewer's surviving mutation): a pending fragment whose title
// is already an entry heading means a fold wrote the entry and did not delete the fragment, so the next
// fold would write it twice, and the failure would surface one fold late, blamed on the wrong one.
const loggedTitles = new Set(entries.map((e) => e.title));
for (const f of pendingNow) {
  const h = HEADING_RE.exec(readFileSync(join(repo, `${PENDING}/${f}`), 'utf8').replace(/\r\n/g, '\n').trim().split('\n')[0] ?? '');
  if (h && loggedTitles.has(h[2]))
    shapeFails.push(`${PENDING}/${f}: still pending, and "${h[2]}" is already an entry in ${entries.find((e) => e.title === h[2])!.file} — a fold wrote it and left the fragment behind (delete it), or the title repeats an old entry (retitle it)`);
}
if (shapeFails.length) {
  failed = true;
  console.error(`\n✗ FRAGMENT SHAPE — ${shapeFails.length} problem(s) in ${PENDING}/ (#1807):\n`);
  for (const f of shapeFails) console.error(`  · ${f}`);
  console.error('\n  A fragment is exactly one progress entry, headed `## (YYYY-MM-DD) — <title>`. The fold replaces');
  console.error('  the date with the day it lands; the title must be final, because it is how the entry is found.\n');
} else {
  console.log(`  ✓ fragment shape — ${pendingNow.length} pending fragment(s), each one well-formed entry`);
}

// FOLDED ENTRIES
const shallow = git('rev-parse', '--is-shallow-repository');
if (!shallow.ok) cannotRun('git is not available to read merge order.', shallow.err);
// A shallow clone is fine as long as it reaches back past the commit that INTRODUCED the pending
// directory (#1823 review: agent sessions clone ~50 deep). If the oldest reachable first-parent commit
// already has the directory, its boundary shows every file there as ADDED at that commit: merge order
// and landing days would be invented, and fragments folded before it would be missed. Only that refuses.
if (shallow.out.trim() === 'true') {
  const oldest = git('rev-list', '--first-parent', 'HEAD').out.trim().split('\n').pop() ?? '';
  const reached = git('ls-tree', '--name-only', oldest, '--', `${PENDING}/`);
  if (!reached.ok) cannotRun(`cannot read ${PENDING}/ at the shallow boundary ${oldest.slice(0, 8)}.`, reached.err);
  if (reached.out.trim())
    cannotRun(`this shallow clone stops at ${oldest.slice(0, 8)}, after ${PENDING}/ was introduced, so merge order before it is unknowable.`, '`git fetch --deepen=<n>` until the introducing commit is reachable, or `git fetch --unshallow`.');
}
// Position on HEAD's first-parent chain, 0 = HEAD. The ONE ordering both walks below are read in: each
// walk keeps only the commits that touched the directory, so counting within a walk would compare an
// add's rank among adds with a delete's rank among deletes, which orders nothing.
const chain = git('rev-list', '--first-parent', 'HEAD');
if (!chain.ok) cannotRun('git rev-list over HEAD failed.', chain.err);
const position = new Map(chain.out.split('\n').filter(Boolean).map((sha, i) => [sha, i]));
const walk = (filter: 'A' | 'D'): Map<string, { sha: string; day: string; seq: number }> => {
  const r = git('log', '--first-parent', `--diff-filter=${filter}`, '--no-renames', '--format=%x00%H %cI', '--name-only', 'HEAD', '--', PENDING);
  if (!r.ok) cannotRun(`git log over ${PENDING} failed.`, r.err);
  const out = new Map<string, { sha: string; day: string; seq: number }>();
  for (const rec of r.out.split('\0').filter((x) => x.trim())) {
    const [head, ...files] = rec.split('\n').map((x) => x.trim()).filter(Boolean);
    const [sha, iso] = head.split(' ');
    const seq = position.get(sha);
    if (seq === undefined) cannotRun(`${sha.slice(0, 8)} is in the log walk and not on HEAD's first-parent chain.`, 'The two git reads disagree; this arm cannot order anything.');
    // The UTC calendar day of the committer date — computed here, not borrowed from the fold.
    const day = new Date(Date.parse(iso)).toISOString().slice(0, 10);
    for (const f of files) if (!out.has(f)) out.set(f, { sha, day, seq: seq! });
  }
  return out;
};
const added = walk('A');
const removed = walk('D');
// THE ORDER MAIN RECORDED (#1880). A landing on HEAD's first-parent chain is trusted only when that commit
// is on `main`'s own first-parent chain. A branch's merge of `main` sits on HEAD's chain too, and it
// carries every fragment `main` landed since the previous merge as ONE add: they share a landing commit,
// the stable sort falls back to file-name order, and a correct fold reads as wrong (#1880, #1921). Those
// fragments are left unseen here. A push run is `main` itself, so HEAD is the chain; anywhere else
// `origin/main`, then `main`. Never GITHUB_BASE_REF: a stacked PR's base is another branch, and the
// fold writes `main`'s order, not that branch's.
const mainRef = process.env.GITHUB_EVENT_NAME === 'push'
  ? 'HEAD'
  : ['origin/main', 'main'].find((c) => git('rev-parse', '--verify', '--quiet', `${c}^{commit}`).ok);
if (!mainRef) cannotRun('no main ref to read landing order from (tried origin/main, main).', 'Locally, `git fetch origin main`.');
const mainChain = git('rev-list', '--first-parent', mainRef!);
if (!mainChain.ok) cannotRun(`git rev-list over ${mainRef} failed.`, mainChain.err);
const onMain = new Set(mainChain.out.split('\n').filter(Boolean));
const pendingSet = new Set(pendingNow.map((f) => `${PENDING}/${f}`));
const gone = [...added.entries()].filter(([p]) => isFragment(p.slice(PENDING.length + 1)) && !pendingSet.has(p));
const unseen = gone.filter(([, landed]) => !onMain.has(landed.sha)).length;
const folded = gone
  .filter(([, landed]) => onMain.has(landed.sha))
  .map(([path, landed]) => {
    // The fragment's LAST content: just before the first-parent commit that deleted it, or at HEAD when
    // only the working tree has deleted it (an uncommitted fold).
    const del = removed.get(path);
    const at = del && del.seq < landed.seq ? `${del.sha}^1` : 'HEAD';
    const src = git('show', `${at}:${path}`);
    if (!src.ok) cannotRun(`cannot read ${path} at ${at}.`, src.err);
    const h = HEADING_RE.exec(src.out.replace(/\r\n/g, '\n').trim().split('\n')[0] ?? '');
    return { path, landed, title: h ? h[2] : null };
  });
const foldFails: string[] = [];
const placed: { path: string; seq: number; at: string; ord: number }[] = [];
for (const f of folded) {
  if (!f.title) { foldFails.push(`${f.path}: it landed at ${f.landed.sha.slice(0, 8)} with no entry heading, so there is nothing to find in the log`); continue; }
  const byTitle = entries.filter((e) => e.title === f.title);
  const onDay = byTitle.filter((e) => e.date === f.landed.day);
  if (!byTitle.length)
    foldFails.push(`${f.path}: landed ${f.landed.day} (${f.landed.sha.slice(0, 8)}) and is no longer pending, but no entry titled "${f.title}" is in ${FILE} or ${ARCHIVE}/ — deleted without being folded`);
  else if (!onDay.length)
    foldFails.push(`${f.path}: its entry is dated ${byTitle.map((e) => e.date).join(', ')} at ${byTitle[0].file}:${byTitle[0].line}, but the fragment LANDED ${f.landed.day} (${f.landed.sha.slice(0, 8)}) — a folded entry carries its landing day`);
  else if (onDay.length > 1)
    foldFails.push(`${f.path}: ${onDay.length} entries share its title and landing day (${onDay.map((e) => `${e.file}:${e.line}`).join(', ')}) — the log carries it twice`);
  else placed.push({ path: f.path, seq: f.landed.seq, at: `${onDay[0].file}:${onDay[0].line}`, ord: onDay[0].ord });
}
// Newest merge first: sorted by landing (smaller seq = more recent), the places in the sequence must rise.
placed.sort((a, b) => a.seq - b.seq);
for (let i = 1; i < placed.length; i++)
  if (placed[i].ord < placed[i - 1].ord)
    foldFails.push(
      `${placed[i].at} (${placed[i].path}) sits ABOVE ${placed[i - 1].at} (${placed[i - 1].path}), ` +
        `but it landed EARLIER — folded entries are newest merge first`,
    );
if (foldFails.length) {
  failed = true;
  console.error(`\n✗ FOLDED ENTRIES — ${foldFails.length} problem(s) (#1807):\n`);
  for (const f of foldFails) console.error(`  · ${f}`);
  console.error('\n  Only `fold.ts` removes a pending fragment, and it writes the entry in the same diff. Restore a');
  console.error('  fragment a merge resolution dropped; rerun the fold rather than hand-placing its entries. A folded');
  console.error('  heading is history: correct its body if you must, but leave the title and date as the fold wrote them.\n');
} else {
  console.log(
    `  ✓ folded entries — ${placed.length} folded fragment(s) found in the log at their landing day, newest merge first` +
      (unseen ? `; ${unseen} more landed off main's first-parent history (a merge of main, or this branch) and are not seen here (#1880)` : ''),
  );
}

// NO PLACEHOLDER IN THE LOG (#1823 review). `{{ENGINE_VERSION}}` is filled in by the fold; the log never
// carries a literal `{{`, so one here is a fold that did not substitute, or a fragment pasted in by hand.
{
  const hits = sources.flatMap(({ file, src }) => src.split('\n').map((l, i) => (l.includes('{{') ? `${file}:${i + 1}` : '')).filter(Boolean));
  if (hits.length) {
    failed = true;
    console.error(`\n✗ PLACEHOLDER IN THE LOG — the log carries a literal \`{{\` at ${hits.slice(0, 8).join(', ')} (#1807).`);
    console.error('  The fold fills in `{{ENGINE_VERSION}}`; an entry still carrying it was not folded by fold.ts. Rerun the fold.\n');
  } else console.log('  ✓ no placeholder — the log carries no literal `{{`');
}

// LEAVES NOTHING PENDING (#2663) — a fold consumes everything pending on the tree it merges into. The
// FOLDED ENTRIES arm checks the files the fold deleted; it cannot see a file the fold never had. `main`
// moves while a fold PR is open, and GitHub does not re-run the PR's CI when it does, so a fold cut at one
// commit and merged on a later one left the later commits' fragments and notes pending, and every arm
// passed it as "a pure fold" (#2582's review). The subject is the diff's DELETIONS (they make it a fold);
// the oracle is the merged tree's listing of both pending directories, read with `ls-tree`. Neither side
// is derived from the other, and neither reads `fold.ts` (docs/34 shape 2).
//
// "The merged tree" is HEAD's pending files, less those the base ref DELETED since the merge base (a fold on
// main consumed them, and the merge deletes them), plus those the base ref ADDED since (a fold branch has
// not seen them, and the merge brings them in). In CI HEAD is the merge and the base ref is the merge base,
// so both corrections are empty. On a push run the
// base is HEAD's first parent, the commit the squash landed on, and HEAD is the merged tree.
// A file the diff ADDS is not left behind: it is the fold's own fragment (or note) for a fix it carries.
const pendingAt = (ref: string, dir: string): string[] => {
  const r = git('ls-tree', '--name-only', ref, '--', `${dir}/`);
  if (!r.ok) cannotRun(`cannot list ${dir}/ at ${ref}.`, r.err);
  return r.out.split('\n').map((x) => x.trim()).filter((p) => p && isFragment(p.slice(dir.length + 1)));
};
const statusIn = (base: string, dir: string, st: 'A' | 'D'): string[] => {
  const r = git('diff', '--name-status', '--no-renames', base, 'HEAD', '--', dir);
  if (!r.ok) cannotRun(`git diff over ${dir} failed.`, r.err);
  return r.out.split('\n').map((l) => l.split('\t')).filter((x) => x[0] === st && isFragment((x[1] ?? '').slice(dir.length + 1))).map((x) => x[1]);
};
const leavesNothingPending = (base: string, tip: string | null, whence: string): void => {
  const consumed = [PENDING, NOTES].map((dir) => statusIn(base, dir, 'D').length);
  if (consumed[0] + consumed[1] === 0) {
    console.log('  ✓ leaves nothing pending: n/a — the diff consumes no pending file, so it is not a fold');
    return;
  }
  const own = new Set([PENDING, NOTES].flatMap((dir) => statusIn(base, dir, 'A')));
  const left = new Set<string>();
  for (const dir of [PENDING, NOTES]) {
    const atBase = new Set(tip ? pendingAt(base, dir) : []);
    const atTip = new Set(tip ? pendingAt(tip, dir) : []);
    // HEAD's pending files, less those the base ref has consumed since the merge base (another fold): the
    // merge deletes them. Plus those the base ref added since: the merge brings them in (#1880's fixture (a),
    // a branch whose fold of what one merge of main brought sits beside main's own fold of the rest).
    for (const p of pendingAt('HEAD', dir)) if (!(atBase.has(p) && !atTip.has(p))) left.add(p);
    for (const p of atTip) if (!atBase.has(p)) left.add(p);
  }
  const missed = [...left].filter((p) => !own.has(p)).sort();
  if (missed.length) {
    failed = true;
    console.error(`\n✗ LEAVES NOTHING PENDING — this diff is a fold (it consumes ${consumed[0]} fragment(s) and ${consumed[1]} note(s)), and ${missed.length} file(s) are still pending on the merged tree (#2663):\n`);
    console.error(`    ${whence}`);
    for (const p of missed.slice(0, 12)) console.error(`  · ${p}`);
    if (missed.length > 12) console.error(`  · … and ${missed.length - 12} more`);
    console.error('\n  main moved after the fold was cut, so the fold has not seen what landed since. Re-cut the fold from');
    console.error('  current main (CONTRIBUTING.md §2, "How to fold"). Merged as it is, it versions a batch that is not');
    console.error('  the one on main, and the next fold puts these under a later number.\n');
  } else {
    console.log(`  ✓ leaves nothing pending — the fold consumes ${consumed[0]} fragment(s) and ${consumed[1]} note(s), and the merged tree holds no other pending file (${whence})`);
  }
};

// CARRIES AN ENTRY — enforced (owner decision, 2026-09-30). Same base-ref ladder as the two version
// gates, restated rather than shared for the reason `lint-emission-version.ts` gives: GITHUB_BASE_REF is
// AUTHORITATIVE when set and never falls through, because falling back would judge the wrong diff.
{
  const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
  const candidates = prBase ? [prBase] : ['origin/main', 'main'];
  const baseRef = candidates.find((c) => git('rev-parse', '--verify', '--quiet', `${c}^{commit}`).ok);
  if (process.env.GITHUB_EVENT_NAME === 'push') {
    console.log('  ✓ carries an entry: skipped — a push run (GITHUB_EVENT_NAME=push) has no PR diff; the PR run held it');
    // Not skipped: the push run is the only run that sees a fold on the main it actually landed on (#2663).
    const parent = git('rev-parse', '--verify', '--quiet', 'HEAD^1^{commit}');
    if (!parent.ok || !parent.out.trim()) cannotRun('a push run with no first parent, so LEAVES NOTHING PENDING has no squash to read (#2663).', 'In CI `fetch-depth: 0` provides it; locally, `git fetch --unshallow`.');
    leavesNothingPending(parent.out.trim(), null, `base ${parent.out.trim().slice(0, 8)} (HEAD's first parent — a push run)`);
  } else {
  if (!baseRef) cannotRun(`no base ref for the CARRIES AN ENTRY arm (tried ${candidates.join(', ')}).`, 'In CI `fetch-depth: 0` provides origin/<base>; locally, `git fetch origin main`.');
  const mb = git('merge-base', 'HEAD', baseRef!);
  const head = git('rev-parse', 'HEAD');
  if (!mb.ok || !mb.out.trim()) cannotRun(`no merge base between HEAD and ${baseRef}.`, mb.err || '(git printed nothing)');
  if (mb.out.trim() === head.out.trim()) {
    // Not "n/a": outside a push run, a HEAD equal to its base is a branch with nothing in it yet, or a
    // base ref that is wrong, and either way nothing here shows an entry was carried (#1823 review).
    failed = true;
    console.error(`\n✗ CARRIES AN ENTRY — HEAD is ${baseRef} itself, so there is no diff to find an entry in (#1807).`);
    console.error('  Commit your work (with its fragment) first. On a checkout of main itself this arm has nothing to');
    console.error('  hold; CI\'s push run on main skips it by GITHUB_EVENT_NAME, and nothing else does.\n');
  } else {
    const base = mb.out.trim();
    const tip = git('rev-parse', `${baseRef}^{commit}`).out.trim();
    leavesNothingPending(base, tip, `base ${base.slice(0, 8)} (${baseRef}), and what ${baseRef} added since, at ${tip.slice(0, 8)}`);
    const d = git('diff', '--name-status', '--no-renames', base, 'HEAD', '--', PENDING);
    if (!d.ok) cannotRun(`git diff over ${PENDING} failed.`, d.err);
    const rows = d.out.split('\n').map((l) => l.split('\t')).filter((r) => r.length === 2 && isFragment(r[1].slice(PENDING.length + 1)));
    const addedFrags = rows.filter((r) => r[0] === 'A').map((r) => r[1]);
    const deletedFrags = rows.filter((r) => r[0] === 'D').map((r) => r[1]);
    const nd = git('diff', '--name-status', '--no-renames', base, 'HEAD', '--', NOTES);
    if (!nd.ok) cannotRun(`git diff over ${NOTES} failed.`, nd.err);
    const deletedNotes = nd.out.split('\n').map((l) => l.split('\t')).filter((r) => r[0] === 'D' && isFragment((r[1] ?? '').slice(NOTES.length + 1)));
    // A FOLD, recognized by CONTENT and never by a branch name. Two questions, deliberately separate
    // (#1823 re-review):
    //   FOLD-SHAPED — it consumes pending files AND everything it consumed reached the log (the FOLDED
    //                 ENTRIES arm above passed). Only a fold-shaped diff may add headings to the log.
    //   PURE        — it touches nothing a fold does not write: the log, the two pending directories,
    //                 version.ts, CHANGELOG.md, the regenerated stamps in out/ and the release notes the fold
    //                 writes under docs/public/releases/ (#2650). Only a pure fold is exempt from
    //                 carrying its own fragment. A fold PR that also fixes a semantic conflict is not
    //                 pure, so the fix carries a fragment like any other change, and a normal PR cannot
    //                 dress as a fold by hand-moving someone else's fragment into the log.
    const FOLD_WRITES = [FILE, `${PENDING}/`, `${NOTES}/`, 'packages/engine/version.ts', 'packages/engine/CHANGELOG.md', 'packages/engine/out/', 'docs/public/releases/'];
    const all = git('diff', '--name-only', '--no-renames', base, 'HEAD');
    if (!all.ok) cannotRun('git diff --name-only failed.', all.err);
    const touched = all.out.split('\n').map((x) => x.trim()).filter(Boolean);
    // THE RENAME STAMPS (#1816). The fold also fills the quoted `'{{ENGINE_VERSION}}'` a PR wrote as a
    // rename rule's `since`, in these three files. Such a file is a fold write only when its WHOLE diff is
    // that substitution with HEAD's version: the base copy, substituted here, is byte-identical to HEAD's.
    // Any other edit in the file is a change of its own and carries a fragment. The paths and the
    // substitution are restated rather than imported from `fold-stamps.ts`, the subject (docs/34 shape 2).
    // The comparison itself is `onlyFilledStamps` in `rename-stamp-audit.ts`, a pure function so `test.ts`
    // can drive it with fixtures (#1842 review: "any stamp-file edit counts" survived every committed check).
    const STAMP_FILES: string[] = Object.values(STAMP_PATHS);
    const headVersionLine = /ENGINE_VERSION\s*=\s*'(\d+\.\d+\.\d+)'/.exec(git('show', 'HEAD:packages/engine/version.ts').out);
    const isFilledStampFile = (f: string): boolean => {
      if (!STAMP_FILES.includes(f) || !headVersionLine) return false;
      const was = git('show', `${base}:${f}`);
      const now = git('show', `HEAD:${f}`);
      return was.ok && now.ok && onlyFilledStamps(was.out, now.out, headVersionLine[1]);
    };
    const beyond = touched.filter((f) => !FOLD_WRITES.some((w) => (w.endsWith('/') ? f.startsWith(w) : f === w)) && !isFilledStampFile(f));
    const foldShaped = (deletedFrags.length > 0 || deletedNotes.length > 0) && foldFails.length === 0;
    const pureFold = foldShaped && beyond.length === 0;
    const logHeads = git('diff', base, 'HEAD', '--', FILE).out.split('\n').filter((l) => l.startsWith('+') && HEADING_RE.test(l.slice(1)));

    // THE LOG HAS ONE WRITER — outside a fold-shaped diff, NO change to the log at all: not a new heading,
    // and not an edit to an existing entry's body either (#1823, the orchestrator's surviving mutation: a
    // body edit two lines under the top heading passed, and it collides with the next fold's insertion).
    // A correction to an old entry travels as a fragment of its own ("Correction to <date> <title>").
    // The line is drawn at FOLD-SHAPED rather than PURE on purpose: a fold that also fixes a semantic
    // conflict is not pure, and it still has to write the log.
    // ARCHIVE MOVE (#2583) — the archive is written only by a PURE MOVE out of the log: the log and its
    // archive, read at the base and at HEAD as one sequence of `## ` sections, are the same sections, in the
    // same order, each byte-identical. Only the preambles above each file's first `## ` line may differ (the
    // log's pointer to the archive, each archive file's own title). So an entry dropped, duplicated, edited,
    // reordered or added on the way fails here by name, and any other write to the archive fails the same
    // way. EXPECTED is the base's sequence and ACTUAL is HEAD's, read from two commits with this file's own
    // split: nothing either side is derived from the other (docs/34 shape 1).
    const ad = git('diff', '--name-status', '--no-renames', base, 'HEAD', '--', ARCHIVE);
    if (!ad.ok) cannotRun(`git diff over ${ARCHIVE} failed.`, ad.err);
    const archiveRows = ad.out.split('\n').map((l) => l.split('\t')).filter((r) => r.length === 2 && isArchiveFile(r[1].slice(ARCHIVE.length + 1)));
    let archiveMove = false;
    if (archiveRows.length) {
      const moveFails: string[] = [];
      for (const [st, path] of archiveRows)
        if (st === 'A' && !ARCHIVE_NAME_RE.test(path.slice(ARCHIVE.length + 1)))
          moveFails.push(`${path}: an archive file is named for its months, \`YYYY-MM.md\` or \`YYYY-MM-MM.md\``);
      const sequenceAt = (ref: string): string[] => {
        const ls = git('ls-tree', '--name-only', ref, '--', `${ARCHIVE}/`);
        if (!ls.ok) cannotRun(`cannot list ${ARCHIVE}/ at ${ref}.`, ls.err);
        const files = [FILE, ...archiveFiles(ls.out.split('\n').map((x) => x.trim().slice(ARCHIVE.length + 1)).filter(Boolean)).map((f) => `${ARCHIVE}/${f}`)];
        return files.flatMap((f) => {
          const r = git('show', `${ref}:${f}`);
          if (!r.ok) cannotRun(`cannot read ${f} at ${ref}.`, r.err);
          return sectionsOf(r.out);
        });
      };
      const before = sequenceAt(base);
      const after = sequenceAt('HEAD');
      const tally = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
      const tb = tally(before);
      const ta = tally(after);
      const head = (x: string) => x.split('\n')[0].slice(0, 110);
      for (const [x, n] of tb) if ((ta.get(x) ?? 0) < n) moveFails.push(`lost: "${head(x)}" — ${n} at the base, ${ta.get(x) ?? 0} now (dropped, or its text changed on the way)`);
      for (const [x, n] of ta) if ((tb.get(x) ?? 0) < n) moveFails.push(`added: "${head(x)}" — ${tb.get(x) ?? 0} at the base, ${n} now (duplicated, written new, or its text changed on the way)`);
      if (!moveFails.length) {
        const at = before.findIndex((x, i) => x !== after[i]);
        if (at >= 0) moveFails.push(`reordered: section ${at + 1} was "${head(before[at])}" and is now "${head(after[at])}"`);
      }
      if (moveFails.length) {
        failed = true;
        console.error(`\n✗ ARCHIVE MOVE — this diff writes ${ARCHIVE}/ and is not a pure move (#2583):\n`);
        for (const f of moveFails.slice(0, 12)) console.error(`  · ${f}`);
        if (moveFails.length > 12) console.error(`  · … and ${moveFails.length - 12} more`);
        console.error(`\n  The log and ${ARCHIVE}/, read as one sequence, must carry the same sections in the same order, byte`);
        console.error('  for byte, at the base and at HEAD. Move whole entries from the bottom of the log to the top of the');
        console.error('  newest archive file; change nothing in them. A correction to an archived entry travels as a fragment.\n');
      } else {
        archiveMove = true;
        const moved = sectionsOf(git('show', `${base}:${FILE}`).out).length - sectionsOf(git('show', `HEAD:${FILE}`).out).length;
        console.log(`  ✓ archive move — ${moved} section(s) moved out of ${FILE}; all ${after.length} sections of the log and archive byte-identical and in order`);
      }
    }

    const logDiff = git('diff', '--numstat', base, 'HEAD', '--', FILE);
    if (!logDiff.ok) cannotRun(`git diff over ${FILE} failed.`, logDiff.err);
    if (logDiff.out.trim() && !foldShaped && !archiveMove) {
      failed = true;
      const [add, del] = logDiff.out.trim().split('\t');
      console.error(`\n✗ ONE WRITER (log) — this diff changes ${FILE} (+${add} −${del} line(s)) and is not a fold (#1807).`);
      if (logHeads.length) {
        console.error(`    It adds ${logHeads.length} heading(s) straight into the log:`);
        for (const h of logHeads.slice(0, 5)) console.error(`      ${h.slice(1).slice(0, 110)}`);
      } else console.error('    It edits existing entries, which collides with the next fold\'s insertion at the top.');
      console.error('  Only fold.ts writes the log. Put a new entry in your fragment in ' + PENDING + '/; put a correction to an');
      console.error('  old entry in a fragment too, titled for what it corrects ("Correction to <date> <title>").\n');
    }

    if (addedFrags.length) {
      console.log(`  ✓ carries an entry — ${addedFrags.join(', ')}`);
    } else if (pureFold) {
      console.log(`  ✓ carries an entry: exempt — a pure fold (it consumes ${deletedFrags.length} fragment(s) and ${deletedNotes.length} note(s), every entry reached the log, and it touches nothing a fold does not write)`);
    } else {
      failed = true;
      console.error(`\n✗ CARRIES AN ENTRY — this diff adds no progress fragment to ${PENDING}/ (#1807).`);
      console.error(`    base ${base.slice(0, 8)} (${baseRef})`);
      if (logHeads.length && !foldShaped)
        console.error(`    It writes ${logHeads.length} heading(s) straight into ${FILE} instead — the old convention, and the line every PR conflicted on.`);
      if (foldShaped && beyond.length)
        console.error(`    It is fold-shaped but also changes ${beyond.length} file(s) a fold does not write (${beyond.slice(0, 4).join(', ')}${beyond.length > 4 ? ', …' : ''}), so that change carries its own fragment.`);
      console.error('\n  Every PR carries its progress entry as its own file, except a pure fold. Add');
      console.error(`  ${PENDING}/<your-branch-with-slashes-as-dashes>.md holding ONE entry:`);
      console.error('      ## (YYYY-MM-DD) — <title>');
      console.error('      <what changed, what was decided and why, any trap for whoever re-verifies>');
      console.error('  On the old convention? CONTRIBUTING.md §2, "Converting an open PR from the old convention".\n');
    }
  }
  }
}

if (failed) process.exit(1);
console.log(
  '  ✓ clean. Note the limit: this proves structure and placement, not that an entry is correct,\n' +
    '    complete, or matches what shipped — that judgment is prose, and review is its only guard.',
);
