## (2026-11-20) — The POC scorecard harness: the one-page KPI table for both arms, from records (#3408)

**What changed.** A new measurement tool, `tools/poc-scorecard/`, with no engine change. This is item 2 of the arm 1
plan on #3408.

- `measures.ts` lists the brief's 16 KPI rows by hand, and the arm 1 command for each row that can be measured now (10).
- `scorecard.ts record` stores each run's exit code, summary line, value and commit. `render` writes the card.
- The self-test holds the card honest:
  - a missing record reads "not measured";
  - a failed run reads FAIL, with its line;
  - a pass whose summary isn't parsed reads "unparsed";
  - a planted API mismatch shows its count;
  - none of these ever reads 0.

**Arm 1, measured:**
- KPI 2: token parity, 1,770 bindings in the HTML/CSS form and 1,666 in the component form; API parity, 57 props matched
  against the defs. The API mismatches against Figma read 4 (owner decision A on #4424). That's one per Figma-exposed
  prop the element lacks: `emphasis` and `weight` on each field. `api-mismatches.ts` measures it from the defs and the
  elements' `custom-elements.json`, so it works for arm 2's manifest unchanged.
- KPI 3: geometry across the two forms, 300 checks; axe, 800; the accessibility tree, 1,522; keyboard, 388; right to
  left, 438.
- Figma geometry reads FAIL until the Mac record lands.

**Not measured yet:** KPI 1 and ejection (plan items 3–5), and arm 2, which needs read access to the contributor's
repo.

**Review fix.** `api-mismatches.ts` refuses to report a count when no manifest element matches a def, since a 0 there
would compare nothing. That guard is now `unmeasurable()`, shared by the CLI and an 11th self-test case, which fails by
name when the guard is emptied.
