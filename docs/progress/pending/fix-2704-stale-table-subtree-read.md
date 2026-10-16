## (2026-10-15) — Style guides: a full rerun no longer crashes after deleting a superseded table (#2704)

A full style-guide rerun deleted one superseded table, then threw `in getPluginData: The node (instance sublayer or table cell) … does not exist` and stopped before the re-flow, so new tables landed over old ones. Each rerun deleted one more table and crashed again.

**The diagnosis.** The superseded-table loop walks `framesOn(page)`, which is `findAllWithCriteria({ types: ['FRAME'] })` gathered once, before the loop. That list holds every frame on the page, not only the tables: each table's grid, its cells, and the frames inside its `_Section-header` instance. After `f.remove()` the loop went on to the next frame in the list, a frame inside the table it had just removed, and read its plugin data. The host had invalidated the whole subtree with the table. #1795 fixed the reads off the removed frame itself; this is the same shape, one level down.

**The fix.** Before the remove, the loop records the ids of everything inside the table, and it skips any frame whose id is in that set. Ids stay readable on a removed node. Nested frames are still candidates, as before: a table moved inside another frame is still reported as kept (`moved`).

**The shim was too forgiving.** `test-style-guide.ts` invalidated only the removed node, so its descendants stayed readable and #1795's test 6a passed while the host failed. `remove()` now invalidates the whole subtree, and a second `remove()` throws. With the stricter shim, 6a fails on the old code too.

**The test.** Section 6b: a full run draws, two groups are regrouped so two tables are superseded (each header is an instance with a frame inside), and a full rerun must delete both, re-flow, report ok and leave no overlap. A second case covers recovery: a run crashes before its re-flow (the host refuses the delete), then the next full run deletes what is superseded and overlaps nothing. That second case passes on the old code as well. A table the crashed run created carries its position record (`AT_KEY` is written at creation), so the next full run re-flows it. No separate overlap defect was found for that case.

**Mutation, failing by name.** With the skip line removed, `6a: one run deletes two superseded, unedited tables and names both…` and `6b: a full rerun deletes both superseded tables, re-flows and reports ok…` both fail, each with the host's "does not exist" error, and so does the recovery case of 6b (its rerun hits the same read).
