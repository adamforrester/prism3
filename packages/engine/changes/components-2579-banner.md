---
engine: minor
---
Banner (#2579, owner decision Q327): a persistent message in the page flow about an important state, with an optional
action. 8 members: `tone` [info, success, warning, danger] × `width` [contained, full]. No size or state axis. The
container is the tone's subtle surface (`color.foreground.{tone}-subtle`) with a 1px edge in the tone's border role
(`color.border.{tone}`, `border-width.hairline`), `radius.md` and edged all round contained (built 480), `radius.none` and
edged top and bottom only at full width (built 960, the sides on `border-width.none` through `strokeEdges`), padded
`space.200` with a `space.150` gap, both following density. Parts: the tone glyph (FieldMessage's mark per status, in
`color.icon.{tone}` at `icon.size.md`), a title in `type.label.md.emphasis` and a body as a native slot in
`type.body.md.default`, both in `color.text.primary`, one nested text Button action (small;
Button.Neutral when the file has it; one action only, owner QA Q533.1), and a dismiss FlushIconButton.Neutral (flush, small, close fixed: Q386; flush per owner QA 2026-10-19). Figma properties `title text`, `title`, `icon`,
`actions` and `dismiss`; the action and the dismiss are off by default. The `width` axis gains the
values `contained` and `full`; `tone` gains a four-value set. No new tokens; CONTRACT is unchanged. The schema's `builtSize` now admits a width-only map on a
row root; heights still need a column.
