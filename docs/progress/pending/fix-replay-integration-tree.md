## (2026-11-17) — The integration-branch replay builds its clone on the main the tree carries (#3842)

**What broke.** #3836's `test.ts` arm, "#3833 AN INTEGRATION BRANCH REFRESHED FROM MAIN", passed on `main` and
threw on the kind of branch it was written for. On #3833 (base `poc/arm-1`) CI's `engine` job stopped at
`test.ts` with `fold refused — the log's newest entry is dated 2026-11-15, later than
docs/progress/pending/poc-arm-1-s2-css-button.md's landing date 2026-11-08`. The gate itself,
`lint-progress-order.ts`, passes on that tree. The arm commits the working tree as W on top of HEAD and runs
the real `fold.ts`. On an integration branch HEAD's first-parent chain is that branch, whose own entries stay
pending and never fold, so S2's entry read as landing on 2026-11-08, older than `main`'s newest folded entry.

**Why not drop the integration branch's fragments.** CONTRIBUTING §2 says every PR carries an entry, except a
pure fold. #3836 already judges a refresh from the `main` it carries and states that CARRIES AN ENTRY finds the
branch's still-pending fragments. So the POC branch keeps its entries, and the fixture adapts. Deleting them in
W, the direction #3842 sketched, fails FOLDED ENTRIES instead: the fragment's add is on the chain the fixture
calls `main`, and it would read as deleted without being folded.

**The fix.** W now goes on the merge base of HEAD and `origin/main` (then `main`, else HEAD), with the working tree
as one commit, so an integration branch's entries land at W the way any PR's land at its merge. On `main`
nothing changes. The clone also drops every ref it inherits, which fixes #3842's local-only failure: a local
`poc/…` branch blocked the fixture's `poc`.

**Evidence.** A new synthetic case builds an integration branch (its own entry, then a merge of `main`) and asserts
the entry lands at W, on the carried `main`, and that only `main` reaches the clone. Mutations, each failing a
named case on `main`'s own tree: W on HEAD again, and the inherited refs kept. On #3833's real tree the arm throws
with CI's message before and passes after, run from a local `poc/…` branch.
