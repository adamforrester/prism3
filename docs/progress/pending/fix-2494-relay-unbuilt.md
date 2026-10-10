## (2026-10-10) — Update: the executor's re-lay leaves a member Prism3 didn't build where it is (#2494)

The LAY OUT pass in `write-components.ts` measures and repositions the whole union, so an update run on a set for any other reason also moved a member with no stamp that sits on a planned coordinate (one Adopt could claim). The dry run listed no change for it, and the verdict named it among those "left as they are". Prism3 never touches a member it didn't build (#2325, #2464).

- **The fix:** the pass leaves a member with no stamp exactly where it is. Its size still counts toward its row's height and its column's width, as the dry run's `gridMoves` (#2471) counts it, so every other member sits where the dry run said. This applies only on a host that carries plugin data: on one that doesn't, every member reads unstamped, and the grid is laid out as before.
- **`EXECUTOR_REVISION` 9 → 10**, for `lint-executor-revision`.
- **Test:** `relay/…` in `test-update-apply.ts`. A `tag` set's gap moves on every member, so the build's pass re-lays the grid. One member has its stamp cleared and is moved 300px off the grid. It stays at `[498,360]`, is named as "not built by Prism3", and the other 44 are updated with the new gap.
- **Mutation, the guard removed:** `✗ relay/unbuilt left: … ([498,360] → [198,60]; 44 updated, 44 with the new gap)`.

### Not here

- **A malformed or copied stamp:** `ownedView` reads both as not built by Prism3, but the re-lay still moves them: #2510. The executor can't import `ownedView` (`update-plan.ts` imports `write-components.ts`), and the brief scoped this to unstamped members.
- **The case where #2471's regroup moves stamped members alongside an unstamped one** (`✓ moved 559`, `1 left`): its test goes in once #2471 is on `main`, since its `moved` count and `gridMoves` come with it.
