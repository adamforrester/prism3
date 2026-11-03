---
engine: minor
---
FieldMessage's status glyph centers on the message's first line (#3360, owner decision Q-FM1 A). A one-line message
reads exactly centered, and a wrapping message keeps the glyph beside its first line. The row stays top-aligned. The
glyph now sits in a cell whose minimum height is one caption line and which hugs the glyph, so the cell is max(glyph,
line). The caption sits in a column that is set down by half the difference wherever the glyph is the taller. Before,
the glyph's top met the caption's top, which put the glyph 0.3px above a 15.4px caption line and 1px above a 14px one.
The caption starts at the same height in every status, the default included, so a validation result moves no text.
In existing files one Update adds the two cells and moves the glyph and the caption into them.

Two token families join the guaranteed surface (CONTRACT 14.14.0, MINOR): `type.caption.{md,lg}.line-box`, one line of
each caption rung, and `type.caption.{md,lg}.glyph-inset`, the caption's set-down beside the 16px `icon.size.xs` glyph,
max(0, glyph − line) ÷ 2, taken off the unrounded line. Both are Figma variables in the `control` collection.
