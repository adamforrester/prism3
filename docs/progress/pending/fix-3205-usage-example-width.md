## (2026-10-31) — Usage panels: no example narrower than its component declares (#3205)

The owner found Dialog's Anatomy example about 60px wide in the template file, its title, supporting text and content
one letter per line and the callouts running down the column.

- **The cause.** The Specimen block's placeholder is a Badge, which hugs, and the swap keeps that hug. #3029 fixed
  Banner by reading the member's own sizing: a member that reads FIXED gets a fixed specimen at its width, one that reads
  HUG hugs. That makes the specimen's width depend on one read of the member. If the read says HUG, or anything sets
  the instance back to hug, a member built at a width lays out at its narrowest. Dialog's is about 40px in the test
  host and about 60px in the file: the close button plus a letter. **Not reproduced from a real file.** Both test hosts
  read Dialog's members as FIXED and draw 560. The test host shows the symptom only when the specimen hugs, and the
  owner's 60px matches that, so the hug is inferred. Why the file's specimen hugged is not established. One lead:
  Banner carries a bound `min-width` that every instance inherits, and Dialog has no floor, so a hugging Banner
  specimen would not have collapsed and a hugging Dialog one would.
- **One rule (`exampleFloor`), read off the def, never off the member's reported sizing.** A def that builds its root
  at a width (`placementWidth`, or `builtSize` naming the member's value) gets a fixed specimen at its member's width,
  plus that width as the specimen's `minWidth`, so a later reset to hug cannot collapse it. A def with a literal root
  `minWidth` gets that floor on a hugging specimen. Any other member is handled as before.
- **The audit**, every lead's panel in the test host with the specimen left hugging (the collapse): 19 defs have an
  example under the width their def builds at, 81 examples in all. Each one is a def that builds its root at a width:
  the fields, rows, Select, Accordion, List, Segmented control, Dialog, Toast, Pagination's built-width member,
  Progress, Banner and Slider. The table is in the PR. With the rule, none collapses.
- **The gate** (`test-doc-panel.ts`): `collapse/<def>` for every lead fails by name when an example is narrower than
  its member's built width or literal floor, or a wrapping text box is narrower than 4em and does not hold its text on
  one line. The oracle reads the projection's own root (`placementWidth`, `minWidth`), kept on each member when the
  test host builds it, never the panel. `collapse/hug read`: Dialog's members read as hugging, and the examples are
  still 560. `update/redraw in place`: a Dialog panel the executor built, aged to the earlier format with its examples
  collapsed, is due, and one Update redraws it where it was, not kept as "(edited)". The test host now applies
  `minWidth` as Figma does and copies a main's floor onto its instances.
- **Mutations**, each failing by name: the specimen left hugging → `collapse/dialog` (40px against 560) and 18 other
  `collapse/<def>`, plus `width/banner`, `width/checkbox-row`, `collapse/hug read`, `update/redraw in place`; the rule
  dropped (back to the reported sizing) → `collapse/hug read`; `PANEL_FORMAT` not raised → `update/redraw in place`.
- `PANEL_FORMAT` goes to 5, so every drawn panel redraws once on the next Update. An unedited panel is replaced in
  place, and an edited one is kept as "(edited)", as before.
- Not in scope: whether the template file holds every component and its usage guide. The owner checks that in the file.
