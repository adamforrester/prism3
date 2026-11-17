## (2026-11-17) — Accept's skip of a member whose hand edit the update would rebuild away is tested (#2673 review)

**What the review found.** #3901 (#2673) skips, under Keep and under Accept, a member with a hand edit on a layer the
update rebuilds. No arm ran Accept, so exempting Accept from the skip passed every arm: a built behavior with no
mutation that fails by name.

**The arm.** The `acc/edited` and `acc/edited under` arms of `test-update-apply.ts` now run under Accept as well as Keep
and Overwrite: the member skipped and named, the title byte-identical by id with the edit as made, the other 47 moved.
The skip exempting Accept fails `acc/edited accept skipped`, `acc/edited accept byte-identical`, `acc/edited under
accept skipped` and `acc/edited under accept byte-identical`.

**Owner decision (follows #2956): pending confirmation, with #2673's option A.** That Accept skips such a member as
Keep does is a change to what a choice does, so it is held for the owner beside A rather than called technical. Accept
keeps the edit and records it, so the rebuild would lose the edit there too.
