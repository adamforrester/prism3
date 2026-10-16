## (2026-10-16) — Update closes a gap that labels shrinking in the same Update left wider than 160 (#2734)

**What changed.** Update's second re-spacing pass, the one that runs after the furniture redraw (#2737, Q358 A), now
also closes a gap a redraw *widened*. Just before the redraw, `settle` (`update-apply.ts`) reads which sets sit at
exactly `SET_GAP` of white space from their left neighbor (`snugSets` in `write-components.ts`, by name through
`pageSnugSets` in `update-plan.ts`). After the redraw, `respaceSets` puts those sets back at exactly `SET_GAP`, nearer
or further. Any other spacing is still the designer's and stays (Q248 A).

**Diagnosis that made it small.** #2734 offered two fixes: re-space after the redraw, or recognize Prism3's own
spacing. The first landed with #2737, and on its own it only makes room. The second fits in the same pass:
`respaceSets` already recognized one spacing as Prism3's rather than a designer's (`OLD_SET_GAP`, the #2502 spot).
The current rule's spot, exactly 160, is the same kind of evidence. It has to be read *before* the redraw, since after
it the gap no longer reads 160. So it is a snapshot taken by name, never by node index (the redraw replaces the
furniture nodes and shifts every index on the page).

**Verification.** `test-canvas-furniture.ts` `columns/labels shrink`: the settled Radio page, with radio-row's leftmost
label stretched to reach 50px past the set and both later sets 160 clear of it. The dry run lists nothing; one Update
redraws the label at its width and puts radio-row and radio-group back where they stood, at 160, and the next dry run
is clean. `test-update-apply.ts` `respace/snug` and `respace/snug after a redraw` are the pure arms. `EXECUTOR_REVISION`
30, since `write-components.ts` moved.

**Traps.** This branch is stacked on #2737's (`claude/2723-visible-set-gap`), which carries #2717's merge. Until both
land, the diff against `main` shows their work too. A designer who happens to leave exactly 160 by hand gets the same
treatment as Prism3's spacing. That is the same bet `OLD_SET_GAP` makes, and an owner item on the PR.
