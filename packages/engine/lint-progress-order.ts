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
 * the same log before it is folded) — other append-only dated logs (`_research/_inbound/` in the
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
 *                    out/, and the three rename-stamp files when their whole diff is the fold filling
 *                    `'{{ENGINE_VERSION}}'` with its version, #1816). Only a pure fold is exempt from carrying a fragment, so a fold PR that fixes a
 *                    semantic conflict carries one for the fix, and a normal PR cannot pass as a fold by
 *                    hand-moving another PR's fragment into the log. Skipped ONLY on a push run
 *                    (`GITHUB_EVENT_NAME=push`); anywhere else, a HEAD equal to its base or an
 *                    unresolvable base FAILS rather than printing n/a.
 *   ONE WRITER (log) — outside a fold-shaped diff, ANY change to the log fails, whether or not the diff
 *                    also carries a fragment: a new heading, and an edit to an existing entry too. A
 *                    correction travels as a fragment of its own. (Fold-shaped, not pure: a fold that also
 *                    fixes a semantic conflict still writes the log.)
 *   ALREADY IN THE LOG — a pending fragment whose title is already an entry heading fails: a fold wrote
 *                    the entry and left the fragment, which the next fold would write again.
 *   NO PLACEHOLDER — the log never carries a literal `{{`: a folded entry still holding `{{ENGINE_VERSION}}`
 *                    was not folded by `fold.ts` (#1823 review).
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
const HEADING_RE = /^## \((\d{4}-\d{2}-\d{2})\) — (.+?)\s*$/;

type Entry = { line: number; date: string; title: string };

const src = readFileSync(join(repo, FILE), 'utf8');
const entries: Entry[] = [];
src.split('\n').forEach((line, i) => {
  const m = HEADING_RE.exec(line);
  if (m) entries.push({ line: i + 1, date: m[1], title: m[2] });
});

console.log('Progress-log order gate (#931)');

if (entries.length === 0) {
  console.error(
    `\n✗ PARSE FLOOR: 0 heading(s) matched ${HEADING_RE} in ${FILE}. Either the file has genuinely ` +
      `lost every dated entry (check by hand — it has not) or the heading format changed and this ` +
      `detector is looking at nothing. A pattern that stops matching must fail loudly, never pass ` +
      `over an empty set (docs/34 shape 9). Do not widen the pattern to make this pass — find out ` +
      `what changed and fix the mismatch.`,
  );
  process.exit(1);
}

console.log(`  ${entries.length} dated entr${entries.length === 1 ? 'y' : 'ies'} found`);

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
      `${FILE}:${entries[i].line} — "(${entries[i].date}) — ${entries[i].title}" sits BELOW ` +
        `${FILE}:${entries[i - 1].line} — "(${entries[i - 1].date}) — ${entries[i - 1].title}", ` +
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
/** Read only to recognize a fold that consumed notes; `lint-emission-version.ts` owns everything else about them. */
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
    shapeFails.push(`${PENDING}/${f}: still pending, and "${h[2]}" is already an entry in ${FILE} — a fold wrote it and left the fragment behind (delete it), or the title repeats an old entry (retitle it)`);
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
const placed: { path: string; seq: number; line: number }[] = [];
for (const f of folded) {
  if (!f.title) { foldFails.push(`${f.path}: it landed at ${f.landed.sha.slice(0, 8)} with no entry heading, so there is nothing to find in the log`); continue; }
  const byTitle = entries.filter((e) => e.title === f.title);
  const onDay = byTitle.filter((e) => e.date === f.landed.day);
  if (!byTitle.length)
    foldFails.push(`${f.path}: landed ${f.landed.day} (${f.landed.sha.slice(0, 8)}) and is no longer pending, but no entry titled "${f.title}" is in ${FILE} — deleted without being folded`);
  else if (!onDay.length)
    foldFails.push(`${f.path}: its entry is dated ${byTitle.map((e) => e.date).join(', ')} at ${FILE}:${byTitle[0].line}, but the fragment LANDED ${f.landed.day} (${f.landed.sha.slice(0, 8)}) — a folded entry carries its landing day`);
  else if (onDay.length > 1)
    foldFails.push(`${f.path}: ${onDay.length} entries share its title and landing day (${onDay.map((e) => `${FILE}:${e.line}`).join(', ')}) — the log carries it twice`);
  else placed.push({ path: f.path, seq: f.landed.seq, line: onDay[0].line });
}
// Newest merge first: sorted by landing (smaller seq = more recent), the lines must rise.
placed.sort((a, b) => a.seq - b.seq);
for (let i = 1; i < placed.length; i++)
  if (placed[i].line < placed[i - 1].line)
    foldFails.push(
      `${FILE}:${placed[i].line} (${placed[i].path}) sits ABOVE ${FILE}:${placed[i - 1].line} (${placed[i - 1].path}), ` +
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
  const hits = src.split('\n').map((l, i) => (l.includes('{{') ? i + 1 : 0)).filter(Boolean);
  if (hits.length) {
    failed = true;
    console.error(`\n✗ PLACEHOLDER IN THE LOG — ${FILE} carries a literal \`{{\` at line(s) ${hits.slice(0, 8).join(', ')} (#1807).`);
    console.error('  The fold fills in `{{ENGINE_VERSION}}`; an entry still carrying it was not folded by fold.ts. Rerun the fold.\n');
  } else console.log('  ✓ no placeholder — the log carries no literal `{{`');
}

// CARRIES AN ENTRY — enforced (owner decision, 2026-09-30). Same base-ref ladder as the two version
// gates, restated rather than shared for the reason `lint-emission-version.ts` gives: GITHUB_BASE_REF is
// AUTHORITATIVE when set and never falls through, because falling back would judge the wrong diff.
{
  const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
  const candidates = prBase ? [prBase] : ['origin/main', 'main'];
  const baseRef = candidates.find((c) => git('rev-parse', '--verify', '--quiet', `${c}^{commit}`).ok);
  if (process.env.GITHUB_EVENT_NAME === 'push') {
    console.log('  ✓ carries an entry: skipped — a push run (GITHUB_EVENT_NAME=push) has no PR diff; the PR run held it');
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
    //                 version.ts and the regenerated stamps in out/. Only a pure fold is exempt from
    //                 carrying its own fragment. A fold PR that also fixes a semantic conflict is not
    //                 pure, so the fix carries a fragment like any other change, and a normal PR cannot
    //                 dress as a fold by hand-moving someone else's fragment into the log.
    const FOLD_WRITES = [FILE, `${PENDING}/`, `${NOTES}/`, 'packages/engine/version.ts', 'packages/engine/out/'];
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
    const logDiff = git('diff', '--numstat', base, 'HEAD', '--', FILE);
    if (!logDiff.ok) cannotRun(`git diff over ${FILE} failed.`, logDiff.err);
    if (logDiff.out.trim() && !foldShaped) {
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
