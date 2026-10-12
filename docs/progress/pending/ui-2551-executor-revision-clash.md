## (2026-10-12) — lint-executor-revision: a revision already taken on main fails by name, on the PR and after a squash (#2551)

**What happened.** #2529 and #2548 each raised `EXECUTOR_REVISION` 11 → 12 and each changed the
executor. Git merges two identical `12` lines without a conflict. #2548's green run compared against a
merge base at 11, from before #2529 landed, and GitHub does not re-run a PR's CI when the base moves. On
main's push run after a squash, the gate's merge base of HEAD and `origin/main` is HEAD itself, so it
compared the squash commit with itself and would have passed too.

**The fix, in `apps/plugin/lint-executor-revision.ts`.** Two comparisons beside the merge base:

- **The first parent, whenever HEAD is already on the base branch.** Main's push run now also compares
  the tree with `HEAD^`, so a squash that changes the executor without raising the number above its
  parent's fails as `did not rise (12 → 12) against the first parent …`. This one always runs, so it is
  the backstop: the clash can still land, but main goes red on the run after it. `fetch-depth: 0` was
  already on the checkout, so the parent is there.
- **Main's current number, on a PR.** In CI on a pull request the gate fetches the base branch again at
  run time and fails a branch that changed the executor with a number main already holds:
  `EXECUTOR_REVISION 12 is already taken: origin/main reached revision 12 after this branch left it`,
  naming the commit that set it and the number to raise to. A failed fetch is a failure, not a fall back
  to the stale ref. Locally nothing is fetched. This narrows the window to the minutes between a run's
  start and the merge; it cannot reach a run that already finished.

On main the merge base (HEAD) is still compared too, so a local checkout of main with an uncommitted
executor edit still needs a bump.

**The self-check.** The gate first replays #2529/#2548 in a `$TMPDIR` repo (local `file://` git,
`GIT_CONFIG_GLOBAL=/dev/null`, as `tools/claude-md-freshness/mutations.sh` does) and asserts six literal
outcomes: B at 12 fails as taken at PR time and as not rising after its squash; B at 13 passes both ways;
a docs-only commit passes both ways. The case count is hand-written (6), not derived. Run against #2548's
real head (526ed662) with `GITHUB_BASE_REF=main`, the gate fails as taken, naming dc9523ce (#2529).

**Not done, on purpose.** No repo setting changed. "Require branches to be up to date before merging"
or a merge queue is what makes a PR's green run mean the merged tree; that is the owner's call and is in
the PR as a recommendation. The sibling git-history gates (`lint-emission-version.ts`,
`lint-component-surface.ts`, `lint-component-renames.ts`, `lint-materialization-renames.ts`) take their
merge base the same way, so on main's push run they also compare HEAD with itself; reported, not fixed
here.
