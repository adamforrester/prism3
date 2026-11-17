## (2026-11-16) — A refresh of an integration branch from main is judged from the main it carries (#3833)

**What broke.** #3833 merges 205 commits of `main` into the POC integration branch (#3408). CI failed `engine` at
`lint-emission-version.ts`, NOTE SHAPE: fifteen of `main`'s `engine: patch` notes "over 119 moved artifacts". Measured
from the POC branch's merge base, `main`'s folded emission and `main`'s pending patch notes sit in one diff, so notes
`main` had already judged correctly read as misclassed. Running every engine step after it on the same merge (CI's
`bash -e` never reached them) found two more of the same shape: `lint-progress-order.ts`'s LEAVES NOTHING PENDING read
`main`'s folds as this diff's fold (384 fragments, 257 notes), and `lint-executor-reach.ts` measured revisions 55 → 60
as one span and flagged 12 sets that `main` had measured step by step. A probe past NOTE SHAPE showed FOLD INTEGRITY
next in line, so exempting `main`'s notes arm by arm would have meant a carve-out in five arms.

**The fix.** One helper beside `comparisonBase`: `integrationBase` in `comparison-base.ts`. When the PR's base is not
`main` and the merge base of HEAD and `origin/main` is not already in the PR's merge base, the "before" is that commit,
the newest `main` the PR carries. `main`'s side then leaves the diff; what remains is the branch's own delta over
`main`, the refresh's resolutions included. The three failing gates adopt it; the other git-history gates pass on
#3833 and are unchanged. An ordinary PR into the branch, every PR into `main`, merge-group runs and main's push runs
keep their base.

**The deliberate tradeoff.** From that base the branch's own earlier work is judged again, cumulatively, against
`main`, which is stricter than its own PRs were, never looser about anything `main` did not already hold. And on a
refresh, CARRIES AN ENTRY finds the branch's still-pending fragments as well as the refresh's own.

**Evidence.** `test.ts` replays the shape against the real gates in a `--shared` clone with the real `fold.ts`: a
pending minor note, a fold, a patch note on `main`; a branch with its own pending entry; the refresh. Before the fix
the refresh fails emission-version and progress-order with CI's own messages; after, all three pass, and two controls
still fail NOTE SHAPE by name (the refresh's own patch note over its own moved artifact, and an ordinary PR into the
branch). Five mutations each fail a named case: the helper returning null, each gate dropping its call, and the
`ahead` guard inverted. On #3833's real tree, merged with this fix, all three gates pass.
