## (2026-11-20) — The integration-branch replays find the main a tree carries by its own history, in any repository (#3408)

**What broke.** `poc/arm-1` is carried, commit for commit, into the POC repository, where the same CI runs. There
`gates` failed 3 arms of `packages/engine/test.ts` on two carries in a row: the #3833 progress-order arm (FOLDED ENTRIES,
355 problems) and the two #3863 release-notes arms (`no fold commit sets 0.237.0`). In prism3 they pass.

**Why.** The replay commits the working tree as W on the `main` the tree carries, then runs the real `fold.ts` and the
real gates over W's history. It found that `main` as the merge base with `origin/main`. In the POC repository that ref
names a different `main`: a seed snapshot plus that repository's own commits, with or without an earlier carry merged
in. W landed on HEAD (no merge base) or on `poc/arm-1`'s own first-parent chain (an earlier carry), the gates read that
history, rightly called it wrong, and the arms failed on code that had not regressed. The gates were right; the
fixture's premise was wrong.

**The fix is in the fixture, not the gates.** `carriedFold` reads the carried `main` from the tree's own history: the
fold that set the `ENGINE_VERSION` HEAD commits. A squash of `main` into the branch (#3833's a96bdd6a) also sets a
version with one parent, but a copy can only come after the fold, so the oldest such commit is the fold. Its
first-parent chain is `main`'s own, and it is in every repository the tree's commits are in. Where it is truly absent
(a shallow clone, or no single-parent commit sets the version), a named arm fails, and the replay does not run.

**Proved by simulation.** Three local clones: the POC layout with an unrelated `main` (3 arms failed before, 15/15
after), the POC layout with an earlier carry merged (1 failed before, 15/15 after), and a normal prism3 layout (12/12
before, 15/15 after). Mutations, each failing by name in both the unrelated-`main` and the prism3 layouts: progress-order
without `integrationBase` (the #3833 arm) · release-notes walking from HEAD (both #3863 arms) · release-notes on
`integrationBase` in place of `carriedMain` (the ordinary-PR arm). And on the fixture: the old merge-base derivation
fails the new synthetic arm by name (and the 3 arms again in the POC layout); the newest commit taken as the fold fails
both synthetic arms by name.

**After the refresh (#4379).** `main`'s #3985 premise block, carried in by refresh 4, found its base as the merge base
with `origin/main` and SKIPPED the replay (exit 0) wherever that failed. In the POC repository it always fails, so the
replay would have gone quiet there. Merged in with a real merge commit, the block now reads its base from
`carriedFold` (`replayPremises`), keeps its anchor and release-notes checks against that fold, and a broken premise
FAILS by name in every repository: a missing carried fold (a shallow checkout, or no single-parent commit setting the
version) is CANNOT DETERMINE, never a skip. New synthetic arms run the premises with no ref carrying the tree. Re-proved
in a simulated POC repository (remote `upstream`, branches `trunk` and `integration/…`, no prism3 `main`, CI's checkout
the carry merged into the POC's own trunk): before, the replay printed `⊘ SKIPPED` and exited 0; after, the full suite
passes with every assertion site run, and with the base put back on the merge base it fails by name. A depth-5 clone
fails `#3985 integration replay: … CANNOT DETERMINE …`.
