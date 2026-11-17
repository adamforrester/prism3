---
engine: patch
---
Update file with Keep now keeps two more kinds of hand edit it reported as kept (#2956 point 1). A layer's children that
a designer reordered stayed in the designer's order only until the parent's child loop put the plan's order back, and a
property link a designer removed (a label unlinked from its text property) was linked again by the set's property wiring.
A node kept as a hand edit now keeps its children's order and its links; a property the run adds is still wired on it.
Overwrite restores both, as before. `EXECUTOR_REVISION` 64, which redraws no set that has no hand edits. Plugin only;
no committed artifact moves.
