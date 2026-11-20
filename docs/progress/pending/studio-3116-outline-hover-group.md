## (2026-11-19) — Outline and text button hover colors sit under Fill, and the method is two short choices (#3116)

**What.** Color › Interactive, in Studio and the plugin (one shell), built as the owner decided on #3116 (2026-11-19, all
A) from the wireframe in `docs/superpowers/3116-button-interactive-colors-wireframe.html`. This changes the layout only.
The levers, tokens and writes stay the same, and nothing in the engine changes.
- **Q3116.3 A.** Every button set's card has one "Outline & text hover" group, directly under Fill, under every method.
  It uses the card's standard rows: Rest, then Hover and Pressed inset under it. Outline and text buttons have no fill at
  rest, so Rest reads "No fill at rest", with no picker and no token line (a mono line under a label is always a
  token path, QA-B2). Under Solid fill, Hover and Pressed use the card's own step picker
  ("Auto · ‹step›" with its ratio) on the set's `hover-fill` roles. Pressed follows Hover until Hover is picked, as
  before, and the worst-label line follows. Under a wash, the same rows read out the wash's roles, and a line says the
  wash and its opacity change in Interactive settings. Under No hover fill, the group is one line. The separate "Overlay
  wash" and "Tinted wash" groups, which sat seventh in the card, are gone.
- **Q3116.1 A.** Only the fill is customizable there. The label and border keep their shared rows in Text and Border.
- **Q3116.2 A.** The four method chips are now "Hover fill" (Wash · Solid · None), then "Wash color" (Neutral · Tinted),
  drawn only under Wash. The pair writes the same four `outlineInteraction` values. Going from Solid or None back to Wash
  returns to the wash color last shown in the session (the neutral wash on a fresh page). All new labels and lines are
  DRAFT.

**How.** `rowsInGroups` (`apps/studio/src/domains/color-interactive.ts`) no longer draws the wash rows from the row
registry, so `interactiveRowsFor` and its test stay as they were. It draws the hover group itself right after Fill.
`rowOf` gained a Solid fill variant: its pick writes `outlineHoverFill.<mode>.sets.<set>` through the existing
`setOutlineHoverSetStep`, and it offers every palette, the one it holds first, as #3071's select did. The two-select
`setHoverFill` and the `.p3-ihover` search paths are gone.

**Tests.** The new chrome section `3116` replaces `3335`'s no-rest-row arm, which Q3116.3 A supersedes. It runs on both
hosts, both themes, at 1280 and 380, in every built-in set, under each method picked through the new chips. It checks
that the group under Fill is "Outline & text hover", drawn once, with no old wash group. It checks that Rest reads "No fill at rest",
that Hover and Pressed show the method's role family as pickers or read-outs, and that they sit inset under Rest at one
level. Under No hover fill it checks the single line. Main's build fails the section (192 named failures). Mutation:
drawing the group after Border · inverse fails it by name (`3116 web light 1280 / Neutral wash / primary: the group under
Fill is "Outline & text hover" (it is "Fill · inverse")…`). Section 19's Solid fill arm now drives the step picker.
Section 3115 now holds the two choices: one row each whatever is picked, Wash color only under a wash, and the pair
writing the right method. The heading audit and test-smoke's chip check follow the new labels. The smoke check reaches
every manifest value of `outlineInteraction` through a typed pair map. Smoke's wash-row arm reads the Pressed row inset
beside Hover under the group's Rest. Its registered tag moves from #3335 to #3116 in `test-arms.txt`, retired on
purpose because Q3116.3 A supersedes the side-by-side rule. QA-B2's "a name with no token under it" check allows the
three Rest rows by name, beside the contrast floor row.

**Follow-up filed.** Q3105.1 A: the pressed contrast check covers Solid fill only, as built. The washes are #4159.
