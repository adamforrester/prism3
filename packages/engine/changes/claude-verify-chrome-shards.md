---
engine: patch
---
`npm run verify` runs the chrome suite in CI's shards, side by side (#3216): the `chrome` row starts one
`test:chrome` per shard at once, each with `CHROME_SHARD=<n>`, reading the shard list from
`apps/studio/chrome-shards.mjs`, and reads as a PASS only when every shard passed. `--unsharded` runs it
whole. `shardMapProblems` holds the shards verify runs to `ci.yml`'s matrix and the shard map, by name, in
`lint-doc-gates.ts` and before every local run. `plugin-test` gets a measured time limit of its own (#3183).
The review procedure leans on CI for the full gate list. No engine code, committed artifact or token moves,
so CONTRACT is unchanged.
