## (2026-10-25) — lint-naming fails a second copy of a skill rule it reads (#2948)

`lint-naming.ts` parses four lists out of §6 of `skills/prism3-build-component/SKILL.md` (the root roles, the `_` prefixed set, the slot items, the exempt controls) and checks each against its own literal. Each regex took the **first** match, so when two PRs edit the skill in hunks git merges without a conflict, the second copy of a rule survives and nothing reads it. The delta review on #2761 measured this: a second "prefixed set" sentence naming `_accordion-marker` left the gate clean.

**The fix.** The gate now counts each anchor over the whole skill, not only §6, and fails when one appears more than once (`states the DECIDED_PRIVATE rule 2 times … expected once`). It also asserts the `## 6.` and `## 7.` headings each appear once, because the §6 slice is taken between the first of each: a duplicated §6 would put a whole copy out of reach. The expected count is the literal 1, never read off the skill.

**The self-check.** For each rule, the gate takes the real skill's own sentence, changes the first quoted name (`` `x` `` → `` `x-copy` ``), appends it, and asserts the copy count fails by that rule's name. It does the same with a second §6 heading. The expected count in the self-check is the real count plus one, so the self-check does not fire on top of a real duplicate and blur which arm reported.

**Mutations, each failing by name** (wip commit before each; diff non-empty and the duplicate counted present before running):
- **M1, the issue's case.** A second "The prefixed set is `_accordion-marker`." further down §6 → `skill: … states the DECIDED_PRIVATE rule 2 times (anchor The prefixed set is ([^.]*)\.), expected once`. `origin/main`'s gate on the same tree stays green (the converse: without the new arm, nothing fires).
- **M2.** The root row stated twice, the second adding `label` (the 12-against-11 disagreement the issue found) → `states the ROOT_ROLES rule 2 times`. `origin/main`'s gate: green.
- **M3.** A second `## 6.` heading carrying a copy of the slot-items sentence → `has 2 §6 headings, expected 1` and `states the SLOT_ITEMS rule 2 times`. `origin/main`'s gate: green.
- **M4, the self-check.** The copy-count arm neutralized (`n > 99`) → four `self-check: a second copy of the <RULE> rule … does not fail the copy count` lines, one per rule.

**Limit, said so.** The count is by anchor sentence. A second copy reworded so the anchor no longer matches is not counted; that is the same blind spot the original parse has, and review is its guard.
