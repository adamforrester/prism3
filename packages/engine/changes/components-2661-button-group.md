---
engine: minor
---
Button.Group (`button-group`) is a new component: one to three Buttons in a native `items` slot, on a `layout` axis
of inline, stacked and fill (#2661, owner decision Q363). Dialog's footer now nests it, one Button.Group per footer
layout, in place of two fixed nested Buttons; the `actions` prop is a slot of one to three Button elements. The
group's Cancel is the primary outline Button on its own, and the host decides otherwise (Q363.8 as amended, Q386,
Q418): Dialog's nest of the group prefers Button.Neutral for it when the file has that set, through a new
`PartDef.nestItemPrefers`, projected as `nestItemPrefer`, which both executors apply to the nested instance's default
item and which is never a build dependency. A nest can also prefer a sibling for the component it nests
(`PartDef.prefersWhenBuilt`, projected as `nestPrefer`, resolved first and fallen back from without a miss). A slot's `preferredWhenBuilt` offers the Destructive and Neutral
families when the file has them, without a miss when it does not. `PartDef.directionWhen` sets a box's direction per
member, so the group's one slot is a row inline and at fill and a column stacked. `layout` joins `VARIANT_AXES`. The
update carries a placed Dialog's changed button labels onto the group's default buttons (`COMPONENT_RENAMES` slot
entry `within`). No token name moves, so CONTRACT is unchanged.
