## (2026-11-17) — Update file skips a hand-edited member whose structure the update changes (#2956 point 2)

**The decision.** #2956, owner decision 2026-10-23: a structural update on a hand-edited member skips the member and
reports it. Before, the update wrote the new structure around the kept paths: a member with a recolored root took a new
text column, and whether an edit survived depended on whether its layer was moved, rebuilt or left (#2673 is the case it
did not).

**What counts as structural.** Read by the dry run (`update-plan.ts`) off what it already diffs for the member: a planned
layer the member lacks (`diffAnatomy`'s `children`), a layer whose type changes (not the member itself, which is refused
on its own), a layer moved into a frame the plan inserts (#2595), and a layer the plan no longer has. A changed nested
instance (a swap) and a glyph's artwork are not structural: both are written in place, and a kept node is not swapped
or re-imported. A hand-edited member with any of these carries `restructured: true` in `states`.

**What the apply does.** Under Keep and Accept, a restructured member is skipped whole and named, "hand-edited, and the
update changes its structure" (DRAFT wording after the #2956 wireframe). Overwrite writes the plan. A member whose own
layer was added or removed by hand is skipped under every choice, as before, and a member with an edit the update would
lose (#2673) keeps that more specific reason. **Owner decision (follows #2956): pending confirmation.** Accept skips
too, held for the owner as #2673's is (#3901 review): Accept keeps the edit, so the new structure could lose it just as
Keep would, but what Accept does is a change to what a choice does.

**Changed arms.** `rows3153/hand edit kept` on Checkbox.Row and Radio.Row asserted the old behavior (the text column
written around a kept gap). They now assert the skip (`rows3153/hand edit skipped`), and `rows3153/structure` reads the
other members. Switch.Row, whose structure does not move, still keeps its edit in an updated member.

**Measured.** `test-update-apply.ts` `structure/*`: a root-fill edit under a plan that adds, removes or retypes a layer
(Keep), adds one (Accept, Overwrite), and changes only a fill (Keep). On the base 11 arms fail; on the fix all pass.

**A gap noticed, not fixed here.** After a Keep run that skips members, the as-built ledger records the set as built
from today's def unless kept edits held changes back (`ledgerAfter`), so the Update file badge can read the set as
current while a skipped member is not.
