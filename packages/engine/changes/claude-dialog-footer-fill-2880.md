---
engine: minor
---
Dialog gains a fourth footer, `fill`: a row whose buttons share the width equally, such as Clear all and Apply (#2880,
owner decision Q492 B). It nests the Button group at `layout=fill`, in the order inline, stacked, fill, none, at every
placement, so the set grows from 15 members to 20. The defaults are Cancel then Save, with Cancel a Button.Neutral where
the file has it. The Button group's `fill` code line is now `flex: 1 1 0; min-width: 0`: the buttons keep equal shares
at every width and a long label wraps inside its button, where before it widened its button and wrapped the row.
Additive only: no member is renamed, dropped or retyped. No token path moves, so CONTRACT is unchanged.
