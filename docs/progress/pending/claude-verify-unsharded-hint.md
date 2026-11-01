## (2026-10-31) — verify: suggest --unsharded on a shard's failure (Q-CI2 A)

Follow-up to #3224's review (#3227). Since #3216, `npm run verify` runs the chrome suite as three shards side by side. When one failed or timed out, the only hint was `VERIFY_TIMEOUT_SCALE`. On a 2-CPU machine the shards compete for the CPUs, so the better way out is one whole run.

**The hint.** `combineShards` adds `UNSHARDED_HINT` to a sharded row's output when the row is a FAIL. A time-out is a FAIL, so one branch covers both cases. A PASS or SKIP row prints no hint. The per-shard time-out message from `classifyRun` is unchanged, so `VERIFY_TIMEOUT_SCALE` is still named next to the new line:

> chrome runs its 3 shards side by side, so on a machine with few CPUs they compete for them and a healthy shard can fail or time out. To run it once, whole, rerun with `npm run verify -- --unsharded`. To give every gate more time instead, set VERIFY_TIMEOUT_SCALE (see point 5 in verify.ts).

**The arm.** Three self-checks in the #3216 block: the hint after a FAILED shard, the hint after a timed-out shard, and no hint under a PASS. Each checks a literal, `` rerun with `npm run verify -- --unsharded` ``, not the constant, so rewording the command away fails it as well (`docs/34`). Mutations, each after a `wip:` commit: removing the line fails the first two by name, printing it on every outcome fails the third, and rewording the command fails the first two.

**Comments.** `chrome-shards.mjs`, `test-chrome.mjs` (file header and the modes block) and `test-chrome-shards.mjs` said `npm run verify` runs the suite whole. They now describe the sharded default and the `--unsharded` fallback.
