---
engine: patch
---
A variable rename no longer loses its bindings when an unrelated dedupe names the same target (#1142). The rename
planner refused every source in a group that two old names shared, so a plain relocation (`border/inverse/primary` to
`inverse/border/primary`) stayed behind, holding its bindings, while the write created the new name empty beside it,
because #1140's dedupe of `border/inverse/default` named the same target. Now, when exactly one source in such a group
keeps the target's last segment, that source is renamed and the others are reported as target occupied, so the designer
still picks the survivor between the two. A group with no such source, or several, is refused as before. In the plugin
and the agent paste alike; no committed artifact moves.
