## (2026-10-07) — Style guide tables: font-size rows fit their specimens, palette swatches fill their cells with an edge, tables drawn from their own page no longer stack, "1 table skipped" (#2267, #2268, #2269, #2261; #2270 ruled out)

For the owner's client showing (2026-10-08). The plugin's main-thread drawing (`apps/plugin/src/style-guide.ts`,
`style-guide-cells.ts`); the Build style guides panel and the old Style guide page are untouched. Each defect was
reproduced live on the NB copy ("NB Stance Design System (Copy)") with `main`'s code, run from a bundle of the plugin's
own `runStyleGuide` loaded through the Desktop Bridge, then redrawn with the fix; every table and set added was removed.

**#2267, font-size rows.** A font-size specimen bound only `fontSize`, and the text cell's text keeps a fixed 20px line,
so a 128px specimen drew a 20px box and its glyphs spilled over the rows around it (measured live: 128px at a 20px line
is a 20px box; at `AUTO`, 155px). Real Figma grows a HUG grid row to its tallest FILL cell, so the row was never the
problem. Fix: a font-size specimen takes `lineHeight: AUTO`. Live: the type-sets table went from 774px to 1376px tall,
no overlap. (The text-style table binds the whole style, its own line height included, and is unchanged.)

**#2268, palette swatches** (owner calls 2026-10-07: fill the cell; edge `color.border.secondary`, 3.28:1 on white).
The swatch set's `type=default` is a 48px member with a 32px `Specimen` at 8, 8, pinned top-left: the table FILLs the
instance to its cell (decision 13), but a layer grows inside an instance only by its constraints, so the square stayed
32px in the top-left corner. Fixes:
- Set up file builds the default, border and transparency squares (and the checker) to `STRETCH` and marks the set
  `prism3-swatches`.
- `stretchSwatches`: a run that draws a palette table brings a set Prism3 built before this up to date in place, a set
  marked, or one still exactly this builder's geometry (owner call: the run repairs its own set). A set the owner made is
  never changed.
- Each palette swatch's square is stroked with the file's `<root>/color/border/secondary`, bound, the row's own root
  first; a border-display swatch keeps its own stroke.

Live: the old, unmarked set on the copy was repaired by the run (squares `STRETCH`, marked), and 025 and 050 read as
outlined squares filling their cells.

**#2269, tables stacked.** The host adds a new frame to the CURRENT page at once, 100 × 100 at 0, 0. The run created the
table frame, tagged it, and only then measured where it goes, so on the page being drawn (where a designer usually is)
it counted itself: every new category's row anchored on that fresh frame, at 260, 0. A filtered run does not re-flow, so
the tables stayed on top of each other. Live, from the Primitive tokens page with `main`'s code: Font size (type-sets) and
Container both drew at 260, 0 over Primary (the owner's report). The #2161 probe, and this lane's first live pass, ran
with another page current, which is why neither saw it. Fix: measure before `createFrame`. The comment above the old
measurement already said "Measured BEFORE the new frame joins the page" (docs/34 shape 20: the intent, not the code).
The shim's `createFrame` now joins a test's current page the same way.

Found on the way and filed, not fixed (one concern per PR): **#2327**, a filtered run that creates two rows pushes the
second down twice (a gap of the first row's height; no overlap).

**#2261.** Both skip parts of the summary now use the summary's own plural (`1 table skipped — …`); owner call 2026-10-07.

**#2270, ruled out.** The panel posts exactly the selected tables' keys (`drawOptions`, held by `test-style-guides.ts`),
the run's filter draws exactly those (`narrow`, section 13), and live a filtered run of three palettes drew exactly
three. The panel's Kinds no longer filter anything (they choose which option groups show). The extra tables in the
owner's file most likely came from another run and were then stacked by #2269; that cannot be confirmed from here.

**Tests:** `test-style-guide.ts` section 30, an arm per fix. **Mutations**, each on the committed head through the #2272
harness (anchor asserted, mutated text present, restored in `finally`, `git diff` empty after), each failing exactly its
own arm:
- the AUTO line height dropped: `✗ 30 #2267: every font-size specimen takes the font's own line height (AUTO), so its row grows to fit it (2 table(s), 64 specimen(s), 64 fixed: null)`;
- the squares not built to stretch: `✗ 30 #2268: Set up file builds the filled, border and transparency squares to stretch with the swatch, and marks the set Prism3's (   ; mark "1")`;
- the repair a no-op: `✗ 30 #2268: a run brings a set Prism3 built before this up to date: its squares stretch, and it is marked (null null null null)`;
- the owner-set guard removed: `✗ 30 #2268: a swatch set the owner made is left as it is: nothing stretched, no mark ({"horizontal":"STRETCH",…})`;
- the edge binding removed: `✗ 30 #2268: every palette swatch's edge is bound to pds3/color/border/secondary (168 swatches, 168 not: type=default null)`;
- one skip back to "tables": `✗ 30 #2261: one table skipped for missing cell sets reads "1 table skipped" (1 tables skipped — …)`;
- the measurement back after `createFrame`: `✗ 30 #2269: drawn from its own page, a filtered run of two categories lays its tables apart, the first at the page's origin (Dimension 260,0 … | Font family 260,0 … — overlap: Dimension × Font family, …)`, the live 260, 0 exactly.

**Trap for whoever re-verifies:** reproduce #2269 with the target page CURRENT. With any other page current it does not
show, live or in the shim.
