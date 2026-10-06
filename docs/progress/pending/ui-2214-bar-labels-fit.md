## (2026-10-06) — Top bar: above the narrow tier the bar gives way in order, by a measured fit, never an arbitrary wrap (#2214)

**STATUS: branch `ui/2214-bar-labels-fit`, PR #2257.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged, no new strings. Owner decisions N2 A, then BL1 A+B, BL2 A and BL3 A (2026-10-06, on #2214), then Q83 A (2026-10-06, on #2257, after the review lane's sweep). The owner approved the screenshots for the first round at `e862a560`.

### Diagnosis

Between 561px and about 1000px the plugin's bar wrapped to two rows wherever the flex row happened to break, because the tile labels dropped only at the narrow tier (560px and below).

The issue's first fix, dropping the labels when the full bar would not fit, was built and measured first, and it was not enough. Hiding every label saves only about 122px, so with "prism3" the bar still wrapped up to about 900px, and with a long brand name up to about 1050px. The owner then set the order in which things give way.

Measured in the built plugin, with each item kept from shrinking. The window needs the row width plus the bar's 56px of padding:

| Bar state | "prism3" row | One row from | `northwind-outdoor-supply-co` row | One row from |
|---|---|---|---|---|
| Everything shown | 967 | 1023px | 1116 | 1172px |
| Tile labels hidden | 845 | 901px | 994 | 1050px |
| Labels and the product name hidden (logo kept) | 732 | 788px | 881 | 937px |
| The two rows' first row | 381 | — | 530 | 586px |

On the web, "prism3" fits at 640 with everything shown. At 640 (584px of room), `northwind-outdoor-supply-co` needs 706px with everything shown, 601 without labels and 488 without the name.

**The review round (Lane D, #2257).** Lane D swept 380–1280 in 10px steps and found that the long name still wrapped arbitrarily on the plugin. Below about 586px even the two rows' first row did not fit, so Export fell onto a third row of its own. The section checked only 1280, 1000, 800 and 640, so it could not see this. The owner decided Q83 A: one more step.

### What changed

- **`apps/studio/src/shell/frame.ts`, `fitBar`, on the frame's existing ResizeObserver, on both hosts (BL2 A).** Above the narrow tier the bar is one row whenever it fits. When the full bar would not fit, these give way in order, and the frame's `data-bar-fit` names the step:
  1. `glyphs`: every tile label drops together (BL3 A). The tiles keep their glyphs, tooltips and names, and Apply Theme keeps its text.
  2. `logo`: the product name beside the logo drops too. The logo stays, as at the narrow tier.
  3. `rows`: the narrow tier's two rows, with Pages, Figma and Apply Theme on the second and Apply Theme at the right. This step applies only where the bar has that file row, which is the plugin.
  4. `trim` (Q83 A): the brand switcher's name is cut short with an ellipsis, so the first row still holds. The full name stays the switcher's accessible name (its text) and its tooltip (`title`, set only while the name is cut). Nothing else moves, and Export stays on row 1.
- **No flapping.** Every step's width comes from one measurement of the full bar with everything shown (the labels and the name are subtracted, never hidden to measure). It is taken once per content change (a mutation in the bar's controls, a font load, a change of tier) and reused while only the width moves.
- **`apps/studio/src/chrome.css`.** No forked rules. The narrow tier's own rules for `.p3-tile-label`, `.p3-mark-name`, `.p3-bar-break` and `.p3-bar-spacer2` now also match their step (`:is([data-w="narrow"], [data-bar-fit…])`), with the same specificity and order. The `trim` step adds two rules: the brand switcher's wrap takes what is left of the first row (`flex: 1 1 0`, so the ellipsis `.p3-brand-name` already draws takes over), and the spacer before Theme gives up its share. The narrow tier at 560px and below is unchanged.
- **The web and `trim`.** The web has no file row, so after `logo` it goes straight to `trim`. No tested name reaches that on the web (the sweep draws the cut name in 0 web states), so the web looks the same as at the approved screenshots.

### Gates

`test:chrome` **section 29d**. It is not 29c: main's section 29c is the export dialog's.
- **Coverage:** both hosts and both themes, swept from 1280 down to 380. The long name is swept every 10px. "prism3" is swept every 30px, plus 640, 800, 1000 and 1280. The coarser grid for the short name keeps the section near a minute (496 bar states).
- **Expected step:** `FIT_ORACLE` lays each candidate row out for real under the test's own forcing stylesheet (no wrap, no shrink, no spacer, the controls box sized to its content), reads its `scrollWidth`, and compares it with the controls box's width.
  - The candidates are the full row, the row without labels, the row without the name, and the two rows' first row (the controls before the row break, the rest taken out). Past the last one that fits comes `trim`.
  - It never reads `data-bar-fit` or the frame's arithmetic. The frame subtracts from one measurement, and the test lays each row out, so neither side is derived from the other (docs/34 shape 2).
  - Within 1px of the room, both neighboring steps are accepted.
- **Drawn step:** `FIT_SEEN` classifies the bar from the render alone: which labels and name show, whether the brand name is cut (its text wider than its box), the rows, every tile at one top, and the controls box one control tall.
  - Above the narrow tier, every width must draw the expected step in no more rows than it allows: 1 for full, glyphs and logo; 2 for rows and the plugin's trim; 1 for the web's trim.
  - The tooltip appears only while the name is cut.
- **Accessible names:** the computed name (CDP `Accessibility.getPartialAXTree`) of the mark and of every bar control must equal the same brand's name at 1280 at every width, the narrow tier included. While the name is cut, the switcher's computed name and its `title` are the full name, and Export is on row 1.
- **Long name:** it gives way sooner than "prism3" and is never behind it, and on the plugin it reaches `trim`.

The existing checks follow the fit and keep their own expectations otherwise: §1's product-mark name, §29's tile labels and T7's Agent label each read `FIT_ORACLE` above the narrow tier.

Mutations, each made after a `wip:` commit, applied with its diff confirmed, rebuilt, run against section 29d (51/51 unmutated), and restored:
- **(a) No label drop** (`[data-bar-fit]` taken out of the label rule): 11 failures. Example: `✗ 29d figma light prism3: across 33 widths the bar draws the measured step, in no more rows than it allows (1010: want glyphs (full 967, without labels 845, without the name 732, first of two rows 381, in 954), drew other in 2 row(s) [… "apply-to-figma"] | …)`.
- **(b) The product name never drops:** 9 failures. Example: `✗ 29d figma light prism3: … (890: want logo (… in 834), drew other in 2 row(s) …)`.
- **(c) Straight from the full bar to the two rows:** 8 failures. Example: `✗ 29d figma light prism3: … (1010: want glyphs (…), drew rows in 2 row(s) …)`.
- **(d) The measurement ignores the brand switcher's width:** 11 failures. Example: `✗ 29d figma light prism3: … (1010: want glyphs (…), drew other in 2 row(s) …)`.
- **(e) The web excluded:** 5 failures. Example: `✗ 29d web light prism3: … (590: want glyphs (full 557, without labels 452, without the name 339, in 534), drew other in 2 row(s) ["product-mark brand-switcher verdict theme-toggle activity-open","export-open"])`.
- **(f) No truncation** (the `trim` rule on the brand switcher's wrap removed): 3 failures, and the three-row wrap comes back. `✗ 29d figma light northwind-outdoor-supply-co: … (580: want trim (full 1116, without labels 994, without the name 881, first of two rows 530, in 524), drew other in 3 row(s) ["product-mark brand-switcher verdict theme-toggle agent-toggle activity-open","export-open","pages-menu figma-open apply-to-figma"] | …)`, the same for dark, and `✗ 29d figma: the long name reaches the cut-name step somewhere in the sweep (0 state(s))`. 43 assertions ran, not 51, because the eight cut-name assertions (4 states × 2) run only where a name is cut.

### Traps

- **The narrow tier is not covered.** Below 561px a long name still wraps arbitrarily: on the plugin at 460px and below (Export, then Activity and Agent, break onto a third row), and on the web at about 430px and below. This predates #2214, and the narrow tier is unchanged here. Filed as #2262 for an owner decision.
- **The first round's "No tested name reaches that width" was wrong.** 29c's own long name reached it on the plugin at 570–590px. It was checked at four widths only, so it could not see that. The sweep is what holds it now, and it is the reason Q83 A exists.
- **Measuring a hidden row flaps.** Measuring the row as drawn (labels hidden) says "it fits", which shows the labels, which says "it does not". Every step is derived from the full row instead, and the cache is cleared only by a content change or a change of tier.
- **A wrapping flex row breaks before it shrinks.** The brand switcher's `min-width: 0` alone never cuts the name: the line breaks first. `trim` gives its wrap `flex: 1 1 0`, so its own size asks for nothing and it takes only what is left.
- **The oracle's forcing has to size the controls box to its content.** A nowrap row in a flex box that can shrink reads `scrollWidth === clientWidth` when it fits, which is ambiguous at the 1px edge. `width: max-content` with `flex: none` reads the row itself.
