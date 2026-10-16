# Build style guides

<!-- DRAFT for owner review (#2637, lane 4). -->

**Build style guides** draws a table for each group of tokens in the file, from the file's own variables, text styles, effect styles and gradient styles. A rerun updates each table in place. <!-- src: apps/studio/src/shell/style-guides.ts:57-58 --> <!-- src: apps/studio/src/shell/style-guides.ts:63 -->
It is in the Figma plugin only. <!-- src: apps/studio/src/shell/style-guides.ts:1-5 -->

Because the tables read the file rather than the studio, they show what the file holds right now, including anything you changed by hand. <!-- src: apps/plugin/src/main.ts:1041-1101 -->

## Before you draw

The tables need the pages and the cell components that [Set up file](file-setup.md) adds. Until the file has them, the page says "Needs the pages and cells Set up file adds." and offers a **Set up file** button; **Draw** stays off. <!-- src: apps/studio/src/shell/style-guides.ts:59-60 --> <!-- src: apps/studio/src/shell/style-guides.ts:238 --> <!-- src: apps/studio/src/shell/style-guides.ts:442 -->

Apply the theme first if you want the color tables to show contrast. The contrast column reads the brand saved in the file; without one, it reads "—". <!-- src: apps/plugin/src/style-guide.ts:27-29 --> <!-- src: apps/plugin/src/main.ts:1051-1060 -->

## Draw the tables

1. In the **Figma** menu, choose **Build style guides…**. The page opens full width. <!-- src: apps/studio/src/main.ts:1784-1785 --> <!-- src: apps/studio/src/shell/frame.ts:434 -->
2. Under **What to draw**, choose a **Collection** (or **Every collection**) and the **Kinds** to include, then tick the groups you want. One button works on the list in view: it reads **Select all**, or **Deselect all** once anything in view is ticked. <!-- src: apps/studio/src/shell/style-guides.ts:257-301 -->
3. To draw only some tables, open **Draw by table title** and enter one title per line. Empty draws every table. <!-- src: apps/studio/src/shell/style-guides.ts:320-337 -->
4. Set the **Options**, then choose **Draw *N* tables**. <!-- src: apps/studio/src/shell/style-guides.ts:520 --> <!-- src: apps/studio/src/state/style-guides.ts:129 -->

While it draws, the page shows "Drawing table 3 of 32…" and each table's status: Waiting, Drawing, Done or Not drawn. **Cancel** stops after the table being drawn. A table that was not drawn offers **Draw it again**. <!-- src: apps/studio/src/shell/style-guides.ts:65 --> <!-- src: apps/studio/src/shell/style-guides.ts:82 --> <!-- src: apps/studio/src/shell/style-guides.ts:467 --> <!-- src: apps/studio/src/shell/style-guides.ts:496 --> <!-- src: apps/plugin/src/main.ts:1064-1065 --> <!-- src: apps/plugin/src/main.ts:1336 -->

*[Screenshot placeholder: the Build style guides page, with groups ticked and the options column.]*

## Options

| Option | What it does |
|---|---|
| **Table header** | **Dark** or **Light**: the header row's fill. |
| **Aliases** | Shows the variable each value aliases, as a chip beside it. |
| **Description** | Adds each variable's description to its row. |
| **Token names** | **Full path** prints each variable's whole name. **Short** drops the part the table's title already names. |
| **Name cell** | Adds a name you can edit to each row, such as "Text Primary". A rerun keeps your edits. |
| **REM** | Shows each length in REM too, at a 16px base. |
| **Color value** | **Hex**, **RGB-A**, **HSL** or **HSB**. |
| **Color sample** | How each swatch is drawn: from each token's role, as a generic sample, or as text, border, icon or transparency. |
| **Dimension display** | **Filled bar** or **Bracket**, drawn at the value. |
| **Font sample** | What each font variable's sample shows: family, size, weight, letter spacing or line height. |
| **Paragraph spacing**, **Text decoration** | Extra columns for text styles. |

<!-- src: apps/studio/src/shell/style-guides.ts:530-554 -->
Options appear only for the kinds you picked. <!-- src: apps/studio/src/state/style-guides.ts:131-132 -->

## Where the tables go

Primitive collections, such as the palette ramps, go on `↳ Primitive tokens`. Semantic ones, such as color roles, space and radius, go on `↳ Semantic tokens`. If the page is missing, the table is skipped and the result says so: "this file has no Semantic tokens page, and Set up file adds it". The plugin never creates the page itself. <!-- src: apps/plugin/src/style-guide.ts:21-22 --> <!-- src: apps/plugin/src/style-guide.ts:706-707 --> <!-- src: apps/plugin/src/style-guide.ts:1334 -->

Each mode gets its own column, side by side, and each swatch stays bound to its variable, so it updates with the file. <!-- src: apps/plugin/src/style-guide.ts:23-25 -->

## Running it again

A rerun finds each table it drew before and updates it in place, reporting tokens added, removed and changed. <!-- src: apps/plugin/src/style-guide.ts:30-31 -->
A table whose group is gone is deleted only if the plugin drew it and nobody has changed it since. A table someone edited, moved or copied is left in place and reported. <!-- src: apps/plugin/src/style-guide.ts:32-33 --> <!-- src: apps/plugin/src/style-guide.ts:1295-1297 -->
A run filtered by table title never deletes another table. <!-- src: apps/plugin/src/style-guide.ts:2308-2310 --> <!-- src: tools/figma-mcp/README.md:186-187 -->
