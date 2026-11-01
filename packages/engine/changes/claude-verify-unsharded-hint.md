---
engine: patch
---
When a sharded gate (the chrome suite) fails or times out in `npm run verify`, its output now ends with a line
naming `npm run verify -- --unsharded` beside `VERIFY_TIMEOUT_SCALE` (#3227, owner decision Q-CI2 A): on a machine
with few CPUs the side-by-side shards compete for them, and one whole run is the better way out. A self-check arm
fails by name if the hint is dropped from a FAIL or time-out, or printed under a PASS. Three comment headers in
`apps/studio/` now describe the sharded default. No engine code, committed artifact or token moves, so CONTRACT is
unchanged.
