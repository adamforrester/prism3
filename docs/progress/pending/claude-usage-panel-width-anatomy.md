## (2026-10-26) — Usage panels: specimens at their own width, a family as one component, markers on their parts (#2970, #2916)

Items 1 and 4 of the owner's first usage-panel QA round, after the owner chose A on Q1–Q5 (2026-10-24), and the anatomy
marker gate #2916 asked for. One PR: the width rule and the family title both reshape the same panel, and the marker
gate reads the same specimens.

- **Why Banner went one letter per line.** The Specimen block's placeholder is a Badge instance, which hugs. The swap to
  the documented member kept that hug, so a member built at a width (Banner 480, Checkbox.Row 320) hugged its content,
  and its fill-width text collapsed to its narrowest. The draw now gives a fixed member's specimen that member's width
  and a hugging member's specimen hug. **Not confirmed in a real file**: the test host now keeps the placeholder's
  sizing through a swap and reproduces both reported symptoms (Banner's "Title" at 24px, the Row's label at 12px); that
  Figma does the same is inferred from the symptoms matching.
- **The width rule (`panelLayout`).** Each anatomy specimen's stage is its member's width plus the stage padding, with
  room on the left for each bracket tier. Tiers are counted from the member's own layers, the way the draw assigns them:
  stacked siblings share a tier, nested or side-by-side brackets do not. Theming adds twice the default stage plus
  16px, unless that makes the panel 960 or wider; then the modes stack. The panel is the widest of these plus its
  padding, and never under 560. Banner's comes to 657 and the Row's to 800 (the Row's Theming row sits side by side).
  Q2's worked example has Button.Group's row at exactly 960 and stacked, so the threshold reads "960 or wider".
- **One number for every reader.** The rule reads the set alone, so Build's `seatNewSet`, the dry run's
  `pageSetMoves` and the apply's re-spacing take the same reach per set (`docPanelReaches`). A drawn panel narrower than
  the rule now gives (a member built wider) is reserved at the new width, and the spec column past the wider of the two.
  The panel records the width it was drawn for, so a member resized since makes it due. The draw still measures the
  real Badge and widens further if a gutter needs it (two-digit markers wider than the 24px it allows); then Update
  spaces by the drawn panel's own box.
- **A family as one component.** The title is the taxonomy page's name and the lede the lead's summary (Q3 A). "In
  this family" is a bulleted Field like Related: the lead first, then the page's order, each part by its name less the
  page's ("Row"), a colon, and its summary's first sentence, the name linked to its set (Q4 A). In Related, a member
  reads as its family, linked to the lead's set, once per list, and the panel's own family is dropped (Q5 A), so
  Checkbox loses "Built from" altogether, as the wireframe drew it. Who is listed and in what order was not part of
  Q1–Q5: posted on #2970 as Q6, with the build following its A (rec).
- **Markers (#2916).** The fix itself landed in #2932; this adds the gate the issue asked for. The oracle now checks
  containment: a leader's tip inside its part's box at the part's middle, a bracket exactly its part's height with both
  ticks ending inside it, and the root always bracketed. Breadcrumbs is pinned by hand: six entries, the `items` slot's
  among them, numbers 1–6 drawn on two specimens. A specimen squeezed narrower than its member, or wider than a 560
  stage, also put parts where no marker could follow; the width rule removes that cause.
- **Mutations**, each failing by name: the width forced to 560; the specimen not sized; a slot part's marker placed
  against its slot; marker 1 dropped; the own-family drop removed; the de-duplication removed.
- `PANEL_FORMAT` goes to 4, so every drawn panel redraws once. An unedited panel is replaced and an edited one kept as
  "(edited)", as before (#2956).
