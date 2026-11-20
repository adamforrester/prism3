## (2026-11-18) — A pressed Personality word draws no check, so pressing one keeps its width (#3263)

**Status:** studio/plugin chrome + `test:chrome` section `3263`. No engine change, so no change note; CONTRACT and
`EXECUTOR_REVISION` unchanged.

### What changed

- **Owner decision on #3263 (2026-11-18, A):** a Personality chip (`toggleChip`, `apps/studio/src/ui/lever-kit.ts`) no
  longer appends the check glyph. A pressed word shows its state through its edge (`--p3-ctl-edge`) and, under forced
  colors, the `Highlight` fill, as the single-select `chipChoice` chips have since #3117 (Q3117.1 B).
- No chip draws a glyph now, so the two `.p3-btn.p3-chip … > .p3-ico` rules in `chrome.css` (hide it unpressed, show it
  pressed) are removed rather than left to match nothing.
- **Not changed:** whether Personality takes several words or one. That is a separate owner question, raised the same
  day and held. Section 3263 presses several words only because the chips allow it today.

### The bug, now measured (it was inferred from the CSS when filed)

- Before, a pressed chip was 20px wider: energetic 80 → 100px, calm 54 → 74px, and so on for every word. At 380px the
  row reads 3 rows with no word pressed and 4 once a second word is pressed, so pressing a word did move the last word
  onto a new row. At 1280, with the row held at its `max-content` width (653px), the first press wraps it.

### The arm

- `test:chrome` section `3263` (shard 3, after `3117`): both hosts, both chrome themes, at 1280 (the row held at its
  `max-content` width, the #3115 shape) and at 380 (the row at its real narrow width). Every word is pressed in turn and
  kept pressed; after each press, each chip's width and the row count are read against the unpressed read. Then the
  cue, as rendered: the pressed edge at least 3:1 against the unpressed edge, the label ink the same on both, and the
  `Highlight` fill under CDP's `forced-colors: active`.
- Section 39's forced-colors arm read "a pressed chip's check draws in HighlightText"; it now asserts no check on a
  pressed or unpressed chip, tagged `#3263`.
- **Mutations:** main's code restored (glyph and its two rules) fails 24 of 72 by name, every host, theme and width
  (the width, row and no-check arms), plus section 39's. The glyph line alone restored fails 8 of 72, the no-check arm
  only: with the rules gone the glyph draws on every chip, so the widths hold. Both are written up in the section's
  header.
