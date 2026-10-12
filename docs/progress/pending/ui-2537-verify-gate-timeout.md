## (2026-10-12) — verify: a hung gate fails by name after a per-gate time limit (#2537)

A full `npm run verify` sat in `smoke` for 7133s with its browser idle. `verify.ts` had no time limit, so one hung gate held the whole run, and the machine's single verify slot, until someone stopped it by hand.

**The change.** Every command gate now runs under a time limit. A gate that reaches it is killed with everything it started. Its row reads `✗ FAIL <id> <elapsed>s  timed out`, and its buffered output is printed followed by a line naming the gate, its limit and its elapsed time. A time-out is a FAIL: never a SKIP (the gate ran and did not finish), never ADVISORY, never a pass. `classifyRun` checks for the time-out first. A killed gate also has `status === null`, and the launch-failure branch would have called it a SKIP.

**The limits, measured.** These are the worst healthy durations in 131 full verify logs on the shared development machine: chrome 1965s, plugin-test 440s, smoke 360s, engine-test 348s, studio-test 234s, and every other gate under 160s.
- **Default: 1200s.** That is 2.7x the slowest gate it covers, and a sixth of the hang that motivated it.
- **`chrome`: 5400s.** That is 2.7x its worst run inside verify, and 1.6x the 55 minutes one standalone `test:chrome` once took under load.
- **`VERIFY_TIMEOUT_SCALE`** scales every limit at once on a slower machine. A non-number or a value of 0 or below refuses to run. No value turns the limit off.

**CI is unchanged.** `ci.yml` runs each gate as its own step and runs `verify.ts` only as `--list`, so its limits are still GitHub's job timeout.

**Killing the whole tree, and why a group kill is not enough.** Each gate is spawned `detached`, in a process group of its own, so the group can be killed without killing the runner. That alone would miss the browser: Playwright launches Chromium with `detached: true` (checked in `playwright-core`'s process launcher), so the browser has a group of its own. `killTree` therefore does two things. It snapshots every descendant pid by walking the process table from the gate's pid (`/proc`, or `ps` off Linux), before anything is killed, because a reparented orphan cannot be found afterwards. Then it sends SIGTERM to the group and to each pid, waits 10s, and sends SIGKILL to both. The run settles only once that sequence is finished, so a pending SIGKILL is never left behind the next gate or the runner's exit. Gates now sit outside the terminal's process group, so the runner passes SIGINT/SIGTERM on to the running gate's tree.

**The test** is `timeoutSelfCheck` in `verify.ts`. It runs on every `npm run verify` and in CI's existing `verify.ts --list` step, before the order check. It does not run when `lint-doc-gates.ts` imports `GATES`. The gate list is unchanged. The fixture is a real hang: a node process that never exits, plus one child in its group and one detached child. It writes all three pids to a file. With a 2.5s limit the check asserts:
- FAIL, by name;
- the row and the time-out line, as literals;
- the pre-limit output kept;
- a wall time inside `2.5s..6s`;
- all three pids gone (a zombie counts as gone);
- a fast gate that still PASSes with its output.

An outer 15s guard bounds the check itself. When it fires, the check kills the fixture's own pids, so even a broken runner leaves nothing running. It adds about 3s to each run.

**Mutations,** each from a `wip:` commit, restored with `git checkout -- verify.ts`, green afterwards:
- **the timer removed:** `✗ hang-fixture: the runner did not return within 15s for a gate with a 2.5s limit — a hung gate hangs the whole run`, plus the three "still running" lines (exits at 18s).
- **a time-out classified SKIP:** `✗ hang-fixture: a gate past its time limit is reported SKIP, not FAIL` and `✗ hang-fixture: the table row does not name the gate as a timed-out FAIL: "  ⊘ SKIP     hang-fixture               3.0s  timed out"`.
- **only the direct child killed:** `✗ hang-fixture: its child in the same process group (pid …) is still running after the time-out` and `✗ hang-fixture: its detached child, in a process group of its own (pid …) is still running after the time-out`.
- **the group killed but no descendant walk** (the Playwright case): `✗ hang-fixture: its detached child, in a process group of its own (pid …) is still running after the time-out`.

**A trap for whoever changes this.** The first version settled the run on `close`. After SIGTERM the gate exits and its pipes close at once, so the run moved on while the SIGKILL pass was still waiting out its grace period. For the last gate, the runner's `process.exit` dropped that pass entirely. `close` now only marks the pipes done after a time-out.

**Not done.** The cause of the smoke hang itself. One lead, not a finding: Playwright's `page.evaluate` has no timeout of its own, and `test-smoke.mjs` already records one such wait hanging for 25+ minutes (near its `SETTLE_CLICK_MS` helper). With this change, the next hang shows smoke's last printed line, which is the step it was on.
