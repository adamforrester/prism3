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
 * ── THE FOUR THINGS THE RUNNER ITSELF HAS TO GET RIGHT ──────────────────────────────────────────
 *
 * 1. THE EXIT STATUS IS CAPTURED WITH NOTHING BETWEEN IT AND THE COMMAND. This week a failing gate
 *    was reported as a PASS because the reading was taken as `npx tsx gate.ts 2>&1 | tail -2; echo
 *    $?` — `$?` is `tail`'s status, and `tail` succeeds at tailing a failure. `lint-us-english.ts`
 *    had exited 1 and the report said green. So this file runs nothing through a shell and nothing
 *    through a pipeline: `spawnSync(argv[0], argv.slice(1), { shell: false })` returns the status and
 *    the output in ONE object, from ONE call. There is no pipeline for a status to get lost in — the
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
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
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
 */
const chromiumPrecondition = (): string | null => {
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (process.platform === 'darwin' ? join(process.env.HOME ?? '', 'Library/Caches/ms-playwright') : join(process.env.HOME ?? '', '.cache/ms-playwright'));
  const has = existsSync(cache) && readdirSync(cache).some((d) => d.startsWith('chromium'));
  return has ? null : 'no Chromium in the Playwright browser cache — run `npx playwright install chromium` once, then rerun';
};

/** The artifact-count meta-check, taken from the drift gate's ALREADY-CAPTURED output rather than by
 *  running `regen.ts --check` a second time (it is among the slowest gates here). This is what
 *  buffering per gate buys — point 2 paying for itself. Mirrors `ci.yml`'s own step. */
const EXPECTED_ARTIFACTS = 114;

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
    after: ['build-web'],
    // NOT `build-plugin`, and the difference from the line above is a defect rather than a decision:
    // this gate's scope has the same apps/plugin/dist hole #937 fixed in its sibling, filed separately
    // rather than widened here. Adding `build-plugin` to this `after` before the scope moves would
    // declare a dependency on a directory the gate does not read — an ordering constraint with nothing
    // behind it is the kind a later edit deletes as noise, which is what `why` exists to prevent.
    why: 'same apps/studio/dist/*.js scope as the US-English gate, same reason it runs after the web build',
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
    id: 'lint-progress-order',
    ciStep: 'docs/00-progress.md stays newest-entry-first',
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
    // It fired for real on 2026-08-20, naming all 8 live sites that described #775's window — this
    // row's own `ciStep` string among them — and that firing is what produced the flip below. It
    // now guards windows nobody has opened yet.
    id: 'lint-advisory-expiry',
    ciStep: 'A stated advisory window has not expired',
    cmd: engine('lint-advisory-expiry.ts'),
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
 * SCOPE, declared: `packages/engine/lint-*.ts` and `apps/<workspace>/lint-*.mjs`. That is the `lint-` naming
 * convention this repo actually uses for standalone assertion scripts, and it is a NAME-based scope
 * with the limit that implies — a gate named `check-consumability.mjs` or `typecheck-components.ts`
 * is outside it. Those are in `ci.yml` today and covered by the bidirectional comparison above; what
 * this arm adds is the case where nothing points at the file at all. Stated as a limit rather than
 * widened to every `.ts` in the repo, which would make the scope unmaintainable and the gate the
 * first thing narrowed.
 *
 * Exported and driven by `lint-doc-gates.ts`, so it runs in CI rather than only when someone types
 * `verify`. A gate that only runs locally is the thing this whole file is about.
 */
export const gateFilePattern = /(?:^packages\/engine\/lint-[^/]+\.ts|^apps\/[^/]+\/lint-[^/]+\.mjs)$/;

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
if (!gateFilePattern.test('apps/studio/lint-classes.mjs') || !gateFilePattern.test('packages/engine/lint-voice.ts')) {
  selfFails.push('gateFilePattern no longer matches the repo\'s real gate files — this arm\'s scope has gone empty');
}
if (gateFilePattern.test('packages/engine/lint-voice.mjs') || gateFilePattern.test('apps/studio/lint-classes.ts')) {
  selfFails.push('gateFilePattern matches the wrong extension for a location — the scope is broader than declared');
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

  const orderProblems = orderViolations(GATES);
  if (orderProblems.length) {
    console.error('\n❌ the authored gate order violates its own declared constraints — refusing to run:\n');
    for (const p of orderProblems) console.error(`    ${p}`);
    console.error('\n  Each `after` names a gate that must come EARLIER in GATES. Violating one produces a PASS,');
    console.error('  not an error: the prose gates would scan a stale bundle and report it clean (#302, #310).');
    process.exit(1);
  }

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

  const results: Result[] = [];
  const byId = new Map<string, Result>();
  const started = Date.now();

  // The in-progress line is a TTY affordance: a gate can run for a minute with nothing to show, and a
  // silent terminal reads as a hang. Suppressed when stderr is not a TTY, because a captured log keeps
  // the carriage returns literally and every row arrives with its own overwritten ghost — and a
  // verify run is very often captured into a PR body.
  const tty = process.stderr.isTTY === true;
  const progress = (line: string) => { if (tty) process.stderr.write(line); };

  for (const gate of selected) {
    progress(`  … ${gate.id}\r`);
    const t0 = Date.now();
    let result: Result;

    const skip = gate.precondition?.();
    if (skip) {
      result = { gate, outcome: 'SKIP', output: skip, ms: Date.now() - t0 };
    } else if (gate.derive) {
      const d = gate.derive(byId);
      result = { gate, outcome: d.outcome === 'FAIL' && gate.advisory ? 'ADVISORY' : d.outcome, output: d.output, ms: Date.now() - t0 };
    } else {
      // POINT 1: status and output from ONE call, with no shell and no pipeline between them.
      const r = spawnSync(gate.cmd![0], gate.cmd!.slice(1), {
        cwd: repoRoot, encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
      });
      const output = `${r.stdout ?? ''}${r.stderr ?? ''}`.trimEnd();
      // A gate that could not be LAUNCHED (spawn error, absent binary) has `status === null`. That is
      // not a failure of the gate and must never read as one — it is an unrun gate, which is a SKIP.
      const outcome: GateOutcome = r.error || r.status === null
        ? 'SKIP'
        : r.status === 0 ? 'PASS' : gate.advisory ? 'ADVISORY' : 'FAIL';
      result = {
        gate, outcome, ms: Date.now() - t0,
        output: r.error ? `could not launch \`${gate.cmd!.join(' ')}\`: ${r.error.message}` : output,
      };
    }

    results.push(result);
    byId.set(gate.id, result);
    progress(`${' '.repeat(40)}\r`);
    const mark = { PASS: '✓', FAIL: '✗', SKIP: '⊘', ADVISORY: '⚠' }[result.outcome];
    console.log(`  ${mark} ${result.outcome.padEnd(8)} ${gate.id.padEnd(26)} ${(result.ms / 1000).toFixed(1)}s`);
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
