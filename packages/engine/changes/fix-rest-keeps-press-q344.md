---
engine: minor
---
Prototype reactions: a Rest member of an interactive set carries While pressing → Pressed again, beside While hovering →
Hover (owner decision Q344, #2733). This reverts the hover-only chain of #2702 that appears in the same changelog. A touch
prototype has no hover, so Rest's own press reaction is the only route to Pressed. On a desktop it never fires, because the
pointer hovers first. Hover keeps While pressing → Pressed. The change applies to every set whose `state` axis holds rest,
hover and pressed (16 defs). EXECUTOR_REVISION 27: a file built under the hover-only plan reads its Rest members as
needing an update, with the missing press reaction named, and the update puts it back in place. No token or emitted
artifact moves, and CONTRACT is unchanged.
