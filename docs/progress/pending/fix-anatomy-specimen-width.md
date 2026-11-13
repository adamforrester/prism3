## (2026-11-13) — Usage panels: each anatomy example takes its width from its stage's padding, the one width Figma keeps (#3205)

The owner reviewed the usage panels after rebuilding on main. Accordion's anatomy example drew about 120px wide: "Section
title" on two lines, and the content broken inside "components". Badge's examples were described as similar. The owner
believed #3211 and #3318 had fixed this.

- **Why the earlier fix never held.** #3029, #3211 and #3318 sized each specimen with FIXED, then `resize`, then
  `minWidth`. The specimen is a layer inside its `_Doc-block` instance. This repo already measured that Figma silently
  drops a width written to such a layer (the owner's live run of 0.205.0, `style-guide-cells.ts`, `style-guide.ts`
  `sizeByPadding`), while it keeps a sizing mode and a padding. So only the FIXED held: each specimen froze at the width
  it hugged. That fits every real-file reading:
  - Dialog at 62px, FIXED, `minWidth` null (#3205, 2026-11-02);
  - Accordion at 120px, its main's own floor.

  #3318 modeled another trigger, a reset when the panel moves onto the page. That was inferred and never confirmed, and
  #3205 stayed open waiting for the real-file check. Nothing undid the fix: it never worked in Figma.
- **The fix (`apps/plugin/src/doc-panel.ts`).** No width is written to the specimen. A member shown at a width (its def
  builds the root at one, or it reads FIXED) gets a specimen that FILLs its stage. The stage's left and right padding
  then leave exactly the member's width, with the spare split evenly so the example stays centered (`fitSpecimens`).
  The stage fills its block, so its width is the panel's, and `panelLayout` already makes the panel wide enough. A
  stage still too narrow widens the panel. The fit runs after the swap, once the panel is on the page, and after the
  markers grow their left gutter. A hugging member still hugs and takes its main's floor, as every instance does.
- **The test host (`apps/plugin/test-doc-panel.ts`) now applies the measured rule.** `resize` and `minWidth` on a node
  with an instance above it do nothing and are counted (`_dropped`). The host's own writes, such as an instance
  inheriting its main's floor, go through `hostWrite`. With the rule in, current main fails 25 arms, including
  Accordion at 120 against 320 and Dialog's examples FIXED with no floor, which is what the file shows.
- **New arms:**
  - `owner/accordion`: the example is 320 wide (typed), and its title is on one line.
  - `owner/badge`: every label is on one line.
  - `collapses` now also fails a text broken inside its longest word, and any width written inside an instance.
  - `collapse/after reset` is retired. It held a floor that Figma never keeps on a nested layer.
  - The format-due arms age the panel to format 6, which is what the owner's file holds.
- **Mutations**, each after a `wip:` commit, each failing by name:
  - the old FIXED + `resize` + `minWidth` sizing restored → 25 arms;
  - the padding fit removed → 7 arms, among them `owner/accordion` (579 wide);
  - `PANEL_FORMAT` left at 6 → `format due/offered`, `format due/edited kept`, `update/redraw in place`.
- `PANEL_FORMAT` goes to 7, so Update file offers every usage panel once and redraws it.
- **Badge is not reproduced.** Its members hug, and the test host lays them out on one line both before and after this
  change. If a Badge member reads FIXED in the file, it froze the same way, and this fix covers it. A hugging Badge
  example that still wraps after the next Update has another cause. **Owed:** after an Update in the template, read
  Accordion's and Dialog's examples (320 and 560 wide, FILL, the stage's padding unequal to `STAGE_PAD`) and Badge's
  labels. Close #3205 only after that.
- `doc-panel.ts` is outside the component executor's reach, so `EXECUTOR_REVISION` stays.
