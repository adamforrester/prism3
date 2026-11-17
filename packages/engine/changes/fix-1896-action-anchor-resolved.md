---
engine: minor
---
`roleColors.action` now anchors the action fill where its alias `actionPalette` does: at the resolved palette's own
shade, not at primary's step (#1896). For a brand color that is the color's own step; for neutral or a status palette
it is the 500 mid step. Both spellings now resolve every role to the same step in every mode, and the "anchored at"
decisions-log note appears for either spelling. No committed brand sets `roleColors.action`, so no committed artifact
moves; a brand that rebases action through `roleColors` sees its action fills, and the links that follow them, move.
