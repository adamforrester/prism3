## (2026-10-16) — A set rebuilt under a page header puts its labels, not its frame, on the header's left edge (#2735)

**What changed.** `placeNewSet` (`apps/plugin/src/write-components.ts`), on a page with a section header, now starts
its slot scan at the header's left edge plus the new set's `reach.left`: the set's FURNITURE EDGE (the outer left edge
of its row labels, the same edge #2723's 160px `SET_GAP` is measured from) goes on the header's edge, and the frame
lands `reach.left` right of it. Before, the frame went on the edge and the labels hung left of the header by their own
width (about 317px on Buttons, 324px on Icon button in the shim). A first build lays the header over the content labels
included, so a set deleted and rebuilt under it now lands exactly where the first build put it. `EXECUTOR_REVISION` 28.

**Diagnosis that made it small.** #2723 already gave `placeNewSet` the new set's reach and gave the build a second
placement once the labels are drawn and measured (`seatNewSet`). The header branch was the one place that still
anchored the frame: its start `x` ignored `reach.left`, while the push rule beside it already used it. One term.

**Stacked on #2737** (#2723's branch), because `reach` and `seatNewSet` arrive with it. With no reach (the executor's
first placement, and the paste payload, which draws no labels) a set is its frame, so the frame still goes on the edge,
and the executor's own `#2405` header arm in `test-write-components.ts` is unchanged.

**Verification.** `test-canvas-furniture.ts`: `placement/<page> first` now asserts the rebuilt set's labels start on the
header's left edge AND its frame is back at the first build's `x` (it used to assert the frame on the edge). New literal
arms `placement/header edge` (labels reaching 300 → frame at 300) and `placement/header edge slot` (a reaching set still
takes the slot before a kept set). Mutation: drop `+ reach.left` from the header start → all three fail by name.

**Trap for whoever re-verifies.** The pre-existing `placement/reach under a header` literal (1960) does not move with
this fix: that set is pushed past the kept set, and the push rule already added `reach.left`. Only a set that lands in
the first slot shows the difference, which is why the new arms exist.
