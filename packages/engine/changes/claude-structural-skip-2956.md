---
engine: patch
---
Update file skips a hand-edited member whose update changes its structure (#2956 point 2, owner decision 2026-10-23). When
the plan adds a layer to a member that has hand edits, removes one, changes one's type or moves one into a new frame,
Keep and Accept now leave the whole member as it is and name it ("hand-edited, and the update changes its structure"),
wherever on the member the edits are. Before, the structure was written around the kept paths, and an edit's survival
depended on where it sat. Overwrite still writes the plan. Plugin only; no committed artifact moves.
