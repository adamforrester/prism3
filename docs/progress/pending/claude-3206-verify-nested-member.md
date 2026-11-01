## (2026-11-01) — Update's apply verify reads which member each nested instance is (#3206)

Found by the independent review of #3203: with Update's in-place nested swap skipped for `field-label` only, every
host's nested FieldLabel stayed on its old member, the harness's `<host> leads/primary` arms caught it on all 12 hosts,
and `<host> leads/verdict` stayed green. The apply's own verify told the designer the Update had landed.

### Why the verify missed it

Verify (b) holds each updated member to its plan through `diffAnatomy`, and `diffAnatomy` checks a nested instance's
SET (`nestTarget`, read off the host's main component since #1781) but not the MEMBER inside it: `nestVariant` is listed
as unread, because which member the executor picked is an id on the host and the reader has no independent name for
it. Every FieldLabel member is in the right set, so the wrong one passed.

### The fix

`nestedMemberFaults` (`update-apply.ts`) walks each updated member's plan beside its snapshot. For a planned
`NESTED_INSTANCE` with a `nestVariant`, it takes the main component the snapshot already read (`getMainComponentAsync`
through `mainOf`), parses its name into a coordinate and compares it with the plan's, axis by axis: the same axes, each
with the plan's value, in any order. A mismatch is a content line, `<member>/<path>.nestVariant: <set>/<member>
(the plan says <set>/<coordinate>)`, so the verdict reads "not verified" as for any other field. The expected side is
the plan's own coordinate, not the executor's resolver (`resolveNestMember`), so the check does not agree with the
executor by construction. An instance of a plain component is not read: the executor takes a plain component of that
name first, and it has no coordinate. An instance kept as a hand edit, or under a kept part, is skipped by the content
check's own rule; a kept member root still has its parts read, which is the case the leads section's root edit holds.

### The gate

No new arm: the leads section's `<host> leads/verdict` already asserts a clean verify. Under the issue's mutation (the
in-place `swapComponent` skipped for `nestTarget === 'field-label'`) it now fails on all 12 hosts, with 83 of 84 members
listed on a text field (the 84th is the hand-edited label), as do the label section's `<host> label/verdict` arms on the
four fields with a disabled label. Dropping the hand-edit test from `nestedMemberFaults` fails `<host> leads/verdict` on
all 12 too, the kept label listed. Unmutated, `test-update-apply.ts` passes its 944 assertions.

The trap: the dry run uses `diffAnatomy` the same way, so it does not hold a nested member either. A member the stamp
reads current is not re-checked there; this change is the apply's verify only.
