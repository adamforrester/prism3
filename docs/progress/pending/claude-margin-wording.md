## (2026-10-27) — Grid margin wording: the 41px columns are the reference brand's two-mode desktop spec (#3070)

**What.** #3065 explained the reference brand's md margin of 44 as "whole-pixel 41px columns at 1440". That is
true of the brand's own file, whose `layout` collection has two modes, with `md` (768+) carrying the 24-column,
16px-gutter desktop grid. It is not true of the engine fixture's 5-breakpoint grid, where `md` is 8 columns and a
44 margin gives 71px columns at 768. The `nbThemeFrom` comment and the seed `nb-redesign.design.md` comment now
say the 41px figure is the brand's desktop spec in its two-mode layout. Prose only: no emitted value moves, and
`regen --check` stays clean, so no change note is owed.

**What stays.** #3065's change note still carries the old sentence. `lint-emission-version.ts` refuses an edit to
a pending note the base already has (ONE WRITER), and `CONTRIBUTING.md` §2 says the same, so it is left as merged
and will reach the changelog at the next fold. #3065's progress fragment never carried the sentence.
