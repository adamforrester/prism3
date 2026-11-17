## (2026-11-17) — Apply Theme reports the styles a new brand doesn't plan (#1737)

**What.** Applying one brand over another left the earlier brand's styles in place (a style the plan doesn't write is
never touched), and the apply verdict never mentioned them, though it reports orphan variables. Apply now adds
`⚠ N orphaned styles not in the plan (text: 2, effect: 1) — likely from an earlier brand; nothing was deleted` to its
summary, and agents get the lists as `orphanStyles` in the apply data. Nothing is deleted.

**One rule, two readers.** The style arm of `computePrunePlan` moved out, unchanged, as `orphanStyles(fileStyles,
plannedStyles)`, and Apply calls it. A style is reported when it sits in a group the brand's plan emits, or when it
carries the engine's own description (#1577); a designer's hand-made group (`Marketing/Hero`) is not. So the note
names exactly what Prune would offer, and the issue's "add them to Prune's scope" was already true (#1570). The file
read is one helper, `localStyles()`, shared by both.

**Collisions.** The planned names are the plans as built plus the plans a collision choice wrote (#1909). A skipped
collision leaves the foreign style under the plan's own name, and a Rename writes the plan's style under a new one, so
neither reads as an orphan.

**OWNER DECISION (pending): the note's copy, and whether it names the styles.** Options: (A) a count per kind, in
the orphan-variable note's shape, as built; (B) the same, plus the first three names, as the stranded-collection note
does; (C) a count only, folded into the variable note ("orphaned variables and styles"). Recommendation A: it matches
the line beside it, and Prune's preview already names them. The copy is DRAFT.

**Tests.** `test-prune-main.ts` re-applies through the real `main.ts` after planting two text styles and one effect
style inside the brand's groups, plus one hand-made style: the summary carries the typed note with `3`, none is
removed (`main/apply reports orphan styles`). The first, clean apply names no style (`main/apply clean file, no orphan
styles`). Fails on main. Mutations: the note dropped from the summary, and the description test dropped from
`orphanStyles` (the hand-made style then counts, `4 orphaned styles`), each fail `main/apply reports orphan styles`.
`test-prune.ts` is unchanged and passes over the extracted function.
