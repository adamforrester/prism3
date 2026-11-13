## (2026-11-12) — Update file: a blocked set is listed apart, not ticked as Due (#3713, 2 of 4)

Update file's Due group ticked every Due set, and its line said "n sets to update in place. Ticked by default." But the run leaves out every set the scoped check blocks (`updatableOf`). So the owner's blocked Icon set sat there ticked while Update file had nothing to write.

**The fix.** Once the check answers, `blockedDueOf` reads which Due sets it blocks for this run, by the same `runnable` test the run uses. A set only Theme blocks still counts as runnable while Theme is ticked (#3421). Those sets leave Due for a group of their own, "Can't update yet". Each row there has the set's name, its due reason, and its reason in plain words (`blockedReason`, which builds on #3713's `blockedWhy`). The row has no tick. Due's line, its ticks, the hand-edit count and the "Saves a version first" line count only the sets that can run.

The set's tick itself is left alone. A Theme toggle that unblocks the set brings it back to Due ticked, as before. Before the answer nothing is known, so every Due set is listed, ticked. The new rows reuse the dialog's existing classes, with no restyling, because the owner is re-thinking the layout.

**Independence.** `test-update-file.ts` holds `blockedDueOf` to literal cases: without Theme, with Theme, and before the answer. Chrome section ia2 posts an answer that blocks one of its two Due sets. It expects one Due row, the literal Due line, the literal group title and row, no checkbox in the group, and Update file still enabled. **Mutation:** with `blockedDueOf` returning `[]`, ia2 fails `#3713 blocked apart` and the unit test fails `#3713 apart`.
