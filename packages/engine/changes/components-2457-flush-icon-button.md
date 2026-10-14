---
engine: minor
---
FlushIconButton (`flush-icon-button`), a new component (#2457, owner decision Q283.3 A on #2427): an icon-only
button with no padding, no fill and no border, made to be nested (a counter's minus and plus, a card's close). Ghost
only, on IconButton.Neutral's glyph roles (`color.interactive.neutral.icon.*`, `color.disabled.icon`); hover and
pressed move the glyph ink alone. The box is the glyph, 20 / 20 / 24px (`icon.size.sm` / `sm` / `md`, Q283.13 A), so
in code the hit area extends to at least 44×44px at every size and Figma draws the glyph square only. `size` ×
`state` (rest, hover, pressed, focus-visible, disabled) = 15 members, carrying Rest → Hover → Pressed reactions
through the existing mechanism (#2574). Its page is under Subcomponents. The three IconButton sets are unchanged.
No new token, so CONTRACT is unchanged.
