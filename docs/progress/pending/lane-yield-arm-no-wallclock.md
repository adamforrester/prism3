## (2026-09-30) — test-write-components: the #684 timing arms run on a virtual clock, so CPU load cannot fail them (#1800)

**STATUS: PR from `lane/yield-arm-no-wallclock`, held DO NOT MERGE for review.** Test-only (the plugin test and its in-memory shim): no change note, no ENGINE bump, CONTRACT unchanged.

**The defect.** The yield-exclusion arm in `apps/plugin/test-write-components.ts` asserted `secondBuild < YIELD_BURN / 2`: the chunk after a 40ms yield had to measure under 20ms of real time. The property is that `breathe` re-stamps after the await, so the yield is never billed to the next chunk, and that does not depend on host speed. The measurement did. With several lanes running `verify` at once, five members of shim work crossed 20ms and the arm failed with the exclusion intact. The sibling arms (the setup and combine burns, under 60ms) and the `elapsedMs` arms (a first reading under 40ms, a free-yield gap under 20ms) had the same shape with more headroom.

**The fix: a virtual clock, test-only.** The executor reads `Date.now()`. For the timing block only, the test swaps it for a clock that moves only when a burn advances it, and restores the real one in a `finally`. The executor's own work then costs exactly 0ms, a burn costs exactly its size, and every expectation is a literal:
- the first build chunk after a 120ms setup burn reads `0`;
- the first wire chunk after a 120ms combine burn reads `0`;
- the chunk after a 40ms yield reads `0`;
- 10 yields move the clock `400`ms and none of it is reported as chunk time;
- per phase, `elapsedMs − Σ chunkMs` is `160` (4 yields inside the window × 40ms), and the first reading is `0`.

The shim's burns (`ShimOpts.burn`) now charge through `ShimOpts.advance`, the virtual clock. `burnMs`, the busy-wait, is gone. A burn without `advance` throws, so no run can quietly go back to measuring the machine. `instrumented`'s `burnYield` became `onYield`.

**The controls, and the one the virtual clock added.** Each burn keeps its positive control, still derived from the burn list: the clock moved by exactly `BURN`, read off the clock and never off a report. The wall-clock deltas (`timeRun`) they replace are gone. A virtual clock opens one hole a real one did not. An executor that moved to another clock would see none of the burns, and every exclusion would pass at 0ms. So a new control asserts the executor READS the virtual clock (`reads > 0`).

**Mutations.** Each ran on a committed tree, restored by `git checkout --`; every run completed.
- **(M1)** `breathe` re-stamps before `await yieldTo()`. Fails `a chunk excludes the 40ms yield that preceded it (2nd build chunk 40ms)`. It also fails the 400ms control (`320ms reported of 400ms`) and both `elapsedMs spans the 4 yields` arms.
- **(M2)** The build-loop head stops re-stamping `mark`. Fails `the first build chunk excludes the 120ms of setup that preceded the loop (120ms)`.
- **(M3)** The shim's combine burn is neutered. Fails `CONTROL: the combine burn really moves the clock the executor reads (+0ms of 120)`.
- **(M4)** The wire-loop head stops re-stamping `mark`. Fails `the first wire chunk excludes the 120ms of set-level work between the loops (120ms)`.
- **(M5)** The executor reads `performance.now()` instead of `Date.now()`. Fails both `CONTROL: the executor prices its chunks on that clock (0 reads …)` arms, plus the exclusion and `elapsedMs` arms.

**Load, both ways.**
- **A slow host, deterministic.** The shim's `createComponentFromNode` was made to spin 5ms of real time (`performance.now`) per member. `main`'s test fails exactly as the issue reported: `✗ a chunk excludes the 40ms yield that preceded it (2nd build chunk 26ms)`. This branch passes, with every reading exact.
- **Real CPU load.** The test file ran pinned to one core beside six busy loops pinned to the same core. It passed on each of three runs; the PR body has the lines.

**Traps for whoever re-verifies.**
- **Swapping `Date.now` is safe here only because every timing run is awaited before the next starts.** Nothing else reads the clock while it is swapped. A future timing arm that runs concurrently with other work has to keep that true, or give the executor a `now` option instead. `onVirtualClock`'s comment states the constraint.
- **The virtual clock proves the rule, not the production timer.** Whether a yield is a macrotask is still gated only by the live run, as the `instrumented` header already says.
