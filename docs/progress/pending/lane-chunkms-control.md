## (2026-09-30) — test-write-components: a burn inside a chunk, so a constant-zero chunkMs fails by name (#1848)

**STATUS: PR open from `lane/chunkms-control`, labeled DO NOT MERGE.** The change touches only the test and its shim (`apps/plugin/component-shim.ts`), so there is no change note and no ENGINE bump.

**The hole.** Every `chunkMs` arm in the #684 block asserted an EXCLUSION, `=== 0`: of setup, of the set-level work between the loops, and of the yield. A `breathe` that reported `chunkMs: 0 * (now - mark)` satisfied all three, and it passed the whole plugin `test` (`docs/34` shape 4). The CONTROL arm named "the executor prices its chunks on that clock" checked only `reads > 0`, and the `elapsedMs` read satisfies that alone (shape 20: the name claimed more than the assertion checked).

**The fix.** A fourth burn, `burn.member`, charges 120ms on the virtual clock inside the first `createComponentFromNode`. That is work the first build chunk does, so the chunk must CARRY the cost. `chunkMs === BURN` asserts the first build chunk reports 120, and a second arm asserts the chunk list is `[120,0,0,0,0]` for build and `[0,0,0,0,0]` for wire, so the cost lands in its own chunk and nowhere else. Both expectations are literals. The new burn joins `burnRuns`, so the control loop checks for free that it really moves the clock. The CONTROL arm is renamed to what it checks, "the executor reads that clock". Case 4 is now what proves it prices chunks on that clock.

**Mutations** (each run checked to execute all 524 assertions of `test-write-components.ts`):
- **The issue's mutation:** `breathe` reports `chunkMs: 0 * (now - mark)`. The run fails `chunkMs === BURN` (0ms) and "billed to that one chunk" (`[0,0,0,0,0]`), and the whole plugin `test` now fails too.
- **The converse:** the same mutation, with the two new arms neutralized. The run is `ALL PASS`, which is the issue's finding reproduced, and shows that the new arms are what catch it.
- **The member burn deleted from the shim:** the two new arms fail, and so does "CONTROL: the member burn really moves the clock" (+0ms of 120).
