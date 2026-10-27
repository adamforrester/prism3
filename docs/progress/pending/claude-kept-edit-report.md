## (2026-10-27) — A kept hand edit is reported as kept, not as a discard (#3086 part 2)

On Update file with "Keep" hand edits, a radio whose dot size a designer had edited was kept, as asked, but the run report said `60 parts not written as planned — bound … dot.width -> DISCARDED (set control/size/md/dot, not retained on the live node)`. The run did what it was told and the report called it a failure.

### The diagnosis

A node kept as a hand edit is not written (`build`'s `kept` guard in `write-components.ts`). The build's bound read-back, which runs after the combine for every member it wrote, still reads every binding the plan gives each part and reports any it cannot find. On a kept node the plan's binding is absent by design, so every kept bound field read as a dropped binding. The read-back has no notion of a kept node, and it should not: it is the executor's check that the host held what was written, and it is right for every node the build did write.

### The fix

The report side sorts it, in `applySet` (`apps/plugin/src/update-apply.ts`), which already holds each member's kept paths. A `bound <member>/<part>.<field> -> DISCARDED` miss whose part is one of that member's kept paths moves out of `misses` into the outcome's new `keptBound`. The verdict names those properties with the hand edits kept: `1 hand edit kept (dot size)`, where a width or height reads as the part's size (DRAFT wording for the owner). Any other miss, and a bound miss on a node no one edited, stays a part not written as planned, and the set stays not verified.

### The check

Two cases in `apps/plugin/test-update-apply.ts`, `kept report/…`, on a built radio-control. In the first, a designer unbinds the checked medium member's dot width and height and sizes it to 14; the update runs under Keep; the verdict lists no part not written and reads `radio-control: 60 updated in place, 1 hand edit kept (dot size).`, verified. In the second, no member is edited and the host drops the dot's width binding on one member; the miss is still reported, and the set is not verified. Mutations, each failing by name: the split removed (`kept report/no miss`, `kept report/named`), the property left unnamed (`kept report/named`), the split taking every bound miss whatever was kept (`kept report/real discard`).

### Not changed

The component executor did not change, so `EXECUTOR_REVISION` is not raised: `lint-executor-revision.ts` reads the executor's files and none of them moved. The radio dot size itself (#3086 part 1, Q816) is an open owner question and is not touched here.
