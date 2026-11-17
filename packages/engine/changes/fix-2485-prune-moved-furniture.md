---
engine: patch
---
Prune removes the canvas labels and backdrop a moved set left behind (#2485, Q294 A). Furniture is drawn on its set's
parent, and since #2485's first half a Build or Update of the set clears a copy left on another parent. Prune kept such
a copy for as long as the set was alive anywhere, so a moved set nobody rebuilt left its labels on the old page for
good. Prune now treats tagged furniture whose set is alive but on another parent as stale, as it already did furniture
whose set is gone. Untagged nodes are still never touched. Its preview and applied sentences now name both causes: "N
canvas labels or backdrops belong to a set that was deleted or moved. Deleting them touches no component." and
"Removed N canvas labels or backdrops left from a set that was deleted or moved." Plugin only; no committed artifact
moves.
