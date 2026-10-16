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
would mis-count a set with two members sharing a part name.

**Found by the full suite, not by the arms written for it.** `unbuilt/relay left` (`test-canvas-furniture.ts`) went
to "⚠ 1 set not verified": the build's footprint check compared a member Prism3 didn't build, which the update left
as it is, with its sibling, and reported the size difference. That miss is about a member the update never touched,
the same class the outcome already dropped (`ALREADY PRESENT`, `STALE`). So `out.misses` now also drops any miss that
names a member this run skipped. On a real file, a designer's own member of another size would otherwise have made
every update read "not verified".

**Tests.** `recordfail/verdict` and `recordfail/set verdict` hold the headline, the count and the named line on the
icon and a set member; `misses/other` holds the set-level line from an outcome written out by hand; `unbuilt/relay
left` holds the skipped member's miss left out.

**The skipped-member match is by whole name (review).** The first cut matched with `includes`, and members are named
`name=<glyph>`: the shipped icons hold 20 prefix pairs (`name=check` ⊂ `name=check-circle`, `name=eye` ⊂ `name=eye-off`),
so a skip on `name=check` swallowed the refused record on `name=check-circle` and the verdict went back to ✓ with it
counted, which is #2477 again. `namesMember` now takes a name only where it starts the miss or follows a space, and ends
it or meets a space, `.` or `/` (the forms the build uses: `<member>.asBuilt`, `<member>/<part>.slot`, `footprint ->
<member> measures … but <member> measures …`). A `.` boundary alone would let `size=1` claim `size=1.5.asBuilt`, so where
a longer known member name matches at the same place, that one is named. Arms: `recordfail/prefix` (the review's probe
through the shim) and `misses/whole name` (the forms, by hand). Left as it was, and an owner call: a footprint miss that
names both a skipped and an updated member is still dropped whole, even when the updated member is the one whose size
moved.
