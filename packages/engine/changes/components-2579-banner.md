---
engine: minor
---
Banner (#2579, owner decision Q327): a persistent message in the page flow about an important state, with optional
actions. 8 members: `tone` [info, success, warning, danger] × `width` [contained, full]. No size or state axis. The
container is the tone's subtle surface (`color.foreground.{tone}-subtle`) with a 1px edge in the tone's border role
(`color.border.{tone}`, `border-width.hairline`), `radius.md` contained and `radius.none` full width, padded
`space.200` with a `space.150` gap, both following density. Parts: the tone glyph (FieldMessage's mark per status, in
`color.icon.{tone}` at `icon.size.md`), a title in `type.label.md.emphasis` and a body as a native slot in
`type.body.md.default`, both in `color.text.primary`, an actions row of two nested Button.Neutral (outline, then text,
small), and a dismiss FlushIconButton.Neutral (round, small, close fixed: Q386). Figma properties `title text`, `title`, `icon`,
`actions`, `second action` and `dismiss`; the actions and the dismiss are off by default. The `width` axis gains the
values `contained` and `full`; `tone` gains a four-value set. No new tokens; CONTRACT is unchanged.
