---
engine: minor
---
Tabs gains an `alignment` axis, `start` (the default, the approved list) and `center` (#2518, owner decision Q222 A).
A centered tab list keeps each tab hugging its label and sits centered in a bar that spans its placement; the
baseline spans the full width. The Figma member is built 480 wide, room for six large tabs (DRAFT). Tabs goes from 3
members to 6 (size × alignment); the start members project byte-identical to before. `alignment` joins the closed list
of variant axis names, and a root box can declare `center` (axis, value, build width) to center its children at one
coordinate. Every binding is an existing role, so CONTRACT is unchanged.
