## (2026-10-10) — Update: the executor's re-lay leaves a member Prism3 didn't build where it is (#2494)

The LAY OUT pass in `write-components.ts` measures and repositions the whole union, so an update run on a set for any other reason also moved a member with no stamp that sits on a planned coordinate (one Adopt could claim). The dry run listed no change for it, and the verdict named it among those "left as they are". Prism3 never touches a member it didn't build (#2325, #2464).

- **The fix:** the pass leaves a member with no stamp exactly where it is. Its size still counts toward its row's height and its column's width, as the dry run's `gridMoves` (#2471) counts it, so every other member sits where the dry run said. The check applies only to a member that can carry a stamp: the port makes `getSharedPluginData` optional, and a node without it is laid out as before rather than taken for a member Prism3 didn't build.
- **`EXECUTOR_REVISION` 9 → 10**, for `lint-executor-revision`.
- **Test:** `relay/…` in `test-update-apply.ts`. A `tag` set's gap moves on every member, so the build's pass re-lays the grid. One member has its stamp cleared and is moved 300px off the grid. It stays at `[498,360]`, is named as "not built by Prism3", and the other 44 are updated with the new gap.
- **Mutation, the guard removed:** `✗ relay/unbuilt left: … ([498,360] → [198,60]; 44 updated, 44 with the new gap)`.
- **And with #2471's regroup** (merged in from `main`): on #2471's `unbuilt/…` Button, the unbuilt member is made 40px taller than its row and 500px off the grid. The dry run reads `558 to move, 1 not built by Prism3` (93 rows × 6 states below its row), and the apply reads `✓ moved 558`, `button: 558 moved, 1 left as they are.`, with that member byte-identical. Before this fix the same set read `✓ moved 559`. Test: `unbuilt/relay left` in `test-canvas-furniture.ts`, which also corrects #2471's fragment note on #2494.

- **Its size still counts (Lane C's review):** `relay/unbuilt size counts`. The unstamped member, in its own cell, is made 300px wider and 30px taller than its neighbours, and an unrelated update re-lays the grid. The next member across starts one gap after its right edge (372), the next one down one gap below its bottom (122), and none lands on top of it. Mutations, each failing `relay/unbuilt size counts` by name:
  - the measuring loop skipping unstamped members: next across 372 not 612, next down 92 not 122, and 5 land on top;
  - skipping it for column widths only: 372 not 612;
  - skipping it for row heights only: 92 not 122.

### Not here

- **A malformed or copied stamp:** `ownedView` reads both as not built by Prism3, but the re-lay still moves them: #2510. The executor can't import `ownedView` (`update-plan.ts` imports `write-components.ts`), and the brief scoped this to unstamped members.
