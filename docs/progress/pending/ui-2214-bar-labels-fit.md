## (2026-10-06) — Top bar: above the narrow tier the bar gives way in order, by a measured fit, never an arbitrary wrap (#2214)

**STATUS: branch `ui/2214-bar-labels-fit`; held for the owner's screenshot review.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged, no new strings. Owner decisions N2 A, then BL1 A+B, BL2 A and BL3 A (2026-10-06, recorded on #2214).

### Diagnosis

Between 561px and about 1000px the plugin's bar wrapped to two rows wherever the flex row happened to break, because the tile labels dropped only at the narrow tier (≤560). The issue's first fix, dropping the labels when the full bar would not fit, was built and measured first, and it was not enough. Hiding every label saves only about 122px, so with "prism3" the bar still wrapped up to about 900px, and with a long brand name up to about 1050px. The owner then set the order things give way in.

Measured in the built plugin, each item kept from shrinking. The window needs the row width plus the bar's 56px of padding:

| Bar state | "prism3" row | One row from | `northwind-outdoor-supply-co` row | One row from |
|---|---|---|---|---|
| Everything shown | 967 | 1023px | 1116 | 1172px |
| Tile labels hidden | 845 | 901px | 994 | 1050px |
| Labels and the product name hidden (logo kept) | 732 | 788px | 881 | 937px |

On the web, "prism3" fits at 640 with everything shown. `northwind-outdoor-supply-co` needs 706 at 640 (584 of room), 601 without labels, and 488 without the name.

### What changed

- **`apps/studio/src/shell/frame.ts`, `fitBar`, on the frame's existing ResizeObserver, on both hosts (BL2 A).** Above the narrow tier the bar is one row whenever it fits. When the full bar would not fit, these give way in order (BL1 A+B), and the frame's `data-bar-fit` names the step:
  1. `glyphs`: every tile label together (BL3 A). The tiles keep their glyphs, tooltips and names. Apply Theme keeps its text.
  2. `logo`: the product name beside the logo too. The logo stays, as at the narrow tier.
  3. `rows`: the narrow tier's two rows, with Pages, Figma and Apply Theme on the second and Apply Theme at the right. This step applies only where the bar has that file row, which is the plugin.
- **No flapping.** Every step's width comes from one measurement of the full bar with everything shown (the labels and the name are subtracted, never hidden to measure). It is taken once per content change (a mutation in the bar's controls, a font load, a change of tier) and reused while only the width moves. A breakpoint would not hold, because a longer brand name needs each step sooner.
- **`apps/studio/src/chrome.css`.** No forked rules. The narrow tier's own rules for `.p3-tile-label`, `.p3-mark-name`, `.p3-bar-break` and `.p3-bar-spacer2` now also match their step (`:is([data-w="narrow"], [data-bar-fit…])`), with the same specificity and the same order. The narrow tier at 560 and below is unchanged.

### Gates

`test:chrome` **section 29c**, both hosts, both themes, at 1280, 1000, 800 and 640, with "prism3" and with `northwind-outdoor-supply-co`:
- The expected step comes from `FIT_ORACLE`. It lays each candidate row out for real under the test's own forcing stylesheet (no wrap, no shrink, no spacer, the controls box sized to its content), reads its `scrollWidth`, and compares it with the controls box's width. It never reads `data-bar-fit` or the frame's arithmetic. The frame subtracts from one measurement, and the test lays each row out, so neither side is derived from the other (docs/34 shape 2). Within 1px of the room, both neighboring steps are accepted.
- The drawn step comes from `FIT_SEEN`, classified from the render alone: which labels and name show, the rows, every tile at one top, and the controls box one control tall. For `rows`, the second row is exactly Pages, Figma and Apply Theme, with Apply Theme at the right edge. Anything else is reported as `other`.
- Accessible names: the computed name (CDP `Accessibility.getPartialAXTree`) of the mark and of every bar control, unchanged at every width from the same brand's 1280, where the full bar shows.
- The long name gives way sooner: further along than "prism3" at some width, and never behind it.

The existing checks follow the fit and keep their own expectations otherwise: §1's product-mark name, §29's tile labels and T7's Agent label each read `FIT_ORACLE` above the narrow tier.

Mutations, each applied to a committed tree (diff confirmed), rebuilt, and run against section 29c, which was 114/114 unmutated:
- **(a) No label drop** (`[data-bar-fit]` taken out of the label rule): 16 failures. Example: `✗ 29c figma light 1000 prism3: the bar is one row (glyphs), as measured: full 967, without labels 845, without the name 732, in 944 (drawn {"step":"other","labels":5,…,"rows":["product-mark … figma-open","apply-to-figma"]…})`.
- **(b) The product name never drops:** 14 failures. Example: `✗ 29c figma light 800 prism3: the bar is one row (logo), as measured: … in 744 (drawn {"step":"other","labels":0,"of":5,"name":true,…})`.
- **(c) Straight to the two rows:** 7 failures. Example: `✗ 29c figma light 1000 prism3: the bar is one row (glyphs), as measured: … (drawn {"step":"rows",…})`.
- **(d) The measurement ignores the brand switcher's width:** 12 failures. Example: `✗ 29c web light 640 northwind-outdoor-supply-co: the bar is one row (logo), as measured: full 706, without labels 601, without the name 488, in 584 (drawn {"step":"other",…,"rows":["product-mark brand-switcher verdict theme-toggle","activity-open export-open"]…})`.
- **(e) The web excluded:** 3 failures. The two `29c web light/dark 640 northwind-outdoor-supply-co` arms, and `✗ 29c web: the long name gives way sooner than "prism3" (… behind at 640 …)`.

### Traps

- **The web has no third step.** It has no file row, so if a name were long enough that even the logo-only row did not fit above 560px, its bar would still wrap. No tested name reaches that.
- **Measuring a hidden row flaps.** Measuring the row as drawn (labels hidden) says "it fits", which shows the labels, which says "it does not". Every step is derived from the full row instead, and the cache is cleared only by a content change or a change of tier.
- **The oracle's forcing has to size the controls box to its content.** A nowrap row inside a flex box that can shrink reads `scrollWidth === clientWidth` when it fits, and that is ambiguous at the 1px edge. `width: max-content` with `flex: none` reads the row itself.
