## (2026-10-14) — CONTRACT_VERSION is held against the base's number, not only against its own baseline (#2334)

**The gap.** `token-contract.ts --check` compares the live surface with the committed baseline, and
`CONTRACT_VERSION` with the baseline's recorded `contractVersion` (#1768). Every side of both comparisons
is in the tree under check. So after an `--accept`, writing the previous number back into `version.ts`
and into the baseline's `contractVersion` left a tree that agreed with itself, and every gate passed.
`--accept`'s refusal guards only the accept.

**The fix.** New gate `lint-contract-version.ts`. It reads the committed baseline and `CONTRACT_VERSION`
at the merge base with `git show`, the same pair in the tree, and requires a MAJOR increment over the
base's number for a removed or retyped guaranteed path, at least a MINOR for an added one, and the base's
exact number when nothing moved. On main's push run the merge base is HEAD itself, so there it compares
with the first parent (#2551, #2556). The tree side is the files on disk, as `token-contract.ts --check`
reads them. No engine behavior moved, so no change note.

**Restated, not imported.** The path diff and the increment rule are written out in the gate rather than
taken from `classify` and `satisfiesBump`, which are what `--accept` decides with (docs/34 shape 2). A
self-check holds the gate's copy to 11 literal cases before the real run, including a numeric `9.9.0 →
9.10.0`. A demotion leaves the guaranteed set, so it counts as a removal, which is how `classify` levels
it too.

**Proofs.**
- *The issue's own mutation, done for real:* an engine edit that adds `core.palette.probe` to every
  brand, `--accept` at 14.8.0, then 14.7.0 written back into `version.ts` and the baseline.
  `token-contract.ts --check` prints "✓ token contract unchanged" and exits 0; this gate fails with
  "CONTRACT_VERSION 14.7.0 needs at least a MINOR increment over the base's 14.7.0".
- *Control:* the same change accepted at 14.8.0 passes.
- *The rule mutated* (a MAJOR accepted at the same major number) fails the self-check by case name.
- *History:* all 214 first-parent commits on main that touched the baseline were checked against their
  parents with the same rule. None fails, so the rule matches how the repo has bumped and does not turn
  main red on landing.

**Two PRs, one number.** Two open PRs that each raise 14.7.0 to 14.8.0 for different additions make the
identical edit to the number, so git merges them with no conflict, and each PR's run passed against a
merge base at 14.7.0. Two arms, the #2555 shape: a branch that moved the surface is also held to the
base branch's current number (in CI the base is fetched again at run time, and a failed fetch fails), and
main's push run compares the squash with its first parent. Replayed once in a scratch clone: main at
14.8.0 with one addition, a PR from the old base claiming 14.8.0 for another fails ("origin/main moved the
number after this branch left it"); the same PR at 14.9.0 passes; and the clashing squash on main fails
against its parent while `token-contract.ts --check` says unchanged.

**The first-parent arm had no guard (review).** Forcing `onBase` to false passed: on a push run the merge
base is HEAD, so a squash that lowered 14.7.0 to 14.6.0 was compared with itself and printed `✓`, the
#2556 shape. Nothing on a pull request's tree reaches that step, and #2617's `lint-push-base` (which
replays the other git-history gates) is not on main yet. So the gate now replays the push run itself on
every run: a scratch repo whose main has just taken a squash lowering the number, `origin/main` at HEAD,
and this file run there in a child. It must refuse with "is BELOW the base's" against the first parent,
and a control commit after it that moves nothing must pass. Mutations: `onBase` forced to false → `✗ push
run, a squash lowers the number: expected a refusal …`; `HEAD^1` replaced by `HEAD` → the same line. The
child reads the scratch repo through `P3_LINT_CONTRACT_VERSION_REPLAY_REPO`, which only the replay sets.
Once #2617 lands, a `lint-push-base` case can replace this. The review's nit is fixed too: a raised
number now reads `14.7.1 was raised over the base's 14.7.0`, where the number had landed after the clause.
