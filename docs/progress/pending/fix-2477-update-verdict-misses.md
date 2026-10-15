## (2026-10-15) — Update apply: the verdict reads the build pass's misses (#2477)

**What happened.** `applyVerdict` built its headline and `ok` from `stopped`, `identity`, `content`, `refused` and the
counts, and never read `SetOutcome.misses`. A member whose as-built record the host refused kept its old stamp and
read out of date on the next dry run (#2373 holds that), but the verdict said `✓ updated 45 in place` and counted it.

**The fix.** In `update-apply.ts`, any miss makes its set "not verified", the headline the verify lines already use.
A miss of the form `<member>.asBuilt -> NOT RECORDED (…)` whose member the build listed as updated is that member
not finished: it leaves the set's "updated in place" count and the headline's, and gets its own line by name. Any
other miss is quoted on one line with its own reason. The owner's held question (comment on #2477) recommended A;
the wording is built as A and listed as an owner item on the PR, along with the line for other misses, which A
described only in outline.

**Dry run and apply.** Nothing in the dry run moves: a host refusing a write is not something a dry run can see.
The verdict now says what the next dry run will say, which is the agreement that matters here.

**Trap for whoever re-verifies.** Misses are named by node, not by member (`label.characters -> …`), so only the
record miss can be pinned to a member. The others stay at set level on purpose: guessing a member from a node name
would mis-count a set with two members sharing a part name. No test in the plugin suites produces a benign miss
during an update, so no existing verdict moved; a real file with an unnominated swap target would now read
"not verified" on every update, as its build already reads "⚠ 1 miss".

**Tests.** `recordfail/verdict` and `recordfail/set verdict` hold the headline, the count and the named line on the
icon and a set member; `misses/other` holds the set-level line from an outcome written out by hand.
