## (2026-11-19) — Studio markup from the overnight audit: field hints in the chrome's ink, Export's settings as radio groups, preview tables a keyboard can scroll (#4220, #4221, #4223, #4224)

Four findings from the #4104 audit with one root: the markup says something other than what is drawn. A text field's hint was drawn in the browser's gray, not the chrome's. Export's choices were toggle buttons, so "Off" read as pressed. A table wider than its card offered a keyboard no way in. A layout-only cell was a header with no name. One new `test:chrome` section, `markup-audit` (shard 2), runs on both hosts in both themes at 1280. Every arm fails by name on the merge base and passes here.

### What changed

- **#4220.** `.p3-text-input::placeholder` takes `--p3-text-2`, as the textarea, search and paste fields already did. Before, the hint was Chromium's `rgb(117,117,117)` in both themes, 4.22:1 in dark. The arm reads the drawn `::placeholder` of every visible chrome text field with a hint and holds it to 4.5:1 on its own ground and to the token's color. A value gate can't see a rule that doesn't exist.
- **#4221.** Each Export setting is a `radiogroup` named by its label (`aria-labelledby`), with `role="radio"` and `aria-checked` options and one Tab stop. Arrow keys move the selection, and focus follows it after the page redraws, as the artifact tabs' keys do. The hooks, classes and look are unchanged, because the chrome already styles `[aria-checked="true"]` like `[aria-pressed="true"]`. Tab now walks the five settings in five stops, not ten.
- **#4223, the tables.** Every `.mtbl-scroll` comes from one helper, `scrollBox(name)` in `preview/sections/kit.ts`, and is a Tab stop and a `group` named by its table's title (a group, not a `region`: the held D5 Q197 allows no named landmark but `main`, and section `2232`'s arm holds it), and draws the chrome's focus ring (`chrome.css`). That covers Type's four builders and Shape's `shapeTable`, which now takes its name from each caller. The arm reads both pages: Type's tables, and each of Shape's four sections grouped by section, so a `shapeTable` that loses its wrapper fails by name (review S1).
- **Two gates read the old markup.** `test-export-parity.mjs` found the metadata option by its `aria-label` ("Include build metadata: Off") and read `aria-pressed`. A radio needs no per-option name, so it now finds the row by its label and the option by its word, and reads `aria-checked`.
- **#4224.** The stretch column's cells in Weights and Italic and link styles are `<td aria-hidden="true">`, never `<th>`, so no header has an empty name.

### Not in this PR: the preview body (#4223's other half)

`.p3-preview-body` is still not a Tab stop. Chromium and Firefox already make it one when it scrolls and holds nothing focusable, so only Safari lacks it. A `tabindex="0"` there would add a stop on every page in every browser, including pages whose preview holds controls. The issue's other option, making the body stop being the scroller, is a layout change. #4223 stays open for that half.

### A trap in the ring arm

The first version of the ring check accepted any outline that wasn't `none`. Chromium draws its own `auto` outline on a focused scroller, so the arm stayed green with the new ring rule removed. It now wants `solid`, in the `--p3-focus-ring` color resolved on a probe, and it fails by name without the rule. It also has to reach the wrapper by keyboard (Shift+Tab, then Tab), because `focus()` from script doesn't always set `:focus-visible`.

The ring rule sits in `chrome.css`, beside the chrome's other rings, not in `styles.css`. A new `styles.css` rule is unprotected by `lint-live-css` until its `--accept`, and that re-sweeps every browser suite. Editing the existing `:is(…):focus-visible` list would have changed that rule's key, which reads as a removal.
