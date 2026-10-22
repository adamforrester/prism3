---
engine: minor
---
Link gains a current state for navigation rows (#2872, owner decisions Q507). A runtime `selection` axis
(`unselected | selected`, as Tab and Tag) on standalone links only, so the Link set grows from 96 to 144 members; inline
links stay out. A current link shows a 2px bar at the foot of its line box, filled in the link icon color and stepped by
state. The bar exists on current members only and sits out of the flow, pinned across the link's bottom edge (a new box
placement, `PartDef.foot`), so no existing member gains a layer and the box does not move. Hover on a current link
changes the color only: no underline joins the bar. The code prop is `current`, rendering `aria-current="page"`.
`unselected` leads, so a published Link updates in place: its 96 members become `selection=unselected`, with nothing
dropped, replaced or renamed for consumers. No token is renamed or added, so CONTRACT is unchanged.
