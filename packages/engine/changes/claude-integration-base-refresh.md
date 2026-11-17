---
engine: patch
---
A pull request into a branch other than `main` that merges `main` in is now judged from the newest `main` it carries
(#3833). `lint-emission-version.ts`, `lint-progress-order.ts` and `lint-executor-reach.ts` read such a refresh from
its base branch's merge base, so `main`'s own change notes, folds and executor revisions, each already judged by its
own run, failed again: patch notes over `main`'s folded emission, `main`'s folds read as this diff's fold, and five of
`main`'s executor revisions measured as one. The shared `integrationBase` in `comparison-base.ts` picks the newer
base; an ordinary pull request into the branch, and every pull request into `main`, keeps its merge base. Gates only;
no committed artifact moves.
