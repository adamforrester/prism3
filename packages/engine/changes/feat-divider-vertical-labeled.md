---
engine: minor
---
Divider gains a vertical labeled member (#3143, owner Q3143.1–.7 all A): the set goes from 6 to 7 members. The label
stays upright between a line above and a line below; the root is a column (`directionWhen` on `container`) that hugs the
label across and is `size.xl.height` tall, with `space.150` between the label and each line, following density. New
schema field `PartDef.sizingWhen` (hug only, per coordinate, validated, resolved before projection beside
`directionWhen`). The projection no longer writes a bound size on the axis a part grows along (build check 1); only the
divider's plans move. The two plain vertical members' root becomes VERTICAL with the same pixels. No token name changes,
so CONTRACT is unchanged; neither executor changes, so EXECUTOR_REVISION is unchanged.
