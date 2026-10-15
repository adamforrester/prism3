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
 * Run: `npx tsx packages/engine/lint-push-base.ts`
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  /** Committed on `main` first, so the squash below lands on it: the parent's state. */
  parent: Edit[];
  /** The squash: committed on top, and HEAD for the run. */
  squash: Edit[];
  expect: { fails: string } | 'passes';
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

/** Put `path` back as `main` has it: the squash that undoes the parent's edit. */
function restore(path: string): Edit {
  return (dir) => writeFileSync(join(dir, path), git(dir, ['show', `main:${path}`]));
}

/** Hand-counted, not derived: a replay that lost a case would otherwise report its smaller count as whole. */
const EXPECTED_CASES = 11;
const GATES = ['lint-emission-version', 'lint-component-surface', 'lint-component-renames', 'lint-materialization-renames', 'lint-contract-version'];

// ---- the clone -------------------------------------------------------------------------------------------

const work = mkdtempSync(join(tmpdir(), 'p3-push-base-'));
const failures: string[] = [];
let ran = 0;
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

  const runEnv = { ...process.env };
  delete runEnv.GITHUB_BASE_REF;
  delete runEnv.GITHUB_ACTIONS;

  for (const c of CASES) {
    ran++;
    git(clone, ['checkout', '-q', '-f', 'main']);
    git(clone, ['checkout', '-q', '-B', 'replay']);
    if (c.parent.length) {
      for (const e of c.parent) e(clone);
      git(clone, ['commit', '-qam', 'the parent']);
    }
    for (const e of c.squash) e(clone);
    git(clone, ['add', '-A']);
    git(clone, ['commit', '-qm', 'the squash']);
    // Main's push run: `origin/main` is HEAD, and no pull request names a base.
    git(clone, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    const r = spawnSync(process.execPath, [...process.execArgv, join(clone, 'packages/engine', `${c.gate}.ts`)],
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
if (failures.length)
  die([`a git-history gate answered main's push run wrongly — ${failures.length} problem(s) (#2556).`,
    ...failures.map((f) => `    ✗ ${f}`), '',
    '  On main the merge base is HEAD, so a gate comparing against it alone passes any squash.',
    '  `comparison-base.ts` compares against the first parent there; each gate must call it.']);
console.log(`✓ main's push run (#2556): ${ran}/${EXPECTED_CASES} replayed squashes answered as expected — each of the ${GATES.length} git-history gates fails a squash that breaks its rule and passes one that keeps it`);
