## (2026-11-11) — Update file: a stopped set counts a member it finished after a marker stop (#3559)

Found in the post-merge review of #3492 (#3569). #3539 made it reachable. When a set stops, the members it finished are
read off the host (#3449). A member counted only when its stamp changed this run. Since #3539, a stop on a member's
marker clear leaves it with the planned stamp and the marker still on, and the dry run reads it as to update. The next
run finishes it but never counted it, because its stamp did not change. In the issue's repro, run 2 finished 35
members and reported 34. The comment beside the count also still said such a member "reads as current".

The pass now reads each configured member's marker before it starts (`markedWas`, beside `stampWas`). A member counts
as finished when three things hold:

- It ends with its planned stamp.
- It has no marker.
- Either its stamp changed, or it was marked before the pass and the marker came off.

The comment says the same, and states what is still not counted.

### Not counted (stated, not fixed)

Some members are updated for a reason that leaves their stamp as it was: a nested-instance fault, drawn damage, or
reactions that differ. If such a member was not marked before the pass, the host looks the same after a stop whether
the pass finished it or never reached it. It is left out rather than guessed. Counting it needs a record of what the
pass reached, which only the executor has. That would be an executor change (`EXECUTOR_REVISION`), so it is a separate
question from this fix, filed as #3594.

**Status:** plugin only. No engine change, so no change note. `update-apply.ts` is outside the component executor, so
`EXECUTOR_REVISION` stays.

### Test

`test-update-apply.ts` gains `stop/count after marker`, the issue's repro:

- Run 1 stops on the 10th marker clear. The premise checks that one member is marked and the dry run reads 36 to update.
- Run 2 stops on the 36th stamp write. The premise checks three things: 36 stamp writes, the marked member's marker is
  off, and the dry run reads 44 current and 1 to update.
- The line counts 35, with the marked member among them.

The suite runs 1054 assertions, all passing.

Mutation: `markedWas` dropped from the count → `stop/count after marker` fails by name (34). The existing `stop/count
marker` arm, a stop on the clear itself, stays green.
