/**
 * Prism3 — THE GATE RUNNER (#789).
 *
 *   npx tsx verify.ts            # every gate, in order, with a PASS/FAIL table
 *   npm run verify               # the same thing
 *   npx tsx verify.ts --list     # the authored list, run nothing
 *
 * WHY THIS EXISTS. `CLAUDE.md` §4, `CONTRIBUTING.md` §3 and the PR template each carry the gate
 * checklist as PROSE, and a contributor turns that prose into ~30 shell invocations by hand, every
 * PR, and then transcribes ~30 results back into a table. Both directions are unverified copies. The
 * failure that motivated this was not hypothetical or old: in one session the same checklist was
 * hand-assembled six times, and separately #601 and #602 each shipped `lint:classes` broken by
 * following a checklist faithfully. Prose cannot run. This can.
 *
 * NOTE ON COUNTS: nowhere — here, in the docs, or in the PR template — is the NUMBER of gates written
 * down, and that is deliberate. The run prints its own total. An authored count is a claim nothing
 * checks: this file's first version said "30" in five places, #799 added a gate an hour later, and all
 * five went stale at once (#786 had recorded the identical failure twice the same week). Arm 3 catches
 * the LIST going short, by name; nothing catches a stale numeral in a sentence. `EXPECTED_ARTIFACTS`
 * below is the one number kept, and it is a claim about the emitted tree that `ci.yml` also asserts.
 *
 * ── THE FIVE THINGS THE RUNNER ITSELF HAS TO GET RIGHT ──────────────────────────────────────────
 *
 * 1. THE EXIT STATUS IS CAPTURED WITH NOTHING BETWEEN IT AND THE COMMAND. This week a failing gate
 *    was reported as a PASS because the reading was taken as `npx tsx gate.ts 2>&1 | tail -2; echo
 *    $?` — `$?` is `tail`'s status, and `tail` succeeds at tailing a failure. `lint-us-english.ts`
 *    had exited 1 and the report said green. So this file runs nothing through a shell and nothing
 *    through a pipeline: `runGateCommand` spawns `argv` with `shell: false` and settles with the status
 *    and the output in ONE object, from ONE call (it was one `spawnSync` until point 5 needed a timer that
 *    runs while the gate does). There is no pipeline for a status to get lost in — the
 *    trap is unrepresentable here rather than remembered, which is the only version of that fix that
 *    survives an edit by someone who has not read this paragraph.
 *
 * 2. OUTPUT IS BUFFERED PER GATE, NOT STREAMED. ~30 gates interleaving thousands of lines is how a
 *    real failure gets read past. Each gate's stdout+stderr is held, and printed only for the gates
 *    that did not pass — so a clean run is a table, and a red run is a table plus exactly the output
 *    that matters. `--verbose` prints everything.
 *
 * 3. ORDER IS DECLARED PER GATE AND CHECKED, NOT LEFT TO THE ARRAY. Three orderings are load-bearing
 *    and each one, if violated, produces a PASS rather than an error: `lint-us-english.ts` and
 *    `lint-voice.ts` scan the built `apps/studio/dist/*.js`, so run before `build` they scan a stale
 *    bundle (the trap that got #302 and #310) — and as of #937 the US-English gate scans
 *    `apps/plugin/dist` too, so it now depends on TWO builds and its `after` names both;
 *    `tools/exporter-comparison/gate.ts` executes
 *    TokenPress's real exporter, so it needs the TokenPress build; the `node:`-builtin check reads
 *    `apps/plugin/dist/main.js`. So every gate declares `after: [...]`, and `assertOrder` checks the
 *    authored array against those declarations BEFORE running anything. The two halves are
 *    independent on purpose (`docs/34`): the constraint is declared per gate, the order is the array,
 *    and neither is derived from the other — sorting the array from `after` would make the check
 *    agree with itself.
 *
 * 4. IT REFUSES TO PRINT A PASS FOR A GATE THAT DID NOT RUN — represented, not counted. A runner's
 *    worst failure mode is the shape `lint-us-english.ts` guards against with `REQUIRED_SURFACES`:
 *    coverage silently shrinking while the report stays green. So the table has FOUR outcomes, not
 *    two — PASS, FAIL, SKIP and ADVISORY — a skip is never a pass, the summary line refuses to say
 *    "all gates pass" while any gate is unrun, and the exit status is non-zero if any gate did not
 *    reach a verdict. Every entry in `GATES` appears in the table in every run, including the ones
 *    that were skipped, so a gate that stopped running is visible rather than absent.
 *
 * 5. A GATE THAT HANGS FAILS, BY NAME, AT ITS TIME LIMIT (#2537). A full run once sat in `smoke` for
 *    two hours with its browser idle. Every command gate now has a limit (`DEFAULT_TIMEOUT_S`, a
 *    measured override for `chrome`, all scaled by `VERIFY_TIMEOUT_SCALE`); past it, the gate and every
 *    process it started are killed and the row reads FAIL with its elapsed time and "timed out" —
 *    never SKIP, ADVISORY or a pass. `timeoutSelfCheck` proves it on a real hanging fixture each run.
 *
 * ── WHY THE LIST IS AUTHORED HERE AND NOT PARSED OUT OF ci.yml ──────────────────────────────────
 *
 * Reading `ci.yml` to decide what to run would make this file agree with CI by construction, which
 * buys nothing: it could not disagree, so it could never report a discrepancy. That is `docs/34`'s
 * shape 2 exactly — the subject and the oracle sharing a derivation.
 *
 * AND IT CLOSES A HOLE THE OTHER FOUR ARTIFACTS CANNOT SEE. Today `ci.yml` is an unchecked oracle:
 * `lint-doc-gates.ts` compares three documents against it in ONE direction, so a gate that is
 * missing from `ci.yml` — a gate file that exists and is run by nobody — produces four artifacts in
 * perfect agreement and nothing fires. This list is compared against `ci.yml` in BOTH directions (see
 * `lint-doc-gates.ts`'s verify-list arm), so a step here that CI does not run fails, and a CI step
 * absent from here fails. Its sibling `assertNoOrphanGates` covers the remaining case from a third
 * direction: a `lint-*` file that exists in the repo and is named in nothing at all.
 *
 * Yes, this makes adding a gate a five-file edit. That is the `schema/payload-manifest.json`
 * reasoning: the friction is the feature, and the gate stays red until a human has said the same
 * thing in all five places on purpose.
 *
 * ── WHAT IS DELIBERATELY NOT IN THE LIST, AND WHY IT WOULD BE A DEFECT ──────────────────────────
 *
 * `CLAUDE.md` §4's Engine bullet opens "run `npx tsx packages/engine/regen.ts` first (regenerates
 * every committed artifact), then confirm: `regen.ts --check`". A bare `regen.ts` IS NOT A GATE HERE,
 * and running it would disarm the next one. `regen.ts --check` is the only gate in the repo that
 * reads the COMMITTED artifacts (`ci.yml` says so, and #281 is why it exists): it regenerates into a
 * snapshot and byte-compares against what is on disk. Run bare `regen.ts` first and what is on disk
 * IS the freshly generated output, so `--check` compares it with itself, passes unconditionally, and
 * the drift is still in `HEAD` — reported green. Note that CI does not run bare `regen.ts` either.
 *
 * That sequence is the AUTHORING workflow (regenerate → review the diff → commit), and this is the
 * VERIFICATION workflow. They are different jobs and the ordering constraint belongs to the first.
 * What the runner does instead is detect the condition: if the artifact tree is dirty, `--check`'s
 * answer is not a statement about `HEAD`, so that gate reports SKIP with the reason rather than a
 * pass it has not earned (see `driftCheckPrecondition`). Point 4 applied to a gate that ran fine and
 * answered a different question than the table implies.
 *
 * `npm ci` is not a gate either — it is the install step, asserts nothing, and a fresh worktree gets
 * it from the SessionStart hook (#782). It is the one `ci.yml` step this list is allowed to omit, and
 * that permission is declared by name in `lint-doc-gates.ts` rather than inferred from its shape.
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────────────────────────
 *
 * Not a replacement for CI, and not an authority on what the gates MEAN: every entry shells out to
 * the real gate, so this file has no opinion about tokens, contrast or contracts, and cannot make a
 * failing gate pass. It is a runner and a table. The one judgment it holds is ORDER, and the one
 * claim it makes about itself is that its list equals CI's.
 *
 * Dependency-free per repo convention.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = here;

/** The pinned tsx major, matching `ci.yml`'s call sites — a new major must not silently change how
 *  the engine parses. `--yes` so a cold cache does not turn into an interactive prompt. */
const TSX = ['npx', '--yes', 'tsx@4'];

const engine = (file: string, ...args: string[]) => [...TSX, `packages/engine/${file}`, ...args];
const ws = (workspace: string, script: string) => ['npm', 'run', '-w', workspace, script];

export type GateOutcome = 'PASS' | 'FAIL' | 'SKIP' | 'ADVISORY';

export type Gate = {
  /** Stable short key, used in the table and in `after` references. */
  id: string;
  /**
   * THE JOIN KEY: this gate's `- name:` in `.github/workflows/ci.yml`, verbatim.
   *
   * Matched as an exact string by `lint-doc-gates.ts` in both directions. That is a stronger contract
   * than the token matching the three prose documents get, and deliberately so — those are prose,
   * where `npm run typecheck -w X` and `npm run -w X typecheck` are the same instruction written two
   * ways, so tolerance is correct. This is code. A renamed CI step SHOULD fail here.
   */
  ciStep: string;
  /** argv, run with `shell: false`. Absent for a `derive` gate. */
  cmd?: string[];
  /**
   * Gates whose output this one reads instead of running a command.
   *
   * May return SKIP, and the distinction is point 4 again one level in: a derived gate whose INPUT
   * never ran has not found a defect, it has failed to reach a verdict. Reporting that as FAIL would
   * be safe (the run still exits non-zero) and still wrong — it would send a reader looking for a
   * broken artifact count when the truth is that nothing measured it.
   */
  derive?: (results: Map<string, Result>) => { outcome: 'PASS' | 'FAIL' | 'SKIP'; output: string };
  /** Ids that must appear EARLIER in `GATES`. Checked by `assertOrder` before anything runs. */
  after?: string[];
  /** Why the order matters, in one line. Required whenever `after` is set — an undocumented ordering
   *  constraint is the one a future edit removes as noise. */
  why?: string;
  /** A reason to SKIP, or `null` to run. Evaluated immediately before the gate, so it can see the
   *  effects of earlier gates. A skip is never a pass (point 4). */
  precondition?: () => string | null;
  /** Reported, never fatal. NO GATE SETS THIS TODAY — #775's smoke suite was the only one, and its
   *  window closed 2026-08-20 when the flip was earned. The mechanism is kept rather than deleted
   *  because the next advisory period should not have to reinvent it, and it stays exercised: the
   *  self-check below asserts an ADVISORY outcome is non-fatal, over a synthetic gate rather than a
   *  real one. If that self-check is ever removed, delete this field in the same change — an unused
   *  field with no test is how a mechanism rots into a wrong answer. */
  advisory?: boolean;
  /** This gate's time limit in seconds, when `DEFAULT_TIMEOUT_S` is wrong for it (point 5). Scaled by
   *  `VERIFY_TIMEOUT_SCALE` like the default. Set it only from a measured duration, and say which. */
  timeoutS?: number;
};

/**
 * POINT 5 — THE TIME LIMIT (#2537). A full run once sat in `smoke` for 7133s with its browser idle;
 * smoke's worst healthy time on the same machine is 360s. With no limit, one hung gate holds the whole
 * run, and the machine's single verify slot, until someone notices. So every gate that runs a command
 * has a limit, and a gate that reaches it is a FAIL, named, with its elapsed time: not a SKIP (it ran,
 * and it did not finish, which is a finding about the gate) and never ADVISORY or a pass.
 *
 * THE NUMBERS, measured from 131 full verify logs on the shared development machine (2026-08..10), the
 * worst healthy duration of each gate: chrome 1965s, plugin-test 440s, smoke 360s, engine-test 348s,
 * studio-test 234s, and every other gate under 160s. The default is 1200s: 2.7x the slowest gate it
 * covers, and still a sixth of the hang that motivated it. `chrome` gets 5400s: 2.7x its worst run
 * inside verify, and 1.6x the 55 minutes one standalone `test:chrome` once took under load.
 *
 * A SLOWER MACHINE scales every limit at once with `VERIFY_TIMEOUT_SCALE` (for example `2`). There is
 * no setting that turns the limit off: that would bring back the two-hour hang this exists to end.
 *
 * CI DOES NOT USE THESE. `ci.yml` runs each gate as its own step and never runs this loop (only
 * `verify.ts --list`), so CI's limits are GitHub's job timeout, unchanged by this.
 */
export const DEFAULT_TIMEOUT_S = 1200;

/** How long a timed-out gate gets between SIGTERM and SIGKILL. SIGTERM first because a Playwright
 *  suite closes its browser on SIGTERM, and the browser is in a process group of its own. */
const KILL_GRACE_MS = 10_000;

export const timeoutScale = (raw = process.env.VERIFY_TIMEOUT_SCALE): number => {
  if (raw === undefined || raw === '') return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`VERIFY_TIMEOUT_SCALE must be a number above 0 (got "${raw}"). It multiplies every gate's time limit.`);
  }
  return n;
};

export const timeoutMsOf = (gate: Gate, scale: number): number => (gate.timeoutS ?? DEFAULT_TIMEOUT_S) * scale * 1000;

/** The outcome of one gate command: exit status and output in ONE object, from ONE call (point 1). */
export type RunOutcome = {
  status: number | null;
  error?: Error;
  output: string;
  ms: number;
  timedOut: boolean;
  limitMs: number;
};

/** Every pid below `root`, read from one snapshot of the process table. Linux reads `/proc`; elsewhere
 *  `ps`. A tree walk from our own child's pid, never a match on a name or a command line. */
const descendantsOf = (roots: number[]): number[] => {
  const parentOf = new Map<number, number>();
  if (existsSync('/proc/self/stat')) {
    for (const d of readdirSync('/proc')) {
      if (!/^\d+$/.test(d)) continue;
      try {
        const stat = readFileSync(`/proc/${d}/stat`, 'utf8');
        // The command name (field 2) is in parentheses and may hold spaces, so read after the last ')'.
        const ppid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
        parentOf.set(Number(d), ppid);
      } catch { /* the process exited while we read */ }
    }
  } else {
    const r = spawnSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8', shell: false });
    for (const line of (r.stdout ?? '').split('\n')) {
      const [pid, ppid] = line.trim().split(/\s+/).map(Number);
      if (pid) parentOf.set(pid, ppid);
    }
  }
  const found = new Set<number>();
  let frontier = roots;
  while (frontier.length) {
    const next: number[] = [];
    for (const [pid, ppid] of parentOf) {
      if (frontier.includes(ppid) && !found.has(pid)) { found.add(pid); next.push(pid); }
    }
    frontier = next;
  }
  return [...found];
};

const signal = (pid: number, sig: NodeJS.Signals) => { try { process.kill(pid, sig); } catch { /* already gone */ } };

/**
 * Stop a gate and EVERYTHING it started. Two sets, because neither alone is enough:
 *   - the gate's process group (`-pid`), which holds whatever it spawned without detaching, and
 *   - every descendant pid, found by walking the process table from the gate's pid BEFORE anything is
 *     killed. Playwright launches its browser with `detached: true`, so the browser sits in a group of
 *     its own and a group kill misses it; once its parent dies it is reparented and the walk cannot
 *     find it either. Hence the snapshot first.
 * SIGTERM, then SIGKILL after `graceMs`. The SIGKILL list is the first snapshot plus a second one taken
 * from the pids still known, which catches anything spawned during the grace period.
 */
export const killTree = async (pid: number, graceMs: number): Promise<void> => {
  const first = descendantsOf([pid]);
  signal(-pid, 'SIGTERM');
  for (const d of first) signal(d, 'SIGTERM');
  await new Promise((r) => setTimeout(r, graceMs));
  const all = new Set([...first, ...descendantsOf([pid, ...first])]);
  signal(-pid, 'SIGKILL');
  for (const d of all) signal(d, 'SIGKILL');
};

/**
 * Run one gate command with a time limit. `detached: true` puts the gate in a process group of its own,
 * so `killTree` can stop the group without touching this runner. The promise settles on `close` (all
 * output read) or, after a time-out, once the whole kill sequence has run, whether or not a straggler
 * still holds the pipe open.
 */
export const runGateCommand = (
  cmd: string[],
  opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number; graceMs?: number; onSpawn?: (pid: number) => void },
): Promise<RunOutcome> => new Promise((resolveRun) => {
  const t0 = Date.now();
  let stdout = '';
  let stderr = '';
  let status: number | null = null;
  let timedOut = false;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (error?: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolveRun({ status, error, output: `${stdout}${stderr}`.trimEnd(), ms: Date.now() - t0, timedOut, limitMs: opts.timeoutMs });
  };
  const child = spawn(cmd[0], cmd.slice(1), {
    cwd: opts.cwd, env: opts.env, shell: false, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout!.setEncoding('utf8').on('data', (s: string) => { stdout += s; });
  child.stderr!.setEncoding('utf8').on('data', (s: string) => { stderr += s; });
  child.on('error', (e) => finish(e));
  child.on('exit', (code) => { status = code; });
  // After a time-out, `close` only marks the pipes done: the run settles when the kill sequence has
  // finished, so the SIGKILL pass can never be left pending behind the next gate or the runner's exit.
  let closed = false;
  child.on('close', () => { closed = true; if (!timedOut) finish(); });
  if (child.pid !== undefined) opts.onSpawn?.(child.pid);
  timer = setTimeout(async () => {
    timedOut = true;
    const grace = opts.graceMs ?? KILL_GRACE_MS;
    await killTree(child.pid!, grace);
    if (closed) { finish(); return; }
    // A straggler outside the tree may still hold the pipe; do not wait on it past one more grace.
    setTimeout(() => { child.stdout!.destroy(); child.stderr!.destroy(); finish(); }, grace);
  }, opts.timeoutMs);
});

/** The one place a command's run becomes a table outcome — the real loop and the self-check both call
 *  it (`docs/34`, shape 2). A time-out is checked FIRST: a killed gate also has `status === null`, and
 *  that branch would call it a SKIP. */
export const classifyRun = (run: RunOutcome, gate: Gate): { outcome: GateOutcome; output: string } => {
  if (run.timedOut) {
    const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
    return {
      outcome: 'FAIL',
      output: `${run.output || '(no output before the time limit)'}\n\n` +
        `✗ ${gate.id} timed out after ${s(run.limitMs)}, its limit, and was stopped (${s(run.ms)} in all, ` +
        `with the time it was given to exit). Its whole process tree was killed. The output above is ` +
        `everything it printed before then, so its last line is the step it was on. If this machine is ` +
        `just slow, set VERIFY_TIMEOUT_SCALE (see point 5 in verify.ts).`,
    };
  }
  // A gate that could not be LAUNCHED (spawn error, absent binary) has `status === null`. That is
  // not a failure of the gate and must never read as one — it is an unrun gate, which is a SKIP.
  if (run.error || run.status === null) {
    return { outcome: 'SKIP', output: run.error ? `could not launch \`${gate.cmd!.join(' ')}\`: ${run.error.message}` : run.output };
  }
  return { outcome: run.status === 0 ? 'PASS' : gate.advisory ? 'ADVISORY' : 'FAIL', output: run.output };
};

/** One table row. A timed-out gate's row says so, so the reason is on the line that names it. */
export const rowOf = (r: Result, timedOut = false): string => {
  const mark = { PASS: '✓', FAIL: '✗', SKIP: '⊘', ADVISORY: '⚠' }[r.outcome];
  return `  ${mark} ${r.outcome.padEnd(8)} ${r.gate.id.padEnd(26)} ${(r.ms / 1000).toFixed(1)}s${timedOut ? '  timed out' : ''}`;
};

/**
 * `regen.ts --check` compares the generated output against WHAT IS ON DISK. That is a statement about
 * `HEAD` only while the artifact tree is clean; with uncommitted changes under `out/` it is a
 * statement about the working tree, and a PASS would mean something the table does not say. So this
 * reports SKIP with the reason rather than a pass it has not earned — see the header's
 * "deliberately not in the list".
 *
 * Also the reason the runner needs the check at all: an agent mid-task very often HAS a dirty `out/`.
 */
export const driftCheckPrecondition = (): string | null => {
  const r = spawnSync('git', ['status', '--porcelain', '--', 'packages/engine/out'], {
    cwd: repoRoot, encoding: 'utf8', shell: false,
  });
  if (r.status !== 0) return null; // not a git tree, or git unavailable — let the gate speak for itself
  const dirty = r.stdout.split('\n').filter((l) => l.trim());
  if (!dirty.length) return null;
  return `packages/engine/out has ${dirty.length} uncommitted change(s), so --check would compare the ` +
    `generated output against your working tree rather than against HEAD. Commit or stash them, then rerun.`;
};

/** Where Playwright looks for its downloaded browsers — shared by `chromiumPrecondition` and
 *  `environmentProblems` below so the path logic has exactly one copy (the same "one predicate, not
 *  two copies that drift" reasoning `chromiumPrecondition`'s own header already states for #870). */
const browserCacheDir = (): string =>
  process.env.PLAYWRIGHT_BROWSERS_PATH
    || (process.platform === 'darwin' ? join(process.env.HOME ?? '', 'Library/Caches/ms-playwright') : join(process.env.HOME ?? '', '.cache/ms-playwright'));

/**
 * The two browser gates' shared skip reason: no Chromium on this machine.
 *
 * Absent, a browser suite must SKIP rather than FAIL — a missing browser is an ambient-setup fact
 * about this machine, not a defect in the change under test — and it must not be a PASS either, which
 * is the whole of point 4.
 *
 * ONE PREDICATE FOR BOTH, and this is a sharing that is correct rather than the `docs/34` trap: these
 * are two consumers of one environment question, not a gate and the thing it checks. The alternative
 * is the shape this file exists to prevent one tier up — the second browser gate (#870) copying the
 * cache-path logic, and a fixed path drifting in one copy so one suite skips honestly while the other
 * reports a browser it does not have.
 *
 * DELIBERATELY LOOSE — "is there ANY chromium-ish directory here" — and that looseness is exactly
 * what `environmentProblems` exists to cover for (#935): a cache holding the WRONG revision satisfies
 * this and still fails the real gate later. Tightening this predicate to check the exact revision was
 * considered and rejected — it would have to duplicate the version-to-revision logic the preflight
 * below deliberately avoids duplicating (see that function's header), and this predicate's job is only
 * ever "SKIP rather than run with nothing" for a fully empty cache. Version-correctness is the
 * preflight's job, checked once before anything is selected to run, not this predicate's.
 */
const chromiumPrecondition = (): string | null => {
  const cache = browserCacheDir();
  const has = existsSync(cache) && readdirSync(cache).some((d) => d.startsWith('chromium'));
  return has ? null : 'no Chromium in the Playwright browser cache — run `npx playwright install chromium` once, then rerun';
};

/**
 * PREFLIGHT (#935) — a THIRD kind of red, distinct from a failing gate, for the two ways a fresh
 * container fails BOTH browser gates for reasons that have nothing to do with the diff:
 *
 *   1. `playwright` is a devDependency (`apps/studio` + `apps/plugin`, hoisted to the repo root) that
 *      a container provisioned before #775/#883 flipped smoke to gating simply does not have.
 *      `spawnSync` still launches `npm run … test:smoke` fine — npm exists — so the child process
 *      dies with `ERR_MODULE_NOT_FOUND` and a non-null exit code, which point 4 correctly reports as
 *      FAIL. Correctly reported, and still the wrong verdict: nothing about the change under test
 *      caused it.
 *   2. The pre-installed browser cache is pinned to whatever revision was baked into the container
 *      image, and `package-lock.json` moves independently of it. `chromiumPrecondition` above only
 *      asks "is there a Chromium here at all", which cannot see a cache that has the WRONG one — the
 *      two gates then run, launch, and fail on a Playwright "Executable doesn't exist" error, which
 *      again is a genuine FAIL by point 4's own rule, and again is not about the diff.
 *
 * THREE LANES (#883, #910, #929) each hit this, each correctly declined to fix an environment problem
 * inside an unrelated PR, and each then had to argue in the PR body that a red run was fine — which is
 * the exact judgment this file exists to remove (see the header's "WHY THIS EXISTS"). A standing,
 * known-benign-looking FAIL trains a lane to annotate red instead of trusting it, and the next failure
 * that looks environmental and is not gets the same sentence.
 *
 * SO THIS RUNS BEFORE ANY GATE, NOT AS ONE. Structurally excluded from `GATES` on purpose — no `id`,
 * no `ciStep`, never reaches `results`/`verdictOf` — which is what keeps it invisible to
 * `lint-doc-gates.ts`'s bidirectional comparison against `ci.yml` (see the header's "WHY THE LIST IS
 * AUTHORED HERE"). A preflight that read as a 39th gate would need a `ci.yml` step, a `CONTRIBUTING.md`
 * §3 line and a PR-template line to stay green under that gate's own rule — for a check that asserts
 * nothing about the CODE under test. Reported through its own message shape instead (`ENVIRONMENT NOT
 * READY`, never `N/M gates … PASS/FAIL`), so a lane cannot mistake it for either a pass or a gate
 * failure without reading a word of it.
 *
 * WHY THIS LAUNCHES A REAL BROWSER RATHER THAN COMPUTING A PATH. The obvious-looking cheap version —
 * read `chromium.executablePath()` and check `existsSync` — was tried first here and is WRONG: that
 * path resolves to the plain `chromium-<rev>` build, and `chromium.launch()` with no options (exactly
 * what `test-smoke.mjs` and `test-build-verdict.mjs` both call) launches `chromium_headless_shell-<rev>`
 * instead — a DIFFERENT revision directory. Measured directly: with only `chromium_headless_shell-1234`
 * removed, `executablePath()` still returned a path that exists (the plain build was untouched) while
 * `chromium.launch()` still threw `Executable doesn't exist at …chrome-headless-shell`. A preflight
 * built on the cheap check would have reported READY while the real gate still failed — `docs/34`'s
 * point exactly: this check would itself be the identical defect it exists to catch. So rather than
 * duplicate Playwright's revision-selection logic (and inherit whatever it does next time that logic
 * changes), this performs the SAME operation the real gates perform — launch, then immediately close —
 * and reads the real failure Playwright itself reports. No revision number is hardcoded anywhere in
 * this file; asking Playwright is what keeps this from becoming the next stale landmark (#568).
 *
 * SCOPED TO WHEN IT MATTERS, not every invocation: the caller only awaits this when `selected` contains
 * a gate whose `precondition` is `chromiumPrecondition` — the same marker that already identifies "the
 * two browser gates" for that predicate, so there is no second hardcoded id list to drift out of step
 * with the first (the exact sibling-gate hazard `chromiumPrecondition`'s own header names for #870).
 * `verify.ts engine-test` on a container with no browsers at all pays nothing for this.
 *
 * THE TWO CHECKS ARE INDEPENDENT, on purpose, and neither short-circuits the other. `playwright`
 * missing and the browser cache holding the wrong revision are two unrelated facts — one about
 * `node_modules`, one about `/opt/pw-browsers` or `~/.cache/ms-playwright` — and a container can be
 * missing on either axis without the other. So the browser-launch check below drives
 * **`playwright-core`** directly rather than `playwright`: `playwright-core` is the package that
 * actually resolves a revision and launches it (`playwright` is a thin wrapper that re-exports it),
 * so it can confirm or refute the browser cache even on a container where `playwright` itself is the
 * thing absent — which is exactly the state a mutation test of "remove `playwright`, ALSO point the
 * cache at the wrong revision" produces, and the one case a short-circuited version of this function
 * would report only the first of two real problems for.
 */
export const environmentProblems = async (): Promise<string[]> => {
  const problems: string[] = [];

  const pwPkg = resolve(repoRoot, 'node_modules/playwright/package.json');
  if (!existsSync(pwPkg)) {
    problems.push(
      'playwright is not installed (apps/studio and apps/plugin both depend on it for their browser ' +
      'suites, hoisted to the repo root node_modules) — run `npm ci`.',
    );
  }

  const corePkg = resolve(repoRoot, 'node_modules/playwright-core/package.json');
  if (!existsSync(corePkg)) {
    // Nothing left to check without a launcher at all — the message above (if pushed) is already the
    // complete remedy; if `playwright` was present but `playwright-core` somehow is not, that is itself
    // an `npm ci`-shaped problem this predicate has no more specific name for.
    if (!problems.length) {
      problems.push('playwright-core is not installed (playwright\'s own launcher) — run `npm ci`.');
    }
    return problems;
  }
  const coreVersion = (JSON.parse(readFileSync(corePkg, 'utf8')) as { version: string }).version;
  try {
    const req = createRequire(resolve(repoRoot, 'package.json'));
    const core = req('playwright-core') as typeof import('playwright-core');
    const browser = await core.chromium.launch();
    await browser.close();
  } catch (e) {
    const message = (e as Error).message.split('\n')[0];
    const cache = browserCacheDir();
    const cached = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium')).sort() : [];
    const have = cached.length ? cached.join(', ') : '(nothing)';
    problems.push(
      `playwright-core ${coreVersion} could not launch Chromium headless (${message}) — the browser ` +
      `cache does not match this playwright version. Cache currently has: ${have}. Run ` +
      '`npx playwright install chromium chromium-headless-shell` (writes outside node_modules, the ' +
      'one-off download CLAUDE.md already sanctions), then rerun.',
    );
  }
  return problems;
};

/** The artifact-count meta-check, taken from the drift gate's ALREADY-CAPTURED output rather than by
 *  running `regen.ts --check` a second time (it is among the slowest gates here). This is what
 *  buffering per gate buys — point 2 paying for itself. Mirrors `ci.yml`'s own step. */
const EXPECTED_ARTIFACTS = 224;

/* #775's window closed 2026-08-20 and the smoke suite gates in both CI and this runner, so the
 * date constant and its clock read are GONE rather than left at a passed date. They existed to stop
 * this runner being quietly weaker than CI while the flag was on; with no flag there is nothing for
 * them to keep in step, and a live date comparison that can only ever return one answer reads as a
 * decision still being made. Deleting them is also what makes `lint-advisory-expiry.ts` able to
 * report zero here: a date left behind in a comment is still a date it scans. */

/**
 * THE AUTHORED LIST — the fourth statement of what the gates are, beside `CLAUDE.md` §4,
 * `CONTRIBUTING.md` §3 and the PR template, and the fifth artifact once `ci.yml` is counted. Compared
 * against `ci.yml` in BOTH directions by `lint-doc-gates.ts`.
 *
 * ORDER IS THE CONTRACT. Roughly cheapest-first like `ci.yml`, so a fast failure reports fast, with
 * the three real dependencies declared via `after`. Do not sort this array.
 */
export const GATES: Gate[] = [
  {
    id: 'engine-test',
    ciStep: 'Engine unit tests',
    cmd: engine('test.ts'),
  },
  {
    id: 'mcp-test',
    ciStep: 'MCP conformance + journey',
    cmd: engine('mcp-test.ts'),
  },
  {
    id: 'nb-regression',
    ciStep: 'NB regression',
    cmd: engine('nb-regression.ts'),
  },
  {
    id: 'drift',
    ciStep: 'Committed artifacts have not drifted',
    cmd: engine('regen.ts', '--check'),
    precondition: driftCheckPrecondition,
  },
  {
    // AFTER `drift` deliberately: this reads the emission `regen` writes, so running it against a stale
    // `out/figma/**` would account for a tree nobody emitted. It does NOT declare `after: ['drift']` —
    // that field makes a gate DERIVE from another's captured output, and this one runs its own process.
    // Position in the list is the ordering; the dependency is on regen having run, not on its verdict.
    id: 'lint-materialization-renames',
    ciStep: 'A materialization rename is recorded as a rule, and the accounting over it is total',
    cmd: engine('lint-materialization-renames.ts'),
  },
  {
    id: 'lint-emission-version',
    ciStep: 'The emission moved only with ENGINE_VERSION',
    cmd: engine('lint-emission-version.ts'),
  },
  {
    // Beside the gate above because it answers the same question about the surface that gate cannot
    // see: component payloads are never committed under `out/`, so a def change that moves the
    // projected Figma set leaves the emission gate with nothing to report. Needs no `after` — it
    // projects from `componentDefs` in its own process and reads no other gate's output.
    id: 'lint-component-surface',
    ciStep: 'The projected component surface moved only with ENGINE_VERSION',
    cmd: engine('lint-component-surface.ts'),
  },
  {
    // A removed variant needs a ledger entry (#2265). Reads the axes baseline at the merge base with
    // `git show`, so like the two above it needs history and fails when it has no base ref.
    id: 'lint-component-renames',
    ciStep: 'A removed component variant is declared in COMPONENT_RENAMES (#2265)',
    cmd: engine('lint-component-renames.ts'),
  },
  {
    // The four git-history gates above, replayed on main's push run in a `$TMPDIR` clone (#2556): a
    // squash that breaks a gate's rule must fail by that gate's own assertion. Runs the gates itself.
    id: 'lint-push-base',
    ciStep: "On main's push run each git-history gate compares a squash with its parent (#2556)",
    cmd: engine('lint-push-base.ts'),
  },
  {
    // The executor's code at the merge base against the tree (#1098, #2265). Source only, so it needs
    // no build; it sits here with the other git-history gates rather than after the plugin build.
    id: 'lint-executor-revision',
    ciStep: "The component executor's code moved only with EXECUTOR_REVISION (#1098, #2265)",
    cmd: [...TSX, 'apps/plugin/lint-executor-revision.ts'],
  },
  {
    id: 'drift-coverage',
    ciStep: 'Drift gate still covers the full artifact set',
    after: ['drift'],
    why: 'reads the drift gate\'s captured output instead of running regen --check twice',
    derive: (results) => {
      const drift = results.get('drift');
      // Its input did not RUN — unknown, not wrong. A SKIP here still makes the run non-green.
      if (!drift || drift.outcome === 'SKIP') {
        return { outcome: 'SKIP', output: `the drift gate ${drift ? 'was skipped' : 'did not run'}, so there is no artifact count to read` };
      }
      if (drift.outcome !== 'PASS') {
        return { outcome: 'FAIL', output: 'the drift gate FAILED, so its artifact count cannot be trusted' };
      }
      const m = /(\d+) committed artifacts/.exec(drift.output);
      if (!m) {
        return { outcome: 'FAIL', output: "the drift gate's output no longer reports \"N committed artifacts\" — this meta-check has gone blind" };
      }
      const n = Number(m[1]);
      return n === EXPECTED_ARTIFACTS
        ? { outcome: 'PASS', output: `${n} committed artifacts — full set covered` }
        : {
            outcome: 'FAIL',
            output: `artifact coverage changed — expected ${EXPECTED_ARTIFACTS}, got ${n}. If the set legitimately ` +
              `grew or shrank, update EXPECTED_ARTIFACTS here AND the same number in ci.yml, same PR.`,
          };
    },
  },
  {
    id: 'token-contract',
    ciStep: 'Token name contract (breaking-change gate)',
    cmd: engine('token-contract.ts', '--check'),
  },
  {
    // The number against the merge base's (#2334): the step above compares two things in the tree,
    // which agree after an old number is written back into both. Reads git, so it needs history.
    id: 'lint-contract-version',
    ciStep: "CONTRACT_VERSION moved by the increment the surface needs, against the base (#2334)",
    cmd: engine('lint-contract-version.ts'),
  },
  {
    // #2637 — docs/public/reference/commands.json against the code it is generated from. Reads the source
    // files only, so it needs no `after`.
    id: 'agent-reference',
    ciStep: 'The agent reference matches the code (#2637)',
    cmd: engine('emit-agent-reference.ts', '--check'),
  },
  {
    // #2647 — docs/public/reference/figma-conventions.json against the code it is generated from. Reads the
    // source files and the default theme only, so it needs no `after`.
    id: 'figma-conventions',
    ciStep: 'The Figma conventions file matches the code (#2647)',
    cmd: engine('emit-figma-conventions.ts', '--check'),
  },
  {
    id: 'typecheck-web',
    ciStep: 'Typecheck web',
    cmd: ws('@prism3/studio', 'typecheck'),
  },
  {
    id: 'studio-test',
    ciStep: 'Studio unit tests',
    cmd: ws('@prism3/studio', 'test'),
  },
  {
    id: 'build-web',
    ciStep: 'Build web',
    cmd: ws('@prism3/studio', 'build'),
  },
  {
    id: 'check-ignore',
    ciStep: 'Vercel ignore list matches the real bundle',
    cmd: ws('@prism3/studio', 'check:ignore'),
    after: ['build-web'],
    why: 'it checks the exclusion list against esbuild\'s real metafile',
  },
  {
    id: 'lint-contrast',
    ciStep: 'Studio chrome clears its own contrast floors',
    cmd: ws('@prism3/studio', 'lint:contrast'),
  },
  {
    id: 'typecheck-plugin',
    ciStep: 'Typecheck plugin',
    cmd: ws('@prism3/plugin', 'typecheck'),
  },
  {
    id: 'plugin-test',
    ciStep: 'Plugin shim tests',
    cmd: ws('@prism3/plugin', 'test'),
  },
  {
    id: 'build-plugin',
    ciStep: 'Build plugin',
    cmd: ws('@prism3/plugin', 'build'),
  },
  {
    // #2530 (owner Q239 A): the release build, `release/`, with every dev-only branch dropped.
    id: 'build-plugin-release',
    ciStep: 'Build plugin (release)',
    cmd: ws('@prism3/plugin', 'build:release'),
  },
  {
    // ci.yml implements this as an inline grep; here it is a `derive` because it asserts a property of
    // a FILE, not of a command's exit status, and shelling out to grep for it would reintroduce the
    // pipeline that point 1 exists to keep out.
    id: 'plugin-no-node-builtins',
    ciStep: 'Plugin main.js has 0 node: builtins',
    after: ['build-plugin'],
    why: 'it reads the dist/main.js the plugin build just wrote',
    derive: () => {
      const dist = resolve(repoRoot, 'apps/plugin/dist/main.js');
      if (!existsSync(dist)) {
        return { outcome: 'FAIL', output: `${dist} does not exist — the plugin build did not write it` };
      }
      const hits = readFileSync(dist, 'utf8').split('\n')
        .map((l, i) => [i + 1, l] as const)
        .filter(([, l]) => l.includes('node:'));
      return hits.length === 0
        ? { outcome: 'PASS', output: '0 node: builtins in apps/plugin/dist/main.js' }
        : {
            outcome: 'FAIL',
            output: `apps/plugin/dist/main.js references a node: builtin — the main thread must stay ` +
              `sandbox-safe (it breaks at LOAD in Figma, not at typecheck or build):\n` +
              hits.slice(0, 10).map(([n, l]) => `  ${n}: ${l.trim().slice(0, 160)}`).join('\n'),
          };
    },
  },
  {
    // The panel's own browser suite, and the SECOND browser gate here — see `chromiumPrecondition` for
    // why both share one skip predicate. It is a separate suite from `smoke` rather than more cases in
    // it because the subject is a different bundle: the Components page is `figmaOnly`, so the studio's
    // web bundle has no route to the control this asserts.
    id: 'plugin-verdict',
    ciStep: 'Component-build verdict suite (#870)',
    cmd: ws('@prism3/plugin', 'test:verdict'),
    after: ['build-plugin'],
    why: 'it drives the dist/ui.html the plugin build just wrote, in a browser',
    precondition: chromiumPrecondition,
  },
  {
    // The panel's THIRD browser suite, and a separate one for the same reason `plugin-verdict` is
    // separate from `smoke`: the subject is a plugin-only TRIGGER. The web decides "nothing is stored"
    // synchronously in `bootBrand`; the plugin learns it from a host message that lands after boot, so
    // the behaviour under test does not exist in the web bundle at any effort.
    id: 'plugin-start',
    ciStep: 'Plugin start-moment suite (#1197)',
    cmd: ws('@prism3/plugin', 'test:start'),
    after: ['build-plugin'],
    why: 'it drives the dist/ui.html the plugin build just wrote, in a browser',
    precondition: chromiumPrecondition,
  },
  {
    // UI redesign S1.2: the new shell's chrome, measured as rendered. It drives BOTH bundles — the
    // studio's dist/main.js and the plugin's dist/ui.html — so it is ordered after both builds.
    id: 'chrome',
    ciStep: 'New shell chrome suite (UI redesign S1.2)',
    cmd: ws('@prism3/studio', 'test:chrome'),
    after: ['build-web', 'build-plugin'],
    why: 'it drives the built dist/main.js and dist/ui.html in a browser',
    precondition: chromiumPrecondition,
    // Measured: 1965s at worst inside verify, and one standalone run took 55 minutes under load (point 5).
    timeoutS: 5400,
  },
  {
    // #2898: CI runs the suite above in shards; this holds what they ran to the sections the unsharded suite lists,
    // each exactly once, then runs the suite's end-of-run checks over every shard. Here it reads the whole run's
    // record (`apps/studio/chrome-record/all.json`), which must name every section once and its own end-of-run checks.
    id: 'chrome-shards',
    ciStep: 'Every chrome section ran in exactly one shard (#2898)',
    cmd: ws('@prism3/studio', 'test:chrome-shards'),
    after: ['chrome'],
    why: 'it reads the record the chrome suite writes',
  },
  {
    // #2351 gap 1: the web and plugin token exports of every committed brand are byte-identical to each
    // other and to out/<id>.tokens.json. It downloads from BOTH built bundles, so it runs after both builds.
    id: 'export-parity',
    ciStep: 'The web and plugin token exports agree, byte for byte (#2351)',
    cmd: ws('@prism3/studio', 'test:export-parity'),
    after: ['build-web', 'build-plugin'],
    why: 'it downloads the export from the built dist/main.js and dist/ui.html in a browser',
    precondition: chromiumPrecondition,
  },
  {
    // #2201: a live styles.css rule is not removed without an explicit accept. STATIC at check time — it
    // parses the current styles.css with Chromium's CSS parser (hence the precondition) and compares it to
    // apps/studio/live-css.json, the rules the browser suites' pages were seen to draw. It reads neither
    // bundle, so it declares no `after`; the sweep that records the baseline runs only under --accept.
    id: 'lint-live-css',
    ciStep: 'A live styles.css rule is not removed without an accept (#2201)',
    cmd: ws('@prism3/studio', 'lint:live-css'),
    precondition: chromiumPrecondition,
  },
  {
    // The FOURTH component-tier suite, and the only one whose ACTUAL comes from the HOST rather than
    // from the plan. `plugin-test` drives the executor and asserts what the executor reports;
    // this reads the built tree back and diffs it against the plan, which is the direction that
    // catches a field the executor never wrote.
    id: 'plugin-roundtrip',
    ciStep: 'Component round-trip: the file holds what the plan declared (#874)',
    cmd: ws('@prism3/plugin', 'test:roundtrip'),
    after: ['plugin-test'],
    why: 'it drives the same executor and shim, and a failure there explains a failure here',
  },
  {
    id: 'tokenpress-test',
    ciStep: 'TokenPress tests',
    cmd: ws('@prism3/tokenpress', 'test'),
  },
  {
    id: 'tokenpress-build',
    ciStep: 'Build TokenPress',
    cmd: ws('@prism3/tokenpress', 'build'),
  },
  {
    id: 'exporter-comparison',
    ciStep: 'The two DTCG exporters agree where a difference would be a defect',
    cmd: [...TSX, 'tools/exporter-comparison/gate.ts'],
    after: ['tokenpress-build'],
    why: "it executes TokenPress's real TokenExporter in memory",
  },
  {
    // #2351 gap 2 (offline): the plugin's Apply Theme, written into the file shim, exports through TokenPress's
    // real exporter to the same DTCG as the engine's Figma emission does. After the exporter gate, which holds
    // that emission's export to the engine's DTCG, so a failure there explains one here.
    id: 'readback-parity',
    ciStep: "The plugin's applied file exports what the engine emits (#2351)",
    cmd: ws('@prism3/plugin', 'test:readback-parity'),
    after: ['exporter-comparison'],
    why: 'it holds the applied file to the emission whose export the exporter gate holds to the engine',
  },
  {
    id: 'consumability',
    ciStep: 'Consumability gate (a stock Style Dictionary over the emitted DTCG)',
    cmd: ws('@prism3/tokens', 'check:consumability'),
  },
  {
    id: 'lint-skills',
    ciStep: 'Skills gate (shipped skills make true claims)',
    cmd: engine('lint-skills.ts'),
  },
  {
    id: 'lint-us-english',
    ciStep: 'US-English gate (shipped text)',
    cmd: engine('lint-us-english.ts'),
    after: ['build-web', 'build-plugin'],
    why: 'it scans BOTH built bundles — apps/studio/dist/*.js and, as of #937, apps/plugin/dist — and run before either build it scans a stale one, or none at all (#302, #310)',
  },
  {
    id: 'lint-voice',
    ciStep: 'Voice lint gate (shipped text)',
    cmd: engine('lint-voice.ts'),
    after: ['build-web', 'build-plugin'],
    // `build-plugin` since #1824: the CLIENT NAMES arm reads apps/plugin/dist (main.js + ui.html) raw.
    // The voice RULES still do not (#948 is open), so this ordering serves that one arm today.
    why: 'the voice rules scan apps/studio/dist/*.js, and the client-name arm (#1824) scans both built bundles — run before either build it reads a stale one, or none',
  },
  {
    id: 'lint-doc-gates',
    ciStep: "Docs stay in sync with this workflow's gates",
    cmd: engine('lint-doc-gates.ts'),
  },
  {
    id: 'typecheck-components',
    ciStep: 'Component defs typecheck against their schema',
    cmd: engine('typecheck-components.ts'),
  },
  {
    id: 'lint-layout-claims',
    ciStep: 'Docs describe the repo that exists',
    cmd: engine('lint-layout-claims.ts'),
  },
  {
    id: 'lint-decisions-index',
    ciStep: 'Every recorded decision is indexed, and every index row is real',
    cmd: engine('lint-decisions-index.ts'),
  },
  {
    id: 'lint-context-nodes',
    ciStep: 'A context node is a group unless a stated reason says otherwise',
    cmd: engine('lint-context-nodes.ts'),
  },
  {
    id: 'lint-ratio-truth',
    ciStep: 'Every reported contrast ratio matches the color it was measured against',
    cmd: engine('lint-ratio-truth.ts'),
  },
  {
    id: 'lint-description-claims',
    ciStep: 'Every ratio and percentage a description states holds in its mode',
    cmd: engine('lint-description-claims.ts'),
  },
  {
    id: 'lint-axis-values',
    ciStep: 'Every axis value set is declared, and stands in the relation it declares',
    cmd: engine('lint-axis-values.ts'),
  },
  {
    id: 'lint-progress-order',
    ciStep: 'docs/00-progress.md and its archive stay newest-entry-first',
    cmd: engine('lint-progress-order.ts'),
  },
  {
    id: 'lint-payload-manifest',
    ciStep: 'Every emitted artifact is classified payload or ours',
    cmd: engine('lint-payload-manifest.ts'),
  },
  {
    id: 'lint-overlay-completeness',
    ciStep: 'Overlays carry exactly the leaves that vary per mode',
    cmd: engine('lint-overlay-completeness.ts'),
  },
  {
    id: 'lint-overlay-provenance',
    ciStep: "An overlay leaf's provenance describes its own value, not the base mode's",
    cmd: engine('lint-overlay-provenance.ts'),
  },
  {
    id: 'lint-figma-destination',
    ciStep: "A leaf's declared Figma destination is the one it materializes into",
    cmd: engine('lint-figma-destination.ts'),
  },
  {
    id: 'lint-stranded-collections',
    ciStep: 'No collection ships that nothing writes',
    cmd: engine('lint-stranded-collections.ts'),
  },
  {
    id: 'lint-ramp-steps',
    ciStep: 'A studio ramp step resolves to a real rung',
    cmd: engine('lint-ramp-steps.ts'),
  },
  {
    id: 'lint-ramp-values',
    ciStep: 'A ramp rung resolves to a value, or is special-cased',
    cmd: engine('lint-ramp-values.ts'),
  },
  {
    id: 'lint-paint',
    ciStep: 'Component paint is where the defs say it is',
    cmd: engine('lint-paint.ts'),
  },
  {
    id: 'lint-paint-placement',
    ciStep: 'Component paint lands on the part the def nominated',
    cmd: engine('lint-paint-placement.ts'),
  },
  {
    id: 'lint-rung-names',
    ciStep: "A def's size enum names the engine's rungs, not a brief's",
    cmd: engine('lint-rung-names.ts'),
  },
  {
    id: 'lint-shape-index',
    ciStep: 'A published docs/34 shape number still means what it meant',
    cmd: engine('lint-shape-index.ts'),
  },
  {
    id: 'lint-schema-classification',
    ciStep: 'Every packages/engine/schema file has a decided place in the prose gates',
    cmd: engine('lint-schema-classification.ts'),
  },
  {
    id: 'lint-absolute-inset',
    ciStep: 'An absolutely-positioned part lands outside its parent',
    cmd: engine('lint-absolute-inset.ts'),
  },
  {
    id: 'lint-lineheight-bake',
    ciStep: "A text style's line height is an unbound, mode-invariant PERCENT bake",
    cmd: engine('lint-lineheight-bake.ts'),
  },
  {
    id: 'lint-cut-binding',
    ciStep: "A text style's cut is bound to a per-category STRING variable",
    cmd: engine('lint-cut-binding.ts'),
  },
  {
    id: 'lint-size-override-coherence',
    ciStep: 'A per-rung viewport size override never inverts or un-orders the ramp',
    cmd: engine('lint-size-override-coherence.ts'),
  },
  {
    id: 'lint-standalone-floor',
    ciStep: 'A def offered as a build target projects something with an extent',
    cmd: engine('lint-standalone-floor.ts'),
  },
  {
    id: 'lint-glyph-geometry',
    ciStep: 'A glyph draws its own filled outline on a square artboard',
    cmd: engine('lint-glyph-geometry.ts'),
  },
  {
    id: 'lint-icon-count',
    ciStep: "The icon def's metadata states no stale glyph count",
    cmd: engine('lint-icon-count.ts'),
  },
  {
    id: 'lint-mark-provenance',
    ciStep: 'Every brand mark has a provenance record and every record a file',
    cmd: engine('lint-mark-provenance.ts'),
  },
  {
    id: 'lint-mark-colors',
    ciStep: 'A brand mark keeps its own colors from file to plan',
    cmd: engine('lint-mark-colors.ts'),
  },
  {
    id: 'lint-mark-slots',
    ciStep: 'A payment-tile slot takes card networks only and starts at the generic tile',
    cmd: engine('lint-mark-slots.ts'),
  },
  {
    id: 'lint-nesting',
    ciStep: 'The component nesting graph resolves and is acyclic',
    cmd: engine('lint-nesting.ts'),
  },
  {
    id: 'lint-hit-target',
    ciStep: 'Interactive controls meet the 44px hit-target floor',
    cmd: engine('lint-hit-target.ts'),
  },
  {
    id: 'lint-lever-sweep',
    ciStep: 'No lever setting silently deletes a guaranteed path or a component binding (#957)',
    cmd: engine('lint-lever-sweep.ts'),
  },
  {
    id: 'lint-figma-descriptions',
    ciStep: 'Every Figma description is in the plugin register (#1623)',
    cmd: engine('lint-figma-descriptions.ts'),
  },
  {
    // #2411 — reads the COMMITTED out/ files, so it needs no `after`.
    id: 'lint-tool-neutral-prose',
    ciStep: 'Consumer prose names no tool (#2411)',
    cmd: engine('lint-tool-neutral-prose.ts'),
  },
  {
    // #2552 — reads the COMMITTED out/ files, so it needs no `after`.
    id: 'lint-consumer-build',
    ciStep: 'The consumer set carries no build metadata (#2552)',
    cmd: engine('lint-consumer-build.ts'),
  },
  {
    // The FIRST gate outside `packages/engine/`, which is why `gateFilePattern` below now admits
    // `apps/*/lint-*.ts` as well as `.mjs`. It lives in `apps/plugin/` because it imports the plugin's
    // own executor; an engine-side copy would make the engine depend on a surface.
    id: 'lint-unclaimed-defaults',
    ciStep: 'Every visually-significant property on a built node traces to a decision',
    cmd: [...TSX, 'apps/plugin/lint-unclaimed-defaults.ts'],
  },
  {
    id: 'lint-sandbox-reject',
    ciStep: "The built main.js carries no Figma-sandbox-rejected token sequence (#1461)",
    cmd: [...TSX, 'apps/plugin/lint-sandbox-reject.ts'],
    after: ['build-plugin', 'build-plugin-release'],
    why: 'it scans the dist/main.js and release/main.js the two plugin builds just wrote, exactly as Figma reads them',
  },
  {
    id: 'lint-bundle-prose',
    ciStep: 'The built plugin ships no maintainer notes and no Prism 2 in component text (#1623)',
    cmd: [...TSX, 'apps/plugin/lint-bundle-prose.ts'],
    after: ['build-plugin'],
    why: 'it reads the dist/main.js and dist/ui.html the plugin build just wrote',
  },
  {
    id: 'lint-release-bundle',
    ciStep: 'The release build carries no dev-only code (#2530)',
    cmd: [...TSX, 'apps/plugin/lint-release-bundle.ts'],
    after: ['build-plugin', 'build-plugin-release'],
    why: 'it reads both builds: each dev-only marker must be in dist/ and absent from release/',
  },
  {
    // It fired for real on 2026-08-20, naming all 8 live sites that described #775's window — this
    // row's own `ciStep` string among them — and that firing is what produced the flip below. It
    // now guards windows nobody has opened yet.
    id: 'lint-advisory-expiry',
    ciStep: 'A stated advisory window has not expired',
    cmd: engine('lint-advisory-expiry.ts'),
  },
  {
    // #1701 — reads the COMMITTED out/components/**, so it needs no `after`: regen --check is what
    // proves those files match the projector, and this proves they match the defs.
    id: 'lint-component-docs',
    ciStep: 'Every component def is documented in both forms (#1701)',
    cmd: engine('lint-component-docs.ts'),
  },
  {
    // #2637 — reads docs/public/ecosystem/{ecosystem.json,index.html} and the code; needs no build and no `after`.
    id: 'lint-ecosystem',
    ciStep: "The ecosystem diagram's data matches the code (#2637)",
    cmd: engine('lint-ecosystem.ts'),
  },
  {
    // #2650 — reads the COMMITTED docs/public/releases/** and git history, so it needs no `after`: the
    // fold writes the notes, and this re-derives every release's diff from the records at both folds.
    id: 'lint-release-notes',
    ciStep: 'Release notes match the diff between folds (#2650)',
    cmd: engine('lint-release-notes.ts'),
  },
  {
    // #2759 — reads the def registry only; needs no build and no `after`.
    id: 'lint-naming',
    ciStep: 'Component names follow the naming table (#2759)',
    cmd: engine('lint-naming.ts'),
  },
  {
    // #2928 — reads the projected plans only; needs no build and no `after`.
    id: 'lint-fill-under-hug',
    ciStep: 'No member fills a width that hugs (#2928)',
    cmd: engine('lint-fill-under-hug.ts'),
  },
  {
    // The one `tools/` battery wired into CI (#1123), and the reason its NAME is about the DETECTOR
    // rather than about this tree: docs/34 shape 17 is explicit that nothing running inside a checkout
    // can tell whether that checkout is stale — a stale tree is internally consistent. So the subject
    // is `.claude/hooks/session-start-claude-md-freshness.sh` (the #1110 SessionStart report), and this
    // asserts the detector still FIRES on a stale world, GOES SILENT when its fetch is dropped, and says
    // CANNOT DETERMINE when the oracle is unavailable. It needs no `after` and no git history: it builds
    // its own bare repo + clones in $TMPDIR (local file:// git, no network, never touches this
    // checkout), and reads only the hook file plus `git rev-parse --show-toplevel`, both of which work
    // under CI's shallow checkout — confirmed by running it from a depth-1 clone.
    id: 'claude-md-freshness',
    ciStep: 'The CLAUDE.md-freshness detector still flags a stale checkout',
    cmd: ['sh', 'tools/claude-md-freshness/mutations.sh'],
  },
  {
    // #2981 — the test for the install script the browser jobs run. A stand-in install and lock in
    // $TMPDIR: no browser, no network, no `after`.
    id: 'install-chromium',
    ciStep: 'The Chromium install script retries cleanly after a stall (#2981)',
    cmd: ['bash', '.github/scripts/test-install-chromium.sh'],
  },
  {
    id: 'smoke',
    ciStep: 'Studio headless smoke suite (#775)',
    cmd: ws('@prism3/studio', 'test:smoke'),
    after: ['build-web'],
    why: 'it drives the built dist/main.js in a browser',
    // One of the TWO gates here that need a browser — see `chromiumPrecondition`.
    precondition: chromiumPrecondition,
  },
];

// ---- ORPHAN CHECK: a gate file that exists and is named in nothing --------------------------------
/**
 * The case all five agreeing lists are blind to. If a `lint-*` file is never added to `ci.yml`, then
 * `lint-doc-gates.ts` has no step to demand documentation for, the three prose docs and this list
 * stay silent about it, and every artifact agrees — about a gate that runs nowhere. Five copies of a
 * list cannot see something absent from all five.
 *
 * So the third direction: the FILESYSTEM (via `git ls-files`, never `readdirSync` — untracked residue
 * makes the filesystem lie, the measurement `lint-layout-claims.ts` records) against `ci.yml`'s raw
 * text. Two readers, neither derived from the other.
 *
 * SCOPE, declared: `packages/engine/lint-*.ts` and `apps/<workspace>/lint-*.{mjs,ts}`. That is the `lint-`
 * naming convention this repo actually uses for standalone assertion scripts, and it is a NAME-based scope
 * with the limit that implies — a gate named `check-consumability.mjs` or `typecheck-components.ts`
 * is outside it. Those are in `ci.yml` today and covered by the bidirectional comparison above; what
 * this arm adds is the case where nothing points at the file at all. Stated as a limit rather than
 * widened to every `.ts` in the repo, which would make the scope unmaintainable and the gate the
 * first thing narrowed.
 *
 * THE `apps/` HALF WAS `.mjs`-ONLY UNTIL #865, and that was a hole rather than a decision: the
 * extension came from `apps/studio/lint-contrast.mjs` being the only instance, so the first
 * `.ts` gate under `apps/` — `apps/plugin/lint-unclaimed-defaults.ts` — would have been invisible to the
 * one arm that exists to see a file nothing points at. Widening it adds exactly that file today
 * (checked: `git ls-files` matches two `apps/` gates under the wider pattern and one under the narrower).
 *
 * Exported and driven by `lint-doc-gates.ts`, so it runs in CI rather than only when someone types
 * `verify`. A gate that only runs locally is the thing this whole file is about.
 */
export const gateFilePattern = /(?:^packages\/engine\/lint-[^/]+\.ts|^apps\/[^/]+\/lint-[^/]+\.(?:mjs|ts))$/;

export const trackedGateFiles = (): string[] => {
  const r = spawnSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) return [];
  return r.stdout.split('\n').filter((f) => gateFilePattern.test(f)).sort();
};

/**
 * Which tracked gate files `ci.yml` never mentions. Matched on the BASENAME, because `ci.yml` invokes
 * the engine gates by path (`packages/engine/lint-voice.ts`) and the `apps/*` ones through an npm
 * script that names neither the path nor the file (`npm run -w @prism3/studio lint:classes`). The
 * basename is the strongest token common to both spellings, so this asks the weaker, answerable
 * question — "does CI mention this file's name anywhere?" — rather than a path question that would
 * false-positive on every `.mjs`.
 *
 * That is why the `.mjs` half needs the package.json hop: `lint-classes.mjs` appears in `ci.yml`
 * NOWHERE, only in `apps/studio/package.json` as `lint:classes`. So a file counts as named when
 * `ci.yml` mentions its basename OR when some workspace script runs it AND `ci.yml` runs that script.
 */
export const orphanGateFiles = (ciText: string, files: string[] = trackedGateFiles()): string[] => {
  const orphans: string[] = [];
  for (const f of files) {
    const base = f.split('/').pop()!;
    if (ciText.includes(base)) continue;
    // The npm-script hop, for the `apps/*/lint-*.mjs` half.
    const wsDir = f.split('/').slice(0, -1).join('/');
    const pkgPath = resolve(repoRoot, wsDir, 'package.json');
    let named = false;
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const wsName: string = pkg.name ?? '';
      for (const [script, body] of Object.entries(pkg.scripts ?? {})) {
        if (!String(body).includes(base)) continue;
        // `ci.yml` must run THAT script for THAT workspace — both tokens on one line, so an unrelated
        // `npm run -w other build` cannot vouch for it.
        if (ciText.split('\n').some((l) => l.includes(script) && l.includes(wsName))) { named = true; break; }
      }
    }
    if (!named) orphans.push(f);
  }
  return orphans;
};

// ---- ORDER: declared per gate, checked against the array ------------------------------------------
/** Which `after:` declarations the authored order violates, plus the two structural rules that keep
 *  the declarations themselves honest (an unknown id, and an `after` with no stated `why`). */
export const orderViolations = (gates: Gate[]): string[] => {
  const problems: string[] = [];
  const index = new Map(gates.map((g, i) => [g.id, i]));
  const seen = new Set<string>();
  for (const g of gates) {
    if (seen.has(g.id)) problems.push(`duplicate gate id \`${g.id}\``);
    seen.add(g.id);
    if (!g.cmd && !g.derive) problems.push(`\`${g.id}\` has neither a cmd nor a derive — it would run nothing and report nothing`);
    if (g.after?.length && !g.why) problems.push(`\`${g.id}\` declares \`after\` with no \`why\` — an unexplained ordering constraint is the one a future edit deletes as noise`);
    for (const dep of g.after ?? []) {
      const at = index.get(dep);
      if (at === undefined) { problems.push(`\`${g.id}\` declares \`after: ${dep}\`, which is not a gate id`); continue; }
      if (at >= index.get(g.id)!) problems.push(`\`${g.id}\` must run after \`${dep}\`, but \`${dep}\` is later in GATES — ${g.why}`);
    }
  }
  return problems;
};

// ---- SELF-CHECK: can the runner's own claims fail? ------------------------------------------------
// Every sample drives the SHIPPED functions, never a copy of their logic (`docs/34`, shape 2). Each
// one asserts a claim this file makes, in both directions where the claim has two.
const selfFails: string[] = [];

// The ordering check must catch a real inversion and must not invent one.
const okOrder: Gate[] = [
  { id: 'a', ciStep: 'A', cmd: ['true'] },
  { id: 'b', ciStep: 'B', cmd: ['true'], after: ['a'], why: 'b reads what a wrote' },
];
if (orderViolations(okOrder).length) selfFails.push('orderViolations flags a correctly ordered list (false positive)');
const badOrder: Gate[] = [okOrder[1], okOrder[0]];
if (!orderViolations(badOrder).some((p) => p.includes('`b` must run after `a`'))) {
  selfFails.push('orderViolations misses an inverted dependency — the stale-bundle PASS could ship again');
}
if (!orderViolations([{ id: 'a', ciStep: 'A', cmd: ['true'], after: ['nope'], why: 'x' }]).some((p) => p.includes('not a gate id'))) {
  selfFails.push('orderViolations accepts an `after` naming a gate that does not exist');
}
if (!orderViolations([okOrder[0], { ...okOrder[1], why: undefined }]).some((p) => p.includes('no `why`'))) {
  selfFails.push('orderViolations accepts an ordering constraint with no stated reason');
}
if (!orderViolations([{ id: 'a', ciStep: 'A' }]).some((p) => p.includes('neither a cmd nor a derive'))) {
  selfFails.push('orderViolations accepts a gate that would run nothing — a table row that can only ever be blank');
}
if (!orderViolations([okOrder[0], { ...okOrder[0] }]).some((p) => p.includes('duplicate gate id'))) {
  selfFails.push('orderViolations accepts a duplicate id, so one gate could shadow another in the results map');
}

// The orphan check, both directions, against hand-made inputs — so it is testable without depending on
// what the real repo happens to contain today.
const FAKE_CI = ['      - name: A', '        run: npx tsx packages/engine/lint-named.ts', '      - name: B', '        run: npm run -w @prism3/studio lint:viascript'].join('\n');
if (orphanGateFiles(FAKE_CI, ['packages/engine/lint-named.ts']).length) {
  selfFails.push('orphanGateFiles flags a file ci.yml names directly (false positive)');
}
if (!orphanGateFiles(FAKE_CI, ['packages/engine/lint-invisible.ts']).includes('packages/engine/lint-invisible.ts')) {
  selfFails.push('orphanGateFiles misses a gate file named nowhere in ci.yml — the orphan case, which is the whole point of this arm');
}
if (!gateFilePattern.test('apps/studio/lint-classes.mjs') || !gateFilePattern.test('packages/engine/lint-voice.ts')
  || !gateFilePattern.test('apps/plugin/lint-unclaimed-defaults.ts')) {
  selfFails.push('gateFilePattern no longer matches the repo\'s real gate files — this arm\'s scope has gone empty');
}
// The engine half stays `.ts`-only and the `apps/` half accepts `.mjs` or `.ts` (#865), so the negative
// arm moved rather than went away: an extension OUTSIDE the convention, and a nested path, are still out.
// It has to keep asserting something — an arm reduced to one condition after a widening is how a scope
// grows past what its own header declares.
if (gateFilePattern.test('packages/engine/lint-voice.mjs') || gateFilePattern.test('apps/studio/lint-classes.js')
  || gateFilePattern.test('apps/plugin/src/lint-nested.ts')) {
  selfFails.push('gateFilePattern matches the wrong extension or depth for a location — the scope is broader than declared');
}

// The derived gates: each must be able to FAIL, since a `derive` that always returns PASS is a table
// row that means nothing.
const driftCoverage = GATES.find((g) => g.id === 'drift-coverage')!.derive!;
const fakePass = (output: string): Result => ({ gate: GATES[0], outcome: 'PASS', output, ms: 0 });
if (driftCoverage(new Map([['drift', fakePass(`${EXPECTED_ARTIFACTS} committed artifacts byte-match`)]])).outcome !== 'PASS') {
  selfFails.push('the artifact-coverage check fails on the expected count (false positive)');
}
if (driftCoverage(new Map([['drift', fakePass('7 committed artifacts byte-match')]])).outcome !== 'FAIL') {
  selfFails.push('the artifact-coverage check passes on a changed count — it cannot fail');
}
if (driftCoverage(new Map([['drift', fakePass('all good, nothing to see')]])).outcome !== 'FAIL') {
  selfFails.push('the artifact-coverage check passes when the drift gate stopped reporting a count — it has gone blind and says nothing');
}
// Its input never ran: must not be a PASS, and must not be a FAIL either — unknown is its own outcome.
if (driftCoverage(new Map()).outcome !== 'SKIP') {
  selfFails.push('the artifact-coverage check does not report SKIP when the drift gate never ran — it either passes on no data, or blames a defect nothing measured');
}
if (driftCoverage(new Map([['drift', { gate: GATES[0], outcome: 'SKIP', output: '', ms: 0 }]])).outcome !== 'SKIP') {
  selfFails.push('the artifact-coverage check does not propagate a SKIPPED input as SKIP');
}
// ...but a drift gate that actually FAILED is a defect, and must still read as one.
if (driftCoverage(new Map([['drift', { gate: GATES[0], outcome: 'FAIL', output: '', ms: 0 }]])).outcome !== 'FAIL') {
  selfFails.push('the artifact-coverage check softens a genuinely FAILED drift gate into a skip');
}

// Point 4, as an assertion about the summary rather than a promise in prose: a run containing a SKIP
// must not be reported as a pass, and must not exit 0.
const withSkip: Result[] = [
  { gate: GATES[0], outcome: 'PASS', output: '', ms: 1 },
  { gate: GATES[1], outcome: 'SKIP', output: 'reason', ms: 0 },
];
if (verdictOf(withSkip).ok) selfFails.push('a run with a SKIPPED gate is reported as OK — a gate that did not run is being counted as a pass');
if (!verdictOf([{ gate: GATES[0], outcome: 'PASS', output: '', ms: 1 }]).ok) {
  selfFails.push('a run where every gate passed is not reported as OK (false failure)');
}
if (verdictOf([{ gate: GATES[0], outcome: 'FAIL', output: '', ms: 1 }]).ok) selfFails.push('a FAILED gate is reported as OK');
if (!verdictOf([{ gate: GATES[0], outcome: 'PASS', output: '', ms: 1 }, { gate: GATES[1], outcome: 'ADVISORY', output: '', ms: 1 }]).ok) {
  selfFails.push('an ADVISORY failure is fatal — it is reported, never fatal, per #775');
}
// And the strongest form of point 4: a table shorter than GATES is itself a failure.
if (verdictOf([{ gate: GATES[0], outcome: 'PASS', output: '', ms: 1 }], GATES.length).ok) {
  selfFails.push('a run that produced fewer results than GATES is reported as OK — coverage can shrink silently');
}

export type Result = { gate: Gate; outcome: GateOutcome; output: string; ms: number };

/**
 * The one place the run's verdict is decided — driven by both the self-check above and the real run
 * below, never reimplemented in either (`docs/34`, shape 2).
 *
 * `expected` is the count the table MUST have. Passing it is what makes "represented, not counted"
 * structural: a loop that threw halfway produces a short table, and a short table is not a pass no
 * matter what is in it.
 */
export function verdictOf(results: Result[], expected?: number): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const failed = results.filter((r) => r.outcome === 'FAIL');
  const skipped = results.filter((r) => r.outcome === 'SKIP');
  if (failed.length) reasons.push(`${failed.length} gate(s) FAILED`);
  if (skipped.length) reasons.push(`${skipped.length} gate(s) did not run (SKIP) — that is not a pass`);
  if (expected !== undefined && results.length !== expected) {
    reasons.push(`${results.length} of ${expected} gate(s) reached the table — the run did not cover its own list`);
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * POINT 5'S SELF-CHECK (#2537): a gate that hangs is reported FAIL, by name, within its limit, and
 * nothing it started is left running. Async and spawns processes, so unlike the checks above it runs
 * only when this file is the program (every `npm run verify`, and CI's `verify.ts --list` step), never
 * when `lint-doc-gates.ts` imports `GATES`.
 *
 * The fixture is a real hang of the shape #2537 met: a node process that never exits, with one child
 * in its own process group (the shape of `npm run` → node) and one DETACHED child (the shape of
 * Playwright's browser, which a group kill misses). It writes the three pids to a file so this check
 * can look for them afterwards, by pid.
 *
 * Every expected value is a literal (`docs/34`). The check is bounded from OUTSIDE the code under test:
 * if the runner never returns, `OUTER_GUARD_MS` ends the wait, the failure is named, and the fixture's
 * pids are killed here so the check itself never hangs.
 */
export const timeoutSelfCheck = async (): Promise<string[]> => {
  const fails: string[] = [];
  const LIMIT_MS = 2500;
  const GRACE_MS = 500;
  const OUTER_GUARD_MS = 15_000;
  const dir = mkdtempSync(join(tmpdir(), 'verify-2537-'));
  const pidFile = join(dir, 'pids.json');
  const fixture = join(dir, 'hang-fixture.mjs');
  writeFileSync(fixture, [
    "import { spawn } from 'node:child_process';",
    "import { writeFileSync } from 'node:fs';",
    "const forever = ['-e', 'setInterval(() => {}, 1e9)'];",
    "const inGroup = spawn(process.execPath, forever, { stdio: 'inherit' });",
    "const ownGroup = spawn(process.execPath, forever, { stdio: 'ignore', detached: true });",
    'writeFileSync(process.argv[2], JSON.stringify([process.pid, inGroup.pid, ownGroup.pid]));',
    "console.log('hang-fixture: on step 3 of 3, waiting forever');",
    'setInterval(() => {}, 1e9);',
  ].join('\n'));
  const readPids = (): number[] => { try { return JSON.parse(readFileSync(pidFile, 'utf8')); } catch { return []; } };
  const alive = (pid: number): boolean => {
    try { process.kill(pid, 0); } catch { return false; }
    // A killed process nobody has reaped yet is a zombie: dead, and still answering kill(0).
    try {
      if (existsSync('/proc/self/stat')) {
        const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
        return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
      }
      return !spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim().startsWith('Z');
    } catch { return false; }
  };

  const hangGate: Gate = { id: 'hang-fixture', ciStep: 'none', cmd: [process.execPath, fixture, pidFile] };
  const fastGate: Gate = { id: 'fast-fixture', ciStep: 'none', cmd: [process.execPath, '-e', "console.log('fast-fixture ran')"] };
  const opts = { cwd: dir, env: process.env, timeoutMs: LIMIT_MS, graceMs: GRACE_MS };

  try {
    const t0 = Date.now();
    let guard: ReturnType<typeof setTimeout> | undefined;
    const run = await Promise.race([
      runGateCommand(hangGate.cmd!, opts),
      new Promise<null>((r) => { guard = setTimeout(() => r(null), OUTER_GUARD_MS); }),
    ]);
    clearTimeout(guard);
    const wall = Date.now() - t0;
    if (run === null) {
      fails.push(`hang-fixture: the runner did not return within ${OUTER_GUARD_MS / 1000}s for a gate with a ${LIMIT_MS / 1000}s limit — a hung gate hangs the whole run`);
    } else {
      const c = classifyRun(run, hangGate);
      const row = rowOf({ gate: hangGate, outcome: c.outcome, output: c.output, ms: run.ms }, run.timedOut);
      if (c.outcome !== 'FAIL') fails.push(`hang-fixture: a gate past its time limit is reported ${c.outcome}, not FAIL`);
      if (!row.startsWith('  ✗ FAIL     hang-fixture') || !row.endsWith('timed out')) {
        fails.push(`hang-fixture: the table row does not name the gate as a timed-out FAIL: "${row}"`);
      }
      if (!c.output.includes('✗ hang-fixture timed out after 2.5s, its limit, and was stopped')) {
        fails.push('hang-fixture: the failure output does not say the gate timed out, by name, with its elapsed time');
      }
      if (!c.output.includes('hang-fixture: on step 3 of 3, waiting forever')) {
        fails.push('hang-fixture: the output the gate printed before its limit was lost');
      }
      if (wall < LIMIT_MS || wall > LIMIT_MS + GRACE_MS + 3000) {
        fails.push(`hang-fixture: reported after ${wall}ms, outside ${LIMIT_MS}..${LIMIT_MS + GRACE_MS + 3000}ms for a ${LIMIT_MS}ms limit`);
      }
    }

    const pids = readPids();
    if (pids.length !== 3) {
      fails.push('hang-fixture: the fixture never wrote its pids, so nothing here tested a hang');
    } else {
      // SIGKILL is delivered at once, but give the kernel a moment to tear the processes down.
      const until = Date.now() + 2000;
      while (pids.some(alive) && Date.now() < until) await new Promise((r) => setTimeout(r, 50));
      const names = ['the gate itself', 'its child in the same process group', 'its detached child, in a process group of its own'];
      pids.forEach((pid, i) => { if (alive(pid)) fails.push(`hang-fixture: ${names[i]} (pid ${pid}) is still running after the time-out`); });
    }

    const fast = await runGateCommand(fastGate.cmd!, opts);
    const f = classifyRun(fast, fastGate);
    if (f.outcome !== 'PASS' || f.output !== 'fast-fixture ran') {
      fails.push(`fast-fixture: a gate that exits 0 at once is reported ${f.outcome} with output "${f.output}", not PASS with "fast-fixture ran"`);
    }
  } finally {
    // Clean up after a broken runner too, by pid: the fixture's own three, nothing else.
    for (const pid of readPids()) signal(pid, 'SIGKILL');
    rmSync(dir, { recursive: true, force: true });
  }
  return fails;
};

// ---- KEEP A LOCAL RUN AWAKE (#2547, #2550, owner Q252) ---------------------------------------------
// A local verify on the owner's laptop takes about half an hour, and the laptop sleeps when left. A sleeping display
// stops Chromium producing frames, so a browser gate's click or key press never completes (measured: three of the
// smoke and chrome hangs fell in display-off or system-sleep windows, `pmset -g log`). On macOS the run holds
// `caffeinate` for exactly its own lifetime: `-w <pid>` releases the assertion when this process exits, however it
// exits. `-d` the display, `-i` idle sleep, `-m` disk, `-s` system sleep on AC power, `-u` the user as active. Any
// other platform (CI's Linux) spawns nothing, so CI is unchanged. A missing `caffeinate` is not an error: the run goes
// on as it did before.
export const CAFFEINATE_ARGS = (pid: number): string[] => ['-dimsu', '-w', String(pid)];
type SpawnLike = (cmd: string, args: string[], opts: { stdio: 'ignore' }) => { unref(): void; on(ev: 'error', f: () => void): unknown };
export const keepAwake = (platform: NodeJS.Platform = process.platform, pid: number = process.pid, spawnFn: SpawnLike = spawn as unknown as SpawnLike): boolean => {
  if (platform !== 'darwin') return false;
  try {
    const child = spawnFn('caffeinate', CAFFEINATE_ARGS(pid), { stdio: 'ignore' });
    child.on('error', () => { /* no caffeinate on this Mac: the run goes on as before */ });
    child.unref();
    return true;
  } catch {
    return false;
  }
};
// Its check, with a recording spawn: darwin starts `caffeinate -dimsu -w <pid>` once, and no other platform starts
// anything. EXPECTED is the argv written here, not read from `CAFFEINATE_ARGS`.
{
  const calls: [string, string[]][] = [];
  const rec: SpawnLike = (cmd, args) => { calls.push([cmd, args]); return { unref() {}, on() { return undefined; } }; };
  const mac = keepAwake('darwin', 4242, rec);
  if (!mac || JSON.stringify(calls) !== JSON.stringify([['caffeinate', ['-dimsu', '-w', '4242']]])) {
    selfFails.push(`keepAwake on darwin should start "caffeinate -dimsu -w 4242" once (started ${JSON.stringify(calls)}): a local run on the owner's Mac would sleep mid-verify`);
  }
  for (const other of ['linux', 'win32'] as const) {
    calls.length = 0;
    if (keepAwake(other, 4242, rec) || calls.length) selfFails.push(`keepAwake on ${other} should start nothing (started ${JSON.stringify(calls)}): CI would run caffeinate`);
  }
}

if (selfFails.length) {
  console.error("\n❌ the gate runner's own checks are broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- THE RUN -------------------------------------------------------------------------------------
// Guarded, so `lint-doc-gates.ts` can import GATES to compare it against `ci.yml` without running ~30
// gates as a side effect of a doc check.
const isMain = (() => {
  try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
})();

if (isMain) {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const only = argv.filter((a) => !a.startsWith('-'));

  let scale: number;
  try { scale = timeoutScale(); } catch (e) { console.error(`\n❌ ${(e as Error).message}`); process.exit(1); }

  const timeoutFails = await timeoutSelfCheck();
  if (timeoutFails.length) {
    console.error("\n❌ the gate runner's own checks are broken — a hung gate would not be stopped and named:\n");
    for (const f of timeoutFails) console.error(`    ✗ ${f}`);
    process.exit(1);
  }

  const orderProblems = orderViolations(GATES);
  if (orderProblems.length) {
    console.error('\n❌ the authored gate order violates its own declared constraints — refusing to run:\n');
    for (const p of orderProblems) console.error(`    ${p}`);
    console.error('\n  Each `after` names a gate that must come EARLIER in GATES. Violating one produces a PASS,');
    console.error('  not an error: the prose gates would scan a stale bundle and report it clean (#302, #310).');
    process.exit(1);
  }

  // Before the first gate, and only for a real run of this file (#2547, #2550): see `keepAwake`.
  const awake = keepAwake();
  if (awake) console.log('  (macOS: caffeinate holds the display and the system awake until this run exits)');

  if (argv.includes('--list')) {
    console.log(`${GATES.length} gates, in run order:\n`);
    for (const g of GATES) {
      const cmd = g.cmd ? g.cmd.join(' ') : '(derived from an earlier gate)';
      console.log(`  ${g.id.padEnd(26)} ${cmd}`);
    }
    process.exit(0);
  }

  const selected = only.length ? GATES.filter((g) => only.includes(g.id)) : GATES;
  if (only.length) {
    const unknown = only.filter((o) => !GATES.some((g) => g.id === o));
    if (unknown.length) { console.error(`unknown gate id(s): ${unknown.join(', ')} — try --list`); process.exit(1); }
    console.log(`⚠ running ${selected.length} of ${GATES.length} gates — a SUBSET, so this run cannot say the gates pass.\n`);
  }

  // PREFLIGHT (#935) — before any gate spawns, not as one. See `environmentProblems`'s header for why
  // this is neither a pass nor a gate failure, and why it only runs when a browser gate is selected.
  if (selected.some((g) => g.precondition === chromiumPrecondition)) {
    const envProblems = await environmentProblems();
    if (envProblems.length) {
      console.error('\n⚠ ENVIRONMENT NOT READY — no gate has run:\n');
      for (const p of envProblems) console.error(`    ${p}`);
      console.error('\n  This is not a gate failure — nothing about this change has been checked yet. Apply the');
      console.error('  remedy above and rerun. (#935 — three PRs in a row argued a red run here was fine; the');
      console.error('  point of this message is that nobody should have to make that argument again.)');
      process.exit(1);
    }
  }

  const results: Result[] = [];
  const byId = new Map<string, Result>();
  const started = Date.now();

  // The in-progress line is a TTY affordance: a gate can run for a minute with nothing to show, and a
  // silent terminal reads as a hang. Suppressed when stderr is not a TTY, because a captured log keeps
  // the carriage returns literally and every row arrives with its own overwritten ghost — and a
  // verify run is very often captured into a PR body.
  const tty = process.stderr.isTTY === true;
  const progress = (line: string) => { if (tty) process.stderr.write(line); };

  // A gate runs in a process group of its own (point 5), so Ctrl-C at the terminal no longer reaches
  // it. Pass it on: stop the running gate's tree, then exit as interrupted.
  let running: number | undefined;
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, async () => {
      if (running !== undefined) await killTree(running, 2000);
      process.exit(130);
    });
  }

  for (const gate of selected) {
    progress(`  … ${gate.id}\r`);
    const t0 = Date.now();
    let result: Result;
    let timedOut = false;

    const skip = gate.precondition?.();
    if (skip) {
      result = { gate, outcome: 'SKIP', output: skip, ms: Date.now() - t0 };
    } else if (gate.derive) {
      const d = gate.derive(byId);
      result = { gate, outcome: d.outcome === 'FAIL' && gate.advisory ? 'ADVISORY' : d.outcome, output: d.output, ms: Date.now() - t0 };
    } else {
      // POINT 1: status and output in ONE object from ONE call, with no shell and no pipeline between
      // them. POINT 5: under a time limit, and a gate past it is killed with everything it started.
      const r = await runGateCommand(gate.cmd!, {
        cwd: repoRoot, env: { ...process.env, FORCE_COLOR: '0', CI: '1' }, timeoutMs: timeoutMsOf(gate, scale),
        onSpawn: (pid) => { running = pid; },
      });
      running = undefined;
      timedOut = r.timedOut;
      const c = classifyRun(r, gate);
      result = { gate, outcome: c.outcome, output: c.output, ms: Date.now() - t0 };
    }

    results.push(result);
    byId.set(gate.id, result);
    progress(`${' '.repeat(40)}\r`);
    console.log(rowOf(result, timedOut));
  }

  // POINT 2: the buffered output, printed only where it is wanted.
  for (const r of results) {
    if (verbose || r.outcome === 'FAIL' || r.outcome === 'ADVISORY' || r.outcome === 'SKIP') {
      const head = r.outcome === 'SKIP' ? `⊘ SKIPPED — ${r.gate.id}` : `${r.outcome === 'PASS' ? '✓' : r.outcome === 'ADVISORY' ? '⚠ ADVISORY' : '✗ FAILED'} — ${r.gate.id}`;
      console.log(`\n${'─'.repeat(96)}\n${head}`);
      if (r.gate.cmd) console.log(`  $ ${r.gate.cmd.join(' ')}`);
      console.log(r.output || '(no output)');
    }
  }

  // POINT 4: the summary cannot say the gates pass while any of them did not run, and `expected` is
  // what makes a short table a failure rather than a shorter list of green rows.
  const verdict = verdictOf(results, selected.length);
  const tally = (o: GateOutcome) => results.filter((r) => r.outcome === o).length;
  console.log(`\n${'═'.repeat(96)}`);
  console.log(
    `${results.length}/${selected.length} gates reached a verdict in ${((Date.now() - started) / 1000).toFixed(0)}s — ` +
    `${tally('PASS')} PASS · ${tally('FAIL')} FAIL · ${tally('SKIP')} SKIP · ${tally('ADVISORY')} ADVISORY`
  );
  if (only.length) console.log(`\n⚠ a SUBSET of ${GATES.length} gates ran. This run says nothing about the ones it skipped.`);
  if (verdict.ok) {
    console.log(only.length ? '\n  ✓ every SELECTED gate passed.' : `\n  ✓ all ${GATES.length} gates pass.`);
    process.exit(0);
  }
  console.error('\n❌ not green:');
  for (const reason of verdict.reasons) console.error(`    ${reason}`);
  console.error('\n  A SKIP is not a pass. Clear the stated precondition and rerun that gate before reporting.');
  process.exit(1);
}
