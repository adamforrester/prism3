/**
 * STYLE-GUIDE test (#259, phases 1–2) — the cell sets, the color tables, and the dimension, font-variable and text-style
 * tables.
 *
 *   npx tsx apps/plugin/test-style-guide.ts
 *
 * Drives `style-guide-cells.ts` and `style-guide.ts` against an in-memory NODE SHIM of a Figma file whose
 * variables are the REAL prism3 emission (`packages/engine/out/figma/prism3/core.palette.json` + the four
 * `color.<mode>.json`), plus a small foreign collection with unpadded steps stored out of order. Checked:
 *   1. file setup builds the three cell sets onto `↳ File Components`, and a second run builds none;
 *   2. sets a file already has — on another page, in another case — are ADOPTED: never moved, never rebuilt,
 *      only the missing one is built;
 *   3. the PLAN — a table per group, primitive collections on `↳ Primitive tokens` and semantic ones on
 *      `↳ Semantic tokens`, one specimen + value (+ contrast) column per mode, and the measured contrast of
 *      prism3 `text.primary` on `background.primary` as literal ratios per mode;
 *   4. primitive steps in NUMERIC order;
 *   5. the EXECUTOR — every mode column's swatch pins its mode and is bound to its variable, each specimen
 *      is drawn on its contracted ground (inverse text on the inverse ground, not white), the contrast cell's
 *      words, the header instance;
 *   6. a RERUN updates in place — no second table — and reports tokens added, removed and changed; an emptied
 *      group's table, unedited, is deleted;
 *   7. a missing page, missing cell sets and a missing header set are skips, reported, never thrown;
 *   8. the table KEY (collection ID + full path) survives a sibling group and a renamed collection; the header
 *      descriptions state only what was checked; the rerun report keys rows by variable ID and compares raw
 *      values; the stale report stays inside the run's types and collections; an uncontracted mode is named;
 *      a mixed-font cell loads every segment's font or names the miss;
 *   9. a TWO-ROOT file (`nbds/…` and `pds3/…` in the same collections, as the owner's test file holds them)
 *      groups within each root and names it in the title, grounds stay in their root, a rerun over the live
 *      run's tables rewrites old titles and reports the per-root tables as replaced and kept; an unbound swatch is a ⚠
 *      with its count; named values lead a ramp;
 *  10. GROUPS ON A RERUN (#2801): Semantic colors' inverse row, each inverse guide under its default by column, typed;
 *      the group as wide as its columns read off its guides; a widened guide keeps its cell; a guide dragged out stays
 *      where it was put; tables an earlier build drew loose join their groups where the rows started; a grid that drops its
 *      HUG column or row tracks, and a header that does not take its table's width, are named. Column widths (sections 2
 *      and 5) are read off the shim's own layout model — 7px a character, a HUG track as wide as its widest cell's
 *      content, 2px between tracks — never off the plugin's arithmetic;
 *  11. SUPERSEDED tables (owner decision, 2026-09-28): an unedited replaced or stale table is deleted, header and
 *      cells with it, and its group's grid closes over it; one with a text cell retyped, one moved (dragged out of its
 *      group, into a designer's frame, onto another page; a cell moved within its group is no move), one with no
 *      fingerprint and a duplicate of one are kept and reported apart; a frame the generator did not make is
 *      never touched, whatever its name. The edits are made to the shim's nodes here, never through the plugin;
 *  12. THE OWNER'S GRID MODEL (owner decisions, 2026-09-29): HUG tracks 2px apart, every cell FILL on both axes, the
 *      palette swatch FILLing its cell, floored at 32 × 32, and a role's swatch FIXED on its ground (section 5 checks
 *      the specimen by role: a palette row's bare swatch with no ground, a taller row making a taller swatch; letters for a text role, the outline for a border and the filled square for a fill, each on its
 *      ground), text on one line; the header spans its table, not the
 *      header component's 2,517px; a grid dragged wider keeps every cell as wide as its track, and the table and its
 *      header follow the grid. Whether the HUG tracks take up the extra width is NOT asserted: the typings define HUG
 *      as CSS `fit-content(100%)`, which does not grow past its content, so that is a live-check (docs/45 §7);
 *  13. the TABLES FILTER (#1778): one table drawn in place, the 56 others untouched and never stale; a filtered run
 *      widens or narrows its group by exactly its table's change and moves nothing on the page; a guide dragged out
 *      and a reordered guide stay as the designer left them; a first-time table joins the end of its group; any case,
 *      or a key; an unknown name reported with the first 8
 *      titles, and not a pass; a renamed group's old table named as staying until an unfiltered run;
 *  14. YIELDING (#1778), with a counting `yieldTo`: a progress reading per table, a yield after every table, and at
 *      least 12 yields inside the 55-row Interactive table, never more than 10 rows apart;
 *  15. ONE RUN AT A TIME (#1785), through the plugin's run guard (#1957, `run-guard.ts`): a run asked for while
 *      another is mid-yield is refused, and exactly one set of tables results. (`test-agent-link.ts` drives the same
 *      guard through `main.ts`'s two real entry points.)
 *  16–19. PHASE 2 (#259), on the prism3 emission's dimension and font variables and its 80 text styles, plus a
 *      mode-varying `density` and a `metrics` ramp stored out of order: a table per collection and type on the right
 *      page; spacing bars, brackets and radius swatches at the value with their width or corner bound and each mode
 *      pinned; px and REM at 16px; ramp order; a font variable's one property bound; the fluid type-sets sizes side by
 *      side; the text-style table in the file's order with its style applied; the toggled columns; a rerun in place;
 *      the tables filter; the phase boundary; a refused binding named.
 *  20. THE TITLE CELL (owner decision 15): off by default; humanized defaults; an edit survives reruns while an unedited
 *      title follows a rename; a title edit is not an edit to the table when a superseded table is judged.
 *  21. THE REVIEW OF 4faeb98a: each reviewed shape's variable kind, a refused or ignored resize counted, the host's font
 *      rule (loaded before bound, pinned before bound), superseded phase-2 tables, all four radius corners.
 *  22. THE OWNER'S CELL STRUCTURE (the live run of 4faeb98a): the owner's spacing and radius cells, copied from a live
 *      measurement, and the cells the real builder makes, each drawing the bracket, the bar and the radius at their
 *      value; the bracket's right edge carried, moved (named static) or counted; a cell with no layer counted.
 *  23. GROUPS (#2801): two groups stacked in the table's order, 320 apart; the measured layout (88 / 160 / 160 / 160,
 *      80 under a Size=Large title with no description, a HUG grid 160 apart); guides in plan order; a width change widens
 *      its group and moves nothing; a height change pushes the group below by exactly it; a new group 320 below.
 *  24. THE REVIEW OF f3bb76cd: a bracket with its parts named otherwise, and a file with no spacing set, counted; one
 *      verdict per specimen; a new table taller than its group pushing the group below down.
 *  25. REM ON AND OFF (#2153): every dimension and font-variable table, planned and drawn, with REM on and with REM off
 *      (first drawn, and redrawn from on): its exact column list, a REM cell under every REM column, and no REM cell and
 *      no cell past the last column when REM is off. The column lists are literals, one per table and setting.
 *  26. THE BUILD STYLE GUIDES PAGE (UI redesign S11.2): the catalog the page is offered (`catalogFor`), its 29 titles typed
 *      here; every variable listed under the table that drew it, read back off each drawn frame's own row record; the
 *      later-phase variables with no table; the text styles last; `isSetUp` needing both cell sets and both pages.
 *  27. A RUN TABLE BY TABLE: its list first, then each table drawing and done.
 *  28. ONE FAILED TABLE (owner decision P6): the host refusing the Accent table fails that table with its words, the run
 *      draws the other 28, the verdict is "⚠ 28 drawn, 1 failed", and a redraw by the table's key draws it alone.
 *  29. CANCEL (owner decision P7): a stop read after table 3 ends the run there, deletes no superseded table (the control
 *      run to the end does), and the verdict says where it stopped; a stop after the last table is no stop.
 *  33. THE OWNER'S QA OF A REAL BRAND FILE (#2371): a mixed filtered run, tables narrowed or shortened in place and one
 *      created in their group or a new group below them, overlaps nothing; no font-size table for the text styles'
 *      responsive collection (type-sets), listed under Text styles on the page, and an earlier run's one deleted; the raw
 *      font weights on Primitive tokens and the weight roles on Semantic tokens, read off the emission; no fill on a
 *      table's outer frame (section 32); a family with no Regular set in its role's face, or the host's first style
 *      for it, and bound.
 *  34. THE TOKEN COLUMN (#2372): the full variable path by default, the short name on request.
 *  35. BATCH 1 (#2353): the border widths and the focus ring's width and offsets in ONE Border width table, each drawn on
 *      the type=radius member's radius-example layer (#2506), its stroke weight bound, its corners not, and pinned to its
 *      own collection's mode, a 0 width with no stroke; icon size in a dimension table; opacity as a
 *      percentage with its swatch, the transparency member filling its cell, its layer opacity bound; font style as the
 *      Text styles table's Style column; the later-phase note and the page's catalog without those groups. Phase 2's
 *      file plus the emission's border-width, focus, icon and layout collections; every expected value typed here.
 *  35e. ICON SIZE (#2728, owner decision Q341 A): the icon collection's dimension table is titled "Icon size", every
 *      Semantic tokens title is unique beside the color tables, and a rerun retitles an earlier "Icon" table in place.
 *  36. BATCH 2A (#2353): the effect styles and the gradient paint styles, a table each, every local style in the file's order
 *      (one Prism3 did not make included, a solid paint style left out); each layer and each stop printed on a line of its
 *      own; the specimen a type=default card or fill swatch with the style applied by id; the phase boundary; the page's
 *      catalog; a rerun in place; a refused style counted. The emission's 14 effect and 2 gradient styles plus three
 *      foreign styles; every expected value typed here.
 *  37. GROUPS (#2801, Q378): the engine table by type and tier, typed from the issue (another brand's accent ramp a
 *      palette, a link family a semantic color, icon sizes Space & size, border widths and radii Borders); each page's
 *      groups in order; a guide moved by hand into another group stays; a designer's note stays; a retitled group keeps
 *      its title and a title Prism3 wrote is refreshed; an empty group kept by a filtered and a stopped run and removed by
 *      a full one, a group holding only a note not empty; adoption of hand-made groups, one holding two groups' guides
 *      included, and one emptied by hand never removed; an inverse family with no default past Semantic colors' last
 *      column in Inverse colors; effect styles below the groups; a header set with no Size=Large.
 *  38. A GROUP YOU MADE (Q412 A, superseded 2026-10-19): its inverse guides move out to Inverse colors, its defaults into
 *      one grid, once; the cleanup offer for a table the generator no longer draws.
 *  39. THE MEASURED FILE (owner decision, 2026-10-19): a fixed, clipping frame you made with the inverse guides in a second
 *      row, running over the frames below. Inverse colors is its own titled group 320 below, column-aligned (read off the
 *      shim's layout model); the fixed frame grows to fit; the frames below move clear, order and gap kept; a rerun is
 *      stable.
 *  40. A GROUP YOU MADE THAT WRAPS (#2856): a HORIZONTAL frame with wrap on, header on the first row and the guides
 *      wrapping below, grows to its widest row (never the one-row sum), its height its rows; one #2827's one-row sum
 *      widened is put back; a width wider than its rows need that is not that sum is kept; a rerun is stable. Expected
 *      widths from the layout rule (padding + widest child), typed here; the shim lays wrapped rows out by its own rule.
 *
 * INDEPENDENCE (docs/34): expected values are literals written here. The ratios (19.42, 18.13, 21) and the
 * failing 3.27 (neutral/400 on white, computed by hand from the WCAG formula), 6.44 (foreground.brand on
 * neutral/050) and 15.42 (text.primary over the 10% hover wash on background.primary; 19.42 on the bare ground) are the engine's own contract figures floored to two places, transcribed from a probe of
 * `resolveAllModes` / `contrast` — never read off `style-guide.ts`. Page names, set names, group titles and
 * variant names are typed here, not imported. The shim's case-insensitive set search is its own.
 *
 * BY-NAME MUTATIONS (each proven red, then restored — docs/00-progress.md 2026-09-28):
 *   - drop `inst.setExplicitVariableModeForCollection` on the swatch → "5: every text/primary swatch pins its
 *     column's mode" fails;
 *   - skip the swatch binding → "5: every text/primary swatch is bound to text/primary" fails;
 *   - draw every specimen on white (`groundVariable` forced undefined) → "5: inverse/text/primary is drawn
 *     on inverse/background/primary" fails;
 *   - sort primitive rows lexically → "4: foreign ramp in numeric order" fails;
 *   - never find an existing table on rerun → "6: rerun: 10 tables on the semantic page — none duplicated…" fails
 *     (it read "still 11 tables" before superseded tables were deleted);
 *   - build every cell set regardless of `findCellSets` → "2: the adopted swatch set is not duplicated" fails;
 *   - the diamond at x = 24, y = 8.44 → "1: the icon diamond's box is 8.44–39.56 on both axes…" fails;
 *   - measure the ink against the bare ground, not the composite → "3: text/primary over
 *     interactive.primary.overlay.hover on background.primary, light: 15.42:1" fails;
 *   - `groundModeFor` always the column's mode → "3: foreground.brand on neutral/050, light: 6.44:1" fails;
 *   - key by collection name, or by the prefix-relative group → "8: a sibling group added to legacy…" fails;
 *   - the stale check ignores the run's types → "8: a dimension-only run reports no color table stale" fails;
 *   - read no font segments → "8: a mixed-font cell loads every segment's font and is written" fails;
 *   - drop the unreadable-font miss → "8: a cell whose fonts cannot be read is named…" fails;
 *   - claim every step referenced / every role measured → "8: Accent header…" / "8: Scrim header…" fail;
 *   - snapshot rows by name → "8: a renamed variable is a rename, not an add and a remove" fails;
 *   - snapshot the printed value → "8: switching Hex to RGBA changes no row" fails;
 *   - never name an uncontracted mode → "8: a file mode the engine does not contract is named" fails;
 *   - `bindTarget` searches descendants only → "2: a type=default swatch with no layers binds the instance's
 *     own fill" fails;
 *   - leave `unbound` out of ok/headline → "9: unbound swatches are not a pass…" fails;
 *   - multi-root detection off → "9: a two-root color collection groups by family within each root…" fails;
 *   - ground affinity off → "9: each root's text is drawn on its own root's background" fails;
 *   - size tracks from the header row only / never hug the cell root → "2: no text in the owner's cells is wider
 *     than its column" fails;
 *   - (retired 2026-09-29 with #1749's FIXED columns: "5: every swatch column is the swatch plus its padding: 80" and
 *     "5: a long description wraps at 360px rather than clipping". Their successors are "5: a swatch column is the
 *     wider of the specimen and its mode header…" and "5: the description column is its longest line…");
 *   - a palette row shows its full path in short mode → "34: short: a palette table leads with the step alone…" fails;
 *   - steps sorted without named-first → "9: named values lead, in file order, then steps ascending" fails;
 *   - a role keeps its family in its name → "2: the adopted type=Text swatch is used for a text role" fails;
 *   - no header rewrite / rewrite over an edit → "9: an earlier run's title is rewritten…" / "9: a title the
 *     designer typed is kept" fail;
 *   - replaced folded into stale → "9: the per-root table is reported as replaced…" fails;
 *   - (retired 2026-09-29, nothing wraps: "5: a long description wraps to its column less the cell's padding: 360 −
 *     16 − 16 = 328")
 *   - wrap a mode header to the specimen before the columns are sized → "5: a swatch column is the wider of the
 *     specimen and its mode header…", "5: every header in every table sits on one line" fail;
 *   - skip the re-stack → "10: a table that grows by 10 rows pushes the next table down 740px" fails (720 before the
 *     2px track gap);
 *   - re-stack without reading the position record → "10: a table a designer moved stays where they put it" fails;
 *   - leave unrecorded tables out of the stack → "10: tables from before the position record are re-flowed too" fails;
 *   - drop the track read-back → "10: a grid that did not keep its hugging tracks is named" fails (its column arm);
 *     drop its row clause alone → "10: a grid that did not keep its hugging ROW tracks is named" fails;
 *   - drop the header-width miss → "10: a header the host will not size to its table is named…" fails;
 *   - the fingerprint compare ignored, so every candidate that reaches it is deleted → "11: a replaced table with one
 *     text cell changed by hand is kept, reported as edited" fails;
 *   - the edit check always true, so nothing is deleted → "6: an unedited stale table is deleted", "11: an unedited
 *     replaced table is deleted…" fail;
 *   - the generator-marker check removed → "11: a duplicate of a generator table is never deleted…" fails;
 *   - the no-fingerprint check removed → "11: a table with no fingerprint is kept", "9: the per-root table has no
 *     fingerprint, so it is left in place" fail (each table is still kept, since it has no mark either, but for the
 *     wrong reason: "copied");
 *   - text left out of the fingerprint → "11: a replaced table with one text cell changed by hand is kept…" fails
 *     (the retyped value is the same length, so no size moves with it);
 *   - the position check removed → "11: a moved table is kept" fails;
 *   - the superseded-table loop not skipping a removed table's subtree (#2704) → "6a: one run deletes two superseded,
 *     unedited tables…" and "6b: a full rerun deletes both superseded tables, re-flows and reports ok…" fail;
 *   - the stack starts at the topmost table left, ignoring a deleted one above it → "11: the stack closes over the
 *     deleted table…" fails;
 *   - (review round) each fingerprint group dropped — fills/strokes, size, pinned modes, corners, effects, stroke
 *     geometry, layer opacity/blend, style IDs, auto layout, text font, instance main component/properties — fails
 *     its own "11: a replaced table with … by hand is kept, reported as edited" arm; y dropped from the moved check
 *     → "11: a table moved straight down is kept…"; a bound paint keyed by color, or keeping its opacity → "11: a
 *     table whose bound variable's value (and alpha) changed between runs is still deleted"; the parent-is-page and
 *     page-ID checks → "11: a table put inside a designer's frame…" / "11: a table moved to another page…"; the
 *     collection and empty-plan guards → "11: a table whose collection is no longer in the file is kept…" / "11: a
 *     run that draws nothing deletes nothing…". Full table: docs/00-progress.md (2026-09-28).
 *
 *   - (third live run) `wrapTo` reverted to FIXED + resize → "2: the owner's description text wraps to 360 − 24 − 40 =
 *     296", "2: the owner's description row is not one word a line", "5: a long description wraps to its column less
 *     the cell's padding…" fail; visibility or name dropped from the fingerprint → "11: … a swatch layer hidden …" /
 *     "11: … a cell renamed in the layers panel …" fail. (`wrapTo` and those three arms were retired 2026-09-29 by the
 *     owner's grid model: nothing wraps.)
 *   - (#1778 and the 2026-09-29 owner decisions; docs/00-progress.md 2026-09-29) the filter ignored → "13: tables:
 *     ["Primary — nbds"] draws that one table" fails; the skipped tables treated as candidates → "13: the tables a
 *     filtered run skips are not stale…" fails; the per-row yield removed → "14: the 55-row Interactive table yields while
 *     its rows are placed…" fails; the per-table yield removed → "14: the host gets control back after every table"
 *     fails; the header left at its component width → "2: the table and its header are as wide as its grid…" and "12:
 *     the table and its header hug the grid…" fail; a FIXED column track → "5: every column and row track of every
 *     table is HUG" fails; a text cell left hugging → "5: every text cell FILLs its track, both axes" fails.
 *   - (review of f95a2cb3 and the owner decisions of 2026-09-29; docs/00-progress.md 2026-09-29) the track gap left at 0
 *     → "5: every table's grid has a 2px gap…" and "2: the table and its header are as wide as its grid, 2854px…"
 *     fail (since #2336 the gap is 0, and a 2px gap fails "5: no table's grid has a gap…", "2: … 2828px…" and "32:
 *     every row line runs across every column…"); the swatch's FIXED sizing dropped → "5: every swatch keeps its component's 48 × 48, FIXED…" fails; the
 *     filtered run's gap-closing re-stack restored → "13: a filtered run whose table keeps its height moves no
 *     table…", "13: a table a designer moved and a table with no position record are left alone…" and "13:
 *     shrinking back by 100px…" fail; the header-width miss dropped → "10: a header the host will not size…" fails;
 *     the row clause of the track read-back dropped → "10: a grid that did not keep its hugging ROW tracks…" fails; the title list uncapped → "13: an unknown
 *     name is reported by name, with the first 8 titles…" fails; the renamed-table note dropped → "13: a filtered
 *     run that draws a renamed group's new table says the old one stays…" fails; the gate's refusal removed → "15: a
 *     run asked for from the agent link while a panel run is mid-yield is refused…" fails.
 *   - (owner decision 13 as clarified 2026-09-29: the specimen by role) a ground on a palette row → "5: a palette row has
 *     no ground frame…" fails; a filled square for a text role → "5: a text.* row draws letters…" fails.
 *   - (phase 2, docs/00-progress.md 2026-09-29) the spacing bar unbound → "16: space/050 draws the filled spacing bar…",
 *     "16: a mode-varying spacing draws a bound bar per mode…"; the radius corner unbound → "16: radius/md draws the
 *     type=radius swatch…"; the font property unbound → "17: font size 16's specimen…" and the other 17 binding arms;
 *     REM at 10px → "16: its value reads px and REM at a 16px base…" and ten more; a lexical sort → "16: the space scale
 *     in ramp order…", "16: a ramp stored 16, 4, 100, 2…"; the text style not applied → "18: body/lg/default's specimen
 *     is "Abc 123" with its text style applied…"; the paragraph-spacing column always shown → "18: the text-style
 *     table…", "18: toggled off, the two columns are gone…"; (title cell) the edit not preserved → "20: a hand-edited title
 *     survives a rerun…"; the title column left in the fingerprint → "20: a superseded table whose only change is a
 *     retitled row is deleted, unedited"; the humanizer returning the raw path → "20: humanized: …" and four more.
 *   - (#2153) REM forced on, `const lengths = true && …` in `planVariableTables` → "25: REM off: the plan's columns are
 *     each table's exact list", "25: REM off: every planned cell has no REM" and their four drawn arms fail, and nothing
 *     outside 25 does; REM forced off, `const lengths = false && …` → the four "25: REM on…" arms fail, with 11 arms
 *     of 16, 17, 19 and 23.
 *
 *   - (#2371, each on a committed head, the file restored from a saved copy) a new table placed against the tables' sizes
 *     after this run's updates rather than before it → "33: a mixed run, tables narrowed in place and one created in their
 *     row, overlaps nothing…" and "33: a mixed run whose row got shorter starts a new category's row 160px below it…" fail;
 *     the type-sets font-size table kept → "33: no font-size table for the type-sets collection…", "33: a type-sets
 *     font-size table an earlier run drew is deleted…" fail; the page's Text styles mapping dropped → "33: the Build style
 *     guides page lists the 21 type-sets sizes under Text styles…" fails; font weight not split → "33: the 6 raw font
 *     weights are their own table…" fails; the wrap left white, or its line removed (the shim's new frame is white, as the
 *     host's is) → "32: no table's outer frame … has a fill" fails; the family set in the cell's own style → "33: the
 *     display family, which has no Regular here…" and three more fail.
 *
 *   - (#2353, each on a committed head, restored from it) the focus ring drawn as its own table (the border-width merge
 *     removed) → "35: the focus ring's width and offset are rows of the Border width table…" and "35: no table is keyed
 *     to or titled for the focus collection" fail; the opacity drawn without its swatch → "35: opacity 40's swatch is the
 *     transparency member filling its cell…" fails; the font style dropped from the Text styles column → "35: the Text
 *     styles table has a Style column after Weight" fails.
 *
 *   - (#2506, each on a committed head, restored from it) the border width drawn on the type=border member again → "35:
 *     every Border width row's specimen is a type=radius instance…", "35: every Border width row's radius-example has its
 *     strokeWeight bound…", "35: no Border width row binds the radius-example's corners…" and "35: a 0 width … draws no
 *     stroke" fail; the corners bound to the width as well → "35: no Border width row binds the radius-example's corners
 *     to its width…" fails alone; a row from another collection left unpinned → "35: the focus ring rows' radius examples
 *     are pinned to the focus collection's mode" and "35: a 0 width … draws no stroke" fail.
 *
 *   - (#2506 Q233 B, each on a committed head, restored from it) the default border paint dropped → "35: on the owner's
 *     stroke-less radius member, every Border width row's radius-example is painted one stroke bound to
 *     pds3/color/border/primary" fails; the paint added whether or not the member has a stroke → "35: on the Set up
 *     file's radius member, which has a stroke, every Border width row keeps that one stroke…" and "35: an open run
 *     draws every table, every specimen bound" fail.
 *
 *   - (#2353 batch 2a, each on a committed head, restored with `git reset --hard`) the style never applied to its specimen →
 *     "36: every Effect styles row's card is the type=default member with its effect style applied…", "36: every Gradient
 *     styles row's swatch is an instance filling its cell, its fill style the row's gradient…" and "36: a style the host
 *     refuses to apply is counted (18)…" fail; a multi-layer shadow's second layer dropped → "36: shadow/2xl prints both its
 *     layers…", "36: a blur layer prints its type and blur…", "36: a shadow color follows the Color value format…" and "36:
 *     drawn, shadow/2xl's cells read its two layers…" fail; a stop's position printed off by a factor of ten → "36:
 *     gradient/brand prints its stops…", "36: gradient/glow is Radial…", "36: Brand/Sunset prints its three stops…" and "36:
 *     drawn, Brand/Sunset's stops read 0%, 35%, 100%…" fail.
 *
 *   - (#2659, each on a committed head, restored from it) in `planEffectStyles` and in `planGradientStyles`, the common
 *     prefix capped at one segment (`commonPrefix(…).slice(0, 1)`) → "36: short: effect styles under one root print the
 *     name below it…" (or gradient) fails; the short name always dropping the first segment (`.slice(1)` for
 *     `.slice(prefix.length)`) → "36: short: effect styles that share no root print their whole name…" (or gradient)
 *     fails. Both passed silently before. In `planVariableTables` both were already caught by name, also in the form that
 *     touches only the Token cell: "34: short: the space step prints 025 (space/025)", because `pds3/space/` is two
 *     segments deep.
 *   - (#2801, each on a committed head, in a copy, the suite run on it) radii no longer Borders' in the engine table →
 *     "37: the engine table groups by type and tier…"; the inverse not split per family → "3: color groups by family…
 *     each inverse family its own table"; inverse guides put in the default row → "10: Semantic colors holds the
 *     defaults in one row and each inverse guide under its counterpart…"; no adoption → "37: a hand-made group is
 *     adopted…"; loose guides from before groups left loose → "10: tables an earlier build drew loose join their
 *     groups…"; a dragged-out guide put back → "10: a guide a designer dragged out of its group stays…"; empty groups
 *     never removed → "37: a full run removes a group it drew once it holds nothing…"; a filtered run removing them →
 *     "37: a filtered run removes no group, an empty one included"; a note not counting → "37: a group left with only a
 *     designer's note is not empty…"; a retitled group overwritten → "37: … a title they changed is kept"; no grid
 *     compaction → "11: the group closes over the deleted table…"; groups 160 apart → "23: Dimensions then Fonts…";
 *     no partial push-down → "23: a height change moves the group below…"; the push-down moving a group drawn in the
 *     same run → "33: a mixed run whose group got shorter starts a new group…"; a grouped guide always read as moved →
 *     "11: an unedited replaced table is deleted…"; ungrouped guides not below the groups → "37: Effect styles stands
 *     alone below the last group…"; a Medium or described group title → "23: its title is a Size=Large header…"; a new
 *     default ignoring its inverse's column → "37: a new default joins above its inverse…"; a hand-made group removed
 *     when empty → "37: a hand-made group with no guides left is never removed"; 160 top padding → "23: a group is a
 *     transparent vertical auto layout…".
 *   - (owner decision 2026-10-19, each on a committed head, the suite run on it) the split skipped → "38: each inverse
 *     guide moved out to Inverse colors…" and "39: the inverse guides move out of the frame you made into Inverse
 *     colors…"; `fitToContent` returning at once → "39: never clipped: a fixed frame you made grows to fit…"; the
 *     overlap pass given no frame to push from → "39: never overlapping: the frames below move down clear of Inverse
 *     colors…" and "38: Inverse colors goes 320 below the group, and the group that sat there moves down…".
 *   - (#2856, each on a committed head, the suite run on it) the wrap branch dropped from `fitToContent`'s `need` →
 *     "40: a wrapped frame you made grows to its widest row…", "40: its height is its two rows…" and "40: a wrapped
 *     frame the one-row sum widened is put back…"; the repair disabled (`widened` false) → "40: a wrapped frame the
 *     one-row sum widened is put back…"; `rowsHigh` ignoring `counterAxisSpacing` (`between = gap`) or returning only
 *     `padV` → "40: a wrapped frame with a fixed height grows to its two rows…".
 *
 * THE SHIM IGNORES A RESIZE THE HOST IGNORES: a FIXED text inside an instance keeps its main component's width under
 * `resize` (live, 2026-09-28). Before the shim modeled it, every width assertion passed over one-word-a-line text.
 *
 * THE SHIM DOES NOT REPAINT: a bound paint keeps the placeholder color `setBoundVariableForPaint` stamped. The
 * value-change arm replays the host's repaint (color, and alpha as the paint's opacity) onto the drawn nodes itself,
 * and asserts at least one paint moved; without that, keying bound paints by color survives every test.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ensureStyleGuideCells } from './src/style-guide-cells';
import type { CellsApi } from './src/style-guide-cells';
import { STYLE_GUIDE_GROUPS, styleGuideGroupOf } from '@prism3/engine/style-guide-groups';
import { planStyleGuide, runStyleGuide, removeRetiredTables, styleGuideSummary, contrastText, humanizeName, varKind, sizeByPadding, catalogFor, isSetUp } from './src/style-guide';
import { createRunGuard, busyMessage } from './src/run-guard';
import type { StyleGuideApi, SgCatalog, SgTable, TableOutcome, StyleGuideResult, StyleGuideRun, StyleGuideOptions, StyleGuideProgress } from './src/style-guide';
import { parseDesignMd } from '@prism3/engine/design-md';
import { brandTheme } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../../packages/engine/out/figma/prism3');
const readJson = (f: string) => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as {
  $collection: string; $mode: string;
  variables: { name: string; resolvedType: string; description: string; value: { r: number; g: number; b: number; a: number }; alias: { name: string } | null }[];
};

// ── The shim ─────────────────────────────────────────────────────────────────────────────────────────
let nextId = 1;
/** Phase 2: when set, every `setBoundVariable` throws, as the host does for a binding it refuses. */
let refuseBinding = false;
/** When set, `resize` throws on a node it matches, as a host that refuses to resize a layer inside an instance would
 *  (the review of `4faeb98a`: the spacing bar's resize had no guard, so one refusal aborted the whole run). */
let refuseResize: ((n: N) => boolean) | null = null;
/** When set, `resize` does nothing on a node it matches and says nothing: the silent answer, as the live run's
 *  brackets looked (every one 8px, "unbound: 0"). */
let ignoreResize: ((n: N) => boolean) | null = null;
/** When set, a padding bind on a node it matches is accepted and changes nothing: a width that does not follow. */
let ignorePadding: ((n: N) => boolean) | null = null;
/** When set, a layer inside an instance refuses a new `constraints` (and, with `refuseMove`, a new `x`): the two host
 *  answers this build cannot rule out offline for the owner's bracket, whose parts are all constrained MIN. */
let refuseConstraints = false;
let refuseMove = false;
const insideInstance = (n: N): boolean => { for (let p = n.parent; p; p = p.parent) if (p.type === 'INSTANCE') return true; return false; };

/**
 * THE HOST'S FONT RULE, modeled (review of `4faeb98a`: font loading was untested). A text's font-bound property, or
 * `setTextStyleIdAsync`, throws unless the text's font is loaded, and binding a family or weight also needs the font
 * it resolves to: the bound family in the text's style, or the text's family at the weight's style. The variable is
 * resolved in the node's mode AT THE MOMENT IT IS BOUND (the mode pinned on it or an ancestor, else the collection's
 * default), which is what makes the order of pin and bind matter. Each shim keeps its own loaded fonts; a run
 * starts with `loadAllPagesAsync`, which makes its shim the one whose fonts, variables and styles a bind reads.
 * Its own weight table, not the plugin's (docs/34): the style a host picks for a weight.
 */
interface World { fonts: Set<string>; loads: string[]; cols: ShimCol[]; vars: ShimVar[]; styles: ShimStyle[]; effectStyles: ShimEffectStyle[]; paintStyles: ShimPaintStyle[] }
/** When set, applying an effect or a paint style throws, as the host does for a style it refuses (#2353 batch 2a). */
let refuseStyle = false;
let active: World | null = null;
const SHIM_WEIGHT_STYLE: Record<number, string> = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
const FONT_BOUND = new Set(['fontFamily', 'fontStyle', 'fontWeight', 'fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent']);
const fontId = (f: unknown): string => { const x = f as { family?: unknown; style?: unknown } | undefined; return `${String(x?.family)} ${String(x?.style)}`; };
/** A variable's value in the mode `node` sits in now, following aliases. */
const valueAt = (w: World, node: N, v: ShimVar): unknown => {
  let cur: ShimVar | undefined = v;
  for (let hop = 0; cur && hop < 16; hop++) {
    const col = w.cols.find((c) => c.id === cur!.variableCollectionId);
    let mode: string | undefined;
    for (let n: N | null = node; n && !mode; n = n.parent) mode = n.explicitVariableModes[cur.variableCollectionId];
    const raw = cur.valuesByMode[mode ?? col?.defaultModeId ?? ''] as { type?: string; id?: string } | undefined;
    if (raw?.type !== 'VARIABLE_ALIAS') return raw;
    cur = w.vars.find((x) => x.id === raw.id);
  }
  return undefined;
};
/** The shim's text metric: every character 7px wide, lines split at "\n". Its own figure, not the plugin's. */
const CHAR_W = 7;
const isAuto = (n: N | null | undefined): boolean => n?.layoutMode === 'HORIZONTAL' || n?.layoutMode === 'VERTICAL';
/** A padding as the host lays it out: a BOUND padding is its variable's value in the node's mode, read live, so a
 *  frame sized by a bound paddingLeft follows its variable (the owner's live run of 0.205.0). */
const padOf = (n: N, side: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'): number => {
  const b = n.boundVariables?.[side];
  const v = b && active ? active.vars.find((x) => x.id === b.id) : undefined;
  return v ? Number(valueAt(active!, n, v)) : Number(n[side] ?? 0);
};
const padX = (n: N): number => padOf(n, 'paddingLeft') + padOf(n, 'paddingRight');
/** A text node's width set on one line. */
const naturalOf = (t: N): number => Math.max(0, ...String(t.characters ?? '').split('\n').map((l) => l.length)) * CHAR_W;
/** The lines a text sets in: one per "\n" while it hugs; a HEIGHT text breaks at spaces to its box, and a word
 *  wider than the box breaks inside it, as the host does ("Default" in 30px is two lines). 20px a line. */
const linesOf = (t: N): number => String(t.characters ?? '').split('\n').reduce((n, para) => {
  if (t.textAutoResize !== 'HEIGHT') return n + 1;
  // The box is the width the text lays out at: its stored width, or its parent's less padding when it FILLs.
  const box = Math.max(CHAR_W, t.width);
  let lines = 1, run = -CHAR_W;
  for (const word of para.split(' ')) {
    const w = word.length * CHAR_W;
    if (run >= 0 && run + CHAR_W + w > box) { lines++; run = w; } else run += CHAR_W + w;
    if (w > box) { lines += Math.ceil(w / box) - 1; run = w % box || box; }
  }
  return n + lines;
}, 0);
const LINE_H = 20;
const padY = (n: N): number => padOf(n, 'paddingTop') + padOf(n, 'paddingBottom');
/** Out of an auto-layout frame's flow: an ABSOLUTE child takes no part in what the frame hugs. */
const inFlow = (k: N): boolean => k.layoutPositioning !== 'ABSOLUTE';
/**
 * A ROW THAT WRAPS (`layoutWrap: 'WRAP'`, a HORIZONTAL frame of a fixed width), as the host lays it out: its in-flow
 * children left to right, `itemSpacing` apart, and a child that would pass the right padding starts the next row at the
 * left padding (the first in a row always stays, however wide). Each row is as tall as its tallest child; the rows sit
 * `counterAxisSpacing` apart (the host's `itemSpacing` where it is unset). The shim's own rule, for #2856.
 */
const wrapRows = (n: N): { kids: N[]; at: Map<N, number>; h: number }[] => {
  const inner = n.w - padX(n), gap = Number(n.itemSpacing ?? 0);
  const rows: { kids: N[]; at: Map<N, number>; h: number; run: number }[] = [];
  for (const k of n.children.filter((c) => c.visible !== false && inFlow(c))) {
    const r = rows[rows.length - 1];
    if (!r || r.run + gap + k.width > inner) rows.push({ kids: [k], at: new Map([[k, 0]]), h: k.height, run: k.width });
    else { r.at.set(k, r.run + gap); r.kids.push(k); r.h = Math.max(r.h, k.height); r.run += gap + k.width; }
  }
  return rows;
};
/** THE LAYOUT EPOCH: bumped by every write to every node (each `N` is a proxy that counts its writes), so a grid's
 *  tracks are computed once per state of the file rather than once per read. A 124-row table's fingerprint reads
 *  1,750 cell widths, each a column of 125 cells: uncached, the suite ran ~8× slower. The proxy cannot see a write
 *  inside a nested object; the only layout-bearing ones are a node's `children` (bumped by hand in `appendChild`)
 *  and a grid track's `type` written in place, which the plugin does only where assigning the whole array throws,
 *  and the shim's assignment never throws. */
let epoch = 0;
/** A REMOVED NODE IS INVALID (#1795, the host's behavior #1791 and #1794 met): after `remove()`, reading any property
 *  but `id` and `removed` throws, as Figma's "in get_name: … does not exist" does, and so does a second `remove()`.
 *  Mirrored here, not imported from #1794's removal shim, which is not on this branch. */
const REMOVED_READABLE = new Set<PropertyKey>(['id', 'removed', '_removed', 'constructor']);
const BUMP: ProxyHandler<object> = {
  get: (t, k, r) => {
    if ((t as { _removed?: boolean })._removed && !REMOVED_READABLE.has(k) && typeof k === 'string') throw new Error(`in get_${k}: The node (${(t as { id?: string }).id}) does not exist`);
    return Reflect.get(t, k, r);
  },
  set: (t, k, v, r) => { epoch++; return Reflect.set(t, k, v, r); },
  defineProperty: (t, k, d) => { epoch++; return Reflect.defineProperty(t, k, d); },
  deleteProperty: (t, k) => { epoch++; return Reflect.deleteProperty(t, k); },
};
class N {
  id = `node:${nextId++}`;
  name = '';
  children: N[] = [];
  parent: N | null = null;
  /** The stored width — what `resize` sets. `width` reads it unless the node's sizing computes one. */
  w = 0;
  /** `layoutSizingHorizontal`, behind a setter that refuses what the host refuses. */
  lsh?: string;
  /** The stored height — what `resize` sets. `height` reads it unless the node's layout computes one. */
  h = 0;
  private _x = 0;
  // An ABSOLUTE child constrained MAX keeps its distance to its parent's right edge however the parent's width is
  // reached (a hug from a bound padding included); `_anchor` is where it sat, and how wide its parent was, when its
  // constraints were set in the component.
  get x(): number {
    const a = this._anchor as { pw: number; x: number; w: number } | undefined;
    if (a && this.parent && this.layoutPositioning === 'ABSOLUTE' && this._constraints?.horizontal === 'MAX') return this.parent.width - (a.pw - a.x);
    // AN IN-FLOW CHILD OF AN AUTO LAYOUT sits where the layout puts it, as the host reads it back: its parent's left
    // padding, and in a row every in-flow child before it and the spacing after each (children aligned to the start).
    const p = this.parent;
    if (p && isAuto(p) && inFlow(this)) {
      if (p.layoutMode === 'VERTICAL') return padOf(p, 'paddingLeft');
      if (p.layoutWrap === 'WRAP') return padOf(p, 'paddingLeft') + (wrapRows(p).find((r) => r.kids.includes(this))?.at.get(this) ?? 0);
      const before = p.children.slice(0, p.children.indexOf(this)).filter((k) => k.visible !== false && inFlow(k));
      return padOf(p, 'paddingLeft') + before.reduce((sum, k) => sum + k.width + Number(p.itemSpacing ?? 0), 0);
    }
    return this._x;
  }
  set x(v: number) { if (refuseMove && insideInstance(this)) throw new Error('cannot move a layer inside an instance'); this._x = v; }
  y = 0;
  private _constraints?: { horizontal: string; vertical: string };
  get constraints(): { horizontal: string; vertical: string } | undefined { return this._constraints; }
  set constraints(v: { horizontal: string; vertical: string } | undefined) {
    if (refuseConstraints && insideInstance(this)) throw new Error('cannot override constraints inside an instance');
    this._constraints = v ? { ...v } : v;
    if (v && this.parent && this.layoutPositioning === 'ABSOLUTE') this._anchor = { pw: this.parent.width, x: this._x, w: this.w };
  }
  fills: unknown = [];
  strokes: unknown = [];
  characters?: string;
  fontName?: unknown;
  /** A mixed-font text node's segments, as `getStyledTextSegments(['fontName'])` returns them. */
  segments?: { fontName: unknown }[];
  visible = true;
  mainComponent: N | null = null;
  componentProperties?: Record<string, { type: string; value: unknown }>;
  explicitVariableModes: Record<string, string> = {};
  pluginData: Record<string, string> = {};
  gridRow?: number;
  gridCol?: number;
  gridColumnSizes: { type: string; value?: number }[] = [];
  gridRowSizes: { type: string; value?: number }[] = [];
  private _cols = 0;
  private _rows = 0;
  [k: string]: unknown;
  constructor(public type: string) {
    return new Proxy(this, BUMP) as N;
  }
  // THE LAYOUT MODEL. A WIDTH_AND_HEIGHT text is its words' width; a FILL child in a grid is its column's track, in
  // an auto-layout frame the frame's width less its padding; a hugging auto-layout frame is its padding plus its
  // in-flow children (summed across a row, the widest down a column); a hugging grid is its tracks; anything else
  // is its stored width.
  get width(): number {
    const a = this._anchor as { pw: number; x: number; w: number } | undefined;
    if (a && this.parent && this.layoutPositioning === 'ABSOLUTE' && this._constraints?.horizontal === 'STRETCH') return a.w + this.parent.width - a.pw;
    if (this.type === 'TEXT' && this.textAutoResize === 'WIDTH_AND_HEIGHT') return naturalOf(this);
    const p = this.parent;
    if (this.lsh === 'FILL' && p) {
      if (p.layoutMode === 'GRID' && this.gridCol !== undefined) return Math.max(trackW(p, this.gridCol), Number(this.minWidth ?? 0));
      if (isAuto(p)) return p.width - padX(p);
    }
    if (this.layoutMode === 'GRID' && this.lsh === 'HUG') return hugGridW(this);
    if (this.hugsW() && isAuto(this)) return this.emptyRow() ? Math.max(Number(this._floor ?? 0), Number(this._held ?? this.w), padX(this)) : contentW(this);
    return this.w;
  }
  private hugsW(): boolean {
    return this.lsh === 'HUG' || (this.lsh === undefined && ((this.layoutMode === 'HORIZONTAL' && this.primaryAxisSizingMode === 'AUTO') || (this.layoutMode === 'VERTICAL' && this.counterAxisSizingMode === 'AUTO')));
  }
  /**
   * A HUGGING ROW WITH NOTHING IN FLOW, the spacing specimen's frame, as measured live on the owner's cells (live QA of
   * 0.210.0, 2026-09-30). Its width is the widest of three things:
   *   • `_floor`, the main component's own width when the instance was made: a layer inside an instance never hugs
   *     narrower than its main (an 8px rest width left every value of 8 or less at 8);
   *   • `_held`, the width it holds: a padding that decreases, or a padding of 0, leaves it where it was, and only
   *     setting HUG from another sizing sets it again (to its padding, or, with no padding, to its last width);
   *   • its padding, which it grows to as soon as that is wider.
   */
  private emptyRow(): boolean { return this.layoutMode === 'HORIZONTAL' && !this.children.some(inFlow); }
  set width(v: number) { this.w = v; }
  // Heights: a text is its lines; a FILL child in a grid is its row's track; a hugging grid is its row tracks; an
  // auto-layout frame that hugs vertically is its padding plus its children (summed down a column, the tallest
  // across a row).
  get height(): number {
    if (this.type === 'TEXT') return linesOf(this) * LINE_H;
    const lsv = this.layoutSizingVertical as string | undefined;
    const p = this.parent;
    if (lsv === 'FILL' && p?.layoutMode === 'GRID' && this.gridRow !== undefined) return Math.max(trackH(p, this.gridRow), Number(this.minHeight ?? 0));
    if (this.layoutMode === 'GRID') return lsv === 'FIXED' ? this.h : hugGridH(this);
    const hug = lsv === 'HUG' || (lsv === undefined && ((this.layoutMode === 'VERTICAL' && this.primaryAxisSizingMode === 'AUTO') || (this.layoutMode === 'HORIZONTAL' && this.counterAxisSizingMode === 'AUTO')));
    if (hug && isAuto(this)) return contentH(this);
    return this.h;
  }
  set height(v: number) { this.h = v; }
  get layoutSizingHorizontal(): string | undefined { return this.lsh; }
  set layoutSizingHorizontal(v: string | undefined) {
    if (v === 'HUG' && this.type !== 'TEXT' && !isAuto(this) && this.layoutMode !== 'GRID') throw new Error('HUG needs an auto-layout frame');
    if (v === 'FILL' && !(isAuto(this.parent) || this.parent?.layoutMode === 'GRID')) throw new Error('FILL needs an auto-layout or grid parent');
    if (this.type === 'TEXT' && v === 'HUG') this.textAutoResize = 'WIDTH_AND_HEIGHT';
    // FIXED keeps the width it has now, as the host does.
    if (v === 'FIXED' && this.type !== 'TEXT' && this.lsh !== 'FIXED') this.w = this.width;
    // HUG SET FROM ANOTHER SIZING re-reads an empty row: its padding, or with none, its last width. Set again while it
    // already hugs, it changes nothing (the live QA of 0.210.0: rebound from 24 to 2, HUG again stayed 24).
    if (v === 'HUG' && isAuto(this) && this.emptyRow() && !this.hugsW()) { const cur = this.width, p = padX(this); this._held = p > 0 ? p : cur; }
    this.lsh = v;
  }
  get gridColumnCount(): number { return this._cols; }
  // The host refuses to drop a track a child still occupies.
  set gridColumnCount(n: number) { if (this.children.some((k) => (k.gridCol ?? -1) >= n)) throw new Error('cannot remove an occupied column'); this._cols = n; this.gridColumnSizes = Array.from({ length: n }, () => ({ type: 'FLEX' })); }
  get gridRowCount(): number { return this._rows; }
  set gridRowCount(n: number) { if (this.children.some((k) => (k.gridRow ?? -1) >= n)) throw new Error('cannot remove an occupied row'); this._rows = n; this.gridRowSizes = Array.from({ length: n }, () => ({ type: 'FLEX' })); }
  /** A grid's cells by column and by row — the shim's own index, so a track reads its cells without a scan of the
   *  whole grid (a 124-row table holds 1,750). Kept by `appendChildAt` and `detach`, the only ways a cell moves. */
  byCol = new Map<number, Set<N>>();
  byRow = new Map<number, Set<N>>();
  private detach(): void {
    const p = this.parent;
    if (!p) return;
    p.children = p.children.filter((x) => x !== this);
    if (this.gridCol !== undefined) p.byCol.get(this.gridCol)?.delete(this);
    if (this.gridRow !== undefined) p.byRow.get(this.gridRow)?.delete(this);
    this.parent = null;
  }
  appendChild(c: N): void {
    c.detach();
    c.parent = this;
    this.children.push(c);
    epoch++;
  }
  /** As the host's: at `i` among the children (an auto layout's order), taken from wherever it was (Q412 A). */
  insertChild(i: number, c: N): void {
    c.detach();
    c.parent = this;
    this.children.splice(Math.max(0, Math.min(i, this.children.length)), 0, c);
    epoch++;
  }
  appendChildAt(c: N, r: number, col: number): void {
    if (this.layoutMode !== 'GRID') throw new Error('appendChildAt on a non-grid');
    if (r >= this._rows || col >= this._cols) throw new Error(`grid cell ${r},${col} out of bounds`);
    if ([...(this.byRow.get(r) ?? [])].some((k) => k.gridCol === col)) throw new Error(`grid cell ${r},${col} occupied`);
    this.appendChild(c);
    c.gridRow = r; c.gridCol = col;
    if (!this.byCol.has(col)) this.byCol.set(col, new Set());
    if (!this.byRow.has(r)) this.byRow.set(r, new Set());
    this.byCol.get(col)!.add(c);
    this.byRow.get(r)!.add(c);
  }
  /** A grid child's cell, as the host reads it (#2801): the row and column it is anchored at. */
  get gridRowAnchorIndex(): number { return this.gridRow ?? 0; }
  get gridColumnAnchorIndex(): number { return this.gridCol ?? 0; }
  /** Move a grid child to another cell, refused where the host refuses it: out of bounds or occupied. */
  setGridChildPosition(r: number, col: number): void {
    const p = this.parent;
    if (!p || p.layoutMode !== 'GRID') throw new Error('setGridChildPosition outside a grid');
    if (r >= p.gridRowCount || col >= p.gridColumnCount) throw new Error(`grid cell ${r},${col} out of bounds`);
    if ([...(p.byRow.get(r) ?? [])].some((k) => k !== this && k.gridCol === col)) throw new Error(`grid cell ${r},${col} occupied`);
    if (this.gridCol !== undefined) p.byCol.get(this.gridCol)?.delete(this);
    if (this.gridRow !== undefined) p.byRow.get(this.gridRow)?.delete(this);
    this.gridRow = r; this.gridCol = col;
    if (!p.byCol.has(col)) p.byCol.set(col, new Set());
    if (!p.byRow.has(r)) p.byRow.set(r, new Set());
    p.byCol.get(col)!.add(this); p.byRow.get(r)!.add(this);
    epoch++;
  }
  _removed = false;
  get removed(): boolean { return this._removed; }
  // A REMOVED NODE TAKES ITS SUBTREE WITH IT (#2704): the host invalidates every descendant too, an instance's
  // sublayers included ("in getPluginData: The node (instance sublayer or table cell) with id "I180:15550;1:689" does
  // not exist", live on a full rerun at engine 0.237.0). A list of nodes gathered before the remove still holds them.
  remove(): void {
    if (this._removed) throw new Error(`in remove: The node (${this.id}) does not exist`);
    this.detach();
    const gone = [this, ...this.findAll(() => true)];
    for (const n of gone) n._removed = true;
  }
  // THE HOST'S QUIRK (live, 2026-09-28, and measured in the plugin runtime 2026-09-29 on the owner's run of 0.205.0):
  // a width written to ANY layer inside an INSTANCE is silently dropped, no throw: the owner's 29px label stayed 29px
  // under resize(296, h), and every spacing specimen stayed 8px. Its height still moves. A frame that hugs or fills is
  // FIXED once resized, on both axes, as a designer's drag leaves it.
  resize(w: number, h: number): void {
    if (refuseResize?.(this)) throw new Error(`cannot resize ${this.name}`);
    if (ignoreResize?.(this)) return;
    let inInstance = false;
    for (let p = this.parent; p; p = p.parent) if (p.type === 'INSTANCE') { inInstance = true; break; }
    // CONSTRAINTS: a frame without auto layout carries its children by theirs when resized — MAX keeps the distance
    // to the right edge, STRETCH keeps both, CENTER splits the change; MIN (and none) stays put.
    if (this.type !== 'TEXT' && !isAuto(this) && this.layoutMode !== 'GRID') {
      const dx = w - this.w;
      for (const k of this.children) {
        const hz = k.constraints?.horizontal;
        if (hz === 'MAX') k._x += dx;
        else if (hz === 'CENTER') k._x += dx / 2;
        else if (hz === 'STRETCH') k.w += dx;
      }
    }
    if (!inInstance) this.w = w;
    this.h = h;
    if (this.type !== 'TEXT') {
      if (this.lsh === 'HUG' || this.lsh === 'FILL') this.lsh = 'FIXED';
      if (this.layoutSizingVertical === 'HUG' || this.layoutSizingVertical === 'FILL') this.layoutSizingVertical = 'FIXED';
    }
  }
  findAll(pred: (n: N) => boolean): N[] {
    const out: N[] = [];
    const walk = (n: N) => { for (const c of n.children) { if (pred(c)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  findOne(pred: (n: N) => boolean): N | null { return this.findAll(pred)[0] ?? null; }
  findAllWithCriteria(c: { types: string[] }): N[] { return this.findAll((n) => c.types.includes(n.type)); }
  getStyledTextSegments(): { fontName: unknown }[] { return this.segments ?? [{ fontName: this.fontName }]; }
  setPluginData(k: string, v: string): void { this.pluginData[k] = v; }
  getPluginData(k: string): string { return this.pluginData[k] ?? ''; }
  setExplicitVariableModeForCollection(collection: unknown, modeId: string): void {
    // Under dynamic-page the collection OBJECT is required — an id string throws in the host.
    if (!collection || typeof collection !== 'object' || typeof (collection as { id?: unknown }).id !== 'string') throw new Error('collection object required');
    this.explicitVariableModes[(collection as { id: string }).id] = modeId;
  }
  /** Phase 2: a node property bound to a variable, recorded as the host's `boundVariables` reads it. A shim-wide switch
   *  makes the host refuse, as it does for a text field whose font is not loaded. */
  boundVariables: Record<string, { type: string; id: string }> = {};
  setBoundVariable(field: string, v: { id: string } | null): void {
    if (refuseBinding) throw new Error(`cannot bind ${field}`);
    const w = active;
    if (w && v && this.type === 'TEXT' && FONT_BOUND.has(field)) {
      if (!w.fonts.has(fontId(this.fontName))) throw new Error(`unloaded font ${fontId(this.fontName)}`);
      const cur = this.fontName as { family: string; style: string };
      const value = valueAt(w, this, v as ShimVar);
      const next = field === 'fontFamily' ? { family: String(value), style: cur.style }
        : field === 'fontWeight' ? { family: cur.family, style: SHIM_WEIGHT_STYLE[Math.round(Number(value) / 100) * 100] ?? 'Regular' } : null;
      if (next && !w.fonts.has(fontId(next))) throw new Error(`unloaded font ${fontId(next)}`);
      if (next) this.fontName = next;
    }
    // A bound WIDTH on a layer inside an instance is dropped too, silently, as a written one is.
    if (v && field === 'width' && insideInstance(this)) return;
    if (v && /^padding/.test(field) && ignorePadding?.(this)) return;
    const firstPad = /^padding/.test(field) && !Object.keys(this.boundVariables).some((k) => /^padding/.test(k));
    // An empty row holds the width it has now: a padding bound smaller does not shrink it (live QA of 0.210.0).
    if (v && /^padding/.test(field) && isAuto(this) && this.emptyRow() && this.hugsW()) this._held = this.width;
    if (v) this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
    // THE FREEZE (measured live, 2026-09-29): after its first padding bind a hugging frame can freeze at FIXED at the
    // width that bind gave it, and then no longer follows its variable until HUG is set again.
    if (v && firstPad && this.lsh === 'HUG' && isAuto(this)) { const w0 = this.width; this.lsh = 'FIXED'; this.w = w0; }
  }
  /** #2353 batch 2a: an effect or a fill style applied, as the host does under dynamic-page: the node takes the style's id
   *  and its layers or paints. A style the file does not hold throws. */
  effectStyleId = '';
  fillStyleId = '';
  async setEffectStyleIdAsync(id: string): Promise<void> {
    const st = active?.effectStyles.find((x) => x.id === id);
    if (refuseStyle || !st) throw new Error(`cannot apply effect style ${id}`);
    this.effectStyleId = id;
    this.effects = st.effects.map((e) => ({ ...e }));
  }
  async setFillStyleIdAsync(id: string): Promise<void> {
    const st = active?.paintStyles.find((x) => x.id === id);
    if (refuseStyle || !st) throw new Error(`cannot apply paint style ${id}`);
    this.fillStyleId = id;
    this.fills = st.paints.map((x) => ({ ...x }));
  }
  textStyleId = '';
  async setTextStyleIdAsync(id: string): Promise<void> {
    const st = active?.styles.find((x) => x.id === id);
    if (active && st && !active.fonts.has(fontId(st.fontName))) throw new Error(`unloaded font ${fontId(st.fontName)}`);
    this.textStyleId = id;
    if (st) this.fontName = { ...st.fontName };
  }
  setProperties(p: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(p)) if (this.componentProperties?.[k]) this.componentProperties[k].value = v;
  }
  createInstance(): N {
    const clone = (n: N): N => {
      const c = new N(n === this ? 'INSTANCE' : n.type);
      for (const k of ['name', 'w', 'lsh', 'h', 'layoutSizingVertical', 'x', 'y', 'fills', 'strokes', 'characters', 'fontName', 'segments', 'visible', 'layoutMode',
        'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'textAutoResize', 'textTruncation',
        'layoutPositioning', 'constraints', '_anchor', 'clipsContent', 'cornerRadius', 'topLeftRadius']) (c as Record<string, unknown>)[k] = (n as Record<string, unknown>)[k];
      // An instance's layer never hugs narrower than its main's width (live QA of 0.210.0).
      if (n !== this) c._floor = n.width;
      for (const k of n.children) c.appendChild(clone(k));
      return c;
    };
    const inst = clone(this);
    inst.mainComponent = this;
    if (this.parent?.componentProperties) inst.componentProperties = JSON.parse(JSON.stringify(this.parent.componentProperties));
    return inst;
  }
}

// ── The shim's grid model (the owner's, measured live on "↳ Style Guide Examples", 2026-09-29) ─────────────────
// A HUG track is as wide as its widest cell's CONTENT: a FILL cell counts what it would hug, any other its own width.
// A FILL cell then takes the whole track. A hugging grid is its tracks and gaps. A grid a designer dragged wider
// (FIXED) leaves its HUG tracks at their content: the typings define HUG as CSS `fit-content(100%)`, which does not
// grow past its content. Whether the host shares the extra out at all is a live-check (docs/45 §7), so section 12
// asserts only what holds either way: a FILL cell is as wide as its track.
/** A node's width as it hugs its content, whatever its own sizing says. */
const contentW = (n: N): number => {
  if (n.type === 'TEXT') return n.textAutoResize === 'WIDTH_AND_HEIGHT' ? naturalOf(n) : n.w;
  if (n.layoutMode === 'GRID') return hugGridW(n);
  // A FILL child without auto layout has no content to hug: it offers a HUG track its floor, `minWidth`, and nothing
  // more (the host's answer is a live-check, docs/45 §7). So a palette swatch that FILLs its cell without a floor
  // collapses its column to its header's text.
  if (!isAuto(n)) return n.lsh === 'FILL' ? Number(n.minWidth ?? 0) : n.w;
  const ws = n.children.filter((k) => k.visible !== false && k.lsh !== 'FILL' && inFlow(k)).map((k) => k.width);
  const inner = n.layoutMode === 'HORIZONTAL' ? ws.reduce((a, b) => a + b, 0) + Number(n.itemSpacing ?? 0) * Math.max(0, ws.length - 1) : Math.max(0, ...ws);
  return padX(n) + inner;
};
const contentH = (n: N): number => {
  if (n.type === 'TEXT') return linesOf(n) * LINE_H;
  if (n.layoutMode === 'GRID') return hugGridH(n);
  if (!isAuto(n)) return n.layoutSizingVertical === 'FILL' ? Number(n.minHeight ?? 0) : n.h;
  if (n.layoutMode === 'HORIZONTAL' && n.layoutWrap === 'WRAP') {
    const rows = wrapRows(n);
    return padY(n) + rows.reduce((a, r) => a + r.h, 0) + Number(n.counterAxisSpacing ?? n.itemSpacing ?? 0) * Math.max(0, rows.length - 1);
  }
  const hs = n.children.filter((k) => k.visible !== false && inFlow(k)).map((k) => k.height);
  return padY(n) + (n.layoutMode === 'VERTICAL' ? hs.reduce((a, b) => a + b, 0) + Number(n.itemSpacing ?? 0) * Math.max(0, hs.length - 1) : Math.max(0, ...hs));
};
/** A track's size: FIXED is its value, HUG (or FLEX) its widest cell. */
const baseTrack = (g: N, axis: 'col' | 'row', i: number): number => {
  const s = (axis === 'col' ? g.gridColumnSizes : g.gridRowSizes)[i];
  if (s?.type === 'FIXED') return Number(s.value);
  const cells = [...((axis === 'col' ? g.byCol : g.byRow).get(i) ?? [])].filter((k) => k.visible !== false);
  return Math.max(0, ...cells.map((k) => (axis === 'col' ? (k.lsh === 'FILL' ? contentW(k) : k.width) : (k.layoutSizingVertical === 'FILL' ? contentH(k) : k.height))));
};
const tracks = (g: N, axis: 'col' | 'row'): number[] => {
  const sizes = axis === 'col' ? g.gridColumnSizes : g.gridRowSizes;
  return sizes.map((_, i) => baseTrack(g, axis, i));
};
/** A grid's tracks for the current epoch: computed on the first read after any write, then reused. */
const trackMemo = new WeakMap<N, { e: number; col?: number[]; row?: number[] }>();
const axisOf = (g: N, a: 'col' | 'row'): number[] => {
  let m = trackMemo.get(g);
  if (!m || m.e !== epoch) { m = { e: epoch }; trackMemo.set(g, m); }
  return (m[a] ??= tracks(g, a));
};
const trackW = (g: N, c: number): number => axisOf(g, 'col')[c] ?? 0;
const trackH = (g: N, r: number): number => axisOf(g, 'row')[r] ?? 0;
const hugGridW = (g: N): number => axisOf(g, 'col').reduce((a, b) => a + b, 0) + Number(g.gridColumnGap ?? 0) * Math.max(0, g.gridColumnSizes.length - 1);
const hugGridH = (g: N): number => axisOf(g, 'row').reduce((a, b) => a + b, 0) + Number(g.gridRowGap ?? 0) * Math.max(0, g.gridRowSizes.length - 1);

const page = (name: string): N => { const p = new N('PAGE'); p.name = name; return p; };

/** A text-cell or swatch set the way the owner's file has one — its own case, its own page. */
const ownerSet = (name: string, variants: string[], withSpecimen: boolean): N => {
  const set = new N('COMPONENT_SET');
  set.name = name;
  for (const v of variants) {
    const m = new N('COMPONENT');
    m.name = v;
    // The owner's node names, not ours: a text swatch holds a TEXT node named "Aa", a fill swatch a "Rectangle 12",
    // and `type=default` has NO layers — its fill sits on the component itself (live, 2026-09-28).
    if (withSpecimen) m.resize(48, 48);
    if (withSpecimen && /text/i.test(v)) { const t = new N('TEXT'); t.name = 'Aa'; t.characters = 'Aa'; t.fills = [{ type: 'SOLID' }]; m.appendChild(t); }
    else if (withSpecimen && /default/i.test(v)) m.fills = [{ type: 'SOLID' }];
    else if (withSpecimen) { const s = new N('FRAME'); s.name = 'Rectangle 12'; s.fills = [{ type: 'SOLID' }]; m.appendChild(s); }
    else {
      // A text cell a fixed 120px wide, its label filling it and clipping what does not fit — the owner's cells, with
      // their padding (24 left, 40 right) and their label, a 29px text named "100", as measured live.
      m.layoutMode = 'HORIZONTAL'; m.primaryAxisSizingMode = 'FIXED'; m.paddingLeft = 24; m.paddingRight = 40; m.lsh = 'FIXED'; m.resize(120, 44);
      const t = new N('TEXT'); t.name = '100'; t.characters = 'Abc 123'; t.fontName = { family: 'Inter', style: 'Regular' }; t.w = 29;
      t.textAutoResize = 'TRUNCATE'; t.textTruncation = 'ENDING'; m.appendChild(t); t.lsh = 'FILL';
    }
    set.appendChild(m);
  }
  return set;
};

/**
 * THE OWNER'S SPACING CELLS, copied from their test file as measured live (2026-09-29, the live run of `4faeb98a`,
 * where every one of 41 "Dimension — nbds" rows drew the same 8px bracket and the run read "unbound: 0"). Each member
 * is a 72 × 83 HORIZONTAL auto-layout that hugs; its one child is a frame without auto layout, constrained MIN/MIN:
 * `spacing-filled-example` (8 × 20, clipped, one fill), and `spacing-line-example` (8 × 16) holding three rectangles,
 * `left-bar` (1 × 16 at 0,0), `horizontal-line` (8 × 1 at 0,8) and `right-bar` (1 × 16 at 7,0), every one MIN/MIN.
 * `kind: 'odd'` is a set this build cannot read: each member holds a text label and nothing else.
 */
const ownerSpacingSet = (kind: 'owner' | 'odd' | 'renamed' | 'inflow' | 'restructured' | 'rest8' = 'owner'): N => {
  const set = new N('COMPONENT_SET');
  set.name = '_style-guide-spacing-cells';
  for (const display of ['filled', 'line']) {
    const m = new N('COMPONENT');
    m.name = `display=${display}`;
    m.layoutMode = 'HORIZONTAL'; m.primaryAxisSizingMode = 'AUTO'; m.counterAxisSizingMode = 'AUTO';
    m.paddingLeft = 32; m.paddingRight = 32; m.paddingTop = display === 'filled' ? 31.5 : 33.5; m.paddingBottom = m.paddingTop;
    const mm = { horizontal: 'MIN', vertical: 'MIN' };
    if (kind === 'restructured' || kind === 'rest8') {
      // THE OWNER'S CELLS AS RESTRUCTURED (2026-09-29, with the owner's OK, verified live): each example frame a
      // HORIZONTAL auto layout that hugs (primary AUTO), counter FIXED (20 filled, 16 line), the paddings and
      // itemSpacing 0; the line's bars ABSOLUTE: left-bar 0,0 1×16 MIN, horizontal-line 0,7.5 8×1 STRETCH, right-bar
      // 7,0 1×16 MAX, all vertical MIN, set on an 8px frame. Then (live QA of 0.210.0, 2026-09-30) the owner set
      // paddingLeft 0 and resized the frame to 0.01 before HUG, so it rests at 0.01. `rest8` is the tree before that:
      // paddingLeft 8, resting 8 wide. Typed here from the orchestrator's measurement.
      const f = new N('FRAME'); f.name = `spacing-${display}-example`; f.w = 8; f.h = display === 'filled' ? 20 : 16;
      f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'FIXED';
      f.paddingLeft = kind === 'rest8' ? 8 : 0; f.paddingRight = 0; f.paddingTop = 0; f.paddingBottom = 0; f.itemSpacing = 0;
      f.fills = display === 'filled' ? [{ type: 'SOLID' }] : [];
      m.appendChild(f);
      if (display === 'line') for (const [name, w, h, x, y, hz] of [['left-bar', 1, 16, 0, 0, 'MIN'], ['horizontal-line', 8, 1, 0, 7.5, 'STRETCH'], ['right-bar', 1, 16, 7, 0, 'MAX']] as const) {
        const r = new N('RECTANGLE'); r.name = name; r.w = w; r.h = h; r.fills = [{ type: 'SOLID' }];
        f.appendChild(r);
        r.layoutPositioning = 'ABSOLUTE'; r.x = x; r.y = y; r.constraints = { horizontal: hz, vertical: 'MIN' };
      }
      if (kind === 'restructured') f.w = 0.01;
    } else if (kind === 'odd') {
      const t = new N('TEXT'); t.name = 'label'; t.characters = display; t.fontName = { family: 'Inter', style: 'Regular' }; m.appendChild(t);
    } else if (display === 'filled') {
      const f = new N('FRAME'); f.name = 'spacing-filled-example'; f.w = 8; f.h = 20; f.clipsContent = true; f.fills = [{ type: 'SOLID' }]; f.constraints = mm; m.appendChild(f);
    } else {
      const f = new N('FRAME'); f.name = 'spacing-line-example'; f.w = 8; f.h = 16; f.clipsContent = false; f.fills = []; f.constraints = mm;
      // `inflow`: a hugging auto-layout frame sized by its left padding, as the fix asks, but with its bars IN FLOW, so
      // they add their widths to the padding's and the bracket is never the value's width.
      if (kind === 'inflow') { f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'FIXED'; f.paddingLeft = 8; f.paddingRight = 0; }
      // `renamed`: the same bracket with its parts named otherwise, which the finder must not pass silently.
      const names = kind === 'renamed' ? ['cap-start', 'rule', 'cap-end'] : ['left-bar', 'horizontal-line', 'right-bar'];
      for (const [i, [w, h, x, y]] of ([[1, 16, 0, 0], [8, 1, 0, 8], [1, 16, 7, 0]] as const).entries()) {
        const name = names[i];
        const r = new N('RECTANGLE'); r.name = name; r.w = w; r.h = h; r.x = x; r.y = y; r.fills = [{ type: 'SOLID' }]; r.constraints = mm; f.appendChild(r);
      }
      m.appendChild(f);
    }
    set.appendChild(m);
  }
  return set;
};
/** The owner's `type=radius` swatch, as measured live: an 83 × 83 VERTICAL member holding a 48 × 48 clipping
 *  `radius-example-container` at 18,18, and inside it `radius-example`, 256 × 96 at an 8px radius with one fill, so
 *  only its top-left corner shows through the clip. */
const ownerRadiusMember = (): N => {
  const m = new N('COMPONENT');
  m.name = 'type=radius';
  m.layoutMode = 'VERTICAL'; m.primaryAxisSizingMode = 'FIXED'; m.counterAxisSizingMode = 'FIXED'; m.lsh = 'FIXED'; m.w = 83; m.h = 83;
  const box = new N('FRAME'); box.name = 'radius-example-container'; box.w = 48; box.h = 48; box.x = 18; box.y = 18; box.clipsContent = true; box.constraints = { horizontal: 'MIN', vertical: 'MIN' };
  const ex = new N('FRAME'); ex.name = 'radius-example'; ex.w = 256; ex.h = 96; ex.cornerRadius = 8; ex.fills = [{ type: 'SOLID' }];
  box.appendChild(ex);
  m.appendChild(box);
  return m;
};

/** The `_Section-header` set the page header reads: Size members with Title/Description text. Set up file builds XL,
 *  Large, Medium and Small; a group's title takes Large (#2801). `sizes` drops one, as the owner's hand-made set has. */
const headerSet = (name = '_Section-header', sizes: readonly string[] = ['XL', 'Large', 'Medium']): N => {
  const set = new N('COMPONENT_SET');
  set.name = name;
  set.componentProperties = { 'Description#1:0': { type: 'BOOLEAN', value: true } };
  for (const size of sizes) {
    const m = new N('COMPONENT');
    m.name = `Size=${size}`;
    // The owner's header component is page-wide: 2,517px, FIXED (live, 2026-09-29).
    m.lsh = 'FIXED'; m.w = 2517;
    const box = new N('FRAME'); box.name = 'Text';
    for (const [tn, tx] of [['Title', 'Section header'], ['Description', 'Descriptive Text']]) {
      const t = new N('TEXT'); t.name = tn; t.characters = tx; t.fontName = { family: 'Inter', style: tn === 'Title' ? 'Bold' : 'Regular' }; box.appendChild(t);
    }
    m.appendChild(box);
    set.appendChild(m);
  }
  return set;
};

interface Shim { api: StyleGuideApi & CellsApi; pages: N[]; vars: ShimVar[]; cols: ShimCol[]; fontFails: Set<string>; styles: ShimStyle[]; world: World; effectStyles: ShimEffectStyle[]; paintStyles: ShimPaintStyle[] }
/** A local effect style and a local paint style, as `getLocalEffectStylesAsync` and `getLocalPaintStylesAsync` return them
 *  (#2353 batch 2a). Empty unless a section adds some. */
interface ShimEffectStyle { id: string; name: string; description: string; effects: { type: string; color?: { r: number; g: number; b: number; a: number }; offset?: { x: number; y: number }; radius: number; spread?: number; visible: boolean; blendMode?: string }[] }
interface ShimPaintStyle { id: string; name: string; description: string; paints: { type: string; color?: unknown; gradientStops?: { position: number; color: { r: number; g: number; b: number; a: number }; boundVariables?: { color: { type: string; id: string } } }[]; gradientTransform?: unknown }[] }
interface ShimCol { id: string; name: string; modes: { modeId: string; name: string }[]; defaultModeId: string }
interface ShimVar { id: string; name: string; variableCollectionId: string; resolvedType: string; description: string; valuesByMode: Record<string, unknown>; scopes?: string[] }
/** A local text style as `getLocalTextStylesAsync` returns one (phase 2). */
interface ShimStyle {
  id: string; name: string; description: string; fontName: { family: string; style: string }; fontSize: number;
  lineHeight: { unit: string; value?: number }; letterSpacing: { unit: string; value: number }; paragraphSpacing: number; textDecoration: string;
  boundVariables: Record<string, { type: string; id: string }>;
}

const makeShim = (pages: N[], cols: ShimCol[], vars: ShimVar[], styles: ShimStyle[] = []): Shim => {
  const fontFails = new Set<string>();
  const effectStyles: ShimEffectStyle[] = [];
  const paintStyles: ShimPaintStyle[] = [];
  const world: World = { fonts: new Set(), loads: [], cols, vars, styles, effectStyles, paintStyles };
  const root = {
    get children() { return pages; },
    findAllWithCriteria: (c: { types: string[] }) => pages.flatMap((p) => p.findAllWithCriteria(c)),
  };
  const api = {
    root,
    loadAllPagesAsync: async () => { active = world; },
    loadFontAsync: async (f: { family: string; style: string }) => {
      if (fontFails.has(`${f.family} ${f.style}`)) throw new Error('no font');
      world.fonts.add(fontId(f));
      world.loads.push(fontId(f));
    },
    // The host adds a new frame to the CURRENT page at once, 100 × 100 at 0, 0 (#2269). A test that names a current page
    // gets that; otherwise a new frame is detached until appended, as before.
    currentPage: null as N | null,
    createFrame(): N {
      const f = new N('FRAME');
      // The host's new frame is white (#2371): a frame the plugin leaves unfilled must clear it, or it stays white.
      f.fills = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } }];
      if (this.currentPage) { f.w = 100; f.h = 100; f.x = 0; f.y = 0; this.currentPage.appendChild(f); }
      return f;
    },
    getLocalTextStylesAsync: async () => styles,
    getLocalEffectStylesAsync: async () => effectStyles,
    getLocalPaintStylesAsync: async () => paintStyles,
    createComponent: () => new N('COMPONENT'),
    // The host's default for a new text node: it sizes to its words.
    createText: () => { const t = new N('TEXT'); t.textAutoResize = 'WIDTH_AND_HEIGHT'; return t; },
    combineAsVariants: (nodes: N[], parent: N) => {
      const set = new N('COMPONENT_SET');
      for (const n of nodes) set.appendChild(n);
      parent.appendChild(set);
      set.w = 400; set.height = 400;
      (set as unknown as { addComponentProperty: () => string }).addComponentProperty = () => 'Description#9:0';
      return set;
    },
    variables: {
      getLocalVariableCollectionsAsync: async () => cols,
      getLocalVariablesAsync: async (t?: string) => vars.filter((v) => !t || v.resolvedType === t),
      setBoundVariableForPaint: (paint: object, field: string, v: { id: string }) => ({ ...paint, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }),
    },
  };
  return { api: api as unknown as StyleGuideApi & CellsApi, pages, vars, cols, fontFails, styles, world, effectStyles, paintStyles };
};

/** The prism3 variables, as a theme write leaves them: `core` (Default) and `color` (four modes). */
const prism3Variables = (): { cols: ShimCol[]; vars: ShimVar[] } => {
  const core = readJson('core.palette.json');
  const modes = ['light', 'dark', 'hc-light', 'hc-dark'];
  const byMode = modes.map((m) => readJson(`color.${m}.json`));
  const cols: ShimCol[] = [
    { id: 'VariableCollectionId:core', name: 'core', modes: [{ modeId: 'core:0', name: 'Default' }], defaultModeId: 'core:0' },
    { id: 'VariableCollectionId:color', name: 'color', modes: modes.map((m, i) => ({ modeId: `color:${i}`, name: m })), defaultModeId: 'color:0' },
    // A foreign primitive collection: unpadded steps, stored out of numeric order.
    { id: 'VariableCollectionId:legacy', name: 'legacy', modes: [{ modeId: 'legacy:0', name: 'Value' }], defaultModeId: 'legacy:0' },
  ];
  const vars: ShimVar[] = [];
  const idOf = new Map<string, string>();
  core.variables.forEach((v, i) => { const id = `VariableID:core:${i}`; idOf.set(v.name, id); vars.push({ id, name: v.name, variableCollectionId: cols[0].id, resolvedType: v.resolvedType, description: v.description, valuesByMode: { 'core:0': v.value } }); });
  byMode[0].variables.forEach((v, i) => {
    const id = `VariableID:color:${i}`;
    idOf.set(v.name, id);
    const valuesByMode: Record<string, unknown> = {};
    byMode.forEach((file, m) => {
      const mv = file.variables.find((x) => x.name === v.name)!;
      valuesByMode[`color:${m}`] = mv.alias ? { type: 'VARIABLE_ALIAS', id: idOf.get(mv.alias.name) } : mv.value;
    });
    vars.push({ id, name: v.name, variableCollectionId: cols[1].id, resolvedType: v.resolvedType, description: v.description, valuesByMode });
  });
  ['100', '5', '900', '50'].forEach((s, i) => vars.push({ id: `VariableID:legacy:${i}`, name: `legacy/ramp/${s}`, variableCollectionId: cols[2].id, resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 0.5, g: 0.5, b: 0.5, a: 1 } } }));
  return { cols, vars };
};

const input = parseDesignMd(readFileSync(join(here, '../../packages/engine/examples/prism3.design.md'), 'utf8')).input;
const contract = resolveAllModes(brandTheme(input));

/** The owner-cell Text table's width (section 2): its fourteen HUG tracks, 2,940px by the shim's own metric, with no
 *  gap between them since #2336 (the row lines are drawn; they were 2px gaps). 2,828 before the Token column printed
 *  the full path (#2372): `pds3/color/text/` is 16 characters, 16 × 7 = 112px more. */
const TEXT_OWNER_W = 2940;
/** The first three semantic tables' x in a row (decision 16): Background at the row's start, then each 160px after the
 *  one before it, whose widths the shim measures as 2,489 (Background) and 3,301 (Foreground): fourteen tracks each,
 *  with no gap between them since #2336 (2,361 and 3,173 with the thirteen 2px gaps, short names). The full path in the
 *  Token column (#2372) adds `pds3/color/background/` and `pds3/color/foreground/`, 22 characters each: 22 × 7 = 154px
 *  on 2,335 and 3,147. */
const XS_THREE = ['Background 0', `Foreground ${2489 + 160}`, `Text ${2489 + 160 + 3301 + 160}`];
/** A 120-character description widens the Text table's description column from 662 (its longest, 90 characters:
 *  630 + 16 + 16) to 872 (840 + 16 + 16): 210px. */
const WIDEN_TEXT = 210;
/** A 150-character description widens Primary — nbds's description column from 550 (its longest, 74 characters:
 *  518 + 16 + 16) to 1,082 (1,050 + 16 + 16): 532px. */
const WIDEN_PRIMARY = 532;
/** A 100-character description widens Density's description column from its "Description" header (11 characters:
 *  77 + 16 + 16 = 109) to 732 (700 + 16 + 16): 623px. */
const WIDEN_DENSITY = 623;
/** Two new steps add two rows to Dimension, each 44px (a text cell: 20 + 12 + 12), with no gap since #2336: 88px. */
const GROW_DIMENSION = 2 * 44;
/** An 80-step dimension table: 81 rows of 44px, no gaps since #2336, 3,564, and the wrapper's 40px between its header
 *  (0px tall in the shim) and its grid: 3,604px. */
const RAMP_H = 81 * 44 + 40;
/** The prism3 emission's inverse families, in file order: one table each since #2801 (the owner's change of 2026-10-16),
 *  where they were one Inverse table. */
const SEM_INVERSE = ['Inverse background', 'Inverse foreground', 'Inverse text', 'Inverse border', 'Inverse icon', 'Inverse interactive', 'Inverse disabled', 'Inverse field'];
const PRIM = '↳ Primitive tokens';
const SEM = '↳ Semantic tokens';
const FC = '↳ File Components';

/** The owner's test file: TWO roots in the same collections — `nbds/…` written first, then `pds3/…` — as a
 *  copy of the prism3 variables under `nbds/`, with new ids and every alias pointed at the nbds copy. */
const twoRootVariables = (): { cols: ShimCol[]; vars: ShimVar[] } => {
  const { cols, vars } = prism3Variables();
  const pds = vars.filter((v) => v.name.startsWith('pds3/'));
  const nbId = new Map(pds.map((v) => [v.id, v.id.replace('VariableID:', 'VariableID:nb-')]));
  const nb = pds.map((v) => ({
    ...v,
    id: nbId.get(v.id)!,
    name: v.name.replace(/^pds3\//, 'nbds/'),
    valuesByMode: Object.fromEntries(Object.entries(v.valuesByMode).map(([m, x]) => {
      const a = x as { type?: string; id?: string };
      return [m, a.type === 'VARIABLE_ALIAS' ? { type: 'VARIABLE_ALIAS', id: nbId.get(a.id!) } : x];
    })),
  }));
  return { cols, vars: [...nb, ...vars] };
};

/** PHASE 2's file (#259): the prism3 emission's dimension and font variables and its 80 text styles, as a theme write
 *  leaves them — `core` (dimension + font), `space`, `radius`, `size`, `type-sets` (desktop, mobile), `opacity` — plus
 *  two foreign collections: `density`, a dimension that varies by mode (compact 8/32, comfortable 12/40), and
 *  `metrics`, a size ramp stored out of order (16, 4, 100, 2) with a line height (24) and a letter spacing (−0.5). */
const phase2Variables = (): { cols: ShimCol[]; vars: ShimVar[]; styles: ShimStyle[] } => {
  type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
  const em = (f: string): Em[] => (JSON.parse(readFileSync(join(OUT, f), 'utf8')) as { variables: Em[] }).variables;
  const one = (id: string, name: string): ShimCol => ({ id: `VariableCollectionId:${id}`, name, modes: [{ modeId: `${id}:0`, name: 'Default' }], defaultModeId: `${id}:0` });
  const cols: ShimCol[] = [
    one('core', 'core'), one('space', 'space'), one('radius', 'radius'), one('size', 'size'),
    { id: 'VariableCollectionId:ts', name: 'type-sets', modes: [{ modeId: 'ts:0', name: 'desktop' }, { modeId: 'ts:1', name: 'mobile' }], defaultModeId: 'ts:0' },
    one('opacity', 'opacity'),
    { id: 'VariableCollectionId:density', name: 'density', modes: [{ modeId: 'density:0', name: 'compact' }, { modeId: 'density:1', name: 'comfortable' }], defaultModeId: 'density:0' },
    { id: 'VariableCollectionId:metrics', name: 'metrics', modes: [{ modeId: 'metrics:0', name: 'Default' }], defaultModeId: 'metrics:0' },
  ];
  // Every file's variables, per collection and mode, ids assigned before any alias is read.
  const sources: [string, string[], Em[][]][] = [
    ['core', ['core:0'], [[...em('core.dimension.json'), ...em('core.font.json')]]],
    ['space', ['space:0'], [em('space.json')]],
    ['radius', ['radius:0'], [em('radius.json')]],
    ['size', ['size:0'], [em('size.json')]],
    ['ts', ['ts:0', 'ts:1'], [em('type-sets.desktop.json'), em('type-sets.mobile.json')]],
    ['opacity', ['opacity:0'], [em('opacity.json')]],
  ];
  const idOf = new Map<string, string>();
  for (const [c, , files] of sources) files[0].forEach((v, i) => idOf.set(v.name, `VariableID:${c}:${i}`));
  const vars: ShimVar[] = [];
  for (const [c, modes, files] of sources) files[0].forEach((v, i) => {
    const valuesByMode: Record<string, unknown> = {};
    modes.forEach((m, k) => {
      const mv = files[k].find((x) => x.name === v.name)!;
      valuesByMode[m] = mv.alias ? { type: 'VARIABLE_ALIAS', id: idOf.get(mv.alias.name) } : mv.value;
    });
    vars.push({ id: idOf.get(v.name)!, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, valuesByMode, scopes: v.scopes });
  });
  const add = (id: string, name: string, col: string, values: Record<string, unknown>, scopes: string[], resolvedType = 'FLOAT'): void => {
    idOf.set(name, id);
    vars.push({ id, name, variableCollectionId: `VariableCollectionId:${col}`, resolvedType, description: '', valuesByMode: values, scopes });
  };
  add('VariableID:density:0', 'density/space/gap', 'density', { 'density:0': 8, 'density:1': 12 }, ['GAP']);
  add('VariableID:density:1', 'density/size/row', 'density', { 'density:0': 32, 'density:1': 40 }, ['WIDTH_HEIGHT']);
  ['16', '4', '100', '2'].forEach((st, i) => add(`VariableID:metrics:${i}`, `metrics/step/${st}`, 'metrics', { 'metrics:0': Number(st) }, ['WIDTH_HEIGHT']));
  add('VariableID:metrics:lh', 'metrics/line-height/body', 'metrics', { 'metrics:0': 24 }, ['LINE_HEIGHT']);
  add('VariableID:metrics:ls', 'metrics/letter-spacing/tight', 'metrics', { 'metrics:0': -0.5 }, ['LETTER_SPACING']);

  // The text styles, as `getLocalTextStylesAsync` returns them: the literal values (a bound one at its default mode's
  // value, as the host stores it) and each bound property's variable.
  type EmProp = { bound?: boolean; variable?: string; value?: unknown };
  const emStyles = (JSON.parse(readFileSync(join(OUT, 'text-styles.json'), 'utf8')) as { styles: { name: string; description: string; properties: Record<string, EmProp> }[] }).styles;
  const literal = (p: EmProp): unknown => {
    if (!p.bound) return p.value;
    const v = vars.find((x) => x.name === p.variable)!;
    const col = cols.find((c) => c.id === v.variableCollectionId)!;
    let raw = v.valuesByMode[col.defaultModeId] as { type?: string; id?: string } | unknown;
    while ((raw as { type?: string })?.type === 'VARIABLE_ALIAS') {
      const t = vars.find((x) => x.id === (raw as { id: string }).id)!;
      raw = Object.values(t.valuesByMode)[0];
    }
    return raw;
  };
  const styles: ShimStyle[] = emStyles.map((st, i) => {
    const p = st.properties;
    const boundVariables: Record<string, { type: string; id: string }> = {};
    for (const [k, v] of Object.entries(p)) if (v.bound) boundVariables[k] = { type: 'VARIABLE_ALIAS', id: idOf.get(v.variable!)! };
    return {
      id: `S:${i}:`, name: st.name, description: st.description,
      fontName: { family: String(literal(p.fontFamily)), style: String(literal(p.fontStyle)) },
      fontSize: Number(literal(p.fontSize)),
      lineHeight: p.lineHeight.value as { unit: string; value: number },
      letterSpacing: p.letterSpacing.value as { unit: string; value: number },
      paragraphSpacing: 0,
      textDecoration: String(p.textDecoration.value),
      boundVariables,
    };
  });
  return { cols, vars, styles };
};

/** Phase 2's file, drawn from: the pages, the header set and the cell sets Set up file builds. */
const phase2File = async (): Promise<Shim & { fc: N; prim: N; sem: N }> => {
  const fc = page(FC), prim = page(PRIM), sem = page(SEM);
  fc.appendChild(headerSet());
  const { cols, vars, styles } = phase2Variables();
  const s = makeShim([page('Cover'), prim, sem, fc], cols, vars, styles);
  await ensureStyleGuideCells(s.api, fc);
  return { ...s, fc, prim, sem };
};

const fullFile = async (variables = prism3Variables()): Promise<Shim & { fc: N; prim: N; sem: N }> => {
  const fc = page(FC), prim = page(PRIM), sem = page(SEM);
  fc.appendChild(headerSet());
  const { cols, vars } = variables;
  const s = makeShim([page('Cover'), prim, sem, fc], cols, vars);
  await ensureStyleGuideCells(s.api, fc);
  return { ...s, fc, prim, sem };
};

const setsNamed = (pages: N[], name: string): N[] => pages.flatMap((p) => p.findAllWithCriteria({ types: ['COMPONENT_SET'] })).filter((n) => n.name.toLowerCase() === name.toLowerCase());
const tablesOn = (p: N): N[] => p.findAll((n) => n.type === 'FRAME' && !!n.pluginData['prism3-style-guide']);
/** The frames directly on a page: the groups and the loose guides (#2801). Overlap is judged here: inside a group, the
 *  group's own layout places each guide. */
const pageFrames = (p: N): N[] => p.children.filter((n) => n.type === 'FRAME');
/** Every pair of a page's frames whose boxes intersect, read off the drawn frames. */
const pageOverlaps = (p: N): string[] => {
  const b = pageFrames(p).map((n) => ({ n: n.name.replace(/^Style guides? — /, ''), x: Number(n.x), y: Number(n.y), w: n.width, h: n.height }));
  return b.flatMap((a, i) => b.slice(i + 1).filter((c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h)
    .map((c) => `${a.n} ${a.x},${a.y} ${a.w}×${a.h} × ${c.n} ${c.x},${c.y} ${c.w}×${c.h}`));
};
/** A group Prism3 drew (#2801), by its title. */
const groupFrame = (p: N, title: string): N | undefined => p.children.find((n) => n.name === `Style guides — ${title}`);
/** A group's guides grid, and a guide's cell in it as `row,col`. */
const guidesOf = (g: N | undefined): N | undefined => g?.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'guides');
const cellOf = (guide: N | undefined): string => (guide ? `${guide.gridRow},${guide.gridCol}` : 'none');
const tableFrame = (p: N, title: string): N | undefined => tablesOn(p).find((n) => n.name === `Style guide — ${title}`);
/** A table's grid. A missing table or grid is a named failure and an empty frame, never a throw (#2153): a fault that
 *  loses a table must not stop the suite before the checks after it report. */
const gridOf = (wrap: N | undefined): N => {
  const g = wrap?.children.find((c) => c.name === 'Table');
  if (g) return g;
  ok(false, `gridOf: ${wrap ? `"${wrap.name}" has no Table grid` : 'a table the check expected is not drawn'}`);
  return new N('FRAME');
};
const cellAt = (grid: N, r: number, c: number): N | undefined => grid.children.find((k) => k.gridRow === r && k.gridCol === c);
const textIn = (n: N | undefined): string => (n?.findAll((k) => k.type === 'TEXT') ?? []).map((t) => t.characters).join(' | ');
/** A row, found by its Token cell: the text exactly, or else the ONE full path (#2372) that ends in it — a step or a role
 *  named the way it reads in short mode. More than one such path is no row, so a locator never picks a row silently. */
const rowOf = (grid: N, token: string, col = 0): number => {
  const tokens = grid.children.filter((k) => k.gridCol === col && k.gridRow! > 0);
  const exact = tokens.find((k) => textIn(k) === token);
  if (exact) return exact.gridRow!;
  const tail = tokens.filter((k) => textIn(k).endsWith(`/${token}`));
  return tail.length === 1 ? tail[0].gridRow! : -1;
};
/** The variable a node's paints are bound to: the bound paint among them, wherever it sits. A fill swatch paints its color
 *  over the cell's white since #2336, so its bound paint is the second, on top. */
const boundId = (paints: unknown): string | undefined => (paints as { boundVariables?: { color?: { id: string } } }[] | undefined)?.find((p) => p?.boundVariables?.color)?.boundVariables?.color?.id;
/** The width a node's content needs, read off the shim's own metric — never the plugin's arithmetic. A wrapped
 *  text needs only its box; any other text needs its words on one line. */
const need = (n: N): number => {
  if (n.type === 'TEXT') return n.textAutoResize === 'HEIGHT' ? n.width : naturalOf(n);
  const kids = n.children.filter((k) => k.visible !== false && inFlow(k));
  if (n.layoutMode === 'HORIZONTAL') return padX(n) + kids.reduce((a, k) => a + need(k), 0) + Number(n.itemSpacing ?? 0) * Math.max(0, kids.length - 1);
  if (n.layoutMode === 'VERTICAL') return padX(n) + Math.max(0, ...kids.map(need));
  // A frame that clips its content needs only its own width: the radius swatch's 128px shape shows through a 32px window.
  if (n.clipsContent === true) return n.w;
  return Math.max(n.w, ...kids.map((k) => Number(k.x) + need(k)));
};
/** Every cell of a table whose content is wider than its column's track, or whose text truncates — "row,col: need > track". */
const clipped = (grid: N): string[] => grid.children.flatMap((cell) => {
  const track = trackW(grid, cell.gridCol!);
  const cut = cell.findAll((k) => k.type === 'TEXT' && (k.textTruncation === 'ENDING' || k.textAutoResize === 'TRUNCATE')).length > 0;
  return need(cell) > track || cut ? [`${cell.gridRow},${cell.gridCol}: ${need(cell)} > ${track}${cut ? ' (truncated)' : ''}`] : [];
});

/** Every run here yields with `setImmediate`, a macrotask like the plugin's `setTimeout(0)` without its ~1ms floor:
 *  the suite's ~70 runs yield thousands of times. Section 12 injects its own counting `yieldTo`. */
const fastYield = (): Promise<void> => new Promise<void>((resolve) => { setImmediate(resolve); });
const draw = (api: StyleGuideApi, c: Parameters<typeof runStyleGuide>[1], o: StyleGuideOptions = {}, run: StyleGuideRun = {}): Promise<StyleGuideResult> =>
  runStyleGuide(api, c, o, { yieldTo: fastYield, ...run });

const main = async (): Promise<void> => {
  console.log('1. cell sets on a fresh file');
  {
    const fc = page(FC);
    fc.appendChild(headerSet());
    const s = makeShim([page('Cover'), fc], [], []);
    const r = await ensureStyleGuideCells(s.api, fc);
    ok(JSON.stringify(r.built) === JSON.stringify(['_style-guide-swatches', '_style-guide-text-cells', '_style-guide-spacing-cells']), '1: builds the three sets');
    const sw = setsNamed(s.pages, '_style-guide-swatches')[0];
    ok(sw?.parent === fc, '1: the swatch set sits on ↳ File Components');
    ok(JSON.stringify(sw?.children.map((c) => c.name)) === JSON.stringify(['type=default', 'type=text', 'type=icon', 'type=border', 'type=transparency', 'type=radius']), '1: six swatch types');
    ok(sw?.children.filter((c) => c.name !== 'type=radius').every((c) => !!c.findOne((k) => k.name === 'Specimen')), '1: every swatch but the radius has a Specimen node');
    // THE RADIUS SWATCH SHOWS ONE ROUNDED CORNER (owner decision, 2026-09-29, "keep the one"), in the owner's structure
    // and sizes as measured live: a 48 × 48 radius-example-container that CLIPS, holding a 256 × 96 radius-example at
    // its top-left, 0,0, with a radius, so only that one corner falls inside the window. Literals typed here.
    const rad = sw?.children.find((c) => c.name === 'type=radius');
    const win = rad?.findOne((k) => k.name === 'radius-example-container');
    const shape = win?.findOne((k) => k.name === 'radius-example');
    ok(win?.clipsContent === true, `1: the radius swatch's radius-example-container clips its content, so only one corner shows (clipsContent ${win?.clipsContent})`);
    ok(win?.w === 48 && win.h === 48 && shape?.parent === win && shape.w === 256 && shape.h === 96 && shape.x === 0 && shape.y === 0 && Number(shape.cornerRadius) > 0,
      `1: inside it, radius-example is 256 × 96 at 0,0 with a radius, larger than the 48 × 48 window both ways (${win?.w}×${win?.h}; ${shape?.w}×${shape?.h} at ${shape?.x},${shape?.y}, r${shape?.cornerRadius})`);
    // The spacing members, sized by their left padding (the owner's live run of 0.205.0): each member's first child is
    // a HORIZONTAL frame that hugs its width, paddingLeft 8 and no flow child; the line's three bars sit inside it
    // ABSOLUTELY, constrained in the component: left-bar MIN, horizontal-line STRETCH, right-bar MAX. Literals here.
    const sp = setsNamed(s.pages, '_style-guide-spacing-cells')[0];
    const ex = (d: string): N | undefined => sp?.children.find((c) => c.name === `display=${d}`)?.children[0];
    const shape1 = (f: N | undefined): string => `${f?.name}:${f?.layoutMode}:${f?.primaryAxisSizingMode}:${f?.counterAxisSizingMode}:${f?.width}x${f?.height}:pad ${f?.paddingLeft},${f?.paddingRight},${f?.paddingTop},${f?.paddingBottom}:gap ${f?.itemSpacing}`;
    // Rounded to 2 places: a STRETCH line on a 0.01 frame is 0.00999… in floating point.
    const rd = (v: unknown): number => Math.round(Number(v) * 100) / 100;
    const bars = (f: N | undefined): string => (f?.children ?? []).map((k) => `${k.name} ${rd(k.x)},${k.y} ${rd(k.width)}x${k.height} ${k.layoutPositioning} ${k.constraints?.horizontal}/${k.constraints?.vertical}`).join('; ');
    const lineEx = ex('line');
    // AT REST 0.01 WIDE, NO PADDING (owner decision, live QA of 0.210.0): drawn at 8 with its bars, then resized to 0.01
    // before HUG, so right-bar sits at 0.01 − 1 = −0.99 and the line is 0.01 wide. A value then grows it from there.
    ok(shape1(ex('filled')) === 'spacing-filled-example:HORIZONTAL:AUTO:FIXED:0.01x20:pad 0,0,0,0:gap 0' && shape1(lineEx) === 'spacing-line-example:HORIZONTAL:AUTO:FIXED:0.01x16:pad 0,0,0,0:gap 0'
      && bars(lineEx) === 'left-bar 0,0 1x16 ABSOLUTE MIN/MIN; horizontal-line 0,7.5 0.01x1 ABSOLUTE STRETCH/MIN; right-bar -0.99,0 1x16 ABSOLUTE MAX/MIN',
      `1: the spacing members are the owner's restructured tree exactly: hug frames 0.01×20 and 0.01×16 with no padding, the bracket's bars absolute at their literal geometry (${shape1(ex('filled'))}; ${shape1(lineEx)}; ${bars(lineEx)})`);
    // The diamond's box from the typings' transform (`rotation = atan2(-m10, m00)`, about the top-left corner):
    // a corner (px, py) lands at (x + px·cos θ + py·sin θ, y − px·sin θ + py·cos θ).
    const dia = sw?.children.find((c) => c.name === 'type=icon')?.findOne((k) => k.name === 'Specimen');
    const th = (Number(dia?.rotation) * Math.PI) / 180, dx = Number(dia?.x), dy = Number(dia?.y), dw = Number(dia?.width), dh = Number(dia?.height);
    const corners = [[0, 0], [dw, 0], [0, dh], [dw, dh]].map(([px, py]) => [dx + px * Math.cos(th) + py * Math.sin(th), dy - px * Math.sin(th) + py * Math.cos(th)]);
    const r2 = (v: number): number => Math.round(v * 100) / 100;
    const bb = [Math.min(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[1]))].map(r2);
    ok(dia?.rotation === 45 && dw === 22 && JSON.stringify(bb) === JSON.stringify([8.44, 39.56, 8.44, 39.56]), `1: the icon diamond's box is 8.44–39.56 on both axes, centered at 24 in the 48px swatch (got ${JSON.stringify(bb)})`);
    const tc = setsNamed(s.pages, '_style-guide-text-cells')[0];
    ok(tc?.children.length === 12, '1: twelve text cells');
    ok(tc?.children.some((c) => c.name === 'color=white, textAlign=left, type=value alias, padding=default'), '1: a value-alias cell');
    ok(tc?.children.every((c) => c.findAll((k) => k.type === 'TEXT' && k.name !== 'Icon').every((k) => k.characters === 'Abc 123')), '1: sample text is "Abc 123"');
    ok(JSON.stringify(setsNamed(s.pages, '_style-guide-spacing-cells')[0]?.children.map((c) => c.name)) === JSON.stringify(['display=filled', 'display=line']), '1: spacing cells filled | line');
    const again = await ensureStyleGuideCells(s.api, fc);
    ok(again.built.length === 0 && again.adopted.length === 3, '1: a second run builds nothing and adopts three');
    ok(setsNamed(s.pages, '_style-guide-swatches').length === 1, '1: still one swatch set');
  }

  console.log('2. existing sets are adopted, wherever and however named');
  {
    const fc = page(FC), sgc = page('Style Guide Components');
    const owned = ownerSet('_Style-Guide-Swatches', ['type=Default', 'type=Text'], true);
    const ownedText = ownerSet('_style-guide-text-cells', ['color=dark, textAlign=left, type=header, padding=default', 'color=white, textAlign=left, type=default, padding=default'], false);
    sgc.appendChild(owned); sgc.appendChild(ownedText);
    const s = makeShim([fc, sgc], [], []);
    const r = await ensureStyleGuideCells(s.api, fc);
    ok(JSON.stringify(r.built) === JSON.stringify(['_style-guide-spacing-cells']), '2: builds only the missing spacing set');
    ok(r.adopted.some((a) => a.name === '_Style-Guide-Swatches' && a.page === 'Style Guide Components'), '2: reports the adopted swatch set and its page');
    ok(setsNamed(s.pages, '_style-guide-swatches').length === 1, '2: the adopted swatch set is not duplicated');
    ok(owned.parent === sgc && owned.children.length === 2, '2: the adopted set is not moved or rebuilt');

    // A table drawn from the ADOPTED sets: bound through the owner's own node name, variant matched in any case.
    // The header set sits beside them, its Size=Medium at the owner's 2,517px.
    sgc.appendChild(headerSet());
    const { cols, vars } = prism3Variables();
    const sem = page(SEM);
    const s2 = makeShim([fc, sgc, sem], cols, vars);
    const run = await draw(s2.api, contract, { collections: ['color'] });
    const text = tableFrame(sem, 'Text');
    ok(!!text, '2: tables draw from adopted sets');
    const g = text ? gridOf(text) : undefined;
    const r1 = g ? rowOf(g, 'primary') : -1;
    const sw = g ? cellAt(g, r1, 1)?.children[0] : undefined;
    ok(sw?.mainComponent?.name === 'type=Text', '2: the adopted type=Text swatch is used for a text role');
    ok(boundId(sw?.findOne((k) => k.name === 'Aa')?.fills) === vars.find((v) => v.name === 'pds3/color/text/primary')!.id, '2: the owner-named node is bound');
    ok(run.misses.includes('_style-guide-text-cells has no type=value alias, color=white variant'), '2: a variant the adopted set lacks is reported by name');
    // The owner's type=default carries its fill on the component itself, with no layers inside (live: 368 misses).
    const bgT = tableFrame(sem, 'Background');
    const bgG = bgT ? gridOf(bgT) : undefined;
    // A fill is the swatch itself, filling its cell (#2331), so the cell IS the owner's layerless instance.
    const bgSw = bgG ? cellAt(bgG, rowOf(bgG, 'primary'), 1) : undefined;
    ok(bgSw?.mainComponent?.name === 'type=Default' && boundId(bgSw?.fills) === vars.find((v) => v.name === 'pds3/color/background/primary')!.id, "2: a type=default swatch with no layers binds the instance's own fill");
    ok(run.unbound === 0 && styleGuideSummary(run).headline === '✓ style guide: 18 tables', '2: nothing unbound — headline "✓ style guide: 18 tables"');
    // The owner's cells are a fixed 120px and clip; drawn, each hugs its words and no column cuts one off.
    const off = g ? clipped(g) : ['no grid'];
    ok(off.length === 0, `2: no text in the owner's cells is wider than its column (${off.slice(0, 3).join('; ')})`);
    ok(!!g && trackW(g, 1) === 99, `2: the owner's swatch column is the wider of the 80px specimen and its "light" header, 35 + 24 + 40 = 99 (got ${g ? trackW(g, 1) : '?'})`);
    // THE OWNER'S GRID MODEL (owner decision, 2026-09-29): the description never wraps. Its text hugs its words on one
    // line, and its column is the longest line — success-subtle's 90 characters, 630px — plus the owner's 24 + 40.
    const descCol = g ? g.gridColumnCount - 1 : -1;
    const ownCell = g ? cellAt(g, rowOf(g, 'success-subtle'), descCol) : undefined;
    const ownDesc = ownCell?.findOne((k) => k.type === 'TEXT');
    ok(!!g && trackW(g, descCol) === 694 && ownDesc?.textAutoResize === 'WIDTH_AND_HEIGHT' && linesOf(ownDesc) === 1 && ownCell?.width === 694,
      `2: the owner's description column is its longest line, 630 + 24 + 40 = 694, the text on one line (got ${g ? trackW(g, descCol) : '?'}, ${ownDesc?.textAutoResize}, ${ownDesc ? linesOf(ownDesc) : '?'} lines)`);
    // THE HEADER SPANS ITS TABLE (owner decision, 2026-09-29): the table is as wide as its grid, and so is its header,
    // not the header component's 2,517px. 2,854 is the owner-cell Text table's fourteen tracks and thirteen 2px gaps.
    const hdr = text?.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'header');
    ok(!!g && !!hdr && g.width === TEXT_OWNER_W && text!.width === TEXT_OWNER_W && hdr.width === TEXT_OWNER_W,
      `2: the table and its header are as wide as its grid, ${TEXT_OWNER_W}px, not the header component's 2,517 (table ${text?.width}, grid ${g?.width}, header ${hdr?.width})`);
  }

  console.log('3. the plan');
  const { cols, vars } = prism3Variables();
  const catalog: SgCatalog = { collections: cols, variables: vars };
  const plan = planStyleGuide(catalog, contract);
  const byTitle = (kind: string, title: string): SgTable | undefined => plan.tables.find((t) => t.kind === kind && t.title === title);
  {
    const sem = plan.tables.filter((t) => t.kind === 'semantic');
    ok(JSON.stringify(sem.map((t) => t.title)) === JSON.stringify(['Background', 'Foreground', 'Text', 'Interactive', 'Border', 'Icon', 'Disabled', 'Scrim', 'Veil', 'Field', ...SEM_INVERSE]), '3: color groups by family, in file order, each inverse family its own table (#2801)');
    ok(sem.every((t) => t.page === SEM), '3: semantic tables go on ↳ Semantic tokens');
    const prim = plan.tables.filter((t) => t.kind === 'primitive');
    ok(JSON.stringify(prim.map((t) => t.title)) === JSON.stringify(['Core — base', 'Primary', 'Neutral', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha', 'Legacy']), '3: primitive tables per palette');
    ok(prim.every((t) => t.page === PRIM), '3: primitive tables go on ↳ Primitive tokens');
    ok(sem.reduce((n, t) => n + t.rows.length, 0) === 268 && prim.filter((t) => t.title !== 'Legacy').reduce((n, t) => n + t.rows.length, 0) === 164, '3: every color variable is a row (268 + 164)');
    const text = byTitle('semantic', 'Text')!;
    ok(JSON.stringify(text.columns) === JSON.stringify(['Token', 'light', 'Value', 'Contrast', 'dark', 'Value', 'Contrast', 'hc-light', 'Value', 'Contrast', 'hc-dark', 'Value', 'Contrast', 'Description']), '3: a specimen, value and contrast column per mode');
    ok(JSON.stringify(byTitle('primitive', 'Neutral')!.columns) === JSON.stringify(['Token', 'Default', 'Value', 'Description']), '3: a primitive table has no contrast column');
    const tp = text.rows.find((r) => r.token === 'primary')!;
    ok(JSON.stringify(tp.cells.map((c) => contrastText(c.contrast).split('\n')[0])) === JSON.stringify(['19.42:1 — clears the 7:1 floor', '18.13:1 — clears the 7:1 floor', '21.00:1 — clears the 15:1 floor', '21.00:1 — clears the 15:1 floor']), '3: text.primary on background.primary: 19.42, 18.13, 21, 21');
    ok(tp.cells.every((c) => c.contrast?.ground === 'background/primary'), '3: text.primary measures against background/primary');
    ok(tp.cells[0].value === '#0D0D0E' && tp.cells[0].alias === 'pds3/core/palette/neutral/950', '3: text.primary light is #0D0D0E, an alias of neutral/950');
    ok(tp.display === 'text', '3: a text role draws the text swatch');
    const bg = byTitle('semantic', 'Background')!.rows.find((r) => r.token === 'primary')!;
    ok(bg.cells.every((c) => c.contrast === null), '3: background.primary has no contracted ground — its contrast reads "—"');
    ok(contrastText(null) === '—', '3: no contract reads "—"');
    const scrim = byTitle('semantic', 'Scrim')!.rows[0];
    ok(scrim.cells[0].value === '#000000 · 40%' && scrim.display === 'transparency', '3: a translucent role prints its alpha and draws the checkerboard');
    const iconOnBrand = byTitle('semantic', 'Icon')!.rows.find((r) => r.token === 'on-brand')!;
    ok(contrastText(iconOnBrand.cells[0].contrast) === '7.82:1 — clears the 4.5:1 floor\non foreground/brand', '3: icon.on-brand measures against foreground/brand');
    // A palette-step ground, in another collection: resolved in ITS default mode, not the column's (`groundModeFor`).
    const fgBrand = byTitle('semantic', 'Foreground')!.rows.find((r) => r.token === 'brand')!;
    ok(contrastText(fgBrand.cells[0].contrast) === '6.44:1 — clears the 3:1 floor\non pds3/core/palette/neutral/050', '3: foreground.brand on neutral/050, light: 6.44:1');
    // An ink-on-wash role: the ink measured over the wash composited on the ground — 19.42 on the bare ground.
    const hover = byTitle('semantic', 'Interactive')!.rows.find((r) => r.token === 'primary/overlay/hover')!;
    ok(hover.cells[0].contrast?.ink === 'text/primary' && hover.cells[0].contrast?.ground === 'background/primary' && contrastText(hover.cells[0].contrast).startsWith('15.42:1 — clears the 4.5:1 floor'), '3: text/primary over interactive.primary.overlay.hover on background.primary, light: 15.42:1');
    const noBrand = planStyleGuide(catalog, null);
    ok(noBrand.tables.every((t) => t.rows.every((r) => r.cells.every((c) => c.contrast === null))) && noBrand.notes.some((n) => n.startsWith('No saved brand')), '3: no saved brand — every contrast "—", said once');
    ok(planStyleGuide(catalog, contract, { types: ['motion'] }).tables.length === 0 && planStyleGuide(catalog, contract, { types: ['motion'] }).notes.includes('motion: not in this phase — this phase draws color, dimension, borderWidth, opacity, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, typography, shadow, gradient'), '3: a later-phase type is named, not drawn');
    ok(planStyleGuide(catalog, contract, { valueFormat: 'rgba' }).tables.find((t) => t.title === 'Scrim')!.rows[0].cells[0].value === 'rgba(0, 0, 0, 0.4)', '3: rgba format');
  }

  console.log('4. numeric order');
  {
    ok(JSON.stringify(byTitle('primitive', 'Legacy')!.rows.map((r) => r.token)) === JSON.stringify(['5', '50', '100', '900']), '4: foreign ramp in numeric order');
    ok(JSON.stringify(byTitle('primitive', 'Black alpha')!.rows.map((r) => r.token.split('/').pop())) === JSON.stringify(['5', '10', '20', '30', '40', '50', '60', '70', '80', '90']), '4: black-alpha 5 before 10');
  }

  console.log('5. the executor');
  const f = await fullFile();
  const idOf = (name: string): string => f.vars.find((v) => v.name === name)!.id;
  const first = await draw(f.api, contract);
  {
    ok(tablesOn(f.sem).length === 18 && tablesOn(f.prim).length === 11, '5: 18 semantic and 11 primitive tables');
    ok(first.tables.every((t) => t.status === 'created'), '5: every table created on a first run');
    const text = tableFrame(f.sem, 'Text')!;
    const header = text.children[0];
    ok(header?.mainComponent?.name === 'Size=Medium' && header.findOne((k) => k.name === 'Title')?.characters === 'Text', '5: the table opens with a Size=Medium header titled "Text"');
    ok(header?.componentProperties?.['Description#1:0']?.value === true, '5: the header shows its description');
    const g = gridOf(text);
    ok(g.layoutMode === 'GRID' && g.gridColumnCount === 14 && g.gridRowCount === 24, '5: a 14 × 24 grid (23 text roles + the header row)');
    // THE OWNER'S GRID MODEL (owner decision, 2026-09-29), in every table: HUG tracks both ways, every cell FILLs its
    // track on both axes, every text hugs its words on one line and nothing truncates.
    const grids = [...tablesOn(f.sem), ...tablesOn(f.prim)].map(gridOf);
    const notHug = grids.flatMap((x) => [...x.gridColumnSizes, ...x.gridRowSizes].filter((s) => s.type !== 'HUG').map((s) => `${x.parent?.name}: ${s.type}`));
    ok(grids.length === 29 && notHug.length === 0, `5: every column and row track of every table is HUG (${notHug.slice(0, 3).join('; ')})`);
    // A palette row's swatch sits in the grid itself (decision 13), so the text cells are the instances of any other set.
    const isSwatch = (k: N): boolean => k.mainComponent?.parent?.name === '_style-guide-swatches';
    const textCells = grids.flatMap((x) => x.children.filter((k) => k.type === 'INSTANCE' && !isSwatch(k)));
    const hugging = textCells.filter((k) => k.lsh !== 'FILL' || k.layoutSizingVertical !== 'FILL');
    ok(textCells.length > 0 && hugging.length === 0, `5: every text cell FILLs its track, both axes (${hugging.length} of ${textCells.length} do not)`);
    const grounds = grids.flatMap((x) => x.children.filter((k) => k.name === 'Ground'));
    ok(grounds.length > 0 && grounds.every((k) => k.lsh === 'FILL' && k.layoutSizingVertical === 'FILL'), '5: every specimen ground FILLs its track, both axes');
    // NO GAP BETWEEN TRACKS (owner, #2336 review, 2026-10-08; the 2px of 2026-09-29 were the row dividers, and showed the
    // canvas through), and a mark at its component's fixed size inside a cell that FILLs its track. 48 is the built
    // swatch member's size (48 × 48).
    const offGap = grids.filter((x) => x.gridRowGap !== 0 || x.gridColumnGap !== 0);
    ok(offGap.length === 0, `5: no table's grid has a gap between its rows or its columns: the row lines are drawn (${offGap.slice(0, 3).map((x) => `${x.parent?.name}: ${x.gridRowGap}/${x.gridColumnGap}`).join('; ')})`);
    const swatchesIn = grounds.flatMap((k) => k.children.filter((c) => c.type === 'INSTANCE'));
    const stretched = swatchesIn.filter((x) => x.lsh !== 'FIXED' || x.layoutSizingVertical !== 'FIXED' || x.width !== 48 || x.height !== 48);
    ok(swatchesIn.length === grounds.length && stretched.length === 0 && grounds.every((k) => k.width > 48),
      `5: every swatch keeps its component's 48 × 48, FIXED on both axes, inside a cell that FILLs its wider track (${stretched.length} of ${swatchesIn.length} do not: ${stretched.slice(0, 2).map((x) => `${x.lsh}/${x.layoutSizingVertical} ${x.width}×${x.height}`).join('; ')})`);
    const texts = textCells.flatMap((k) => k.findAll((x) => x.type === 'TEXT'));
    const wrapped = texts.filter((x) => x.textAutoResize !== 'WIDTH_AND_HEIGHT' || x.textTruncation !== 'DISABLED' || linesOf(x) !== String(x.characters).split('\n').length);
    ok(texts.length > 0 && wrapped.length === 0, `5: every text hugs its words — WIDTH_AND_HEIGHT, never truncated, never wrapped (${wrapped.slice(0, 3).map((x) => x.characters).join('; ')})`);
    ok(textIn(cellAt(g, 0, 1)) === 'light' && textIn(cellAt(g, 0, 13)) === 'Description', '5: header row names the columns');
    ok(cellAt(g, 0, 0)?.mainComponent?.name === 'color=dark, textAlign=left, type=header, padding=default', '5: a dark header by default');
    const r = rowOf(g, 'primary');
    ok(r === 1, '5: text/primary is the first row, named "primary" in the Text table');
    const specimens = [1, 4, 7, 10].map((c) => cellAt(g, r, c)!);
    const colorId = 'VariableCollectionId:color';
    ok(specimens.every((s, i) => s.children[0]?.explicitVariableModes[colorId] === `color:${i}`), "5: every text/primary swatch pins its column's mode");
    ok(specimens.every((s, i) => s.explicitVariableModes[colorId] === `color:${i}`), "5: every text/primary ground pins its column's mode");
    ok(specimens.every((s) => boundId(s.children[0]?.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/color/text/primary')), '5: every text/primary swatch is bound to text/primary');
    ok(specimens.every((s) => s.children[0]?.mainComponent?.name === 'type=text'), '5: text/primary uses the text swatch');
    ok(specimens.every((s) => boundId(s.fills) === idOf('pds3/color/background/primary')), '5: text/primary is drawn on background/primary');
    ok(textIn(cellAt(g, r, 2)) === '#0D0D0E | ↗ | pds3/core/palette/neutral/950', '5: the value cell carries the value and the alias chip');
    ok(textIn(cellAt(g, r, 3)) === '19.42:1 — clears the 7:1 floor\non background/primary', '5: the contrast cell reads the ratio, the floor and the ground');
    ok(textIn(cellAt(g, r, 13)) === f.vars.find((v) => v.name === 'pds3/color/text/primary')!.description, '5: the description cell');

    const inv = tableFrame(f.sem, 'Inverse text')!;
    const ig = gridOf(inv);
    const ir = rowOf(ig, 'primary');
    ok(ir > 0 && [1, 4, 7, 10].every((c) => boundId(cellAt(ig, ir, c)?.fills) === idOf('pds3/color/inverse/background/primary')), '5: inverse/text/primary is drawn on inverse/background/primary');
    const icon = gridOf(tableFrame(f.sem, 'Icon')!);
    ok(boundId(cellAt(icon, rowOf(icon, 'on-brand'), 1)?.fills) === idOf('pds3/color/foreground/brand'), '5: icon/on-brand is drawn on foreground/brand');
    const neutral = gridOf(tableFrame(f.prim, 'Neutral')!);
    const nr = rowOf(neutral, '050');
    ok(boundId(cellAt(neutral, nr, 1)?.fills) === idOf('pds3/core/palette/neutral/050'), '5: a primitive swatch is bound to its step, on the instance itself (#2336)');
    ok(cellAt(neutral, nr, 1)?.explicitVariableModes['VariableCollectionId:core'] === 'core:0', '5: a primitive swatch pins its one mode');

    // THE SPECIMEN BY ROLE (owner decision 13, 2026-09-29). A palette row: no ground, its cell the type=default swatch
    // (the alpha palettes draw type=transparency the same way). THE SWATCH FILLS ITS CELL (decision 13 as the owner
    // restated it, 2026-09-29): FILL both ways, floored at 80 × 80 (the owner's decision, 2026-09-29: close to the 83px in
    // their file, not much smaller), so it is as wide as its column, 81px (its "Default" header: 7 × 7 + 16 + 16), and
    // its row is the floor, 80px, taller than a text cell (20 + 12 + 12 = 44), not its component's 48 × 48.
    const pal = cellAt(neutral, nr, 1);
    const primGrounds = tablesOn(f.prim).flatMap((w) => gridOf(w).findAll((k) => k.name === 'Ground'));
    const primSwatches = tablesOn(f.prim).flatMap((w) => gridOf(w).children.filter((k) => k.gridRow! > 0 && k.gridCol === 1));
    const fills = (k: N): boolean => k.type === 'INSTANCE' && k.lsh === 'FILL' && k.layoutSizingVertical === 'FILL' && k.minWidth === 80 && k.minHeight === 80
      && k.width === trackW(k.parent!, k.gridCol!) && k.height === trackH(k.parent!, k.gridRow!);
    ok(pal?.type === 'INSTANCE' && pal.mainComponent?.name === 'type=default' && pal.width === 81 && pal.height === 80 && fills(pal)
      && primGrounds.length === 0 && primSwatches.length > 0 && primSwatches.every(fills),
      `5: a palette row has no ground frame: its cell is the type=default swatch, FILLing it both ways at 81 × 80, floored at 80 (${pal?.mainComponent?.name} ${pal?.lsh}/${pal?.layoutSizingVertical} ${pal?.width}×${pal?.height}; ${primGrounds.length} grounds, ${primSwatches.filter((k) => !fills(k)).length} swatches not filling)`);
    // A TALLER ROW MAKES A TALLER SWATCH: the row's value cell given 80px more top padding makes the row, and the
    // swatch in it, 124px tall (44 + 80); its neighbor row stays at the 80px floor.
    const vcell = cellAt(neutral, nr, 2)!;
    vcell.paddingTop = Number(vcell.paddingTop) + 80;
    const tall = [pal?.height, cellAt(neutral, nr + 1, 1)?.height];
    vcell.paddingTop = Number(vcell.paddingTop) - 80;
    ok(JSON.stringify(tall) === JSON.stringify([124, 80]), `5: a taller row makes a taller swatch: 124px in a row made 124px tall, 80 in the next (${tall.join(', ')})`);
    // A text role: letters, the type=text member, its "Aa" fill bound to the token, directly on its ground. No filled square.
    const tcell = cellAt(g, r, 1)!;
    const tsw = tcell.children[0];
    const letters = tsw?.findOne((k) => k.name === 'Specimen');
    const squares = tsw ? [tsw, ...tsw.findAll(() => true)].filter((k) => k.type !== 'TEXT' && Array.isArray(k.fills) && (k.fills as unknown[]).length > 0) : [];
    ok(tcell.name === 'Ground' && boundId(tcell.fills) === idOf('pds3/color/background/primary') && tsw?.mainComponent?.name === 'type=text'
      && letters?.type === 'TEXT' && letters.characters === 'Aa' && boundId(letters.fills) === idOf('pds3/color/text/primary') && squares.length === 0,
      `5: a text.* row draws letters, the type=text member with its "Aa" fill bound to the token, on its ground, with no filled square (${tsw?.mainComponent?.name}, ${letters?.type} "${letters?.characters}", ${squares.length} filled shapes)`);
    // A border role: the type=border member, its stroke bound to the token, on its ground.
    const bcell = cellAt(gridOf(tableFrame(f.sem, 'Border')!), 1, 1)!;
    const bsw = bcell.children[0];
    const firstBorder = f.vars.filter((v) => v.name.startsWith('pds3/color/border/'))[0].name;
    ok(bcell.name === 'Ground' && bsw?.mainComponent?.name === 'type=border' && boundId(bsw.findOne((k) => k.name === 'Specimen')?.strokes) === idOf(firstBorder)
      && boundId(bsw.findOne((k) => k.name === 'Specimen')?.fills) === undefined,
      `5: a border.* row draws the type=border member, its stroke bound to the token and not its fill, on its ground (${bsw?.mainComponent?.name})`);
    // A fill role: the type=default swatch IS the cell, filling it, its own fill bound to the token, on no ground (#2331,
    // #2336).
    const bgG = gridOf(tableFrame(f.sem, 'Background')!);
    const fsw = cellAt(bgG, rowOf(bgG, 'secondary'), 1)!;
    ok(fsw.type === 'INSTANCE' && fsw.mainComponent?.name === 'type=default' && fsw.lsh === 'FILL' && fsw.layoutSizingVertical === 'FILL'
      && boundId(fsw.fills) === idOf('pds3/color/background/secondary'),
      `5: a fill row's swatch fills its cell, on no ground (#2331) (${fsw.type} ${fsw.name}, ${fsw.mainComponent?.name}, ${fsw.lsh}/${String(fsw.layoutSizingVertical)})`);
    const border = gridOf(tableFrame(f.sem, 'Border')!);
    const bs = cellAt(border, 1, 1)?.children[0];
    ok(bs?.mainComponent?.name === 'type=border' && boundId(bs?.findOne((k) => k.name === 'Specimen')?.strokes) === idOf(f.vars.filter((v) => v.name.startsWith('pds3/color/border/'))[0].name), '5: a border role binds the stroke');
    // A swatch column is the wider of the specimen (48 + 16 + 16) and its header (7px a character + 16 + 16):
    // light 67 and dark 60 → 80; hc-light 88; hc-dark 81.
    const sw = [1, 4, 7, 10].map((c) => trackW(g, c));
    ok(JSON.stringify(sw) === JSON.stringify([80, 80, 88, 81]), `5: a swatch column is the wider of the specimen and its mode header: 80, 80, 88, 81 (got ${sw.join(', ')})`);
    const neutralT = tableFrame(f.prim, 'Neutral')!;
    const dflt = cellAt(gridOf(neutralT), 0, 1)?.findOne((k) => k.type === 'TEXT');
    ok(trackW(gridOf(neutralT), 1) === 81 && dflt?.characters === 'Default' && linesOf(dflt) === 1, `5: the "Default" header sits on one line in its 81px column (got ${trackW(gridOf(neutralT), 1)}, ${dflt ? linesOf(dflt) : '?'} lines)`);
    const headers = [...tablesOn(f.sem), ...tablesOn(f.prim)].flatMap((w) => gridOf(w).children.filter((k) => k.gridRow === 0).flatMap((k) => k.findAll((x) => x.type === 'TEXT')));
    ok(headers.length > 0 && headers.every((x) => linesOf(x) === 1), `5: every header in every table sits on one line (${headers.filter((x) => linesOf(x) !== 1).map((x) => x.characters).slice(0, 3).join(', ')})`);
    // Nothing wraps (owner decision, 2026-09-29): the description column is its longest line, success-subtle's 90
    // characters at 7px, plus the built cell's 16 + 16.
    const long = cellAt(g, rowOf(g, 'success-subtle'), 13);
    const longText = long?.findOne((k) => k.type === 'TEXT');
    ok(trackW(g, 13) === 662 && long?.width === 662 && longText?.textAutoResize === 'WIDTH_AND_HEIGHT' && linesOf(longText) === 1,
      `5: the description column is its longest line, 630 + 16 + 16 = 662, on one line (got ${trackW(g, 13)}, ${long?.width}, ${longText?.textAutoResize})`);
    const descs = g.children.filter((k) => k.gridCol === 13 && k.gridRow! > 0);
    ok(descs.length === 23 && descs.every((k) => k.width === 662), '5: every description cell FILLs to the column, 662, the short ones included');
    const off = [...tablesOn(f.sem), ...tablesOn(f.prim)].flatMap((w) => clipped(gridOf(w)).map((x) => `${w.name} ${x}`));
    ok(off.length === 0, `5: no cell in any table is wider than its column (${off.slice(0, 3).join('; ')})`);
    ok(JSON.stringify(neutral.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn).slice(0, 4)) === JSON.stringify(['pds3/core/palette/neutral/025', 'pds3/core/palette/neutral/050', 'pds3/core/palette/neutral/100', 'pds3/core/palette/neutral/150']),
      '5: a palette table leads with each step\'s full path, in ramp order: pds3/core/palette/neutral/025, 050, 100, 150 … (#2372)');
    const sum = styleGuideSummary(first);
    ok(sum.ok && sum.headline === '✓ style guide: 29 tables' && sum.headline.length <= 24, '5: headline "✓ style guide: 29 tables"');
  }

  console.log('6a. a deleted table is not read after it is removed (#1795)');
  {
    // The host invalidates a removed node: reading its name afterwards threw "in get_name: … does not exist" (#1795,
    // the shape of #1791 and #1794), and the shim does the same. One run deletes TWO superseded, unedited tables
    // (density's and metrics' steps regrouped under new names, their variables and bindings unchanged), and must
    // name both. It runs here, before any other test deletes a table, so a read-after-remove fails by name.
    const rm = await phase2File();
    await draw(rm.api, contract, { types: ['dimension'] });
    for (const v of rm.vars) { if (/^density\//.test(v.name)) v.name = v.name.replace(/^density\//, 'dense/'); if (/^metrics\/step\//.test(v.name)) v.name = v.name.replace('/step/', '/rung/'); }
    let threw = '';
    let rr: StyleGuideResult | null = null;
    try { rr = await draw(rm.api, contract, { types: ['dimension'] }); } catch (e) { threw = String(e); }
    ok(!threw && JSON.stringify([...(rr?.deleted ?? [])].sort()) === JSON.stringify(['Style guide — Density', 'Style guide — Step']),
      `6a: one run deletes two superseded, unedited tables and names both, reading nothing off either after it is removed (${threw || JSON.stringify(rr?.deleted)})`);
  }

  console.log('6b. a full rerun deletes every superseded table, never reads one after it is removed, and re-flows (#2704)');
  {
    // The host invalidates a removed table's whole subtree, its `_Section-header` instance's sublayers included, and
    // the shim does the same. A FULL run (no filter) whose two tables are superseded must delete both, re-flow and
    // report: on the owner's file each run deleted one, then threw reading the next frame the loop had gathered, a
    // sublayer of the deleted table's header ("in getPluginData: … instance sublayer … does not exist").
    const overlapsOn = pageOverlaps;
    const regroup = (vars: ShimVar[]): void => {
      for (const v of vars) { if (/^density\//.test(v.name)) v.name = v.name.replace(/^density\//, 'dense/'); if (/^metrics\/step\//.test(v.name)) v.name = v.name.replace('/step/', '/rung/'); }
    };
    const OLD = ['Style guide — Density', 'Style guide — Step'];
    const fr = await phase2File();
    await draw(fr.api, contract);
    const olds = OLD.map((n) => [fr.prim, fr.sem].flatMap(tablesOn).find((t) => t.name === n));
    // The precondition the defect needs: each superseded table opens with a header INSTANCE that holds a frame.
    const headerFrames = olds.map((t) => t?.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'header'))
      .map((h) => (h?.type === 'INSTANCE' ? h.findAll((k) => k.type === 'FRAME').length : 0));
    ok(headerFrames.every((n) => n > 0), `6b: each superseded table's header is an instance with a frame inside it (${headerFrames.join(', ')})`);
    regroup(fr.vars);
    let threw = '';
    let rr: StyleGuideResult | null = null;
    try { rr = await draw(fr.api, contract); } catch (e) { threw = String(e); }
    const sum = rr ? styleGuideSummary(rr) : null;
    ok(!threw && JSON.stringify([...(rr?.deleted ?? [])].sort()) === JSON.stringify(OLD) && olds.every((t) => t?.removed) && !!sum?.ok
      && overlapsOn(fr.prim).length === 0 && overlapsOn(fr.sem).length === 0,
      `6b: a full rerun deletes both superseded tables, re-flows and reports ok, reading nothing inside either after it is removed (${threw || `${JSON.stringify(rr?.deleted)}; ${sum?.headline}; ${[...overlapsOn(fr.prim), ...overlapsOn(fr.sem)].join('; ') || 'no overlap'}`})`);

    // AFTER A CRASHED RUN: the run drew every table, new ones at their anchors, then stopped before the re-flow (the
    // host refuses the delete here, as the read after it did live). The next full run lays the page out over nothing.
    const cr = await phase2File();
    await draw(cr.api, contract);
    regroup(cr.vars);
    const victim = [cr.prim, cr.sem].flatMap(tablesOn).find((t) => t.name === OLD[0])!;
    (victim as unknown as { remove: () => void }).remove = (): void => { throw new Error('in remove: refused'); };
    let crashed = '';
    try { await draw(cr.api, contract); } catch (e) { crashed = String(e); }
    const mid = overlapsOn(cr.prim).length + overlapsOn(cr.sem).length;
    delete (victim as unknown as { remove?: unknown }).remove;
    let again: StyleGuideResult | null = null;
    let threw2 = '';
    try { again = await draw(cr.api, contract); } catch (e) { threw2 = String(e); }
    ok(!!crashed && !threw2 && !!again && [cr.prim, cr.sem].flatMap(tablesOn).every((t) => !OLD.includes(t.name)) && overlapsOn(cr.prim).length === 0 && overlapsOn(cr.sem).length === 0,
      `6b: after a run that crashed before its re-flow, the next full run deletes what is superseded and overlaps nothing (${threw2 || `${crashed ? 'crashed' : 'did not crash'}, leaving ${mid} overlap${mid === 1 ? '' : 's'}; now ${[...overlapsOn(cr.prim), ...overlapsOn(cr.sem)].join('; ') || 'no overlap'}`})`);
  }

  console.log('6. rerun');
  {
    const text = tableFrame(f.sem, 'Text')!;
    const wrapId = text.id;
    const tpri = f.vars.find((v) => v.name === 'pds3/color/text/primary')!;
    tpri.valuesByMode['color:0'] = { type: 'VARIABLE_ALIAS', id: idOf('pds3/core/palette/neutral/400') };
    const gone = f.vars.findIndex((v) => v.name === 'pds3/color/text/tertiary');
    f.vars.splice(gone, 1);
    f.vars.push({ id: 'VariableID:color:new', name: 'pds3/color/text/quaternary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: 'New', valuesByMode: { 'color:0': { r: 0, g: 0, b: 0, a: 1 }, 'color:1': { r: 1, g: 1, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 0, a: 1 }, 'color:3': { r: 1, g: 1, b: 1, a: 1 } } });
    for (let i = f.vars.length - 1; i >= 0; i--) if (f.vars[i].name.startsWith('pds3/color/scrim/')) f.vars.splice(i, 1);
    const again = await draw(f.api, contract);
    ok(tablesOn(f.sem).length === 17, '6: rerun: 17 tables on the semantic page — none duplicated, the emptied Scrim deleted');
    ok(tableFrame(f.sem, 'Text')?.id === wrapId, '6: the Text table is updated in place');
    ok(tableFrame(f.sem, 'Text')!.children.filter((c) => c.name === 'Table').length === 1 && tableFrame(f.sem, 'Text')!.children.filter((c) => c.mainComponent).length === 1, '6: one grid and one header after the rerun');
    const t = again.tables.find((x) => x.title === 'Text') as Extract<TableOutcome, { status: 'updated' }>;
    ok(t?.status === 'updated', '6: reported as updated');
    ok(JSON.stringify(t?.diff) === JSON.stringify({ added: ['pds3/color/text/quaternary'], removed: ['pds3/color/text/tertiary'], changed: ['pds3/color/text/primary'], renamed: [] }), '6: reports text/quaternary added, text/tertiary removed, text/primary changed');
    const g = gridOf(tableFrame(f.sem, 'Text')!);
    ok(textIn(cellAt(g, rowOf(g, 'primary'), 3)) === '3.27:1 — below the 7:1 floor\non background/primary', '6: the refreshed contrast names the ratio and the floor it misses');
    ok(JSON.stringify(again.stale) === JSON.stringify(['Style guide — Scrim']), '6: the emptied Scrim table is superseded: stale');
    ok(!tableFrame(f.sem, 'Scrim') && JSON.stringify(again.deleted) === JSON.stringify(['Style guide — Scrim']) && again.kept.length === 0, '6: an unedited stale table is deleted');
    const s = styleGuideSummary(again);
    ok(s.summary.includes('Text: 1 added, 1 removed, 1 changed'), '6: the summary names the changes');
    ok(s.summary.includes('1 table the generator no longer draws was deleted, unedited: Style guide — Scrim'), '6: the summary names the deleted table');
  }

  console.log('7. skips');
  {
    const fc = page(FC);
    fc.appendChild(headerSet());
    const prim = page(PRIM);
    const { cols: c2, vars: v2 } = prism3Variables();
    const s = makeShim([prim, fc], c2, v2);
    await ensureStyleGuideCells(s.api, fc);
    const r = await draw(s.api, contract);
    ok(r.tables.filter((t) => t.status === 'skipped' && t.reason === 'no-page').length === 18, '7: no Semantic tokens page — 18 tables skipped');
    ok(!s.pages.some((p) => p.name === SEM), '7: the missing page is not created');
    ok(r.tables.filter((t) => t.status === 'created').length === 11, '7: the primitive tables are still drawn');
    ok(styleGuideSummary(r).summary.includes('18 tables skipped — this file has no Semantic tokens page'), '7: the skip is named in the summary');
    const partial = styleGuideSummary(r);
    ok(!partial.ok && partial.headline === '⚠ 11 drawn, 18 skipped', `7: a partial run is not a pass — headline "${partial.headline}"`);
    // #2177: the Activity drawer's lines are the summary's items, the created tables, the skip and the group drawn (#2801),
    // each in the summary's words, and joined by `. ` they are the summary, byte for byte.
    ok(partial.lines.length === 3 && partial.lines[0].startsWith('11 tables created (') && partial.lines[1] === '18 tables skipped — this file has no Semantic tokens page, and Set up file adds it'
      && partial.lines[2] === '1 group drawn: Palettes' && partial.summary === partial.lines.join('. '),
      `7 #2177: the summary's three items are its three lines (${JSON.stringify(partial.lines)})`);

    const bare = makeShim([page(PRIM), page(SEM)], c2, v2);
    const r2 = await draw(bare.api, contract);
    ok(r2.tables.length === 29 && r2.tables.every((t) => t.status === 'skipped' && t.reason === 'no-cells'), '7: no cell sets — every table skipped');
    const s2 = styleGuideSummary(r2);
    ok(!s2.ok && s2.headline === '✗ style guide skipped' && s2.summary.includes('Set up file adds them'), '7: the verdict says Set up file adds the cells');

    const nohdr = page(FC);
    const s3 = makeShim([page(PRIM), page(SEM), nohdr], c2, v2);
    await ensureStyleGuideCells(s3.api, nohdr);
    const r3 = await draw(s3.api, contract, { collections: ['core'] });
    ok(r3.tables.every((t) => t.status === 'created') && r3.misses.some((m) => m.startsWith('no _Section-header set')), '7: no header set — tables drawn, the missing header named');

    s3.fontFails.add('Inter Regular');
    const s4 = makeShim([page(PRIM), page(SEM), nohdr], c2, v2);
    s4.fontFails.add('Inter Regular');
    const r4 = await draw(s4.api, contract, { collections: ['core'] });
    ok(r4.misses.includes('Inter Regular unavailable'), '7: an unloadable font is named, not thrown');
  }

  console.log('8. keys, headers, the rerun report and fonts');
  {
    ok(byTitle('primitive', 'Legacy')!.key === 'color|VariableCollectionId:legacy|legacy/ramp' && byTitle('semantic', 'Text')!.key === 'color|VariableCollectionId:color|pds3/color/text', '8: a table is keyed by collection ID and the group\'s full path');
    ok(byTitle('semantic', 'Text')!.description === '23 text roles in color, per mode, each measured against the ground it is contracted for', '8: Text header: every role measured');
    ok(byTitle('semantic', 'Scrim')!.description === '1 scrim role in color, per mode', '8: Scrim header: no role is measured, so it does not say so');
    ok(byTitle('primitive', 'Legacy')!.description === '4 primitive colors in legacy', '8: Legacy header: nothing references it, so it does not say so');
    ok(byTitle('primitive', 'Primary')!.description === '20 primitive colors in core, each referenced by a semantic role', '8: Primary header counts its referenced steps');
    ok(byTitle('primitive', 'Accent')!.description === '20 primitive colors in core', '8: Accent header: no role references it, so it does not say so');
    ok(byTitle('semantic', 'Foreground')!.description === '13 foreground roles in color, per mode, 5 measured against the ground they are contracted for', '8: Foreground header counts its measured roles');

    const hc = { ...catalog, collections: catalog.collections.map((c) => c.name === 'color' ? { ...c, modes: [...c.modes, { modeId: 'color:9', name: 'L (HC)' }] } : c) };
    ok(planStyleGuide(hc, contract).notes.includes('The L (HC) mode in color matches no mode the brand contracts (light, dark, hc-light, hc-dark), so its contrast reads "—"'), '8: a file mode the engine does not contract is named');
    ok(!plan.notes.some((n) => n.includes('matches no mode')), '8: the four prism3 modes all match');

    const g = await fullFile();
    await draw(g.api, contract);
    const legacyKey = 'color|VariableCollectionId:legacy|legacy/ramp';
    g.vars.push({ id: 'VariableID:legacy:9', name: 'legacy/other/1', variableCollectionId: 'VariableCollectionId:legacy', resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 1, g: 0, b: 0, a: 1 } } });
    const sib = await draw(g.api, contract);
    ok(tablesOn(g.prim).filter((n) => n.pluginData['prism3-style-guide'] === legacyKey).length === 1 && tablesOn(g.prim).length === 12, '8: a sibling group added to legacy: the ramp table is kept, one new table, no duplicate');
    ok(sib.tables.find((t) => t.key === legacyKey)?.status === 'updated' && sib.stale.length === 0, '8: the ramp table is updated in place, nothing stale');
    g.cols[2].name = 'legacy renamed';
    const ren = await draw(g.api, contract);
    ok(tablesOn(g.prim).length === 12 && ren.tables.filter((t) => t.status === 'created').length === 0, '8: a renamed collection keeps its tables');

    g.vars.find((v) => v.name === 'pds3/color/text/primary')!.name = 'pds3/color/text/strong';
    const rn = await draw(g.api, contract);
    const td = (rn.tables.find((t) => t.title === 'Text') as Extract<TableOutcome, { status: 'updated' }>).diff;
    ok(JSON.stringify(td) === JSON.stringify({ added: [], removed: [], changed: [], renamed: ['pds3/color/text/primary → pds3/color/text/strong'] }), '8: a renamed variable is a rename, not an add and a remove');
    const rgba = await draw(g.api, contract, { valueFormat: 'rgba' });
    ok(rgba.tables.every((t) => t.status === 'updated' && !t.diff.added.length && !t.diff.removed.length && !t.diff.changed.length && !t.diff.renamed.length), '8: switching Hex to RGBA changes no row');

    const dim = await draw(g.api, contract, { types: ['dimension'] });
    ok(dim.tables.length === 0 && dim.stale.length === 0, '8: a dimension-only run reports no color table stale');
    const one = await draw(g.api, contract, { collections: ['core'] });
    ok(one.stale.length === 0 && one.tables.length === 10, '8: a one-collection run reports no other collection\'s table stale');

    // Mixed fonts: every text node in the cells set in two fonts, read as `figma.mixed`.
    const MIXED = Symbol('mixed');
    const m = await fullFile();
    const cells = setsNamed(m.pages, '_style-guide-text-cells')[0];
    const mix = (segments: { fontName: unknown }[]): void => { for (const t of cells.findAll((k) => k.type === 'TEXT')) { t.fontName = MIXED; t.segments = segments; } };
    const legacyCell = (sh: Shim & { prim: N }): string => textIn(cellAt(gridOf(tableFrame(sh.prim, 'Legacy')!), 1, 0));
    mix([{ fontName: { family: 'Inter', style: 'Regular' } }, { fontName: { family: 'Inter', style: 'Bold' } }]);
    const mr = await draw(m.api, contract, { collections: ['legacy'] });
    ok(legacyCell(m) === 'legacy/ramp/5' && mr.misses.length === 0, '8: a mixed-font cell loads every segment\'s font and is written');
    m.fontFails.add('Inter Bold');
    const mb = await draw(m.api, contract, { collections: ['legacy'] });
    ok(mb.misses.includes('Inter Bold unavailable'), '8: a mixed-font cell with an unloadable segment names the font');
    mix([]);
    m.fontFails.clear();
    const mu = await draw(m.api, contract, { collections: ['legacy'] });
    ok(mu.misses.includes('Text: its fonts could not be read, so the cell keeps its sample text') && legacyCell(m) === 'Abc 123', '8: a cell whose fonts cannot be read is named, not left silently at "Abc 123"');
  }

  console.log('9. two roots in one collection, unbound swatches, step order');
  {
    const two = twoRootVariables();
    const p2 = planStyleGuide({ collections: two.cols, variables: two.vars }, contract);
    const fams = ['Background', 'Foreground', 'Text', 'Interactive', 'Border', 'Icon', 'Disabled', 'Scrim', 'Veil', 'Field', ...SEM_INVERSE];
    ok(JSON.stringify(p2.tables.filter((t) => t.kind === 'semantic').map((t) => t.title)) === JSON.stringify([...fams.map((x) => `${x} — nbds`), ...fams.map((x) => `${x} — pds3`)]), '9: a two-root color collection groups by family within each root, the root named in the title');
    const pal = ['Primary', 'Neutral', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha'];
    ok(JSON.stringify(p2.tables.filter((t) => t.kind === 'primitive').map((t) => t.title)) === JSON.stringify(['Core — nbds base', ...pal.map((x) => `${x} — nbds`), 'Core — pds3 base', ...pal.map((x) => `${x} — pds3`), 'Legacy']), '9: the two Primary palettes are told apart by their root; a one-root collection names none');
    const t9 = (title: string): SgTable => p2.tables.find((t) => t.title === title)!;
    ok(t9('Text — nbds').key === 'color|VariableCollectionId:color|nbds/color/text' && t9('Primary — nbds').key === 'color|VariableCollectionId:core|nbds/core/palette/primary', '9: keys stay collection ID + full path');
    ok(t9('Text — nbds').rows[0].token === 'primary' && t9('Primary — nbds').rows[0].token === '025', '9: rows are named inside their group — "primary", "025"');
    const nbBrand = t9('Foreground — nbds').rows.find((r) => r.token === 'brand')!;
    ok(contrastText(nbBrand.cells[0].contrast) === '6.44:1 — clears the 3:1 floor\non nbds/core/palette/neutral/050', "9: an nbds role measures against nbds's own palette step");

    const f9 = await fullFile(two);
    const id9 = (name: string): string => f9.vars.find((v) => v.name === name)!.id;
    const r9 = await draw(f9.api, contract);
    ok(tablesOn(f9.sem).length === 36 && tablesOn(f9.prim).length === 21, '9: 36 semantic and 21 primitive tables');
    const ground = (root: string): string | undefined => { const g = gridOf(tableFrame(f9.sem, `Text — ${root}`)!); return boundId(cellAt(g, rowOf(g, 'primary'), 1)?.fills); };
    ok(ground('nbds') === id9('nbds/color/background/primary') && ground('pds3') === id9('pds3/color/background/primary'), "9: each root's text is drawn on its own root's background");
    ok(styleGuideSummary(r9).headline === '✓ style guide: 57 tables', `9: headline "✓ style guide: 57 tables" (got "${styleGuideSummary(r9).headline}")`);

    // A RERUN over the live run's tables: one per root for a semantic collection, keyed at the root, and primitive
    // tables titled without their root. Planted as that build left them.
    const old = new N('FRAME'); old.name = 'Style guide — Nbds'; old.pluginData['prism3-style-guide'] = 'color|VariableCollectionId:color|nbds'; f9.sem.appendChild(old);
    const prim = tableFrame(f9.prim, 'Primary — nbds')!;
    const pTitle = prim.children[0].findOne((k) => k.name === 'Title')!;
    prim.name = 'Style guide — Primary'; pTitle.characters = 'Primary';
    delete prim.pluginData['prism3-style-guide-title']; delete prim.pluginData['prism3-style-guide-description'];
    const neu = tableFrame(f9.prim, 'Neutral — nbds')!;
    const nTitle = neu.children[0].findOne((k) => k.name === 'Title')!;
    nTitle.characters = 'Grays';
    const again = await draw(f9.api, contract);
    ok(tablesOn(f9.sem).length === 37 && tablesOn(f9.prim).length === 21 && again.tables.every((t) => t.status === 'updated'), '9: rerun: every table updated in place, no duplicates');
    ok(JSON.stringify(again.replaced) === JSON.stringify(['Style guide — Nbds']) && again.stale.length === 0, '9: the per-root table is reported as replaced, not stale');
    ok(old.parent === f9.sem && JSON.stringify(again.kept) === JSON.stringify([{ name: 'Style guide — Nbds', reason: 'unrecorded' }]), '9: the per-root table has no fingerprint, so it is left in place');
    ok(styleGuideSummary(again).summary.includes('1 table the generator no longer draws was left in place — drawn before edits were tracked, so the generator never deletes it; delete it by hand if no longer needed: Style guide — Nbds'), '9: the summary names the kept table and why it is kept');
    ok(prim.name === 'Style guide — Primary — nbds' && pTitle.characters === 'Primary — nbds', `9: an earlier run's title is rewritten to name its root (${prim.name} / ${pTitle.characters})`);
    ok(nTitle.characters === 'Grays' && neu.name === 'Style guide — Neutral — nbds', '9: a title the designer typed is kept');

    // A swatch member with layers and no paint anywhere. A FILL swatch still binds: since #2336 the instance paints the
    // color itself, edge to edge, so the 75 prism3 roles that draw the plain swatch, in four modes, are 300 bound
    // swatches. A MARK still needs a layer to paint: a text member with a group and no text binds nothing, and the
    // verdict says how many: 61 text roles (a `text` segment first among text, icon and border, counted in the emitted
    // color.light.json), in four modes, 244.
    const fc = page(FC), sgc = page('Style Guide Components'), sem = page(SEM);
    const sw = ownerSet('_style-guide-swatches', ['type=Default', 'type=Text'], true);
    const def = sw.children[0]; def.fills = []; const grp = new N('GROUP'); grp.name = 'Group'; def.appendChild(grp);
    const txt = sw.children[1]; for (const k of [...txt.children]) k.remove(); txt.fills = []; const tgrp = new N('GROUP'); tgrp.name = 'Group'; txt.appendChild(tgrp);
    sgc.appendChild(sw); sgc.appendChild(ownerSet('_style-guide-text-cells', ['color=dark, textAlign=left, type=header, padding=default', 'color=white, textAlign=left, type=default, padding=default'], false));
    const u = await draw(makeShim([fc, sgc, sem], prism3Variables().cols, prism3Variables().vars).api, contract, { collections: ['color'] });
    const us = styleGuideSummary(u);
    const plainBound = tablesOn(sem).flatMap((w) => gridOf(w).children.filter((k) => k.mainComponent?.name === 'type=Default' && boundId(k.fills) !== undefined));
    ok(plainBound.length === 300, `9: a plain swatch with no layer that takes a fill still binds: the instance paints the color itself (#2336) (${plainBound.length} of 300)`);
    ok(u.unbound === 244 && !us.ok && us.headline === '⚠ 244 swatches unbound', `9: unbound swatches are not a pass — headline "${us.headline}"`);
    ok(us.summary.includes('244 swatches in type=Text have no layer that takes a fill'), `9: the summary counts them per variant (${us.summary.slice(0, 120)})`);

    // Named values first in the file's order, then the numeric steps ascending.
    const named = { collections: cols, variables: [...vars, ...['white', 'black'].map((n, i) => ({ id: `VariableID:legacy:n${i}`, name: `legacy/ramp/${n}`, variableCollectionId: 'VariableCollectionId:legacy', resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 1, g: 1, b: 1, a: 1 } } }))] };
    ok(JSON.stringify(planStyleGuide(named, contract).tables.find((t) => t.title === 'Legacy')!.rows.map((r) => r.token)) === JSON.stringify(['white', 'black', '5', '50', '100', '900']), '9: named values lead, in file order, then steps ascending');
  }

  console.log('10. groups on a rerun (#2801): Inverse colors its own group, column-aligned below; a widened guide, a guide dragged out, tables from before groups');
  {
    const r = await fullFile();
    await draw(r.api, contract, { collections: ['color'] });
    const sc = groupFrame(r.sem, 'Semantic colors')!;
    const ic = groupFrame(r.sem, 'Inverse colors')!;
    const at = (title: string): string => cellOf(tableFrame(r.sem, title));
    // INVERSE COLORS IS ITS OWN GROUP (owner decision, 2026-10-19): the defaults in Semantic colors' one row, the inverse
    // guides in their own titled frame, each in its default counterpart's column. Scrim and Veil have no inverse, so their
    // cells below stay empty; typed out here.
    const want = { Background: '0,0', Foreground: '0,1', Text: '0,2', Border: '0,3', Icon: '0,4', Interactive: '0,5', Disabled: '0,6', Scrim: '0,7', Veil: '0,8', Field: '0,9',
      'Inverse background': '0,0', 'Inverse foreground': '0,1', 'Inverse text': '0,2', 'Inverse border': '0,3', 'Inverse icon': '0,4', 'Inverse interactive': '0,5', 'Inverse disabled': '0,6', 'Inverse field': '0,9' };
    const got = Object.keys(want).map((t) => `${t} ${at(t)}`);
    const inverseTitles = Object.keys(want).filter((t) => t.startsWith('Inverse '));
    ok(!!sc && !!ic && pageFrames(r.sem).length === 2 && JSON.stringify(got) === JSON.stringify(Object.entries(want).map(([t, c]) => `${t} ${c}`))
      && guidesOf(sc)!.gridRowCount === 1 && guidesOf(sc)!.gridColumnCount === 10 && guidesOf(ic)!.gridRowCount === 1
      && Object.keys(want).every((t) => tableFrame(r.sem, t)!.parent === guidesOf(t.startsWith('Inverse ') ? ic : sc)),
      `10: Semantic colors holds the defaults in one row, and Inverse colors, a group of its own, holds every inverse guide in its default's column (${got.filter((g, i) => g !== `${Object.keys(want)[i]} ${Object.values(want)[i]}`).join(', ') || 'as typed'})`);
    ok(ic.children[0]?.findOne((k) => k.name === 'Title')?.characters === 'Inverse colors' && ic.layoutMode === 'VERTICAL',
      `10: the inverse group is titled Inverse colors (${ic.children[0]?.findOne((k) => k.name === 'Title')?.characters})`);
    // DIRECTLY BELOW, COLUMN BY COLUMN: read off the shim's layout model (an auto layout's children where it lays them,
    // a grid's columns its tracks and gaps), never off the plugin's arithmetic.
    const leftOf = (n: N): number => { let x = 0; for (let q: N | null = n; q && q.type !== 'PAGE'; q = q.parent) x += q.x; return x; };
    const cellLeft = (k: N): number => { const g = k.parent!; let x = leftOf(g); for (let c = 0; c < k.gridCol!; c++) x += trackW(g, c) + Number(g.gridColumnGap ?? 0); return x; };
    const misaligned = inverseTitles.filter((t) => cellLeft(tableFrame(r.sem, t)!) !== cellLeft(tableFrame(r.sem, t.replace('Inverse ', '').replace(/^./, (c) => c.toUpperCase()))!));
    ok(ic.y === sc.y + sc.height + 320 && misaligned.length === 0,
      `10: Inverse colors sits 320 below Semantic colors, each inverse guide starting where its default does (${ic.y} vs ${sc.y + sc.height + 320}; misaligned: ${misaligned.map((t) => `${t} ${cellLeft(tableFrame(r.sem, t)!)}`).join(', ') || 'none'})`);
    // THE GROUP'S WIDTH, read off the guides: its padding, each column as wide as the widest guide in it, above or
    // below (the two grids share their columns), 160 between.
    const colW = (g: N): number[] => Array.from({ length: guidesOf(g)!.gridColumnCount }, (_, c) => Math.max(0, ...[sc, ic].flatMap((x) => guidesOf(x)!.children).filter((k) => k.gridCol === c && (c < guidesOf(sc)!.gridColumnCount || k.parent === guidesOf(g))).map((k) => k.width)));
    const fromGuides = (g: N): number => 320 + colW(g).reduce((x, y) => x + y, 0) + 160 * (colW(g).length - 1);
    ok(sc.width === fromGuides(sc) && ic.width === fromGuides(ic), `10: each group is as wide as its columns and gaps, read off the guides (${sc.width} vs ${fromGuides(sc)}; ${ic.width} vs ${fromGuides(ic)})`);
    const text = tableFrame(r.sem, 'Text')!, border = tableFrame(r.sem, 'Border')!;
    const textW = text.width;
    const grow = (n: number, tag: string, description: string): void => { for (let i = 0; i < n; i++) r.vars.push({ id: `VariableID:color:${tag}${i}`, name: `pds3/color/text/${tag}-${i}`, variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description, valuesByMode: { 'color:0': { r: 0, g: 0, b: 0, a: 1 }, 'color:1': { r: 1, g: 1, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 0, a: 1 }, 'color:3': { r: 1, g: 1, b: 1, a: 1 } } }); };
    // A DESIGNER DRAGS Border out of the group, 5,000px below it: it stays where they put it, every run (Q5 A).
    r.sem.appendChild(border);
    border.x = 400; border.y = sc.y + sc.height + 5000;
    const [bx, by] = [border.x, border.y];
    // A new row whose description is 120 characters, 840px at the shim's 7px: the description column widens to
    // 840 + 16 + 16 = 872, and so does the table, and its column, and the group with it.
    grow(1, 'wide', 'W'.repeat(120));
    await draw(r.api, contract, { collections: ['color'] });
    ok(text.width - textW === WIDEN_TEXT && cellOf(text) === '0,2' && sc.width === fromGuides(sc), `10: a guide that widens by ${WIDEN_TEXT}px keeps its cell, and the group takes its new width (Text +${text.width - textW}, ${cellOf(text)}; group ${sc.width} vs ${fromGuides(sc)})`);
    ok(border.parent === r.sem && border.x === bx && border.y === by && border.pluginData['prism3-style-guide-in-group'] === sc.id, '10: a guide a designer dragged out of its group stays where they put it, and is not put back');
    // The grid closed over Border's empty cell, and Inverse colors follows: Inverse border, whose default is now out of the
    // group, goes past the last column, and each other inverse guide keeps its default's.
    ok(at('Scrim') === '0,6' && at('Field') === '0,8' && guidesOf(sc)!.gridColumnCount === 9 && at('Inverse field') === '0,8' && at('Inverse border') === '0,9',
      `10: the grid closes over a guide dragged out, and Inverse colors follows its columns (Scrim ${at('Scrim')}, Inverse field ${at('Inverse field')}, Inverse border ${at('Inverse border')})`);
    // TABLES FROM BEFORE GROUPS: an earlier build drew every table loose on the page, in category rows, with no group
    // record. The next run puts each in its group, and the groups stack from where those rows started.
    const old = await fullFile();
    await draw(old.api, contract, { collections: ['color', 'core'] });
    for (const p of [old.prim, old.sem]) {
      const guides = tablesOn(p);
      for (const [i, g] of guides.entries()) { p.appendChild(g); g.x = 1000 + i * 1200; g.y = 500; delete g.pluginData['prism3-style-guide-in-group']; }
      for (const g of pageFrames(p).filter((n) => !n.pluginData['prism3-style-guide'])) g.remove();
    }
    const mig = await draw(old.api, contract, { collections: ['color', 'core'] });
    const semG = groupFrame(old.sem, 'Semantic colors'), primG = groupFrame(old.prim, 'Palettes'), invG = groupFrame(old.sem, 'Inverse colors');
    ok(!!semG && !!primG && pageFrames(old.sem).length === 2 && pageFrames(old.prim).length === 1 && tablesOn(old.sem).every((g) => g.parent === guidesOf(/^Style guide — Inverse /.test(g.name) ? invG : semG))
      && semG.x === 1000 && semG.y === 500 && primG.x === 1000 && primG.y === 500 && cellOf(tableFrame(old.sem, 'Inverse text')) === '0,2' && mig.tables.every((t) => t.status === 'updated'),
      `10: tables an earlier build drew loose join their groups, updated in place, and the groups start where the rows did (${semG?.x},${semG?.y}; ${primG?.x},${primG?.y}; ${pageFrames(old.sem).length} frames on the page; Inverse text ${cellOf(tableFrame(old.sem, 'Inverse text'))}; ${mig.tables.filter((t) => t.status !== 'updated').map((t) => t.title).join(', ')}; ${tablesOn(old.sem).filter((g) => g.parent !== guidesOf(/^Style guide — Inverse /.test(g.name) ? invG : semG)).length} outside)`);

    // A host that does not keep the grid's HUG tracks is named, not drawn silently wrong.
    const q = await fullFile();
    const mk = q.api.createFrame.bind(q.api);
    (q.api as unknown as { createFrame: () => N }).createFrame = () => {
      const n = mk() as unknown as N;
      let sizes: { type: string; value?: number }[] = [];
      Object.defineProperty(n, 'gridColumnSizes', { get: () => sizes, set: (v: { type: string }[]) => { if (v.every((x) => x.type === 'FLEX')) sizes = v; } });
      return n;
    };
    const qr = await draw(q.api, contract, { collections: ['legacy'] });
    ok(qr.misses.includes('Legacy: the grid did not keep its hugging tracks, so a column may not fit its widest cell'), '10: a grid that did not keep its hugging tracks is named');
    // The same, for the ROW tracks alone: the columns kept, the rows not.
    const qrow = await fullFile();
    const mkRow = qrow.api.createFrame.bind(qrow.api);
    (qrow.api as unknown as { createFrame: () => N }).createFrame = () => {
      const n = mkRow() as unknown as N;
      let sizes: { type: string; value?: number }[] = [];
      Object.defineProperty(n, 'gridRowSizes', { get: () => sizes, set: (v: { type: string }[]) => { if (v.every((x) => x.type === 'FLEX')) sizes = v; } });
      return n;
    };
    const qrr = await draw(qrow.api, contract, { collections: ['legacy'] });
    ok(qrr.misses.includes('Legacy: the grid did not keep its hugging tracks, so a column may not fit its widest cell'), `10: a grid that did not keep its hugging ROW tracks is named (${qrr.misses.join('; ') || 'no miss'})`);

    // A header the host will not size: it refuses FILL, and `resize` leaves it at its component's 2,517px. The wrapper
    // then hugs the header, not the grid, and the verdict names the table and both widths.
    const hq = await fullFile();
    const med = setsNamed(hq.pages, '_Section-header')[0].children.find((c) => c.name === 'Size=Medium')!;
    const mkHeader = med.createInstance.bind(med);
    med.createInstance = (): N => {
      const i = mkHeader();
      Object.defineProperty(i, 'layoutSizingHorizontal', { get: () => 'FIXED', set: (v: string) => { if (v !== 'FIXED') throw new Error(`${v} refused`); } });
      i.resize = () => undefined;
      return i;
    };
    const hr = await draw(hq.api, contract, { collections: ['legacy'] });
    const legGrid = gridOf(tableFrame(hq.prim, 'Legacy')!);
    ok(hr.misses.includes(`Legacy: the header did not take the table's width, so the table is 2517px wide around a ${Math.round(legGrid.width)}px grid`) && legGrid.width < 2517,
      `10: a header the host will not size to its table is named, with the table's width and its grid's (${hr.misses.filter((m) => m.includes('header')).join('; ') || 'no miss'})`);
  }

  console.log('11. superseded tables: deleted when unedited, kept when a designer touched them');
  {
    // The legacy ramp split into two sub-palettes, same variables: its one table is now drawn as Dark and Light, so
    // `legacy/ramp` is an ancestor of both planned keys — REPLACED.
    const splitLegacy = (sh: Shim): void => {
      for (const v of sh.vars) if (v.name.startsWith('legacy/ramp/')) { const step = v.name.split('/').pop()!; v.name = `legacy/ramp/${Number(step) < 100 ? 'light' : 'dark'}/${step}`; }
    };
    // Every legacy variable deleted: its table matches no group — STALE. Run with `core` in scope too, so the run
    // still draws something and the empty-plan guard does not apply.
    const dropLegacy = (sh: Shim): void => { for (let i = sh.vars.length - 1; i >= 0; i--) if (sh.vars[i].name.startsWith('legacy/')) sh.vars.splice(i, 1); };
    const LEG = { collections: ['legacy'] };
    const WITH_CORE = { collections: ['core', 'legacy'] };
    const LEGACY = 'Style guide — Legacy';
    const names = (p: N): string[] => tablesOn(p).map((n) => n.name);
    const keptAs = (r: StyleGuideResult, reason: string): boolean => r.deleted.length === 0 && JSON.stringify(r.kept) === JSON.stringify([{ name: LEGACY, reason }]);
    const summaryOf = (r: StyleGuideResult): string => styleGuideSummary(r).summary;
    /** A file with the Legacy table drawn, `edit` applied to it by hand, then the ramp split so the table is replaced. */
    const afterEdit = async (edit: (t: N, sh: Shim & { prim: N }) => void): Promise<{ r: StyleGuideResult; t: N; sh: Shim & { prim: N }; at: { x: number; y: number; cell: string } }> => {
      const sh = await fullFile();
      await draw(sh.api, contract, LEG);
      const t = tableFrame(sh.prim, 'Legacy')!;
      edit(t, sh);
      splitLegacy(sh);
      // Where the table stood, read before the run that may delete it: a removed node cannot be read (#1795).
      const at = { x: t.x, y: t.y, cell: cellOf(t) };
      return { r: await draw(sh.api, contract, LEG), t, sh, at };
    };
    const valueCell = (t: N): N => cellAt(gridOf(t), 1, 2)!;
    const valueText = (t: N): N => valueCell(t).findOne((k) => k.type === 'TEXT')!;
    // The specimen cell. A palette row has no ground (decision 13), so its cell IS the swatch; section 5 asserts that,
    // and this reads a ground's swatch too, so these arms still run (and still mean an edit) if it ever regresses.
    const ground = (t: N): N => cellAt(gridOf(t), 1, 1)!;
    const swatch = (t: N): N => { const c = ground(t); return c.name === 'Ground' ? c.children[0] : c; };

    // THE CONTROL: the same run with nothing touched deletes the table, so every "kept" below is the edit's doing.
    const a = await afterEdit(() => {});
    const legA = a.t;
    ok(JSON.stringify(a.r.replaced) === JSON.stringify([LEGACY]) && JSON.stringify(a.r.deleted) === JSON.stringify([LEGACY]) && legA.removed
      && JSON.stringify(names(a.sh.prim)) === JSON.stringify(['Style guide — Dark', 'Style guide — Light']), `11: an unedited replaced table is deleted: Legacy, now drawn as Dark and Light (${names(a.sh.prim).join(', ')})`);
    ok(a.sh.prim.findAll((k) => k.pluginData['prism3-style-guide-part'] === 'header').length === 2, "11: the deleted table's header and cells go with it");
    // Dark and Light were drawn after Legacy in its group; with Legacy gone, the group's grid closes over it (#2801): Dark
    // takes Legacy's cell, Light the next, and the grid has no column left empty.
    const dark = tableFrame(a.sh.prim, 'Dark')!;
    const light = tableFrame(a.sh.prim, 'Light')!;
    ok(cellOf(dark) === a.at.cell && cellOf(light) === '0,1' && dark.parent === light.parent && dark.parent?.gridColumnCount === 2,
      `11: the group closes over the deleted table: Dark takes Legacy's cell ${a.at.cell}, Light the next, two columns (${cellOf(dark)}, ${cellOf(light)}; ${dark.parent?.gridColumnCount} columns)`);
    ok(summaryOf(a.r).includes('1 table the generator no longer draws was deleted, unedited: Style guide — Legacy'), '11: the summary names the deleted table');
    ok(styleGuideSummary(a.r).headline === '✓ 2 tables, 1 deleted', `11: the headline counts the deletion: "✓ 2 tables, 1 deleted" (got "${styleGuideSummary(a.r).headline}")`);

    // A VARIABLE'S VALUE MOVING is not an edit. The host repaints a bound paint's color, and carries a color
    // variable's alpha in the paint's opacity; both are replayed onto the drawn nodes here, as the host would.
    let repainted = 0;
    const e1 = await afterEdit((t, sh) => {
      const v = sh.vars.find((x) => x.name === 'legacy/ramp/100')!;
      const next = { r: 0.2, g: 0.4, b: 0.6, a: 0.4 };
      v.valuesByMode['legacy:0'] = next;
      const repaint = (ps: unknown): unknown => (Array.isArray(ps) ? ps.map((p) => {
        if ((p as { boundVariables?: { color?: { id?: string } } }).boundVariables?.color?.id !== v.id) return p;
        repainted++;
        return { ...(p as object), color: { r: next.r, g: next.g, b: next.b }, opacity: next.a };
      }) : ps);
      for (const n of [t, ...t.findAll(() => true)]) { n.fills = repaint(n.fills); n.strokes = repaint(n.strokes); }
    });
    ok(repainted > 0 && JSON.stringify(e1.r.deleted) === JSON.stringify([LEGACY]), `11: a table whose bound variable's value (and alpha) changed between runs is still deleted (${repainted} paint repainted)`);

    // EACH KIND OF HAND EDIT keeps the table: the same size throughout unless size is the edit.
    const edits: [string, (t: N, sh: Shim & { prim: N }) => void][] = [
      ['one text cell retyped (#808080 → #7F7F7F, the same length)', (t) => { const x = valueText(t); if (x.characters !== '#808080') throw new Error(`value cell reads ${x.characters}`); x.characters = '#7F7F7F'; }],
      ["a cell's fill repainted", (t) => { ground(t).fills = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 0, b: 0 } }]; }],
      ['a stroke added to a cell', (t) => { valueCell(t).strokes = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 } }]; }],
      ['a cell widened by 40px, nothing else', (t) => { const c = valueCell(t); c.resize(c.w + 40, c.h); }],
      ["a swatch's pinned mode changed", (t) => { swatch(t).explicitVariableModes['VariableCollectionId:legacy'] = 'legacy:9'; }],
      ['8px corners on a cell', (t) => { const g = ground(t); g.cornerRadius = 8; g.topLeftRadius = 8; g.topRightRadius = 8; g.bottomLeftRadius = 8; g.bottomRightRadius = 8; }],
      ['a drop shadow on the table', (t) => { t.effects = [{ type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0 }]; }],
      ['a stroke weight and alignment changed', (t) => { const g = ground(t); g.strokeWeight = 2; g.strokeAlign = 'OUTSIDE'; }],
      ["a cell's layer opacity and blend mode changed", (t) => { const c = valueCell(t); c.opacity = 0.5; c.blendMode = 'MULTIPLY'; }],
      ['one cell made bold', (t) => { valueText(t).fontName = { family: 'Inter', style: 'Bold' }; }],
      ['a fill style applied to a cell', (t) => { ground(t).fillStyleId = 'S:brand-surface,1:2'; }],
      ["a cell's auto-layout padding changed", (t) => { const c = valueCell(t); c.paddingLeft = Number(c.paddingLeft ?? 0) + 8; }],
      ["a swatch swapped to another component", (t) => { const sw = swatch(t); const other = sw.mainComponent!.parent!.children.find((m) => m !== sw.mainComponent)!; sw.mainComponent = other; }],
      ["a header's component property toggled", (t) => { const h = t.children[0]; h.componentProperties!['Description#1:0'].value = false; }],
      // The Specimen inside a swatch: its parent is not auto layout, so showing it moves no size the fingerprint reads. A
      // fill swatch draws it hidden since #2336 (the instance paints the color), so the edit shows it again.
      ['a swatch layer shown, nothing else', (t) => { const sp = swatch(t).findOne((k) => k.name === 'Specimen')!; if (swatch(t).layoutMode) throw new Error('swatch is auto layout'); sp.visible = true; }],
      ['a cell renamed in the layers panel', (t) => { const c = valueCell(t); c.name = `${c.name} (edited)`; }],
      ["the reviewer's example: a shadow, 8px corners and one cell made bold", (t) => { t.effects = [{ type: 'DROP_SHADOW', visible: true, color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8 }]; t.cornerRadius = 8; valueText(t).fontName = { family: 'Inter', style: 'Bold' }; }],
    ];
    for (const [what, edit] of edits) {
      const { r, t } = await afterEdit(edit);
      ok(keptAs(r, 'edited') && t.parent !== null, `11: a replaced table with ${what} by hand is kept, reported as edited`);
    }
    const b = await afterEdit((t) => { valueText(t).characters = '#7F7F7F'; });
    ok(summaryOf(b.r).includes('1 table the generator no longer draws was left in place — edited: Style guide — Legacy'), '11: the summary names the edited table and its reason');

    // MOVED (#2801: a guide sits in its group, which places it): dragged out of its group onto the page, into a designer's
    // frame, onto another page at the same x and y. Moved to another cell of its own group, it is still where the
    // generator keeps it, and is deleted.
    const across = await afterEdit((t, sh) => { const [x, y] = [t.x, t.y]; sh.prim.appendChild(t); t.x = x + 400; t.y = y; });
    ok(keptAs(across.r, 'moved'), '11: a guide dragged out of its group onto the page is kept, reported as moved');
    ok(summaryOf(across.r).includes('1 table the generator no longer draws was left in place — moved: Style guide — Legacy'), '11: the summary says it was moved, not edited');
    const down = await afterEdit((t) => { const g = t.parent!; g.gridColumnCount = 2; g.gridColumnSizes = [{ type: 'HUG' }, { type: 'HUG' }]; t.setGridChildPosition(0, 1); });
    ok(JSON.stringify(down.r.deleted) === JSON.stringify([LEGACY]) && down.t.removed, `11: a guide moved to another cell of its own group is still the generator's: deleted (${JSON.stringify(down.r.kept)})`);
    const nested = await afterEdit((t, sh) => {
      const sel = new N('FRAME'); sel.name = 'Frame selection'; sh.prim.appendChild(sel);
      const [x, y] = [t.x, t.y];
      sel.appendChild(t); t.x = x; t.y = y;
    });
    ok(keptAs(nested.r, 'moved') && nested.t.parent?.name === 'Frame selection', "11: a table put inside a designer's frame, at the same x and y, is kept");
    const archived = await afterEdit((t, sh) => { const arc = page('Archive'); sh.pages.push(arc); arc.appendChild(t); });
    ok(keptAs(archived.r, 'moved') && archived.t.parent?.name === 'Archive', '11: a table moved to another page at the same x and y is kept');

    // STALE, with no fingerprint: a table from before this build.
    const d = await fullFile();
    await draw(d.api, contract, WITH_CORE);
    const legD = tableFrame(d.prim, 'Legacy')!;
    delete legD.pluginData['prism3-style-guide-print']; delete legD.pluginData['prism3-style-guide-mark'];
    dropLegacy(d);
    const rd = await draw(d.api, contract, WITH_CORE);
    ok(!legD.removed && JSON.stringify(rd.stale) === JSON.stringify([LEGACY]) && keptAs(rd, 'unrecorded'), '11: a table with no fingerprint is kept');
    ok(summaryOf(rd).includes('1 table the generator no longer draws was left in place — drawn before edits were tracked, so the generator never deletes it; delete it by hand if no longer needed: Style guide — Legacy'), '11: the summary says a table from before the fingerprint is never deleted, and to delete it by hand');

    // STALE and unedited, while the run still draws core: deleted.
    const st = await fullFile();
    await draw(st.api, contract, WITH_CORE);
    dropLegacy(st);
    const rst = await draw(st.api, contract, WITH_CORE);
    ok(JSON.stringify(rst.stale) === JSON.stringify([LEGACY]) && JSON.stringify(rst.deleted) === JSON.stringify([LEGACY]) && !tableFrame(st.prim, 'Legacy'), '11: an unedited stale table is deleted while the run still draws core');

    // A frame the generator did not make, named like its table, and a DUPLICATE of the table — which carries every
    // plugin-data key, sits where the original does and holds what it holds, but is not the frame the generator wrote.
    const e = await fullFile();
    await draw(e.api, contract, WITH_CORE);
    const legE = tableFrame(e.prim, 'Legacy')!;
    const foreign = new N('FRAME'); foreign.name = LEGACY; foreign.x = 3000; foreign.y = 0; e.prim.appendChild(foreign);
    const dup = (src: N): N => {
      const n = new N(src.type);
      for (const [k, v] of Object.entries(src)) {
        if (k === 'id' || k === 'parent' || k === 'children' || k === 'mainComponent' || k === 'byCol' || k === 'byRow') continue;
        (n as Record<string, unknown>)[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
      }
      n.mainComponent = src.mainComponent;
      for (const k of src.children) {
        if (k.gridRow !== undefined && k.gridCol !== undefined) n.appendChildAt(dup(k), k.gridRow, k.gridCol);
        else n.appendChild(dup(k));
      }
      return n;
    };
    const copy = dup(legE);
    e.prim.appendChild(copy);
    ok(copy.x === legE.x && copy.y === legE.y && copy.pluginData['prism3-style-guide-print'] === legE.pluginData['prism3-style-guide-print'], '11: the copy sits on the original and carries its fingerprint');
    dropLegacy(e);
    const re = await draw(e.api, contract, WITH_CORE);
    ok(!foreign.removed && foreign.parent === e.prim && foreign.x === 3000 && foreign.y === 0 && Object.keys(foreign.pluginData).length === 0, '11: a frame the generator did not make, named like its table, is never touched');
    ok(legE.removed && copy.parent === e.prim && JSON.stringify(re.deleted) === JSON.stringify([LEGACY]) && JSON.stringify(re.kept) === JSON.stringify([{ name: LEGACY, reason: 'copied' }]), '11: a duplicate of a generator table is never deleted; the table it copies is');
    ok(summaryOf(re).includes('1 table the generator no longer draws was left in place — a copy: Style guide — Legacy'), '11: the summary says it is a copy');

    // An unedited table the host will not remove is named as such, not as edited.
    const nr = await afterEdit((t) => { (t as unknown as { remove: undefined }).remove = undefined; });
    ok(keptAs(nr.r, 'not-removable') && summaryOf(nr.r).includes('left in place — could not be deleted: Style guide — Legacy'), '11: an unedited table that cannot be removed is reported as "could not be deleted"');

    // THE RUN'S OWN GUARDS. Every variable deleted, collections kept: the run draws nothing, so nothing is deleted.
    const g0 = await fullFile();
    await draw(g0.api, contract);
    g0.vars.splice(0);
    const r0 = await draw(g0.api, contract);
    ok(r0.deleted.length === 0 && r0.kept.length === 29 && r0.kept.every((k) => k.reason === 'nothing-drawn') && tablesOn(g0.prim).length + tablesOn(g0.sem).length === 29, `11: a run that draws nothing deletes nothing: 29 tables kept (${r0.deleted.length} deleted)`);
    ok(summaryOf(r0).includes('29 tables the generator no longer draws were left in place — nothing was drawn this run: ') && summaryOf(r0).includes(' and 26 more'), '11: the summary gives the reason and caps the list at three names');
    // The variables moved to a library: no local collection, no local variable. Every table's collection is gone.
    const lib = await fullFile();
    await draw(lib.api, contract);
    lib.cols.splice(0); lib.vars.splice(0);
    const rl = await draw(lib.api, contract);
    ok(rl.deleted.length === 0 && rl.kept.length === 29 && rl.kept.every((k) => k.reason === 'no-collection'), '11: variables moved to a library: every table kept, its collection not in this file');
    // One collection gone while the rest still draw: the plan is not empty, and only the collection check keeps it.
    const g1 = await fullFile();
    await draw(g1.api, contract);
    g1.cols.splice(g1.cols.findIndex((c) => c.name === 'legacy'), 1);
    dropLegacy(g1);
    const r1 = await draw(g1.api, contract);
    ok(!!tableFrame(g1.prim, 'Legacy') && keptAs(r1, 'no-collection'), "11: a table whose collection is no longer in the file is kept while the rest are drawn");
    ok(summaryOf(r1).includes('left in place — its collection is not in this file: Style guide — Legacy'), '11: the summary says its collection is not in this file');

    // More than three deleted: the list is capped and the headline counts them.
    const many = await fullFile();
    await draw(many.api, contract, { collections: ['color'] });
    for (let i = many.vars.length - 1; i >= 0; i--) if (/^pds3\/color\/(scrim|veil|field|disabled)\//.test(many.vars[i].name)) many.vars.splice(i, 1);
    const rm = await draw(many.api, contract, { collections: ['color'] });
    ok(rm.deleted.length === 4 && summaryOf(rm).includes('4 tables the generator no longer draws were deleted, unedited: ') && summaryOf(rm).includes(' and 1 more') && styleGuideSummary(rm).headline === '✓ 14 tables, 4 deleted', `11: four deleted: three named and "and 1 more"; headline "✓ 14 tables, 4 deleted" (got "${styleGuideSummary(rm).headline}", ${rm.deleted.length})`);
  }

  console.log("12. the owner's grid model: a table dragged wider");
  {
    const rf = await fullFile();
    await draw(rf.api, contract, { collections: ['color'] });
    const t = tableFrame(rf.sem, 'Text')!;
    const g = gridOf(t);
    const hdr = t.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'header')!;
    const w0 = g.width;
    ok(w0 > 0 && t.width === w0 && hdr.width === w0, `12: the table and its header hug the grid, ${w0}px, not the header component's 2,517 (table ${t.width}, header ${hdr.width})`);
    // A designer drags the grid 140px wider; the shim fixes its width, as a drag does. Asserted is only what holds
    // whatever the host does with the extra width: every cell is as wide as its track (a FILL cell takes its track),
    // and the wrapper and header follow the grid. Whether the HUG tracks take up the extra at all is a live-check
    // (docs/45 §7): the typings define HUG as CSS `fit-content(100%)`, which does not grow past its content.
    g.resize(w0 + 140, g.height);
    const off = g.children.filter((k) => Math.abs(k.width - trackW(g, k.gridCol!)) > 1e-6);
    ok(g.lsh === 'FIXED' && off.length === 0, `12: dragged 140px wider, every cell is still as wide as its track (${off.length} off its track)`);
    ok(t.width === w0 + 140 && hdr.width === w0 + 140, `12: the table and its header follow the grid to ${w0 + 140}px (table ${t.width}, header ${hdr.width})`);
  }

  console.log('13. the tables filter: one table, or a few (#1778)');
  {
    const f13 = await fullFile(twoRootVariables());
    await draw(f13.api, contract);
    const PRIMARY = 'Primary — nbds';
    const target = tableFrame(f13.prim, PRIMARY)!;
    const PRINT = 'prism3-style-guide-print';
    const AT = 'prism3-style-guide-at';
    const others = [...tablesOn(f13.prim), ...tablesOn(f13.sem)].filter((n) => n !== target);
    const targetGrid = gridOf(target).id;
    // THE DESIGNER'S HAND, before the filtered runs (#2801: guides sit in groups). On the primitive page, the page the
    // filter draws on: the fourth table, Accent, dragged out of its group onto the page, 600px below it; and Warning,
    // reordered by hand to the end of its group. On the semantic page, which the filter does not draw on, Text — nbds
    // dragged out the same way. A filtered run must move none of them, and write no record for any.
    const palettes = groupFrame(f13.prim, 'Palettes')!;
    const accent = tableFrame(f13.prim, 'Accent — nbds')!;
    f13.prim.appendChild(accent);
    accent.x = Number(palettes.x); accent.y = Number(palettes.y) + palettes.height + 600;
    const warning = tableFrame(f13.prim, 'Warning — nbds')!;
    const pg = warning.parent!;
    pg.gridColumnCount = pg.gridColumnCount + 1; pg.gridColumnSizes = pg.gridColumnSizes.map(() => ({ type: 'HUG' }));
    warning.setGridChildPosition(0, pg.gridColumnCount - 1);
    const warningCell = cellOf(warning);
    const textNb = tableFrame(f13.sem, 'Text — nbds')!;
    f13.sem.appendChild(textNb);
    textNb.x = -5000; textNb.y = 0;
    const snap = new Map(others.map((n) => [n, { page: n.parent, grid: gridOf(n).id, print: n.pluginData[PRINT], x: n.x, y: n.y, at: n.pluginData[AT], cell: cellOf(n) }]));
    const groupsAt = new Map([...pageFrames(f13.prim), ...pageFrames(f13.sem)].map((n) => [n, { x: n.x, y: n.y, w: n.width }]));
    const p500 = f13.vars.find((v) => v.name === 'nbds/core/palette/primary/500')!;
    p500.valuesByMode['core:0'] = { r: 0.1, g: 0.2, b: 0.3, a: 1 };
    const r1 = await draw(f13.api, contract, { tables: [PRIMARY] });
    ok(others.length === 56 && r1.tables.length === 1 && r1.tables[0].title === PRIMARY && r1.tables[0].status === 'updated', `13: tables: ["${PRIMARY}"] draws that one table (${r1.tables.map((t) => `${t.title} ${t.status}`).join(', ')})`);
    const d1 = (r1.tables[0] as Extract<TableOutcome, { status: 'updated' }>).diff;
    ok(tableFrame(f13.prim, PRIMARY) === target && gridOf(target).id !== targetGrid && JSON.stringify(d1.changed) === JSON.stringify(['nbds/core/palette/primary/500']),
      '13: a filtered rerun updates its table in place: the same frame, a new grid, primary/500 reported changed');
    ok(r1.stale.length === 0 && r1.replaced.length === 0 && r1.deleted.length === 0 && r1.kept.length === 0,
      `13: the tables a filtered run skips are not stale, not replaced, not deleted and not reported (stale ${r1.stale.length}, deleted ${r1.deleted.length}, kept ${r1.kept.length})`);
    const touched = [...snap].filter(([n, x]) => n.parent !== x.page || gridOf(n).id !== x.grid || n.pluginData[PRINT] !== x.print);
    ok(tablesOn(f13.prim).length + tablesOn(f13.sem).length === 57 && touched.length === 0, `13: every other table is untouched: all 57 still drawn, each with its own grid and fingerprint (${touched.length} touched)`);
    // THE REVIEW'S PROBE (S1): a run that does not change its table's height moves nothing and records nothing: no
    // guide changes its cell, no frame on either page moves, and the guides a designer dragged out stay where they are.
    const movedAt = (m: typeof snap): N[] => [...m].filter(([n, x]) => n.x !== x.x || n.y !== x.y || cellOf(n) !== x.cell).map(([n]) => n);
    const recorded = (m: typeof snap): N[] => [...m].filter(([n, x]) => (n.pluginData[AT] ?? '') !== (x.at ?? '')).map(([n]) => n);
    const pageMoved = (): N[] => [...groupsAt].filter(([n, x]) => n.x !== x.x || n.y !== x.y).map(([n]) => n);
    ok(movedAt(snap).length === 0 && recorded(snap).length === 0 && pageMoved().length === 0 && cellOf(warning) === warningCell,
      `13: a filtered run whose table keeps its height moves no table and writes no position record — Accent stays where it was dragged, Warning keeps its cell (${movedAt(snap).length} moved: ${movedAt(snap).slice(0, 3).map((n) => n.name).join(', ')}; ${recorded(snap).length} recorded; ${pageMoved().map((n) => n.name).join(', ')})`);
    ok(textNb.x === -5000 && textNb.y === 0 && !textNb.pluginData[AT], `13: the semantic page, which the filtered run did not draw on, is not touched (Text — nbds at ${textNb.x},${textNb.y})`);
    ok(styleGuideSummary(r1).ok && styleGuideSummary(r1).headline === '✓ style guide: 1 table', `13: the verdict counts the one table (${styleGuideSummary(r1).headline})`);

    // WIDENING, then NARROWING: two new steps, one with a 150-character description, widen the table's description column,
    // and removing them narrows it back. Its group widens and narrows by exactly that (#2801: the groups stack in one
    // column, so nothing on the page moves sideways); every guide keeps its cell; Accent, dragged out by hand, stays.
    const w0 = target.width;
    const gw0 = palettes.width;
    const targetCell = cellOf(target);
    const steps = ['960', '970'].map((step, i) => ({ id: `VariableID:nb-grow:${step}`, name: `nbds/core/palette/primary/${step}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'COLOR', description: i ? '' : 'W'.repeat(150), valuesByMode: { 'core:0': { r: 0, g: 0, b: 0, a: 1 } } }));
    f13.vars.push(...steps);
    await draw(f13.api, contract, { tables: [PRIMARY] });
    ok(target.width - w0 === WIDEN_PRIMARY, `13: a 150-character description widens ${PRIMARY} by ${WIDEN_PRIMARY}px (got ${target.width - w0})`);
    ok(palettes.width - gw0 === WIDEN_PRIMARY && movedAt(snap).length === 0 && cellOf(target) === targetCell,
      `13: its group widens by exactly that, and every guide keeps its cell (Palettes +${palettes.width - gw0}; ${movedAt(snap).length} moved)`);
    ok(accent.x === groupsAt.get(accent)!.x && accent.y === groupsAt.get(accent)!.y && !accent.pluginData[AT] && cellOf(warning) === warningCell,
      `13: a guide a designer dragged out stays where they put it and gains no record, and a reordered guide keeps its cell (Accent ${accent.x},${accent.y}; Warning ${cellOf(warning)})`);
    ok([...groupsAt].filter(([n]) => n.parent === f13.sem).every(([n, x]) => n.x === x.x && n.y === x.y),
      '13: nothing on the other page moves');
    for (const st of steps) f13.vars.splice(f13.vars.indexOf(st), 1);
    await draw(f13.api, contract, { tables: [PRIMARY] });
    ok(target.width === w0 && palettes.width === gw0 && movedAt(snap).length === 0 && pageMoved().length === 0,
      `13: narrowing back narrows the group by exactly that, and moves nothing (Palettes ${palettes.width}, was ${gw0})`);
    // A FIRST-TIME TABLE FROM A FILTERED RUN joins the END of its group (#2801): one column past the last guide.
    const lastCol = Math.max(...guidesOf(palettes)!.children.map((k) => k.gridCol!));
    f13.vars.push({ id: 'VariableID:nb-new:0', name: 'nbds/core/palette/zest/100', variableCollectionId: 'VariableCollectionId:core', resolvedType: 'COLOR', description: '', valuesByMode: { 'core:0': { r: 0.9, g: 0.8, b: 0.1, a: 1 } } });
    const rz = await draw(f13.api, contract, { tables: ['Zest — nbds'] });
    const zest = tableFrame(f13.prim, 'Zest — nbds');
    ok(rz.tables[0]?.status === 'created' && zest?.parent === guidesOf(palettes) && cellOf(zest) === `0,${lastCol + 1}` && pageMoved().length === 0,
      `13: a table a filtered run draws for the first time joins the end of its group, and nothing on the page moves (${cellOf(zest)} for 0,${lastCol + 1})`);
    f13.vars.pop();
    zest?.remove();

    // NAMED IN ANY CASE, OR BY KEY.
    const r3 = await draw(f13.api, contract, { tables: ['primary — NBDS', 'color|variablecollectionid:color|pds3/color/text'] });
    ok(JSON.stringify(r3.tables.map((t) => t.title)) === JSON.stringify([PRIMARY, 'Text — pds3']) && r3.unmatched.length === 0, `13: a table is named by its title in any case, or by its key (${r3.tables.map((t) => t.title).join(', ')})`);

    // A NAME THAT MATCHES NOTHING is reported by name, with the first 8 of the 57 titles this run can draw and a count
    // of the rest, and is not a pass.
    const r4 = await draw(f13.api, contract, { tables: [PRIMARY, 'Primry — nbds'] });
    const s4 = styleGuideSummary(r4);
    const first8 = 'Core — nbds base, Primary — nbds, Neutral — nbds, Accent — nbds, Success — nbds, Warning — nbds, Info — nbds, Danger — nbds';
    ok(JSON.stringify(r4.unmatched) === JSON.stringify(['Primry — nbds']) && s4.summary.includes(`No table is titled or keyed "Primry — nbds"; the tables this run can draw are ${first8} and 49 more`),
      `13: an unknown name is reported by name, with the first 8 titles this run can draw and "and 49 more" (${s4.summary.slice(0, 160)})`);
    ok(!s4.ok && s4.headline === '⚠ 1 drawn, 1 not found', `13: an unknown name is not a pass: "⚠ 1 drawn, 1 not found" (got "${s4.headline}")`);
    const r5 = await draw(f13.api, contract, { tables: ['Nope'] });
    const s5 = styleGuideSummary(r5);
    ok(r5.tables.length === 0 && !s5.ok && s5.headline === '✗ no table matched' && r5.deleted.length === 0 && tablesOn(f13.prim).length + tablesOn(f13.sem).length === 57,
      `13: a filter that matches nothing draws nothing, deletes nothing and says so: "✗ no table matched" (got "${s5.headline}")`);
    const p13 = planStyleGuide({ collections: f13.cols, variables: f13.vars }, contract, { types: ['dimension'], tables: [PRIMARY] });
    ok(JSON.stringify(p13.unmatched) === JSON.stringify([PRIMARY]) && p13.notes.includes(`No table is titled or keyed "${PRIMARY}"; this run draws no tables`), '13: a name asked for in a run that draws no color is still reported');

    // A RENAMED GROUP, drawn under its new title by a filtered run: the new table is created, and the old one, which
    // the generator no longer draws, stays until an unfiltered run judges it — and the report says so.
    for (const v of f13.vars) if (v.name.startsWith('nbds/core/palette/info/')) v.name = v.name.replace('/info/', '/notice/');
    const r6 = await draw(f13.api, contract, { tables: ['Notice — nbds'] });
    ok(r6.tables.length === 1 && r6.tables[0].status === 'created' && !!tableFrame(f13.prim, 'Info — nbds')
      && styleGuideSummary(r6).summary.includes('Style guide — Info — nbds stays in place: the generator no longer draws it, and a run filtered to named tables deletes nothing. The next run without a Tables filter decides whether to delete it'),
      `13: a filtered run that draws a renamed group's new table says the old one stays until a run without a Tables filter (${styleGuideSummary(r6).summary.slice(0, 200)})`);
  }

  console.log('14. one table at a time, yielding to the host (#1778)');
  {
    const y = await fullFile();
    const titles = planStyleGuide({ collections: y.cols, variables: y.vars }, contract).tables.map((t) => t.title);
    // The largest table since the Inverse table split per family (#2801): Interactive, 55 roles.
    const INV = titles.indexOf('Interactive');
    const readings: StyleGuideProgress[] = [];
    const perReading = new Map<number, number>();
    let reading = -1;
    // Inside the 55-row Interactive table: the rows placed at each yield, read off the shim's own grid.
    const rowsAt: number[] = [];
    const yieldTo = async (): Promise<void> => {
      perReading.set(reading, (perReading.get(reading) ?? 0) + 1);
      if (reading === INV) {
        const t = tableFrame(y.sem, 'Interactive');
        rowsAt.push(t ? gridOf(t).children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).length : 0);
      }
      await fastYield();
    };
    await draw(y.api, contract, {}, { yieldTo, onProgress: (p) => { readings.push(p); reading = p.done; } });
    ok(INV >= 0 && JSON.stringify(readings.map((p) => `${p.done}/${p.total}`)) === JSON.stringify(Array.from({ length: 30 }, (_, i) => `${i}/29`)),
      `14: progress reads 0 of 29, then after each table 1 of 29 … 29 of 29 (${readings.slice(0, 3).map((p) => `${p.done}/${p.total}`).join(', ')}…)`);
    ok(readings[INV + 1]?.title === 'Interactive' && readings.slice(1).every((p) => p.tableMs >= 0), '14: each reading names the table just drawn and what it cost');
    const silent = Array.from({ length: 29 }, (_, i) => i + 1).filter((k) => !perReading.get(k));
    ok(silent.length === 0, `14: the host gets control back after every table (none after table ${silent.join(', ')})`);
    const gaps = rowsAt.map((n, i) => n - (i ? rowsAt[i - 1] : 0));
    // 55 is odd: the last yield inside the table falls after row 54, and the one after the table reads the next table.
    ok(rowsAt.length >= 12 && rowsAt[rowsAt.length - 1] === 54 && Math.max(...gaps) <= 10,
      `14: the 55-row Interactive table yields while its rows are placed, never more than 10 rows apart (${rowsAt.length} yields, largest gap ${Math.max(0, ...gaps)} rows)`);
  }

  console.log('15. one run at a time, through the run guard (#1785, #1957)');
  {
    // The guard `main.ts` routes the panel and the agent link through, used the way its `guarded` uses it: `busy`
    // checked, then `run`, with no await between. A run draws the prism3 file; at its third yield, mid-table, a
    // second run is asked for through the same guard.
    const guard = createRunGuard();
    const request = <T>(fn: () => Promise<T>): Promise<{ ran: true; value: T } | { ran: false; message: string }> => {
      if (guard.busy('style-guide')) return Promise.resolve({ ran: false, message: busyMessage('style-guide') });
      let value!: T;
      return guard.run('style-guide', async () => { value = await fn(); }).then(() => ({ ran: true as const, value }));
    };
    const f15 = await fullFile();
    const hold: { second?: ReturnType<typeof request<StyleGuideResult>> } = {};
    let yields = 0;
    const yieldTo = async (): Promise<void> => {
      if (++yields === 3) hold.second = request(() => draw(f15.api, contract));
      await fastYield();
    };
    const first = await request(() => draw(f15.api, contract, {}, { yieldTo }));
    const second = await hold.second;
    ok(first.ran && second?.ran === false && second.message === 'Style guides is already running. Try again when it finishes.',
      `15: a run asked for while another is mid-yield is refused, in the guard's words (${JSON.stringify(second && (second.ran ? 'ran' : second.message))})`);
    const wraps = [...tablesOn(f15.prim), ...tablesOn(f15.sem)];
    const keys = new Set(wraps.map((w) => w.pluginData['prism3-style-guide']));
    ok(wraps.length === 29 && keys.size === 29 && wraps.every((w) => w.children.filter((c) => c.name === 'Table').length === 1)
      && first.ran && first.value.tables.length === 29 && first.value.tables.every((t) => t.status === 'created')
      && pageFrames(f15.prim).length === 1 && pageFrames(f15.sem).length === 2,
      `15: exactly one set of tables results: 29, each key once, one group a page (Inverse colors with its own), each with one grid (${wraps.length} tables, ${keys.size} keys)`);
    const third = await request(() => draw(f15.api, contract, { collections: ['legacy'] }));
    ok(third.ran && !guard.busy('style-guide'), '15: once that run reports, the next is let through');
  }

  console.log('16. phase 2: dimension tables (#259)');
  const p2 = await phase2File();
  const p2Id = (name: string): string => p2.vars.find((v) => v.name === name)!.id;
  const p2First = await draw(p2.api, contract);
  /** A table's header row, as drawn. */
  const headerRow = (w: N): string[] => gridOf(w).children.filter((k) => k.gridRow === 0).sort((a, b) => a.gridCol! - b.gridCol!).map(textIn);
  /** The bar inside a spacing cell. */
  const barIn = (cell: N | undefined): N | null => cell?.findOne((k) => /^spacing-(filled|line)-example$/.test(k.name)) ?? null;
  {
    ok(JSON.stringify(tablesOn(p2.prim).map((w) => w.name.replace('Style guide — ', '')).sort()) === JSON.stringify(['Density', 'Dimension', 'Font family', 'Font size', 'Font weight', 'Letter spacing', 'Line height', 'Opacity', 'Step'])
      && JSON.stringify(tablesOn(p2.sem).map((w) => w.name.replace('Style guide — ', '')).sort()) === JSON.stringify(['Font weight roles', 'Radius', 'Size', 'Space', 'Text styles']),
      `16: a table per collection and type, the scales on ↳ Primitive tokens and the roles on ↳ Semantic tokens (${tablesOn(p2.prim).map((w) => w.name).join(', ')} | ${tablesOn(p2.sem).map((w) => w.name).join(', ')})`);
    ok(p2First.tables.length === 14 && p2First.tables.every((t) => t.status === 'created') && styleGuideSummary(p2First).headline === '✓ style guide: 14 tables', `16: 14 tables, all created: "${styleGuideSummary(p2First).headline}"`);
    const space = tableFrame(p2.sem, 'Space')!;
    const sg = gridOf(space);
    ok(JSON.stringify(headerRow(space)) === JSON.stringify(['Token', 'Default', 'Value', 'REM', 'Description']), `16: a dimension table is Token · <mode> · Value · REM · Description, REM in its own column, no contrast column (${headerRow(space).join(' · ')})`);
    // THE SPECIMEN: the spacing cell's filled bar at the value's width, its width bound to the variable, pinned to its mode.
    const r050 = rowOf(sg, '050');
    const cell = cellAt(sg, r050, 1);
    const bar = barIn(cell);
    ok(cell?.mainComponent?.name === 'display=filled' && bar?.width === 4 && bar?.boundVariables.paddingLeft?.id === p2Id('pds3/space/050') && cell.explicitVariableModes['VariableCollectionId:space'] === 'space:0',
      `16: space/050 draws the filled spacing bar at 4px, its left padding bound to space/050 and pinned to the space mode (${cell?.mainComponent?.name}, ${bar?.width}px, bound ${bar?.boundVariables.paddingLeft?.id})`);
    // LIVE: the bar follows its variable with no rerun. The first padding bind can freeze the frame at FIXED at the
    // width it gave; the run sets HUG again after it, so a new value (dimension/4, which space/050 aliases, set to 5)
    // reaches the bar. Restored after.
    const d4 = p2.vars.find((v) => v.name === 'pds3/core/dimension/4')!;
    d4.valuesByMode['core:0'] = 5;
    const live = bar?.width;
    d4.valuesByMode['core:0'] = 4;
    ok(live === 5 && bar?.lsh === 'HUG', `16: the bar follows its variable live, with no rerun: dimension/4 set to 5 makes space/050's bar 5px (${live}px, ${bar?.lsh})`);
    // REM IS AN ADDITION, NEVER IN THE VALUE'S CELL (owner decision, 2026-09-29): the value cell is px and the alias
    // chip; the REM column after it is REM at a 16px base, alone.
    ok(textIn(cellAt(sg, r050, 2)) === '4px | ↗ | pds3/core/dimension/4' && textIn(cellAt(sg, r050, 3)) === '0.25rem',
      `16: its value cell reads px with its alias, and the REM column beside it REM at a 16px base: "${textIn(cellAt(sg, r050, 2))}" ‖ "${textIn(cellAt(sg, r050, 3))}"`);
    ok(textIn(cellAt(sg, rowOf(sg, '1200'), 2)) === '96px | ↗ | pds3/core/dimension/96' && textIn(cellAt(sg, rowOf(sg, '1200'), 3)) === '6rem', `16: space/1200 reads "96px", and "6rem" in its REM column (${textIn(cellAt(sg, rowOf(sg, '1200'), 2))} ‖ ${textIn(cellAt(sg, rowOf(sg, '1200'), 3))})`);
    ok(JSON.stringify(sg.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn)) === JSON.stringify(['0', '025', '050', '075', '100', '150', '200', '250', '300', '400', '500', '600', '700', '800', '900', '1000', '1100', '1200'].map((st) => `pds3/space/${st}`)),
      '16: the space scale in ramp order, 1000 after 900');
    // NUMERIC SORT: the metrics ramp is stored 16, 4, 100, 2.
    const step = gridOf(tableFrame(p2.prim, 'Step')!);
    const stepRows = step.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn);
    ok(JSON.stringify(stepRows) === JSON.stringify(['metrics/step/2', 'metrics/step/4', 'metrics/step/16', 'metrics/step/100']), `16: a ramp stored 16, 4, 100, 2 draws 2, 4, 16, 100 (${stepRows.join(', ')})`);
    ok(cellAt(step, 1, 1)?.mainComponent?.name === 'display=filled' && barIn(cellAt(step, 4, 1))?.width === 100, '16: a size draws the run\'s one spacing style, the filled bar by default, 100px wide for 100');
    // ONE SPACING STYLE FOR THE WHOLE RUN (owner decision 18, 2026-09-29: "a stylistic choice, never chosen by role"). A
    // table with a gap, a height and a width row draws every one in the chosen style: the filled bar by default, the
    // bracket when `dimensionDisplay` is `line`, and `auto` is the default. Density here holds space/gap (GAP),
    // size/row (WIDTH_HEIGHT) and size/width (WIDTH_HEIGHT, added).
    const one = await phase2File();
    one.vars.push({ id: 'VariableID:density:w', name: 'density/size/width', variableCollectionId: 'VariableCollectionId:density', resolvedType: 'FLOAT', description: '', valuesByMode: { 'density:0': 24, 'density:1': 32 }, scopes: ['WIDTH_HEIGHT'] });
    const styles = async (o: StyleGuideOptions): Promise<string> => {
      await draw(one.api, contract, { types: ['dimension'], tables: ['Density', 'Size'], ...o });
      return [...new Set(['Density', 'Size'].flatMap((t) => gridOf(tableFrame(t === 'Size' ? one.sem : one.prim, t)!).children.filter((k) => k.gridRow! > 0 && k.gridCol === 1).map((k) => String(k.mainComponent?.name))))].join(',');
    };
    const [byDefault, byAuto, byLine] = [await styles({}), await styles({ dimensionDisplay: 'auto' }), await styles({ dimensionDisplay: 'line' })];
    ok(byDefault === 'display=filled' && byAuto === 'display=filled' && byLine === 'display=line',
      `16: gap, height and width rows all draw the run's one style: filled by default and for auto, the bracket for line, never mixed (${byDefault} | ${byAuto} | ${byLine})`);
    // MODES SIDE BY SIDE: a dimension that varies by mode draws one bound specimen per mode, each pinned.
    const dens = tableFrame(p2.prim, 'Density')!;
    const dg = gridOf(dens);
    const gap = rowOf(dg, 'space/gap');
    const [c0, c1] = [cellAt(dg, gap, 1), cellAt(dg, gap, 4)];
    ok(JSON.stringify(headerRow(dens)) === JSON.stringify(['Token', 'compact', 'Value', 'REM', 'comfortable', 'Value', 'REM', 'Description'])
      && c0?.explicitVariableModes['VariableCollectionId:density'] === 'density:0' && c1?.explicitVariableModes['VariableCollectionId:density'] === 'density:1'
      && barIn(c0)?.width === 8 && barIn(c1)?.width === 12 && barIn(c0)?.boundVariables.paddingLeft?.id === p2Id('density/space/gap') && barIn(c1)?.boundVariables.paddingLeft?.id === p2Id('density/space/gap'),
      `16: a mode-varying spacing draws a bound bar per mode, pinned: compact 8px, comfortable 12px (${barIn(c0)?.width}, ${barIn(c1)?.width})`);
    ok(textIn(cellAt(dg, gap, 2)) === '8px' && textIn(cellAt(dg, gap, 3)) === '0.5rem' && textIn(cellAt(dg, gap, 5)) === '12px' && textIn(cellAt(dg, gap, 6)) === '0.75rem',
      '16: its values per mode, each with its own REM column: "8px" · "0.5rem", "12px" · "0.75rem"');
    // RADIUS: the swatches set's type=radius member at its fixed size, its corner bound to the variable, no ground. It
    // sits in a white cell of its own that FILLs the track (#2336), so the cell is solid and its row line runs through.
    const rg = gridOf(tableFrame(p2.sem, 'Radius')!);
    const rbox = cellAt(rg, rowOf(rg, 'md'), 1);
    const md = rbox?.name === 'Cell' && rbox.lsh === 'FILL' ? rbox.children[0] : undefined;
    ok(md?.type === 'INSTANCE' && md.mainComponent?.name === 'type=radius' && md.lsh === 'FIXED' && md.width === 48 && md.height === 48
      && md.findOne((k) => k.name === 'radius-example')?.boundVariables.topLeftRadius?.id === p2Id('pds3/radius/md') && md.explicitVariableModes['VariableCollectionId:radius'] === 'radius:0',
      `16: radius/md draws the type=radius swatch, 48 × 48 and FIXED, its corner bound to radius/md (${md?.mainComponent?.name}, ${md?.width}×${md?.height})`);
    // ALL FOUR CORNERS (review of `4faeb98a`): the specimen shows the value whichever corner the member rounds.
    const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].map((k) => md?.findOne((n) => n.name === 'radius-example')?.boundVariables[k]?.id);
    ok(corners.every((id) => id === p2Id('pds3/radius/md')), `16: all four of its corners are bound to radius/md (${corners.map((id) => (id ? 'bound' : 'unbound')).join(', ')})`);
    const drawnWin = md?.findOne((n) => n.name === 'radius-example-container');
    ok(drawnWin?.clipsContent === true && drawnWin.w === 48 && drawnWin.findOne((n) => n.name === 'radius-example')?.w === 256,
      `16: the drawn radius specimen keeps the clip, so it shows one rounded corner of its 256px shape (clipsContent ${drawnWin?.clipsContent})`);
    ok(textIn(cellAt(rg, rowOf(rg, 'capsule'), 2)) === '999px' && textIn(cellAt(rg, rowOf(rg, 'capsule'), 3)) === '62.4375rem', `16: radius/capsule reads "999px", and "62.4375rem" in its REM column (${textIn(cellAt(rg, rowOf(rg, 'capsule'), 2))} ‖ ${textIn(cellAt(rg, rowOf(rg, 'capsule'), 3))})`);
    ok(tablesOn(p2.sem).concat(tablesOn(p2.prim)).every((w) => gridOf(w).findAll((k) => k.name === 'Ground').length === 0), '16: no phase-2 specimen sits on a ground');
    // The spacing cell FILLs its track, as every cell but a swatch does, and no cell is wider than its column.
    ok(cell?.lsh === 'FILL' && cell.layoutSizingVertical === 'FILL', '16: a spacing cell FILLs its track, both axes');
    const off = [...tablesOn(p2.sem), ...tablesOn(p2.prim)].flatMap((w) => clipped(gridOf(w)).map((x) => `${w.name} ${x}`));
    ok(off.length === 0, `16: no cell in any phase-2 table is wider than its column (${off.slice(0, 3).join('; ')})`);
    ok(!p2First.notes.some((n) => n.includes('Contrast')) && [...tablesOn(p2.sem), ...tablesOn(p2.prim)].every((w) => !headerRow(w).includes('Contrast')), '16: no phase-2 table has a contrast column');
  }

  console.log('17. phase 2: font variables (#259)');
  {
    /** The Text node of a font specimen. */
    const textOf = (cell: N | undefined): N | null => cell?.findOne((k) => k.type === 'TEXT') ?? null;
    const bindings = (t: N | null): string => Object.keys(t?.boundVariables ?? {}).sort().join(',');
    const size = gridOf(tableFrame(p2.prim, 'Font size')!);
    const s16 = textOf(cellAt(size, rowOf(size, '16'), 1));
    ok(s16?.characters === 'Abc 123' && bindings(s16) === 'fontSize' && s16?.boundVariables.fontSize.id === p2Id('pds3/core/font/size/16'),
      `17: font size 16's specimen is "Abc 123" with fontSize alone bound to it (${s16?.characters}, bound ${bindings(s16)})`);
    ok(textIn(cellAt(size, rowOf(size, '16'), 2)) === '16px' && textIn(cellAt(size, rowOf(size, '16'), 3)) === '1rem', '17: its value is "16px", and "1rem" in the REM column');
    const fam = gridOf(tableFrame(p2.prim, 'Font family')!);
    const fDisplay = textOf(cellAt(fam, rowOf(fam, 'display'), 1));
    ok(bindings(fDisplay) === 'fontFamily' && fDisplay?.boundVariables.fontFamily.id === p2Id('pds3/core/font/family/display') && textIn(cellAt(fam, rowOf(fam, 'display'), 2)) === 'Playfair Display',
      `17: font family display binds fontFamily alone and reads "Playfair Display" (${bindings(fDisplay)})`);
    // The raw weights on Primitive tokens and the weight roles on Semantic tokens, each its own table (#2371).
    const wt = gridOf(tableFrame(p2.prim, 'Font weight')!);
    const w600 = textOf(cellAt(wt, rowOf(wt, '600'), 1));
    ok(bindings(w600) === 'fontWeight' && w600?.boundVariables.fontWeight.id === p2Id('pds3/core/font/weight/600') && textIn(cellAt(wt, rowOf(wt, '600'), 2)) === '600 · Semi Bold',
      `17: font weight 600 binds fontWeight alone and reads "600 · Semi Bold" (${bindings(w600)}, "${textIn(cellAt(wt, rowOf(wt, '600'), 2))}")`);
    const wr = gridOf(tableFrame(p2.sem, 'Font weight roles')!);
    ok(textIn(cellAt(wr, rowOf(wr, 'strong'), 2)) === '600 · Semi Bold | ↗ | pds3/core/font/weight/600', '17: a weight role reads its weight and its alias');
    const lh = gridOf(tableFrame(p2.prim, 'Line height')!);
    const ls = gridOf(tableFrame(p2.prim, 'Letter spacing')!);
    ok(bindings(textOf(cellAt(lh, 1, 1))) === 'lineHeight' && textIn(cellAt(lh, 1, 2)) === '24px' && textIn(cellAt(lh, 1, 3)) === '1.5rem'
      && bindings(textOf(cellAt(ls, 1, 1))) === 'letterSpacing' && textIn(cellAt(ls, 1, 2)) === '-0.5px' && textIn(cellAt(ls, 1, 3)) === '-0.0312rem',
      `17: a line height binds lineHeight ("24px" · "1.5rem"), a letter spacing letterSpacing ("${textIn(cellAt(ls, 1, 2))}" · "${textIn(cellAt(ls, 1, 3))}")`);
    // A FAMILY OR A WEIGHT IS NOT A LENGTH: no REM column.
    ok(!headerRow(tableFrame(p2.prim, 'Font family')!).includes('REM') && !headerRow(tableFrame(p2.prim, 'Font weight')!).includes('REM') && !headerRow(tableFrame(p2.sem, 'Font weight roles')!).includes('REM'), '17: the font family and font weight tables have no REM column');
    // The FLUID sizes (type-sets, desktop and mobile) have no table of their own since #2371: the Text styles table prints
    // them per mode, pinned (section 18). Section 33 holds that the table is gone.
    // The display override: Generic binds nothing; Size binds fontSize on a weight row.
    const gen = await phase2File();
    await draw(gen.api, contract, { types: ['fontWeight'], fontDisplay: 'generic' });
    const gw = gridOf(tableFrame(gen.prim, 'Font weight')!);
    ok(bindings(textOf(cellAt(gw, 1, 1))) === '', '17: Display "Generic" draws "Abc 123" with nothing bound');
    await draw(gen.api, contract, { types: ['fontWeight'], fontDisplay: 'size' });
    ok(bindings(textOf(cellAt(gridOf(tableFrame(gen.prim, 'Font weight')!), 1, 1))) === 'fontSize', '17: Display "Size" binds fontSize instead');
  }

  console.log('18. phase 2: text styles (#259)');
  {
    const ts = tableFrame(p2.sem, 'Text styles')!;
    const tg = gridOf(ts);
    ok(JSON.stringify(headerRow(ts)) === JSON.stringify(['Token', 'desktop', 'Size / line height', 'REM', 'mobile', 'Size / line height', 'REM', 'Family', 'Weight', 'Style', 'Letter spacing', 'REM', 'Description']),
      `18: the text-style table: a specimen, size and REM per type-sets mode, then family, weight, style, letter spacing and its REM (${headerRow(ts).join(' · ')})`);
    const names = tg.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn);
    // 80 since Q226 A (2026-10-10): every brand ships the default label weight and its underlined twin (six styles).
    ok(names.length === 80 && JSON.stringify(names) === JSON.stringify(p2.styles.map((st) => st.name)), `18: one row per text style, 80, in the file's order (${names.slice(0, 2).join(', ')} …)`);
    const body = rowOf(tg, 'body/lg/default');
    const bodyId = p2.styles.find((st) => st.name === 'body/lg/default')!.id;
    const spec = [cellAt(tg, body, 1), cellAt(tg, body, 4)];
    ok(spec.every((c) => c?.findOne((k) => k.type === 'TEXT')?.textStyleId === bodyId && c?.findOne((k) => k.type === 'TEXT')?.characters === 'Abc 123')
      && spec[0]?.explicitVariableModes['VariableCollectionId:ts'] === 'ts:0' && spec[1]?.explicitVariableModes['VariableCollectionId:ts'] === 'ts:1',
      `18: body/lg/default's specimen is "Abc 123" with its text style applied, one per mode, pinned (${spec.map((c) => c?.findOne((k) => k.type === 'TEXT')?.textStyleId).join(', ')})`);
    ok(textIn(cellAt(tg, body, 2)) === '18px / 150% | ↗ | pds3/core/font/size/18' && textIn(cellAt(tg, body, 3)) === '1.125rem' && textIn(cellAt(tg, body, 7)) === 'Inter | ↗ | pds3/core/font/family/body'
      && textIn(cellAt(tg, body, 8)) === '400 · Regular' && textIn(cellAt(tg, body, 9)) === 'Regular | ↗ | pds3/core/font/style/body/default' && textIn(cellAt(tg, body, 10)) === '0%' && textIn(cellAt(tg, body, 11)) === '—',
      `18: body/lg/default reads 18px / 150% with 1.125rem in its REM column, Inter, 400 · Regular, style Regular, 0%, and "—" for the REM of a letter spacing stored as a percentage (${[2, 3, 7, 8, 9, 10, 11].map((c) => textIn(cellAt(tg, body, c))).join(' ‖ ')})`);
    const hero = rowOf(tg, 'display/3xl/emphasis');
    ok(textIn(cellAt(tg, hero, 2)) === '160px / 105% | ↗ | pds3/font-fluid/display/3xl/emphasis' && textIn(cellAt(tg, hero, 3)) === '10rem'
      && textIn(cellAt(tg, hero, 5)) === '48px / 105% | ↗ | pds3/font-fluid/display/3xl/emphasis' && textIn(cellAt(tg, hero, 6)) === '3rem'
      && textIn(cellAt(tg, hero, 7)) === 'Playfair Display | ↗ | pds3/core/font/family/display' && textIn(cellAt(tg, hero, 8)) === '500 · Medium'
      && textIn(cellAt(tg, hero, 9)) === 'Medium Italic | ↗ | pds3/core/font/style/display/emphasis' && textIn(cellAt(tg, hero, 10)) === '-3%',
      `18: display/3xl/emphasis reads 160px (10rem) on desktop and 48px (3rem) on mobile, Playfair Display, 500 · Medium, style Medium Italic, -3% (${[2, 3, 5, 6, 7, 8, 9, 10].map((c) => textIn(cellAt(tg, hero, c))).join(' ‖ ')})`);
    // THE TOGGLED COLUMNS: paragraph spacing and text decoration appear only when asked for.
    const tog = await phase2File();
    await draw(tog.api, contract, { types: ['typography'], paragraphSpacing: true, textDecoration: true });
    const tw = tableFrame(tog.sem, 'Text styles')!;
    ok(JSON.stringify(headerRow(tw)) === JSON.stringify(['Token', 'desktop', 'Size / line height', 'REM', 'mobile', 'Size / line height', 'REM', 'Family', 'Weight', 'Style', 'Letter spacing', 'REM', 'Paragraph spacing', 'REM', 'Decoration', 'Description']),
      `18: paragraph spacing (with its REM) and decoration toggled on add their columns (${headerRow(tw).join(' · ')})`);
    const link = rowOf(gridOf(tw), 'body/lg/default-link');
    ok(textIn(cellAt(gridOf(tw), link, 12)) === '0px' && textIn(cellAt(gridOf(tw), link, 13)) === '0rem' && textIn(cellAt(gridOf(tw), link, 14)) === 'Underline',
      `18: a link style reads "0px" paragraph spacing, "0rem" beside it, and "Underline" (${[12, 13, 14].map((c) => textIn(cellAt(gridOf(tw), link, c))).join(' ‖ ')})`);
    await draw(tog.api, contract, { types: ['typography'] });
    ok(!headerRow(tableFrame(tog.sem, 'Text styles')!).includes('Paragraph spacing') && !headerRow(tableFrame(tog.sem, 'Text styles')!).includes('Decoration'),
      '18: toggled off, the two columns are gone on the rerun');
    // REM OFF: no REM column at all, and the value cell unchanged.
    await draw(tog.api, contract, { types: ['typography'], rem: false });
    const noRemW = tableFrame(tog.sem, 'Text styles')!;
    const noRem = gridOf(noRemW);
    ok(!headerRow(noRemW).includes('REM') && textIn(cellAt(noRem, rowOf(noRem, 'body/lg/default'), 2)).startsWith('18px / 150%'), `18: REM off: no REM column, and the value reads "18px / 150%" (${headerRow(noRemW).join(' · ')})`);
    // PIXELS IS RETIRED (owner decision 20): the agent link passes an older caller's `pixels` as `retired`, the run
    // draws exactly what it draws without it, and its notes say it was ignored.
    const pxRun = await draw(tog.api, contract, { types: ['typography'], retired: ['pixels'] });
    const noPx = gridOf(tableFrame(tog.sem, 'Text styles')!);
    const bpx = rowOf(noPx, 'body/lg/default');
    ok(textIn(cellAt(noPx, bpx, 2)).startsWith('18px / 150%') && textIn(cellAt(noPx, bpx, 3)) === '1.125rem'
      && pxRun.notes.includes('pixels is no longer an option and was ignored: every value column prints its base value in px'),
      `18: a retired pixels arg changes nothing drawn, "18px / 150%" and "1.125rem", and the notes say it was ignored (${textIn(cellAt(noPx, bpx, 2))} ‖ ${textIn(cellAt(noPx, bpx, 3))}; ${pxRun.notes.join(' / ')})`);
    // A LETTER SPACING AND A PARAGRAPH SPACING IN PX get their REM (owner decision 20): 0.8px → 0.05rem, 12px → 0.75rem.
    const lsPx = { ...p2.styles[0], id: 'S:lspx:', name: 'px/spacing', letterSpacing: { unit: 'PIXELS', value: 0.8 }, paragraphSpacing: 12, boundVariables: {} };
    const lsPlan = planStyleGuide({ collections: [], variables: [], textStyles: [lsPx] }, null, { types: ['typography'], paragraphSpacing: true });
    const lsExtra = (lsPlan.tables[0]?.rows[0]?.extra ?? []).map((x) => x.value).slice(3);
    ok(JSON.stringify(lsExtra) === JSON.stringify(['0.8px', '0.05rem', '12px', '0.75rem']) && JSON.stringify(lsPlan.tables[0]?.columns.slice(-5)) === JSON.stringify(['Letter spacing', 'REM', 'Paragraph spacing', 'REM', 'Description']),
      `18: a letter spacing of 0.8px reads "0.05rem" beside it, and a paragraph spacing of 12px "0.75rem" (${lsExtra.join(' ‖ ')}; ${lsPlan.tables[0]?.columns.slice(-5).join(' · ')})`);
    const lsOff = planStyleGuide({ collections: [], variables: [], textStyles: [lsPx] }, null, { types: ['typography'], paragraphSpacing: true, rem: false });
    ok(JSON.stringify((lsOff.tables[0]?.rows[0]?.extra ?? []).map((x) => x.value).slice(3)) === JSON.stringify(['0.8px', '12px']) && !lsOff.tables[0]?.columns.includes('REM'),
      `18: REM off, the two spacings print px alone and there is no REM column (${(lsOff.tables[0]?.rows[0]?.extra ?? []).map((x) => x.value).join(' ‖ ')})`);
    // A LINE HEIGHT IN PIXELS gets its REM too: metrics' 24px line height and 16px size read "1rem / 1.5rem".
    const lhPx = { ...p2.styles[0], id: 'S:lhpx:', name: 'px/line', fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, boundVariables: {} };
    const pr = planStyleGuide({ collections: [], variables: [], textStyles: [lhPx] }, null, { types: ['typography'] });
    ok(pr.tables[0]?.rows[0]?.cells[0]?.value === '16px / 24px' && pr.tables[0]?.rows[0]?.cells[0]?.rem === '1rem / 1.5rem',
      `18: a style whose line height is in pixels reads "16px / 24px", and "1rem / 1.5rem" in its REM column (${pr.tables[0]?.rows[0]?.cells[0]?.value} ‖ ${pr.tables[0]?.rows[0]?.cells[0]?.rem})`);
  }

  console.log('19. phase 2: rerun, the tables filter, the phase boundary, an unbound specimen (#259)');
  {
    const space = tableFrame(p2.sem, 'Space')!;
    const spaceId = space.id;
    p2.vars.find((v) => v.name === 'pds3/space/050')!.valuesByMode['space:0'] = { type: 'VARIABLE_ALIAS', id: p2Id('pds3/core/dimension/6') };
    p2.styles.find((st) => st.name === 'body/lg/default')!.letterSpacing = { unit: 'PERCENT', value: 1 };
    const again = await draw(p2.api, contract);
    const sg = gridOf(tableFrame(p2.sem, 'Space')!);
    const upd = (title: string) => again.tables.find((t) => t.title === title) as Extract<TableOutcome, { status: 'updated' }> | undefined;
    ok(tablesOn(p2.sem).length === 5 && tablesOn(p2.prim).length === 9 && tableFrame(p2.sem, 'Space')?.id === spaceId && again.tables.every((t) => t.status === 'updated'),
      '19: a rerun updates every phase-2 table in place, none duplicated');
    ok(JSON.stringify(upd('Space')?.diff) === JSON.stringify({ added: [], removed: [], changed: ['pds3/space/050'], renamed: [] }) && barIn(cellAt(sg, rowOf(sg, '050'), 1))?.width === 6
      && textIn(cellAt(sg, rowOf(sg, '050'), 2)) === '6px | ↗ | pds3/core/dimension/6' && textIn(cellAt(sg, rowOf(sg, '050'), 3)) === '0.375rem',
      `19: space/050 re-aliased to 6 is reported changed, its bar 6px, its value "6px" and its REM "0.375rem" (${JSON.stringify(upd('Space')?.diff)})`);
    ok(JSON.stringify(upd('Text styles')?.diff.changed) === JSON.stringify(['body/lg/default']), `19: a text style's letter spacing change is reported (${JSON.stringify(upd('Text styles')?.diff)})`);
    ok(again.deleted.length === 0 && again.kept.length === 0 && again.stale.length === 0, '19: nothing superseded');
    const remOnly = await draw(p2.api, contract, { rem: false });
    ok(remOnly.tables.every((t) => t.status === 'updated' && !t.diff.changed.length), '19: switching REM off changes no row');
    // THE TABLES FILTER on the new tables: by title, a disambiguated title, and a key.
    const before = new Map([...tablesOn(p2.sem), ...tablesOn(p2.prim)].map((w) => [w.name, gridOf(w).id]));
    const f1 = await draw(p2.api, contract, { tables: ['space', 'Font size', 'dimension|VariableCollectionId:radius|pds3/radius'] });
    const redrawn = [...tablesOn(p2.sem), ...tablesOn(p2.prim)].filter((w) => before.get(w.name) !== gridOf(w).id).map((w) => w.name).sort();
    ok(JSON.stringify(f1.tables.map((t) => t.title).sort()) === JSON.stringify(['Font size', 'Radius', 'Space']) && JSON.stringify(redrawn) === JSON.stringify(['Style guide — Font size', 'Style guide — Radius', 'Style guide — Space'])
      && f1.unmatched.length === 0,
      `19: tables: [space, Font size, the radius key] draws those three and no other (${redrawn.join(', ')})`);
    // A DISAMBIGUATED TITLE: a second collection with font sizes (one mode, so not the text styles' responsive one) makes
    // the two font-size tables "Font size (core)" and "Font size (metrics)".
    const dup = await phase2File();
    dup.vars.push({ id: 'VariableID:metrics:fs', name: 'metrics/font-size/body', variableCollectionId: 'VariableCollectionId:metrics', resolvedType: 'FLOAT', description: '', valuesByMode: { 'metrics:0': 15 }, scopes: ['FONT_SIZE'] });
    const d1 = await draw(dup.api, contract, { tables: ['Font size (metrics)'] });
    ok(JSON.stringify(d1.tables.map((t) => t.title)) === JSON.stringify(['Font size (metrics)']) && d1.unmatched.length === 0,
      `19: tables: [Font size (metrics)] draws the disambiguated table alone (${d1.tables.map((t) => t.title).join(', ')})`);
    ok((await draw(dup.api, contract, { tables: ['Font size'] })).unmatched.length === 1, '19: "Font size" alone matches neither disambiguated title, and is reported');
    // THE PHASE BOUNDARY: a type outside it is named, not drawn; the later-phase variables are counted.
    const out = await draw(p2.api, contract, { types: ['dimension', 'motion'] });
    ok(out.tables.length === 6 && out.tables.every((t) => t.key.startsWith('dimension|')) && out.notes.includes('motion: not in this phase — this phase draws color, dimension, borderWidth, opacity, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, typography, shadow, gradient'),
      `19: types [dimension, motion] draws the 6 dimension tables and names motion as outside this phase (${out.notes.join(' / ')})`);
    // Since #2353 every variable phase 2's file holds is drawn: its 13 font styles in the Text styles table, its 12
    // opacities in their own. The note's counts are asserted in 21 and 35.
    ok(!p2First.notes.some((n) => n.startsWith('Not drawn until a later phase')), `19: an open run of a file with nothing left for a later phase names none (${p2First.notes.join(' / ')})`);
    // A HOST THAT REFUSES A BINDING: counted, named, not a pass.
    const nb = await phase2File();
    refuseBinding = true;
    const refused = await draw(nb.api, contract, { tables: ['Radius', 'Font weight', 'Font weight roles'] });
    refuseBinding = false;
    const v = styleGuideSummary(refused);
    ok(refused.unbound === 21 && !v.ok && v.summary.includes('10 type=radius specimens are not bound to their variable') && v.summary.includes('11 font weight specimens are not bound to their variable'),
      `19: a binding the host refuses is counted and named, and is not a pass: ${refused.unbound} unbound — "${v.headline}"`);
    ok(v.headline === '⚠ 21 specimens unbound', `19: its headline counts specimens, not swatches: "${v.headline}"`);
  }

  console.log('20. the title cell, on every table type (owner decision 15)');
  {
    ok([...tablesOn(p2.sem), ...tablesOn(p2.prim), ...tablesOn(f.sem), ...tablesOn(f.prim)].every((w) => headerRow(w)[0] === 'Token'), '20: off by default: every table leads with Token, no Name column');
    // THE DEFAULT: the path below the table's shared prefix, Title Case, size words upper-cased.
    ok(humanizeName(['text', 'primary']) === 'Text Primary' && humanizeName(['display', 'xl', 'emphasis']) === 'Display XL Emphasis'
      && humanizeName(['050'], 'space') === 'Space 050' && humanizeName(['xs', 'padding-x']) === 'XS Padding X' && humanizeName(['display', '2xl', 'strong']) === 'Display 2XL Strong',
      `20: humanized: "Text Primary", "Display XL Emphasis", "Space 050", "XS Padding X", "Display 2XL Strong" (${humanizeName(['display', 'xl', 'emphasis'])})`);
    /** The row whose Token cell (column 1, after Name) reads `token`. */
    const rowBy = (g: N, token: string): number => rowOf(g, token, 1);
    const nameOf = (w: N, token: string): string => { const g = gridOf(w); return textIn(cellAt(g, rowBy(g, token), 0)); };
    const c20 = await fullFile();
    await draw(c20.api, contract, { titleCell: true, collections: ['color'] });
    const text20 = tableFrame(c20.sem, 'Text')!;
    const tn = cellAt(gridOf(text20), rowBy(gridOf(text20), 'primary'), 0);
    ok(JSON.stringify(headerRow(text20).slice(0, 3)) === JSON.stringify(['Name', 'Token', 'light']) && textIn(tn) === 'Text Primary'
      && tn?.mainComponent?.name === 'color=white, textAlign=left, type=default, padding=default' && tn.lsh === 'FILL' && tn.layoutSizingVertical === 'FILL'
      && tn.findOne((k) => k.type === 'TEXT')?.textAutoResize === 'WIDTH_AND_HEIGHT',
      `20: on, a color table leads with Name: text/primary reads "Text Primary" in a default text cell that FILLs its track, on one line (${headerRow(text20).slice(0, 3).join(' · ')}; "${textIn(tn)}")`);
    ok(nameOf(tableFrame(c20.sem, 'Inverse text')!, 'primary') === 'Inverse Text Primary', `20: an inverse role reads "Inverse Text Primary" (${nameOf(tableFrame(c20.sem, 'Inverse text')!, 'primary')})`);
    const t20 = await phase2File();
    // A HEADER WHOSE INSIDE FOLLOWS ITS WIDTH, as an auto-layout header component's does: its "Text" box FILLs it. A
    // wider title column then widens the header's inside too, which the fingerprint must leave out with the header
    // itself (review of f3bb76cd: with the fixture's plain box, dropping that exclusion failed nothing).
    const hdr = t20.fc.findOne((k) => k.name === 'Size=Medium')!;
    hdr.layoutMode = 'VERTICAL'; hdr.primaryAxisSizingMode = 'AUTO'; hdr.counterAxisSizingMode = 'FIXED';
    hdr.findOne((k) => k.name === 'Text')!.lsh = 'FILL';
    await draw(t20.api, contract, { titleCell: true });
    const ts20 = tableFrame(t20.sem, 'Text styles')!;
    const space20 = tableFrame(t20.sem, 'Space')!;
    ok(headerRow(ts20)[0] === 'Name' && nameOf(ts20, 'display/3xl/emphasis') === 'Display 3XL Emphasis' && nameOf(space20, '050') === 'Space 050'
      && nameOf(tableFrame(t20.sem, 'Size')!, 'xs/height') === 'XS Height' && nameOf(tableFrame(t20.prim, 'Font size')!, '16') === 'Size 16',
      `20: a text style reads "Display 3XL Emphasis", a dimension "Space 050" and "XS Height", a font size "Size 16" (${nameOf(ts20, 'display/3xl/emphasis')}, ${nameOf(space20, '050')})`);
    // A DESIGNER'S EDIT SURVIVES; an unedited title follows a rename.
    const titleText = (w: N, token: string): N => cellAt(gridOf(w), rowBy(gridOf(w), token), 0)!.findOne((k) => k.type === 'TEXT')!;
    titleText(space20, '050').characters = 'Gutter small';
    t20.vars.find((v) => v.name === 'pds3/space/025')!.name = 'pds3/space/020';
    await draw(t20.api, contract, { titleCell: true });
    const sp = tableFrame(t20.sem, 'Space')!;
    ok(nameOf(sp, '050') === 'Gutter small' && nameOf(sp, '020') === 'Space 020', `20: a hand-edited title survives a rerun ("${nameOf(sp, '050')}"), an unedited one follows its renamed token ("${nameOf(sp, '020')}")`);
    await draw(t20.api, contract, { types: ['dimension'] });
    await draw(t20.api, contract, { titleCell: true });
    ok(nameOf(tableFrame(t20.sem, 'Space')!, '050') === 'Gutter small', '20: the edit survives a run drawn without the title column, and returns with it');
    // THE ORDER THE REVIEW OF f3bb76cd FOUND LOSING AN EDIT: edit, then a run WITHOUT the column (its cells go), then a
    // run with it. The edit is recorded before the cells go, so it comes back.
    titleText(tableFrame(t20.sem, 'Space')!, '100').characters = 'Row gap';
    await draw(t20.api, contract, { types: ['dimension'] });
    await draw(t20.api, contract, { titleCell: true });
    ok(nameOf(tableFrame(t20.sem, 'Space')!, '100') === 'Row gap', `20: a title edited, then a run without the column, then one with it: the edit comes back ("${nameOf(tableFrame(t20.sem, 'Space')!, '100')}")`);
    // A TITLE EDIT IS NOT AN EDIT TO THE TABLE: a superseded table whose only change is a title is deleted, unedited;
    // one with a value retyped is kept.
    titleText(tableFrame(t20.sem, 'Radius')!, 'md').characters = 'Medium corner, for cards';
    const dv = gridOf(tableFrame(t20.prim, 'Density')!);
    const dText = cellAt(dv, rowBy(dv, 'space/gap'), 3)!.findOne((k) => k.type === 'TEXT')!;
    dText.characters = String(dText.characters).replace('8px', '9px');
    for (let i = t20.vars.length - 1; i >= 0; i--) if (/^pds3\/radius\/|^density\//.test(t20.vars[i].name)) t20.vars.splice(i, 1);
    const sup = await draw(t20.api, contract, { titleCell: true });
    ok(sup.deleted.includes('Style guide — Radius') && !tableFrame(t20.sem, 'Radius'),
      `20: a superseded table whose only change is a retitled row is deleted, unedited (deleted ${JSON.stringify(sup.deleted)}; kept ${JSON.stringify(sup.kept)})`);
    ok(JSON.stringify(sup.kept) === JSON.stringify([{ name: 'Style guide — Density', reason: 'edited' }]), `20: one with a value retyped is still kept as edited (${JSON.stringify(sup.kept)})`);
  }

  console.log('21. the review of 4faeb98a: variable kinds, a refused resize, fonts loaded, pinned before bound, superseded phase-2 tables');
  {
    // (1) A FLOAT IS A LENGTH ONLY WHEN ITS SCOPES OR NAME SAY SO. Literal fixtures, one per shape the review found on
    // the reference/ exports (Prism2, New Balance), plus camelCase names and a FLOAT nothing places.
    const kindOf = (name: string, scopes: string[] = [], resolvedType = 'FLOAT'): string | null =>
      varKind({ id: name, name, variableCollectionId: 'c', resolvedType, valuesByMode: {}, scopes });
    const shapes: [string, string[], string, string][] = [
      ['pds/motion/duration/fast', [], 'FLOAT', 'duration'],
      ['pds/motion/transition/enter/delay', [], 'FLOAT', 'duration'],
      ['pds/motion/easing/ease-in', [], 'STRING', 'motion'],
      ['pds/shadow/md/top/offsetY', ['EFFECT_FLOAT'], 'FLOAT', 'effect'],
      ['pds/shadow/md/bottom/blur', [], 'FLOAT', 'effect'],
      ['pds/color/gradient/brand/primary/stops/0/position', [], 'FLOAT', 'gradient'],
      ['pds/color/gradient/brand/primary/angle', [], 'FLOAT', 'gradient'],
      ['nbds/font/paragraph-spacing/16', ['PARAGRAPH_SPACING'], 'FLOAT', 'paragraphSpacing'],
      ['brand/text/paragraphSpacing/body', [], 'FLOAT', 'paragraphSpacing'],
      ['pds/font/lineHeight/body/default', [], 'FLOAT', 'lineHeight'],
      ['nbds/font/lineheight/1p1', [], 'FLOAT', 'lineHeight'],
      ['pds/font/letterSpacing/tight', [], 'FLOAT', 'letterSpacing'],
      ['brand/fade/disabled', ['OPACITY'], 'FLOAT', 'opacity'],
      ['pds/dimension/4', [], 'FLOAT', 'scale'],
      ['pds3/core/dimension/4', ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'STROKE_FLOAT'], 'FLOAT', 'scale'],
    ];
    // Figma's motion types (#2412) are motion by TYPE, under any name, and so named as a later phase rather than dropped.
    ok(kindOf('pds3/motion/stagger', ['ALL_SCOPES'], 'TIMING') === 'duration' && kindOf('pds3/motion/spring/snappy', ['ALL_SCOPES'], 'EASING') === 'motion',
      `21: a TIMING is a duration and an EASING is motion, whatever the name (${kindOf('pds3/motion/stagger', ['ALL_SCOPES'], 'TIMING')}, ${kindOf('pds3/motion/spring/snappy', ['ALL_SCOPES'], 'EASING')})`);
    const wrong = shapes.filter(([n, sc, t, k]) => kindOf(n, sc, t) !== k).map(([n, sc, t, k]) => `${n} → ${kindOf(n, sc, t)}, not ${k}`);
    ok(wrong.length === 0, `21: each reviewed shape takes its own kind: durations, a shadow by scope and by name, gradient stops, a paragraph spacing by scope and by name, camelCase line heights and letter spacing (${wrong.join('; ')})`);
    ok(kindOf('misc/ratio/golden') === 'other' && kindOf('misc/ratio/golden', ['ALL_SCOPES']) === 'other',
      `21: a FLOAT neither its scopes nor its name place is "other", never a length (misc/ratio/golden → ${kindOf('misc/ratio/golden')})`);
    // Planned: only the two scales draw as dimensions; the opacity draws as one (#2353), and every other shape is named as
    // a later phase, never a bracket.
    const legacy: SgCatalog = {
      collections: [{ id: 'L', name: 'legacy', modes: [{ modeId: 'L:0', name: 'Default' }], defaultModeId: 'L:0' }],
      variables: shapes.concat([['misc/ratio/golden', [], 'FLOAT', 'other']]).map(([name, scopes, resolvedType], i) =>
        ({ id: `V:${i}`, name, variableCollectionId: 'L', resolvedType, valuesByMode: { 'L:0': resolvedType === 'STRING' ? 'ease-in' : 200 }, scopes })),
    };
    const lp = planStyleGuide(legacy, null, { types: ['dimension'] });
    const lpOpen = planStyleGuide(legacy, null, {});
    const dimRows = lp.tables.flatMap((t) => t.rows.map((r) => r.name));
    ok(JSON.stringify(dimRows) === JSON.stringify(['pds/dimension/4', 'pds3/core/dimension/4']),
      `21: planned, only the two scales are drawn as dimensions: no duration, shadow, gradient or paragraph spacing is a "200px · 12.5rem" bracket (${dimRows.join(', ')})`);
    ok(lpOpen.notes.includes('Not drawn until a later phase: 2 duration, 1 motion, 2 shadow and effect, 2 gradient, 2 paragraph spacing, 1 other number or string variables'),
      `21: each is reported as not drawn until a later phase, by kind (${lpOpen.notes.join(' / ')})`);

    // (2) A PADDING BIND THE HOST REFUSES, and one it accepts that the width does not follow: the run completes, and
    // each is counted and named by table and token. (The resize this replaced is gone: a width written inside an
    // instance is silently dropped, so the run no longer writes one.)
    const rz = await phase2File();
    refuseBinding = true;
    let rr: StyleGuideResult;
    try { rr = await draw(rz.api, contract, { tables: ['Space'] }); } finally { refuseBinding = false; }
    const rs = styleGuideSummary(rr);
    // 17 of the 18: space/0 draws nothing, so it binds nothing (owner decision, live QA of 0.210.0).
    ok(rr.tables[0]?.status === 'created' && rr.unbound === 17 && rs.summary.includes('17 display=filled spacing specimens are not bound to their variable') && rs.headline === '⚠ 17 specimens unbound',
      `21: a padding bind the host refuses is counted and named, and the run completes: ${rr.unbound} — "${rs.headline}"`);
    const ig = await phase2File();
    ignorePadding = (n) => n.name === 'spacing-filled-example' && insideInstance(n);
    let ri: StyleGuideResult;
    try { ri = await draw(ig.api, contract, { tables: ['Space'] }); } finally { ignorePadding = null; }
    // 17, not 18: space/0 draws nothing (owner decision, live QA of 0.210.0). The other 17 stay at the member's 0.01.
    ok(ri.unbound === 17 && ri.misses.includes("17 display=filled spacing specimens are not sized to their value: bound by their left padding, the layer did not take the value's width (Space: 025, 050, 075 and 14 more)"),
      `21: a padding bind the width does not follow is read back, counted and named: ${ri.unbound} unbound`);

    // (3) + (4) FONTS, LOADED BEFORE THEY ARE BOUND, IN THE MODE PINNED FIRST. A family that varies by mode, whose
    // default mode (product) is the SECOND column; a weight at 800 (Inter Extra Bold, which Set up file never loads);
    // a text style in a font no other test uses. The shim throws on any of them unloaded.
    const fc21 = page(FC), prim21 = page(PRIM), sem21 = page(SEM);
    fc21.appendChild(headerSet());
    const cols21: ShimCol[] = [{ id: 'VariableCollectionId:bf', name: 'brand-fonts', modes: [{ modeId: 'bf:0', name: 'editorial' }, { modeId: 'bf:1', name: 'product' }], defaultModeId: 'bf:1' }];
    const vars21: ShimVar[] = [
      { id: 'VariableID:bf:0', name: 'brand/font/family/body', variableCollectionId: 'VariableCollectionId:bf', resolvedType: 'STRING', description: '', valuesByMode: { 'bf:0': 'Proof Serif', 'bf:1': 'Proof Sans' }, scopes: ['FONT_FAMILY'] },
      { id: 'VariableID:bf:1', name: 'brand/font/weight/heavy', variableCollectionId: 'VariableCollectionId:bf', resolvedType: 'FLOAT', description: '', valuesByMode: { 'bf:0': 800, 'bf:1': 800 }, scopes: ['FONT_WEIGHT'] },
    ];
    const styles21: ShimStyle[] = [{ id: 'S:proof:', name: 'proof/mono', description: '', fontName: { family: 'Proof Mono', style: 'Medium' }, fontSize: 14, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 }, paragraphSpacing: 0, textDecoration: 'NONE', boundVariables: {} }];
    const s21 = makeShim([page('Cover'), prim21, sem21, fc21], cols21, vars21, styles21);
    await ensureStyleGuideCells(s21.api, fc21);
    const r21 = await draw(s21.api, contract);
    const specText = (w: N | undefined, col: number): N | null => (w ? cellAt(gridOf(w), 1, col)?.findOne((k) => k.type === 'TEXT') ?? null : null);
    const famW = tableFrame(prim21, 'Font family');
    const [ed, pr] = [specText(famW, 1), specText(famW, 3)];
    ok(s21.world.loads.includes('Proof Serif Regular') && s21.world.loads.includes('Proof Sans Regular') && pr?.boundVariables.fontFamily?.id === 'VariableID:bf:0' && fontId(pr?.fontName) === 'Proof Sans Regular',
      `21: a family is loaded before it is bound (loaded ${s21.world.loads.filter((f) => f.startsWith('Proof S')).join(', ')}; product column ${fontId(pr?.fontName)})`);
    ok(ed?.boundVariables.fontFamily?.id === 'VariableID:bf:0' && fontId(ed?.fontName) === 'Proof Serif Regular' && ed?.parent?.explicitVariableModes['VariableCollectionId:bf'] === 'bf:0',
      `21: pinned before bound: the editorial column, not the collection's default mode, binds in its own font, Proof Serif (${fontId(ed?.fontName)}, bound ${ed?.boundVariables.fontFamily?.id})`);
    const heavy = specText(tableFrame(prim21, 'Font weight'), 1);
    ok(s21.world.loads.includes('Inter Extra Bold') && heavy?.boundVariables.fontWeight?.id === 'VariableID:bf:1' && fontId(heavy?.fontName) === 'Inter Extra Bold',
      `21: a weight is bound after the cell's family at that weight is loaded, Inter Extra Bold (${fontId(heavy?.fontName)})`);
    const mono = specText(tableFrame(sem21, 'Text styles'), 1);
    ok(s21.world.loads.includes('Proof Mono Medium') && mono?.textStyleId === 'S:proof:',
      `21: a text style is applied after its font, Proof Mono Medium, is loaded (style ${mono?.textStyleId || 'not applied'})`);
    ok(r21.unbound === 0, `21: every font specimen bound: ${r21.unbound} unbound (${r21.misses.join(' / ')})`);

    // (5) SUPERSEDED PHASE-2 TABLES. An unedited dimension table (density, its variables gone) and text-style table (every
    // style moved under brand/, so its key moves) are deleted. A dimension table whose value moved is kept: the host
    // repaints a bound bar's width, replayed here, and width is in the fingerprint.
    const sp = await phase2File();
    await draw(sp.api, contract);
    // The host follows a bound padding live, and so does the shim: moving the value moves the bar with no rerun.
    const m16 = sp.vars.find((v) => v.name === 'metrics/step/16')!;
    const bound16 = tablesOn(sp.prim).flatMap((w) => w.findAll((k) => k.boundVariables?.paddingLeft?.id === m16.id));
    const w16 = bound16[0]?.width;
    m16.valuesByMode['metrics:0'] = 20;
    const repainted = bound16.filter((b) => b.width === 20 && w16 === 16);
    // Superseded by a regrouping, which moves each table's key while its variables (and their bindings) stay: density's
    // variables move under `dense/`, metrics' steps under `metrics/rung/`.
    for (const v of sp.vars) { if (/^density\//.test(v.name)) v.name = v.name.replace(/^density\//, 'dense/'); if (/^metrics\/step\//.test(v.name)) v.name = v.name.replace('/step/', '/rung/'); }
    for (const st of sp.styles) st.name = `brand/${st.name}`;
    const sup = await draw(sp.api, contract);
    ok(repainted.length === 1 && JSON.stringify([...sup.deleted].sort()) === JSON.stringify(['Style guide — Density', 'Style guide — Text styles']) && !tableFrame(sp.prim, 'Density') && !!tableFrame(sp.prim, 'Dense'),
      `21: an unedited superseded dimension table and text-style table are deleted (deleted ${JSON.stringify(sup.deleted)})`);
    const tsNow = tablesOn(sp.sem).filter((w) => w.name === 'Style guide — Text styles');
    ok(tsNow.length === 1 && tsNow[0].pluginData['prism3-style-guide'] === 'typography|text-styles|brand', `21: the text styles are drawn once, under their new key (${tsNow.map((w) => w.pluginData['prism3-style-guide']).join(', ')})`);
    ok(JSON.stringify(sup.kept) === JSON.stringify([{ name: 'Style guide — Step', reason: 'edited' }]) && styleGuideSummary(sup).summary.includes('edited: Style guide — Step'),
      `21: a superseded dimension table whose value moved is kept and reported as edited (${JSON.stringify(sup.kept)})`);
  }

  console.log("22. the owner's cell structure (the live run of 4faeb98a): every spacing specimen sized, the bracket's right edge carried");
  {
    // The owner's file: their swatches (with their type=radius) and their spacing cells on "Style Guide Components",
    // adopted; the text cells built. A plain dimension scale (the bracket), a spacing ramp (the filled bar), a radius.
    const ownerFile = async (spacing: N | null): Promise<Shim & { prim: N }> => {
      const fc = page(FC), prim = page(PRIM), sem = page(SEM), sgc = page('Style Guide Components');
      fc.appendChild(headerSet());
      // `null`: no owner cells at all, so Set up file's real builder makes all three sets (the "Prism3 Approved MCP
      // Testing File" case, live 2026-09-29).
      if (spacing) {
        const sw = ownerSet('_style-guide-swatches', ['type=Default', 'type=Text'], true);
        sw.appendChild(ownerRadiusMember());
        sgc.appendChild(sw); sgc.appendChild(spacing);
      }
      const one = (id: string): ShimCol => ({ id: `VariableCollectionId:${id}`, name: id, modes: [{ modeId: `${id}:0`, name: 'Default' }], defaultModeId: `${id}:0` });
      const cols = [one('core'), one('space'), one('radius')];
      const vars: ShimVar[] = [];
      const add = (col: string, name: string, value: number, scopes: string[]): void => { vars.push({ id: `VariableID:${name}`, name, variableCollectionId: `VariableCollectionId:${col}`, resolvedType: 'FLOAT', description: '', valuesByMode: { [`${col}:0`]: value }, scopes }); };
      for (const n of [0, 4, 8, 64, 128]) add('core', `nbds/dimension/${n}`, n, []);
      for (const n of [4, 64]) add('space', `nbds/space/${n}`, n, ['GAP']);
      add('radius', 'nbds/radius/md', 8, ['CORNER_RADIUS']);
      const s = makeShim([page('Cover'), prim, sem, fc, sgc], cols, vars);
      await ensureStyleGuideCells(s.api, fc);
      return { ...s, prim };
    };
    const layer = (w: N, token: string, name: string): N | null => { const g = gridOf(w); return cellAt(g, rowOf(g, token), 1)?.findOne((k) => k.name === name) ?? null; };
    /** The bracket in the Dimension table's row for `token`: the frame, its bound padding, the line and both bars. */
    const bracket = (w: N, token: string): string => {
      const f = layer(w, token, 'spacing-line-example');
      const part = (n: string): N | null => f?.findOne((k) => k.name === n) ?? null;
      return JSON.stringify({ w: f?.width, bound: f?.boundVariables.paddingLeft?.id === `VariableID:nbds/dimension/${token}`, line: part('horizontal-line')?.width,
        left: part('left-bar')?.x, right: part('right-bar')?.x });
    };
    // THE OWNER'S CELLS, as measured live (fixed-width frames, bars in flow at MIN): a plugin cannot size them inside an
    // instance. Every spacing specimen is counted, and the report says so ONCE, with what the component needs.
    const o = await ownerFile(ownerSpacingSet());
    const r = await draw(o.api, contract);
    const spacingLines = r.misses.filter((m) => /spacing/.test(m));
    ok(r.unbound === 7 && styleGuideSummary(r).headline === '⚠ 7 specimens unbound' && spacingLines.length === 1
      && spacingLines[0] === '7 spacing specimens are not sized, in 2 tables. _style-guide-spacing-cells: make spacing-filled-example a hug frame sized by left padding, with any bars positioned absolutely. Figma does not let a plugin resize a layer inside an instance.',
      `22: the owner's fixed-width cells: all 7 spacing specimens counted, and one line says what the component needs (${spacingLines.join(' / ')})`);
    const rx = tableFrame(o.prim, 'Radius') ? gridOf(tableFrame(o.prim, 'Radius')!) : null;
    const ex = rx ? cellAt(rx, rowOf(rx, 'md'), 1)?.findOne((k) => k.name === 'radius-example') : null;
    ok(['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].every((k) => ex?.boundVariables[k]?.id === 'VariableID:nbds/radius/md'),
      `22: the owner's radius swatch binds all four corners of radius-example, the layer its clip shows (${Object.keys(ex?.boundVariables ?? {}).join(', ') || 'none bound'})`);

    // THE OWNER'S CELLS AS RESTRUCTURED (their layer names, the padding recipe's tree): sized like the built ones.
    const orr = await ownerFile(ownerSpacingSet('restructured'));
    const rro = await draw(orr.api, contract);
    // The bracket, from a run whose one spacing style is `line` (decision 18), on its own file.
    const orrL = await ownerFile(ownerSpacingSet('restructured'));
    const rroL = await draw(orrL.api, contract, { dimensionDisplay: 'line' });
    const dimO = tableFrame(orrL.prim, 'Dimension')!;
    const spaceO = tableFrame(orr.prim, 'Space')!;
    const filledO = (t: string): string => { const f = layer(spaceO, t, 'spacing-filled-example'); return `${f?.width}:${f?.boundVariables.paddingLeft?.id === `VariableID:nbds/space/${t}`}`; };
    ok(bracket(dimO, '4') === JSON.stringify({ w: 4, bound: true, line: 4, left: 0, right: 3 }) && bracket(dimO, '64') === JSON.stringify({ w: 64, bound: true, line: 64, left: 0, right: 63 })
      && filledO('4') === '4:true' && filledO('64') === '64:true' && rro.unbound === 0 && rroL.unbound === 0 && ![...rro.misses, ...rroL.misses].some((m) => /spacing/.test(m)),
      `22: the owner's cells restructured to the padding recipe are sized: the bracket 4 and 64, right-bar at 3 and 63, the bar 4 and 64, nothing unbound (${bracket(dimO, '4')} ${bracket(dimO, '64')} ${filledO('4')} ${filledO('64')}; ${rro.unbound})`);

    // THE FLOOR (live QA of 0.210.0, 2026-09-30: 102 unsized went to 18, every one a value of 8 or less): a layer inside
    // an instance never hugs narrower than its main's own width. The owner's cells as they were before that QA rest 8
    // wide, so 4 stays 8 and is counted by table and token; 8 and 64 are sized; the zero draws nothing.
    const o8 = await ownerFile(ownerSpacingSet('rest8'));
    const r8 = await draw(o8.api, contract, { dimensionDisplay: 'line' });
    const dim8 = tableFrame(o8.prim, 'Dimension')!;
    ok(r8.unbound === 2 && r8.misses.includes("2 display=line spacing specimens are not sized to their value: bound by their left padding, the layer did not take the value's width (Dimension: 4; Space: 4)")
      && bracket(dim8, '4') === JSON.stringify({ w: 8, bound: true, line: 8, left: 0, right: 7 }) && bracket(dim8, '8') === JSON.stringify({ w: 8, bound: true, line: 8, left: 0, right: 7 })
      && bracket(dim8, '64') === JSON.stringify({ w: 64, bound: true, line: 64, left: 0, right: 63 }),
      `22: cells resting 8 wide cannot draw below 8: 4 stays 8 and is counted by table and token, 8 and 64 are sized (${r8.unbound}; ${r8.misses.filter((m) => /spacing/.test(m)).join(' / ')}; ${bracket(dim8, '4')} ${bracket(dim8, '64')})`);
    // A ZERO DRAWS NOTHING (owner decision, live QA of 0.210.0): the specimen is hidden and counted as drawn; the row
    // keeps its name and its 0px value.
    const g0 = gridOf(dimO), z0 = cellAt(g0, rowOf(g0, '0'), 1);
    const zText = cellAt(g0, rowOf(g0, '0'), 2)?.findOne((k) => k.type === 'TEXT')?.characters;
    const zName = cellAt(g0, rowOf(g0, '0'), 0)?.findOne((k) => k.type === 'TEXT')?.characters;
    ok(z0?.type === 'INSTANCE' && z0.visible === false && !z0.findOne((k) => k.name === 'spacing-line-example')?.boundVariables.paddingLeft && rroL.unbound === 0 && zName === 'nbds/dimension/0' && zText === '0px',
      `22: dimension/0 draws nothing: its specimen hidden, not bound and not counted, its row still "0 | 0px" (${z0?.type} visible ${z0?.visible}; ${rroL.unbound} unbound; ${zName} | ${zText})`);

    // THE CELLS SET UP FILE BUILDS, by the real builder: sized by their left padding at the value, the bracket's
    // absolute bars carried by the constraints set in the component (left-bar MIN, horizontal-line STRETCH, right-bar
    // MAX). Literal widths: 4 → 4 and 64 → 64, the line as wide, right-bar at 3 and 63.
    const ob = await ownerFile(null);
    const rb = await draw(ob.api, contract);
    const obL = await ownerFile(null);
    const rbL = await draw(obL.api, contract, { dimensionDisplay: 'line' });
    const dimB = tableFrame(obL.prim, 'Dimension')!;
    const spaceB = tableFrame(ob.prim, 'Space')!;
    const filledB = (t: string): string => { const f = layer(spaceB, t, 'spacing-filled-example'); return `${f?.width}:${f?.boundVariables.paddingLeft?.id === `VariableID:nbds/space/${t}`}`; };
    const exB = cellAt(gridOf(tableFrame(ob.prim, 'Radius')!), 1, 1)?.findOne((k) => k.name === 'radius-example');
    ok(bracket(dimB, '4') === JSON.stringify({ w: 4, bound: true, line: 4, left: 0, right: 3 })
      && bracket(dimB, '64') === JSON.stringify({ w: 64, bound: true, line: 64, left: 0, right: 63 }) && rbL.unbound === 0,
      `22: the built bracket is drawn at its value by its bound left padding: 4 and 64 wide, the line as wide, right-bar at 3 and 63 (${bracket(dimB, '4')} ${bracket(dimB, '64')})`);
    ok(filledB('4') === '4:true' && filledB('64') === '64:true', `22: the built filled bar is drawn at its value by its bound left padding: 4px → 4, 64px → 64 (${filledB('4')}, ${filledB('64')})`);
    // SHRINK AFTER GROW (live QA of 0.210.0, the owner's measurement): a frame bound to 24, then rebound to 2, stays 24
    // under HUG alone; FIXED then HUG after the bind (the owner's recipe c) takes it to 2. On a fresh instance of the
    // built bracket: 24 wide with right-bar at 23, then 2 wide with right-bar at 1, as the owner measured live.
    const lineMember = setsNamed(obL.pages, '_style-guide-spacing-cells')[0]?.children.find((c) => c.name === 'display=line');
    const grown = lineMember?.createInstance();
    const gf = grown?.children[0];
    const vOf = (n: number): ShimVar => { const v: ShimVar = { id: `VariableID:shrink/${n}`, name: `shrink/${n}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'FLOAT', description: '', valuesByMode: { 'core:0': n }, scopes: [] }; active!.vars.push(v); return v; };
    const v24 = vOf(24), v2 = vOf(2);
    const rb24 = gf ? (sizeByPadding(gf as never, (n) => { (n as unknown as N).setBoundVariable('paddingLeft', v24); return true; }), `${gf.width} right ${gf.findOne((k) => k.name === 'right-bar')?.x}`) : 'none';
    const rb2 = gf ? (sizeByPadding(gf as never, (n) => { (n as unknown as N).setBoundVariable('paddingLeft', v2); return true; }), `${gf.width} right ${gf.findOne((k) => k.name === 'right-bar')?.x}`) : 'none';
    ok(rb24 === '24 right 23' && rb2 === '2 right 1', `22: a bracket grown to 24 and rebound to 2 shrinks to 2, right-bar at 23 then 1 (${rb24}; ${rb2})`);
    ok(['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].every((k) => exB?.boundVariables[k]?.id === 'VariableID:nbds/radius/md') && rb.unbound === 0
      && styleGuideSummary(rb).headline === '✓ style guide: 3 tables',
      `22: the built radius swatch's four corners bound, and nothing unbound: "${styleGuideSummary(rb).headline}" (${rb.misses.join(' / ')})`);

    // A CELL THIS BUILD CANNOT READ: never a silent pass.
    const od = await ownerFile(ownerSpacingSet('odd'));
    const rd = await draw(od.api, contract, { types: ['dimension'] });
    ok(rd.unbound === 7 && rd.misses.includes('7 display=filled specimens are not bound: the member has no layer this build can size or bind (a Bar, a first frame, or a layer named *-example), so they show the cell component\'s own value (Dimension: 0, 4, 8 and 2 more; Space: 4, 64)')
      && styleGuideSummary(rd).headline === '⚠ 7 specimens unbound',
      `22: a spacing cell with no layer to size reports each specimen unbound, by table and token: ${rd.unbound} — "${styleGuideSummary(rd).headline}"`);
  }

  console.log('23. groups (#2801, Q378): titled groups down the page in the engine table\'s order, guides in their group\'s grid');
  {
    const rw = await phase2File();
    await draw(rw.api, contract);
    const dims = groupFrame(rw.prim, 'Dimensions')!, fonts = groupFrame(rw.prim, 'Fonts')!;
    // Two groups on Primitive tokens, stacked down one column in the table's order, left-aligned, 320 apart (Q1 A, Q2 A).
    ok(!!dims && !!fonts && pageFrames(rw.prim).length === 2 && dims.x === 0 && dims.y === 0 && fonts.x === 0 && fonts.y === dims.height + 320,
      `23: Dimensions then Fonts, stacked from the page's origin, left-aligned, 320 apart (Dimensions ${dims?.x},${dims?.y} ${dims?.height} tall; Fonts ${fonts?.x},${fonts?.y})`);
    // THE MEASURED LAYOUT: vertical auto layout, 88 on top, 160 on the sides and bottom, 80 under the title, guides 160
    // apart in a grid, transparent; the title a Size=Large header, its description off (decision 2), FILLing the group.
    const head = dims.children[0], grid = guidesOf(dims)!;
    ok(dims.layoutMode === 'VERTICAL' && dims.paddingTop === 88 && dims.paddingLeft === 160 && dims.paddingRight === 160 && dims.paddingBottom === 160 && dims.itemSpacing === 80
      && Array.isArray(dims.fills) && (dims.fills as unknown[]).length === 0 && grid.layoutMode === 'GRID' && grid.gridColumnGap === 160 && grid.gridRowGap === 160 && (grid.fills as unknown[]).length === 0
      && [...grid.gridColumnSizes, ...grid.gridRowSizes].every((t) => t.type === 'HUG'),
      `23: a group is a transparent vertical auto layout, 88 / 160 / 160 / 160, 80 under its title, its guides in a HUG grid 160 apart (${dims.layoutMode} ${dims.paddingTop}/${dims.paddingRight}/${dims.paddingBottom}/${dims.paddingLeft}, ${dims.itemSpacing}; ${grid.layoutMode} ${grid.gridColumnGap})`);
    ok(head?.mainComponent?.name === 'Size=Large' && head.findOne((k) => k.name === 'Title')?.characters === 'Dimensions' && head.componentProperties?.['Description#1:0']?.value === false
      && head.lsh === 'FILL' && head.width === dims.width - 320,
      `23: its title is a Size=Large header reading "Dimensions", the description off, spanning the group (${head?.mainComponent?.name}, ${head?.width} of ${dims.width - 320})`);
    // Each guide in plan order along its group's one row.
    const order = (g: N): string => guidesOf(g)!.children.slice().sort((x, y) => x.gridCol! - y.gridCol!).map((k) => `${k.gridRow}:${k.name.replace('Style guide — ', '')}`).join(', ');
    ok(order(dims) === '0:Dimension, 0:Opacity, 0:Density, 0:Step' && order(fonts) === '0:Font family, 0:Font size, 0:Font weight, 0:Line height, 0:Letter spacing',
      `23: each guide sits in its group in plan order, one row (${order(dims)} | ${order(fonts)})`);
    // A WIDTH CHANGE, by a filtered run: Density's description column widens by a 100-character description. Its group
    // widens by exactly that; nothing on the page moves (one column of groups).
    const snap = new Map(pageFrames(rw.prim).map((w) => [w, { x: w.x, y: w.y }]));
    const moved = (w: N): string => `${w.x - snap.get(w)!.x},${w.y - snap.get(w)!.y}`;
    const densityW = tableFrame(rw.prim, 'Density')!;
    const [dw0, gw0] = [densityW.width, dims.width];
    rw.vars.find((v) => v.name === 'density/space/gap')!.description = 'W'.repeat(100);
    await draw(rw.api, contract, { tables: ['Density'] });
    const dDelta = densityW.width - dw0;
    ok(dDelta === WIDEN_DENSITY && dims.width - gw0 === WIDEN_DENSITY && moved(dims) === '0,0' && moved(fonts) === '0,0',
      `23: a width change widens its group by exactly it and moves nothing: Density +${dDelta}px, Dimensions +${dims.width - gw0}, Fonts ${moved(fonts)}`);
    // A HEIGHT CHANGE: two new steps make Dimension, the group's tallest guide, two rows taller; the group grows by that,
    // and the group below it moves down by exactly that. A filtered run, so nothing else moves.
    for (const w of pageFrames(rw.prim)) snap.set(w, { x: w.x, y: w.y });
    const dimW = tableFrame(rw.prim, 'Dimension')!;
    const [h0, w0, gh0] = [dimW.height, dimW.width, dims.height];
    for (const n of [7, 9]) rw.vars.push({ id: `VariableID:core:grow${n}`, name: `pds3/core/dimension/${n}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'FLOAT', description: '', valuesByMode: { 'core:0': n }, scopes: ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'STROKE_FLOAT'] });
    await draw(rw.api, contract, { tables: ['Dimension'] });
    const hDelta = dimW.height - h0;
    ok(hDelta === GROW_DIMENSION && dimW.width === w0 && dims.height - gh0 === GROW_DIMENSION && moved(fonts) === `0,${GROW_DIMENSION}` && moved(dims) === '0,0'
      && fonts.pluginData['prism3-style-guide-group-at'] === `${fonts.x},${fonts.y}`,
      `23: a height change moves the group below down by exactly it, its record with it: Dimension +${hDelta}px tall, Dimensions +${dims.height - gh0}, Fonts ${moved(fonts)}, Dimensions ${moved(dims)}`);
    // A FULL RUN re-stacks: Fonts sits 320 below Dimensions again after any change.
    await draw(rw.api, contract);
    ok(fonts.y === dims.y + dims.height + 320 && fonts.x === dims.x, `23: a full run stacks the groups 320 apart (Fonts at ${fonts.y}, Dimensions ends at ${dims.y + dims.height})`);
    // A FIRST-TIME GROUP, drawn by a filtered run, goes 320 below the page's lowest content, at its left edge.
    const nc = await phase2File();
    await draw(nc.api, contract, { types: ['dimension'] });
    const lowest = Math.max(...pageFrames(nc.prim).map((w) => w.y + w.height));
    await draw(nc.api, contract, { tables: ['Font family'] });
    const ff = groupFrame(nc.prim, 'Fonts');
    ok(ff?.x === 0 && ff?.y === lowest + 320 && cellOf(tableFrame(nc.prim, 'Font family')) === '0,0', `23: a first-time group starts 320 below the lowest content (${ff?.x},${ff?.y} for 0,${lowest + 320})`);
  }

  console.log('24. the review of f3bb76cd: no silent spacing miss, one verdict per specimen, a new table that pushes its row down');
  {
    // (3) A HUGGING BRACKET WHOSE BARS ARE IN FLOW: its bars would add their widths to the padding's, so it gets the
    // one restructure line, like a fixed-width frame.
    const shimOwner = async (spacing: N | null): Promise<Shim & { prim: N; fc: N }> => {
      const fc = page(FC), prim = page(PRIM), sem = page(SEM), sgc = page('Style Guide Components');
      fc.appendChild(headerSet());
      if (spacing) sgc.appendChild(spacing);
      const one = (id: string): ShimCol => ({ id: `VariableCollectionId:${id}`, name: id, modes: [{ modeId: `${id}:0`, name: 'Default' }], defaultModeId: `${id}:0` });
      const vars: ShimVar[] = [0, 4, 8, 64, 128].map((n) => ({ id: `VariableID:nbds/dimension/${n}`, name: `nbds/dimension/${n}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'FLOAT', description: '', valuesByMode: { 'core:0': n }, scopes: [] }));
      const s = makeShim([page('Cover'), prim, sem, fc, sgc], [one('core')], vars);
      await ensureStyleGuideCells(s.api, fc);
      return { ...s, prim, fc };
    };
    const rn = await shimOwner(ownerSpacingSet('inflow'));
    const rr = await draw(rn.api, contract, { dimensionDisplay: 'line' });
    ok(rr.unbound === 5 && rr.misses.includes('5 spacing specimens are not sized, in 1 table. _style-guide-spacing-cells: make spacing-line-example a hug frame sized by left padding, with any bars positioned absolutely. Figma does not let a plugin resize a layer inside an instance.')
      && styleGuideSummary(rr).headline === '⚠ 5 specimens unbound',
      `24: a hugging bracket with its bars in flow cannot be sized by its padding: all 5 counted, in the one restructure line: ${rr.unbound} — "${styleGuideSummary(rr).headline}" (${rr.misses.filter((m) => /spacing/.test(m)).join(' / ')})`);
    // (4) NO SPACING SET AT ALL (every file set up before phase 2): each spacing specimen is counted, and the run is not
    // a pass. Five brackets here.
    const ns = await shimOwner(null);
    const set = setsNamed(ns.pages, '_style-guide-spacing-cells')[0];
    set.remove();
    const rs = await draw(ns.api, contract);
    ok(setsNamed(ns.pages, '_style-guide-spacing-cells').length === 0 && rs.unbound === 5 && !styleGuideSummary(rs).ok && styleGuideSummary(rs).headline === '⚠ 5 specimens unbound'
      && rs.misses.includes('5 display=filled spacing specimens are not drawn: this file has no _style-guide-spacing-cells set, which Set up file adds (Dimension: 0, 4, 8 and 2 more)'),
      `24: with no spacing set, every spacing specimen is counted and the run is not a pass: ${rs.unbound} — "${styleGuideSummary(rs).headline}"`);
    // (5) ONE VERDICT PER SPECIMEN: a bracket whose padding bind the host refuses counts once, in one report line.
    const one = await shimOwner(null);
    refuseBinding = true;
    let ro: StyleGuideResult;
    try { ro = await draw(one.api, contract); } finally { refuseBinding = false; }
    const spacingMisses = ro.misses.filter((m) => /display=filled/.test(m));
    // Four of the five: dimension/0 draws nothing, so it binds nothing (owner decision, live QA of 0.210.0).
    ok(ro.unbound === 4 && spacingMisses.length === 1 && spacingMisses[0].startsWith('4 display=filled spacing specimens are not bound to their variable'),
      `24: four bars whose padding bind is refused count once each, 4, in one report line; the zero binds nothing (${ro.unbound}; ${spacingMisses.join(' / ')})`);
    // (2) A NEW TABLE FROM A FILTERED RUN, TALLER THAN ITS GROUP, pushes the groups below it down (#2801): an 80-step
    // collection drawn alone joins the end of Dimensions, which grows to hold it, and Fonts moves down by exactly that.
    const tl = await phase2File();
    await draw(tl.api, contract);
    tl.cols.push({ id: 'VariableCollectionId:tall', name: 'tall', modes: [{ modeId: 'tall:0', name: 'Default' }], defaultModeId: 'tall:0' });
    for (let i = 1; i <= 80; i++) tl.vars.push({ id: `VariableID:tall:${i}`, name: `tall/ramp/${i}`, variableCollectionId: 'VariableCollectionId:tall', resolvedType: 'FLOAT', description: '', valuesByMode: { 'tall:0': i }, scopes: ['WIDTH_HEIGHT'] });
    const tdims = groupFrame(tl.prim, 'Dimensions')!, tfonts = groupFrame(tl.prim, 'Fonts')!;
    const [dimsH, fontsY] = [tdims.height, tfonts.y];
    const rt = await draw(tl.api, contract, { tables: ['Ramp'] });
    const ramp = tableFrame(tl.prim, 'Ramp');
    ok(rt.tables[0]?.status === 'created' && ramp?.parent === guidesOf(tdims) && cellOf(ramp) === '0,4' && ramp.height === RAMP_H
      && tdims.height === 88 + 80 + RAMP_H + 160 && tfonts.y - fontsY === tdims.height - dimsH && tfonts.y === tdims.height + 320,
      `24: a new 80-step table joins the end of Dimensions, ${ramp?.height}px tall, and Fonts moves down by exactly the group's growth (${cellOf(ramp)}; Dimensions ${dimsH} → ${tdims.height}; Fonts ${fontsY} → ${tfonts.y})`);
  }

  console.log('25. REM on and REM off on every dimension and font-variable table (#2153)');
  {
    // THE EXPECTED COLUMNS ARE LITERALS, one list per table and per setting, read off the fixture's collections and modes
    // (`phase2Variables`): density's two modes, type-sets' desktop and mobile, Default everywhere else. A length table
    // (dimension, font size, line height, letter spacing) has a REM column after each Value column when REM is on; a
    // family or a weight never has one. Never built from the planner's or the drawer's own column lists.
    const ONE_ON = ['Token', 'Default', 'Value', 'REM', 'Description'];
    const ONE_OFF = ['Token', 'Default', 'Value', 'Description'];
    const REM_ON: Record<string, string[]> = {
      'Density': ['Token', 'compact', 'Value', 'REM', 'comfortable', 'Value', 'REM', 'Description'],
      'Dimension': ONE_ON, 'Step': ONE_ON, 'Size': ONE_ON, 'Space': ONE_ON, 'Radius': ONE_ON,
      'Font size': ONE_ON,
      'Line height': ONE_ON, 'Letter spacing': ONE_ON,
      'Font family': ONE_OFF, 'Font weight': ONE_OFF, 'Font weight roles': ONE_OFF,
      // An opacity is not a length (#2353): no REM column, on or off.
      'Opacity': ONE_OFF,
    };
    const REM_OFF: Record<string, string[]> = {
      'Density': ['Token', 'compact', 'Value', 'comfortable', 'Value', 'Description'],
      'Dimension': ONE_OFF, 'Step': ONE_OFF, 'Size': ONE_OFF, 'Space': ONE_OFF, 'Radius': ONE_OFF,
      'Font size': ONE_OFF,
      'Line height': ONE_OFF, 'Letter spacing': ONE_OFF,
      'Font family': ONE_OFF, 'Font weight': ONE_OFF, 'Font weight roles': ONE_OFF,
      // An opacity is not a length (#2353): no REM column, on or off.
      'Opacity': ONE_OFF,
    };
    const TITLES = JSON.stringify(Object.keys(REM_ON).sort());
    const REM_CELL = /^(-?\d+(\.\d+)?rem|—)$/;
    const ANY_REM = /^-?\d+(\.\d+)?rem$/;
    const same = (a: readonly string[] | undefined, b: readonly string[]): boolean => JSON.stringify(a) === JSON.stringify(b);

    // THE PLAN: the planner's columns, and every cell's `rem`: set on a length table with REM on, unset otherwise.
    const fx = phase2Variables();
    const catalog: SgCatalog = { collections: fx.cols, variables: fx.vars, textStyles: fx.styles };
    for (const [setting, rem, want] of [['on', undefined, REM_ON], ['off', false, REM_OFF]] as const) {
      const plan = planStyleGuide(catalog, contract, rem === false ? { rem } : {});
      const tables = plan.tables.filter((t) => t.type !== 'typography');
      ok(JSON.stringify(tables.map((t) => t.title).sort()) === TITLES, `25: REM ${setting}: the plan has the 13 dimension, opacity and font-variable tables (${tables.map((t) => t.title).join(', ')})`);
      const wrongCols = tables.filter((t) => !same(t.columns, want[t.title] ?? [])).map((t) => `${t.title}: ${t.columns.join(' · ')}`);
      ok(wrongCols.length === 0, `25: REM ${setting}: the plan's columns are each table's exact list${wrongCols.length ? ` (${wrongCols.join(' / ')})` : ''}`);
      const wrongCells = tables.flatMap((t) => {
        const hasRem = (want[t.title] ?? []).includes('REM');
        return t.rows.flatMap((r) => r.cells.filter((c) => hasRem ? !(typeof c.rem === 'string' && REM_CELL.test(c.rem)) : c.rem !== undefined)
          .map((c) => `${t.title} ${r.token} ${c.modeName}: ${String(c.rem)}`));
      });
      const cellCount = tables.reduce((n, t) => n + t.rows.reduce((m, r) => m + r.cells.length, 0), 0);
      ok(cellCount > 0 && wrongCells.length === 0, `25: REM ${setting}: every planned cell ${setting === 'on' ? 'of a length table has its REM, and no family or weight cell has one' : 'has no REM'} (${cellCount} cells${wrongCells.length ? `; ${wrongCells.slice(0, 4).join(' / ')}` : ''})`);
    }

    // THE DRAWN TABLES: the header row, and every body row's cells. With REM on, each REM column's cell reads REM (or
    // "—"); with REM off, no cell sits past the header's last column and no cell reads REM. Drawn first-time with REM
    // on, then first-time with REM off, then REM on redrawn with REM off (the toggle a designer makes).
    const drawnTables = (sh: { prim: N; sem: N }): N[] => [...tablesOn(sh.prim), ...tablesOn(sh.sem)].filter((w) => w.name !== 'Style guide — Text styles');
    const titleOf = (w: N): string => w.name.replace('Style guide — ', '');
    const checkDrawn = (sh: { prim: N; sem: N }, setting: 'on' | 'off', how: string): void => {
      const want = setting === 'on' ? REM_ON : REM_OFF;
      const ws = drawnTables(sh);
      ok(JSON.stringify(ws.map(titleOf).sort()) === TITLES, `25: REM ${setting}, ${how}: the 13 dimension, opacity and font-variable tables are drawn (${ws.map(titleOf).join(', ')})`);
      const wrongHeads = ws.filter((w) => !same(headerRow(w), want[titleOf(w)] ?? [])).map((w) => `${titleOf(w)}: ${headerRow(w).join(' · ')}`);
      ok(wrongHeads.length === 0, `25: REM ${setting}, ${how}: each table's header row is its exact column list${wrongHeads.length ? ` (${wrongHeads.join(' / ')})` : ''}`);
      const wrongCells: string[] = [];
      let bodyRows = 0;
      for (const w of ws) {
        const cols = want[titleOf(w)] ?? [];
        const g = gridOf(w);
        const rows = [...new Set(g.children.map((k) => k.gridRow!).filter((r) => r > 0))];
        bodyRows += rows.length;
        for (const r of rows) {
          const cells = g.children.filter((k) => k.gridRow === r);
          for (const k of cells) if (k.gridCol! >= cols.length) wrongCells.push(`${titleOf(w)} row ${r}: a cell in column ${k.gridCol} past "${cols[cols.length - 1]}" reads "${textIn(k)}"`);
          cols.forEach((name, c) => {
            const t = textIn(cellAt(g, r, c));
            if (name === 'REM' && !REM_CELL.test(t)) wrongCells.push(`${titleOf(w)} row ${r}: its REM cell reads "${t}"`);
            if (name !== 'REM' && ANY_REM.test(t)) wrongCells.push(`${titleOf(w)} row ${r}: its ${name} cell reads "${t}"`);
          });
        }
      }
      ok(bodyRows > 0 && wrongCells.length === 0, `25: REM ${setting}, ${how}: ${setting === 'on' ? 'every row has a REM cell under each REM column' : 'no row has a REM cell'}, and no cell sits outside its column (${bodyRows} rows${wrongCells.length ? `; ${wrongCells.slice(0, 4).join(' / ')}` : ''})`);
    };
    const on = await phase2File();
    await draw(on.api, contract);
    checkDrawn(on, 'on', 'first draw');
    const off = await phase2File();
    await draw(off.api, contract, { rem: false });
    checkDrawn(off, 'off', 'first draw');
    await draw(on.api, contract, { rem: false });
    checkDrawn(on, 'off', 'redrawn from REM on');
  }

  console.log('26. the Build style guides page: what the file holds, and whether Set up file has run (S11.2)');
  {
    // THE TABLES THE PAGE OFFERS, typed here: the prism3 file's 29, in draw order (section 14 counts the same run).
    const PRISM3_TITLES = ['Core — base', 'Primary', 'Neutral', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha',
      'Background', 'Foreground', 'Text', 'Interactive', 'Border', 'Icon', 'Disabled', 'Scrim', 'Veil', 'Field', ...SEM_INVERSE, 'Legacy'];
    const f25 = await fullFile();
    const cat = catalogFor({ collections: f25.cols, variables: f25.vars }, contract, isSetUp(f25.api.root));
    ok(JSON.stringify(cat.tables.map((t) => t.title)) === JSON.stringify(PRISM3_TITLES) && cat.tables.every((t) => t.kind === 'color')
      && cat.tables.filter((t) => t.page === 'Semantic tokens').length === 18 && cat.tables.filter((t) => t.page === 'Primitive tokens').length === 11,
      `26: the page is offered the 29 tables in draw order, all color, 18 semantic and 11 primitive, named without "↳" (${cat.tables.slice(0, 3).map((t) => `${t.title}@${t.page}`).join(', ')}…)`);
    ok(JSON.stringify(cat.collections.map((c) => `${c.name}:${c.modes.join('/')}:${c.items.length}`)) === JSON.stringify(['core:Default:164', 'color:light/dark/hc-light/hc-dark:268', 'legacy:Value:4']),
      `26: every collection, its modes and every variable in it (${cat.collections.map((c) => `${c.name} ${c.items.length}`).join(', ')})`);
    const item = (n: string) => cat.collections.flatMap((c) => c.items).find((i) => i.name === n);
    ok(cat.tables[item('pds3/color/text/primary')!.table]?.title === 'Text' && cat.tables[item('pds3/core/palette/primary/500')!.table]?.title === 'Primary'
      && item('pds3/core/palette/white')?.value === '#FFFFFF' && item('pds3/color/background/secondary')?.value === '#E9E9E9' && item('pds3/core/palette/transparent')?.value === '#000000 · 0%',
      `26: a variable names the table it is drawn in, and its value in the default mode (text/primary in ${cat.tables[item('pds3/color/text/primary')!.table]?.title}; white ${item('pds3/core/palette/white')?.value})`);
    // THE TREE AGREES WITH THE RUN: draw the file, then read each drawn table's rows back off the frame's own record
    // (the variable IDs the executor wrote), never off the plan. Every variable sits under the table that drew it.
    await draw(f25.api, contract);
    const byId = new Map(f25.vars.map((v) => [v.id, v.name]));
    const wrong: string[] = [];
    for (const w of [...tablesOn(f25.prim), ...tablesOn(f25.sem)]) {
      const title = w.name.replace('Style guide — ', '');
      for (const id of Object.keys(JSON.parse(w.pluginData['prism3-style-guide-rows'] || '{}'))) {
        const it = item(byId.get(id) ?? '');
        if (!it || cat.tables[it.table]?.title !== title) wrong.push(`${byId.get(id)} in ${title}`);
      }
    }
    ok(wrong.length === 0 && cat.collections.flatMap((c) => c.items).every((i) => i.table >= 0),
      `26: every drawn row's variable is listed under the table that drew it (${wrong.length} not: ${wrong.slice(0, 3).join(', ')})`);
    ok(cat.setUp === true, '26: the file with both cell sets and both token pages is set up');
    const bare = makeShim([page('Cover'), page(PRIM), page(SEM)], [], []);
    const fc25 = page(FC);
    const noPages = makeShim([page('Cover'), fc25], [], []);
    await ensureStyleGuideCells(noPages.api, fc25);
    ok(isSetUp(bare.api.root) === false && isSetUp(noPages.api.root) === false,
      `26: pages without the cell sets, or the cell sets without the pages, are not set up (${isSetUp(bare.api.root)}, ${isSetUp(noPages.api.root)})`);
    // PHASE 2'S FILE: a text style under the text-style table, and (#2353) an opacity under the Opacity table. Nothing in
    // it is left for a later phase now; table -1 is asserted in 35.
    const f25b = await phase2File();
    const cat2 = catalogFor({ collections: f25b.cols, variables: f25b.vars, textStyles: f25b.styles }, contract, true);
    const all2 = cat2.collections.flatMap((c) => c.items);
    const ts = cat2.collections.find((c) => c.textStyles);
    ok(ts?.name === 'Text styles' && ts.items.length === 80 && ts.items.every((i) => cat2.tables[i.table]?.title === 'Text styles' && cat2.tables[i.table]?.kind === 'text'),
      `26: the 80 text styles are listed last, as "Text styles", each under the text-style table (${ts?.items.length})`);
    const later = all2.filter((i) => i.table < 0).map((i) => i.name);
    const tableOf2 = (name: string): string | undefined => cat2.tables[all2.find((i) => i.name === name)?.table ?? -1]?.title;
    ok(later.length === 0 && tableOf2('pds3/opacity/50') === 'Opacity' && tableOf2('pds3/space/050') === 'Space',
      `26: an opacity is listed under the Opacity table and a space under Space, and nothing is left with no table (${tableOf2('pds3/opacity/50')}; ${later.length} with none: ${later.slice(0, 3).join(', ')})`);
    ok(cat2.tables.some((t) => t.kind === 'dimension' && t.title === 'Space') && cat2.tables.some((t) => t.kind === 'font' && /^Font size/.test(t.title)),
      `26: the page's four kinds: Space is spacing and size, Font size a font variable (${[...new Set(cat2.tables.map((t) => t.kind))].join(', ')})`);
  }

  console.log('27. a run table by table: its list, then each table drawing and done (S11.2, owner decision P1)');
  {
    const f26 = await fullFile();
    const events: string[] = [];
    let listed: string[] = [];
    await draw(f26.api, contract, {}, { onPlan: (ts) => { listed = ts.map((t) => t.title); }, onTable: (e) => events.push(`${e.index}:${e.status}`) });
    const want = Array.from({ length: 29 }, (_, i) => [`${i}:drawing`, `${i}:done`]).flat();
    ok(listed.length === 29 && listed[0] === 'Core — base' && listed[28] === 'Legacy' && JSON.stringify(events) === JSON.stringify(want),
      `27: the run lists its 29 tables first, then each one drawing and then done, in order (${events.slice(0, 4).join(', ')}… ${events.length} moves)`);
  }

  console.log('28. one failed table does not stop the run, and Draw it again redraws that table alone (S11.2, owner decision P6)');
  {
    const f27 = await fullFile();
    // THE HOST REFUSES ONE TABLE: binding any Accent step throws, as a host refusing a write would.
    const realBind = f27.api.variables.setBoundVariableForPaint;
    let refuse = true;
    f27.api.variables.setBoundVariableForPaint = (paint: unknown, field: 'color', v: unknown) => {
      if (refuse && /\/palette\/accent\//.test(String((v as { name?: string }).name))) throw new Error('Accent refused');
      return realBind(paint, field, v);
    };
    const events: string[] = [];
    const keys: string[] = [];
    // A run that rethrows the host's error is this section's defect, so it fails here by name rather than crashing the suite.
    let r: StyleGuideResult;
    try {
      r = await draw(f27.api, contract, {}, { onPlan: (ts) => { keys.push(...ts.map((t) => t.key)); }, onTable: (e) => events.push(`${e.index}:${e.status}${e.reason ? `(${e.reason})` : ''}`) });
    } catch (e) {
      ok(false, `28: the run survives a table the host refuses, and does not throw (it threw "${(e as Error)?.message}")`);
      r = { tables: [], stale: [], replaced: [], deleted: [], kept: [], unbound: 0, notes: [], misses: [], unmatched: [] };
    }
    const accent = 3;
    const failedT = r.tables.filter((t) => t.status === 'failed');
    ok(failedT.length === 1 && failedT[0].title === 'Accent' && (failedT[0] as Extract<TableOutcome, { status: 'failed' }>).reason === 'Accent refused'
      && r.tables.filter((t) => t.status === 'created').length === 28,
      `28: the Accent table fails with the host's words, and the run goes on to draw the other 28 (${r.tables.map((t) => t.status).filter((x) => x !== 'created').join(', ')}; ${r.tables.filter((t) => t.status === 'created').length} created)`);
    ok(events[accent * 2] === '3:drawing' && events[accent * 2 + 1] === '3:failed(Accent refused)' && events[accent * 2 + 2] === '4:drawing' && events.length === 58,
      `28: the Accent table's moves read drawing, then failed with its reason, and the next table starts (${events.slice(6, 9).join(', ')})`);
    const v = styleGuideSummary(r);
    ok(!v.ok && v.headline === '⚠ 28 drawn, 1 failed' && v.summary.startsWith('Accent: Accent refused. '),
      `28: the verdict is "⚠ 28 drawn, 1 failed", not a pass, and the summary opens on the failed table and its reason (${v.headline}; ${v.summary.slice(0, 40)}…)`);
    // DRAW IT AGAIN: the host now takes the binding, and the page redraws the one table by its key.
    refuse = false;
    const others = [...tablesOn(f27.prim), ...tablesOn(f27.sem)].filter((w) => w.pluginData['prism3-style-guide'] !== keys[accent]);
    const prints = new Map(others.map((w) => [w, w.pluginData['prism3-style-guide-print']]));
    const again: string[] = [];
    const r2 = await draw(f27.api, contract, { tables: [keys[accent]] }, { onTable: (e) => again.push(`${e.index}:${e.status}`) });
    const acc = tableFrame(f27.prim, 'Accent');
    ok(r2.tables.length === 1 && r2.tables[0].title === 'Accent' && r2.tables[0].status !== 'failed' && JSON.stringify(again) === JSON.stringify(['0:drawing', '0:done'])
      && styleGuideSummary(r2).headline === '✓ style guide: 1 table' && !!acc && acc.findAll((n) => boundId(n.fills) !== undefined).length === 20,
      `28: Draw it again draws Accent alone, its 20 swatches bound this time (${r2.tables.map((t) => `${t.title} ${t.status}`).join(', ')}; ${styleGuideSummary(r2).headline})`);
    ok(tablesOn(f27.prim).filter((w) => w.name === 'Style guide — Accent').length === 1 && [...prints].every(([w, p]) => w.pluginData['prism3-style-guide-print'] === p),
      `28: there is one Accent table, and no other table moved (${[...prints].filter(([w, p]) => w.pluginData['prism3-style-guide-print'] !== p).length} changed)`);
  }

  console.log('29. Cancel stops after the table being drawn, and deletes nothing (S11.2, owner decision P7)');
  {
    const f28 = await fullFile();
    await draw(f28.api, contract);
    // The Legacy group is emptied: an unfiltered run that finishes deletes its unedited table (section 6).
    const legacy = f28.vars.filter((v) => v.name.startsWith('legacy/'));
    for (const v of legacy) f28.vars.splice(f28.vars.indexOf(v), 1);
    let done = 0;
    const r = await draw(f28.api, contract, {}, { onTable: (e) => { if (e.status === 'done') done++; }, stop: () => done >= 3 });
    ok(r.tables.length === 3 && JSON.stringify(r.stopped) === JSON.stringify({ done: 3, total: 28 }) && done === 3,
      `29: a stop read after the third table ends the run there: 3 of 28 reached (${r.tables.length} outcomes; ${JSON.stringify(r.stopped)})`);
    ok(r.deleted.length === 0 && r.stale.length === 0 && !!tableFrame(f28.prim, 'Legacy'),
      `29: a stopped run judges no superseded table: the emptied Legacy table stays (deleted ${r.deleted.length}, stale ${r.stale.length})`);
    const v = styleGuideSummary(r);
    ok(v.ok && v.headline === '✓ style guide: 3 tables' && v.summary.includes('Stopped after table 3 of 28. The tables already drawn stay'),
      `29: the verdict counts the 3 tables and says where it stopped (${v.headline}; ${v.summary.slice(0, 120)})`);
    // The control: the same file, run to the end, deletes the Legacy table, so the stop is what kept it.
    const full = await draw(f28.api, contract);
    ok(!full.stopped && full.deleted.includes('Style guide — Legacy'), `29: run to the end, the same file deletes the Legacy table (${full.deleted.join(', ')})`);
    // A stop read after the LAST table is no stop.
    let n = 0;
    const last = await draw(f28.api, contract, {}, { onTable: (e) => { if (e.status === 'done') n++; }, stop: () => n >= 28 });
    ok(!last.stopped && last.tables.length === 28, `29: a stop that turns true only after the last table is not a stop (${JSON.stringify(last.stopped)})`);
  }

  console.log('30. the NB master QA (2026-10-06): font-size rows, the palette swatch, the skip count, a filtered run (#2267, #2268, #2261, #2269)');
  {
    // #2267: a font-size specimen at the font's own line height. The text cell's text keeps a fixed 20px line, so a 128px
    // specimen drew a 20px box and spilled over its neighbors (measured live, 2026-10-07: 128px text, a 20px line, a 20px
    // box; AUTO, 155px). The shim draws every line at one height, so this holds the line height itself, on every
    // specimen of every font-size table, every mode column.
    const fz = await phase2File();
    await draw(fz.api, contract, { types: ['fontSize'] });
    const sizeTables = [...tablesOn(fz.prim), ...tablesOn(fz.sem)].filter((w) => /^fontSize\|/.test(w.pluginData['prism3-style-guide']));
    const specimens = sizeTables.flatMap((w) => gridOf(w).findAll((k) => k.type === 'TEXT' && k.characters === 'Abc 123'));
    const fixed = specimens.filter((t) => (t.lineHeight as { unit?: string } | undefined)?.unit !== 'AUTO');
    ok(sizeTables.length > 0 && specimens.length >= 20 && fixed.length === 0,
      `30 #2267: every font-size specimen takes the font's own line height (AUTO), so its row grows to fit it (${sizeTables.length} table(s), ${specimens.length} specimen(s), ${fixed.length} fixed: ${JSON.stringify(fixed[0]?.lineHeight ?? null)})`);
    // The control: a font-family specimen keeps the cell's line height. Only the size is the specimen's.
    await draw(fz.api, contract, { types: ['fontFamily'] });
    const famSpec = tablesOn(fz.prim).filter((w) => /^fontFamily\|/.test(w.pluginData['prism3-style-guide'])).flatMap((w) => gridOf(w).findAll((k) => k.type === 'TEXT' && k.characters === 'Abc 123'));
    ok(famSpec.length > 0 && famSpec.every((t) => (t.lineHeight as { unit?: string } | undefined)?.unit !== 'AUTO'), `30 #2267: control: a font-family specimen keeps the cell's own line height (${famSpec.length})`);

    // #2268: the palette swatch FILLs its cell (decision 13) and its square grows with it; its edge is the brand's
    // color.border.secondary (owner, 2026-10-07). The square grows by its constraints, which the host carries into an instance.
    const squares = (set: N | undefined): N[] => (set?.children ?? []).filter((m) => /^type=(default|border|transparency)$/.test(m.name)).flatMap((m) => m.children.filter((k) => k.name === 'Specimen' || k.name === 'Checker'));
    const stretched = (k: N): boolean => k.constraints?.horizontal === 'STRETCH' && k.constraints?.vertical === 'STRETCH';
    const fresh = await fullFile();
    const freshSet = setsNamed(fresh.pages, '_style-guide-swatches')[0];
    ok(squares(freshSet).length === 4 && squares(freshSet).every(stretched) && freshSet?.pluginData['prism3-swatches'] === '1',
      `30 #2268: Set up file builds the filled, border and transparency squares to stretch with the swatch, and marks the set Prism3's (${squares(freshSet).map((k) => JSON.stringify(k.constraints)).join(' ')}; mark ${JSON.stringify(freshSet?.pluginData['prism3-swatches'])})`);
    ok(setsNamed(fresh.pages, '_style-guide-swatches')[0]?.children.filter((m) => /^type=(text|icon|radius)$/.test(m.name)).flatMap((m) => m.children).every((k) => !stretched(k)),
      '30 #2268: the text, icon and radius marks keep their own size');
    // A set Set up file built before this (no mark, nothing stretched) is brought up to date by the run.
    const old = await fullFile();
    const oldSet = setsNamed(old.pages, '_style-guide-swatches')[0]!;
    delete oldSet.pluginData['prism3-swatches'];
    for (const k of squares(oldSet)) k.constraints = undefined;
    await draw(old.api, contract);
    ok(squares(oldSet).every(stretched) && oldSet.pluginData['prism3-swatches'] === '1',
      `30 #2268: a run brings a set Prism3 built before this up to date: its squares stretch, and it is marked (${squares(oldSet).map((k) => JSON.stringify(k.constraints ?? null)).join(' ')})`);
    // A set the owner made is never changed: here a default square of 40px, not this builder's 32.
    const own = await fullFile();
    const ownSet = setsNamed(own.pages, '_style-guide-swatches')[0]!;
    delete ownSet.pluginData['prism3-swatches'];
    for (const k of squares(ownSet)) k.constraints = undefined;
    const ownSq = ownSet.children.find((m) => m.name === 'type=default')!.children.find((k) => k.name === 'Specimen')!;
    ownSq.w = 40; ownSq.h = 40;
    await draw(own.api, contract);
    ok(squares(ownSet).every((k) => k.constraints === undefined) && ownSet.pluginData['prism3-swatches'] === undefined,
      `30 #2268: a swatch set the owner made is left as it is: nothing stretched, no mark (${squares(ownSet).map((k) => JSON.stringify(k.constraints ?? null)).join(' ')})`);
    // The edge (#2268, #2331) is gone (owner, #2336 review, 2026-10-08): a fill swatch has no outline, and the cell's
    // row line bounds it. Section 32 holds that, and the swatch's fill to the edge.
    await draw(fresh.api, contract);

    // #2261: a single skipped table is "1 table", as every other count in the summary reads.
    const one = (reason: 'no-page' | 'no-cells'): string => styleGuideSummary({ tables: [{ key: 'k', title: 'Brand', page: '↳ Semantic tokens', status: 'skipped', reason }], stale: [], replaced: [], deleted: [], kept: [], unbound: 0, notes: [], misses: [], unmatched: [] }).summary;
    ok(one('no-page').includes('1 table skipped — this file has no Semantic tokens page') && !one('no-page').includes('1 tables'),
      `30 #2261: one table skipped for a missing page reads "1 table skipped" (${one('no-page')})`);
    ok(one('no-cells').includes('1 table skipped — this file has no style-guide cell sets') && !one('no-cells').includes('1 tables'),
      `30 #2261: one table skipped for missing cell sets reads "1 table skipped" (${one('no-cells')})`);

    // #2269: a filtered run of several palettes on a page that already holds content draws them apart, from each other
    // and from what was there. (The owner's first NB run limited itself to the primitive palettes.)
    const titles = tablesOn(fresh.prim).map((w) => w.name.replace(/^Style guide — /, '')).slice(0, 3);
    const multi = await fullFile();
    const note = new N('FRAME'); note.name = 'designer note'; note.w = 600; note.h = 400; note.x = 0; note.y = 0;
    multi.prim.appendChild(note);
    await draw(multi.api, contract, { tables: titles });
    const boxes = pageFrames(multi.prim).map((n) => ({ n: n.name, x: Number(n.x), y: Number(n.y), w: n.width, h: n.height }));
    const hits = boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).map((b) => `${a.n} × ${b.n}`));
    ok(titles.length === 3 && tablesOn(multi.prim).length === 3 && boxes.length === 2 && hits.length === 0,
      `30 #2269: three palettes drawn in one filtered run on a page with content overlap nothing (${boxes.map((b) => `${b.n} ${b.x},${b.y} ${b.w}×${b.h}`).join(' | ')}${hits.length ? ` — overlap: ${hits.join(', ')}` : ''})`);
    // THE OWNER'S CASE, found live on the NB copy (2026-10-07): the run started while the page it draws on is the current
    // page, as it is when a designer is looking at it. The host puts each new frame there at 0, 0 before the run places it,
    // so a filtered run of tables in two categories (dimension and font) drew the second category's first table on top of
    // the first row (live: Primary 260,0, and a new category's row at 260,0 too).
    const cur = await phase2File();
    (cur.api as unknown as { currentPage: N }).currentPage = cur.prim;
    await draw(cur.api, contract, { tables: ['Dimension', 'Density', 'Font family', 'Font size'] });
    const cboxes = pageFrames(cur.prim).map((n) => ({ n: n.name.replace(/^Style guides? — /, ''), x: Number(n.x), y: Number(n.y), w: n.width, h: n.height }));
    const chits = cboxes.flatMap((a, i) => cboxes.slice(i + 1).filter((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).map((b) => `${a.n} × ${b.n}`));
    ok(cboxes.length === 2 && tablesOn(cur.prim).length === 4 && chits.length === 0 && cboxes.find((b) => b.n === 'Dimensions')?.x === 0 && cboxes.find((b) => b.n === 'Dimensions')?.y === 0,
      `30 #2269: drawn from its own page, a filtered run of two groups lays them apart, the first at the page's origin (${cboxes.map((b) => `${b.n} ${b.x},${b.y} ${b.w}×${b.h}`).join(' | ')}${chits.length ? ` — overlap: ${chits.join(', ')}` : ''})`);
  }

  console.log('31. inverse samples (#2331): only an inverse text, border or icon sample sits on the inverse background; every fill swatch fills its cell');
  {
    const inv = await fullFile();
    await draw(inv.api, contract, { tables: ['Inverse text', 'Inverse border', 'Inverse icon', 'Inverse background', 'Border', 'Text', 'Background'] });
    const idOf = (name: string): string | undefined => inv.vars.find((v) => v.name === name)?.id;
    const INV_GROUND = idOf('pds3/color/inverse/background/primary');
    const PAGE_GROUND = idOf('pds3/color/background/primary');
    const sample = (title: string, token: string): N | undefined => { const g = gridOf(tableFrame(inv.sem, title)); const r = rowOf(g, token); return r < 0 ? undefined : cellAt(g, r, 1); };
    const say = (n: N | undefined): string => (n ? `${n.type} ${n.name}${n.name === 'Ground' ? ` on ${JSON.stringify(boundId(n.fills) ?? null)}` : ''}` : 'no such row');
    // The defect the owner reported: an inverse TEXT sample on white, where #F7F7F7 cannot be seen. Its path has an
    // `inverse` segment; the table's common prefix (`pds3/color/inverse`) does not count against that.
    for (const token of ['text/primary', 'border/primary', 'icon/primary']) {
      const c = sample(`Inverse ${token.split('/')[0]}`, 'primary');
      ok(!!INV_GROUND && c?.name === 'Ground' && boundId(c.fills) === INV_GROUND,
        `31: an inverse ${token.split('/')[0]} sample (inverse/${token}) sits on the inverse background (${say(c)}; want ${INV_GROUND})`);
    }
    // THE OWNER'S FILE has no saved brand, so the run has no contract (the NB copy, 2026-10-08): the ground then comes
    // from the path below the table's own prefix, `…/inverse`, which no longer says inverse. The detection reads the
    // whole name, so it still lands on the inverse background.
    const bare = await fullFile();
    await draw(bare.api, null, { tables: ['Inverse text'] });
    const bareG = gridOf(tableFrame(bare.sem, 'Inverse text'));
    const bareText = cellAt(bareG, rowOf(bareG, 'primary'), 1);
    ok(bareText?.name === 'Ground' && boundId(bareText.fills) === bare.vars.find((v) => v.name === 'pds3/color/inverse/background/primary')?.id,
      `31: with no saved brand (no contract), an inverse text sample still sits on the inverse background, detected from its whole path (${say(bareText)})`);
    // An inverse FILL is a swatch: it fills its cell and never sits on the inverse backdrop.
    const fill = sample('Inverse background', 'primary');
    ok(fill?.type === 'INSTANCE' && fill.lsh === 'FILL' && boundId(fill.fills) === INV_GROUND,
      `31: an inverse fill (inverse/background/primary) fills its cell as its own swatch, on no backdrop (${say(fill)})`);
    // A non-inverse border (and text) sample is never on the inverse background: its page ground.
    for (const [title, token] of [['Border', 'primary'], ['Text', 'primary']] as const) {
      const c = sample(title, token);
      ok(!!PAGE_GROUND && c?.name === 'Ground' && boundId(c.fills) === PAGE_GROUND && boundId(c.fills) !== INV_GROUND,
        `31: a non-inverse ${title.toLowerCase()} sample (${title.toLowerCase()}/${token}) sits on the page ground, not the inverse one (${say(c)})`);
    }
  }

  console.log('32. the chrome (#2336): every cell and the table are solid white, the row lines are drawn and run across every column, and a fill swatch fills its cell with no outline');
  {
    // Every table the generator draws: the color tables of the full file and the dimension, font and text-style tables
    // of the phase-2 file.
    const full = await fullFile();
    await draw(full.api, contract);
    const p2 = await phase2File();
    await draw(p2.api, contract);
    const wraps = [...tablesOn(full.prim), ...tablesOn(full.sem), ...tablesOn(p2.prim), ...tablesOn(p2.sem)];
    type P = { type?: string; visible?: boolean; opacity?: number; color?: { r?: number; g?: number; b?: number; a?: number } };
    const paints = (ps: unknown): P[] => (Array.isArray(ps) ? ps as P[] : []);
    // A paint that hides the canvas: a visible solid, at full opacity and full alpha. Read off the drawn node.
    const hides = (p: P): boolean => p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) === 1 && (p.color?.a ?? 1) === 1;
    const isRgb = (p: P | undefined, r: number, g: number, b: number): boolean => !!p && hides(p) && [p.color?.r, p.color?.g, p.color?.b].every((x, i) => Math.round(Number(x) * 255) === [r, g, b][i]);
    const white = (ps: unknown): boolean => isRgb(paints(ps)[0], 255, 255, 255);
    const say = (k: N): string => `${k.parent?.parent?.name?.replace('Style guide — ', '')} r${k.gridRow} c${k.gridCol} ${k.type} ${k.mainComponent?.name ?? k.name}`;
    const cells = wraps.flatMap((w) => gridOf(w).children);
    const seeThrough = cells.filter((k) => !paints(k.fills).some(hides));
    ok(wraps.length >= 20 && cells.length > 3000 && seeThrough.length === 0,
      `32: no cell in any table is transparent: each has a solid fill (${wraps.length} tables, ${cells.length} cells; ${seeThrough.length} see-through: ${seeThrough.slice(0, 3).map(say).join('; ')})`);
    const bodyText = cells.filter((k) => k.gridRow > 0 && k.mainComponent?.parent?.name === '_style-guide-text-cells');
    const offWhite = bodyText.filter((k) => !white(k.fills));
    ok(bodyText.length > 1000 && offWhite.length === 0, `32: every body text cell is the chrome's fixed #FFFFFF (${offWhite.length} of ${bodyText.length} not: ${offWhite.slice(0, 2).map(say).join('; ')})`);
    const radiusCells = cells.filter((k) => k.name === 'Cell');
    ok(radiusCells.length > 0 && radiusCells.every((k) => white(k.fills)), `32: a radius specimen's own cell is #FFFFFF (${radiusCells.length})`);
    // The table frame is white; the WRAP around it (title, description and rule) has no fill since #2371: it sits on the
    // canvas, and only the table itself is solid.
    const openFrames = wraps.filter((w) => !white(gridOf(w).fills));
    ok(openFrames.length === 0, `32: every table frame is #FFFFFF (${openFrames.length} not: ${openFrames.slice(0, 3).map((w) => w.name).join(', ')})`);
    const filledWraps = wraps.filter((w) => paints(w.fills).some((p) => p.visible !== false));
    ok(filledWraps.length === 0, `32: no table's outer frame, the wrap holding its title, description and rule, has a fill (#2371; ${filledWraps.length} of ${wraps.length} filled: ${filledWraps.slice(0, 3).map((w) => w.name).join(', ')})`);
    // THE ROW LINES: a 1px #E0E0E0 bottom edge, inside, on every cell of every row, in every column, with no gap between
    // tracks, so each line runs unbroken across the table.
    const ruled = (k: N | undefined): boolean => !!k && paints(k.strokes).length === 1 && isRgb(paints(k.strokes)[0], 224, 224, 224)
      && k.strokeAlign === 'INSIDE' && k.strokeBottomWeight === 1 && k.strokeTopWeight === 0 && k.strokeLeftWeight === 0 && k.strokeRightWeight === 0;
    const breaks = wraps.flatMap((w) => {
      const g = gridOf(w);
      const out: string[] = [];
      if (g.gridColumnGap !== 0 || g.gridRowGap !== 0) out.push(`${w.name}: gaps ${g.gridRowGap}/${g.gridColumnGap}`);
      for (let r = 0; r < Number(g.gridRowCount); r++) for (let c = 0; c < Number(g.gridColumnCount); c++) if (!ruled(cellAt(g, r, c))) out.push(`${w.name.replace('Style guide — ', '')} r${r} c${c}`);
      return out;
    });
    ok(breaks.length === 0, `32: every row line runs across every column: each cell carries a 1px #E0E0E0 bottom line, with no gap between tracks (${breaks.length} breaks: ${breaks.slice(0, 4).join('; ')})`);
    const primary = gridOf(tableFrame(full.prim, 'Primary'));
    const swCol = primary.children.filter((k) => k.gridCol === 1 && k.gridRow > 0);
    ok(swCol.length >= 20 && swCol.every(ruled), `32: the row lines span the swatch column, the one that broke them (${swCol.filter((k) => !ruled(k)).length} of ${swCol.length} unruled)`);
    // A FILL SWATCH, palette and semantic alike: the color is the instance's own fill, over white, to the cell's edge,
    // its member's layers hidden, and no outline but the row line.
    const fills = cells.filter((k) => k.type === 'INSTANCE' && k.mainComponent?.parent?.name === '_style-guide-swatches' && k.mainComponent?.name !== 'type=radius');
    const semFills = fills.filter((k) => tablesOn(full.sem).includes(k.parent!.parent!));
    const notToEdge = fills.filter((k) => k.lsh !== 'FILL' || k.layoutSizingVertical !== 'FILL' || !white(k.fills) || paints(k.fills).length !== 2 || boundId(k.fills) === undefined
      || k.children.some((c) => c.visible !== false) || !ruled(k));
    ok(fills.length > 300 && semFills.length > 50 && notToEdge.length === 0,
      `32: every fill swatch fills its cell to the edge, the color over white, no layer showing and no outline but the row line (${fills.length} swatches, ${semFills.length} semantic; ${notToEdge.length} not: ${notToEdge.slice(0, 2).map(say).join('; ')})`);
  }

  console.log('33. the owner\'s QA of a real brand file (#2371): a mixed run never overlaps, no type-sets font-size table, font weight split, a family in a face it has');
  {
    /** Every pair of frames on a page whose boxes intersect: the groups and loose guides (#2801). */
    const overlapsOn = pageOverlaps;
    const GAP = 320;
    // (1) A MIXED RUN, filtered as the Build style guides page sends it when not every table is picked: tables updated in
    // place and tables created in one run. Here the updated ones NARROW (the Description column toggled off), as every
    // table did when #2336 removed its 2px gaps, and the new one joins their group, after them (#2801).
    const mx = await phase2File();
    await draw(mx.api, contract, { tables: ['Dimension', 'Density'] });
    const wide = tableFrame(mx.prim, 'Dimension')!.width;
    const mixed = await draw(mx.api, contract, { tables: ['Dimension', 'Density', 'Step'], description: false });
    const [dim, den, step] = ['Dimension', 'Density', 'Step'].map((t) => tableFrame(mx.prim, t)!);
    ok(JSON.stringify(mixed.tables.map((t) => `${t.title} ${t.status}`)) === JSON.stringify(['Dimension updated', 'Density updated', 'Step created']) && dim.width < wide
      && overlapsOn(mx.prim).length === 0 && [dim, den, step].map(cellOf).join(' ') === '0,0 0,1 0,2' && step.parent === dim.parent,
      `33: a mixed run, tables narrowed in place and one created in their group, overlaps nothing; each sits after the one before (Dimension ${cellOf(dim)} ${dim.width}, was ${wide}; Density ${cellOf(den)}; Step ${cellOf(step)}${overlapsOn(mx.prim).length ? `; overlap: ${overlapsOn(mx.prim).join('; ')}` : ''})`);
    // The same, down the page: the Dimensions group gets SHORTER (twelve steps gone) and a new group's first table, Font
    // family, starts its group below it.
    const mv = await phase2File();
    await draw(mv.api, contract, { tables: ['Dimension', 'Density'] });
    const tall = tableFrame(mv.prim, 'Dimension')!.height;
    const gone = mv.vars.filter((v) => /^pds3\/core\/dimension\//.test(v.name)).slice(-12).map((v) => v.id);
    for (const id of gone) mv.vars.splice(mv.vars.findIndex((v) => v.id === id), 1);
    await draw(mv.api, contract, { tables: ['Dimension', 'Density', 'Font family'] });
    const vdim = tableFrame(mv.prim, 'Dimension')!;
    const [vdims, vfonts] = [groupFrame(mv.prim, 'Dimensions')!, groupFrame(mv.prim, 'Fonts')!];
    const rowBottom = Number(vdims.y) + vdims.height;
    ok(gone.length === 12 && vdim.height < tall && overlapsOn(mv.prim).length === 0 && Number(vfonts.y) === rowBottom + GAP && Number(vfonts.x) === Number(vdims.x),
      `33: a mixed run whose group got shorter starts a new group ${GAP}px below it, over nothing (Dimension ${vdim.height} tall, was ${tall}; Fonts at ${vfonts?.x},${vfonts?.y}, Dimensions ends at ${rowBottom}${overlapsOn(mv.prim).length ? `; overlap: ${overlapsOn(mv.prim).join('; ')}` : ''})`);
    // And unfiltered: a run that updates some tables and creates the rest re-flows every row, over nothing.
    const mf = await phase2File();
    await draw(mf.api, contract, { tables: ['Dimension', 'Space', 'Font family'] });
    const all = await draw(mf.api, contract, { description: false });
    ok(all.tables.some((t) => t.status === 'updated') && all.tables.some((t) => t.status === 'created') && overlapsOn(mf.prim).length === 0 && overlapsOn(mf.sem).length === 0,
      `33: an unfiltered mixed run overlaps nothing on either page (${[...overlapsOn(mf.prim), ...overlapsOn(mf.sem)].join('; ') || 'none'})`);

    // (2) NO FONT-SIZE TABLE FOR THE TEXT STYLES' RESPONSIVE COLLECTION (owner decision Q133 A): type-sets, desktop and
    // mobile, whose 21 sizes the Text styles table prints per mode. The count is the emission's own, read here.
    const tsNames = (JSON.parse(readFileSync(join(OUT, 'type-sets.desktop.json'), 'utf8')) as { variables: { name: string }[] }).variables.map((v) => v.name);
    const fx2 = phase2Variables();
    const cat2: SgCatalog = { collections: fx2.cols, variables: fx2.vars, textStyles: fx2.styles };
    const plan2 = planStyleGuide(cat2, contract);
    const tsTables = plan2.tables.filter((t) => t.type === 'fontSize' && t.collectionId === 'VariableCollectionId:ts');
    ok(tsNames.length === 21 && tsTables.length === 0 && plan2.tables.filter((t) => t.type === 'fontSize').map((t) => t.title).join() === 'Font size',
      `33: no font-size table for the type-sets collection; the one left is the primitives', titled "Font size" (${plan2.tables.filter((t) => t.type === 'fontSize').map((t) => `${t.title} ${t.collectionId}`).join(', ')})`);
    const page2 = catalogFor(cat2, contract, true);
    const tsItems = page2.collections.find((c) => c.name === 'type-sets')?.items ?? [];
    const inText = tsItems.filter((it) => page2.tables[it.table]?.title === 'Text styles');
    ok(tsItems.length === 21 && inText.length === 21,
      `33: the Build style guides page lists the 21 type-sets sizes under Text styles, not as a later phase (${inText.length} of ${tsItems.length}; ${tsItems.filter((it) => page2.tables[it.table]?.title !== 'Text styles').slice(0, 2).map((it) => `${it.name} → ${it.table}`).join(', ')})`);
    // An earlier run's type-sets table is superseded: drawn while the file had no text styles, deleted unedited once it does.
    const old2 = await phase2File();
    const kept2 = old2.styles.splice(0, old2.styles.length);
    await draw(old2.api, contract);
    const hadOld = !!tableFrame(old2.prim, 'Font size (type-sets)');
    old2.styles.push(...kept2);
    const re2 = await draw(old2.api, contract);
    ok(hadOld && !tableFrame(old2.prim, 'Font size (type-sets)') && re2.deleted.includes('Style guide — Font size (type-sets)') && !!tableFrame(old2.prim, 'Font size'),
      `33: a type-sets font-size table an earlier run drew is deleted, unedited, and the primitives' table is "Font size" (before: ${hadOld}; deleted: ${re2.deleted.join(', ') || 'none'})`);

    // (3) FONT WEIGHT SPLIT (owner decision Q133 A): the raw weights on Primitive tokens beside font family and size, the
    // weight roles on Semantic tokens. Which is which is read off the emission: a literal is a raw weight, an alias a role.
    const fontEm = (JSON.parse(readFileSync(join(OUT, 'core.font.json'), 'utf8')) as { variables: { name: string; resolvedType: string; alias: unknown; scopes?: string[] }[] }).variables
      .filter((v) => /\/core\/font\/weight(-role)?\//.test(v.name));
    const rawW = fontEm.filter((v) => !v.alias).map((v) => v.name);
    const roleW = fontEm.filter((v) => v.alias).map((v) => v.name);
    const tokensOf = (w: N | undefined): string[] => (w ? gridOf(w).children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn) : []);
    const w3 = await phase2File();
    await draw(w3.api, contract, { types: ['fontWeight'] });
    const rawT = tableFrame(w3.prim, 'Font weight');
    const roleT = tableFrame(w3.sem, 'Font weight roles');
    ok(rawW.length === 6 && roleW.length === 5 && JSON.stringify(tokensOf(rawT)) === JSON.stringify(rawW) && JSON.stringify(tokensOf(roleT)) === JSON.stringify(roleW)
      && !tableFrame(w3.sem, 'Font weight') && !tableFrame(w3.prim, 'Font weight roles'),
      `33: the ${rawW.length} raw font weights are their own table on Primitive tokens and the ${roleW.length} weight roles theirs on Semantic tokens (primitive: ${tokensOf(rawT).join(', ')}; semantic: ${tokensOf(roleT).join(', ')})`);
    // On the Primitive page they sit in the font row, beside font family and size.
    const w3b = await phase2File();
    await draw(w3b.api, contract);
    const fontRow = tablesOn(w3b.prim).filter((w) => w.y === tableFrame(w3b.prim, 'Font family')!.y).map((w) => w.name.replace(/^Style guide — /, ''));
    ok(['Font family', 'Font size', 'Font weight'].every((t) => fontRow.includes(t)), `33: font weight sits in the font row, beside font family and size (${fontRow.join(', ')})`);

    // (5) A FAMILY IN A FACE IT HAS: the owner's file has its display and title families in one face only, and the
    // specimen asked for Regular. Here Playfair Display has no Regular; the text styles set display and title in Medium
    // Italic (the emission's `font/style/display/emphasis` and `title/emphasis`, typed here), so the specimens take that
    // face and stay bound to their variables, with no miss.
    const f5 = await phase2File();
    f5.fontFails.add('Playfair Display Regular');
    const r5 = await draw(f5.api, contract, { tables: ['Font family'] });
    const fam5 = gridOf(tableFrame(f5.prim, 'Font family'));
    const spec5 = (token: string): N | null => cellAt(fam5, rowOf(fam5, token), 1)?.findOne((k) => k.type === 'TEXT') ?? null;
    const say5 = (t: N | null): string => `${fontId(t?.fontName)}, bound ${t?.boundVariables.fontFamily?.id ?? 'nothing'}`;
    for (const role of ['display', 'title']) {
      const t = spec5(role);
      ok(fontId(t?.fontName) === 'Playfair Display Medium Italic' && t?.boundVariables.fontFamily?.id === f5.vars.find((v) => v.name === `pds3/core/font/family/${role}`)?.id,
        `33: the ${role} family, which has no Regular here, is set in its role's face and bound (${say5(t)})`);
    }
    ok(r5.unbound === 0 && !r5.misses.some((m) => /unavailable|not bound/.test(m)) && styleGuideSummary(r5).ok,
      `33: no family specimen unbound and no font named unavailable (${r5.unbound} unbound; ${r5.misses.join(' / ') || 'no misses'})`);
    // A family no text style uses, whose only face is Light Condensed: the first style the host lists for it.
    const f5b = await phase2File();
    f5b.vars.push({ id: 'VariableID:metrics:fam', name: 'metrics/font-family/condensed', variableCollectionId: 'VariableCollectionId:metrics', resolvedType: 'STRING', description: '', valuesByMode: { 'metrics:0': 'Proof Condensed' }, scopes: ['FONT_FAMILY'] });
    f5b.fontFails.add('Proof Condensed Regular');
    (f5b.api as unknown as { listAvailableFontsAsync: () => Promise<{ fontName: { family: string; style: string } }[]> }).listAvailableFontsAsync = async () =>
      [{ fontName: { family: 'Inter', style: 'Regular' } }, { fontName: { family: 'Proof Condensed', style: 'Light Condensed' } }];
    const r5b = await draw(f5b.api, contract, { tables: ['Font family (metrics)'] });
    const g5b = gridOf(tableFrame(f5b.prim, 'Font family (metrics)'));
    const t5b = cellAt(g5b, 1, 1)?.findOne((k) => k.type === 'TEXT') ?? null;
    ok(fontId(t5b?.fontName) === 'Proof Condensed Light Condensed' && t5b?.boundVariables.fontFamily?.id === 'VariableID:metrics:fam' && r5b.unbound === 0 && !r5b.misses.some((m) => /unavailable/.test(m)),
      `33: a family with no text style and only a Light Condensed face is set in it and bound (${say5(t5b)}; ${r5b.misses.join(' / ') || 'no misses'})`);
  }

  console.log('34. the Token column (#2372, owner decision Q135 B): the full variable path by default, the short name on request');
  {
    // Every expected value is typed out here, from the engine's emitted names; none is read back off the plan.
    const tokenCol = (w: N | undefined): string[] => (w ? gridOf(w).children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn) : []);
    // THE PLAN: a row's Token cell is its whole name by default, and below the table's prefix in short mode.
    const tp = (o: StyleGuideOptions): string | undefined => planStyleGuide(catalog, contract, o).tables.find((t) => t.title === 'Inverse text')?.rows.find((r) => r.name === 'pds3/color/inverse/text/primary')?.tokenCell;
    ok(tp({}) === 'pds3/color/inverse/text/primary' && tp({ tokenNames: 'full' }) === 'pds3/color/inverse/text/primary',
      `34: plan: absent or full, the Inverse text table's primary row prints pds3/color/inverse/text/primary (${tp({})})`);
    ok(tp({ tokenNames: 'short' }) === 'primary', `34: plan: short, it prints primary, the role inside its inverse family (#2801) (${tp({ tokenNames: 'short' })})`);

    // DRAWN, DEFAULT: a long-path table (Inverse text) and a palette table.
    const full = await fullFile();
    await draw(full.api, contract, { collections: ['color'] });
    await draw(full.api, contract, { collections: ['core'] });
    const invFull = tokenCol(tableFrame(full.sem, 'Inverse text'));
    ok(invFull.length > 0 && invFull.every((t) => t.startsWith('pds3/color/inverse/text/')) && invFull.includes('pds3/color/inverse/text/primary'),
      `34: default: every Inverse text row prints its full path, as pds3/color/inverse/text/primary (${invFull.slice(0, 2).join(', ')})`);
    ok(JSON.stringify(tokenCol(tableFrame(full.prim, 'Neutral')).slice(0, 3)) === JSON.stringify(['pds3/core/palette/neutral/025', 'pds3/core/palette/neutral/050', 'pds3/core/palette/neutral/100']),
      `34: default: the Neutral palette prints pds3/core/palette/neutral/025, 050, 100 … (${tokenCol(tableFrame(full.prim, 'Neutral')).slice(0, 3).join(', ')})`);
    // NEVER CLIPPED: the Token track takes its longest path, by the shim's own metric (7px a character).
    const invG = gridOf(tableFrame(full.sem, 'Inverse text'));
    const longest = Math.max(...invFull.map((t) => t.length));
    ok(clipped(invG).length === 0 && trackW(invG, 0) >= longest * CHAR_W,
      `34: default: no Inverse text cell is wider than its column, and the Token track holds its longest path, ${longest} × ${CHAR_W}px (track ${trackW(invG, 0)}; ${clipped(invG).slice(0, 2).join('; ')})`);

    // SWITCHING IS NOT A RENAME: the rerun report keys on variable ID and compares names and raw values, never the
    // printed Token cell, so a rerun in short mode updates every table with no change, and back again.
    const toShort = await draw(full.api, contract, { collections: ['color'], tokenNames: 'short' });
    const quiet = (r: StyleGuideResult): string[] => r.tables.flatMap((t) => (t.status !== 'updated' ? [`${t.title}: ${t.status}`]
      : [...t.diff.added, ...t.diff.removed, ...t.diff.changed, ...t.diff.renamed].map((x) => `${t.title}: ${x}`)));
    ok(toShort.tables.length === 18 && quiet(toShort).length === 0, `34: switching to short names updates every table and reports no row added, removed, changed or renamed (${quiet(toShort).slice(0, 3).join('; ')})`);

    // DRAWN, SHORT: the names below each table's prefix, as before #2372.
    const short = await fullFile();
    await draw(short.api, contract, { collections: ['color'], tokenNames: 'short' });
    await draw(short.api, contract, { collections: ['core'], tokenNames: 'short' });
    const invShort = tokenCol(tableFrame(short.sem, 'Inverse text'));
    ok(invShort.includes('primary') && !invShort.some((t) => t.startsWith('pds3/') || t.startsWith('text/')),
      `34: short: the Inverse text table prints primary, no root and no family (${invShort.slice(0, 2).join(', ')})`);
    ok(JSON.stringify(tokenCol(tableFrame(short.prim, 'Neutral')).slice(0, 4)) === JSON.stringify(['025', '050', '100', '150']),
      `34: short: a palette table leads with the step alone: 025, 050, 100, 150 … (${tokenCol(tableFrame(short.prim, 'Neutral')).slice(0, 4).join(', ')})`);
    ok(tokenCol(tableFrame(short.sem, 'Text'))[0] === 'primary', `34: short: text/primary is named "primary" in the Text table (${tokenCol(tableFrame(short.sem, 'Text'))[0]})`);
    const toFull = await draw(short.api, contract, { collections: ['color'] });
    ok(toFull.tables.length === 18 && quiet(toFull).length === 0 && tokenCol(tableFrame(short.sem, 'Text'))[0] === 'pds3/color/text/primary',
      `34: back to full paths: no row reported, and text/primary reads its full path again (${quiet(toFull).slice(0, 3).join('; ')})`);

    // PHASE 2 FOLLOWS THE SAME OPTION: a dimension and a text style.
    const p34 = await phase2File();
    await draw(p34.api, contract, { types: ['dimension', 'typography'] });
    ok(tokenCol(tableFrame(p34.sem, 'Space'))[1] === 'pds3/space/025' && tokenCol(tableFrame(p34.sem, 'Text styles')).includes('body/lg/default'),
      `34: default: a space step prints pds3/space/025, a text style its whole name, body/lg/default (${tokenCol(tableFrame(p34.sem, 'Space'))[1]})`);
    const p34s = await phase2File();
    await draw(p34s.api, contract, { types: ['dimension'], tokenNames: 'short' });
    ok(tokenCol(tableFrame(p34s.sem, 'Space'))[1] === '025', `34: short: the space step prints 025 (${tokenCol(tableFrame(p34s.sem, 'Space'))[1]})`);

    // TEXT STYLES THAT SHARE A ROOT (#2475): the fixture's styles start at `body/…` and `display/…`, which share no
    // prefix, so short and full printed the same text and a planner that always printed the full name passed. Here
    // the same styles sit under one root, `nbds/type/`, as a brand's text styles do: short drops the root, full keeps
    // it. The root is TWO segments deep so "strip the common prefix" and "strip one segment" print different text.
    const p34r = await phase2File();
    const rooted = { collections: p34r.cols, variables: p34r.vars, textStyles: p34r.styles.map((st) => ({ ...st, name: `nbds/type/${st.name}` })) };
    const tsOf = (file: SgCatalog, name: string, o: StyleGuideOptions): string | undefined => planStyleGuide(file, contract, o).tables.find((t) => t.title === 'Text styles')?.rows.find((r) => r.name === name)?.tokenCell;
    const ts = (o: StyleGuideOptions): string | undefined => tsOf(rooted, 'nbds/type/body/lg/default', o);
    ok(ts({ tokenNames: 'short' }) === 'body/lg/default',
      `34: short: text styles under one root print the name below it, body/lg/default for nbds/type/body/lg/default (${ts({ tokenNames: 'short' })})`);
    ok(ts({}) === 'nbds/type/body/lg/default', `34: default: the same style prints its whole name, nbds/type/body/lg/default (${ts({})})`);
    // And the mirror: the plain fixture's styles share no root, so short mode has nothing to drop.
    const plain = { collections: p34r.cols, variables: p34r.vars, textStyles: p34r.styles };
    const plainTok = tsOf(plain, 'body/lg/default', { tokenNames: 'short' });
    ok(plainTok === 'body/lg/default', `34: short: text styles that share no root print their whole name, body/lg/default (${plainTok})`);
  }

  console.log('35. batch 1 (#2353): border widths with the focus ring, icon size as a dimension, opacity with its swatch, font style as a Text styles column');
  {
    // THE FILE: phase 2's, plus the prism3 emission's border-width, focus, icon and layout collections (one mode each,
    // aliases pointed at the copies already in the file), and one font style no text style binds.
    const b1 = await phase2File();
    type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
    for (const [c, f] of [['border-width', 'border-width.json'], ['focus', 'focus.json'], ['icon', 'icon.json'], ['layout', 'layout.md.json']] as const) {
      b1.cols.push({ id: `VariableCollectionId:${c}`, name: c, modes: [{ modeId: `${c}:0`, name: 'Default' }], defaultModeId: `${c}:0` });
      (JSON.parse(readFileSync(join(OUT, f), 'utf8')) as { variables: Em[] }).variables.forEach((v, i) => b1.vars.push({
        id: `VariableID:${c}:${i}`, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
        valuesByMode: { [`${c}:0`]: v.alias ? { type: 'VARIABLE_ALIAS', id: b1.vars.find((x) => x.name === v.alias!.name)!.id } : v.value },
      }));
    }
    b1.vars.push({ id: 'VariableID:core:unbound-style', name: 'pds3/core/font/style/unused/default', variableCollectionId: 'VariableCollectionId:core', resolvedType: 'STRING', description: '', valuesByMode: { 'core:0': 'Bold' }, scopes: ['FONT_STYLE'] });
    const idOf = (name: string): string => b1.vars.find((v) => v.name === name)!.id;
    const cat35: SgCatalog = { collections: b1.cols, variables: b1.vars, textStyles: b1.styles };
    const plan35 = planStyleGuide(cat35, contract);
    const byTitle = (title: string): SgTable | undefined => plan35.tables.find((t) => t.title === title);

    // BORDER WIDTH: one table, the focus ring's three widths as its last rows, keyed to the border-width collection.
    const bw = byTitle('Border width');
    ok(!!bw && bw.key === 'borderWidth|VariableCollectionId:border-width|pds3' && bw.page === SEM
      && JSON.stringify(bw.columns) === JSON.stringify(['Token', 'Default', 'Value', 'REM', 'Description'])
      && bw.description === '7 border width variables in border-width and focus',
      `35: border-width draws one Border width table on Semantic tokens, Token · Default · Value · REM · Description (${bw?.key}; ${bw?.columns.join(', ')}; "${bw?.description}")`);
    ok(JSON.stringify(bw?.rows.map((r) => `${r.tokenCell}=${r.cells[0].value}/${r.cells[0].rem}`)) === JSON.stringify([
      'pds3/border-width/none=0px/0rem', 'pds3/border-width/hairline=1px/0.0625rem', 'pds3/border-width/thick=2px/0.125rem', 'pds3/border-width/heavy=4px/0.25rem',
      'pds3/focus/ring/width=2px/0.125rem', 'pds3/focus/ring/offset=2px/0.125rem', 'pds3/focus/ring/offset-field=0px/0rem']),
      `35: the focus ring's width and offset are rows of the Border width table, not a table of their own (${bw?.rows.map((r) => r.tokenCell).join(', ')})`);
    ok(!plan35.tables.some((t) => t.collectionId === 'VariableCollectionId:focus' || /focus/i.test(t.title)),
      `35: no table is keyed to or titled for the focus collection (${plan35.tables.filter((t) => t.collectionId === 'VariableCollectionId:focus').map((t) => t.title).join(', ')})`);

    // ICON SIZE: a dimension table of its own collection, drawn as a size is: no type of its own.
    const icon = byTitle('Icon size');
    ok(!!icon && icon.type === 'dimension' && icon.key === 'dimension|VariableCollectionId:icon|pds3/icon/size' && icon.page === SEM
      && JSON.stringify(icon.rows.map((r) => `${r.token}=${r.cells[0].value}/${r.cells[0].rem}`)) === JSON.stringify(['xs=16px/1rem', 'sm=20px/1.25rem', 'md=24px/1.5rem', 'lg=32px/2rem', 'xl=40px/2.5rem'])
      && icon.rows.every((r) => r.specimen?.kind === 'spacing'),
      `35: icon/size draws in a dimension table, xs 16px … xl 40px, with the spacing specimen (${icon?.key}; ${icon?.rows.map((r) => r.cells[0].value).join(', ')})`);

    // OPACITY: a table of its own on Primitive tokens, each value a percentage with its swatch, no REM.
    const op = byTitle('Opacity');
    ok(!!op && op.key === 'opacity|VariableCollectionId:opacity|pds3/opacity' && op.page === PRIM
      && JSON.stringify(op.columns) === JSON.stringify(['Token', 'Default', 'Value', 'Description'])
      && JSON.stringify(op.rows.map((r) => r.cells[0].value)) === JSON.stringify(['0%', '5%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'])
      && op.rows.every((r) => r.specimen?.kind === 'opacity' && r.cells[0].rem === undefined),
      `35: opacity draws 0% … 100% in ramp order on Primitive tokens, each with the opacity swatch and no REM (${op?.columns.join(', ')}; ${op?.rows.map((r) => r.cells[0].value).join(', ')})`);

    // FONT STYLE: a Style column in the Text styles table, after Weight; the weight prints its number and name.
    const ts35 = byTitle('Text styles');
    ok(JSON.stringify(ts35?.columns) === JSON.stringify(['Token', 'desktop', 'Size / line height', 'REM', 'mobile', 'Size / line height', 'REM', 'Family', 'Weight', 'Style', 'Letter spacing', 'REM', 'Description']),
      `35: the Text styles table has a Style column after Weight (${ts35?.columns.join(', ')})`);
    const d3e = ts35?.rows.find((r) => r.token === 'display/3xl/emphasis');
    ok(JSON.stringify(d3e?.extra?.slice(1, 3)) === JSON.stringify([{ value: '500 · Medium', alias: null }, { value: 'Medium Italic', alias: 'pds3/core/font/style/display/emphasis' }]),
      `35: display/3xl/emphasis: Weight "500 · Medium", Style "Medium Italic" with its font-style variable (${JSON.stringify(d3e?.extra?.slice(1, 3))})`);

    // THE LATER-PHASE NOTE: none of the four groups, and still what is left (the unbound font style, breakpoints, grid).
    ok(plan35.notes.includes('Not drawn until a later phase: 1 font style, 5 breakpoint, 3 grid variables'),
      `35: the later-phase note no longer lists border width, icon size, opacity or a bound font style (${plan35.notes.join(' / ')})`);

    // THE PAGE'S CATALOG: each is listed under the table that draws it.
    const cat = catalogFor(cat35, contract, true);
    const tableOfItem = (name: string): string => { for (const c of cat.collections) for (const it of c.items) if (it.name === name) return it.table < 0 ? 'none' : cat.tables[it.table].title; return '?'; };
    const listed = ['pds3/border-width/thick', 'pds3/focus/ring/offset', 'pds3/icon/size/md', 'pds3/opacity/40', 'pds3/core/font/style/body/strong', 'pds3/core/font/style/unused/default', 'pds3/breakpoint/md'].map((n) => `${n}→${tableOfItem(n)}`);
    ok(JSON.stringify(listed) === JSON.stringify(['pds3/border-width/thick→Border width', 'pds3/focus/ring/offset→Border width', 'pds3/icon/size/md→Icon size', 'pds3/opacity/40→Opacity',
      'pds3/core/font/style/body/strong→Text styles', 'pds3/core/font/style/unused/default→none', 'pds3/breakpoint/md→none']),
      `35: the page lists each under the table that draws it, and the unbound font style and a breakpoint under none (${listed.join(', ')})`);
    const opItem = cat.collections.find((c) => c.name === 'opacity')?.items.find((it) => it.name === 'pds3/opacity/40');
    ok(opItem?.value === '40%' && cat.tables.find((t) => t.title === 'Opacity')?.kind === 'dimension' && cat.tables.find((t) => t.title === 'Border width')?.kind === 'dimension',
      `35: the page prints opacity 40 as 40%, and groups Opacity and Border width with spacing and size (${opItem?.value})`);

    // DRAWN.
    const r35 = await draw(b1.api, contract);
    ok(r35.unbound === 0 && !r35.tables.some((t) => t.status !== 'created'), `35: an open run draws every table, every specimen bound (unbound ${r35.unbound}; ${r35.misses.slice(0, 2).join(' / ')})`);
    const bwG = gridOf(tableFrame(b1.sem, 'Border width'));
    // THE SPECIMEN IS THE RADIUS EXAMPLE (#2506, owner direction on #2490): each row draws the swatches set's type=radius
    // member, its radius-example layer's stroke weight bound to the row's variable and its corners left unbound, at the
    // member's own 8px. The seven rows, their collections and the two 0 widths are typed here, not read off the planner.
    const instOf = (token: string): N | undefined => cellAt(bwG, rowOf(bwG, token), 1)?.findOne((k) => k.type === 'INSTANCE') ?? undefined;
    const strokeOf = (token: string): N | undefined => instOf(token)?.findOne((k) => k.name === 'radius-example') ?? undefined;
    const BW_ROWS = ['pds3/border-width/none', 'pds3/border-width/hairline', 'pds3/border-width/thick', 'pds3/border-width/heavy',
      'pds3/focus/ring/width', 'pds3/focus/ring/offset', 'pds3/focus/ring/offset-field'];
    const CORNER_FIELDS = ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
    const notRadius = BW_ROWS.filter((t) => instOf(t)?.mainComponent?.name !== 'type=radius' || !strokeOf(t));
    ok(notRadius.length === 0,
      `35: every Border width row's specimen is a type=radius instance holding its radius-example layer (not: ${notRadius.map((t) => `${t}→${instOf(t)?.mainComponent?.name}`).join(', ') || 'none'})`);
    const unboundWeight = BW_ROWS.filter((t) => strokeOf(t)?.boundVariables.strokeWeight?.id !== idOf(t));
    ok(unboundWeight.length === 0,
      `35: every Border width row's radius-example has its strokeWeight bound to that row's variable (not: ${unboundWeight.join(', ') || 'none'})`);
    const cornersBound = BW_ROWS.filter((t) => CORNER_FIELDS.some((k) => strokeOf(t)?.boundVariables[k] !== undefined) || strokeOf(t)?.cornerRadius !== 8);
    ok(cornersBound.length === 0,
      `35: no Border width row binds the radius-example's corners to its width; they stay at the member's own 8px (bound or moved: ${cornersBound.map((t) => `${t} ${JSON.stringify(strokeOf(t)?.boundVariables)} r${strokeOf(t)?.cornerRadius}`).join(', ') || 'none'})`);
    ok(instOf('pds3/border-width/heavy')?.explicitVariableModes['VariableCollectionId:border-width'] === 'border-width:0'
      && textIn(cellAt(bwG, rowOf(bwG, 'pds3/border-width/heavy'), 2)).startsWith('4px') && textIn(cellAt(bwG, rowOf(bwG, 'pds3/border-width/heavy'), 3)) === '0.25rem',
      `35: border-width/heavy's radius example is pinned to the border-width mode, "4px" and "0.25rem" (${JSON.stringify(instOf('pds3/border-width/heavy')?.explicitVariableModes)})`);
    const focusUnpinned = ['pds3/focus/ring/width', 'pds3/focus/ring/offset', 'pds3/focus/ring/offset-field']
      .filter((t) => instOf(t)?.explicitVariableModes['VariableCollectionId:focus'] !== 'focus:0');
    ok(focusUnpinned.length === 0,
      `35: the focus ring rows' radius examples are pinned to the focus collection's mode (not: ${focusUnpinned.map((t) => `${t} ${JSON.stringify(instOf(t)?.explicitVariableModes)}`).join(', ') || 'none'})`);
    // A 0 WIDTH DRAWS NO STROKE: the only stroked layer in its specimen is the radius example, and its weight is bound to
    // a variable worth 0 in the pinned mode. The shim does not render a bound weight, so the 0 is the variable's own.
    const zeroStroked = (t: string, col: string): string[] => {
      const inst = instOf(t);
      const mode = inst?.explicitVariableModes[`VariableCollectionId:${col}`] ?? '';
      // The emission aliases each width to a core dimension: followed to its number, each hop in its collection's default.
      let bound = b1.vars.find((v) => v.id === strokeOf(t)?.boundVariables.strokeWeight?.id);
      let value: unknown = bound?.valuesByMode[mode];
      for (let hop = 0; hop < 8 && (value as { type?: string } | undefined)?.type === 'VARIABLE_ALIAS'; hop++) {
        bound = b1.vars.find((v) => v.id === (value as { id: string }).id);
        value = bound?.valuesByMode[b1.cols.find((c) => c.id === bound?.variableCollectionId)?.defaultModeId ?? ''];
      }
      const otherStrokes = (inst?.findAll((k) => Array.isArray(k.strokes) && k.strokes.length > 0) ?? []).filter((k) => k.name !== 'radius-example');
      return [...(value === 0 ? [] : [`${t}: bound weight ${JSON.stringify(value)}`]), ...otherStrokes.map((k) => `${t}: ${k.name} stroked`)];
    };
    const zeroFaults = [...zeroStroked('pds3/border-width/none', 'border-width'), ...zeroStroked('pds3/focus/ring/offset-field', 'focus')];
    ok(zeroFaults.length === 0 && textIn(cellAt(bwG, rowOf(bwG, 'pds3/border-width/none'), 2)).startsWith('0px'),
      `35: a 0 width (border-width/none, focus/ring/offset-field) draws no stroke: its radius example's weight is bound to 0 and nothing else in it is stroked (${zeroFaults.join(' / ') || 'none'})`);
    // THE OWNER'S STROKE-LESS MEMBER (#2506, owner decision Q233 B): their type=radius, one fill and no stroke, in place
    // of the Set up one; the emission's light-mode border colors in a color collection. Each row's radius-example is
    // painted, its one stroke bound to pds3/color/border/primary (the engine's "Default border"), never to the inverse
    // one or another border; its weight still bound to the row.
    const bwFile = async (owner: boolean): Promise<Awaited<ReturnType<typeof phase2File>>> => {
      const f = await phase2File();
      for (const [c, file] of [['border-width', 'border-width.json'], ['focus', 'focus.json']] as const) {
        f.cols.push({ id: `VariableCollectionId:${c}`, name: c, modes: [{ modeId: `${c}:0`, name: 'Default' }], defaultModeId: `${c}:0` });
        (JSON.parse(readFileSync(join(OUT, file), 'utf8')) as { variables: Em[] }).variables.forEach((v, i) => f.vars.push({
          id: `VariableID:${c}:${i}`, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
          valuesByMode: { [`${c}:0`]: v.alias ? { type: 'VARIABLE_ALIAS', id: f.vars.find((x) => x.name === v.alias!.name)!.id } : v.value },
        }));
      }
      f.cols.push({ id: 'VariableCollectionId:color', name: 'color', modes: [{ modeId: 'color:0', name: 'light' }], defaultModeId: 'color:0' });
      (JSON.parse(readFileSync(join(OUT, 'color.light.json'), 'utf8')) as { variables: Em[] }).variables.filter((v) => v.name.includes('/border/')).forEach((v, i) => f.vars.push({
        id: `VariableID:color:${i}`, name: v.name, variableCollectionId: 'VariableCollectionId:color', resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
        valuesByMode: { 'color:0': v.value },
      }));
      if (owner) {
        const set = setsNamed([f.fc], '_style-guide-swatches')[0];
        set?.children.find((k) => k.name === 'type=radius')?.remove();
        set?.appendChild(ownerRadiusMember());
      }
      return f;
    };
    const b2 = await bwFile(true);
    const idOf2 = (name: string): string | undefined => b2.vars.find((v) => v.name === name)?.id;
    const r2 = await draw(b2.api, contract, { types: ['borderWidth'] });
    const bw2 = gridOf(tableFrame(b2.sem, 'Border width'));
    const ex2 = (token: string): N | undefined => cellAt(bw2, rowOf(bw2, token), 1)?.findOne((k) => k.type === 'INSTANCE')?.findOne((k) => k.name === 'radius-example') ?? undefined;
    ok(!!idOf2('pds3/color/border/primary') && !!idOf2('pds3/color/inverse/border/primary') && r2.unbound === 0
      && BW_ROWS.every((t) => cellAt(bw2, rowOf(bw2, t), 1)?.findOne((k) => k.type === 'INSTANCE')?.mainComponent?.strokes instanceof Array
        && (cellAt(bw2, rowOf(bw2, t), 1)!.findOne((k) => k.type === 'INSTANCE')!.mainComponent!.strokes as unknown[]).length === 0),
      `35: the owner's stroke-less radius member is the one drawn, with the default and inverse border colors in the file, every specimen bound (unbound ${r2.unbound}; ${r2.misses.slice(0, 2).join(' / ')})`);
    const unpainted = BW_ROWS.filter((t) => !Array.isArray(ex2(t)?.strokes) || (ex2(t)!.strokes as unknown[]).length !== 1 || boundId(ex2(t)!.strokes) !== idOf2('pds3/color/border/primary'));
    ok(unpainted.length === 0,
      `35: on the owner's stroke-less radius member, every Border width row's radius-example is painted one stroke bound to pds3/color/border/primary (not: ${unpainted.map((t) => `${t} ${JSON.stringify(ex2(t)?.strokes)}`).join(', ') || 'none'})`);
    const weight2 = BW_ROWS.filter((t) => ex2(t)?.boundVariables.strokeWeight?.id !== idOf2(t));
    ok(weight2.length === 0,
      `35: on the owner's stroke-less radius member, every row's radius-example still has its strokeWeight bound to the row's variable (not: ${weight2.join(', ') || 'none'})`);
    // A MEMBER THAT ALREADY HAS A STROKE KEEPS IT: the same file with the Set up file's radius member, whose
    // radius-example carries its own ink stroke, and the default border color present. One paint, bound to nothing.
    const b3 = await bwFile(false);
    const r3 = await draw(b3.api, contract, { types: ['borderWidth'] });
    const bw3 = gridOf(tableFrame(b3.sem, 'Border width'));
    const ex3 = (token: string): N | undefined => cellAt(bw3, rowOf(bw3, token), 1)?.findOne((k) => k.type === 'INSTANCE')?.findOne((k) => k.name === 'radius-example') ?? undefined;
    const repainted = BW_ROWS.filter((t) => !Array.isArray(ex3(t)?.strokes) || (ex3(t)!.strokes as unknown[]).length !== 1 || boundId(ex3(t)!.strokes) !== undefined);
    ok(r3.unbound === 0 && repainted.length === 0,
      `35: on the Set up file's radius member, which has a stroke, every Border width row keeps that one stroke, unbound and not repainted, the default border color in the file (unbound ${r3.unbound}; not: ${repainted.map((t) => `${t} ${JSON.stringify(ex3(t)?.strokes)}`).join(', ') || 'none'})`);
    ok(!tablesOn(b1.sem).concat(tablesOn(b1.prim)).some((w) => w.pluginData['prism3-style-guide'].split('|')[1] === 'VariableCollectionId:focus'),
      '35: no drawn table is keyed to the focus collection');
    const opG = gridOf(tableFrame(b1.prim, 'Opacity'));
    const opCell = cellAt(opG, rowOf(opG, 'pds3/opacity/40'), 1);
    const sw = opCell?.children[0];
    ok(!!sw && sw.type === 'INSTANCE' && sw.boundVariables.opacity?.id === idOf('pds3/opacity/40') && sw.explicitVariableModes['VariableCollectionId:opacity'] === 'opacity:0'
      && JSON.stringify((sw.fills as { color?: unknown }[]).map((f) => f.color)) === JSON.stringify([{ r: 0, g: 0, b: 0 }])
      && sw.children.every((k) => k.visible === false) && sw.lsh === 'FILL' && sw.layoutSizingVertical === 'FILL',
      `35: opacity 40's swatch is the transparency member filling its cell in black, its layer opacity bound to opacity/40 (${sw?.type}; ${JSON.stringify(sw?.boundVariables)}; ${JSON.stringify(sw?.fills)})`);
    ok(textIn(cellAt(opG, rowOf(opG, 'pds3/opacity/40'), 2)) === '40%' && opCell?.strokeBottomWeight === 1 && (opCell?.fills as { color?: { r: number } }[])?.[0]?.color?.r === 1,
      `35: opacity 40 reads "40%", its swatch in a white cell carrying the row line (${textIn(cellAt(opG, rowOf(opG, 'pds3/opacity/40'), 2))})`);
    const icG = gridOf(tableFrame(b1.sem, 'Icon size'));
    const icBar = cellAt(icG, rowOf(icG, 'pds3/icon/size/lg'), 1);
    ok(!!icBar && (icBar.findOne((k) => !!k.boundVariables.paddingLeft) ?? icBar)?.boundVariables.paddingLeft?.id === idOf('pds3/icon/size/lg') && textIn(cellAt(icG, rowOf(icG, 'pds3/icon/size/lg'), 2)).startsWith('32px'),
      `35: icon/size/lg draws the spacing bar bound to it, "32px" (${textIn(cellAt(icG, rowOf(icG, 'pds3/icon/size/lg'), 2))})`);
    const tsW = tableFrame(b1.sem, 'Text styles')!;
    const tsG = gridOf(tsW);
    const styleCol = headerRow(tsW).indexOf('Style');
    ok(styleCol === 9 && textIn(cellAt(tsG, rowOf(tsG, 'display/3xl/emphasis'), styleCol)) === 'Medium Italic | ↗ | pds3/core/font/style/display/emphasis'
      && textIn(cellAt(tsG, rowOf(tsG, 'display/3xl/emphasis'), styleCol - 1)) === '500 · Medium',
      `35: drawn, the Style column reads "Medium Italic" with its variable's chip, and Weight "500 · Medium" (column ${styleCol}: "${textIn(cellAt(tsG, rowOf(tsG, 'display/3xl/emphasis'), styleCol))}")`);
  }

  console.log("35b. #2505: the focus ring rows read focus's DEFAULT mode when focus names its modes differently");
  {
    // THE FILE: §35's, except that focus names its modes apart from border-width's "Default": a first mode "Spare"
    // holding 9 for every ring value, and its default mode "Base" holding the emission's aliases (2, 2, 0). So no
    // column of the Border width table finds a focus mode by name, and each focus row falls back to focus's DEFAULT
    // mode, not its first mode and not the column's own ID. Every expected value is typed here.
    const f = await phase2File();
    type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
    for (const [c, file] of [['border-width', 'border-width.json'], ['focus', 'focus.json']] as const) {
      const modes = c === 'focus' ? [{ modeId: 'focus:spare', name: 'Spare' }, { modeId: 'focus:base', name: 'Base' }] : [{ modeId: `${c}:0`, name: 'Default' }];
      f.cols.push({ id: `VariableCollectionId:${c}`, name: c, modes, defaultModeId: c === 'focus' ? 'focus:base' : `${c}:0` });
      (JSON.parse(readFileSync(join(OUT, file), 'utf8')) as { variables: Em[] }).variables.forEach((v, i) => {
        const value = v.alias ? { type: 'VARIABLE_ALIAS', id: f.vars.find((x) => x.name === v.alias!.name)!.id } : v.value;
        f.vars.push({
          id: `VariableID:${c}:${i}`, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
          valuesByMode: c === 'focus' ? { 'focus:spare': 9, 'focus:base': value } : { [`${c}:0`]: value },
        });
      });
    }
    const plan = planStyleGuide({ collections: f.cols, variables: f.vars, textStyles: f.styles }, contract);
    const bw = plan.tables.find((t) => t.title === 'Border width');
    const ring = bw?.rows.filter((r) => r.tokenCell.startsWith('pds3/focus/')).map((r) => `${r.tokenCell}=${r.cells[0].value}@${r.cells[0].modeId}`);
    ok(JSON.stringify(ring) === JSON.stringify(['pds3/focus/ring/width=2px@focus:base', 'pds3/focus/ring/offset=2px@focus:base', 'pds3/focus/ring/offset-field=0px@focus:base']),
      `35b: with no focus mode named "Default", each focus ring row reads focus's default mode (Base), not its first (Spare, 9) (${JSON.stringify(ring)})`);
    const r = await draw(f.api, contract);
    const g = gridOf(tableFrame(f.sem, 'Border width'));
    const inst = cellAt(g, rowOf(g, 'pds3/focus/ring/width'), 1)?.findOne((k) => k.type === 'INSTANCE') ?? undefined;
    ok(r.unbound === 0 && inst?.explicitVariableModes['VariableCollectionId:focus'] === 'focus:base' && textIn(cellAt(g, rowOf(g, 'pds3/focus/ring/width'), 2)).startsWith('2px'),
      `35b: drawn, the focus ring width's outline is pinned to focus's default mode and reads 2px (${JSON.stringify(inst?.explicitVariableModes)}; "${textIn(cellAt(g, rowOf(g, 'pds3/focus/ring/width'), 2))}")`);
    // Base is drawn, as the fallback; Spare is read by no column, and the notes name it alone (#2505, Q247 A).
    const spare = plan.notes.filter((n) => n.includes('no column here'));
    ok(JSON.stringify(spare) === JSON.stringify(["Border width: focus's mode Spare has no column here, so its values aren't drawn"]),
      `35b: the notes name Spare, the one focus mode no column reads, and not Base, the fallback (${JSON.stringify(spare)})`);
  }

  console.log("35d. #2505: focus's modes that no Border width column reads are named in the notes (owner decisions Q247 A, Q261 A)");
  {
    // THE FILE: §35b's, with focus's modes "Default" (its default, matched by border-width's one column by name),
    // "Compact" and "Spacious" (matched by none). The note's wording is the owner's, typed here.
    const fileWith = async (focusModes: string[], strokeModes?: string[]) => {
      const f = await phase2File();
      type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
      for (const [c, file] of [['border-width', 'border-width.json'], ['focus', 'focus.json']] as const) {
        const names = c === 'focus' ? focusModes : ['Default'];
        f.cols.push({ id: `VariableCollectionId:${c}`, name: c, modes: names.map((n) => ({ modeId: `${c}:${n}`, name: n })), defaultModeId: `${c}:${names[0]}` });
        (JSON.parse(readFileSync(join(OUT, file), 'utf8')) as { variables: Em[] }).variables.forEach((v, i) => {
          const value = v.alias ? { type: 'VARIABLE_ALIAS', id: f.vars.find((x) => x.name === v.alias!.name)!.id } : v.value;
          f.vars.push({
            id: `VariableID:${c}:${i}`, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
            valuesByMode: Object.fromEntries(names.map((n) => [`${c}:${n}`, value])),
          });
        });
      }
      // A SECOND BORROWED COLLECTION (#2581): one stroke width of a client's own, in a collection that is neither
      // border-width's nor focus's. It joins the Border width table as focus's ring widths do, by its scope.
      if (strokeModes) {
        f.cols.push({ id: 'VariableCollectionId:stroke', name: 'stroke', modes: strokeModes.map((n) => ({ modeId: `stroke:${n}`, name: n })), defaultModeId: `stroke:${strokeModes[0]}` });
        f.vars.push({
          id: 'VariableID:stroke:0', name: 'client/stroke/heavy', variableCollectionId: 'VariableCollectionId:stroke', resolvedType: 'FLOAT', description: '', scopes: ['STROKE_FLOAT'],
          valuesByMode: Object.fromEntries(strokeModes.map((n, i) => [`stroke:${n}`, 3 + i])),
        });
      }
      return f;
    };
    const f = await fileWith(['Default', 'Compact', 'Spacious']);
    const plan = planStyleGuide({ collections: f.cols, variables: f.vars, textStyles: f.styles }, contract);
    const left = plan.notes.filter((n) => n.includes('no column here'));
    ok(JSON.stringify(left) === JSON.stringify(["Border width: focus's modes Compact, Spacious have no column here, so their values aren't drawn"]),
      `35d: the notes name Compact and Spacious, the focus modes no Border width column reads (${JSON.stringify(left)})`);
    const r = await draw(f.api, contract);
    ok(r.notes.includes("Border width: focus's modes Compact, Spacious have no column here, so their values aren't drawn"),
      `35d: the run's notes carry it too, as the page and the summary show them (${JSON.stringify(r.notes)})`);
    // The control: every focus mode read by a column, so the notes say nothing of focus.
    const one = await fileWith(['Default']);
    const quiet = planStyleGuide({ collections: one.cols, variables: one.vars, textStyles: one.styles }, contract).notes.filter((n) => n.includes('no column here'));
    ok(quiet.length === 0, `35d: with focus's one mode read by the Default column, the notes name no focus mode (${JSON.stringify(quiet)})`);
    // THE COLLECTION'S NAME (#2581): the note names the collection the unread modes belong to, the generic wording owner
    // decision Q261 1A chose for exactly this, a borrowed collection that is not focus. Every case above borrows only
    // focus, so a note hard-coding "focus's" passed them all. Here focus leaves Compact and stroke leaves Heavy: each
    // note names its own collection, and the note for stroke never says focus.
    const both = await fileWith(['Default', 'Compact'], ['Default', 'Heavy']);
    const named = planStyleGuide({ collections: both.cols, variables: both.vars, textStyles: both.styles }, contract).notes.filter((n) => n.includes('no column here')).sort();
    ok(JSON.stringify(named) === JSON.stringify([
      "Border width: focus's mode Compact has no column here, so its values aren't drawn",
      "Border width: stroke's mode Heavy has no column here, so its values aren't drawn",
    ]), `35d: with a second borrowed collection, each note names its own collection — focus's Compact and stroke's Heavy (${JSON.stringify(named)})`);
  }

  console.log("35c. #2549: a focus mode named like the column wins over focus's default mode");
  {
    // THE FILE: §35's, except that focus has two modes and the one named like the Border width column ("Default") is
    // NOT focus's default. Its default, "Base", holds 9 for every ring value; "Default" holds the emission's aliases
    // (2, 2, 0). `modeIn` reads the column's mode by its name first and falls back to the default only when no mode
    // matches (§35b), so each focus row must read focus's "Default", not "Base". In §35 the two rules pick the same mode
    // (focus's one mode is both), which is why this case exists. Every expected value is typed here.
    const f = await phase2File();
    type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
    for (const [c, file] of [['border-width', 'border-width.json'], ['focus', 'focus.json']] as const) {
      const modes = c === 'focus' ? [{ modeId: 'focus:base', name: 'Base' }, { modeId: 'focus:named', name: 'Default' }] : [{ modeId: `${c}:0`, name: 'Default' }];
      f.cols.push({ id: `VariableCollectionId:${c}`, name: c, modes, defaultModeId: c === 'focus' ? 'focus:base' : `${c}:0` });
      (JSON.parse(readFileSync(join(OUT, file), 'utf8')) as { variables: Em[] }).variables.forEach((v, i) => {
        const value = v.alias ? { type: 'VARIABLE_ALIAS', id: f.vars.find((x) => x.name === v.alias!.name)!.id } : v.value;
        f.vars.push({
          id: `VariableID:${c}:${i}`, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
          valuesByMode: c === 'focus' ? { 'focus:base': 9, 'focus:named': value } : { [`${c}:0`]: value },
        });
      });
    }
    const plan = planStyleGuide({ collections: f.cols, variables: f.vars, textStyles: f.styles }, contract);
    const bw = plan.tables.find((t) => t.title === 'Border width');
    const ring = bw?.rows.filter((r) => r.tokenCell.startsWith('pds3/focus/')).map((r) => `${r.tokenCell}=${r.cells[0].value}@${r.cells[0].modeId}`);
    ok(JSON.stringify(ring) === JSON.stringify(['pds3/focus/ring/width=2px@focus:named', 'pds3/focus/ring/offset=2px@focus:named', 'pds3/focus/ring/offset-field=0px@focus:named']),
      `35c: a focus mode named "Default", like the column, wins over focus's default mode (Base, 9) (${JSON.stringify(ring)})`);
    const r = await draw(f.api, contract);
    const g = gridOf(tableFrame(f.sem, 'Border width'));
    const inst = cellAt(g, rowOf(g, 'pds3/focus/ring/width'), 1)?.findOne((k) => k.type === 'INSTANCE') ?? undefined;
    ok(r.unbound === 0 && inst?.explicitVariableModes['VariableCollectionId:focus'] === 'focus:named' && textIn(cellAt(g, rowOf(g, 'pds3/focus/ring/width'), 2)).startsWith('2px'),
      `35c: drawn, the focus ring width's outline is pinned to focus's mode named like the column and reads 2px (${JSON.stringify(inst?.explicitVariableModes)}; "${textIn(cellAt(g, rowOf(g, 'pds3/focus/ring/width'), 2))}")`);
  }

  console.log('35e. #2728: the icon-size table is titled "Icon size", and a rerun retitles an earlier "Icon" table in place (owner decision Q341 A)');
  {
    // THE FILE: phase 2's plus the prism3 emission's icon collection, as §35 adds it.
    const f = await phase2File();
    type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
    f.cols.push({ id: 'VariableCollectionId:icon', name: 'icon', modes: [{ modeId: 'icon:0', name: 'Default' }], defaultModeId: 'icon:0' });
    (JSON.parse(readFileSync(join(OUT, 'icon.json'), 'utf8')) as { variables: Em[] }).variables.forEach((v, i) => f.vars.push({
      id: `VariableID:icon:${i}`, name: v.name, variableCollectionId: 'VariableCollectionId:icon', resolvedType: v.resolvedType, description: v.description, scopes: v.scopes,
      valuesByMode: { 'icon:0': v.alias ? { type: 'VARIABLE_ALIAS', id: f.vars.find((x) => x.name === v.alias!.name)!.id } : v.value },
    }));
    const KEY = 'dimension|VariableCollectionId:icon|pds3/icon/size';
    const iconTable = planStyleGuide({ collections: f.cols, variables: f.vars, textStyles: f.styles }, contract).tables.find((t) => t.key === KEY);
    ok(iconTable?.title === 'Icon size' && iconTable.page === SEM, `35e: the icon collection's dimension table is titled "Icon size", on Semantic tokens (${iconTable?.title}, ${iconTable?.page})`);

    // WITH THE COLOR TABLES (the collision #2728 names): the prism3 color collections beside it, every title on
    // Semantic tokens is its own, and the icon colors keep "Icon".
    // Its `core` palette is moved to a collection of its own, so it is not merged with phase 2's `core`.
    const colors = prism3Variables();
    const apart = (id: string): string => id.replace(':core', ':palette');
    const palCols = colors.cols.map((c) => ({ ...c, id: apart(c.id), name: c.name === 'core' ? 'palette' : c.name }));
    const palVars = colors.vars.map((v) => ({ ...v, id: apart(v.id), variableCollectionId: apart(v.variableCollectionId),
      valuesByMode: Object.fromEntries(Object.entries(v.valuesByMode).map(([m, x]) => [m, x && typeof x === 'object' && 'id' in x ? { ...x, id: apart(String(x.id)) } : x])) }));
    const both = planStyleGuide({ collections: [...palCols, ...f.cols], variables: [...palVars, ...f.vars], textStyles: f.styles }, contract);
    const semTitles = both.tables.filter((t) => t.page === SEM).map((t) => t.title);
    const dupes = semTitles.filter((t, i) => semTitles.indexOf(t) !== i);
    ok(dupes.length === 0 && both.tables.find((t) => t.title === 'Icon')?.type === 'color' && both.tables.find((t) => t.title === 'Icon size')?.key === KEY,
      `35e: with the color tables, every Semantic tokens title is unique: "Icon" is the icon colors and "Icon size" the icon sizes (repeated: ${dupes.join(', ') || 'none'})`);

    // A RERUN OVER AN EARLIER BUILD: the table as a build before #2728 left it, titled "Icon" in its name, its header
    // and its record. The rerun retitles that same frame; it is neither deleted nor drawn again.
    await draw(f.api, contract);
    const was = tableFrame(f.sem, 'Icon size')!;
    const wasTitle = was.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'header')!.findOne((k) => k.name === 'Title')!;
    was.name = 'Style guide — Icon'; wasTitle.characters = 'Icon'; was.pluginData['prism3-style-guide-title'] = 'Icon';
    const again = await draw(f.api, contract);
    const now = tablesOn(f.sem).filter((n) => n.pluginData['prism3-style-guide'] === KEY);
    ok(now.length === 1 && now[0] === was && was.name === 'Style guide — Icon size' && wasTitle.characters === 'Icon size' && was.pluginData['prism3-style-guide-title'] === 'Icon size'
      && again.tables.find((t) => t.key === KEY)?.status === 'updated' && again.deleted.length === 0 && again.stale.length === 0 && again.replaced.length === 0,
      `35e: a rerun retitles the earlier "Icon" table in place to "Icon size", same frame, same key, nothing deleted (${now.length} frame(s); "${was.name}"; "${wasTitle.characters}"; deleted ${again.deleted.join(', ') || 'none'})`);
  }

  console.log('36. batch 2a (#2353): the effect styles and the gradient paint styles, each a table with its specimen bound to the style');
  {
    // THE FILE: phase 2's, plus the prism3 emission's 14 effect styles and 2 gradient paint styles as a theme write leaves
    // them (each stop bound to the palette variable it was traced to), the palette those stops bind, and three styles
    // Prism3 did not make: an effect style with a blur and a shadow, a three-stop gradient bound to nothing, and a solid
    // paint style. Every expected value below is typed here, from the emission read by hand, never off the planner.
    const f = await phase2File();
    type Rgba = { r: number; g: number; b: number; a: number };
    const palette = (JSON.parse(readFileSync(join(OUT, 'core.palette.json'), 'utf8')) as { variables: { name: string; resolvedType: string; value: Rgba }[] }).variables;
    palette.forEach((v, i) => f.vars.push({ id: `VariableID:palette:${i}`, name: v.name, variableCollectionId: 'VariableCollectionId:core', resolvedType: v.resolvedType, description: '', valuesByMode: { 'core:0': v.value } }));
    const varId = (name: string): string => f.vars.find((v) => v.name === name)!.id;
    type EmEffect = ShimEffectStyle['effects'][number];
    const shadows = (JSON.parse(readFileSync(join(OUT, 'shadow-styles.json'), 'utf8')) as { styles: { name: string; description: string; effects: EmEffect[] }[] }).styles;
    shadows.forEach((st, i) => f.effectStyles.push({ id: `S:effect:${i},`, name: st.name, description: st.description, effects: st.effects }));
    f.effectStyles.push({ id: 'S:effect:frost,', name: 'Brand/Frost', description: '', effects: [
      { type: 'LAYER_BLUR', radius: 8, visible: true },
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 4, y: 6 }, radius: 10, spread: 2, visible: true },
    ] });
    const grads = (JSON.parse(readFileSync(join(OUT, 'gradient-styles.json'), 'utf8')) as { styles: { name: string; description: string; paintType: string; stops: { position: number; color: Rgba; alias: string | null }[] }[] }).styles;
    grads.forEach((st, i) => f.paintStyles.push({ id: `S:paint:${i},`, name: st.name, description: st.description, paints: [{
      type: st.paintType, gradientTransform: [[1, 0, 0], [0, 1, 0]],
      gradientStops: st.stops.map((x) => ({ position: x.position, color: x.color, ...(x.alias ? { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: varId(x.alias) } } } : {}) })),
    }] }));
    f.paintStyles.push({ id: 'S:paint:ink,', name: 'Brand/Ink', description: '', paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] });
    f.paintStyles.push({ id: 'S:paint:sunset,', name: 'Brand/Sunset', description: 'A sunset', paints: [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [
      { position: 0, color: { r: 1, g: 0.5, b: 0, a: 1 } }, { position: 0.35, color: { r: 1, g: 0, b: 0.5, a: 0.5 } }, { position: 1, color: { r: 0.2, g: 0, b: 0.4, a: 1 } }] }] });

    const cat36: SgCatalog = { collections: f.cols, variables: f.vars, textStyles: f.styles, effectStyles: f.effectStyles, paintStyles: f.paintStyles };
    const plan = planStyleGuide(cat36, contract, { types: ['shadow', 'gradient'] });
    const fx = plan.tables.find((t) => t.type === 'shadow');
    const gr = plan.tables.find((t) => t.type === 'gradient');
    const EFFECT_ROWS = ['shadow/xs', 'shadow/sm', 'shadow/md', 'shadow/lg', 'shadow/xl', 'shadow/2xl', 'shadow/inset',
      'shadow-dark/xs', 'shadow-dark/sm', 'shadow-dark/md', 'shadow-dark/lg', 'shadow-dark/xl', 'shadow-dark/2xl', 'shadow-dark/inset', 'Brand/Frost'];
    ok(plan.tables.length === 2 && fx?.key === 'shadow|effect-styles|' && fx.title === 'Effect styles' && fx.page === SEM && fx.description === '15 effect styles in this file'
      && JSON.stringify(fx.columns) === JSON.stringify(['Token', 'Specimen', 'Type', 'X', 'Y', 'Blur', 'Spread', 'Color', 'Description']),
      `36: the effect styles draw one table, "Effect styles" on Semantic tokens: Token · Specimen · Type · X · Y · Blur · Spread · Color · Description (${fx?.key}; ${fx?.columns.join(', ')}; "${fx?.description}")`);
    ok(JSON.stringify(fx?.rows.map((r) => r.tokenCell)) === JSON.stringify(EFFECT_ROWS),
      `36: one row per effect style, in the file's order, the one Prism3 did not make included (${fx?.rows.map((r) => r.tokenCell).join(', ')})`);
    // ONE LINE A LAYER, every layer, in every value column: the cell's value, then the extras (X, Y, Blur, Spread, Color).
    const fxRow = (name: string): string[] => { const r = fx?.rows.find((x) => x.name === name); return r ? [r.cells[0].value, ...(r.extra ?? []).map((e) => e.value)] : []; };
    ok(JSON.stringify(fxRow('shadow/2xl')) === JSON.stringify(['Drop shadow\nDrop shadow', '0px\n0px', '6px\n22px', '12px\n52px', '-6px\n-12px', '#0A1228 · 14%\n#0A1228 · 12%']),
      `36: shadow/2xl prints both its layers, one line each: x 0 0, y 6 22, blur 12 52, spread -6 -12, #0A1228 at 14% and 12% (${JSON.stringify(fxRow('shadow/2xl'))})`);
    ok(JSON.stringify(fxRow('shadow-dark/inset')) === JSON.stringify(['Inner shadow', '0px', '2px', '4px', '0px', '#0A1228 · 30%']),
      `36: shadow-dark/inset prints its one inner shadow: 0, 2, 4, 0, #0A1228 at 30% (${JSON.stringify(fxRow('shadow-dark/inset'))})`);
    ok(JSON.stringify(fxRow('Brand/Frost')) === JSON.stringify(['Layer blur\nDrop shadow', '—\n4px', '—\n6px', '8px\n10px', '—\n2px', '—\n#000000 · 25%']),
      `36: a blur layer prints its type and blur, "—" for what it has not, beside the shadow layer (${JSON.stringify(fxRow('Brand/Frost'))})`);
    ok(JSON.stringify(planStyleGuide(cat36, contract, { types: ['shadow'], valueFormat: 'rgba' }).tables[0]?.rows.find((r) => r.name === 'shadow/xs')?.extra?.[4].value) === JSON.stringify('rgba(10, 18, 40, 0.1)\nrgba(10, 18, 40, 0.06)'),
      '36: a shadow color follows the Color value format: rgba(10, 18, 40, 0.1) and 0.06 for shadow/xs');
    // A HIDDEN LAYER is still listed, its Type line marked: planned off a copy, so the counts above stand.
    const veiled = planStyleGuide({ ...cat36, effectStyles: [...f.effectStyles, { id: 'S:effect:veil,', name: 'Brand/Veil', description: '', effects: [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: false },
    ] }] }, contract, { types: ['shadow'] }).tables[0]?.rows.find((r) => r.name === 'Brand/Veil');
    ok(veiled?.cells[0].value === 'Drop shadow (hidden)',
      `36: a hidden layer's Type line reads "Drop shadow (hidden)" (${JSON.stringify(veiled?.cells[0].value)})`);

    const GRAD_ROWS = ['gradient/brand', 'gradient/glow', 'Brand/Sunset'];
    ok(gr?.key === 'gradient|gradient-styles|' && gr.title === 'Gradient styles' && gr.page === SEM && gr.description === '3 gradient styles in this file'
      && JSON.stringify(gr.columns) === JSON.stringify(['Token', 'Specimen', 'Type', 'Position', 'Color', 'Variable', 'Description'])
      && JSON.stringify(gr.rows.map((r) => r.tokenCell)) === JSON.stringify(GRAD_ROWS),
      `36: the gradient paint styles draw one table, "Gradient styles": Token · Specimen · Type · Position · Color · Variable · Description, a row per gradient in the file's order and none for the solid Brand/Ink (${gr?.key}; ${gr?.columns.join(', ')}; ${gr?.rows.map((r) => r.tokenCell).join(', ')})`);
    const grRow = (name: string, t = gr): string[] => { const r = t?.rows.find((x) => x.name === name); return r ? [r.cells[0].value, ...(r.extra ?? []).map((e) => e.value)] : []; };
    ok(JSON.stringify(grRow('gradient/brand')) === JSON.stringify(['Linear', '0%\n100%', '#1E1EFF\n#7A3CFF', 'pds3/core/palette/primary/600\npds3/core/palette/accent/500']),
      `36: gradient/brand prints its stops, one line each: 0% #1E1EFF on primary/600, 100% #7A3CFF on accent/500 (${JSON.stringify(grRow('gradient/brand'))})`);
    ok(JSON.stringify(grRow('gradient/glow')) === JSON.stringify(['Radial', '0%\n100%', '#8D6FFC\n#1408C6', 'pds3/core/palette/accent/400\npds3/core/palette/primary/700']),
      `36: gradient/glow is Radial, 0% #8D6FFC on accent/400, 100% #1408C6 on primary/700 (${JSON.stringify(grRow('gradient/glow'))})`);
    ok(JSON.stringify(grRow('Brand/Sunset')) === JSON.stringify(['Linear', '0%\n35%\n100%', '#FF8000\n#FF0080 · 50%\n#330066', '—\n—\n—']),
      `36: Brand/Sunset prints its three stops at 0%, 35% and 100%, a stop bound to nothing as "—" (${JSON.stringify(grRow('Brand/Sunset'))})`);
    const noAlias = planStyleGuide(cat36, contract, { types: ['gradient'], aliases: false }).tables[0];
    ok(JSON.stringify(noAlias?.columns) === JSON.stringify(['Token', 'Specimen', 'Type', 'Position', 'Color', 'Description']) && grRow('gradient/brand', noAlias).length === 3,
      `36: aliases off, the Variable column goes (${noAlias?.columns.join(', ')})`);

    // SHORT NAMES (#2659, the #2623 shape): the fixture's effect and gradient styles share no root (`shadow/…` beside
    // `Brand/…`), and the default prints the whole name, so a planner that printed the full name, capped the common
    // prefix at one segment, or always dropped the first segment passed. Here the same styles sit under one root TWO
    // segments deep, `lib/fx/`: short drops the whole root, which a one-segment cap cannot, and the default keeps it.
    // And short mode on the plain fixture, whose names share no root: nothing to drop, which "drop one segment" fails.
    const rootedFx: SgCatalog = { ...cat36, effectStyles: f.effectStyles.map((s) => ({ ...s, name: `lib/fx/${s.name}` })), paintStyles: f.paintStyles.map((s) => ({ ...s, name: `lib/fx/${s.name}` })) };
    const cellOf = (c: SgCatalog, type: string, name: string, o: StyleGuideOptions): string | undefined =>
      planStyleGuide(c, contract, { ...o, types: [type] }).tables.find((t) => t.type === type)?.rows.find((r) => r.name === name)?.tokenCell;
    for (const [type, kind, name] of [['shadow', 'effect', 'shadow/xs'], ['gradient', 'gradient', 'gradient/brand']] as const) {
      const rootedShort = cellOf(rootedFx, type, `lib/fx/${name}`, { tokenNames: 'short' });
      ok(rootedShort === name, `36: short: ${kind} styles under one root print the name below it, ${name} for lib/fx/${name} (${rootedShort})`);
      const rootedFull = cellOf(rootedFx, type, `lib/fx/${name}`, {});
      ok(rootedFull === `lib/fx/${name}`, `36: default: the same ${kind} style prints its whole name, lib/fx/${name} (${rootedFull})`);
      const plainShort = cellOf(cat36, type, name, { tokenNames: 'short' });
      ok(plainShort === name, `36: short: ${kind} styles that share no root print their whole name, ${name} (${plainShort})`);
    }

    // ONLY WHAT EXISTS: a file with no effect or paint style draws neither table; a collections filter leaves them out.
    const bare = planStyleGuide({ collections: f.cols, variables: f.vars, textStyles: f.styles }, contract, { types: ['shadow', 'gradient'] });
    ok(bare.tables.length === 0 && planStyleGuide(cat36, contract, { types: ['shadow', 'gradient'], collections: ['core'] }).tables.length === 0,
      `36: a file with no effect or gradient style draws neither table, and a collections filter leaves both out (${bare.tables.map((t) => t.title).join(', ')})`);
    // THE PHASE BOUNDARY MOVED: shadow and gradient are in it; motion still is not.
    const motion = planStyleGuide(cat36, contract, { types: ['shadow', 'gradient', 'motion'] }).notes;
    ok(motion.includes('motion: not in this phase — this phase draws color, dimension, borderWidth, opacity, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, typography, shadow, gradient')
      && !motion.some((n) => n.startsWith('shadow:') || n.startsWith('gradient:')),
      `36: the note names shadow and gradient among the types this phase draws, and no longer either as outside it (${motion.join(' / ')})`);

    // THE PAGE'S CATALOG: each style under its table, after the text styles; the solid paint style not listed.
    const cat = catalogFor(cat36, contract, true);
    const names = cat.collections.map((c) => c.name);
    const fxCol = cat.collections.find((c) => c.name === 'Effect styles');
    const grCol = cat.collections.find((c) => c.name === 'Gradient styles');
    ok(JSON.stringify(names.slice(-3)) === JSON.stringify(['Text styles', 'Effect styles', 'Gradient styles']) && fxCol?.effectStyles === true && grCol?.gradientStyles === true
      && JSON.stringify(fxCol.items.map((it) => `${it.name}→${cat.tables[it.table]?.title}`)) === JSON.stringify(EFFECT_ROWS.map((n) => `${n}→Effect styles`))
      && JSON.stringify(grCol.items.map((it) => `${it.name}→${cat.tables[it.table]?.title}`)) === JSON.stringify(GRAD_ROWS.map((n) => `${n}→Gradient styles`)),
      `36: the page lists the effect styles and the gradient styles after the text styles, each under its table, Brand/Ink nowhere (${names.slice(-3).join(', ')}; ${grCol?.items.map((it) => it.name).join(', ')})`);
    ok(cat.tables.find((t) => t.title === 'Effect styles')?.kind === 'effect' && cat.tables.find((t) => t.title === 'Gradient styles')?.kind === 'gradient',
      '36: the page groups them as the effect and gradient kinds');

    // DRAWN.
    const r = await draw(f.api, contract, { types: ['shadow', 'gradient'] });
    ok(r.unbound === 0 && JSON.stringify(r.tables.map((t) => `${t.title}:${t.status}`)) === JSON.stringify(['Effect styles:created', 'Gradient styles:created']),
      `36: drawn, both tables are created and every specimen is bound (unbound ${r.unbound}; ${r.tables.map((t) => `${t.title}:${t.status}`).join(', ')}; ${r.misses.slice(0, 2).join(' / ')})`);
    const fxW = tableFrame(f.sem, 'Effect styles')!;
    const fxG = gridOf(fxW);
    ok(JSON.stringify(headerRow(fxW)) === JSON.stringify(['Token', 'Specimen', 'Type', 'X', 'Y', 'Blur', 'Spread', 'Color', 'Description']),
      `36: drawn, the Effect styles header row (${headerRow(fxW).join(', ')})`);
    // THE SPECIMEN IS BOUND TO THE STYLE: a type=default card with the style applied by id, not a copy of its layers.
    const card = (name: string): N | undefined => cellAt(fxG, rowOf(fxG, name), 1)?.findOne((k) => k.type === 'INSTANCE') ?? undefined;
    const styleId = (name: string): string | undefined => f.effectStyles.find((x) => x.name === name)?.id;
    const unboundCards = EFFECT_ROWS.filter((n) => card(n)?.effectStyleId !== styleId(n) || card(n)?.mainComponent?.name !== 'type=default');
    ok(unboundCards.length === 0,
      `36: every Effect styles row's card is the type=default member with its effect style applied (not: ${unboundCards.map((n) => `${n}→${card(n)?.mainComponent?.name}/${String(card(n)?.effectStyleId)}`).join(', ') || 'none'})`);
    const c2xl = card('shadow/2xl');
    ok(!!c2xl && JSON.stringify((c2xl.fills as { color?: unknown }[]).map((p) => p.color)) === JSON.stringify([{ r: 1, g: 1, b: 1 }]) && c2xl.children.every((k) => k.visible === false)
      && c2xl.parent?.paddingTop === 74 && c2xl.parent?.paddingLeft === 74 && card('shadow/xs')?.parent?.paddingTop === 12 && card('shadow/xs')?.parent?.paddingLeft === 16,
      `36: the card is white, its own layers hidden, in a cell padded by the style's reach: 74 for shadow/2xl (22 + 52), the usual 12 × 16 for shadow/xs (${JSON.stringify(c2xl?.fills)}; ${c2xl?.parent?.paddingTop}/${c2xl?.parent?.paddingLeft}; ${card('shadow/xs')?.parent?.paddingTop}/${card('shadow/xs')?.parent?.paddingLeft})`);
    const at = (g: N, name: string, col: number): string => textIn(cellAt(g, rowOf(g, name), col));
    ok(at(fxG, 'shadow/2xl', 2) === 'Drop shadow\nDrop shadow' && at(fxG, 'shadow/2xl', 4) === '6px\n22px' && at(fxG, 'shadow/2xl', 5) === '12px\n52px' && at(fxG, 'shadow/2xl', 6) === '-6px\n-12px'
      && at(fxG, 'shadow/2xl', 7) === '#0A1228 · 14%\n#0A1228 · 12%' && at(fxG, 'shadow/2xl', 8) === 'Elevation 6 of 6 — light mode',
      `36: drawn, shadow/2xl's cells read its two layers, one line each, and its description (${[2, 4, 5, 6, 7, 8].map((c) => JSON.stringify(at(fxG, 'shadow/2xl', c))).join(' · ')})`);
    const grW = tableFrame(f.sem, 'Gradient styles')!;
    const grG = gridOf(grW);
    const swatch = (name: string): N | undefined => cellAt(grG, rowOf(grG, name), 1);
    const pId = (name: string): string | undefined => f.paintStyles.find((x) => x.name === name)?.id;
    const unboundSwatches = GRAD_ROWS.filter((n) => swatch(n)?.type !== 'INSTANCE' || swatch(n)?.fillStyleId !== pId(n) || swatch(n)?.lsh !== 'FILL' || swatch(n)?.layoutSizingVertical !== 'FILL');
    ok(unboundSwatches.length === 0,
      `36: every Gradient styles row's swatch is an instance filling its cell, its fill style the row's gradient (not: ${unboundSwatches.map((n) => `${n}→${swatch(n)?.type}/${String(swatch(n)?.fillStyleId)}`).join(', ') || 'none'})`);
    ok(at(grG, 'Brand/Sunset', 3) === '0%\n35%\n100%' && at(grG, 'gradient/brand', 5) === 'pds3/core/palette/primary/600\npds3/core/palette/accent/500' && at(grG, 'gradient/glow', 2) === 'Radial',
      `36: drawn, Brand/Sunset's stops read 0%, 35%, 100%, and gradient/brand's stops their variables (${JSON.stringify(at(grG, 'Brand/Sunset', 3))}; ${JSON.stringify(at(grG, 'gradient/brand', 5))})`);

    // A RERUN updates both in place: no second table, no change.
    const again = await draw(f.api, contract, { types: ['shadow', 'gradient'] });
    ok(tablesOn(f.sem).length === 2 && again.tables.every((t) => t.status === 'updated' && t.diff.added.length + t.diff.removed.length + t.diff.changed.length === 0),
      `36: a rerun updates both tables in place, nothing added, removed or changed (${tablesOn(f.sem).length} tables; ${again.tables.map((t) => t.status).join(', ')})`);
    // A STYLE THE HOST WILL NOT APPLY is counted and named by table and token, and is not a pass.
    refuseStyle = true;
    const refused = await draw(f.api, contract, { types: ['shadow', 'gradient'] });
    refuseStyle = false;
    ok(refused.unbound === 18 && refused.misses.some((m) => m.startsWith('15 effect styles are not bound to their style, so they show the cell component\'s own value ('))
      && refused.misses.some((m) => m.startsWith('3 gradient styles are not bound to their style, so they show the cell component\'s own value ('))
      && !styleGuideSummary(refused).ok,
      `36: a style the host refuses to apply is counted (18), named by kind, and not a pass (${refused.unbound}; ${refused.misses.filter((m) => m.includes('style')).join(' / ')})`);
    // Q272 A: the miss names the style in plain words. No internal kind key reaches the user, in the misses or the summary.
    const keyLeaks = [...refused.misses, styleGuideSummary(refused).summary, ...styleGuideSummary(refused).lines].filter((m) => /\b(effect|gradient)-style\b/.test(m));
    ok(keyLeaks.length === 0, `36: the refused styles' miss says "effect styles" / "gradient styles", never a raw kind key (${keyLeaks.join(' / ') || 'none'})`);
  }

  console.log('37. groups (#2801, Q378): the engine table by type and tier, adoption, re-runs, empty groups, ungrouped guides');
  {
    // (1) THE TABLE, BY TYPE AND TIER, NEVER BY FAMILY NAME (decision 1). Typed from the issue's table: an icon COLOR family
    // is a semantic color and an icon SIZE family is Space & size; a border COLOR is a semantic color and a border WIDTH is
    // Borders; a guide of radii is Borders; another brand's ramp is a palette because it is a primitive color family.
    ok(styleGuideGroupOf({ type: 'color', tier: 'primitive' }) === 'palettes' && styleGuideGroupOf({ type: 'color', tier: 'semantic' }) === 'semantic-colors'
      && styleGuideGroupOf({ type: 'dimension', tier: 'primitive' }) === 'dimensions' && styleGuideGroupOf({ type: 'opacity', tier: 'primitive' }) === 'dimensions'
      && styleGuideGroupOf({ type: 'dimension', tier: 'semantic' }) === 'space-size' && styleGuideGroupOf({ type: 'dimension', tier: 'semantic', allRadius: true }) === 'borders'
      && styleGuideGroupOf({ type: 'borderWidth', tier: 'semantic' }) === 'borders' && styleGuideGroupOf({ type: 'fontSize', tier: 'primitive' }) === 'primitive-fonts'
      && styleGuideGroupOf({ type: 'fontWeight', tier: 'semantic' }) === 'semantic-fonts' && styleGuideGroupOf({ type: 'typography', tier: 'semantic' }) === 'semantic-fonts'
      && styleGuideGroupOf({ type: 'shadow', tier: 'semantic' }) === null && styleGuideGroupOf({ type: 'gradient', tier: 'semantic' }) === null
      && styleGuideGroupOf({ type: 'color', tier: 'semantic', inverse: true }) === 'inverse-colors',
      '37: the engine table groups by type and tier: palettes, dimensions, fonts; semantic colors, inverse colors, space & size, borders, fonts; effect and gradient styles stand alone');
    ok(JSON.stringify(STYLE_GUIDE_GROUPS.map((g) => `${g.tier[0]}:${g.title}${g.under ? ` under ${g.under}` : ''}`)) === JSON.stringify(['p:Palettes', 'p:Dimensions', 'p:Fonts', 's:Semantic colors', 's:Inverse colors under semantic-colors', 's:Space & size', 's:Borders', 's:Fonts']),
      `37: eight groups in the order they stack, titled as decided, Inverse colors under Semantic colors (${STYLE_GUIDE_GROUPS.map((g) => g.title).join(', ')})`);
    // Through the plan, on a file with another brand's families: an `accent` ramp under a foreign root, a semantic `link`
    // family, an icon-size collection and a border-width collection the prism3 emission does not have.
    const gf = await phase2File();
    const core = gf.vars.find((v) => v.name === 'pds3/core/dimension/100')!;
    gf.cols.push({ id: 'VariableCollectionId:bw', name: 'border-width', modes: [{ modeId: 'bw:0', name: 'Default' }], defaultModeId: 'bw:0' },
      { id: 'VariableCollectionId:ic', name: 'icon', modes: [{ modeId: 'ic:0', name: 'Default' }], defaultModeId: 'ic:0' },
      { id: 'VariableCollectionId:bx', name: 'brandx', modes: [{ modeId: 'bx:0', name: 'Default' }], defaultModeId: 'bx:0' },
      { id: 'VariableCollectionId:bxs', name: 'brandx roles', modes: [{ modeId: 'bxs:0', name: 'Default' }], defaultModeId: 'bxs:0' });
    const alias = (id: string): { type: string; id: string } => ({ type: 'VARIABLE_ALIAS', id });
    gf.vars.push({ id: 'VariableID:bw:0', name: 'pds3/border-width/thin', variableCollectionId: 'VariableCollectionId:bw', resolvedType: 'FLOAT', description: '', valuesByMode: { 'bw:0': alias(core.id) }, scopes: ['STROKE_FLOAT'] },
      { id: 'VariableID:ic:0', name: 'pds3/icon/sm', variableCollectionId: 'VariableCollectionId:ic', resolvedType: 'FLOAT', description: '', valuesByMode: { 'ic:0': alias(core.id) }, scopes: ['WIDTH_HEIGHT'] },
      { id: 'VariableID:bx:0', name: 'brandx/accent/100', variableCollectionId: 'VariableCollectionId:bx', resolvedType: 'COLOR', description: '', valuesByMode: { 'bx:0': { r: 0.9, g: 0.2, b: 0.4, a: 1 } } },
      { id: 'VariableID:bxs:0', name: 'brandx/link/default', variableCollectionId: 'VariableCollectionId:bxs', resolvedType: 'COLOR', description: '', valuesByMode: { 'bxs:0': alias('VariableID:bx:0') } });
    const plan37 = planStyleGuide({ collections: gf.cols, variables: gf.vars, textStyles: gf.styles }, contract);
    const groupsOfPlan = plan37.tables.map((t) => `${t.title}:${t.group}`).join(', ');
    // One-family collections are titled after their collection (`brandx`, `brandx roles`), as every collection is.
    ok(groupsOfPlan === ['Brandx:palettes', 'Brandx roles:semantic-colors', 'Dimension:dimensions', 'Font family:primitive-fonts', 'Font size:primitive-fonts', 'Font weight:primitive-fonts',
      'Font weight roles:semantic-fonts', 'Space:space-size', 'Radius:borders', 'Size:space-size', 'Opacity:dimensions', 'Density:dimensions', 'Step:dimensions',
      'Line height:primitive-fonts', 'Letter spacing:primitive-fonts', 'Border width:borders', 'Icon size:space-size', 'Text styles:semantic-fonts'].join(', '),
      `37: the plan gives every table its group by type and tier: another brand's accent ramp a palette, its link family a semantic color, icon sizes Space & size, border widths and radii Borders (${groupsOfPlan})`);

    // (2) A FRESH FILE DRAWS EACH GROUP ONCE, the tier's groups on its page, in the table's order.
    await draw(gf.api, contract);
    const titlesOn = (p: N): string[] => pageFrames(p).sort((a, b) => a.y - b.y).map((n) => n.name.replace(/^Style guides? — /, ''));
    ok(JSON.stringify(titlesOn(gf.prim)) === JSON.stringify(['Palettes', 'Dimensions', 'Fonts']) && JSON.stringify(titlesOn(gf.sem)) === JSON.stringify(['Semantic colors', 'Space & size', 'Borders', 'Fonts']),
      `37: a fresh file stacks each page's groups in the table's order (${titlesOn(gf.prim).join(', ')} | ${titlesOn(gf.sem).join(', ')})`);
    const inGroup = (p: N, title: string): string[] => guidesOf(groupFrame(p, title))!.children.slice().sort((a, b) => a.gridCol! - b.gridCol!).map((k) => k.name.replace('Style guide — ', ''));
    ok(JSON.stringify(inGroup(gf.sem, 'Borders')) === JSON.stringify(['Radius', 'Border width']) && JSON.stringify(inGroup(gf.sem, 'Space & size')) === JSON.stringify(['Space', 'Size', 'Icon size']),
      `37: Borders holds Radius and Border width, in plan order, Space & size holds Space, Size and Icon size (${inGroup(gf.sem, 'Borders').join(', ')} | ${inGroup(gf.sem, 'Space & size').join(', ')})`);

    // (3) A GUIDE MOVED BY HAND INTO ANOTHER GROUP STAYS THERE (decision 3); a note a designer put in a group is never
    // moved or deleted; a renamed group keeps its title; a title Prism3 wrote is refreshed.
    const radius = tableFrame(gf.sem, 'Radius')!;
    const spaceGrid = guidesOf(groupFrame(gf.sem, 'Space & size'))!;
    spaceGrid.gridColumnCount = 4; spaceGrid.gridColumnSizes = [0, 1, 2, 3].map(() => ({ type: 'HUG' }));
    spaceGrid.appendChildAt(radius, 0, 3);
    const borders = groupFrame(gf.sem, 'Borders')!;
    const note = new N('FRAME'); note.name = 'sticky note'; note.w = 300; note.h = 200; borders.appendChild(note);
    const bTitle = borders.children[0].findOne((k) => k.name === 'Title')!;
    bTitle.characters = 'Strokes & corners';
    const fontsSem = groupFrame(gf.sem, 'Fonts')!;
    // As an earlier build would have written a different title: its record, its frame name and its header all read it.
    const fTitle = fontsSem.children[0].findOne((k) => k.name === 'Title')!;
    fTitle.characters = 'Type'; fontsSem.name = 'Style guides — Type'; fontsSem.pluginData['prism3-style-guide-group-title'] = 'Type';
    await draw(gf.api, contract);
    ok(radius.parent === spaceGrid && cellOf(radius) === '0,3' && tableFrame(gf.sem, 'Radius') === radius,
      `37: a guide moved by hand into another group stays there on a rerun, redrawn in place (${radius.parent?.parent?.name}, ${cellOf(radius)})`);
    ok(note.parent === borders && !note.removed && bTitle.characters === 'Strokes & corners' && borders.name === 'Style guides — Borders',
      `37: a designer's note in a group is left where it is, and a title they changed is kept (${note.parent?.name}; "${bTitle.characters}")`);
    ok(fTitle.characters === 'Fonts' && fontsSem.name === 'Style guides — Fonts' && fontsSem.pluginData['prism3-style-guide-group-title'] === 'Fonts',
      `37: a title still reading what Prism3 wrote is refreshed, its frame name with it ("${fTitle.characters}", ${fontsSem.name})`);

    // (4) AN EMPTY GROUP IS REMOVED by a full run, never by a filtered or a stopped one; a group holding a designer's note
    // is not empty. Border width removed: Borders keeps only the note, so it stays. Icon size removed: Space & size still
    // holds guides. Every space and size removed, and Radius with them: Space & size is empty, and goes.
    gf.vars.splice(gf.vars.findIndex((v) => v.id === 'VariableID:bw:0'), 1);
    const rb = await draw(gf.api, contract);
    ok(!!groupFrame(gf.sem, 'Borders') && borders.children.every((c) => c === note || c.pluginData['prism3-style-guide-part']) && !rb.groups?.removed.length,
      `37: a group left with only a designer's note is not empty, and stays (${JSON.stringify(rb.groups?.removed)})`);
    const drop = (re: RegExp): void => { for (let i = gf.vars.length - 1; i >= 0; i--) if (re.test(gf.vars[i].name)) gf.vars.splice(i, 1); };
    drop(/^pds3\/(space|size|radius|icon)\//);
    drop(/^density\//);
    // The designer deletes those guides by hand too, so Space & size is EMPTY before the partial runs: a filtered or a
    // stopped run judges no superseded guide, so without this the group would still hold them and the checks prove nothing.
    for (const t of ['Space', 'Size', 'Icon size', 'Radius']) tableFrame(gf.sem, t)!.remove();
    const space = groupFrame(gf.sem, 'Space & size')!;
    ok(!space.findOne((k) => !!k.pluginData['prism3-style-guide']), '37: Space & size is empty before the partial runs (the precondition)');
    const filtered = await draw(gf.api, contract, { tables: ['Dimension'] });
    ok(!!groupFrame(gf.sem, 'Space & size') && !space.removed && !filtered.groups?.removed.length, '37: a filtered run removes no group, an empty one included');
    let n37 = 0;
    const stopped = await draw(gf.api, contract, {}, { onTable: (e) => { if (e.status === 'done') n37++; }, stop: () => n37 >= 1 });
    ok(!!stopped.stopped && !!groupFrame(gf.sem, 'Space & size') && !space.removed && !stopped.groups?.removed.length, '37: a stopped run removes no group, an empty one included');
    const full = await draw(gf.api, contract);
    ok(!groupFrame(gf.sem, 'Space & size') && space.removed && JSON.stringify(full.groups?.removed) === JSON.stringify(['Style guides — Space & size'])
      && styleGuideSummary(full).summary.includes('1 group removed, empty: Style guides — Space & size'),
      `37: a full run removes a group it drew once it holds nothing, and says so (${JSON.stringify(full.groups?.removed)})`);
    ok(pageOverlaps(gf.sem).length === 0 && titlesOn(gf.sem).join(', ') === 'Semantic colors, Borders, Fonts' && groupFrame(gf.sem, 'Borders')!.y === groupFrame(gf.sem, 'Semantic colors')!.y + groupFrame(gf.sem, 'Semantic colors')!.height + 320,
      `37: the groups below close up over it, 320 apart (${titlesOn(gf.sem).join(', ')}; ${pageOverlaps(gf.sem).join('; ') || 'no overlap'})`);

    // (5) ADOPTION (Q378): a file whose designer grouped the guides by hand. Its "Color ramps" frame, a horizontal auto
    // layout of their own spacing, holds Primary and Neutral; the other guides are loose, drawn before groups. The first run
    // adopts it: no Palettes group is drawn, the loose palettes join it, and its title, position and layout are kept. A
    // hand-made frame holding guides of two default groups ("Odds and ends": Text and Legacy) is one group, as it is.
    const ad = await fullFile();
    await draw(ad.api, contract);
    for (const p of [ad.prim, ad.sem]) {
      for (const g of tablesOn(p)) { p.appendChild(g); delete g.pluginData['prism3-style-guide-in-group']; }
      for (const g of pageFrames(p).filter((n) => !n.pluginData['prism3-style-guide'])) g.remove();
    }
    const hand = (p: N, name: string, guides: string[], x: number): N => {
      const f = new N('FRAME'); f.name = name; f.layoutMode = 'HORIZONTAL'; f.itemSpacing = 48; f.paddingTop = 24; f.x = x; f.y = -4000; p.appendChild(f);
      const t = new N('TEXT'); t.name = 'Title'; t.characters = name; f.appendChild(t);
      for (const g of guides) f.appendChild(tableFrame(p, g)!);
      return f;
    };
    const ramps = hand(ad.prim, 'Color ramps', ['Primary', 'Neutral'], -9000);
    const odds = hand(ad.prim, 'Odds and ends', ['Legacy'], -20000);
    const textOdd = tableFrame(ad.sem, 'Text')!;
    odds.appendChild(textOdd);
    const ra = await draw(ad.api, contract);
    const rampNames = ramps.children.filter((k) => k.type === 'FRAME').map((k) => k.name.replace('Style guide — ', ''));
    ok(!groupFrame(ad.prim, 'Palettes') && JSON.stringify(rampNames) === JSON.stringify(['Primary', 'Neutral', 'Core — base', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha'])
      && ramps.x === -9000 && ramps.y === -4000 && ramps.name === 'Color ramps' && ramps.itemSpacing === 48 && ramps.paddingTop === 24 && ramps.children[0].characters === 'Color ramps',
      `37: a hand-made group is adopted: no Palettes drawn, the loose palettes join it at its end, its title, place and layout kept (${rampNames.join(', ')}; ${ramps.x},${ramps.y})`);
    ok(textOdd.parent === odds && tableFrame(ad.prim, 'Legacy')!.parent === odds && tableFrame(ad.sem, 'Background')!.parent === guidesOf(groupFrame(ad.sem, 'Semantic colors')),
      `37: a hand-made frame holding guides of two groups keeps both; a guide in no hand group goes to its default group, drawn when missing (Text in ${textOdd.parent?.name}; Background in ${tableFrame(ad.sem, 'Background')!.parent?.parent?.name})`);
    ok(JSON.stringify(ra.groups?.adopted) === JSON.stringify(['Color ramps']) && styleGuideSummary(ra).summary.includes('1 group you made is kept as drawn, with new guides added: Color ramps'),
      `37: the summary names the adopted group (${JSON.stringify(ra.groups?.adopted)})`);
    // Emptied by hand, title and all, a group Prism3 did not draw is never removed: it holds nothing, as an empty group
    // Prism3 drew would, and is still the designer's.
    for (const g of ramps.children.filter((k) => k.type === 'FRAME')) ad.prim.appendChild(g);
    for (const k of [...ramps.children]) k.remove();
    await draw(ad.api, contract);
    ok(!ramps.removed && ramps.parent === ad.prim, '37: a hand-made group with no guides left is never removed');

    // (6) A FAMILY WITH NO DEFAULT COUNTERPART sits past Semantic colors' last column in Inverse colors; one with no
    // inverse leaves its cell below empty.
    const iv = await fullFile();
    const four = { 'color:0': { r: 0, g: 0, b: 1, a: 1 }, 'color:1': { r: 0, g: 0, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 1, a: 1 }, 'color:3': { r: 0, g: 0, b: 1, a: 1 } };
    iv.vars.push({ id: 'VariableID:color:invlink', name: 'pds3/color/inverse/link/primary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: '', valuesByMode: four });
    await draw(iv.api, contract, { collections: ['color'] });
    const invGrid = (): N => guidesOf(groupFrame(iv.sem, 'Inverse colors'))!;
    ok(cellOf(tableFrame(iv.sem, 'Inverse link')) === '0,10' && tableFrame(iv.sem, 'Inverse link')!.parent === invGrid() && cellOf(tableFrame(iv.sem, 'Scrim')) === '0,7' && !invGrid().children.some((k) => k.gridCol === 7),
      `37: an inverse family with no default sits past Semantic colors' last column, and a default with no inverse leaves its cell below empty (Inverse link ${cellOf(tableFrame(iv.sem, 'Inverse link'))})`);
    // A new default family drawn later joins the end, and its inverse counterpart, drawn after it, goes under it.
    iv.vars.push({ id: 'VariableID:color:link', name: 'pds3/color/link/primary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: '', valuesByMode: four });
    iv.vars.push({ id: 'VariableID:color:invglow', name: 'pds3/color/inverse/glow/primary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: '', valuesByMode: four });
    iv.vars.push({ id: 'VariableID:color:glow', name: 'pds3/color/glow/primary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: '', valuesByMode: four });
    await draw(iv.api, contract, { collections: ['color'] });
    ok(cellOf(tableFrame(iv.sem, 'Link')) === '0,10' && cellOf(tableFrame(iv.sem, 'Inverse link')) === '0,10' && cellOf(tableFrame(iv.sem, 'Glow')) === '0,11' && cellOf(tableFrame(iv.sem, 'Inverse glow')) === '0,11'
      && tableFrame(iv.sem, 'Inverse glow')!.parent === invGrid(),
      `37: a new default joins the end, and its inverse moves under it; a new pair takes a new column, inverse under default (Link ${cellOf(tableFrame(iv.sem, 'Link'))}, Inverse link ${cellOf(tableFrame(iv.sem, 'Inverse link'))}, Glow ${cellOf(tableFrame(iv.sem, 'Glow'))}, Inverse glow ${cellOf(tableFrame(iv.sem, 'Inverse glow'))})`);

    // (7) UNGROUPED GUIDES (Q6 A, Q8 A): effect styles stand alone, below the last group, left-aligned with the groups.
    const ef = await phase2File();
    ef.effectStyles.push({ id: 'S:effect:37,', name: 'elevation/1', description: '', effects: [{ type: 'DROP_SHADOW', visible: true, color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0 }] });
    await draw(ef.api, contract);
    const eff = tableFrame(ef.sem, 'Effect styles')!;
    const lastGroup = pageFrames(ef.sem).filter((n) => n !== eff).sort((a, b) => b.y - a.y)[0];
    ok(eff.parent === ef.sem && eff.x === groupFrame(ef.sem, 'Space & size')!.x && eff.y === lastGroup.y + lastGroup.height + 320 && !eff.pluginData['prism3-style-guide-in-group'],
      `37: Effect styles stands alone below the last group, left-aligned, 320 below it (${eff.x},${eff.y}; ${lastGroup.name} ends at ${lastGroup.y + lastGroup.height})`);

    // (8) A HEADER SET WITHOUT Size=Large (the owner's own set has Medium only): the group title uses Medium, named.
    const md = page(FC), mp = page(PRIM), ms = page(SEM);
    md.appendChild(headerSet('_section-header', ['Medium']));
    const mv = prism3Variables();
    const mh = makeShim([mp, ms, md], mv.cols, mv.vars);
    await ensureStyleGuideCells(mh.api, md);
    const rmh = await draw(mh.api, contract, { collections: ['legacy'] });
    ok(groupFrame(mp, 'Palettes')?.children[0]?.mainComponent?.name === 'Size=Medium' && rmh.misses.includes('_section-header has no Size=Large variant, so group titles use Size=Medium'),
      `37: with no Size=Large header, a group's title uses Size=Medium, and the run says so (${rmh.misses.filter((m) => m.includes('Size=')).join(' / ')})`);
  }

  console.log('38. a group you made gives its inverse guides to Inverse colors (owner decision, 2026-10-19; Q412 A, #2816); a table the generator no longer draws is offered, removed only on confirm');
  {
    const KEY = 'prism3-style-guide';
    const keyOf = (k: N): string => k.pluginData[KEY] ?? '';
    const isInv = (k: N): boolean => /\/inverse(\/|$)/.test(keyOf(k));
    const guideName = (k: N | undefined): string => (k?.name ?? 'none').replace('Style guide — ', '');
    /** A file whose designer made Semantic colors by hand, after an earlier build drew its guides loose: their own frame,
     *  ONE horizontal auto-layout row with their own title and spacing, the default guides in an order of their own. */
    const handMade = async (inverseInRow: boolean): Promise<{ f: Awaited<ReturnType<typeof fullFile>>; row: N; title: N; note: N; defaults: N[]; inverses: N[]; y: number }> => {
      const f = await fullFile();
      await draw(f.api, contract);
      for (const g of tablesOn(f.sem)) { f.sem.appendChild(g); delete g.pluginData['prism3-style-guide-in-group']; }
      for (const g of pageFrames(f.sem).filter((n) => !n.pluginData[KEY])) g.remove();
      const colors = tablesOn(f.sem).filter((k) => keyOf(k).startsWith('color|'));
      // The designer's order, not the plan's.
      const defaults = colors.filter((k) => !isInv(k)).reverse();
      const inverses = colors.filter(isInv);
      const row = new N('FRAME'); row.name = 'Semantic colors'; row.layoutMode = 'HORIZONTAL'; row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO'; row.itemSpacing = 96; row.paddingTop = 24; row.x = -7000; row.y = -30000;
      f.sem.appendChild(row);
      const title = new N('TEXT'); title.name = 'Title'; title.characters = 'Semantic colors'; row.appendChild(title);
      for (const g of defaults) row.appendChild(g);
      // As #2810's first run left the owner's file: every inverse guide appended at the end of the row.
      if (inverseInRow) for (const g of inverses) row.appendChild(g);
      // A note of theirs after the guides: their content, which keeps its place after the new grid.
      const note = new N('FRAME'); note.name = 'sticky note'; note.w = 300; note.h = 200; row.appendChild(note);
      row.y = -30000;
      // A group Prism3 drew 320 below the row, where it left it (a designer's note keeps it from being empty): the page's
      // groups stack from it, so a row that grows taller runs into it unless it moves down with the row.
      const below = new N('FRAME'); below.name = 'Style guides — Borders'; below.layoutMode = 'VERTICAL'; below.primaryAxisSizingMode = 'AUTO'; below.counterAxisSizingMode = 'AUTO';
      f.sem.appendChild(below);
      below.pluginData['prism3-style-guide-group'] = 'borders'; below.pluginData['prism3-style-guide-group-mark'] = `${String(f.sem.id)}|${String(below.id)}`;
      const memo = new N('FRAME'); memo.name = 'sticky note'; memo.w = 300; memo.h = 200; below.appendChild(memo);
      below.x = -7000; below.y = row.y + row.height + 320; below.pluginData['prism3-style-guide-group-at'] = `${below.x},${below.y}`;
      return { f, row, title, note, defaults, inverses, y: row.y };
    };
    const gridIn = (row: N): N | undefined => row.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'guides');
    /** Each inverse guide's cell against its default's: `Inverse text 1,3 under Text 0,3`. */
    const pairing = (defaults: N[], inverses: N[]): string[] => inverses.map((v) => {
      const mate = defaults.find((d) => keyOf(d) === keyOf(v).replace('/inverse', ''));
      return `${guideName(v)} ${cellOf(v)} ${mate ? `under ${guideName(mate)} ${cellOf(mate)}` : 'with no default'}`;
    });
    const invGridOf = (f: { sem: N }): N | undefined => guidesOf(groupFrame(f.sem, 'Inverse colors'));
    /** Each inverse guide in Inverse colors, in its default's column (one with no default past the defaults' last). */
    const paired = (defaults: N[], inverses: N[], grid: N | undefined, inv: N | undefined): boolean => !!inv && inverses.every((v) => {
      const mate = defaults.find((d) => keyOf(d) === keyOf(v).replace('/inverse', ''));
      return v.parent === inv && v.gridRow === 0 && (mate ? mate.parent === grid && v.gridCol === mate.gridCol : v.gridCol! >= defaults.length);
    });

    // (1) THE MEASURED RESULT OF #2810: the inverse guides at the end of the row. One of them a designer dragged out of the
    // row before this run: it carries the record of the group it was in.
    const a = await handMade(true);
    const out = a.inverses[a.inverses.length - 1];
    a.f.sem.appendChild(out); out.pluginData['prism3-style-guide-in-group'] = String(a.row.id); out.x = -7000; out.y = -90000;
    const inRow = a.inverses.filter((v) => v !== out);
    ok(a.defaults.length > 1 && inRow.length > 1 && a.row.width > 15000, `38: the precondition: one row, ${a.defaults.length} defaults then ${inRow.length} inverse guides, ${a.row.width}px wide`);
    const r1 = await draw(a.f.api, contract);
    const grid = gridIn(a.row);
    ok(a.row.parent === a.f.sem && !a.row.removed && a.row.x === -7000 && a.row.y === a.y && a.row.name === 'Semantic colors' && a.row.layoutMode === 'HORIZONTAL'
      && a.row.itemSpacing === 96 && a.row.paddingTop === 24 && a.row.children[0] === a.title && a.title.characters === 'Semantic colors' && a.row.children[1] === grid
      && a.row.children[2] === a.note && a.row.children.length === 3,
      `38: a group you made keeps its frame, title, place and layout; its defaults go into one grid where the first guide was (${a.row.children.map((c) => c.name).join(', ')}; ${a.row.x},${a.row.y})`);
    ok(grid?.layoutMode === 'GRID' && grid.gridRowCount === 1 && grid.gridColumnGap === 96 && a.defaults.every((d, i) => d.parent === grid && d.gridRow === 0 && d.gridCol === i),
      `38: the defaults are one row, in the designer's order, their own spacing kept (${a.defaults.map((d) => `${guideName(d)} ${cellOf(d)}`).join(', ')})`);
    ok(paired(a.defaults, inRow, grid, invGridOf(a.f)), `38: each inverse guide moved out to Inverse colors, in its default's column, one with no default past the last (${pairing(a.defaults, inRow).join('; ')})`);
    ok(out.parent === a.f.sem && out.x === -7000 && out.y === -90000, `38: a guide dragged out of the group by hand stays where it was put (${out.parent?.name})`);
    const below = groupFrame(a.f.sem, 'Borders'), inv = groupFrame(a.f.sem, 'Inverse colors');
    ok(!!below && !!inv && inv.y === a.row.y + a.row.height + 320 && pageOverlaps(a.f.sem).length === 0 && below.y === inv.y + inv.height + 320,
      `38: Inverse colors goes 320 below the group, and the group that sat there moves down clear of it, 320 below (Inverse colors at ${inv?.y}, the row ends at ${a.row.y + a.row.height}; Borders at ${below?.y}; ${pageOverlaps(a.f.sem).join('; ') || 'no overlap'})`);
    ok(JSON.stringify(r1.groups?.rearranged) === JSON.stringify(['Semantic colors'])
      && styleGuideSummary(r1).summary.includes('1 group now has its inverse guides in Inverse colors, a group of their own below, its title and place kept: Semantic colors')
      && !/kept as drawn, with new guides added: [^.]*Semantic colors/.test(styleGuideSummary(r1).summary),
      `38: the summary says the group's inverse guides moved out, once (${JSON.stringify(r1.groups?.rearranged)})`);

    // (2) A RERUN LEAVES THE DESIGNER'S ARRANGEMENT ALONE: the grid is made once; a default moved by hand to another cell
    // stays there, no second grid is made, and its inverse guide follows it to its new column.
    const moved = a.defaults[0];
    // Without the grid (the split did not run) the hand move is skipped; the checks above already failed by name.
    if (grid) {
      grid.gridColumnCount = grid.gridColumnCount + 1; grid.gridColumnSizes = Array.from({ length: grid.gridColumnCount }, () => ({ type: 'HUG' }));
      moved.setGridChildPosition(0, grid.gridColumnCount - 1);
    }
    const at = cellOf(moved);
    const r2 = await draw(a.f.api, contract);
    const movedInv = inRow.find((v) => keyOf(v).replace('/inverse', '') === keyOf(moved));
    ok(gridIn(a.row) === grid && a.row.children.length === 3 && cellOf(moved) === at && moved.parent === grid && !r2.groups?.rearranged.length
      && (!movedInv || cellOf(movedInv) === at),
      `38: a rerun keeps a guide moved by hand where it was put, rearranges nothing, and its inverse follows it (${guideName(moved)} ${cellOf(moved)}, was ${at}; ${guideName(movedInv)} ${cellOf(movedInv)})`);

    // (3) A NEW PAIR LATER: the default joins the adopted grid, its inverse goes under it in Inverse colors.
    const four = { 'color:0': { r: 0, g: 0, b: 1, a: 1 }, 'color:1': { r: 0, g: 0, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 1, a: 1 }, 'color:3': { r: 0, g: 0, b: 1, a: 1 } };
    a.f.vars.push({ id: 'VariableID:color:glow', name: 'pds3/color/glow/primary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: '', valuesByMode: four });
    a.f.vars.push({ id: 'VariableID:color:invglow', name: 'pds3/color/inverse/glow/primary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: '', valuesByMode: four });
    await draw(a.f.api, contract);
    const glow = tableFrame(a.f.sem, 'Glow'), invGlow = tableFrame(a.f.sem, 'Inverse glow');
    ok(glow?.parent === grid && invGlow?.parent === invGridOf(a.f) && glow.gridRow === 0 && invGlow.gridRow === 0 && invGlow.gridCol === glow.gridCol,
      `38: a new pair: the default joins a group you made, its inverse goes under it in Inverse colors (Glow ${cellOf(glow)} in ${glow?.parent?.parent?.name}, Inverse glow ${cellOf(invGlow)} in ${invGlow?.parent?.parent?.name})`);

    // (4) ADOPTED THIS RUN: the row holds the defaults only, and the inverse guides are loose, drawn before groups. They
    // join Inverse colors, and the row's defaults go into one grid, so each inverse guide has its column, in the same run.
    const b = await handMade(false);
    await draw(b.f.api, contract);
    const gb = gridIn(b.row);
    ok(!!gb && b.defaults.every((d, i) => d.parent === gb && cellOf(d) === `0,${i}`) && paired(b.defaults, b.inverses, gb, invGridOf(b.f)) && b.row.children[0] === b.title,
      `38: inverse guides that join Inverse colors this run go under their defaults in a group you made too (${pairing(b.defaults, b.inverses).slice(0, 3).join('; ')}…)`);

    // (5) THE CLEANUP OFFER: the owner's old single Inverse table, in their own "Inverse" frame, a copy of a table the
    // generator no longer draws (it now draws one per family). The run leaves it, says so, and lists it; it is removed
    // only when the designer confirms it, and only it.
    const c = await fullFile();
    await draw(c.api, contract);
    const invText = tableFrame(c.sem, 'Inverse text')!;
    const oldKey = keyOf(invText).replace(/\/text$/, '');
    const box = new N('FRAME'); box.name = 'Inverse'; box.x = -9000; box.y = -9000; c.sem.appendChild(box);
    const old = new N('FRAME'); old.name = 'Style guide — Inverse';
    old.pluginData[KEY] = oldKey; old.pluginData['prism3-style-guide-print'] = 'x'; old.pluginData['prism3-style-guide-mark'] = `${String(c.sem.id)}|not-this-frame`;
    box.appendChild(old);
    ok(oldKey.endsWith('/inverse') && !oldKey.endsWith('/inverse/text'), `38: the precondition: a table keyed as the old single Inverse table (${oldKey})`);
    const rc = await draw(c.api, contract);
    ok(!old.removed && old.parent === box && JSON.stringify(rc.retired) === JSON.stringify([{ id: String(old.id), name: 'Style guide — Inverse' }])
      && rc.kept.some((k) => k.name === 'Style guide — Inverse' && k.reason === 'copied'),
      `38: a run never removes a table the generator no longer draws by itself; it lists it as an offer (${JSON.stringify(rc.retired)})`);
    ok(styleGuideSummary(rc).summary.includes('1 table the generator no longer draws can be removed on the Style guides page, once you confirm'),
      '38: the run\'s result offers the cleanup');
    // Not confirmed: nothing. Confirmed with a table that is still drawn: that one is left, by id.
    const none = await removeRetiredTables(c.api, contract, []);
    ok(!old.removed && none.removed.length === 0, '38: with nothing confirmed, nothing is removed');
    const still = await removeRetiredTables(c.api, contract, [String(invText.id)]);
    ok(!invText.removed && still.removed.length === 0 && JSON.stringify(still.left) === JSON.stringify([String(invText.id)]),
      `38: a table the generator still draws is never removed, even when named (${JSON.stringify(still)})`);
    const done = await removeRetiredTables(c.api, contract, [String(old.id)]);
    ok(old.removed && JSON.stringify(done.removed) === JSON.stringify(['Style guide — Inverse']) && !box.removed && !invText.removed,
      `38: confirmed, the offered table is removed, and nothing else (${JSON.stringify(done)})`);

    // (6) THE CLEANUP'S GUARDS. The run offers only what the designer can decide (edited, moved, a copy, unrecorded): a
    // table kept by the run's own guards, or one the host refused to remove, is not offered. And the confirm re-reads
    // the file: a table whose collection has left the file, or a plan that draws nothing, removes nothing.
    const withOld = async (): Promise<{ c: Awaited<ReturnType<typeof fullFile>>; old: N; box: N }> => {
      const w = await fullFile();
      await draw(w.api, contract);
      const key = keyOf(tableFrame(w.sem, 'Inverse text')!).replace(/\/text$/, '');
      const bx = new N('FRAME'); bx.name = 'Inverse'; bx.x = -9000; bx.y = -9000; w.sem.appendChild(bx);
      const o = new N('FRAME'); o.name = 'Style guide — Inverse';
      o.pluginData[KEY] = key; o.pluginData['prism3-style-guide-print'] = 'x'; o.pluginData['prism3-style-guide-mark'] = `${String(w.sem.id)}|not-this-frame`;
      bx.appendChild(o);
      return { c: w, old: o, box: bx };
    };
    // The run side: a guard or a refusal is a kept table, never an offer.
    const gNone = await fullFile();
    await draw(gNone.api, contract);
    gNone.vars.splice(0);
    const rNone = await draw(gNone.api, contract);
    ok(rNone.kept.length > 0 && rNone.kept.every((k) => k.reason === 'nothing-drawn') && (rNone.retired ?? []).length === 0,
      `38: a table kept because nothing was drawn is never offered for removal (${rNone.kept.length} kept, ${JSON.stringify(rNone.retired)})`);
    const gLib = await fullFile();
    await draw(gLib.api, contract);
    gLib.cols.splice(0); gLib.vars.splice(0);
    const rLib = await draw(gLib.api, contract);
    ok(rLib.kept.length > 0 && rLib.kept.every((k) => k.reason === 'no-collection') && (rLib.retired ?? []).length === 0,
      `38: a table kept because its collection is not in this file is never offered for removal (${rLib.kept.length} kept, ${JSON.stringify(rLib.retired)})`);
    const gRef = await fullFile();
    await draw(gRef.api, contract, { collections: ['legacy'] });
    (tableFrame(gRef.prim, 'Legacy') as unknown as { remove: undefined }).remove = undefined;
    for (let i = gRef.vars.length - 1; i >= 0; i--) if (gRef.vars[i].name.startsWith('legacy/')) gRef.vars.splice(i, 1);
    const rRef = await draw(gRef.api, contract, { collections: ['core', 'legacy'] });
    ok(rRef.kept.length === 1 && rRef.kept[0].reason === 'not-removable' && (rRef.retired ?? []).length === 0,
      `38: a table the host refused to remove is never offered for removal (${JSON.stringify(rRef.kept)}, ${JSON.stringify(rRef.retired)})`);
    // The confirm side: the same id, re-read after the file changed.
    const lost = await withOld();
    lost.c.cols.splice(lost.c.cols.findIndex((k) => k.id === keyOf(lost.old).split('|')[1]), 1);
    const rLost = await removeRetiredTables(lost.c.api, contract, [String(lost.old.id)]);
    ok(!lost.old.removed && rLost.removed.length === 0 && JSON.stringify(rLost.left) === JSON.stringify([String(lost.old.id)]),
      `38: a confirmed table whose collection has left the file is left in place, by id (${JSON.stringify(rLost)})`);
    const empty = await withOld();
    empty.c.vars.splice(0);
    const rEmpty = await removeRetiredTables(empty.c.api, contract, [String(empty.old.id)]);
    ok(!empty.old.removed && rEmpty.removed.length === 0 && JSON.stringify(rEmpty.left) === JSON.stringify([String(empty.old.id)]),
      `38: a confirmed table is left in place when the plan draws nothing, by id (${JSON.stringify(rEmpty)})`);
  }

  console.log('39. the measured file (owner decision, 2026-10-19): inverse guides moved out of a group you made into Inverse colors below it; never clipped; never overlapping');
  {
    const KEY = 'prism3-style-guide';
    const keyOf = (k: N): string => k.pluginData[KEY] ?? '';
    const measured = async () => {
      const f = await fullFile();
      await draw(f.api, contract);
      // AS #2818'S RUN LEFT THE OWNER'S PAGE: their own "Semantic colors" frame, a horizontal auto layout FIXED at a width
      // narrower than what it holds, clipping, inset 161, holding a `Guides` grid of the defaults in row 1 and each inverse
      // guide under its default in row 2. Their own "Borders" and "Fonts" frames sat just below its bottom edge before the
      // inverse row was added, so the taller group now runs over both. Prism3's own groups are gone from the page.
      const ours = groupFrame(f.sem, 'Semantic colors')!, oursInv = groupFrame(f.sem, 'Inverse colors')!;
      const grid = guidesOf(ours)!;
      const owner = new N('FRAME'); owner.name = 'Semantic colors'; owner.layoutMode = 'HORIZONTAL'; owner.primaryAxisSizingMode = 'FIXED'; owner.counterAxisSizingMode = 'AUTO';
      owner.clipsContent = true; owner.paddingLeft = 161; owner.paddingRight = 161; owner.paddingTop = 161; owner.paddingBottom = 161; owner.itemSpacing = 0;
      f.sem.appendChild(owner); owner.x = 0; owner.y = 0;
      owner.appendChild(grid);
      const oneRowH = owner.height;
      const inverses = guidesOf(oursInv)!.children.slice();
      grid.gridRowCount = 2; grid.gridColumnSizes = grid.gridColumnSizes.map(() => ({ type: 'HUG' })); grid.gridRowSizes = [{ type: 'HUG' }, { type: 'HUG' }];
      for (const v of inverses) {
        const mate = grid.children.find((d) => d.gridRow === 0 && keyOf(d) === keyOf(v).replace('/inverse', ''));
        grid.appendChildAt(v, 1, mate!.gridCol!);
      }
      owner.w = grid.width + 322 - 516;
      ours.remove(); oursInv.remove();
      const sibling = (name: string, y: number): N => {
        const n = new N('FRAME'); n.name = name; n.w = 4000; n.h = 1500; f.sem.appendChild(n); n.x = 0; n.y = y; return n;
      };
      const borders = sibling('Borders', oneRowH + 200);
      const fonts = sibling('Fonts', oneRowH + 200 + 1500 + 300);
      // A retired legacy table in its own frame to the right: left alone (its removal waits on the owner's confirm).
      const legacy = new N('FRAME'); legacy.name = 'Inverse'; legacy.w = 3000; legacy.h = 2000; f.sem.appendChild(legacy); legacy.x = owner.width + 2000; legacy.y = 0;
      const clipped = (): number => (owner.x + owner.width - 161) - (owner.x + grid.x + grid.width);
      return { f, owner, grid, inverses, borders, fonts, legacy, clipped, oneRowH };
    };
    const { f, owner, grid, inverses, borders, fonts, legacy, clipped } = await measured();
    const want = inverses.length;
    ok(want === 8 && grid.gridRowCount === 2 && clipped() < 0 && pageOverlaps(f.sem).some((o) => o.startsWith('Semantic colors')) && grid.parent === owner,
      `39: the precondition: ${want} inverse guides in the second row of a grid in a frame you made, its right column clipped by ${-clipped()}px, the frame over Borders and Fonts`);
    const [ox, oy, ow] = [owner.x, owner.y, owner.width];
    const gapBF = fonts.y - (borders.y + borders.height);
    const r = await draw(f.api, contract);
    const inv = groupFrame(f.sem, 'Inverse colors');
    // RULE 1: the inverse guides leave the owner's frame for Inverse colors, its own titled frame directly below it, each
    // in its default's column; the owner's frame keeps its title, its name and its place, and its grid closes to one row.
    const leftOf = (n: N): number => { let x = 0; for (let q: N | null = n; q && q.type !== 'PAGE'; q = q.parent) x += q.x; return x; };
    const cellLeft = (k: N): number => { const g = k.parent!; let x = leftOf(g); for (let c = 0; c < k.gridCol!; c++) x += trackW(g, c) + Number(g.gridColumnGap ?? 0); return x; };
    const offColumn = inverses.filter((v) => {
      const mate = grid.children.find((d) => keyOf(d) === keyOf(v).replace('/inverse', ''));
      return !mate || cellLeft(v) !== cellLeft(mate);
    });
    ok(!!inv && inverses.every((v) => v.parent === guidesOf(inv)) && grid.parent === owner && grid.gridRowCount === 1 && grid.children.every((d) => !/\/inverse/.test(keyOf(d)))
      && inv.children[0]?.findOne((k) => k.name === 'Title')?.characters === 'Inverse colors' && owner.name === 'Semantic colors' && owner.x === ox && owner.y === oy
      && inv.y === owner.y + owner.height + 320 && offColumn.length === 0 && JSON.stringify(r.groups?.rearranged) === JSON.stringify(['Semantic colors']),
      `39: the inverse guides move out of the frame you made into Inverse colors, 320 below it, each under its default's column; your frame keeps its title and place (${inverses.filter((v) => v.parent !== guidesOf(inv)).length} left behind; Inverse colors at ${inv?.y}, want ${owner.y + owner.height + 320}; off column: ${offColumn.map((v) => v.name).join(', ') || 'none'})`);
    // RULE 2: never clipped. The fixed frame grows to fit its grid and stays fixed; Inverse colors hugs its own.
    const invClip = inv ? (inv.x + inv.width - 160) - (leftOf(guidesOf(inv)!) + guidesOf(inv)!.width) : -1;
    ok(clipped() >= 0 && owner.width >= ow && owner.primaryAxisSizingMode === 'FIXED' && owner.counterAxisSizingMode === 'AUTO' && invClip >= 0,
      `39: never clipped: a fixed frame you made grows to fit what it holds and stays fixed, and Inverse colors fits its grid (${owner.width} wide, room ${clipped()}px; Inverse colors room ${invClip}px)`);
    // RULE 3: never overlap. Borders and Fonts move down clear of Inverse colors, in order, their gap kept; the legacy frame
    // beside the group is not moved.
    ok(pageOverlaps(f.sem).length === 0 && !!inv && borders.y === inv.y + inv.height + 320 && fonts.y - (borders.y + borders.height) === gapBF && legacy.x === ow + 2000 && legacy.y === 0,
      `39: never overlapping: the frames below move down clear of Inverse colors, in order, their gap kept, and a frame beside is left (${pageOverlaps(f.sem).join('; ') || 'no overlap'}; Borders at ${borders.y}, Inverse colors ends at ${inv ? inv.y + inv.height : '?'}; legacy ${legacy.x},${legacy.y})`);
    // A RERUN IS STABLE: nothing moves, nothing grows.
    const snap = pageFrames(f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    const r2 = await draw(f.api, contract);
    const again = pageFrames(f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    ok(again === snap && !r2.groups?.rearranged.length, `39: a rerun moves and resizes nothing (${again === snap ? 'same' : `${snap} → ${again}`})`);

    // A FRAME BESIDE, WITHIN THE GROWTH (owner question on #2827, review of 4be045f4): a frame of the owner's 100px to the
    // right of their fixed frame, at its top, which the frame's no-clip growth now reaches. It moves right by the growth,
    // keeping its 100px gap; it is never pushed down, and it never drags Inverse colors off directly below.
    const m = await measured();
    const note = new N('FRAME'); note.name = 'RightNote'; note.w = 2000; note.h = 800; m.f.sem.appendChild(note);
    note.x = m.owner.x + m.owner.width + 100; note.y = 0;
    m.legacy.x = note.x + note.width + 2000;
    const [nw0, lx0] = [m.owner.width, m.legacy.x];
    await draw(m.f.api, contract);
    const mInv = groupFrame(m.f.sem, 'Inverse colors');
    const grew = m.owner.width - nw0;
    ok(grew > 0 && note.y === 0 && note.x === m.owner.x + m.owner.width + 100 && m.legacy.x === lx0 + grew && m.legacy.y === 0
      && !!mInv && mInv.y === m.owner.y + m.owner.height + 320 && pageOverlaps(m.f.sem).length === 0,
      `39: a frame beside that the growth reaches moves right by it, keeping its gap, and Inverse colors stays directly below (grew ${grew}; RightNote at ${note.x},${note.y}, want ${m.owner.x + m.owner.width + 100},0; Inverse colors at ${mInv?.y}, want ${m.owner.y + m.owner.height + 320}; ${pageOverlaps(m.f.sem).join('; ') || 'no overlap'})`);
    const mSnap = pageFrames(m.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    await draw(m.f.api, contract);
    const mAgain = pageFrames(m.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    ok(mAgain === mSnap, `39: with a frame beside, a rerun moves and resizes nothing (${mAgain === mSnap ? 'same' : `${mSnap} → ${mAgain}`})`);

    // A FRAME BELOW, WITHIN A HEIGHT GROWTH: the owner's frame FIXED in height too, shorter than its one-row grid, with a
    // caption of theirs 100 under it. The frame grows to fit and pushes the caption down; Inverse colors, placed under the
    // frame, is never swept along with the caption, so it stays directly below and a rerun moves nothing.
    const h = await measured();
    const hh = h.oneRowH - 1000;
    h.owner.counterAxisSizingMode = 'FIXED'; h.owner.h = hh;
    const cap = new N('FRAME'); cap.name = 'Caption'; cap.w = 2000; cap.h = 200; h.f.sem.appendChild(cap); cap.x = 0; cap.y = hh + 100;
    await draw(h.f.api, contract);
    const hInv = groupFrame(h.f.sem, 'Inverse colors');
    ok(h.owner.height > hh && !!hInv && hInv.y === h.owner.y + h.owner.height + 320 && cap.y >= h.owner.y + h.owner.height && pageOverlaps(h.f.sem).length === 0,
      `39: a frame below that a height growth reaches moves down, and Inverse colors stays directly below, never pushed with it (frame ${hh} → ${h.owner.height} tall; Caption at ${cap.y}; Inverse colors at ${hInv?.y}, want ${h.owner.y + h.owner.height + 320}; ${pageOverlaps(h.f.sem).join('; ') || 'no overlap'})`);
    const hSnap = pageFrames(h.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    await draw(h.f.api, contract);
    const hAgain = pageFrames(h.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    ok(hAgain === hSnap, `39: with a frame below the growth, a rerun moves and resizes nothing (${hAgain === hSnap ? 'same' : `${hSnap} → ${hAgain}`})`);
  }

  console.log('40. a group you made that wraps (#2856): its width is its widest row, never the one-row sum; a frame the one-row sum widened is put back');
  {
    // AS THE OWNER'S PAGE IS BUILT (#2856): their "Semantic colors" frame is a HORIZONTAL auto layout with wrap on, FIXED
    // wide, hugging its height, padding 240, 48 between items and 96 between rows. Their own `_section-header` sits on
    // the first row and the `Guides` grid wraps below it; the grid is wider than the frame's inside, so it clipped.
    const PAD = 240, GAP = 48, ROWGAP = 96;
    const wrapped = async (width: (headerW: number, gridW: number) => number, fixedHeight?: number) => {
      const f = await fullFile();
      await draw(f.api, contract);
      const ours = groupFrame(f.sem, 'Semantic colors')!;
      const grid = guidesOf(ours)!;
      const owner = new N('FRAME'); owner.name = 'Semantic colors'; owner.layoutMode = 'HORIZONTAL'; owner.layoutWrap = 'WRAP';
      owner.primaryAxisSizingMode = 'FIXED'; owner.counterAxisSizingMode = 'AUTO'; owner.clipsContent = true;
      owner.paddingLeft = PAD; owner.paddingRight = PAD; owner.paddingTop = PAD; owner.paddingBottom = PAD; owner.itemSpacing = GAP; owner.counterAxisSpacing = ROWGAP;
      f.sem.appendChild(owner); owner.x = 0; owner.y = 0;
      const header = new N('FRAME'); header.name = '_section-header'; header.w = grid.width - 838; header.h = 300;
      owner.appendChild(header); owner.appendChild(grid);
      ours.remove();
      owner.w = width(header.width, grid.width);
      if (fixedHeight !== undefined) { owner.counterAxisSizingMode = 'FIXED'; owner.h = fixedHeight; }
      return { f, owner, header, grid };
    };
    // EXPECTED FROM THE LAYOUT RULE, never from `fitToContent`: a wrapped row needs its widest child and its padding;
    // the header and the grid cannot share a row (header + 48 + grid passes it), so the grid wraps to the left padding.
    const rule = (m: { header: N; grid: N }): number => PAD + Math.max(m.header.width, m.grid.width) + PAD;
    const oneRow = (m: { header: N; grid: N }): number => PAD + m.header.width + GAP + m.grid.width + PAD;
    const shape = (m: { owner: N; header: N; grid: N }): string => `${m.owner.width}×${m.owner.height} header ${m.header.x},row ${m.header.x === PAD ? 1 : '?'} grid x ${m.grid.x}`;

    // 1. The clipping frame, narrower than its grid, grows to its widest row and no further.
    const a = await wrapped((hw) => PAD + hw + 100 + PAD);
    const aw0 = a.owner.width;
    ok(aw0 - 2 * PAD < a.grid.width && a.grid.x === PAD && a.header.x === PAD,
      `40: the precondition: the grid (${a.grid.width}) is wider than the frame's inside (${aw0 - 2 * PAD}) and wraps below the header`);
    await draw(a.f.api, contract);
    const aWant = rule(a);
    ok(a.owner.width === aWant && a.owner.width < oneRow(a) && a.grid.x === PAD && a.header.x === PAD && a.owner.layoutWrap === 'WRAP' && a.owner.primaryAxisSizingMode === 'FIXED',
      `40: a wrapped frame you made grows to its widest row, the grid kept on its own row below the header (${a.owner.width} wide, want ${aWant}; the one-row sum would be ${oneRow(a)}; ${shape(a)})`);
    const aH = PAD + a.header.height + ROWGAP + a.grid.height + PAD;
    ok(a.owner.height === aH && pageOverlaps(a.f.sem).length === 0,
      `40: its height is its two rows, ${ROWGAP} apart, and nothing on the page overlaps (${a.owner.height} tall, want ${aH}; ${pageOverlaps(a.f.sem).join('; ') || 'no overlap'})`);
    const aSnap = pageFrames(a.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    await draw(a.f.api, contract);
    const aAgain = pageFrames(a.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    ok(aAgain === aSnap, `40: a wrapped frame: a rerun moves and resizes nothing (${aAgain === aSnap ? 'same' : `${aSnap} → ${aAgain}`})`);

    // 2. A frame #2827's run already widened to the one-row sum is put back to its widest row, the grid wrapping again.
    const b = await wrapped((hw, gw) => PAD + hw + GAP + gw + PAD);
    ok(b.grid.x === PAD + b.header.width + GAP, `40: the precondition: widened to the one-row sum, the grid sits beside the header (grid x ${b.grid.x})`);
    await draw(b.f.api, contract);
    ok(b.owner.width === rule(b) && b.grid.x === PAD && b.owner.primaryAxisSizingMode === 'FIXED',
      `40: a wrapped frame the one-row sum widened is put back to its widest row, the grid below the header again (${b.owner.width} wide, want ${rule(b)}; ${shape(b)})`);
    const bSnap = pageFrames(b.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    await draw(b.f.api, contract);
    const bAgain = pageFrames(b.f.sem).map((n) => `${n.name} ${n.x},${n.y} ${n.width}×${n.height}`).join('; ');
    ok(bAgain === bSnap, `40: once put back, a rerun moves and resizes nothing (${bAgain === bSnap ? 'same' : `${bSnap} → ${bAgain}`})`);

    // 3. A width of the owner's own, wider than its rows need but not the one-row sum, is kept: never made smaller.
    const c = await wrapped((hw, gw) => PAD + hw + GAP + gw + PAD + 1000);
    const cw0 = c.owner.width;
    await draw(c.f.api, contract);
    ok(c.owner.width === cw0, `40: a wrapped frame you made wider than its rows need is never made smaller (${cw0} → ${c.owner.width})`);

    // 4. A FIXED height shorter than the two rows clips the second: it grows to the rows' height (the only case the
    //    wrapped-height arithmetic decides; a hugging frame's height is the shim's own). Typed here, not read off the code.
    const d = await wrapped((hw) => PAD + hw + 100 + PAD, 500);
    const dH = PAD + d.header.height + ROWGAP + d.grid.height + PAD;
    ok(d.owner.height === 500 && d.owner.height < dH, `40: the precondition: a fixed height (${d.owner.height}) shorter than the two rows (${dH})`);
    await draw(d.f.api, contract);
    ok(d.owner.height === dH && d.owner.counterAxisSizingMode === 'FIXED',
      `40: a wrapped frame with a fixed height grows to its two rows, ${ROWGAP} apart, and stays fixed (${d.owner.height} tall, want ${dH})`);
    const e = await wrapped((hw) => PAD + hw + 100 + PAD, dH + 700);
    await draw(e.f.api, contract);
    ok(e.owner.height === dH + 700, `40: a wrapped frame taller than its rows is never made shorter (${dH + 700} → ${e.owner.height})`);
  }

  if (failures) { console.error(`\n${failures} style-guide check(s) failed`); process.exit(1); }
  console.log('\nstyle guide: all checks pass');
};

void main();
