## (2026-11-17) — Prune removes the canvas furniture a moved set left on its old page (#2485)

**What.** The prune half of #2485, as Q294 A decided it. `staleFurniture` took `setAlive(setId)`, so a label whose set
was alive anywhere in the file was kept, including one left on a page the set had moved from. It now takes
`setParent(setId)`, the set's parent id or null when the set is gone, and each item carries its own parent id. An item
is stale when its def has no furniture, its set is gone, or its set sits on another parent. `main.ts` records each live
set's parent instead of a yes/no, and `pruneFurniture` reads each node's parent. The two sentences are Q294 A's single
family for both causes ("… belong to a set that was deleted or moved …").

**Why "another parent" and not "another page".** Furniture is drawn on the set's parent (`drawFurniture`), and the
build's half (`clearMovedFurniture`) already clears any copy not on that parent, including a set moved into a frame
on the same page. Prune uses the same rule, so the two halves can't disagree about which copy is stale.

**Tests.** `test-canvas-furniture.ts` `prune/moved` checks four labels. The one a moved set left on page A goes. The copy
beside the set on page B stays, and so do a set's label that is still beside its set and an untagged node. `prune/moved copy`
pins the four strings. `test-prune-main.ts` `main/moved set's furniture` drives the real `main.ts`: the preview offers
the one left behind under the new sentence, and the confirm removes it and only it. All three fail on main.

**Mutations.** The rule back to "set alive" (`return home === null`) fails `prune/moved` and `main/moved set's
furniture`. `main.ts` recording the first furniture's parent as the set's home, instead of the set's own, fails
`main/moved set's furniture` (it removed the copy beside the set).
