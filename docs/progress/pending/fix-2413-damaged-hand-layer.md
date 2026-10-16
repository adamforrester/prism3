## (2026-10-15) — Update: a damaged member with a layer added by hand reads as the apply treats it (#2413)

**What happened.** A member that draws wrong (#2379, for example a stored #000000 paint) and also has a layer
added or removed by hand was "to update" in the dry run, because damage was classified first. The apply's `plan()`
reads the structural hand edit and skips the member under every choice (§5: its paths can no longer be trusted
node by node).  So the dry run promised a repair the apply never made, and the apply's skip line said only
`a layer was added or removed by hand`, so a reader could not tell the member still drew wrong.

**The fix (the issue's option A, built and listed as an owner item).** In `update-plan.ts` a structural hand edit
outranks damage: such a member counts as `handEdited` ("N members edited by hand", existing wording), and its
damage stays in the difference lines. The state entry carries the damage as `faultLine` strings, so the apply's
skip reason reads `a layer was added or removed by hand, and it draws other than its plan (<faults>)`. The only
new words are ", and it draws other than its plan".

**Scope held back.** A member whose reactions dangle (#2466) is damage too and has the same order: dangling
reactions still read "to update" over a structural edit, and the apply still skips it. Left as it was and filed
as #2674, since the issue and the held question are about drawn damage only.

**Trap.** `faultLine` on a fault at the member's root writes `<member>/..fills` (part `.` joined with `.`). The
skip reason inherits that, as the verify lines already do (filed as #2675); the test reads the field and the
stored color, not the join.

**Tests.** `damage/under a layer dry run` holds the state, the counts, the paint line and the set line;
`damage/under a layer skip (keep|overwrite|accept)` holds the reason and that the member is left exactly.
