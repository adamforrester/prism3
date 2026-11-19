## (2026-11-18) — At the narrow tier, search's no-match status takes its own line under the field (#3620)

**Status:** studio/plugin chrome, `chrome.css` only, plus `test:chrome` section `3553-m1` extended to the plugin's 380. No
engine change, so no change note; CONTRACT and `EXECUTOR_REVISION` unchanged.

### What changed

- **Owner decision on #3620 (2026-11-18, A):** at the narrow tier the search status wraps or moves under the field and
  is never cut off. Built as "moves under": at `data-w="narrow"` the open search box wraps, and the status takes its own
  full-width line under the field (`order: 1; flex: 1 0 100%; white-space: normal`), so the field keeps the row's width.
  The status still wraps on that line if the window is narrower than it.
- The magnifier was absolutely positioned with no `top`, so a two-line box would have centered it between the lines. At
  the narrow tier it is now placed on the field's line (half of `--p3-ctl-h-sm`).
- Every status moves the same way at the narrow tier, not only "No setting on this page matches". Leaving a match count
  in the row and moving only the no-match line would make the field jump width as the query changes.
- The wide tier is unchanged.

### Measured

- Before, at the plugin's 380 on all seven places, both themes: the field showed 17.0px of text and the typed query
  scrolled ("zq" of "zqxj"), with the status in the row. After: the field clears M1's 80px floor and the query is
  whole. The status's top sits under the field's bottom, and its text is inside its own box and the tab row.

### The arm, and its mutations (section `3553-m1`)

- M1's field floor, applied only at the wide tier until now with a comment pointing here, now holds at every width.
  New `#3620` arms: the status drawn whole (its text range inside its box, no scroll overflow, inside the tab row) at
  every width; at the narrow tier, the status under the field and the magnifier centered on the field (±1px).
- **Mutations, each failing by name:**
  - main's CSS fails 28 of 448: the field floor and the under-the-field arm, on all seven places, both themes.
  - an ellipsized status (option B's shape) fails `… is drawn whole`.
  - the magnifier's narrow `top` rule dropped fails `… stays centered on the field's line (glyph 114.0, field 103.0)`.
