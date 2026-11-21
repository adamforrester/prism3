---
engine: patch
---
A pull request whose base branch is not the `main` its tree carries is now judged from the newest `main` it does carry,
found in its own history (#3408). Carried into another repository and opened against that repository's `main`, a stale
snapshot of prism3, `lint-emission-version.ts`, `lint-progress-order.ts` and `lint-executor-reach.ts` read the diff from
the snapshot, so prism3's own fold since it read as this diff's fold, its fragments as landed at the snapshot, and its
executor revisions as one span. Progress-order moves only the read of where a fragment landed. The shared `carriedMainBase` in `comparison-base.ts` finds the fold that set HEAD's
version and follows `main`'s first-parent chain past it to its tip. It steps in only where the base lacks the commit the
fold was made on, which no base in prism3 does. Gates only; no committed artifact moves.
