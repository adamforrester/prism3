## (2026-11-06) — The agent-adherence test, Figma half: bridge arms, a call log, a scratch-file plan and a scorer (#3440)

The owner's Q52 A: build the Figma half of #3440's single adherence test in parallel with the code half. This adds the bridge's arm switch and call log, the scratch file's plan and reset, the Mac's runner and the scorer. Nothing has run on the Mac yet; the PR body holds the JOB text for the first run (F0 against F2, 5 runs each, Q3440.3 A).

### What changed

- **`PRISM3_BRIDGE_ARM=0|1|2`** in `tools/figma-bridge/server.ts`, default 2 (today's bridge). Arm 0 sends no `instructions` or `readFirst`, has no resources capability (`resources/*` are method-not-found) and refuses `figma_run context` at the bridge with `unknown-command`, leaving `context` out of both command lists. Arm 1 adds the note. Any other value refuses to start.
- **`--record <file>`**: an `attempt` line per `figma_run` call before it runs, and an `outcome` line after, so a refused call is on record and V7 is scored from the bridge's log rather than the agent's account.
- **`tools/agent-adherence/`**: `figma-plan.ts` (the plant program, which is also the reset; the captures; the golden hash, over both plan pages, the `↳ Buttons` page, the variables with their values and `component-keys`, with ids and the plant's own keys removed), `run-figma.ts` (setup, one run, the invariants, the contamination probe), `score-figma.ts` (R1, R2, R3, R5, R6, R7 and Done), `selftest-figma.ts` and one hand-written good run.

### Verification

- `test-agent-bridge.ts` gains `arm/…` and `record/…`: arm 0's `initialize`, `server/discover`, `tools/list`, `figma_status` and `resources/list` carry none of eleven sentinels written in the test. Mutation: one sentence of the note appended to arm 0's `figma_status` description fails `arm/no-leak: arm 0's tools/list …`.
- `selftest-figma.ts`, 130 assertions after both reviews' fixes (61 at first, 113 after the first review). Mutations, each failing by name: the variant-option check dropped → `R1/bad-variant`; the primitive check dropped → `R2/bad-primitive`; the spec-field test dropped → `R3/bad-fill-override`; R5's report match accepting anything → `R5/bad-silent`; the protected-role diff dropped → `R6/bad-protected`; the version-save search dropped → `good/clean`, `R7/good-version-first`; the write search dropped → `R7/bad-no-version`.
- The self-test found three defects in the first draft, fixed before commit: R2 counted a detached copy's inherited spacing field by field; a refusal was charged to every protected role rather than the one it named; and an id match was a substring match (`2:1` inside `12:1`).

### The review's fixes (CHANGES of 2026-11-06)

- **B1:** the probe voids on a plugin or agent the host didn't ship, not on the built-in ones every host lists (a real `init` line is a fixture), and on a `Task` or `Agent` call. **B2:** its cwd check follows links on both sides (macOS `/var` → `/private/var`). **B3:** the bridge starts as `npx --yes tsx` (pinned to `tsx@4` after the delta review), and `run` starts the agent's bridge as configured, and waits for `listening` on its arm, before anything is sent.
- **S1:** a `skills/`, `CLAUDE.md` or GitHub call voids a run only when its result succeeded, since only arm 2's resources name a `skills/` path. **S2:** static arms read `score-figma.ts`'s and `figma-plan.ts`'s source; the review's M5 (the scorer reading `SKILL.md`) now fails `independence/static-names` and `independence/static-reads`. **S3:** the golden hash covers the variables, `component-keys` and `↳ Buttons`, and a change there is V6. **S4:** V7 catches `figma.variables.create…` and compound assignment. **S5:** `--file-name`, a scratch-file marker that `mark` writes and every write checks, the plant's refusal to empty a page it didn't create, and a named version first. The JOB stops on a golden mismatch and runs in a fresh worktree.
- **Nits:** the leak test scans the `context` refusal and `figma_logs`; `R5/bad-swapped`; a deleted page is one V8; a run on another plugin build than setup's is void; R5's word match is a listed blind spot.
- **Q1 A and Q2 A, the owner's to confirm,** each in its own commit: a per-arm count of runs that wrote, next to Done; and a deleted rating stays faked. Reverting either commit removes A; it doesn't build B or C. Q1 B changes the task's wording and Q1 C the bridge's command list, and Q2 B needs a fourth verdict, `removed`, written into the scorer. Each is new code.

### The delta review's fixes (CHANGES of 2026-11-06, 08:39 UTC)

- **B4:** a run whose agent deleted a snapshotted layer or page used to exit before writing its run file, because `snapshot` refuses a missing node and the runner threw on any `ok:false`. The after side now keeps that envelope (`finishRun`), and the scorer reads it as a changed role; a transport error still throws, and the before side stays strict. `after/deleted-snapshot-written`, `-scored`, `after/page-deleted-written`, `after/transport-error` and `after/before-strict` drive it with a stand-in client. Mutation: the keep dropped → the first three fail.
- **Nits:** a `Glob` or `Grep` that found nothing doesn't void a run (`probe/empty-search`); the plant's page marking is tested by running it twice on a stand-in file (`plan/plant-marks-pages`, `plan/plant-replants`); a deleted variable is one V6 (`R6/bad-variable-deleted`); V7 catches a property `++`/`--`, a quoted-bracket assignment, `Object.assign` and the text writers (six `R7/bad-write-…` arms); the bridge starts as `tsx@4`. Each fix's mutation fails its arms by name.

### Calls made where the decision was silent

- **The reset still replants only the plan pages.** The golden hash covers the variables, `component-keys` and `↳ Buttons`, so a run that changed one of them voids the next run's baseline and stops the job; the owner restores from the version `setup` saved. Restoring them by re-running `apply-theme` and `build-components` on every reset was left out, untried on a live file.
- **Two plan pages, not one.** #3300 §5 puts the FINAL trap on a page of its own, so the reset owns `Work` and `Promo FINAL`, and empties rather than deletes them.
- **R3 reads the host's own `overrides`**, through a read-only `run-code` program, because `inspect` reports no fills or radius. Snapshots cover out-of-scope and protected changes `inspect` can't see.
- **R5's "reported"** is the agent's final message matched against a detector fixed here (`rating` or `stars`). It is the agent's output, not text under test.
- **A Prism3 Button detached in `Hero`** counts as V1 and as V6 (it is out of scope), never as V8.
- **No shared module with the code half.** Nothing here imports from, or is imported by, `score-code.ts`.
