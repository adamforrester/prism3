/**
 * CONTRACT_VERSION MOVES AGAINST THE BASE, NOT ONLY AGAINST ITS OWN BASELINE (#2334).
 *
 *   npx tsx packages/engine/lint-contract-version.ts
 *
 * `token-contract.ts --check` compares the live surface with the committed baseline, and the constant
 * with the baseline's recorded `contractVersion` (#1768). Both of its sides live in the tree under check.
 * So after an `--accept`, writing the previous number back into `version.ts` AND into the baseline's
 * `contractVersion` leaves the tree agreeing with itself: the surface matches the baseline, the constant
 * matches the number the baseline records, and every gate passes. `--accept`'s refusal guards only the
 * accept. A consumer pinned to the old number then gets a moved surface under it.
 *
 * This gate takes the expected number from git instead (docs/34: the expected value comes from the base,
 * never from the tree under check). It reads the committed baseline and `CONTRACT_VERSION` at the base,
 * and the committed baseline and `CONTRACT_VERSION` in the tree, and requires:
 *
 *   - a guaranteed path REMOVED or RETYPED since the base → a MAJOR increment over the base's number;
 *   - a guaranteed path ADDED, and none removed or retyped → at least a MINOR increment;
 *   - no guaranteed path moved → the base's number, exactly. Raised with nothing to record is refused,
 *     as `token-contract.ts` refuses it in-tree (#1768); lowered is refused at every level.
 *
 * "At least": a larger increment than the diff needs passes, the policy `docs/30` and `satisfiesBump`
 * state. A demotion (guaranteed → brand-dependent) leaves the guaranteed set, so it counts as a removal,
 * which is how `classify` levels it too.
 *
 * ── RESTATED, NOT IMPORTED ────────────────────────────────────────────────────────────────────────────
 *
 * The path diff and the increment rule are written out here rather than taken from `classify` and
 * `satisfiesBump` in `version.ts`. Those are what `--accept` decides with, so a gate that called them would
 * agree with an accept by construction (docs/34 shape 2). Both are a few lines; the duplication is the gate.
 * The self-check below holds this file's copy to literal expectations before the real run.
 *
 * ── THE BASE ──────────────────────────────────────────────────────────────────────────────────────────
 *
 * `GITHUB_BASE_REF` when set (authoritative, no fall through), else `origin/main`, else `main`; then the
 * merge base with HEAD (`lint-materialization-renames.ts` has the ladder and why each step fails rather
 * than falls back). On main's push run the merge base is HEAD itself, so there the first parent is the
 * base instead: compared with itself, a squash that lowered the number would pass (#2551, #2556). No base
 * ref, no merge base, or no first parent on the base branch is a failure, never a pass. Needs history:
 * `ci.yml`'s `fetch-depth: 0` provides it.
 *
 * A branch that moved the surface is also held to the base branch's CURRENT number, not only the merge
 * base's: two PRs that each raise 14.7.0 to 15.0.0 make the identical edit, merge with no conflict, and
 * each passed against 14.7.0. In CI on a pull request the base branch is fetched again at run time first
 * (a failed fetch fails); locally the check reads whatever `origin/main` already says.
 *
 * The tree side is the files on disk, not HEAD, so an uncommitted edit to either is seen on the run after
 * the edit, the same reading `token-contract.ts --check` takes.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Set only by the push-run replay below, for the run it makes of this file in a scratch repo. */
const REPLAY_ENV = 'P3_LINT_CONTRACT_VERSION_REPLAY_REPO';
const REPO = process.env[REPLAY_ENV] ? resolve(process.env[REPLAY_ENV]!) : resolve(HERE, '..', '..');
const BASELINE = 'packages/engine/schema/token-contract.json';
const VERSION = 'packages/engine/version.ts';

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};

const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

// ---- the rule, restated ----------------------------------------------------------------------------------

type Level = 'none' | 'minor' | 'major';
type Semver = [number, number, number];

const semver = (v: string, whence: string): Semver => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return die([`${whence}: CONTRACT_VERSION "${v}" is not MAJOR.MINOR.PATCH — this check CANNOT RUN.`]);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

interface Moves { added: string[]; removed: string[]; retyped: string[]; level: Level }

/** What moved in the guaranteed path → `$type` map between the base and the tree. */
const moves = (before: Record<string, string>, after: Record<string, string>): Moves => {
  const removed = Object.keys(before).filter((p) => !(p in after)).sort();
  const added = Object.keys(after).filter((p) => !(p in before)).sort();
  const retyped = Object.keys(before).filter((p) => p in after && after[p] !== before[p]).sort();
  return { added, removed, retyped, level: removed.length || retyped.length ? 'major' : added.length ? 'minor' : 'none' };
};

/** Null when `now` is right for `level` over `was`; otherwise what is wrong with it. */
const verdict = (was: Semver, now: Semver, level: Level): string | null => {
  const [wa, wi, wp] = was;
  const [na, ni, np] = now;
  const order = na !== wa ? na - wa : ni !== wi ? ni - wi : np - wp;
  if (order < 0) return 'is BELOW the base\'s';
  if (level === 'none') return order > 0 ? 'was raised over the base\'s' : null;
  if (level === 'major') return na > wa ? null : 'needs a MAJOR increment over the base\'s';
  return na > wa || (na === wa && ni > wi) ? null : 'needs at least a MINOR increment over the base\'s';
};

// ---- the self-check: the rule's own copy against literal expectations ------------------------------------

const SELF_CHECK: { label: string; before: Record<string, string>; after: Record<string, string>; was: string; now: string; ok: boolean }[] = [
  { label: 'an addition at the base\'s number', before: { a: 'color' }, after: { a: 'color', b: 'color' }, was: '14.7.0', now: '14.7.0', ok: false },
  { label: 'an addition with a patch increment', before: { a: 'color' }, after: { a: 'color', b: 'color' }, was: '14.7.0', now: '14.7.1', ok: false },
  { label: 'an addition with a minor increment', before: { a: 'color' }, after: { a: 'color', b: 'color' }, was: '14.7.0', now: '14.8.0', ok: true },
  { label: 'an addition with a major increment', before: { a: 'color' }, after: { a: 'color', b: 'color' }, was: '14.7.0', now: '15.0.0', ok: true },
  { label: 'a removal with a minor increment', before: { a: 'color', b: 'color' }, after: { a: 'color' }, was: '14.7.0', now: '14.8.0', ok: false },
  { label: 'a removal with a major increment', before: { a: 'color', b: 'color' }, after: { a: 'color' }, was: '14.7.0', now: '15.0.0', ok: true },
  { label: 'a retype with a minor increment', before: { a: 'color' }, after: { a: 'dimension' }, was: '14.7.0', now: '14.8.0', ok: false },
  { label: 'nothing moved, the base\'s number', before: { a: 'color' }, after: { a: 'color' }, was: '14.7.0', now: '14.7.0', ok: true },
  { label: 'nothing moved, raised', before: { a: 'color' }, after: { a: 'color' }, was: '14.7.0', now: '14.7.1', ok: false },
  { label: 'nothing moved, lowered', before: { a: 'color' }, after: { a: 'color' }, was: '14.7.0', now: '14.6.0', ok: false },
  { label: 'a minor compared numerically, not as text', before: { a: 'color' }, after: { a: 'color', b: 'color' }, was: '9.9.0', now: '9.10.0', ok: true },
];
/** Hand-counted, not derived: a self-check that lost a case would otherwise report its smaller count as whole. */
const SELF_CHECK_CASES = 11;
const selfFails = SELF_CHECK.filter((c) => (verdict(semver(c.was, c.label), semver(c.now, c.label), moves(c.before, c.after).level) === null) !== c.ok)
  .map((c) => `${c.label} (${c.was} → ${c.now}): expected ${c.ok ? 'a pass' : 'a refusal'}`);
if (SELF_CHECK.length !== SELF_CHECK_CASES) selfFails.push(`the self-check has ${SELF_CHECK.length} case(s), not ${SELF_CHECK_CASES}`);
if (selfFails.length)
  die(['the self-check answered wrongly — the rule in this gate cannot be trusted on the real tree (#2334).', ...selfFails.map((f) => `    ✗ ${f}`)]);

// ---- the push-run replay: the first-parent step, run for real ----------------------------------------------
//
// On main's push run the merge base is HEAD, and only the first-parent step below stops a squash being compared
// with itself. Nothing on the real tree exercises that step on a pull request, so it would pass silently if it
// were lost (#2334 review). The replay builds a scratch repo whose main has just taken a squash that LOWERS the
// number, points `origin/main` at HEAD as a push run's checkout does, and runs this file there in a child. The
// child must refuse with "is BELOW the base's" against the first parent. A control commit after it, which moves
// nothing, must pass, so a refusal is the step working and not a broken scratch repo. Expected outcomes are
// literals here. Mutation: `onBase` forced to false → `✗ push run, a squash lowers the number: expected a refusal`.
const REPLAY_CASES = 2;
let replayed = 0;
if (!process.env[REPLAY_ENV]) {
  const dir = mkdtempSync(join(tmpdir(), 'p3-contract-replay-'));
  try {
    const sg = (...args: string[]) => spawnSync('git', ['-C', dir, '-c', 'user.name=replay', '-c', 'user.email=replay@example.invalid',
      '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' });
    const commit = (msg: string, version: string, guaranteed: Record<string, string>, extra?: string) => {
      mkdirSync(join(dir, 'packages/engine/schema'), { recursive: true });
      writeFileSync(join(dir, VERSION), `export const CONTRACT_VERSION = '${version}';\n`);
      writeFileSync(join(dir, BASELINE), JSON.stringify({ contractVersion: version, guaranteed }, null, 2));
      if (extra) writeFileSync(join(dir, 'README.md'), extra);
      const a = sg('add', '-A'), c = sg('commit', '-q', '-m', msg), u = sg('update-ref', 'refs/remotes/origin/main', 'HEAD');
      if (a.status || c.status || u.status) die(['the push-run replay could not build its scratch repo — this check CANNOT RUN.', `    ${(a.stderr || c.stderr || u.stderr).trim()}`]);
    };
    const env = { ...process.env, [REPLAY_ENV]: dir };
    delete env.GITHUB_BASE_REF; delete env.GITHUB_ACTIONS;
    const child = () => spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url)], { encoding: 'utf8', env });
    const fails: string[] = [];
    const expect = (label: string, refuse: boolean) => {
      const r = child();
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      const firstParent = out.includes('first parent — HEAD is on the base branch');
      const good = refuse ? r.status === 1 && out.includes('is BELOW the base\'s') && firstParent : r.status === 0 && firstParent;
      if (good) replayed++;
      else fails.push(`${label}: expected ${refuse ? 'a refusal, "is BELOW the base\'s", against the first parent' : 'a pass against the first parent'}; exit ${r.status}, ${out.trim().split('\n').filter((l) => /❌|✓|base /.test(l)).slice(0, 3).join(' | ') || '(no output)'}`);
    };
    if (sg('init', '-q').status) die(['the push-run replay could not `git init` a scratch repo — this check CANNOT RUN.']);
    commit('the base', '14.7.0', { a: 'color', b: 'color' });
    commit('a squash that lowers the number', '14.6.0', { a: 'color', b: 'color' });
    expect('push run, a squash lowers the number', true);
    commit('a control that moves nothing', '14.6.0', { a: 'color', b: 'color' }, 'control\n');
    expect('push run, a control that moves nothing', false);
    if (replayed + fails.length !== REPLAY_CASES) fails.push(`the replay ran ${replayed + fails.length} case(s), not ${REPLAY_CASES}`);
    if (fails.length) die(['the push-run replay answered wrongly — the first-parent base step cannot be trusted (#2334 review).', ...fails.map((f) => `    ✗ ${f}`)]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---- the base --------------------------------------------------------------------------------------------

const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
let baseRef: string | null = null;
const tried: string[] = [];
if (prBase) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    // The checkout's `origin/<base>` is as old as the run's start, and a PR that landed since may hold the
    // number this one claims (#2551's shape). Fetched again, and a failed fetch does not fall back.
    const f = git('fetch', '--no-tags', '--quiet', 'origin', `+refs/heads/${process.env.GITHUB_BASE_REF}:refs/remotes/${prBase}`);
    if (!f.ok)
      die([`could not refresh ${prBase} from origin — this check CANNOT RUN against the current base.`, `    ${f.err || '(git printed nothing)'}`,
        '  The stale ref is not a fallback: a number taken on the base branch since the checkout would read as free.']);
  }
  const r = git('rev-parse', '--verify', '--quiet', `${prBase}^{commit}`);
  tried.push(`${prBase} (GITHUB_BASE_REF, authoritative) — ${r.ok ? 'resolves' : 'does not resolve'}`);
  if (r.ok) baseRef = prBase;
} else {
  for (const cand of ['origin/main', 'main']) {
    const r = git('rev-parse', '--verify', '--quiet', `${cand}^{commit}`);
    tried.push(`${cand} — ${r.ok ? 'resolves' : 'does not resolve'}`);
    if (r.ok) { baseRef = cand; break; }
  }
}
if (!baseRef)
  die(['no base ref — this check CANNOT RUN, which is not the same as finding the number right.', `    tried: ${tried.join(' · ')}`,
    '  In CI, `ci.yml` sets `fetch-depth: 0`; locally, `git fetch origin main`.']);
const mb = git('merge-base', 'HEAD', baseRef!);
if (!mb.ok || !mb.out.trim())
  die([`no merge base between HEAD and ${baseRef} — this check CANNOT RUN.`, `    ${mb.err || '(git printed nothing)'}`, '  A shallow clone is the usual cause: `git fetch --unshallow`.']);
let base = mb.out.trim();
let how = 'merge base';
const onBase = git('rev-parse', 'HEAD').out.trim() === base;
if (onBase) {
  // Main's push run: the merge base is HEAD, and a comparison with it compares a squash with itself.
  const parent = git('rev-parse', '--verify', '--quiet', 'HEAD^1^{commit}');
  if (!parent.ok || !parent.out.trim())
    die(['HEAD is on the base branch and has no first parent — this check CANNOT RUN.',
      '  There the merge base is HEAD itself, so the parent is the only base that sees what this commit merged.']);
  base = parent.out.trim();
  how = 'first parent — HEAD is on the base branch';
}
const where = `base ${base.slice(0, 8)} (${baseRef}, ${how})`;

// ---- the two sides ---------------------------------------------------------------------------------------

const constantIn = (src: string, whence: string): string => {
  const m = /^export const CONTRACT_VERSION\s*=\s*'([^']+)';/m.exec(src);
  if (!m) return die([`cannot find CONTRACT_VERSION in ${VERSION} (${whence}) — this check CANNOT RUN.`,
    '  It must read `export const CONTRACT_VERSION = \'<MAJOR.MINOR.PATCH>\';`. A reworded declaration is updated here in the same PR.']);
  return m[1];
};
const guaranteedIn = (src: string, whence: string): Record<string, string> => {
  let parsed: { guaranteed?: Record<string, string> };
  try { parsed = JSON.parse(src); } catch (e) { return die([`${BASELINE} (${whence}) does not parse — this check CANNOT RUN.`, `    ${(e as Error).message}`]); }
  if (!parsed.guaranteed || typeof parsed.guaranteed !== 'object' || !Object.keys(parsed.guaranteed).length)
    return die([`${BASELINE} (${whence}) has no guaranteed paths — this check CANNOT RUN.`, '  Every claim here is "every path that …", and each is vacuously true of none.']);
  return parsed.guaranteed;
};
const atRev = (rev: string, p: string): string => {
  const r = git('show', `${rev}:${p}`);
  if (!r.ok) return die([`cannot read ${p} at ${rev.slice(0, 8)} — this check CANNOT RUN.`, `    ${r.err}`]);
  return r.out;
};
const atBase = (p: string): string => atRev(base, p);

const wasVersion = constantIn(atBase(VERSION), `at ${base.slice(0, 8)}`);
const nowVersion = constantIn(readFileSync(resolve(REPO, VERSION), 'utf8'), 'in the tree');
const m = moves(guaranteedIn(atBase(BASELINE), `at ${base.slice(0, 8)}`), guaranteedIn(readFileSync(resolve(REPO, BASELINE), 'utf8'), 'in the tree'));
const wrong = verdict(semver(wasVersion, `${VERSION} at ${base.slice(0, 8)}`), semver(nowVersion, `${VERSION} in the tree`), m.level);

const PRINT = 12;
const listing = (label: string, xs: string[]): string[] =>
  xs.length ? [`    ${label} (${xs.length}): ${xs.slice(0, PRINT).join(', ')}${xs.length > PRINT ? `, … and ${xs.length - PRINT} more` : ''}`] : [];

console.log(`self-check (#2334): ${SELF_CHECK.length}/${SELF_CHECK_CASES} cases of the increment rule answered as expected`);
if (!process.env[REPLAY_ENV]) console.log(`push-run replay (#2334 review): ${replayed}/${REPLAY_CASES} scratch-repo runs of this gate answered as expected`);
console.log(`Contract version against the base (#2334) — ${where}`);
console.log(`  CONTRACT_VERSION: ${wasVersion} at the base → ${nowVersion} in the tree`);
console.log(`  guaranteed paths since the base: ${m.added.length} added, ${m.removed.length} removed, ${m.retyped.length} retyped — ${m.level === 'none' ? 'no change' : `a ${m.level.toUpperCase()} change`}`);
if (wrong)
  die([
    `CONTRACT_VERSION ${nowVersion} ${wrong} ${wasVersion} — the guaranteed surface ${m.level === 'none' ? 'did not move' : `made a ${m.level.toUpperCase()} change`} since the base (#2334).`,
    `    ${where}`,
    ...listing('REMOVED', m.removed), ...listing('RETYPED', m.retyped), ...listing('ADDED', m.added),
    '',
    '  The base\'s number is read from git, so writing an old number back into version.ts and the baseline\'s',
    '  `contractVersion` together does not satisfy this: both of those are in the tree under check.',
    m.level === 'none'
      ? `  Restore CONTRACT_VERSION to ${wasVersion} in ${VERSION} and in the baseline (\`token-contract.ts --accept\` writes it).`
      : `  Raise CONTRACT_VERSION by a ${m.level} increment over ${wasVersion}, then \`npx tsx packages/engine/token-contract.ts --accept\`.`,
  ]);

// ---- the base branch as it stands now ---------------------------------------------------------------------
//
// Two PRs that each raise 14.7.0 to 15.0.0 for different removals make the identical edit to the number, so
// git merges them without a conflict, and each passed against a merge base at 14.7.0. So a branch that moved
// the surface is also held to the base branch's CURRENT number: if the base moved past the merge base, the
// branch's number must still be the increment its change needs over that. Off the base branch only, and only
// when the surface moved here; on main's push run the parent comparison above is the same question.
const tip = git('rev-parse', `${baseRef}^{commit}`).out.trim();
if (!onBase && m.level !== 'none' && tip && tip !== base) {
  const tipVersion = constantIn(atRev(tip, VERSION), `at ${tip.slice(0, 8)}`);
  console.log(`  ${baseRef} now ${tip.slice(0, 8)}: CONTRACT_VERSION ${tipVersion}`);
  const taken = verdict(semver(tipVersion, `${VERSION} at ${tip.slice(0, 8)}`), semver(nowVersion, `${VERSION} in the tree`), m.level);
  if (taken) {
    const by = git('log', '-1', '--format=%h %s', tip, '--', VERSION).out.trim() || '(no commit found)';
    die([
      `CONTRACT_VERSION ${nowVersion} ${taken} ${tipVersion}: ${baseRef} moved the number after this branch left it (#2334).`,
      `    set by: ${by}`,
      ...listing('this branch REMOVED', m.removed), ...listing('this branch RETYPED', m.retyped), ...listing('this branch ADDED', m.added),
      '',
      `  Merge ${baseRef} into this branch, raise CONTRACT_VERSION by a ${m.level} increment over ${tipVersion}, and re-run`,
      '  `token-contract.ts --accept`. Two changes under one number read as one surface to a consumer pinned to it.',
    ]);
  }
}
console.log(`  ✓ the number ${m.level === 'none' ? 'is the base\'s, and nothing moved' : `rose by at least the ${m.level} increment the change needs`}`);
