---
engine: patch
---
CI runs the chrome suite (`apps/studio/test-chrome.mjs`) as three parallel shards instead of one job (#2898). The suite's
sections run under `if (runs('<id>'))` guards, `CHROME_SHARD=<n>` picks the sections `chrome-shards.mjs` gives shard n,
and every run writes its record to `apps/studio/chrome-record/`. A new gate, `test:chrome-shards`, holds the records to
the unsharded suite's own section list, each section exactly once, then runs the suite's end-of-run checks over all the
shards. No engine code, committed artifact or token moves, so CONTRACT is unchanged.
