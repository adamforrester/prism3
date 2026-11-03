---
engine: minor
---
FieldMessage's status glyph centers on the message's first line (#3360, owner decisions Q-FM1 A and Q-FM1.1 B). A
one-line message reads exactly centered, and a wrapping message keeps the glyph beside its first line. The row stays
top-aligned. The glyph sits in its own cell and the caption in another, and the row's new `firstLine` field pads the
shorter of the two down by half the difference: the caption by (glyph − line) ÷ 2 where the glyph is the taller, the
glyph by (line − glyph) ÷ 2 where the caption's line is. Before, the glyph's top met the caption's top, which put the
glyph 0.3px above a 15.4px caption line and 1px above a 14px one. The caption starts at the same height in every
status, the default included, so a validation result moves no text.

No token is added and the token contract does not move. The offset is computed from two numbers the def already binds:
the glyph's size (`icon.size.xs`) and one line of the caption's type, unrounded. In Figma both executors write it at
paste from the caption node's line height and the glyph variable's value, because a padding binds one variable and
never a max or a half of two, so it is frozen per file and Update recomputes it. In code it is computed live,
`max(0px, (glyph - 1lh) / 2)`. The component spec records the two paddings as computed values, with the formula and no
px. In existing files one Update adds the two cells and moves the glyph and the caption into them.

The class is `minor` because the projected component surface moves (the def's anatomy, `out/components/field-message.md`
and `specs.json`) along with the executor's output for this set. The token emission does not move.
