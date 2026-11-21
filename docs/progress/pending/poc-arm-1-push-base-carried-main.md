## (2026-11-21) — In the carried repo, the push-base replay of progress-order reads landings from the newest main carried (#3408)

**What broke.** After #4439, the carried PoC repository's gates run (head `860a36fb`) passed FOLD INTEGRITY and then
failed engine step 13, `lint-push-base.ts`: 2 problems, both progress-order's merge-queue cases, "CONTROL read against
origin/main" and "and keeps the rule". Each expected a pass and got FOLDED ENTRIES (4 problems there). In prism3 the
same commit passes.

**Why.** `lint-push-base.ts` builds its replay clone with `main` at the checkout's HEAD. In the carried repo, HEAD is
the carry merged into that repository's `main`, whose first parent is the seed snapshot. Progress-order reads where a
fragment landed from its `main` ref's first-parent chain, and asks `carriedMainBase` whether that ref is the `main` the
tree carries. The helper's test was ancestry: does the ref contain the commit the fold was made on? Through the carry's
merge it does, so the helper stepped aside, and the chain it left was the seed's. Every fragment the seed held, folded
by prism3 since, read as landed on the seed and deleted without being folded. The direct run passed because there the
ref is the carried `main` before the carry merged, which lacks the fold. This is the #4453 state (a carried `main` that
already holds the fold), reached by the replay rather than by a later carry.

**The fix.** `carriedMainBase` takes `{ firstParent: true }`: the question becomes whether the ref's first-parent chain
holds the commit the fold was made on. Only progress-order passes it, because only progress-order reads a chain; the
diff readers (emission-version, executor-reach) keep the ancestry test. No second copy of the fold-finding logic. In
prism3 every ref progress-order reads is a `main` (`origin/main`, the push run's HEAD, the merge group's parent), and
`fold.ts` runs on `main`, so that commit is always on the chain and the gate is exactly as strict as before.

**Proved.** Reproduced in a simulated carried repo: a parentless seed with prism3's Nov 7 tree (`dd4ec399`), CI's merge
of `860a36fb` into it as HEAD, `origin/main` at the seed. Before: `lint-push-base.ts` fails the same two cases by name
(FOLDED ENTRIES, 392 problems; the real carried `main` has an earlier carry merged in, hence 4). After: 11/11 and 20/20.
Two new arms in `test.ts`' carried-repo replay put `origin/main` at the carry's merge and commit the next change on it,
then run progress-order as a PR into `main` and as the push run. Mutation: progress-order without
`{ firstParent: true }`, committed in its own worktree, fails both new arms by name.

**Not changed.** #4453's other half, the diff readers on a later carry, is still open: emission-version and
executor-reach keep the ancestry test, and nothing here measures them on a second carry.
