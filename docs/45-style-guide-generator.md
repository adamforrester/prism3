# 45 — The style-guide generator

**Status:** phase 1 (color) built in `apps/plugin/src/style-guide.ts` + `style-guide-cells.ts`, with the tables filter and host yielding of #1778; phases 2–3 specified here, not built.
**Issue:** #259. **Why a plugin feature, not a separate tool:** `docs/09` §4 — the tables document the variables a theme write left in *this* file, so they read `figma.variables` rather than the engine's emission, and they live where the designer already works.

This is the design record for every phase. Section 2 holds the owner's decisions, verbatim in substance and closed. Anything this document adds beyond them is marked **proposed, owner to confirm**. The list of those items is §8.

---

## 1. What it is

The generator draws one table per token group onto the file's token pages, built from instances of three cell component sets. The tables are *documentation of the file*: every specimen is bound to the variable it shows, so a changed value repaints the specimen with no rerun, and a rerun refreshes the static text (values, aliases, contrast) and reports what moved.

Two halves, the shape every executor in the plugin takes:

- **`planStyleGuide(catalog, contract, options)`**: pure. Collections, variables and the engine's contrast contract go in. A list of tables comes out: page, title, columns, rows in order, and per mode the value, alias, ground and measured contrast. It is tested with no host.
- **`runStyleGuide(api, contract, options, run)`**: the executor. It writes the plan from the cell sets and never throws for a missing optional piece. No page, no cell set, no header set and an unloadable font are each a named skip. It draws one table at a time and yields to the host between them (§6, "Sharing the host's thread"); `run` carries the caller's `yieldTo` and `onProgress`, which never cross the bridge.

It is driven from the panel (the **Style guide** step) and from the agent link (`style-guide {collections?, types?, tables?, valueFormat?, header?, display?, aliases?, description?}`).

**Options.** Every one is optional, so `{}` draws every color table.

| Option | What it does |
|---|---|
| `collections` | Collection names, in any case. Absent: every collection. |
| `types` | Token types. Absent: every type this phase draws (`color`). A later-phase type is named in the report. |
| `tables` | Table titles as drawn ("Primary — nbds") or keys, in any case (#1778). Absent: every table. A name that matches no table is reported by name with the titles the run can draw, and the run is not a pass. A filtered run covers only the tables it draws (§6). In the panel: *Customize* → *Tables*, one title a line, or several on one line separated by commas; a field with a line break splits on line breaks only, so a title with a comma in it goes on a line of its own. The agent link refuses an empty list, an empty name and a name of spaces alone as `bad-args`. |
| `valueFormat` | `hex` (default), `rgba`, `hsl` or `hsb`. |
| `header` | The header row's fill: `dark` (default) or `light`. |
| `display` | The specimen: `auto` (default, from each token's role), or one swatch type for every row. |
| `aliases` | Each value's alias chip. Default on. |
| `description` | The description column. Default on. |

## 2. Decided (2026-09-28, #259): the style-guide generator's coverage, layout, contrast column, rerun and cell components

The owner's decisions, 2026-09-27/28, recorded on #259. These are closed.

1. **Coverage: every variable collection.** PRIMITIVE collections (raw palette, space scale, …) render on `↳ Primitive tokens`, SEMANTIC roles (text, background, border, icon, …) on `↳ Semantic tokens`. The pages are found through `file-taxonomy.ts`. A missing page is a skip, reported; pages are never created.
2. **Modes side by side.** One row per token; one specimen + value column per mode. Each mode column's swatch pins its mode with `setExplicitVariableModeForCollection`, so the swatch stays bound to the variable and live. Value text is static, refreshed on regenerate.
3. **A header per table.** Each table opens with a `_Section-header` instance at Size=Medium, carrying a title and a one-line description. `page-header.ts` places one per page; this places one per table.
4. **Columns vary per type over a shared core:** name · specimen + value per mode · alias (a chip) · description (from metadata). For **color**, a measured contrast ratio per mode against the role's intended ground, marked pass/fail against the floor the engine contracts for it. Ground and floor come from the engine's contract (`modes.ts`), never from description prose. A role with no contracted ground reads "—".
5. **Rerun updates in place.** A table is found by a stable key in plugin data and is never duplicated. The report lists tokens added, removed and with new values.
6. **Cell components live on `↳ File Components`** (Sandbox), built by Set up file next to `_Section-header` and `_Headings`, on the owner's existing cell design (§3). A file that already has these sets **anywhere**, in any case, adopts them in place. The owner's test file keeps them on "Style Guide Components". They are never moved or rebuilt.
7. **Sample text is "Abc 123".** Changeable (`SAMPLE_TEXT` in `style-guide-cells.ts`).
8. **UI.** A "Style guide" step after Apply theme. Per-type options fold away under *Customize*. The display style is chosen automatically from the token's role, with the owner's dropdown values kept as overrides. An agent-link command drives it live.
9. **Superseded tables are deleted when unedited** (2026-09-28: "Yes, delete superseded tables if unedited"). A table the generator wrote that a rerun no longer draws is deleted, with its header and cells, when nothing has changed since the generator last wrote it. A table a designer touched is left in place and reported with what was done to it. A frame without the generator's marker is never deleted, whatever its name. **A table drawn before fingerprints existed is never deleted by the generator** (2026-09-28): the owner deletes those by hand, and the report says so. The mechanism is in §6.

### Decided (2026-09-29, #259): each table's header spans its table, and its grid hugs and reflows like the owner's examples

The owner's decisions, 2026-09-29. These are closed.

10. **The header matches its table's width, not the page.** The `_Section-header` instance FILLs the table's wrapper, and the wrapper hugs the grid. Before this, the header kept its component's page width (2,517px in the owner's file), so every table frame was 2,517px wide around a 732px grid.
11. **The grid behaves like the owner's legacy examples** ("↳ Style Guide Examples", measured live, 2026-09-29, e.g. "color - light Style Guide"), so a designer can drag a table wider and the whole table reflows:
    - every column and row track is HUG, and the grid hugs its tracks both ways;
    - every text cell FILLs its track on both axes;
    - every text hugs its words on one line (`WIDTH_AND_HEIGHT`) and never wraps or truncates, so the description column is its longest line (417 and 577px in the owner's two examples);
    - a track takes its widest cell's content. The owner's legacy cells report widths like 117, 83 and 142px inside HUG tracks.

    This supersedes #1749's FIXED column widths, the 360px description cap and the wrap-by-FILL path (§6 keeps their history).
12. **A 2px gap between tracks,** rows and columns alike (`gridRowGap = gridColumnGap = 2`), as in the owner's examples. This replaces the 0 this build first proposed.
13. **The specimen depends on the token's role, and a ground appears only where the specimen must sit on something** (clarified by the owner, 2026-09-29: "The palettes do not need this. We could do this for fills though. Text should be letters that can sit on a BG, and borders are shapes with strokes that can sit on a BG, etc."). Every specimen is a `_style-guide-swatches` instance at its component's fixed size, FIXED on both axes, never stretched to its cell, as in the owner's examples. By row:
    - **Primitive (palette) tables:** the swatch sits directly in the cell, with no ground frame: `type=default`, its fill bound to the step. An alpha palette draws `type=transparency` the same way, with no ground, because its checkerboard is what shows the alpha.
    - **Fill roles** (backgrounds, surfaces, interactive fills and the like): `type=default`, its fill bound, on the contracted ground.
    - **Text roles:** letters, the `type=text` member ("Aa"), their fill bound to the token, on the contracted ground. No filled square.
    - **Border roles:** the `type=border` member, an outlined shape with its stroke bound, on the ground.
    - **Icon roles:** the `type=icon` member, its glyph's fill bound, on the ground.
    - **Translucent roles** (scrim, veil, the interactive overlays, a translucent field fill): `type=transparency`, the checkerboard under the bound fill, **on** the ground. The ground is kept because the contrast column measures the wash composited over that ground (or the ink over that composite), so the specimen shows the same thing the number measures.

    The role is read by the existing classification, not a second one: the display chosen automatically from the token's name (decision 8, `autoDisplay`), with the Display dropdown as the override. The ground is the variable the contrast column measures against, so the specimen and its number always share one ground. Roles the classification places ambiguously are listed in §8.
14. **A second run is refused** (2026-09-29, #1785). One style-guide run at a time per plugin session, across the panel and the agent link. A second request is refused, not queued, with the headline "✗ already drawing" (§6). Since #1957 the refusal is the plugin's run guard's, which is not a verdict and carries that guard's words ("Style guide is already running. Try again when it finishes."), so "✗ already drawing" is not shown; the owner kept the guard's words (2026-10-05, Q18 a, PR #1784).

**Defects of the owner's earlier plugin, fixed rather than copied:**
- Every specimen was drawn on white, so inverse text (#F7F7F7) and white `on-*` icons were invisible. Each specimen is now drawn on its intended ground, the same variable the contrast column measures against.
- Rows sorted as text (10, 11, 112, 12). Primitive steps now sort numerically.
- Tables had no title. Each table now has a header (decision 3).

## 3. The cell design

The axes and values are the owner's, measured live in their test file. The pixel values are this build's reading of it (**proposed, owner to confirm**).

| Set | Axes | What each member draws |
|---|---|---|
| `_style-guide-swatches` | `type = default \| text \| icon \| border \| transparency \| radius` | default: a filled 32px square with a 1px hairline. text: "Aa", 24px bold. icon: a 22px square turned 45°. border: an outlined square, 2px inside stroke. transparency: a 4×4 checkerboard under the fill. radius: one 16px rounded corner. The bindable node is named `Specimen`; an adopted set with its own names is read by type (the first text node, stroked node or filled node). |
| `_style-guide-text-cells` | `color = white \| secondary \| dark` × `textAlign = center \| left` × `type = default \| header \| alias \| value alias` × `padding = default \| extra right`, 12 members | default: body text. header: a table header, dark or light. alias: a link-icon chip with the path. value alias: a value plus the chip. Text sits in a node named `Text`, the chip's path in one named `Alias`. |
| `_style-guide-spacing-cells` | `display = filled \| line` | A spacing bar or a bracket. Phase 2 reads it. |

**Adoption reads by property, not position.** A member is found by its `key=value` variant name in any case (`pickVariant`). `type` must match, since a header cell is never a body cell; the other axes are preferences. An approximated member is named in the verdict ("no exact type=value alias, color=white variant — used …").

**The specimen's ground** is a frame wrapped around the swatch instance on a semantic row, filled by binding the ground variable and pinned to the same mode. That is what makes an inverse specimen legible. A palette row has no ground (decision 13). A role with no contracted ground is drawn on the page surface: `background.primary`, or `inverse.background.primary` for an inverse role (**proposed, owner to confirm**).

## 4. Per-type column specs

The shared core is Token · [specimen · value (+ alias chip)] per mode · Description. Counts are the engine's prism3 emission, by DTCG `$type`.

| Type | Count | Page | Specimen | Value | Type-specific column | Phase |
|---|---|---|---|---|---|---|
| color | 388 | primitive: Primitive tokens (one table per palette, as a scale); semantic: Semantic tokens (one per family) | swatch by role: text "Aa", icon diamond, border outline, translucent checkerboard, else filled; on its ground | Hex / RGB-A / HSL / HSB; translucent carries alpha | **Contrast** per mode, semantic only: `4.52:1 — clears the 4.5:1 floor` + the ground on a second line. An ink-on-wash role measures its `legibleFor` ink over the composite. "—" with no contracted ground. | **1 (built)** |
| dimension | 180 | space/size scales: Primitive; spacing and radius roles: Semantic | spacing cell (filled bar or bracket) at the value's width; radius swatch for radii | px, and REM at a 16px base (toggles) | — | 2 |
| typography (text styles) | 39 | Semantic tokens | the style's own sample, "Abc 123" set in it | family · weight · size / line height · letter spacing, px and REM | paragraph spacing and text decoration (toggles, the owner's options) | 2 |
| fontFamily | 9 | Primitive | "Abc 123" in the family | family name | — | 2 |
| fontWeight | 10 | Primitive | "Abc 123" at the weight | numeric weight + style name | — | 2 |
| number | 31 | by collection | none, or the scale's bar where it is a ratio | the number | the unit the name implies (line-height ratio, opacity %) — **proposed** | 2 (line heights, letter spacing) / 3 (the rest) |
| shadow | 7 | Semantic | a card with the effect style applied | offset · blur · spread · color | — | 3 |
| gradient (paint styles) | — | Semantic | a swatch filled with the style | stops, as values with their aliases | — | 3 |
| duration | 24 | Semantic | none (**proposed**: a bar at the duration's length) | ms | — | 3 |
| cubicBezier | 10 | Semantic | the curve, drawn on a unit square — **proposed** | the four control points | — | 3 |
| transition | 4 | Semantic | none | duration · easing, each an alias chip | — | 3 |
| spring | 3 | Semantic | none | stiffness · damping · mass | — | 3 |
| strokeStyle | 1 | Semantic | a line in the style | the dash pattern | — | 3 |
| opacity | (within number) | Semantic | the transparency swatch at that opacity | % | — | 3 |
| border width | (within dimension) | Semantic | a line at the width | px | — | 3 |
| breakpoints / grid styles | — | Grids & layouts, if mapped; else Semantic | the grid style applied to a frame | columns · gutter · margin | — | 3 |
| icon sizes | (within dimension) | Semantic | the icon glyph at the size | px | — | 3 |

## 5. Phase plan

1. **Color (this PR).** Every color collection; primitives as scales, semantic roles by family; contrast per mode; Set up file builds or adopts the cells; panel step and agent command.
2. **Dimension + typography.** Font variables (family, size, weight, letter spacing, line height) and text styles; the owner's REM/pixel options; the spacing cell set, already built in phase 1, goes into use.
3. **The rest.** Shadow, gradient, motion (duration, easing, transition, spring), opacity, border width, breakpoints/grids and icon sizes.

`PHASE_TYPES` in `style-guide.ts` names what the current phase draws. A type asked for outside it is reported ("dimension: not in this phase — color only"), never silently dropped.

## 6. How phase 1 decides

- **Primitive or semantic.** A collection is primitive when no variable in it aliases another in any mode (**proposed, owner to confirm**). It carries no contrast column, since a primitive has no contracted ground.
- **Grouping.** Primitive: by parent path, one table per palette, titled by the palette ("Primary", "Black alpha"). A value at the collection's shared prefix goes into "<Collection> — base". A single-group collection takes the collection's name. Semantic: by family, the first segment after the shared prefix ("Text", "Inverse").
- **More than one root.** A collection can hold the same tree under two roots (the owner's test file: `nbds/color/…` and `pds3/color/…` in one `color` collection). Nothing is shared across the roots, but a prefix is shared below each root's first segment. Such a collection groups within each root, and every title names its root: "Text — nbds", "Primary — nbds", "Core — nbds base". A one-root collection's titles name no root. A role's ground is looked up in its own root first.
- **Row names.** A palette row is its step alone ("025"): the title already names the palette and root, and the bound swatch reveals the variable, so the full path is not repeated (**proposed, owner to confirm**). A role is named inside its family ("primary" in Text, "text/primary" in Inverse).
- **Order.** Primitive rows use ramp order: named values (`white`, `black`, `transparent`) first, in the file's order, then numeric steps ascending (`5, 50, 100, 900`; `025` before `050`). Semantic rows keep the file's order, which is the engine's emission order.
- **Column widths: HUG tracks and FILL cells** (decision 11, 2026-09-29). The grid's column and row tracks are all HUG, assigned as whole arrays and read back; a grid that did not keep them is named in the verdict. Every cell FILLs its track on both axes: a text cell is first fitted to hug its words, with truncation off and nothing wrapped, and the track then takes the widest cell's content. On a semantic row the specimen's ground frame is the cell and FILLs its track, so the ground reaches the cell's edges however wide the column grows; the swatch inside it stays FIXED at its component's size. On a palette row the swatch itself is the cell, FIXED at its size, so a palette row is 48px tall where a role's is 72 (decision 13). The tracks sit 2px apart both ways (decision 12). So:
  - A header never wraps, and a swatch column is still the wider of the specimen (48 + 16 + 16 = 80) and its mode header: "hc-light" makes it 88.
  - The description column is its longest line: 630 + 16 + 16 = 662px for prism3's longest description, 90 characters.
  - A table's width is its tracks plus 2px between each pair: the owner-cell Text table's fourteen tracks are 2,828px, and with thirteen gaps the table is 2,854px.
  - What a designer's drag does is host-unverified (§7). A FILL cell is as wide as its track either way. Whether the HUG tracks take up a dragged grid's extra width at all is not known: the typings define HUG as CSS `fit-content(100%)`, which does not grow past its content.
- **Column widths, as #1749 built them (superseded 2026-09-29, kept for the record).** Every cell was measured hugging its words; each column was FIXED at its widest cell; then every cell was set to its column's width, and a text wrapped only when its words did not fit, to the column less the cell's padding. The description column stopped at 360px including padding (text wrapping at 328). A text wrapped by FILL, not by resize: on a text inside an instance, FIXED + HEIGHT + `resize(296, h)` was ignored in every order tried (third live run, plugin at `ec4512f8`), and the text kept its main component's width, 29px, one word a line. Before the measure-then-fix order, a description was wrapped before its column had a width, and the Inverse tables ran to 51,000px. The owner's grid model (decision 11) removes the wrap: nothing wraps, so none of this is needed.
- **The header's width** (decision 10). After the grid is drawn, the header instance is set to FILL the wrapper, which hugs the grid. FIXED at the grid's width is the fallback where the host refuses FILL. It is set on every run, so a table from an earlier build takes it on its next rerun. A wrapper that is not the grid's width afterwards is named in the verdict.
- **Contrast.** The contract comes from the brand saved in the file (`restoreInput` → `resolveAllModes(brandTheme(input))`). With no saved brand the column reads "—" and the verdict says Apply theme saves one (**proposed, owner to confirm**). The ratio is floored to two places, so 4.499 never reads "4.50" beside a 4.5 floor.
- **Placement.** A new table goes 160px below the page's lowest content, left-aligned to it (**proposed**). Where the generator put each table is recorded in its plugin data (`prism3-style-guide-at`). After every run, the generator's tables on each page it drew on are re-stacked in their order, 160px apart, so a table that grew pushes the rest down. On the owner's rerun, "Primary — nbds" grew to y ≈ 10,400 while "Neutral — nbds" still started at 3,585. A table whose position differs from its record has been moved by a designer: it stays where they put it and is left out of the stack. A table from before the record (an earlier build's) is re-flowed while it keeps the stack's x, and is taken as moved when it does not (**proposed**).
- **A filtered run's re-stack** (#1778, and the review of `f95a2cb3`). A filtered run does not re-flow a page: it only keeps the tables it drew from overlapping the ones below. For each table it redrew, the generator's tables below it **in its column** move by exactly its change in height, down when it grew and up when it shrank, and only while each sits where the generator left it (its position record matches). Nothing else moves. No other gap on the page closes, a table a designer moved stays put, and a table from before the position record is neither moved nor recorded. A page the run did not draw on keeps every position. A table the run moves has its record moved with it; otherwise the next run would read it as moved by hand and leave it out of the stack. The first build re-stacked the drawn page the way an unfiltered run does, which closed every gap on it: with the fourth table dragged aside, a filtered run with no change in height moved 16 tables it never drew up 1,684px and pulled in a record-less table. A table drawn for the first time by a filtered run goes 160px below the page's lowest content, like any new table, so a table drawn alone before its neighbors sits below them until a designer moves it (**proposed, owner to confirm**).
- **A renamed group under a filtered run.** When a filtered run draws a table for the first time and the same collection still holds a table the generator no longer draws (a group renamed, then asked for by its new title), the report says the old table stays: "Style guide — Info — nbds stays in place: the generator no longer draws it, and a run filtered to named tables deletes nothing. The next run without a Tables filter decides whether to delete it" (**proposed, owner to confirm**).
- **An unknown name's title list** names the first 8 titles the run can draw and counts the rest ("… Danger — nbds and 35 more").
- **Rerun.** The wrapper frame carries `prism3-style-guide = color|<collection ID>|<group's full path>` (`color|VariableCollectionId:…|pds3/color/text`). The key uses the ID so a renamed collection keeps its tables. It uses the full path so a sibling group added to a collection, which shortens the shared prefix, does not move it. The grid is rebuilt each run; the wrapper and header are kept. The frame name and the header's title and description are rewritten only while they still read what a run wrote, which is recorded in plugin data, so a designer's edit survives (**proposed**). A table whose group has gone is **stale**. A table whose key is an ancestor of a planned key is **replaced**: an earlier build drew one table per root where the collection holds two. Both are **superseded**. Only tables the run could have drawn are candidates: its types, and its collections when filtered. **A run filtered to named tables (#1778) has no candidates at all**: it covers only the tables it names and draws every one of them, so a table it skipped is never stale, and an earlier build's wider table is not replaced by one narrow table drawn alone. The next unfiltered run judges them.
- **Deleting a superseded table (decision 9).** Every time the generator writes a table, it records two things in the frame's plugin data:
  - `prism3-style-guide-print`, a fingerprint: a hash over every node in the frame, in order. Each node contributes its type, name, visibility, size, text, fills and strokes, pinned modes, corner radii, effects and effect style, stroke weight and alignment, layer opacity and blend mode, fill and stroke styles, auto-layout mode, padding and spacing, and its text font (family and style, size, weight, text style; a mixed-font text reads its segments). An instance adds its main component and its component properties. A bound paint counts by its variable's ID, never its color or opacity: the host carries a color variable's alpha in the paint's opacity, so a changed value is not an edit.
  - `prism3-style-guide-mark`, `<page ID>|<frame ID>`. Plugin data travels with a duplicate and the frame ID does not, so this tells the generator's frame from a designer's copy of it. The page ID tells a table left on its page from one moved to another page at the same x and y.

  Position is the existing `prism3-style-guide-at` record. It is left out of the fingerprint, so the re-stack moving a table is not an edit. A superseded table is deleted only when every check passes, in this order:
  1. its collection is still in this file, and the run drew something. A file whose variables moved to a published library reads an empty catalog, where every table would otherwise read as stale;
  2. it has a fingerprint;
  3. its mark names its own frame;
  4. its parent is the page itself, and the page the mark names. A designer's wrapper frame puts a table at the same x and y inside it;
  5. it sits where the position record puts it;
  6. its fingerprint still matches.

  Otherwise it is kept and reported with the reason: edited, moved, a copy, drawn before edits were tracked, its collection not in this file, nothing drawn this run, or could not be deleted. The check runs before the re-stack, so the stack closes over a deleted table, a top one included.
  - **A table from before the fingerprint is never deleted by the generator** (decision 9). A superseded table is never rewritten, so it never gains a fingerprint, and no earlier record is as strong: the rows snapshot, the title record and the position record say nothing about a cell's text or paint. The report names it and says to delete it by hand. The owner's test file's per-root tables are this case.
  - **Report.** "4 tables the generator no longer draws were deleted, unedited: A, B, C and 1 more". Kept tables are grouped by reason ("… were left in place — edited: A; moved: B; a copy: C"), each list capped at three names. The headline counts deletions: "✓ 7 tables, 4 deleted". The wording replaces "superseded" and "the edit record", which are internal terms, with "no longer draws" and "drawn before edits were tracked" (**proposed, owner to confirm**, §8).
  - **The fingerprint is over-sensitive by design.** A renamed layer, or an edit to a cell component that reaches every instance, reads as an edit, and the table is kept. That is the safe direction (**proposed**).
- **The rerun report.** Rows are compared by variable ID, so a renamed variable reads "renamed", not added and removed. Values are compared as the token holds them (the alias and the resolved RGBA), so switching Hex to RGBA changes no row.
- **Header description.** It states only what the plan checked. A primitive table counts its steps a semantic role references ("20 primitive colors in core, 19 referenced by a semantic role"). A semantic table counts its roles with a measured contrast. A count of zero drops the clause.
- **An unknown mode.** A file mode the brand does not contract ("L (HC)") has no floors, so its contrast reads "—" and the verdict names the mode.
- **Sharing the host's thread** (#1778). A full run on the owner's file (41 tables) held Figma and the panel for about 4.7 minutes, because the executor never yielded. It now draws one table at a time. After each table it yields to the host with the component writer's `realYield`, a `setTimeout(0)` macrotask (#699/#724), and it yields within a table every `max(1, floor(28 / columns))` rows: every 2 rows of a four-mode semantic table, every 7 of a one-mode palette. `CELLS_PER_YIELD = 28` is the component writer's under-a-second budget over ~32ms a cell, the run's 4.7 minutes averaged over ~8,800 cells (**proposed**; the live `tableMs` readings calibrate it). Before the first table and after each, a progress reading goes to the panel's pending pill ("Drawing table 7 of 22…"), to the console (`[prism3 #1778] style guide: table 7 of 22, Inverse, <ms>ms`), and to an agent's result as phase `table`.
- **One run at a time** (#1785). The yields let the panel stay live while a run draws, and the panel's button and the agent link's `style-guide` command are two entry points into one file. Two runs met at their yields: the second's `drawTable` removed the first's grid mid-build. Both entry points reach `ACTIONS.styleGuide`, which goes through the plugin's run guard (`run-guard.ts`, #1957), one hold per operation per plugin session. A second request, from either side, is refused, not queued, because a queued run would redraw every table the first had just drawn. The refusal is the guard's `refused` message, in its words ("Style guide is already running. Try again when it finishes."), and an agent's refused command fails as `busy`. While an agent's style guide runs, the page's button is busy, the rule the other writes follow (owner decision #4 on #1956). The panel learns of the agent's run from `agent-started`, and the agent's table readings (`agent-progress`, phase `table`) count on the page's row and the Activity drawer in the panel run's words, "Drawing table 7 of 22…" (owner decision Q19 b, 2026-10-05). A panel click refused behind an agent's run leaves the row to that run and is recorded in the drawer, as main's guard does for every write (Q20 a).
- **Verdict.** "✓ style guide: 22 tables" on a clean run, "✓ style guide: 1 table" for one. "⚠ 11 drawn, 11 skipped" when a page or the cells were missing, which is not a pass, so the detail opens. "⚠ 1 drawn, 1 not found" when a `tables` name matched nothing, and "✗ no table matched" when none did (**proposed, owner to confirm**). "⚠ 368 swatches unbound" when a swatch member has no layer that takes a fill, counted per variant in the detail. "✗ style guide skipped" when nothing was drawn.
- **Binding an adopted swatch.** In order: a layer named `Specimen`; a layer found by type (the first text layer, stroked layer or filled layer); and last, the instance itself, where the member paints its own fill or stroke or has no layers (the owner's `type=default`).

## 7. What is and is not verified offline

`apps/plugin/test-style-guide.ts` drives both halves through a node shim that keeps GRID tracks, explicit modes, bound paints and plugin data. It checks:
- a table per collection on the right page;
- the explicit mode per column;
- bound swatches;
- literal ratios (prism3 `text.primary` on `background.primary`: 19.42:1 light);
- the specimen's ground;
- numeric order, and named values first;
- a two-root file: titles, keys and same-root grounds;
- column widths and heights, against the shim's own layout model: 7px a character and 20px a line; a HUG track as wide as its widest cell's content; a FILL cell as wide as its track; a hugging grid as wide as its tracks and the gaps between them. Asserted: every column and row track HUG in every table, 2px apart both ways; every text cell and every specimen ground FILL on both axes; every swatch FIXED on both axes at its component's 48 × 48 inside a wider cell; the specimen by role (decision 13): a palette row with no ground frame anywhere in the primitive tables, its cell the `type=default` swatch at 48 × 48; a `text.*` row drawing the `type=text` letters, their fill bound to the token, on the ground, with no filled shape in the swatch; a `border.*` row drawing `type=border`, its stroke bound and not its fill, on the ground; a fill row keeping its 48 × 48 `type=default` swatch on the ground; every text `WIDTH_AND_HEIGHT` on one line, never truncated; no cell's content wider than its track; the swatch columns at 80, 80, 88 and 81; the description column its longest line, 630 + 16 + 16 = 662 (the owner's cells: 630 + 24 + 40 = 694), with every description cell filling it; a grid that drops its HUG column tracks, or its HUG row tracks alone, named; and a header the host will not size named with the table's width and its grid's. The shim models the host's quirk: a FIXED text inside an instance ignores `resize`'s width and keeps its main component's;
- the header (decision 10): the owner-cell Text table, its grid and its header are all the grid's literal width, 2,854px, not the header component's 2,517px;
- a grid dragged 140px wider (the shim fixes it, as a drag does): every cell is still as wide as its track, and the table and its header follow the grid. Nothing about the tracks' share of the extra is asserted, and the shim leaves HUG tracks at their content, as the typings' `fit-content(100%)` reads (§7, live-checks);
- the tables filter (#1778), on the two-root file: `tables: ['Primary — nbds']` draws that one table in place (the same frame, a new grid, a changed value reported), and the 42 others keep their page, grid and fingerprint, none stale, replaced, kept or deleted. With the fourth table dragged aside (a gap in the stack) and a record-less table 50px off the stack, a run with no change in height moves no table and writes no record. Two new rows (2 × (48 + 2) = 100px, a palette row being its bare swatch) move the 17 tables below that sit where the generator left them down by exactly 100px, their records with them; the dragged table, the record-less one, the table above and the other page do not move; removing the rows moves the same 17 back up by 100px. A page the run did not draw on is not re-stacked. A title in any case and a key both match; an unknown name is reported with the first 8 titles and "and 35 more", and is not a pass; a filter that matches nothing draws and deletes nothing; a renamed group's new table, drawn by a filtered run, is reported with the old table staying;
- one run at a time (#1785): through the run guard (`run-guard.ts`), a run asked for at another run's third yield is refused in the guard's words, and exactly one set of 22 tables results. `test-agent-link.ts` drives the same guard through `main.ts`'s two real entry points: each side refused with `busy` mid-yield while the other draws, the drawing run's one verdict reaching the panel, and the next click running;
- the yields (#1778), with a counting `yieldTo`: a progress reading before the first table and after each (0 of 22 … 22 of 22), a yield after every table, and at least 12 yields inside the 124-row Inverse table, never more than 10 rows apart;
- the re-stack: a table grown by 10 rows pushes the next one down 740px (ten 72px rows and their 2px gaps), a designer-moved table stays put, and an earlier build's tables without a record are re-flowed;
- superseded tables: an unedited stale table and an unedited replaced one are deleted, header and cells with them, and the stack closes over the gap. So is one whose bound variable's value and alpha changed between runs, replayed onto the paints as the host repaints them. Kept, each by its own literal fixture at the same size: one value cell retyped (the same length), a fill repainted, a stroke added, a cell widened by 40px, a pinned mode changed, 8px corners, a drop shadow, a stroke weight and alignment, a layer opacity and blend mode, one cell made bold, a fill style, a padding change, a swatch swapped to another component, a header property toggled, and the reviewer's shadow, corners and bold together. Also kept: a table moved across, moved down, put inside a designer's frame at the same x and y, and moved to another page at the same x and y; a table with no fingerprint; an in-place duplicate; an unedited table the host cannot remove. A run that draws nothing, a file whose collections moved to a library, and a single collection gone while the rest draw each delete nothing. A frame named like a table without the generator's key is never touched;
- the in-place rerun and its diff, and the header rewrite over an earlier run's titles;
- adoption whatever the page or case;
- every skip.

`test-build-verdict.mjs` drives the built panel: the Style guide page, the Customize fold, the options crossing the bridge (the Tables field on one line and across lines), the verdict on the row, an agent's first reading putting the row pending with its button disabled, and a `busy` refusal leaving it pending.

**Host-unverified:**
- GRID layout rendering, HUG tracks sizing to FILL cells' content as the owner's examples do, and HUG applied to an adopted instance's layers;
- **live-check (decision 11):** what a drag does to the grid. The owner's decision is that a table dragged wider reflows, and the offline suite does not show it. The typings define a HUG track as CSS `fit-content(100%)`, which does not grow past its content, so dragging the grid wider may leave the tracks where they are, with slack at the grid's edge. If the host does that, the reflow needs FLEX tracks, and that is the owner's call. The suite asserts only that a FILL cell is as wide as its track;
- **live-check (decision 10):** that a header set to FILL in a hugging wrapper leaves the wrapper at the grid's width. If the host fixes the wrapper instead, the verdict names the table ("the header did not take the table's width"). Whether the owner's header content fits a narrow table, such as a three-step palette, is the same check;
- **live-check (#1778):** that the panel and the canvas stay responsive while the tables draw, the pill counts tables, and each table's `tableMs` in the console. The shim has no event loop, so it can count yields but cannot show that they return control; the component writer's #699 run is the evidence that `setTimeout(0)` does. The fingerprint's read-only walk over a finished table does not yield; if a big table's `tableMs` shows a long tail after its rows, that walk is the next place to yield;
- the icon diamond's rotated geometry (its box is computed offline from the typings' transform, `rotation = atan2(-m10, m00)` about the top-left corner, and asserted at 8.44–39.56 on both axes; the host is the check that Figma applies it that way);
- that an instance inside a mode-pinned ground frame renders in the pinned mode;
- that a table's fingerprint, read on the next run with nothing touched, matches the one recorded when it was written. If the host lays a table out differently on a later read, nothing is ever deleted: the safe direction;
- **live-check:** whether deleting a variable or a collection detaches a paint's binding or drops a pinned mode. If it does, a stale table reads as edited and is kept: the safe direction;
- **live-check:** whether "Move to page" keeps a node's ID. If it does not, a moved table reads as a copy and is kept: the safe direction.

**Known limitation (#1778; S3 in the review of `f95a2cb3`): closing the plugin mid-run.** A run yields to the host, so the designer can close the plugin between two tables, or inside one. Nothing detects either case:
- **A half-built table.** Its grid holds only the rows drawn so far. A table the run was drawing for the first time has no fingerprint yet, since the fingerprint is stamped when a table is finished, and the generator never deletes a table without one (decision 9). A table the run was redrawing keeps its previous fingerprint, which no longer matches, so it reads as edited. Either way, the next run that draws it finds it by its key and redraws it whole. If the next run supersedes it instead, it is kept and reported ("drawn before edits were tracked", or "edited"), for the owner to delete by hand.
- **Overlap.** A close before the run's re-stack leaves a table that grew running over the ones below it until the next unfiltered run re-stacks the page.

A live run on the owner's test file is the check.

## 8. Proposed, owner to confirm

- The cell pixel values (§3) and the 12 text-cell combinations built when absent.
- The primitive/semantic rule (no alias → primitive).
- The fallback ground for a role with no contracted ground (§3).
- The hairline on the default swatch.
- Column headers: Token · <mode> · Value · Contrast · Description.
- Contrast wording: `3.27:1 — below the 7:1 floor` / `on background/primary`.
- The report wording for tables the generator no longer draws (§6): "no longer draws" in place of "superseded", "drawn before edits were tracked" in place of "the edit record", the reasons ("edited", "moved", "a copy", "its collection is not in this file", "nothing was drawn this run", "could not be deleted"), and the headline "✓ 7 tables, 4 deleted".
- What the fingerprint covers, including that an edit to a cell component reads as an edit to every table (§6).
- ~~The table's width: span the page, or hug the table.~~ Decided 2026-09-29: hug the table (§2, decision 10).
- Two live-checks (§7): whether deleting a variable or collection detaches bindings or drops pinned modes, and whether "Move to page" keeps a node's ID. Both fail safe.
- Placement 160px below the page's content.
- The grid rebuilt each run; the frame name and header rewritten only while they read what a run wrote.
- Palette rows named by their step alone, with the full path dropped (§6).
- ~~The description column capped at 360px including padding.~~ Superseded 2026-09-29: nothing wraps, and the description column is its longest line (§2, decision 11).
- A swatch column widened to its mode header rather than the header wrapping (§6). Kept under decision 11: a HUG track takes the wider of the two.
- ~~The specimen's ground frame FILLing its track, where the owner's examples place the swatch instance itself, FIXED.~~ Decided 2026-09-29: the swatch keeps its component's fixed size inside a cell that FILLs its track (§2, decision 13).
- ~~The gap between tracks: 0, where the owner's examples use 2px.~~ Decided 2026-09-29: 2px (§2, decision 12).
- The tables filter (#1778): a text field under *Customize* rather than a checklist (the panel holds no table titles until a run reports them), one title a line or several on one line separated by commas; matching on the title as drawn or the key, in any case; an unknown name reported with the first 8 titles the run can draw and a count of the rest; the headlines "⚠ 1 drawn, 1 not found" and "✗ no table matched".
- A filtered run supersedes nothing, and moves only the tables below the ones it redrew, in their column, by exactly their change in height (§6). The note for a renamed group's old table under a filtered run (§6).
- ~~One style-guide run at a time: a second request refused rather than queued, with "✗ already drawing".~~ Decided 2026-09-29 (§2, decision 14). The refusal comes from the run guard (#1957) in its words, so "✗ already drawing" is not shown; the owner kept the guard's words (Q18 a, 2026-10-05; §2, decision 14).
- The specimen by role (decision 13), where the name-based classification is ambiguous. Each is drawn as the classification reads it today, proposed:
  - `*/on-fill` (`interactive.*.on-fill`, `disabled.on-fill`) is the ink that sits on a fill, and draws the filled square, since no segment names it text or icon. Letters may fit better.
  - `field.placeholder` is placeholder text, and draws the filled square for the same reason.
  - `foreground.*` (and `inverse.foreground.*`) is a non-text graphic color measured at the non-text floor, and draws the filled square as a fill.
  - `field.fill` and every overlay are translucent, so they draw the checkerboard on their ground.
- The yield spacing, `CELLS_PER_YIELD = 28` (§6), and the pending text "Drawing table 7 of 22…".
- The re-stack after every run, and an earlier build's unrecorded tables re-flowed while they keep the stack's x (§6).
- The multi-root title forms "Text — nbds" and "Core — nbds base".
- The owner's "add a title cell to rows" option, deferred: each table's header carries the title.
- No contrast column on primitive tables.
- The contract read from the brand saved in the file.
- A single-group foreign collection titled by its own name, its tokens by their last segment.
- The panel step as a Figma-only rail entry between Preview and Components; the button label "Draw style guide".
- The Customize options held for the session, not saved with the brand.
- The collections filter offered only on the agent command, not in the panel.
- The sample text "Abc 123" (decision 7, flagged as changeable).
- The title "<Collection> — base" for values at a collection's shared prefix.
- The header description text (§6): the counts, and the wording of each clause.
- The dark table header as the default (`header: 'light'` switches it).
- The alpha format for a translucent value: `#000000 · 40%`.
- The Style guide page's claim that "each swatch is drawn on the ground its contrast is measured against": built and tested offline, **unverified in the host** until the live run (§7). A palette swatch has no ground and no contrast (decision 13), so the claim is about role swatches; the sentence does not say so.
