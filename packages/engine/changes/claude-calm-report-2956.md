---
engine: patch
---
Update file no longer reads a hand edit it kept as a part to check (#2956 point 4). The build measures and reads back
around the nodes it leaves, so a designer's unbound padding on one member made the footprint check report that member
as differing from its siblings, and the run read "⚠ … to check". Under Keep and Accept, a build miss that names a member
the run kept hand edits on now goes to its own line, "not written because the member is hand-edited", and the run reads
✓. A member whose record could not be written stays a miss. Plugin only; no committed artifact moves.
