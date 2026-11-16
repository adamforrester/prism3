## (2026-11-16) — Update file puts a set's members in plan order, so its values list as a fresh build's do (#2386)

**What.** The executor appends a member an Update adds into the set the file holds (`set.appendChild`), after the members
already there, and the set's variant options follow member order. #2386 found it on the image placeholder: built with
three ratios, then updated to seven, the set listed `1:1, 4:3, 16:9, 2:3, 3:4, 4:5, 3:2` where a fresh build lists the
plan's order. `applySet` (`update-apply.ts`) now calls `toPlanOrder` after the build pass: each planned member moves, with
`insertChild` (which keeps its id), into the slots planned members hold, in plan order. A member off the plan keeps its
slot, and a set already in order is not written. In the apply, not the executor, so `EXECUTOR_REVISION` does not move.

**Measured on the shim, not the host.** The shim lists a variant property's values in member order. #2386 believed the
host does the same, and that is still not measured live. The test's oracle is a fresh build of the same plan in the same
shim. `test-update-apply.ts` gains `add, order/…`: #2386's own case (3 ratios, then 7) and a kept member (1:1 leaves the
plan as 4 ratios join). On main all 3 assertions fail with the issue's order; with the fix the suite passes 1104/1104.
Two mutations each fail all three by name: the reorder call removed, and the sort dropped from `toPlanOrder`.

**Not done here.** A file an earlier Update already left out of order is put in order the next time an Update writes the
set. The dry run does not read member order, so it does not list such a set as due on that account alone.

**OWNER DECISION (narrow).** Where a member off the plan sits. A fresh build has no such member, so it gives no answer.
Options: (A) it keeps the slot it has, and planned members fill the rest in plan order (built here, and it moves nothing
the plan doesn't own); (B) every member off the plan goes after the planned ones; (C) before them. Recommendation: A.
