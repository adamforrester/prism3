---
engine: minor
---
Prototype reactions chain rest → hover → pressed (#2702, owner decision 2026-10-15). A Rest member of an interactive
set now carries While hovering → Hover only; the Hover member keeps While pressing → Pressed. Rest no longer carries a
press reaction of its own. Every set whose `state` axis holds rest, hover and pressed is affected (16 defs), on every
other axis alike. EXECUTOR_REVISION 25: a file built earlier reads its Rest members "to update" with the extra press
reaction named, and the update removes it in place. No token or emitted artifact moves; CONTRACT is unchanged.
