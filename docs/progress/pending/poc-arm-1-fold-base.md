## (2026-11-21) — In the carried repo, the git-history gates judge a carry from the newest main it carries (#3408)

**What broke.** `poc/arm-1` is carried, commit for commit, into another repository and opened there as a PR into that
repository's `main`. Its `gates` job failed at `lint-emission-version.ts` with FOLD INTEGRITY, 5 problems: five change
notes "not in the 0.238.0 section — the fold deleted a note". In prism3 the same commit passes. #4394 fixed this cause
for `test.ts`' replays; the gates themselves still had it.

**Why.** The carried repo's `main` is a seed snapshot of prism3 (Nov 7) plus its own commits, an earlier carry merged
in. `GITHUB_BASE_REF` is `main`, so the ladder reads `origin/main`, and `carriedMain` steps aside for a ref named `main`.
The diff then ran from the snapshot, and prism3's own 0.238.0 fold read as this diff's fold. The 5 notes are the ones a
correction on `main` changed after the snapshot, so their prose at that base is not what the fold wrote. Reproduced
exactly in a simulated carried repo (seed commit with no shared history, the earlier carry merged in, CI's merge commit
as HEAD): the same 5 notes. Running every other git-history gate there, two more fail the same way:
`lint-progress-order.ts` (FOLDED ENTRIES, 387 problems, every fragment the seed held "landed" on the seed's day; and ONE
WRITER (log)) and `lint-executor-reach.ts` (`main`'s revisions 55 to 66 measured as one span). They had not run because
the job stopped at the first failure.

**The fix.** `carriedMainBase` in `comparison-base.ts`. Emission-version and executor-reach use it after their existing
base choice; progress-order uses it for the one read that failed, the `main` whose first-parent chain says where a
fragment landed. (Its ONE WRITER (log) failure followed from FOLDED ENTRIES: a diff is fold-shaped only when that arm
passes. Moving its diff base too changed nothing a test could see in the carried layout, so it was taken out.) It
reads the `main` the tree carries from the tree's own history, as #4394's `carriedFold` does: the oldest single-parent
commit setting HEAD's `ENGINE_VERSION` is the fold (a squash copying it comes later). It steps in only when the base
lacks the commit the fold was made on, the fold's first parent. In prism3 every base holds that commit, since `fold.ts`
runs on `main`, so the gates are exactly as strict there as before. Then it follows `main`'s first-parent chain past the
fold (an integration branch takes `main` in as a merge's second parent, so its own commits never join) to the chain's
one tip. At `b410e7ee` that tip is `0d7d289f`, which is `git merge-base HEAD origin/main` in prism3, so the carried repo
now reads the same base prism3's own run reads. The fold alone was not enough: it carries executor revision 59, and the
tree 66. Where the chain forks, the fold is the base (stricter, never looser). A shallow checkout keeps the old base,
which fails loud.

**Proved.** In the simulated carried repo, all three gates pass after (PR run on a seed-only `main`, PR run with the
earlier carry merged, and the push run once the carry merges). New arms in `test.ts`' integration replay build the
carried layout and run the real gates. Two controls show the gates still have teeth: the carry's own patch note over its
own moved artifact fails NOTE SHAPE, and in prism3's layout a fold PR that drops a note's prose fails FOLD INTEGRITY.
Mutations, each committed in its own worktree and each failing named arms: `carriedMainBase` returning null (5 carried
arms) · the made-on test dropped (the fold-PR control and 3 of #3833's refresh arms, so that test is what keeps prism3
strict) · the fold as the base instead of the chain's tip (4 arms, executor-reach's among them) · emission-version
without the call (3 arms) · progress-order reading landings from `origin/main` again (FOLDED ENTRIES).

**The other gates that read `GITHUB_BASE_REF`.** Each was run in the simulated carried repo. `lint-materialization-renames`,
`lint-component-surface`, `lint-component-renames`, `lint-contract-version`, `lint-release-notes` and
`lint-executor-revision` pass there. They read the same stale base, but at this carry nothing in their subject differs
in a way that fails: a later carry could still trip them. Filed as #4452. `apps/plugin/test-loose-host.ts`'s register is shrink-only, so
a stale base is a superset and cannot fail it. `lint-push-base.ts` replays with `GITHUB_BASE_REF` unset, and
`lint-doc-gates.ts` only reads the name as text.

**Review fixes.** A carry cut from `main` past the fold joined `main`'s first-parent chain, so with no `main` commit after
the cut the chain's one tip was the carry's own head, and its own violation passed silently. Such a tip (HEAD or one of
HEAD's parents) now falls back to the fold; a new carried-repo arm cuts a carry from `m2` and requires NOTE SHAPE by name,
and dropping the guard fails it. The helper covers only the first carry after a fold: once the carried `main` holds the
fold, a later carry bringing newer `main` commits keeps the earlier carry's merge as its base. The docstring says so, and
it is filed as #4453 rather than changed here.
