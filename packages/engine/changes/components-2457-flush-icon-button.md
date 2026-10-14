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

A second shape (owner decision Q287 A on #2457): a `shape` axis, `flush | round`, flush first. `round` is a circle
the Counter's height across (36 / 44 / 56px, `size.sm` / `md` / `lg.height`), full-round, with a decorative edge
(`color.border.secondary`; `color.disabled.border` at disabled) and IconButton.Neutral's ghost wash at hover and
pressed (`color.interactive.neutral.overlay.*`). The glyph stays 20 / 20 / 24 on both shapes, and flush paints exactly
as before. `shape` × `size` × `state` = 30 members.
