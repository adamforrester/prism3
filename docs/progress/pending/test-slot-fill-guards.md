## (2026-11-16) — Tests pin a thrown update's verdict, the finished-set slot miss and the refused set (#3758, #3763)

**What.** Three claims of the in-place update had no test that failed without them; the code was right in each, and a
one-token regression passed every suite. `test-slot-migration.ts` now pins them:
- `failed/not completed` (#3758): a run that threw part-way returns `completed: false`, so Update file's run stops
  rather than going on as a warning. The `failed/verdict` arm also asserts a line starting `checkbox-group:` in place of
  `lines.length > 1`, the review's nit.
- `finished/missing slot named` (#3763 N1): on a set that finished, an instance with no `items` slot after the update is
  a miss naming it. `reachedOnly` silences that miss only on a stopped set.
- `refused/…` (#3763 R2): a set the dry run blocks (the host lists none of the variables the plans bind) is refused, no
  fill runs, and the instance keeps its rows and label.

**One guard no test can pin.** #3763 named `!o.refused` on the two fills. `applySet` never returns a refused outcome:
a set is refused at the apply's preflight, before the loop that fills, so the guard is unreachable and dropping it
changes nothing (measured: 49/49 still pass). `refused/rows kept` pins the refusal that does run: dropping the
preflight's `continue` fails it by name. The other two arms fail by name under their mutations (`completed: true` on
the thrown branch; `reachedOnly` passed as `true`). Tests only: no behavior change, no change note.
