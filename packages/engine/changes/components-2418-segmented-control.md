---
engine: minor
---
Segmented control (#2418, owner decisions Q269 1-8 A, 2026-10-13): two new defs on their own page. `segmented-control-segment`
(SegmentedControl.Segment) is one option, selection x size x five states = 30 members: a cell on Button's height rung with
an indicator inset 4px inside it that carries a tint (`interactive.primary.subtle-fill.selected`) and a 2px
`interactive.primary.border.*` outline when selected, a neutral overlay wash at hover and pressed, and the label in the
emphasis weight when selected, held at its bold width by Tab's clipped reserve. The selected label keeps the neutral ink.
`segmented-control` (SegmentedControl) is the control, size only = 3 members: an optional nested FieldLabel above a 1px
`interactive.neutral.border.rest` track (`radius.md`) holding five nested options, 3 shown, behind the Figma-only toggles
Segment 3 to Segment 5; option 1 is selected. A `behavior` prop (view by default, form) is code-only. Engine: `grow` is now
valid on a `nest` part (Q269.6): the plan carries `layoutGrow: 1` and the instance's own main-axis mode FIXED, and both
executors write `layoutGrow` on the instance from the parent's pass, so the options share the track equally. Tab's
avoidWhen and Tabs' usage and avoidWhen name the segmented control instead of "not built yet". No token is added or
renamed, so CONTRACT is unchanged.
