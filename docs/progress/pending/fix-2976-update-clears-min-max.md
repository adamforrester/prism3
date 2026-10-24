## (2026-10-23) — Update clears a min/max size the plan no longer sets (#2976)

Owner QA found underline tags still 36/44/56px tall and 56px+ wide after a Pill → Underline switch and an in-place
Update; a fresh Build hugged (#2946). Two leftovers, one cause: the in-place executor only ever *removed* what a plan
stopped setting as a binding (`setBoundVariable(field, null)`), and the host keeps the number a removed binding wrote;
and a literal floor (Pill's `minWidth`, 1.5 × the rung height) was written only "when the plan carries it", so nothing
ever took it away.

### What changed
- `apps/plugin/src/write-components.ts`: right after the stray-binding unbind, in place and outside an instance, each of
  `minWidth`, `maxWidth`, `minHeight`, `maxHeight` that the node's plan neither binds nor writes literally is set to
  `null`. General, not tag-specific. Inside `own()`, so a hand-kept node is untouched; a parent's own writes onto its
  child (`maxWidth`, the reserved lines' `minHeight`) run after the child's build and still stand. `EXECUTOR_REVISION`
  37 → 38.
- `apps/plugin/component-shim.ts`: unbinding one of those four now leaves the bound value as a literal, as the host
  does. Without it the shim deleted the binding and the value together, so the Underline → Pill half of the defect
  (the label row's bound `minHeight` left behind) could not be seen offline.
- `apps/plugin/test-update-apply.ts` § min/max: builds Tag under each style, updates in place to the other, and
  compares all four sizes (value and bound-or-not) on every node of every member to a fresh build of the target style.

### Verification
Mutation (the clearing loop iterating nothing): both `#2976 min/max pill → underline` and `#2976 min/max underline → pill`
fail by name, 45 members off each.

### Trap
The paste executor builds fresh only, so it has no twin of this clear; if it ever gains an in-place path it owes one.
What the host does to `minHeight` when a bound `height` is removed was not re-measured here; the shim models only the
four min/max fields.
