---
engine: minor
---
FlushIconButton, a new component in three color families (#2457; owner decisions Q283.3 A on #2427, Q287 A and
Q295 on #2457): an icon-only button made to be nested (a counter's minus and plus, a card's close). On IconButton's
own pattern (#1225) the family is the component: `flush-icon-button` (FlushIconButton, primary),
`flush-icon-button-destructive` (FlushIconButton.Destructive) and `flush-icon-button-neutral`
(FlushIconButton.Neutral), each on its IconButton's ghost roles (`color.interactive.<family>.icon.*`, and on round
`color.interactive.<family>.overlay.{hover,pressed}`; `color.disabled.icon` at disabled).

Two shapes, `shape: flush | round`, flush first. `flush` has no padding, no fill and no border: the box is the glyph,
20 / 20 / 24px (`icon.size.sm` / `sm` / `md`), and hover and pressed move the glyph ink alone; in code the hit area
extends to at least 44×44px at every size, and Figma draws the glyph square only. `round` is a circle the Counter's
height across (36 / 44 / 56px, `size.sm` / `md` / `lg.height`), full-round, with a decorative edge
(`color.border.secondary` on every family; `color.disabled.border` at disabled) and the family's wash at hover and
pressed. `shape` × `size` × `state` (rest, hover, pressed, focus-visible, disabled) = 30 members per family, 90 in
all, carrying Rest → Hover → Pressed reactions through the existing mechanism (#2574). The three sit on one page
under Subcomponents. The usage text states the 44px spacing between two flush icon buttons center to center (Q296 A).
The three IconButton sets are unchanged. No new token, so CONTRACT is unchanged.
