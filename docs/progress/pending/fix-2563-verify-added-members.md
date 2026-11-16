## (2026-11-16) — Update file verifies the members it adds (#2563)

**What.** `applySet`'s verify (b) in `update-apply.ts` (`diffAnatomy`, the unplanned-paint read, `nestedMemberFaults`,
`drawnFaults`, reactions) iterated `out.updated` only, so a member the update added was never read back. It now also reads
every planned member that is in the set after the run and was not before, found off the host rather than taken from the
executor's `added` count, with no hand edit kept.

**The paint half was already fixed.** #2563 had two halves. The first, a re-added Tag hover member's 10% overlay wash
stored at 100%, no longer reproduces on main: #2774 made the executor assign a translucent bound paint twice, which the
host keeps, and the issue's repro (remove that member, dry run, apply, dry run) now ends 45 current with the wash at 10%.
`add, wash/drawn` pins that. The second half, the unchecked added member, is this fix.

**Measured on the shim.** `test-update-apply.ts` gains `add, wash/…`: the Tag set built without the hover member, then
updated with a set whose `appendChild` leaves the appended member's bound washes at 100% (the host behavior #2563
measured). On main the apply reports `✓ updated 1 in place` with no content line; with the fix it fails with
`…state=hover.fills: stored #715b32 at 100% (the plan says …overlay/hover, which resolves to #715b32 at 10%)`. Dropping
the added members from the loop fails `add, wash/verified` by name. `update-apply.ts` is not reached from the executor, so
`EXECUTOR_REVISION` does not move.
