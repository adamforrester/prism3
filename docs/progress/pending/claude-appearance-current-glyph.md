## (2026-10-25) — The rail's Appearance tile draws the current choice's glyph (Q2995.3 B)

**Status:** plugin panel (shared studio shell). ENGINE patch (change note). CONTRACT unchanged. No executor change, so
`EXECUTOR_REVISION` stays. The web studio's bar Theme tile is unchanged: it already drew the current choice.

### What changed

- **The owner's decision of 2026-10-25 (Q2995.3 B, on #2995 and #2909)** amends Q2909.19 A for Appearance only. #2995's
  review round had made the rail's Appearance tile draw a fixed `halfmoon`; it now draws the current choice's glyph, as
  the bar's Theme tile does: `system` (a monitor) for Match Figma, `sun` for light, `moon` for dark. Name and tooltip are
  unchanged ("Appearance: Match Figma"). The other six rail icons stay as Q2909.19 A decided.
- `frame.ts` `themeToggle` loses its `fixed` parameter (the rail was its only user), and `dom.ts` loses `halfmoon`,
  which nothing else drew.

### Verification

- The `test:chrome` rail-icon arm now expects `system` for Appearance at the default (Match Figma), and a new sweep in
  the same arm chooses Light, Dark and Match Figma from the rail's menu in turn, reading the tile's `data-glyph`, name and
  tooltip each time against a list typed in the test (`sun`, `moon`, `system`), not read from `theme.ts`. It ends back on
  Match Figma, so the rest of the iteration measures the state it did before.
- Mutation: the tile hard-coded back to `glyph('halfmoon')` fails both the icon arm and the sweep, by name, at every
  plugin width and theme.
