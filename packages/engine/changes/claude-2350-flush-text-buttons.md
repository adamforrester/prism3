---
engine: minor
---
Flush text buttons in {{ENGINE_VERSION}} (#2350 part 1, owner Q143 items 1 and 2, the correction to item 3, and Q145 A).
Button, Destructive and Neutral gain an `inset` axis, `default | flush` (name, values and wording DRAFT for the owner),
on the text appearance only: `figmaProperties.excludeCoordinates` removes it from filled and outline, so each set grows
from 432 to 576 members (144 flush text members). A flush member binds both inline paddings to `space.0` and drops the
#1667 minimum width, so it hugs its label and the label sits on whichever content edge it aligns to: start, end, or
both in a centered row. Under "Locked to edges" both pinned icons sit at the edge, each side's reserve less the inset.
The container paints no overlay wash, so a flush button hovers by color only even when the brand's "Text button hover"
is "Fill". The height is the default sibling's, so the hit target keeps its floor. Expressed by a new box field,
`PartDef.flush: { axis, value, key }`, validated in `anatomyErrors`, and a twenty-first axis name, `inset`, in
`VARIANT_AXES`. Icon buttons get no flush. No token name or value moves; CONTRACT unchanged.
