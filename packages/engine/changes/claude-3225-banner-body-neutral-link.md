---
engine: minor
---
Banner gains a body text property, a neutral tone and an inline link (#3225, owner decisions 2026-11-01). The body
sentence moves out of the native slot into a text part driven by `body text` (code `children`, default the old
placeholder); the slot stays for rich content behind the Figma-only `rich body` toggle, empty and off, and is renamed
`richBody` in place so the `body` toggle can take its name. A fifth tone, `neutral`, last on the axis: the secondary
background, the `border.tertiary` edge and no glyph, so the set grows from 8 to 10 members. An inline Link follows the
body's last word in a row that wraps and aligns on the text baseline; a `link` prop typed exclusive with `actions`.
The schema gains `LayoutDef.wrap` (projected as `layoutWrap: WRAP`, written by both executors) and a hugging text
below the root, whose max width is derived from the build width. `COMPONENT_RENAMES` gains the `slot-text` kind, and
Update carries each placed banner's edited body into the property. The primary and link inks are also held on
`background.secondary` (`INK_SURFACES`), which moves no example brand's value. No token name moves, so CONTRACT is
unchanged.
