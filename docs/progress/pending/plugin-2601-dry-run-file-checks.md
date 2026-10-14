## (2026-10-14) — Update: the dry run makes the apply's file checks, fonts included (#2601)

**What happened.** #2592 made the dry run and the apply share one refusal test (`setRefusal`), but the apply's
`preflight` still made four checks of its own: a variable the plan binds, a text or effect style it names, a
component it nests or swaps to (the dry run's `absentNests` read nests only), and a font that will not load. So a
confirmed apply could still refuse a set its dry run had reported with no blocker.

**The fix.** `fileBlockers` in `update-plan.ts` makes all of them, and `previewUpdate` lists each as a blocker on
the set. The apply's `preflight` is now one line, `p.blockers`, so there is nothing left for the two to disagree on.
The wording of each refusal is the preflight's, moved; the one change is that a swap target is named as one ("the
plan swaps to"), since nests keep #2380's own line with what to build first.

**Fonts, the trade-off the issue held back.** `UpdateHost` gains an optional `loadFontAsync`. The plugin's host is
`figma`, which has it, so the dry run loads every font now; Figma caches loaded fonts, so the apply's own loads that
follow cost nothing extra. A host without it (some test shims) checks no font. A set's blockers now go into
`previewHashOf`: they come from the file's catalogues and installed fonts, which the per-set hash never read, so a
font installed between the check and the confirm refuses the apply ("the file changed since the check"), and the
designer confirms what they were shown.

**A trap in the old test.** `fonts/refused` overrode the font on the executor's port only. The test's `host` is a
spread copy of the shim, so its `loadFontAsync` kept the original. In the plugin both are the same `figma`; the test
now overrides both.

**Verification.** `test-update-apply.ts` `agree/file variable`, `agree/file text style`, `agree/file swap target`,
`agree/file font`: each builds a set whole, asks the plan (or the host) for something the file lacks, and checks the
apply's own refusal against the dry run's blockers, the #2592 harness. Mutation: the dry run's call to `fileBlockers`
moved to a side field the apply's preflight reads (the pre-fix shape) fails all four by name, and #2380's
`icons/absent`. No def names an effect style today, so that check has no arm, as before.
