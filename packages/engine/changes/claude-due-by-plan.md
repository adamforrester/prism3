---
engine: patch
---
Update file counts a component set as due after an engine update only when its drawing would change (#3082 part 1,
owner decision Q811 A). The plugin's as-built ledger records, per set, a print of the plans it was drawn from: one hash
of the projection, plus a short hash per part and facet. When only ENGINE_VERSION has moved, a set whose plans print as
recorded reads current and is re-recorded by the next write; a set whose plans moved is due, with a one-line reason
naming what moved ("Engine update: focus ring size"). An EXECUTOR_REVISION move still makes every set due (Q811.1).
An entry from before this change, with no print, stays due once the engine has moved past it, so the next update records it. No committed artifact moves.
