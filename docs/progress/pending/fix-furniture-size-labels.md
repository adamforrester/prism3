## (2026-11-07) — Canvas furniture names every size: `size` is labeled past the row-depth cap (#3475 part 2)

**The gap.** On the Badge page the canvas furniture labeled `type`, `style` and `emphasis` but not `size`, so the
medium and small rows had no name. The cause was general, not Badge's: `planFurniture` labels the outer
`ROW_LABEL_DEPTH` (3) row axes, and `size` always sits last among the row keys, because `planComponentName` gives it a
fixed place after the declared axes. Any set with more than three labeled outer row axes lost exactly `size`. Measured
over every def with a `size` axis: Badge, Accordion, Link and Pagination item had the gap; every other set already
named its sizes, as rows or as its grid columns.

**The fix.** `size` is labeled even when the cap cuts it, the way the Inverse bracket is already extra, and in row-key
order, so it stays the bracket nearest the set. The cap itself, held for the owner, is unchanged: raising it to 4 would
have also drawn Link's `selection` and Pagination item's `labeled` brackets, which nobody asked for. No new on-screen
words: every size value these four sets now show ("Medium", "Small", "Large", "X small") is already drawn on other
sets' furniture.

**The gate.** `test-canvas-furniture.ts` `rollout/<def> sizes`: for every def whose own axes declare `size` with two or
more values, each value is drawn as a label, row or column, in the label wording written out in the test rather than
read off `sentenceCase`. Mutation: the cap applied to `size` again fails `rollout/badge sizes`, `rollout/accordion
sizes`, `rollout/link sizes` and `rollout/pagination-item sizes`, and nothing else.

**Not in scope.** Part 1 of #3475, Badge's label sizes across styles, is an owner decision still open.
