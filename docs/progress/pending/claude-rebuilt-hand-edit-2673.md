## (2026-11-17) — Update file skips a member whose hand edit the update would rebuild away (#2673)

**The bug.** Keep holds a hand edit by its path. When the update rebuilds the layer instead of writing it in place, the
fresh node lands at another path or is another node, and the old one, edit and all, is removed, while the verdict
counted the edit kept. Since #2595 that happens to a layer with a hand edit at or under it that the plan moves into a
frame it inserts (deliberately not moved, so it reads as removed there and is rebuilt in the new frame), to a part the
plan renames (removed and added), and to a layer whose type changed (replaced).

**The fix, the issue's option A.** The dry run (`update-plan.ts`) gathers, per member, the layers the update rebuilds:
each it removes (not moved) and each it replaces. A hand edit at or under one is a conflict whatever else moved, and
carries `lost: true`. The apply's member plan (`update-apply.ts`) skips a member with a lost edit under Keep and Accept,
named ("the update rebuilds a layer edited by hand (<path>)", DRAFT wording), as it skips a layer added by hand.
Overwrite rebuilds it, as asked. Nothing moves for a member with no lost edit, so no other set's preview hash changes.

**Owner decision (follows #2956): pending confirmation.** #2673 asked the owner to pick between this and "the verdict
stops counting it as kept". This builds A, because #2956's decision (a structural update on a hand-edited member skips
the member) settles the same question for the wider case.

**Measured.** `test-update-apply.ts`: `acc/edited …`, `acc/edited under …` (the issue's Accordion, an edit on and under
the title the plan moves into its new row) and `replace/hand-edited …` (a type change). On main 10 arms fail; on the fix
all pass. The arms that asserted the old rebuild under Keep now run under Overwrite (`acc/<edit> overwrite agree`).
