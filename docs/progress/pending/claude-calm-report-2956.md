## (2026-11-17) — Update file lists what a kept hand edit stopped it writing on its own line, not as ⚠ (#2956 point 4)

**What read as an error.** #2956 point 4: "hand edits kept" should read as normal, with a separate line for what the
engine wanted to change but didn't. Two of those were already true: the verdict counts "N hand edits kept" inside a ✓
headline (`applyVerdict`), and #3421's "keep out" line names the plan's values the kept edits held back. The ⚠ came
from the build's own misses (#2957's finding): the build measures and reads back around the nodes it leaves, so a kept
edit can show up as a miss on another node or a sibling. Measured in the shim: one Tag member's content padding
unbound and set to 3 by hand, then an Update with Keep, gives four `footprint -> …` misses naming that member, and the
run read "⚠ Updated 1 set · 1 to check".

**The change, Q1 A (owner-decided 2026-11-17).** In `applySet` (`update-apply.ts`), under Keep and Accept, a miss that
names a member the run kept hand edits on (`namesMember`, as the skipped members' misses are already set apart) moves
to `editedMisses`. The verdict lists them on their own line, "<set>: not written because the member is hand-edited —
…" (DRAFT wording, Q1 A's), and they are not counted as a set to check. A member whose as-built record could not be
written (`NOT RECORDED`) stays a miss: that is a write the update could not finish, kept edits or not. Under Overwrite
nothing is kept, so nothing moves.

**#2956 Q1 is settled: A.** B (only a miss on a kept node's parent or child moves) and C (leave it ⚠ until item 2),
both declined, would each have changed only the filter.

**Measured.** `test-update-apply.ts` `calm/*`: on the base `calm/split`, `calm/verdict` and `calm/line` fail; on the fix
all pass, `calm/accept` pins the same split under Accept, and `calm/not recorded` holds the not-finished member as a miss. `kept report/real discard` (#3086) still
holds a binding dropped on a node no one edited as a part not written.
