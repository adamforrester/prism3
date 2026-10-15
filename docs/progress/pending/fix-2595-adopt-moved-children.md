## (2026-10-15) — Update: children moved into a frame the plan inserts keep their ids (#2595)

**What happened.** The in-place update pairs a node's children with the plan's by name, under the same parent
only.  When a plan inserts a frame between a node and children it already has (Accordion's `titleRow`, #2594),
the new frame had no candidate, so it and everything in it were built fresh and the old children removed. On
an Accordion built before #2594 the indicators, their glyph instances, `titleBox` and `label` all got new ids,
and a placed instance's own choice on the nested indicator was lost.

**The fix.** `adoptions` in `write-components.ts` is the one rule, read by the executor and by the dry run: under
a node the file holds, a plan child FRAME with no child of its name is offered the node's unpaired children
that the FRAME names as its own, that no other plan child claims, and that the file holds under that name
once. In `build`, the fresh frame pairs them as an in-place node pairs its own, and each that fits is moved in
(`appendChild` moves a node in Figma) and configured in place. One that does not fit stays with its old parent,
which removes it, as before.  The dry run (`movesOf` in `update-plan.ts`) lists each move as `<part> · moves
into <frame>, kept` (the issue's option A, DRAFT wording, an owner item), drops it from the "removed" lines,
and diffs the moved subtree against its plan at the new path, so a field the apply changes on a moved node is
still listed. `EXECUTOR_REVISION` 22 → 23.

**The trade-off.** The dry run runs before the designer picks keep, overwrite or accept, so the move cannot depend
on the choice. A node with a hand edit at or under it is never moved (`edited`, every hand-edited path whatever
the choice, passed by the apply alongside `keep`): it is rebuilt as before #2595, and the dry run lists it as
removed on that member. That rebuild already loses the hand edit under "keep" on main while the verdict says
"kept"; filed as #2673 rather than widened here.

**A shim fix the test needed.** The component shim's `appendChild` pushed a node onto its new parent without
taking it off the old one, which Figma's does (its `insertChild` already modelled the move). Without the fix a
moved node read as in both places. No other suite moved with it.

**Tests.** `acc/dry run moves` holds the three move lines and that nothing reads as removed; `acc/moved children`
reads every node under the moved parts, by id, under the row; `acc/agree` checks the shim removed none of them;
`acc/edited dry run` and `acc/edited agree` hold the hand-edited title listed removed on its member and rebuilt
there, moved on the other 23.
