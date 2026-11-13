## (2026-11-12) — CI runs on merge_group, ready for a merge queue on main (#3698 R3, part 2)

**What.** Owner decision R3 on #3698 (F6): a merge queue that runs `regen --check` on the merged result, the one
failure a text merge cannot see (two clean merges that leave `out/` stale or `main` red). `ci.yml` now also
triggers on `merge_group` (`checks_requested`), so every job, and the `gates` check the merge rule reads, runs on
the queue's commit. Turning the queue on is a repository setting only the owner can change; the PR carries the
steps. Until then the trigger never fires.

**No gate needed a change, measured against each ladder.** In a merge-group run `GITHUB_BASE_REF` is empty and the
checkout is the queue's commit, whose first parent is `main` (or the group queued ahead). Every git-history gate's
ladder therefore falls to `origin/main`, whose merge base with HEAD is `main`'s tip, and each compares the queued
result with `main`. `lint-progress-order.ts` skips its CARRIES AN ENTRY arm only on `push`, so a queued PR still owes
its fragment. The `gates` job runs `if: always()`, so it reports in the queue too.

**The gate.** `lint-doc-gates.ts` gains `triggerGaps`. `ci.yml` must run on `pull_request`, on a push to `main`, and
on `merge_group` with `checks_requested`, because a queue whose required check nothing starts holds every PR
forever. It is self-tested over hand-made `on:` maps, and dropping the real trigger fails it by name.

**Not observed.** No merge-group run has happened, because the queue is off. The first queued PR is the first real
exercise of the reasoning above.
