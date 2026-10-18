---
engine: minor
---
Button.Group (`button-group`) is a new component: one to three Buttons in a native `items` slot, on a `layout` axis
of inline, stacked and fill (#2661, owner decision Q363). Dialog's footer now nests it, one Button.Group per footer
layout, in place of two fixed nested Buttons; the `actions` prop is a slot of one to three Button elements. Cancel
nests the primary Button and prefers Button.Neutral when the file has it (Q363.8 as amended, Q386): a new
`PartDef.prefersWhenBuilt`, projected as `nestPrefer`, which both executors resolve first and fall back from without
a miss, and which is never a build dependency. A slot's `preferredWhenBuilt` offers the Destructive and Neutral
families when the file has them, without a miss when it does not. `PartDef.directionWhen` sets a box's direction per
member, so the group's one slot is a row inline and at fill and a column stacked. `layout` joins `VARIANT_AXES`. The
update carries a placed Dialog's changed button labels onto the group's default buttons (`COMPONENT_RENAMES` slot
entry `within`). No token name moves, so CONTRACT is unchanged.
