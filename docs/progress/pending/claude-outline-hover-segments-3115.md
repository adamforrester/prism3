## (2026-10-28) — Interactive: the Outline hover chips keep their rows whatever is picked (#3115)

**Status:** studio/plugin UI fix (one shared implementation) + a `test:chrome` section (`3115`, shard 1). No engine
change, so no change note: no committed artifact, emission or component surface moves. CONTRACT unchanged. No wording
changes: where Outline hover lives and how it reads is the owner's, held on #3116.

### What changed

- **The bug:** on Color › Interactive, picking "Neutral overlay wash" dropped "No hover fill" to a second row. The
  selected chip of a `.p3-choice` is bold, and since #1975 a chip is never narrower than its label
  (`min-width: fit-content`), so the selected chip grew by the bold label's extra width (192px against 188px for
  "Neutral overlay wash"). Where the four chips only just fit on one row, those few pixels moved the wrap. "Solid fill"
  (#3105's fourth option) does the same. The fourth option is the trigger only because four chips need about 575px,
  which puts the one-row edge inside ordinary window widths (about 1627 to 1631px in the headless browser's fonts).
- **The fix:** every option of a `.p3-choice` reserves its label's bold width. `choice()` and the style guide's `seg()`
  write the label to `data-label`, and `chrome.css` draws it again as `::after`, bold, hidden, with no height and
  empty alternative text, under the label in a column. The selection then never changes any chip's width. This covers
  every `choice` in the chrome, not only Outline hover. Renders at 1280 and 380 are pixel-identical to `main` on both
  hosts. The only layout that moves is at the edge, where the four now take two rows whatever is picked, instead of
  one or two depending on the pick.
- **The fallback is unchanged:** where four don't fit (1280: two rows of two; 380: one, two, one), the chips wrap, as
  every `choice` has since #1975. That is the chrome's fallback for a choice too wide for its column. Switching to a
  select by width would be a new control behavior, and it belongs with #3116's rethink.

### The arm and its mutations

- `test:chrome` section `3115`: on both hosts, at 1280, at 380, and at the chips' own tightest one-row width, each of
  the four options is picked in turn and the chips' rows (distinct tops) are read. The rows must not change with the
  pick. The tightest width holds the group at its `max-content` width, read with "No hover fill" picked, so the edge
  does not hang on a font's metrics. A fixed window cannot catch this: the band where `main` breaks is about 4px wide.
  The arm also checks each radio is named by its label once, because the reserved copy is generated content.
- On the unfixed rule (the `::after` content removed), it fails by name:
  `#3115 web tightest: the Outline hover chips keep their rows whatever is picked — none 1, overlay-neutral 2,
  solid-tint 1, opaque-fill 2`, and the same on figma. At 1280 and 380 alone it passes on `main` too, because the
  chips wrap there whatever is picked.
- With the copy visible and no empty alternative text, it fails by name:
  `#3115 web 1280: each option is named by its label once (… radio "Neutral overlay wash Neutral overlay wash" …)`, on
  every host and width.
