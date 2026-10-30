---
engine: minor
---
Checkbox.Row, Radio.Row and Switch.Row set their label one body rung below the row's size, for every brand, with no
lever (#3153, owner decision Q852; Q3153.1 A, Q3153.2 A). A medium row is a 20px control beside a 14px `body.sm` label;
small and large are 12 and 16, and Switch.Row is 12 and 14. On Checkbox.Row and Radio.Row the control cell follows the
label's own line box: the line box is the cell's minimum height and the cell hugs the control, so it is max(control,
line). Where the control is the taller, the label is set down by half the difference, so the control stays centered
on the label's first line. Switch.Row keeps a fixed cell one label line tall, because growing it to the 32px track
would take the medium row to 48px, off the 44px ladder. The rows' minimum heights are unchanged, except compact small,
which lands on its 28px floor instead of 29.

Checkbox.Row and Radio.Row now project `description` into Figma (owner decision Q853 A). It sits under the label in a
new text column, so it starts at the label's start edge. It is one type step below the label, floored at 12px (12, 12
and 14), in `color.text.secondary`, 4px under the label. A `description` boolean, off by default, shows it, and a
`description text` property sets it. In existing files one Update inserts the text column and moves the label into it,
keeping every node's id; the description is added hidden.

Two token families join the guaranteed surface (CONTRACT 14.13.0, MINOR): `type.body.{xs,sm,md,lg}.line-box`, one line
of each body rung, and `control.size.{sm,md,lg}.label-inset`, the label's set-down, max(0, box − line) ÷ 2, which is 0
in every corpus brand at comfortable density. Both are Figma variables in the `control` collection.
