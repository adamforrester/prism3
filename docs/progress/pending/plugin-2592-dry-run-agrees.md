## (2026-10-13) — Update: the dry run lists what the apply refuses, and a display-renamed axis updates in place (#2592)

**What happened.** On an owner's copy file, an Accordion set built from an early #2534 head held the axis `position`.
The merged def shows it as `icon position`. The dry run read `position` as a removed axis and `icon position` as an
added one, and reported 12 to rename and 12 to mark deprecated with no blocker. The confirmed apply refused the set
for a collapse. Two defects: the dry run and the apply disagreed, and a renamed axis read as a removed one.

**The diagnosis that made the fix small.** The dry run already found the collapse (`needsChoice: axisCollapse`); it
just never made it a blocker. The apply's preflight restated three refusals that are pure functions of the dry run
(a collapse, an axis change over members not built by Prism3, a rename onto another member's name). They now live in
one function, `setRefusal` in `update-plan.ts`. `dryRunSet` lists what it returns as a blocker, and the preflight
refuses any set with a blocker, so the two cannot drift. That is #2545's shape for layout ownership. The checks the
dry run cannot make (fonts that will not load, variables or styles the file lacks) stay in the preflight. That gap
is filed as #2601.

**Ledger, not `variantAxisNames`.** The update maps the axis through `COMPONENT_RENAMES`. The ledger speaks the
Figma panel's names, which are the names a set holds, and `component-axes.json` is keyed the same way. `position`
appears in no def field, so `variantAxisNames` could never have mapped the live case. Two entries cover both
pre-merge heads, `position` and `iconPosition`.

**Should `lint-component-renames` have demanded an entry? No.** Every rename happened inside #2534, and that PR's
merge base had no Accordion at all, so the gate compared nothing. Its contract runs from main to main. A display-only
rename that lands on main for an existing def *is* caught, because the baseline is keyed by the Figma name. A new
engine test pins that.

**Found on the way.** `noChanges` left renames out, so a set whose only change was 24 renames read "up to date"
while the apply renamed them. Renames now count as a change.

**Adopt follows, with one exception.** A set with a rename onto a hand-made member's name was always refused by the
update. It is now also refused by Adopt, which refuses any set the dry run blocks. The `adopt/held` arm keeps its path
through a hand-made member that the ledger renames onto a stamped member's coordinate. The exception came from review:
an axis change over members not built by Prism3 is the very refusal Adopt exists to clear. Once it became a blocker,
Adopt refused the set for it, and the set was stuck for good. `setRefusal` now returns `{ reason, adoptClears }`, true
only for that branch. The dry run still lists every reason as a blocker, and Adopt is refused only by the others. The
`adopt/axis change` arm takes an Accordion on `position` with one member's stamp and record cleared. Adopt claims that
one member, and the next dry run has no blocker. Mutation: Adopt refused by every blocker again fails it by name. The
executor's code did not move, so `EXECUTOR_REVISION` stays.

**Arms.** `agree/collapse` and `agree/rename onto a name` take the apply's own refusal, read off the confirmed run,
and require the dry run to list that reason as a blocker in its own words. `display rename/position` and
`display rename/iconPosition` require every member renamed in place, with keys and ids the test captured off the
shim beforehand.
