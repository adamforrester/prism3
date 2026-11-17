## (2026-11-17) — Release notes on an integration branch are judged from the main it carries (#3863)

**What broke.** `lint-release-notes.ts` failed every PR into `poc/arm-1` with 86 problems in notes `main`'s own
run had passed: #3834, and #3863, a real merge of `main` into the branch. #3833 refreshed `poc/arm-1` from `main`
and landed as a squash, a96bdd6a: one parent, setting `ENGINE_VERSION` to 0.238.0. The gate takes a version's
fold to be the newest single-parent commit in HEAD's history that sets it, so it read the squash as 0.238.0's
fold and judged the release over `be03a0dc..a96bdd6a` instead of `main`'s `..c2b04b5e`. That diff holds every
change note `main` added and folded since the branch forked (NOTES), and `main`'s work after the fold (MISSING).
The squash stays on the branch's first-parent chain, because the branch is never force-pushed. So an ordinary
PR into the branch after #3863 merges fails the same way, and `integrationBase` (#3836) does not cover that case:
it returns null for a PR that brings in no new `main`.

**The fix.** `comparison-base.ts` gains `carriedMain`, the merge base of HEAD and `main` when the base ref is not
`main`; `integrationBase` now calls it. When `GITHUB_BASE_REF` names another branch, `lint-release-notes` walks
the folds from that point. Only `main` folds, so a version's fold is the commit on `main` that folded it. On `main`, on
PRs to `main`, on merge-group runs and on local runs (no `GITHUB_BASE_REF`) it walks HEAD's own history, as before.
The report line now says which history the gate walked.

**Evidence.** On #3863's head (5444d364), with `GITHUB_BASE_REF=poc/arm-1`, the gate fails with 86 problems before
the fix and passes after: 0.238.0 is read over `be03a0dc..c2b04b5e`. An ordinary commit on top, with
`origin/poc/arm-1` at 5444d364, fails the same way before the fix and passes after. A `test.ts` replay builds the
same shape: a branch forked before `main`'s note, `main` squashed in, then merged for real. It asserts these cases by
name: the integration PR passes, reading the fold from `main`; the same tree walked from HEAD fails NOTES; an
ordinary PR after the refresh passes; and a release that drops a folded note fails NOTES on a PR to `main` and on a
PR to the branch.

**The other history gates on `poc/arm-1`.** Each git-reading gate ran with `GITHUB_BASE_REF=poc/arm-1` on 5444d364:
`lint-executor-revision`, `lint-executor-reach`, `lint-progress-order`, `lint-emission-version`,
`lint-component-surface`, `lint-component-renames`, `lint-materialization-renames`, `lint-contract-version`,
`lint-push-base`, `lint-advisory-expiry`, `lint-decisions-index` and the rest of the engine gates that call git.
All pass. Only `lint-release-notes` failed.
