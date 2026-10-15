---
engine: patch
---
In the plugin, the update's dry run now makes every check the apply's preflight made (#2601): a variable the plan
binds, a text or effect style it names, a component it nests or swaps to, and every font the set's text needs, loaded
during the dry run. Each one the file lacks is a blocker on the set, so the confirm step lists every set the apply
refuses. The apply's preflight is now the dry run's blockers, read again. A set's blockers are part of the preview
hash, so a font or variable that comes or goes between the check and the confirm refuses the apply. No emitted
artifact, token or projected component surface moves.
