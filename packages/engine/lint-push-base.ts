/**
 * THE GIT-HISTORY GATES SEE A SQUASH ON MAIN'S PUSH RUN (#2556).
 *
 * `lint-emission-version.ts`, `lint-component-surface.ts`, `lint-component-renames.ts`,
 * `lint-materialization-renames.ts` and `lint-contract-version.ts` (#2334) each read a "before" out of
 * git at the merge base of HEAD and the base branch. On main's push run that merge base is HEAD itself, so each compared a squash commit with
 * itself and passed. A squash whose own diff breaks a gate's rule — two PRs that each passed against a
 * base that no longer exists, merged with no git conflict, as #2529 and #2548 were for the executor
 * revision (#2551) — landed green, and GitHub does not re-run a PR's CI when its base moves.
 * `comparison-base.ts` closes it: on the base branch each gate compares against HEAD's first parent.
 *
 * This file is the evidence that it stays closed. It replays main's push run against each REAL gate,
 * not against `comparison-base.ts` alone: a gate that stopped calling it, or a helper that went back to
 * the merge base, fails here by the gate's name.
 *
 * ── THE REPLAY ───────────────────────────────────────────────────────────────────────────────────────
 *
 * A throwaway clone in `$TMPDIR` (`git clone --shared`: the repo's objects, read-only, and its own refs),
 * on `main` at this checkout's HEAD with the working tree on top as one commit, so an uncommitted edit to
 * a gate is what gets replayed. Each case then commits on `main`, points `origin/main` at the result,
 * unsets `GITHUB_BASE_REF`, and runs the gate from the clone: the state of main's push run, where the
 * merge base is HEAD. At least two cases per gate, with literal expectations:
 *
 *   - **the squash breaks the rule** — its diff against its parent is one the gate exists to refuse, and
 *     the gate must fail with its own named assertion. Compared with the merge base, each of these passes.
 *   - **the squash is sound** — the same shape with the rule kept, and the gate must pass. Without it a
 *     gate that fails everything on main would read as caught.
 *
 * A case that answers wrongly, a case count off the hand-counted total, or a run that could not build
 * the clone fails this gate. It never skips.
 *
 * ── WHAT IT DOES NOT COVER ───────────────────────────────────────────────────────────────────────────
 *
 * The pull-request side. On a PR the merge base is not HEAD and `comparison-base.ts` returns it
 * unchanged; that path is what every PR's own run of the five gates exercises. Nor does any gate re-check
 * a stale PR run after its base moves: nothing in a gate can. The push run is where that is caught.
 *
 * A push run that does not complete. The push-run arm holds only for a run that reaches the five
 * gates: a cancelled run compares its squash with nothing, and the next run compares only its own
 * squash with its own parent. `ci.yml` therefore gives each push run on main its own concurrency
 * group and cancels in-progress runs on pull requests only; nothing here checks that setting.
 *
 * ── THE MERGE-QUEUE RUN (#4106) ──────────────────────────────────────────────────────────────────────
 *
 * The same replay holds the other run with no `GITHUB_BASE_REF`: a merge group. GitHub checks out the queue's
 * commit, which sits on `main` plus every group ahead of it, and the right before is the group's parent
 * (`merge_group.base_sha`, passed as `MERGE_GROUP_BASE_SHA`; `mergeGroupBase` in `comparison-base.ts`). Read against
 * `origin/main` instead, the diff holds the groups ahead too, and a PR passes on their change note, their progress
 * entry or their executor revision. So each QUEUE case commits a group ahead (A) on `main`, the queued PR (Q) on A,
 * leaves `origin/main` at `main`, and runs the real gate with `GITHUB_EVENT_NAME=merge_group` and the base set to A:
 *
 *   - **the queued PR breaks the rule against A** — it must fail by name. Each has a CONTROL: the same tree run
 *     without the merge-group rung (no event, so the ladder falls to `origin/main`), which must PASS. The control is
 *     what shows the case fails because of the base it read and nothing else (`docs/34`).
 *   - **the queued PR keeps the rule** — it must pass.
 *   - **FAIL CLOSED** — every gate here, under `merge_group` with the base unset, must fail naming
 *     `MERGE_GROUP_BASE_SHA`, never fall through to `origin/main`. Three more set a base that is not this group's
 *     parent, one per refusal in `mergeGroupBase`: a SHA that names no commit, HEAD itself, and a real commit HEAD
 *     does not contain (a side commit off `main`); each must fail with that refusal's own words.
 *
 * `lint-progress-order.ts` and `apps/plugin/lint-executor-revision.ts` join the replay for these cases: the two
 * whose queue failure is the one #4106 names (an entry carried by the PR ahead, two PRs raising the same revision).
 * The executor gate imports `typescript`, so the clone gets one symlink, `node_modules` → this checkout's, read only:
 * it is a scratch clone, not a worktree, and no package manager touches it. `apps/plugin/lint-executor-reach.ts` joins
 * for the unset fail-closed case only: that case dies at base resolution, in about two seconds, before any measuring.
 * A queue case where the revision rises would measure for minutes, so it has none. `apps/plugin/test-loose-host.ts`
 * (a browser-free but long suite) is not replayed at all, so its merge-group ladder is held by reading, not by any
 * gate: fail closed lives in each caller's ladder, not only in `mergeGroupBase` (the #4276 review's mutations).
 *
 * Run: `npx tsx packages/engine/lint-push-base.ts`
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

const GIT_ENV = {
  ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
};
const git = (dir: string, args: string[], input?: string): string => {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: GIT_ENV, input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0)
    die([`could not build the replay: git ${args.join(' ')} failed in ${dir} — this check CANNOT RUN.`, `    ${(r.stderr ?? '').trim() || '(git printed nothing)'}`]);
  return r.stdout ?? '';
};

// ---- the files each case perturbs ------------------------------------------------------------------------

const EMITTED = 'packages/engine/out/figma/prism3/focus.json';
const SURFACE = 'packages/engine/schema/component-surface.json';
const AXES = 'packages/engine/schema/component-axes.json';
const NOTE = 'packages/engine/changes/replay-push-base.md';
const VERSION = 'packages/engine/version.ts';
const CONTRACT = 'packages/engine/schema/token-contract.json';
const CONTRACT_RE = /^export const CONTRACT_VERSION = '(\d+)\.(\d+)\.(\d+)';/m;
const NOTE_TEXT = '---\nengine: minor\n---\nA replayed squash on main (lint-push-base.ts).\n';
const NOTE_QUEUED = 'packages/engine/changes/replay-push-base-queued.md';
const FRAGMENT_AHEAD = 'docs/progress/pending/replay-queue-ahead.md';
const FRAGMENT_QUEUED = 'docs/progress/pending/replay-queue-queued.md';
const fragment = (title: string) => `## (2026-03-01) — ${title}\n\nA replayed merge-group run (lint-push-base.ts, #4106).\n`;
const QUEUED_FILE = 'replay-queued.txt';
const EXECUTOR_ROOT = 'apps/plugin/src/write-components.ts';
const EXECUTOR_REVISION = 'apps/plugin/src/executor-revision.ts';
const REVISION_RE = /^export const EXECUTOR_REVISION = (\d+);/m;

type Edit = (dir: string) => void;
const edit = (path: string, f: (text: string) => string): Edit => (dir) => {
  const p = join(dir, path);
  const was = readFileSync(p, 'utf8');
  const now = f(was);
  // docs/34 corollary 2: a mutation that changed nothing would report whatever the unmutated tree does.
  if (now === was) die([`the replay's edit to ${path} changed nothing — this check CANNOT RUN.`, '  The file\'s shape moved; update the edit in this gate.']);
  writeFileSync(p, now);
};
const addNote: Edit = (dir) => writeFileSync(join(dir, NOTE), NOTE_TEXT);
const json = (path: string, f: (v: any) => void): Edit => edit(path, (t) => { const v = JSON.parse(t); f(v); return `${JSON.stringify(v, null, 2)}\n`; });

/** `CONTRACT_VERSION` with its MAJOR moved by `by`, the rest kept: a lowered or raised number. */
const contractMajor = (by: number): Edit => edit(VERSION, (t) => {
  if (!CONTRACT_RE.test(t)) return die([`${VERSION} has no \`export const CONTRACT_VERSION = 'M.m.p';\` — this check CANNOT RUN.`]);
  return t.replace(CONTRACT_RE, (_, a, i, p) => `export const CONTRACT_VERSION = '${Number(a) + by}.${i}.${p}';`);
});
const GHOST_PATH = 'replay.ghost';
/** `EXECUTOR_REVISION` raised by one. */
const raiseRevision: Edit = edit(EXECUTOR_REVISION, (t) => {
  if (!REVISION_RE.test(t)) return die([`${EXECUTOR_REVISION} has no \`export const EXECUTOR_REVISION = <n>;\` — this check CANNOT RUN.`]);
  return t.replace(REVISION_RE, (_, n) => `export const EXECUTOR_REVISION = ${Number(n) + 1};`);
});
/** A line of executor CODE, not a comment: the gate strips comments before it compares. */
const executorCode = (name: string): Edit => edit(EXECUTOR_ROOT, (t) => `${t}\nexport const ${name} = 1;\n`);
const write = (path: string, text: string): Edit => (dir) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); };

/** The first def in the surface baseline that projects a set. */
const firstSurfaceDef = (v: { defs: Record<string, { sha256: string } | null> }): { sha256: string } => {
  const d = Object.values(v.defs).find((x) => x !== null);
  if (!d) return die([`${SURFACE} has no projecting def — this check CANNOT RUN.`]);
  return d;
};
/** The first axis of the first def in the axes baseline. */
const firstAxis = (v: Record<string, { axes: Record<string, string[]> }>): string[] => {
  const d = Object.values(v)[0];
  const a = d && Object.values(d.axes)[0];
  if (!a || !a.length) return die([`${AXES} has no def with an axis — this check CANNOT RUN.`]);
  return a;
};

interface Case {
  gate: string;
  label: string;
  /** Committed on `main` first, so the squash below lands on it: the parent's state. In a QUEUE case, the group ahead. */
  parent: Edit[];
  /** The squash: committed on top, and HEAD for the run. In a QUEUE case, the queued PR. */
  squash: Edit[];
  expect: { fails: string } | 'passes';
  /** Unset: main's push run. Otherwise a merge-group run (#4106), its base the parent commit (`parent`), unset
   *  (`unset`), a SHA that names no commit (`bogus`) or HEAD itself (`head`); or the CONTROL, the same tree run with
   *  no merge-group rung (`control`). `origin/main` stays at `main` in every one. */
  queue?: 'parent' | 'unset' | 'bogus' | 'head' | 'notAncestor' | 'control';
}

// Each squash restores what its parent changed, or changes something itself: either way HEAD's tree is
// the real one plus at most a touched artifact and a note, so the gate's live arms (drift, floors) read a
// sound tree and only the cross-commit arm can answer.
const CASES: Case[] = [
  {
    gate: 'lint-emission-version', label: 'a squash moves an emitted artifact with no change note',
    parent: [], squash: [edit(EMITTED, (t) => `${t}\n`)],
    expect: { fails: 'the emission moved and no bump is declared' },
  },
  {
    gate: 'lint-emission-version', label: 'a squash moves an emitted artifact and adds a change note',
    parent: [], squash: [edit(EMITTED, (t) => `${t}\n`), addNote],
    expect: 'passes',
  },
  {
    gate: 'lint-component-surface', label: 'a squash moves a def\'s projected surface with no change note',
    parent: [json(SURFACE, (v) => { firstSurfaceDef(v).sha256 = '0'.repeat(64); })], squash: [restore(SURFACE)],
    expect: { fails: 'version: the baseline in this tree moved 1 def(s) vs the base, no added change note declares a bump' },
  },
  {
    gate: 'lint-component-surface', label: 'a squash moves a def\'s projected surface and adds a change note',
    parent: [json(SURFACE, (v) => { firstSurfaceDef(v).sha256 = '0'.repeat(64); })], squash: [restore(SURFACE), addNote],
    expect: 'passes',
  },
  {
    gate: 'lint-component-renames', label: 'a squash drops a variant value with no ledger entry',
    parent: [json(AXES, (v) => { firstAxis(v).push('replay-ghost'); })], squash: [restore(AXES)],
    expect: { fails: '=replay-ghost is gone — needs' },
  },
  {
    gate: 'lint-component-renames', label: 'a squash adds a variant value',
    parent: [json(AXES, (v) => { firstAxis(v).shift(); })], squash: [restore(AXES)],
    expect: 'passes',
  },
  {
    gate: 'lint-materialization-renames', label: 'a squash drops an emitted variable no rule claims',
    parent: [json(EMITTED, (v) => { v.variables.push({ ...v.variables[0], name: `${v.variables[0].name}-replay-ghost` }); })],
    squash: [restore(EMITTED)],
    expect: { fails: 'rule(s) do not account for it' },
  },
  {
    gate: 'lint-materialization-renames', label: 'a squash adds an emitted variable',
    parent: [json(EMITTED, (v) => { v.variables.shift(); })], squash: [restore(EMITTED)],
    expect: 'passes',
  },
  {
    gate: 'lint-contract-version', label: 'a squash lowers CONTRACT_VERSION with no path moved',
    parent: [], squash: [contractMajor(-1)],
    expect: { fails: 'is BELOW the base\'s' },
  },
  {
    gate: 'lint-contract-version', label: 'a squash drops a guaranteed path at the parent\'s number',
    parent: [json(CONTRACT, (v) => { v.guaranteed[GHOST_PATH] = 'color'; })], squash: [restore(CONTRACT)],
    expect: { fails: 'needs a MAJOR increment over the base\'s' },
  },
  {
    gate: 'lint-contract-version', label: 'a squash drops a guaranteed path with a MAJOR increment',
    parent: [json(CONTRACT, (v) => { v.guaranteed[GHOST_PATH] = 'color'; })], squash: [restore(CONTRACT), contractMajor(1)],
    expect: 'passes',
  },
];

// #4106 — THE MERGE-QUEUE RUN. A group ahead (A) on `main`, the queued PR (Q) on A, `origin/main` left at `main`.
const QUEUE_CASES: Case[] = [];
const queued = (gate: string, label: string, ahead: Edit[], breaks: Edit[], keeps: Edit[], fails: string): void => {
  QUEUE_CASES.push(
    { gate, label: `queued: ${label}, read against the group ahead`, parent: ahead, squash: breaks, expect: { fails }, queue: 'parent' },
    { gate, label: `queued: ${label}, CONTROL read against origin/main`, parent: ahead, squash: breaks, expect: 'passes', queue: 'control' },
    { gate, label: `queued: ${label}, and keeps the rule`, parent: ahead, squash: keeps, expect: 'passes', queue: 'parent' },
  );
};
queued('lint-emission-version', 'moves an emitted artifact with no change note while the group ahead added one',
  [edit(EMITTED, (t) => `${t}\n`), addNote], [edit(EMITTED, (t) => `${t}\n`)], [edit(EMITTED, (t) => `${t}\n`), write(NOTE_QUEUED, NOTE_TEXT)],
  'the emission moved and no bump is declared');
queued('lint-progress-order', 'carries no progress entry while the group ahead carried one',
  [write(FRAGMENT_AHEAD, fragment('Replay queue ahead'))], [write(QUEUED_FILE, 'queued\n')],
  [write(QUEUED_FILE, 'queued\n'), write(FRAGMENT_QUEUED, fragment('Replay queue queued'))],
  'CARRIES AN ENTRY');
queued('lint-executor-revision', 'changes the executor at the revision the group ahead already raised to',
  [executorCode('replayQueueAhead'), raiseRevision], [executorCode('replayQueueQueued')], [executorCode('replayQueueQueued'), raiseRevision],
  'EXECUTOR_REVISION did not rise');
const QUEUE_GATES = ['lint-emission-version', 'lint-component-surface', 'lint-component-renames', 'lint-materialization-renames',
  'lint-contract-version', 'lint-progress-order', 'lint-executor-revision', 'lint-executor-reach'];
for (const gate of QUEUE_GATES)
  QUEUE_CASES.push({ gate, label: 'fail closed: a merge-group run with MERGE_GROUP_BASE_SHA unset', parent: [], squash: [write(QUEUED_FILE, 'queued\n')], expect: { fails: 'MERGE_GROUP_BASE_SHA' }, queue: 'unset' });
QUEUE_CASES.push(
  { gate: 'lint-emission-version', label: 'fail closed: MERGE_GROUP_BASE_SHA names no commit', parent: [], squash: [write(QUEUED_FILE, 'queued\n')], expect: { fails: 'does not resolve to a commit' }, queue: 'bogus' },
  { gate: 'lint-executor-revision', label: 'fail closed: MERGE_GROUP_BASE_SHA is HEAD itself', parent: [], squash: [write(QUEUED_FILE, 'queued\n')], expect: { fails: 'is HEAD itself' }, queue: 'head' },
  // A real commit that is not this group's parent: a side commit off `main`, which HEAD does not contain (#4276 review).
  { gate: 'lint-emission-version', label: 'fail closed: MERGE_GROUP_BASE_SHA is a commit HEAD does not contain', parent: [], squash: [write(QUEUED_FILE, 'queued\n')], expect: { fails: 'is not an ancestor of HEAD' }, queue: 'notAncestor' },
);
const GATE_DIR: Record<string, string> = { 'lint-executor-revision': 'apps/plugin', 'lint-executor-reach': 'apps/plugin' };

/** Put `path` back as `main` has it: the squash that undoes the parent's edit. */
function restore(path: string): Edit {
  return (dir) => writeFileSync(join(dir, path), git(dir, ['show', `main:${path}`]));
}

/** Hand-counted, not derived: a replay that lost a case would otherwise report its smaller count as whole. */
const EXPECTED_CASES = 11;
const EXPECTED_QUEUE_CASES = 20;
const GATES = ['lint-emission-version', 'lint-component-surface', 'lint-component-renames', 'lint-materialization-renames', 'lint-contract-version'];

// ---- the clone -------------------------------------------------------------------------------------------

const work = mkdtempSync(join(tmpdir(), 'p3-push-base-'));
const failures: string[] = [];
let ran = 0;
let queueRan = 0;
try {
  const clone = join(work, 'r');
  const head = git(REPO, ['rev-parse', 'HEAD']).trim();
  git(work, ['clone', '-q', '--shared', '--no-checkout', REPO, clone]);
  git(clone, ['checkout', '-q', '-B', 'main', head]);
  // The working tree on top, as one commit: tracked edits by patch, untracked files by copy.
  const patch = git(REPO, ['diff', '--binary', 'HEAD']);
  if (patch) git(clone, ['apply', '--binary', '-'], patch);
  for (const p of git(REPO, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) {
    mkdirSync(dirname(join(clone, p)), { recursive: true });
    copyFileSync(join(REPO, p), join(clone, p));
  }
  git(clone, ['add', '-A']);
  if (git(clone, ['status', '--porcelain']).trim()) git(clone, ['commit', '-qm', 'the working tree']);

  // The executor gate imports `typescript`: one read-only symlink to this checkout's install (see the header).
  // Excluded by its own line: `node_modules/` in .gitignore matches a directory, not a link, and a case's `add -A`
  // would commit the link, and the next case's checkout of `main` would delete it.
  symlinkSync(join(REPO, 'node_modules'), join(clone, 'node_modules'), 'dir');
  writeFileSync(join(clone, '.git', 'info', 'exclude'), '/node_modules\n', { flag: 'a' });

  const baseEnv = { ...process.env };
  delete baseEnv.GITHUB_BASE_REF;
  delete baseEnv.GITHUB_ACTIONS;
  delete baseEnv.MERGE_GROUP_BASE_SHA;
  delete baseEnv.GITHUB_EVENT_NAME;
  // Each push case is main's push run, whatever run replays it: on a merge-queue run (#4106) the inherited event and
  // base SHA would otherwise send every gate to the queue's base, and each would CANNOT RUN.
  const pushEnv = { ...baseEnv, GITHUB_EVENT_NAME: 'push' };

  for (const c of [...CASES, ...QUEUE_CASES]) {
    if (c.queue) queueRan++; else ran++;
    git(clone, ['checkout', '-q', '-f', 'main']);
    git(clone, ['checkout', '-q', '-B', 'replay']);
    if (c.parent.length) {
      for (const e of c.parent) e(clone);
      git(clone, ['add', '-A']);
      git(clone, ['commit', '-qm', 'the parent']);
    }
    const parent = git(clone, ['rev-parse', 'HEAD']).trim();
    for (const e of c.squash) e(clone);
    git(clone, ['add', '-A']);
    git(clone, ['commit', '-qm', 'the squash']);
    let runEnv: NodeJS.ProcessEnv = pushEnv;
    if (!c.queue) {
      // Main's push run: `origin/main` is HEAD, and no pull request names a base.
      git(clone, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    } else {
      // A merge-group run: `main` has not moved yet, so `origin/main` is behind the group ahead.
      git(clone, ['update-ref', 'refs/remotes/origin/main', 'main']);
      const side = (): string => git(clone, ['commit-tree', 'main^{tree}', '-p', 'main', '-m', 'a side commit, not this group\'s parent']).trim();
      const sha = { parent, unset: undefined, bogus: 'f'.repeat(40), head: git(clone, ['rev-parse', 'HEAD']).trim(), notAncestor: c.queue === 'notAncestor' ? side() : undefined, control: undefined }[c.queue];
      runEnv = c.queue === 'control' ? { ...baseEnv } : { ...baseEnv, GITHUB_EVENT_NAME: 'merge_group', ...(sha ? { MERGE_GROUP_BASE_SHA: sha } : {}) };
    }
    const r = spawnSync(process.execPath, [...process.execArgv, join(clone, GATE_DIR[c.gate] ?? 'packages/engine', `${c.gate}.ts`)],
      { encoding: 'utf8', env: runEnv, maxBuffer: 64 * 1024 * 1024 });
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    const pass = r.status === 0;
    const ok = c.expect === 'passes' ? pass : !pass && out.includes(c.expect.fails);
    const lines = (r.stderr ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    const named = c.expect === 'passes' ? undefined : lines.find((l) => l.includes((c.expect as { fails: string }).fails));
    const said = pass ? 'a pass' : `exit ${r.status}: ${named ?? lines[0] ?? '(nothing on stderr)'}`;
    console.log(`  ${ok ? '✓' : '✗'} ${c.gate} — ${c.label}: ${said.slice(0, 160)}`);
    if (!ok)
      failures.push(`${c.gate} — ${c.label}: expected ${c.expect === 'passes' ? 'a pass' : `a failure containing "${c.expect.fails}"`}, got ${said}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

const covered = GATES.filter((g) => CASES.some((c) => c.gate === g && c.expect !== 'passes'));
if (ran !== EXPECTED_CASES) failures.push(`the replay ran ${ran} case(s), not ${EXPECTED_CASES}`);
for (const g of GATES) if (!covered.includes(g)) failures.push(`${g} has no case that must fail`);
if (queueRan !== EXPECTED_QUEUE_CASES) failures.push(`the merge-group replay ran ${queueRan} case(s), not ${EXPECTED_QUEUE_CASES}`);
for (const g of QUEUE_GATES) if (!QUEUE_CASES.some((c) => c.gate === g && c.queue === 'unset')) failures.push(`${g} has no merge-group case that must fail closed`);
if (failures.length)
  die([`a git-history gate answered main's push run wrongly — ${failures.length} problem(s) (#2556).`,
    ...failures.map((f) => `    ✗ ${f}`), '',
    '  On main the merge base is HEAD, so a gate comparing against it alone passes any squash.',
    '  `comparison-base.ts` compares against the first parent there; each gate must call it.',
    '  Under `merge_group` (#4106) the base is the group\'s parent, `MERGE_GROUP_BASE_SHA`, through `mergeGroupBase`;',
    '  each gate\'s ladder must try it first and fail when it is lost.']);
console.log(`✓ main's push run (#2556): ${ran}/${EXPECTED_CASES} replayed squashes answered as expected — each of the ${GATES.length} git-history gates fails a squash that breaks its rule and passes one that keeps it`);
console.log(`✓ the merge-queue run (#4106): ${queueRan}/${EXPECTED_QUEUE_CASES} replayed merge groups answered as expected — each queued PR that breaks a rule against the group ahead fails by name (its control, read against origin/main, passes), and each of the ${QUEUE_GATES.length} gates fails closed without its base`);
