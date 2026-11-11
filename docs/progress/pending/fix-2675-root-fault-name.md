## (2026-11-10) — Update file: a fault on a member's root reads `<member>.strokes` (#2675)

**Status:** plugin only. No engine change, so no change note; CONTRACT unchanged. `drawn.ts` and `update-apply.ts`
are outside the executor (`lint-executor-revision.ts` lists its five files), so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q135 A (2026-11-10, on #2675):** a fault on a component's root layer is named `<member>.strokes`,
  with the root part left out. Before, the part `.` was joined as `<member>/..strokes`.
- `drawn.ts` gains `faultAt(member, part)`, which returns the member alone for part `.`, and `faultLine` uses it.
- The same `/..` join was in three more of the update's verify lines in `update-apply.ts`: a field the plan gives
  that differs, and a fill or stroke the plan does not give. They name the root the same way now, through the same
  helper, so all of verify's content lines agree. #2413's skip reason (`damaged`) inherits the new form through
  `faultLine`.

### Tests

- `veil/verify` and `veil/alpha verify` (`test-update-apply.ts`) now expect `<member>.fills`.
- `def rename, single/verdict` filtered its known shim misreads by `<member>/`; it now accepts `<member>.` too, since
  a root misread reads that way.
- `root/named` (review of #3541): Button's 48 washed members are built under "Text button hover: Fill" and updated to
  the default plan, by a host that keeps every root's wash and misapplies one root's main-axis alignment. Verify then
  writes both root lines, `<member>.fills: 1 paint(s) (the plan says none)` and
  `<member>.primaryAxisAlignItems: MIN (the plan says CENTER)`, and the arm asserts both exactly, with no `/..` line.
- **Mutations:** `faultAt` returning `<member>/<part>` for the root fails `veil/verify` and `veil/alpha verify` by
  name. Either `update-apply.ts` call site (the field line, or the unpainted fill line) reverted to `${name}/${at}`
  fails `root/named` by name. The unpainted stroke line has the same shape as the fill line beside it and is not pinned
  on its own.
