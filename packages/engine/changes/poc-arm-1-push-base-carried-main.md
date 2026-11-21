---
engine: patch
---
`lint-progress-order.ts` now asks whether its `main` ref's first-parent chain holds the commit the fold was made on,
not only whether the ref contains it (#3408). In the carried PoC repository, a `main` that has taken a carry in holds
the fold through the carry's merge, while its first-parent chain is still the seed snapshot's. `lint-push-base.ts`
replays that state, so its control and keeps-the-rule cases for progress-order failed FOLDED ENTRIES: every fragment
the seed held read as landed on the seed and deleted unfolded. `carriedMainBase` in `comparison-base.ts` takes a
`firstParent` option for this, and only progress-order passes it. In prism3, `main`'s first-parent chain always holds
that commit, so the gate is as strict as before. Gates only; no committed artifact moves.
