---
engine: minor
---
Banner's `width` axis is renamed `edge`, and its `full` value `full-bleed` (#3392, owner decision 2026-11-04). The axis
changes the corners and which sides carry the edge, not a width, so it is named for what changes (#3383's rule). The
code prop is `edge` (`contained | full-bleed`, `contained` the default), and the token slot keys follow
(`edge.{edge}.radius`, `edge.{edge}.edge-side`). `edge` joins `VARIANT_AXES` as its thirty-fourth name; Button keeps
`width`, now its only set. The rename rides `COMPONENT_RENAMES` (an axis entry and a value entry), so an update renames
a built Banner's members in place and every placed instance keeps its member. The set keeps its 10 members and its
paint. No token name moves, so CONTRACT is unchanged.
