## (2026-11-17) — Update file with Keep keeps a reordered layer and an unlinked property (#2956 point 1)

**What #2957 left.** #2957 stopped a parent's passes (ring, pin, inset icon, stretch) writing onto a child kept as a hand
edit. Two other writers still reached a kept node. Both were found with a probe that edits one kind of path at a time on
a Tag member, runs Update with Keep under a plan that rewrites the member's root, and reads the edit back: paint, binding,
unbound padding, nested corners, text, visibility, opacity, layout mode and the root's own paint all survived, and two
did not.

- **Child order.** The as-built record hashes a node's children's names in order, so a designer's reorder reads as an
  edit on the parent, and the run reported it kept. The parent's child loop (`build` in `write-components.ts`) then called
  `insertChild` to put each child at its plan index. A kept node now leaves the children it already holds where they are.
  A child the plan adds is still placed.
- **Property links.** `componentPropertyReferences` is in the record too, so a label unlinked from its text property
  read as kept, and the set's property wiring linked it again. The wiring now skips a node kept as a hand edit, by id
  (`keptIds`), for every property that was on the set before the run. A property the run adds is still wired, since no
  designer could have unlinked it.

Overwrite restores both, as before: its `keep` set is empty, so nothing is held. `EXECUTOR_REVISION` 63 → 64, with an
empty reach entry: the change only acts on a node kept as a hand edit, so no set without one draws differently.

**Measured.** `test-update-apply.ts` `keep order/*`, `keep links/*`: on main `keep order/byte-identical` and
`keep links/byte-identical` fail; on the fix all pass, and Overwrite restores the plan's order and link
(`keep order/overwrite restores`, `keep links/overwrite restores`). Expected values are typed in the test.

**Not covered.** A property the plan adds that references a kept node is wired by design, but no arm builds that case.
The wider survival suite is #2956 point 6.
