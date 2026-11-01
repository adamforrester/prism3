## (2026-11-01) — chipChoice: the pressed chip draws no check, so a pick keeps its width (#3117)

**Status:** studio/plugin chrome + `test:chrome` section `3117`. No engine change, so no change note; CONTRACT and
`EXECUTOR_REVISION` unchanged.

### What changed

- **Owner decision Q3117.1 B (2026-11-01, on #3117):** a `chipChoice` chip (`apps/studio/src/ui/lever-kit.ts`) no longer
  appends the check glyph. The pressed chip shows its state by its edge (`--p3-ctl-edge`) alone, as the segmented
  `choice()` does, so every chip keeps today's unpressed width and a pick never moves the row's wrap. Before, the pressed
  chip drew a 16px check plus its 4px gap: the Type page's italics chips read 68 / 109 / 80px unpressed and 88 / 129 /
  100px pressed.
- The CSS is untouched apart from a comment: `.p3-btn.p3-chip > .p3-ico` and its pressed rule still serve `toggleChip`
  (Personality's multi-select words), which keeps its check. That chip has the same width shift; it is outside this
  decision and filed as #3263.

### The two checks the decision owed, measured as rendered (section 3117, both hosts, both chrome themes)

- **Contrast.** The pressed chip's edge against an unpressed chip's edge: `#0d0d0e` on `#808284`, **5.03:1** in light;
  `#f7f7f7` on `#67696b`, **5.14:1** in dark, over the 3:1 floor for a state cue (WCAG 1.4.11). The pressed edge on the
  levers panel is 18.13:1 (light) and 16.72:1 (dark), the declared `ctl-edge` pairs `lint:contrast` already holds. The
  label ink is the same `--p3-text` pressed and unpressed, so the edge is the cue, and the arm says so.
- **Forced colors.** `.p3-btn.p3-chip[aria-pressed="true"]` is already in the forced-colors selection rules (the
  `Highlight` fill, `HighlightText` ink, the opt-out), and they never relied on the glyph. Under CDP's
  `forced-colors: active` the pressed italics chip computes the `Highlight` fill and its neighbor does not.

### The arm, and the trap in it

- `test:chrome` section `3117` (shard 3, after `30b`): the #3115 shape. The body row's group is held at its
  `max-content` width, read under the first pick; each option is pressed in turn, and the row count and each chip's
  width are read after every pick. Then the two checks above.
- **Mutation, the glyph restored:** fails 8 of 28 by name, the width arm (`upright 88/68/68, both 109/129/109, only
  80/80/100`) and the no-check arm, on every host and theme, plus section 30b's `draws no check on any chip`.
- **The row count does not catch it, and cannot.** Exactly one chip is always pressed, so the glyph adds the same 20px
  to the group whichever is picked, and the held `max-content` row still fits. The per-chip width is the assertion that
  carries the gate; the row count stays as the #3115 shape's statement of the outcome.
- Section 30b's `#2192` arm "draws the check on the pressed chip only" now asserts no check on any chip.
