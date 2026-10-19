---
engine: minor
---
Every size ladder leads with medium, and Button's icon slots lead with off (#2752, owner decisions Q1 B and Q2 A).
The member Figma inserts, the set's top-left one, now carries the code default on every axis: an inserted control
is medium, and an inserted Button is a plain label button with no leading or trailing icon. The canvas and the
properties panel read medium, small, large. Field label keeps small first, because its code default is small, and
Spinner keeps its icon ladder, because it builds one component per size. No member is added, removed or renamed,
so an existing set updates in place as moves only. The code enums are unchanged. No token is added or renamed, so
CONTRACT is unchanged.
