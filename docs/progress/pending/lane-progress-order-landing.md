## (2026-10-01) — The progress-order gate reads landing order only where main recorded it, so a branch that merged main no longer fails a correct fold (#1880)

**STATUS: PR open from `lane/progress-order-landing`, labeled DO NOT MERGE.** Lint and test only: no ENGINE bump, no CONTRACT bump, no change note. No emitted artifact moves.

**What was wrong.** The FOLDED ENTRIES arm of `lint-progress-order.ts` read each fragment's landing commit from HEAD's first-parent history. On a branch that merged `main` in, that merge commit sits on HEAD's chain, and its first-parent diff adds every fragment `main` landed since the previous merge in one go. Those fragments share one landing commit, so the stable sort falls back to file-name order, and a correct fold reads as wrong. #1880 hit it after one merge of `main`. #1921 (closed as a duplicate) is the same tie, reached by a branch that merged `main` once before fold #1911 and once after it: on `ui/s1-2-frame`, `lane-vercel-preview-scope` and `lane-write-safety-floor` both "landed" at the branch's merge `b3a41bdf`. The header already promised the opposite: "folds that reached it through the second parent are simply not seen — less coverage, never a false failure."

**What changed.** A landing is trusted only when the commit that added the fragment is on `main`'s own first-parent chain: HEAD on a push run, which is `main`; otherwise `origin/main`, then `main`. Fragments that landed anywhere else (a merge of `main`, or the branch's own commits) are counted and named in the pass line as not seen, rather than ordered. Two choices were deliberate:
- **Not GITHUB_BASE_REF.** A stacked PR's base is another branch, and the fold writes `main`'s order, not that branch's. The CARRIES AN ENTRY arm keeps its own ladder, because it asks a different question (this PR's diff).
- **Drop, rather than re-derive from `main`'s history.** Walking `origin/main`'s chain instead of HEAD's would order more fragments on a branch. But it would need a second rule for where a fragment's last content lives when the branch, not `main`, deleted it. CI runs on a merge ref whose first parent is `main`, so every fragment `main` landed is still seen there. Only the local run on a branch loses coverage.

**Tests.** `test.ts` builds a scratch repo, copies the gate into it, and runs it under a scrubbed git environment with literal expectations, line numbers included:
- (a) one merge brings two fragments `main` landed in order, and the branch folds them: passes, 2 not seen.
- (b) the branch merges `main` before and after `main`'s fold: passes, still ordering the 2 fragments that landed before the fork.
- (c) a hand-moved folded entry fails by name on `main` (push run) and on the PR merge ref. Each has a passing control.
- (d) on the branch itself, a hand-moved entry for a fragment that landed before the fork still fails by name. A hand-move of entries that arrived through the merge is not seen by this arm (the header's stated limit). ONE WRITER fails that diff instead, and the merge ref in (c) fails it by name.

**Mutations** (each after a `wip:` commit, diff checked non-empty, restored with `git checkout --`):

| Mutation | `test.ts` | Fails by name |
|---|---|---|
| M1: the fix reverted (the gate as on `main`) | 3 failed | (a) and (b), each with the old false failure `lane-bravo.md sits ABOVE … lane-alpha.md, but it landed EARLIER`; also (d)'s stated-limit arm, because the old code sees all 4 |
| M2: the ordering comparison disabled (`if (false && …)`) | 3 failed | (c) on `main`, (c) on the merge ref, and (d)'s pre-fork hand-move |

**Re-verified by hand.** The fixed gate passes on `origin/main` (31 folded fragments, push and local run). It passes on `ui/s1-2-frame` at `bc7ccf8a` (27 seen, 4 not seen), where the unfixed gate fails with #1921's exact line. It also passes on a simulated merge ref of that branch onto `origin/main` (31 seen).

**Trap for whoever re-verifies.** The pass line's "N more … not seen" count is not a defect on a branch. It is the coverage the branch gives up locally, and CI's merge ref checks those fragments. On `main` or a merge ref the count should be absent. If it appears there, `origin/main` is stale or missing locally (`git fetch origin main`).
