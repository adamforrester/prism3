---
engine: minor
---
Fixed paint and the aspect lock in hosts (#2343 PR 2), the host side of the brand marks. Two new part flags: fixedPaint
(on a slot, overlay or nest) keeps the hosted content's own paint, so the part carries no descendantFills and the plan
states fixedPaint; aspectLock (on a slot or nest) binds the part's height alone, and both executors resize the instance
to its main component's proportion and lock it before the height binds, so a card mark stays 8:5 at any height. A slot
may bind a height only under aspectLock. On Update, a glyph or mark redrawn inside its main component now reads as a
hand edit at its frame and is kept and reported (the as-built record gains an artwork hash, Baseline.art; a record
without it makes no claim), so a brand that edits a brand-mark component in Figma keeps its drawing (owner decision
Q-B3 A). And an untouched glyph that takes no host ink (a brand mark) compares its vectors' fills as well as their
paths in place, so a mark whose provider changed only a color takes the new import. EXECUTOR_REVISION 39. No def sets either flag yet; no token or projected surface moves, so CONTRACT is
unchanged.
