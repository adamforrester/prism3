## (2026-10-08) — Style guide tables: solid white cells with drawn row lines, every fill swatch fills its cell to the edge, only inverse text, border and icon samples sit on the inverse background (#2331)

The owner's direction after reviewing #2330's screenshots (#2331), then their review of #2336 (2026-10-08). The
plugin's main-thread drawing (`apps/plugin/src/style-guide.ts`) only; the Build style guides panel is untouched.

**The root cause the owner found in review: the tables were transparent where they read dark.** A swatch cell had no
fill, the row dividers were the grid's 2px gaps, and the table frame and its wrap had `fills = []`. On a dark canvas or
viewer the dark showed through all three. Every fix below follows from it.

**1. Nothing in a table is transparent.** Every body cell is a fixed `#FFFFFF`; the table frame and the wrap around it
too, set on every run, so a table drawn before this takes it on its next rerun. A header cell and a mark's ground keep
their own fill (the header's band; the ground a text, border or icon sample is drawn on), white only where it is not
solid. Fixed, not tokens, by the owner's call: this is the style guide's own chrome, not the brand's.

**2. The row lines are drawn, continuous across every column.** Every cell takes a 1px `#E0E0E0` bottom stroke, inside,
and the grid's gaps go to 0 (they were the dividers, 2px since 2026-09-29). Before, a text cell carried its member's own
bottom stroke and a swatch cell carried none, so the line broke at the swatch column. The radius specimen keeps its
member's fixed size inside a cell of its own (`Cell`) that fills the track, white and ruled; drawn bare, the area around
it was transparent and its column broke the line too. With no column gap the header cells now meet as one band.

**3. Every fill swatch fills its cell to the edge, with no outline.** Palette steps and semantic fills alike (display
`default` or `transparency`: backgrounds, foregrounds, interactive fills, overlays, inverse fills included), on no
ground. The instance paints the color itself, over the cell's white, and the member's own layers are hidden. A layer
inside an instance grows only by its constraints, so the square kept #2330's 8px inset; painting the instance is the
one way to reach the edge in any set, the owner's included. The `color/border/primary` hairline of the first #2331 pass
(itself replacing #2330's `border/secondary`) is gone: the cell's row lines bound the swatch. Measured live before
relying on it: the LAST paint in `fills` is on top (a frame with `[white, red]` exports `<rect fill="white"/>` then
`<rect fill="#FF0000"/>`), so a translucent color reads over white, never over the canvas. The cost: a `transparency`
role no longer shows its checker, because the checker is one of the hidden layers.

**4. Only an inverse mark sits on the inverse background** (approved, unchanged by the review). A text ("Aa"), border or
icon sample is still drawn on a ground. An INVERSE token's ground is the collection's `inverse/background/primary`,
detected by `isInverse`: an `inverse` segment anywhere in the WHOLE variable name. Every other mark keeps the ground its
role is contracted against, and never an inverse one (the page ground instead). The contrast column is unchanged.

**The cause of the owner's invisible inverse text.** The ground came from the path below the table's common prefix, and
the Inverse table's prefix is `<root>/color/inverse` itself: with a saved brand, `inverse/text/primary` resolved as
`text/primary` and drew on the white page ground, where `#F7F7F7` cannot be seen. In the shim the old branch does exactly
that with prism3's contract (M1 below), so the old code was never held on this. The NB copy has no saved brand, and
there the old fallback happened to land on the inverse ground: its visible defect was the inverse fills sitting on a
dark backdrop. `isInverse` reads the whole name, so the answer no longer depends on whether the file has a saved brand.

**A fill swatch can no longer be unbound.** The instance always takes a fill, so the "N swatches in type=X have no layer
that takes a fill" verdict now comes only from marks. Section 9 moved with it: the owner's layerless plain swatch binds
(300 fill swatches), and a text member with no text layer is the unbound case, 244 of them: 61 text roles (counted
independently in the emitted `color.light.json`) in four modes. `stretchSwatches` still repairs an old set, but a
table's fill swatch no longer shows the square it stretches.

**Live, on the NB copy** (this branch's `runStyleGuide` bundled and checksum-matched to the local build, then removed
with its tables and cell sets): Primary, Background and Inverse drew `✓ style guide: 3 tables`, and the drawn nodes
read back as section 32 asserts: 729 cells, none see-through, every one ruled `#E0E0E0` at the bottom, gaps 0/0, table
and wrap `#FFFFFF`, 70 fill swatches at FILL with the color over white and no layer showing, 568 body text cells
`#FFFFFF`. Screenshotted on Figma's light (`#F5F5F5`) and dark (`#1E1E1E`) canvas colors as a 64px backdrop. **One
consequence held for the owner:** with row lines only and no outline, a white fill (NB `background/primary`, `#FFFFFF`)
reads as an empty cell, and a near-white one (`inverse/interactive/primary/fill/rest`, `#F6F7F7`) nearly so.

**Tests** (`test-style-guide.ts`): section 32, new, over every table of both shim files (35 tables, 6,225 cells), read
off the drawn nodes: no cell is transparent; every body text cell is `#FFFFFF`; a radius specimen's own cell is
`#FFFFFF`; every table frame and wrap is `#FFFFFF`; every cell of every row in every column carries the 1px `#E0E0E0`
bottom line, with no gap; the swatch column specifically; and every fill swatch fills its cell, its color over white,
no layer showing, no outline but the row line. Section 31 (new in the first pass) holds the inverse marks. The
literal geometry in sections 2, 10, 23 and 24 drops exactly its gaps: 13 per 14-column table (26px), 4 for Dimension,
41 rows of Dimension (82px), 80 for the 81-row ramp (160px); each constant now states its arithmetic.

**Mutations,** each on a committed head through the #2272 harness (anchor asserted, mutated text present, restored in
`finally`, `git diff` empty after), against `npx tsx apps/plugin/test-style-guide.ts`. M1–M3 ran on the first pass
(`521f4d83`); M5–M10 on this one:
- M1, inverse detection dropped from the ground: `✗ 31: an inverse text sample (inverse/text/primary) sits on the inverse background (FRAME Ground on "VariableID:color:0"; want VariableID:color:144)`, the same for border and icon, and `✗ 31: with no saved brand (no contract), an inverse text sample still sits on the inverse background, detected from its whole path`.
- M2, fills drawn on a ground again: `✗ 31: an inverse fill (inverse/background/primary) fills its cell as its own swatch, on no backdrop (FRAME Ground on "VariableID:color:144")`, with `✗ 5: a fill row's swatch fills its cell, on no ground (#2331)`.
- M3, the detection widened to every border: `✗ 31: a non-inverse border sample (border/primary) sits on the page ground, not the inverse one (FRAME Ground on "VariableID:color:144")`.
- M5, a cell's white fill removed: `✗ 32: no cell in any table is transparent: each has a solid fill (35 tables, 6225 cells; 83 see-through: Dimension r1 c1 INSTANCE display=filled; …)` and `✗ 32: a radius specimen's own cell is #FFFFFF (10)`.
- M6, the swatch's white underlay dropped: `✗ 32: every fill swatch fills its cell to the edge, the color over white, … (584 swatches, 416 semantic; 584 not: …)`.
- M7, the table frame transparent again: `✗ 32: every table frame and the wrap around it are #FFFFFF (35 not: …)`.
- M8, the swatch's row line dropped: `✗ 32: every row line runs across every column … (584 breaks: Core — base r1 c1; …)` and `✗ 32: the row lines span the swatch column, the one that broke them (20 of 20 unruled)`.
- M9, the 2px gap back: `✗ 5: no table's grid has a gap between its rows or its columns …`, `✗ 32: every row line runs across every column … (35 breaks: … gaps 2/2; …)`, and the literal-geometry arms of 2, 10, 23 and 24.
- M10, the member's layers left showing: `✗ 32: every fill swatch fills its cell to the edge … (584 not: …)` and `✗ 11: a replaced table with a swatch layer shown, nothing else by hand is kept, reported as edited`. Its first run crashed rather than failing by name: section 11's edit threw when the layer was not already hidden, which ended the suite before section 32. The throw is gone; the edit now simply changes nothing under M10, and both arms fail by name.
