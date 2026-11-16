## (2026-11-16) — Update file's check and apply agree on a dangling member with a layer edited by hand (#2674)

**What.** `update-plan.ts` read a member whose reactions dangle (#2466) as `update` before anything else, while the
apply's `plan()` skips any member with a structural hand edit under every choice: the same check/apply disagreement
#2413 fixed for drawn damage. The state's first test now reads `(damaged.length || rxv.dangling) && !structural`, the
member's state carries `dangling: true` when a structural edit outranks it, and the skip reason says so.

**A layer renamed by hand is structural.** The record reads it as one path removed and one added, so it is skipped by the
apply too. `test-reactions.ts`'s `orphan/hand-renamed` had pinned the old "to update" reading, which is this issue
itself; it now expects the member edited by hand and dangling. The intent that arm guarded, a hand edit elsewhere never
stopping the dangle from making a member "to update", moves to a new `orphan/hand-edited` arm on a field edit (a layer's
opacity), which still reads "to update".

**Measured on the shim.** `test-reactions.ts` gains `orphan/under a layer …` (the dangling Rest member with a layer added;
the dry run, and the apply under keep, overwrite and accept). On main's code 5 assertions fail (the dry run reads "to
update", and the apply leaves the member untouched); 61/61 pass with the fix. Two mutations each fail by name: the dangle
read before the structural edit (5), and the skip reason without it (3).

**OWNER DECISION, the wording (DRAFT).** The skip reads `a layer was added or removed by hand, and its prototype reactions
point at a member no longer in the set`, reusing the dry run's own words for such a destination (`reactions.ts`). With
drawn damage too, both clauses follow in that order.
