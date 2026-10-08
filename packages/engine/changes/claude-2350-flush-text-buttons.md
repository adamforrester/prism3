---
engine: minor
---
Flush text buttons in {{ENGINE_VERSION}} (#2350 part 1, owner Q143 items 1 and 2 and the correction to item 3).
Button, Destructive and Neutral gain an `inset` axis, `default | flush-start | flush-end` (name, values and wording
DRAFT for the owner), on the text appearance only: `figmaProperties.excludeCoordinates` removes it from filled and
outline, so each set grows from 432 to 720 members (288 flush text members). At a flush side the container's padding
binds `space.0`, the row distributes toward that side (so the #1667 minimum width leaves its slack on the far side),
a pinned icon under "Locked to edges" sits at the edge with its reserve less the inset, and the container paints no
overlay wash, so a flush button hovers by color only even when the brand's "Text button hover" is "Fill". The height
and minimum width are the default sibling's, so the hit target keeps its floor. Expressed by a new box field,
`PartDef.flush: { axis, start, end, key }`, validated in `anatomyErrors`, and a twenty-first axis name, `inset`, in
`VARIANT_AXES`. Icon buttons get no flush. No token name or value moves; CONTRACT unchanged.
