## (2026-10-21) — CI runs the gates as parallel jobs, and `gates` waits for them all (Q503 A)

Owner decision Q503 A, item 1. CI was one job that ran every step in series: 34 to 50 minutes on the
last five runs on main, median 48. The chrome suite was the long pole, at a median of 1,408 s (about 23
minutes), followed by the plugin shim tests (470 s), the smoke suite (231 s) and the engine unit tests
(190 s). Every other step took under 30 s.

`ci.yml` now has five gate jobs and one aggregator:

- `engine`: the engine and doc gates. No build, no browser.
- `studio`: the web typecheck, unit tests and build, the contrast and live-CSS lints, and the smoke suite.
- `plugin`: the plugin typecheck, shim tests, both builds, the bundle lints and its three browser suites.
- `chrome`: the chrome suite, alone.
- `surfaces`: the gates that read both bundles or TokenPress. That is export parity, the two exporters,
  readback parity, and the US-English and voice gates. Those last two scan both built bundles.
- `gates`: needs all five and runs `if: always()`. Its one step, `.github/scripts/all-gates.sh`, fails
  when any job's result is not `success`, and names the job.

**The result, measured on this PR's first run (39597359183).** Wall time was 24 min 15 s, about half
the 48 min median. The jobs took: `chrome` 1,444 s, `plugin` 739 s, `engine` 315 s, `studio` 272 s,
`surfaces` 75 s, then `gates` 7 s. The chrome suite itself ran 1,402 s, so `chrome` is now the whole
critical path. Any further cut has to come from inside that suite.

**The `gates` name is kept.** The old single job had the id `gates`, so its check run was called `gates`.
The aggregator now has that id, so branch protection and any tool that reads the check named `gates` see
the aggregator. The five gate jobs report beside it under their own names.

**Each gate runs once.** The gate steps were moved with their comments and commands unchanged. Compare the
`(name, command)` pairs before and after: the same 85 gate steps appear, and the only new step is the
aggregator. Some steps now run more than once, and none of them is a check on its own: `npm ci` runs in
each job, the Chromium install runs in each of the four browser jobs, and `Build web` and `Build plugin`
each run in three jobs. A job builds the bundles it drives instead of downloading them from another job. A
build takes 2 to 3 s, which is less than an artifact upload and download. Downloading would also add a
serial build job in front of every browser job, and the downloaded bundle's mtime would come from the
download, which `assertBundleFresh` was never tested against.

**The chrome suite is not split.** `test-chrome.mjs` is one 15,000-line script with shared state at the
top level, and it has no way to select a subset of its sections. Splitting it would change the suite
itself, so it runs alone in its own job. That job is the floor for the run's wall time.

**`lint-doc-gates.ts` checks the aggregator.** Suppose a job is missing from the `needs` of `gates`. Every
existing arm stays green, because the job's steps are still in `ci.yml`. Yet that job can fail while the
merge rule reads green. `aggregatorGaps` reads the parsed tree. It fails unless `gates` needs exactly
every other job, runs `if: always()` and runs the script. We mutated the real `ci.yml` to drop `chrome`
from `needs`, to drop the `if`, and to rename the job. Each mutation failed by name. The aggregator step
is exempt from the runner arm by name, because it reads job results and asserts nothing about the tree.
`test-all-gates.sh` covers the script. A `failure`, `cancelled` or `skipped` result fails it, and so do
an empty or unreadable input. Each of three mutations to the script fails the test by name.

**Proved in CI as well.** We pushed a commit to this PR that made the exporter gate exit 1, then reverted
it. On that run (39600758928) `surfaces` failed, the other four jobs passed, and `gates` failed with "Not
every gate job succeeded: surfaces (failure)".
