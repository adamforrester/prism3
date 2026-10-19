## (2026-10-15) — Update: children moved into a frame the plan inserts keep their ids (#2595)

**What happened.** The in-place update pairs a node's children with the plan's by name, under the same parent
only.  When a plan inserts a frame between a node and children it already has (Accordion's `titleRow`, #2594),
the new frame had no candidate, so it and everything in it were built fresh and the old children removed. On
an Accordion built before #2594 the indicators, their glyph instances, `titleBox` and `label` all got new ids,
and a placed instance's own choice on the nested indicator was lost.

**The fix.** `adoptions` in `write-components.ts` is the one rule, read by the executor and by the dry run: under a
node the file holds, a plan child FRAME with no child of its name is offered the node's unpaired children that the
FRAME names as its own, that no other plan child claims, and that the file holds under that name once. In `build`,
the fresh frame pairs them as an in-place node pairs its own, and each that fits is moved in (`appendChild` moves
a node in Figma) and configured in place. One that does not fit stays with its old parent, which removes it,
as before.  The dry run (`movesOf` in `update-plan.ts`) lists each move as `<part> · moves into <frame>, kept`
(the issue's option A, DRAFT wording, an owner item), drops it from the "removed" lines, and diffs the moved subtree
against its plan at the new path, so a field the apply changes on a moved node is still listed. `EXECUTOR_REVISION`
22 → 28 (main took 23 to 27 with #2652, #2648, #2703, #2683 and #2744 while this was open).

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

**Review round (CHANGES REQUESTED on `a63c505a`).** The edit rule was written out twice, once beside each
`adoptions` call, and only its result was shared, so an edit *under* a moved node could stop blocking the move
on one side alone with every test green (the review's M3). `adoptions` now takes `edited` and the parent path and
applies the rule itself; the closure is gone from both callers. The hand-edit block runs twice, with the edit on
`titleBox` and under it on `label` (`acc/edited under dry run` / `acc/edited under agree`). `acc/moved diffed`
holds the claim that a moved subtree is diffed at its new path: a pre-#2594 title column with no top padding is
listed as `paddingTop` at `header/titleRow/titleBox` on all 24 members beside its move (the review's M5 passed
silently). `acc/adoptions …` drives the rule on hand-built inputs, one line per guard: the name held once,
the frame already present, a name another plan child claims, an edit under a child, an edit on a sibling that
only shares a prefix. The review's nit on the dry run's third type map is closed at the source: `adoptions`
never moves an INSTANCE_SWAP, whose host type (an instance or a placeholder frame) depends on whether its target
is in the file, which the dry run cannot read, so both sides rebuild it. No committed def moves a swap part,
so nothing moves today. `EXECUTOR_REVISION` is 28: main took 23 to 27 (#2652, #2648, #2703, #2683, #2744) while
this was in flight.
