## (2026-11-16) — Update file no longer duplicates a member whose name lists its properties in another order (#2944)

**The cause.** The issue suspected Set up file's `ensureDocBlock`. It is not the cause: it only creates instances of the
sets it nests, and a new `test-doc-panel.ts` arm (`template/reads only`) pins that. The duplicate comes from Update. The
dry run (`update-plan.ts`) matches a member to its plan by coordinate (`coordKey`, order-free; #2265 pins that order
moves no match, `order/permuted`), so a member named `state=rest, size=medium, …` where the plan writes `size=medium,
state=rest, …` reads as the member to update. Figma rewrites a member's segment order when an axis is renamed in its UI,
so such names happen. The apply handed it to the build's pass, which looked existing members up by their exact name
(`have.get(spec.name)`), missed it, and built a new member on the same coordinate. That matches the issue's evidence:
the same stamp and record (both fresh from the plan), the same x/y (the grid places by cell), 0 instances, created in
the session that ran Update.

**The fix, in two places.** The apply (`withOrderMoves`, `update-apply.ts`) adds a move for each member it may configure
whose name differs from its plan's only in segment order, so the existing rename block (#1780) renames it in place
before the build's pass and every step after reads it under the plan's name. It is not counted as a rename, and the dry
run is unchanged. A member the update does not configure keeps its name: the move reads that set off the apply's own
`plan` under the run's choices, so a member skipped for no as-built record under `noBaseline: 'skip'` is not renamed
(#3816 review). And the executor keys existing members, and the layout's
cells, by coordinate, so a Build on a set already there skips such a member as present instead of adding one, and lays
it out in its cell. `EXECUTOR_REVISION` 62 names no set: `lint-executor-reach` drew all 62 with both executors over its 10
arms and found none redrawn.

**Tried and discarded.** Listing the reorder as a rename in the dry run (`renames`) also fixed it, but broke #2265's
`order/permuted` contract and would show a designer "45 renamed" for a set Figma reordered.

**A duplicate already in a file** is reported, not repaired: the dry run refuses the set and names the coordinate two
members share ("2 members share the coordinate …"), pinned by `apply/blocked` and `blocked/duplicate`. Whether Set up
file or Update file should also delete one is held for the owner.

**Measured.** `test-update-apply.ts` `member-order/*`: on main all five arms fail, `/no duplicate` with the issue's 46
members for 45 coordinates; all pass with the fix. Mutations, each failing by name: `withOrderMoves` adding no move →
`/renamed in place`, `/keys`, `/settled`; the executor's coordinate match dropped from `have` or from `cellOf` → `/build`.
`/skipped keeps its name` (the review's probe, kept as an arm) fails on the first head, renaming the member and naming
it by a name no longer in the file; `withOrderMoves` not reading `plan`'s set fails it by name.
