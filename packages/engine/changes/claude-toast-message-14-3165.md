---
engine: minor
---
Toast's message is 14px, `type.body.sm.default`, not 16px (owner request, #3165), after the option rows' 14px label
(#3153). The card takes a floor at `size.md.height`, bound as its `minHeight` (Q3165.1 A), so a one-line toast with no
action measures 36 / 44 / 56 at compact / comfortable / spacious, on the control-height ladder, instead of 33 / 37 / 45.
With the action it stays 52 at comfortable. The success glyph sits in #3153's line-box cell (a floor of the message's
`type.body.sm.line-box`, centring the glyph), so it is centered on the message's first line. No other text part moves: the action is a nested Button with its own label
type. Toast's projected plan moves (2 members, same count). No token path moves, so CONTRACT is unchanged. A file built
before updates both members in place.
