## (2026-11-19) — The guides and READMEs say what the UI does; Undo load never restores the boot provenance (#4194, #4215, #4191 T6)

The owner approved #4194's rows (guides and READMEs against the UI) and #4215 (Undo load) as recommended.

### Guides
- **Update a Figma file** names the **Can't update yet** and **Kept edits** groups, the Keep choice in the dialog's
  words, the library-changes button, the **Already in this file** dialog with Skip, Rename, Apply to all and Apply,
  the busy line's *Name*, and next steps where a row had none. "Calmly" is gone.
- **Write the theme** lists the blur and text-spacing collections and names the collision dialog.
- **Export tokens** adds Export › **Component specs**; "CI" is spelled out as Prism3's automated tests.
- **Features** gives `export_theme` its full row; **index** says which text is checked without token paths.
- **Theme a brand** describes the preview's mode row as it is drawn (#4191 T6), says the reload line in one sentence,
  and adds **Undo load** to the brand-menu section (#4215 item 2).
- "the studio" is **Studio** in every guide, as #4184 names the product.

### A gate for the omission class
`lint-guide-claims.ts` gains **GROUPS**: every group the Update file dialog draws (`inset('update-group-…',
UPDATE_COPY.<key>)` in `shell/update-file.ts`, titled from `state/update-file.ts`) must be named bold or as a heading
in `update-a-file-safely.md`. The label check could only hold what a guide says, never what it leaves out. Against
main's guide it names the two missing groups. Its first bold matcher (`[^*]+`) paired the `**` of a label holding
`*N*` with the next label's, so it passed or failed by the parity of earlier labels; it is non-greedy now.
GROUPS also holds the guide's "in this order" table to the order the dialog draws the groups, because presence
alone let the new **Can't update yet** row sit below **Usage panels**, which the dialog draws after it (review
follow-up). The row now sits under **Components › Due**, and it and **Kept edits** carry the **Components ›** prefix
their sibling rows have, since both groups draw inside Components.

### READMEs
The root README says **Studio**, and TokenPress exports variables, text, effect and gradient paint styles. The engine
README drops "(prototype)", the two-brand count and the color-only Figma claim, and names the reference brand by its
role. The Studio and plugin READMEs say "web Studio", "Docs" and "settings"; the plugin README's #108 scope note links
to what the theme writes today.

### Undo load (#4215 item 1)
`restoreInput` puts back a fresh frozen copy when the stash holds the boot provenance, so `provenance === bootProvenance`
keeps meaning "nothing chosen" (#1197). `test-store.ts`'s `#4215` arm fails on main.
