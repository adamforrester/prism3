# Build style guides

<!-- DRAFT for owner review (#2637, lane 4; corrected to Documentation and Update file for #3264). -->

Style guides are tables, one for each group of tokens in the file, drawn from the file's own variables, text styles, effect styles, gradient styles and grid styles. A rerun updates each table in place. <!-- src: apps/studio/src/shell/style-guides.ts:75 --> <!-- src: apps/studio/src/shell/style-guides.ts:79 -->
They are in the Figma plugin only. You choose what to draw in the **Documentation** area, and **Update file** draws it. <!-- src: apps/studio/src/state/update-file.ts:229-230 -->

Because the tables read the file rather than the studio, they show what the file holds right now, including anything you changed by hand. <!-- src: apps/plugin/src/style-guide.ts:1-40 -->

## Before you draw

The tables need the pages and the cell components that [setup](file-setup.md) adds. On a file that isn't set up, Documentation says "This file isn't set up yet. The first Update file sets it up, then draws these tables." <!-- src: apps/studio/src/shell/style-guides.ts:76 -->

Write the theme first if you want the color tables to show contrast. The contrast column reads the brand saved in the file; without one, it reads "—". <!-- src: apps/plugin/src/style-guide.ts:27-29 -->

## Choose what to draw

1. Open **Docs** in the rail, then the **Style guides** tab. <!-- src: apps/studio/src/shell/pages.ts:496 --> <!-- src: apps/studio/src/shell/pages.ts:511-516 -->
2. Under **What to draw**, choose a **Collection** (or **Every collection**) and the **Kinds** to include, then tick the groups you want. One button works on the list in view: it reads **Select all**, or **Deselect all** once anything in view is ticked. <!-- src: apps/studio/src/shell/style-guides.ts:318-363 -->
3. To draw only some tables, open **Draw by table title** and enter one title per line. Empty draws every table. <!-- src: apps/studio/src/shell/style-guides.ts:382-399 -->
4. Set the **Options**. <!-- src: apps/studio/src/shell/style-guides.ts:585 --> Documentation keeps your choices in the file. <!-- src: apps/studio/src/shell/documentation.ts:1-10 -->

## Draw the tables

1. Choose **Update file** in the top bar.
2. Tick **Style guides**: "Drawn with the settings in Documentation. A rerun updates each table in place." It is ticked by default only on a file that isn't set up yet. <!-- src: apps/studio/src/state/update-file.ts:229-230 -->
3. Choose **Update file**.

The status strip says "Style guides drawn" when the run ends, and the Activity drawer lists each table. If the run went wrong, the drawer's **Run again** draws them again. <!-- src: apps/studio/src/state/status-strip.ts:141-142 --> <!-- src: apps/studio/src/shell/activity.ts:207 -->

*[Screenshot placeholder: Documentation's Style guides tab, with groups ticked and the options column.]*

## Options

| Option | What it does |
|---|---|
| **Table header** | **Dark** or **Light**: the header row's fill. |
| **Aliases** | Shows the variable each value aliases, as a chip beside it. |
| **Description** | Adds each variable's description to its row. |
| **Token names** | **Full path** prints each variable's whole name. **Short** drops the part the table's title already names. |
| **Name cell** | Adds a name you can edit to each row, such as "Text Primary". A rerun keeps your edits. |
| **REM** | Shows each length in REM too, in its own cell, at a 16px base. |
| **Color value** | **Hex**, **RGB-A**, **HSL** or **HSB**. |
| **Color sample** | How each swatch is drawn: from each token's role, as a generic sample, or as text, border, icon or transparency. |
| **Dimension display** | **Filled bar** or **Bracket**, drawn at the value. |
| **Font sample** | What each font variable's sample shows: family, size, weight, letter spacing or line height. |
| **Paragraph spacing**, **Text decoration** | Extra columns for text styles. |

<!-- src: apps/studio/src/shell/style-guides.ts:596-620 -->
Options appear only for the kinds you picked. <!-- src: apps/studio/src/state/style-guides.ts:134-137 -->

## Where the tables go

Primitive collections, such as the palette ramps, go on `↳ Primitive tokens`. Semantic ones, such as color roles, space and radius, go on `↳ Semantic tokens`. Grid styles go on `↳ Grids & layouts`. If the page is missing, the table is skipped and the result says so, and the plugin never creates the page itself. <!-- src: apps/plugin/src/style-guide.ts:136-139 --> <!-- src: apps/plugin/src/file-taxonomy.ts:82-88 -->

Each mode gets its own column, side by side, and each swatch stays bound to its variable, so it updates with the file. <!-- src: apps/plugin/src/style-guide.ts:23-25 -->

## Running it again

A rerun finds each table it drew before and updates it in place, reporting tokens added, removed and changed. <!-- src: apps/plugin/src/style-guide.ts:30-31 -->
A table whose group is gone is deleted only if the plugin drew it and nobody has changed it since. A table someone edited, moved or copied is left in place and reported. <!-- src: apps/plugin/src/style-guide.ts:32-33 -->
A run filtered by table title never deletes another table. <!-- src: tools/figma-mcp/README.md:186-187 -->

Tables for groups Prism3 no longer draws are offered for removal in Update file's **Clean up** tab. <!-- src: apps/studio/src/state/update-file.ts:189 --> See [Update a Figma file](update-a-file-safely.md#remove-what-the-brand-no-longer-uses).
