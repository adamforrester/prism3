## (2026-10-15) — A fold that leaves a fragment or note pending fails by name (#2663)

**The hole.** The review of the open fold PR found it cut on one commit of `main` and headed for a later
one: two PRs had since landed a fragment each. Merged, the fold would have left both pending, and every
gate passed it. `lint-progress-order.ts` read the diff as "exempt — a pure fold", because FOLDED ENTRIES
checks only the files a fold deleted, and it cannot see a file the fold never had. `lint-emission-version.ts`
checks the class of the notes a fold consumed, not that it consumed them all. GitHub does not re-run a
PR's CI when its base moves, so the fold's own green run was stale as well.

**The fix.** A new arm in `lint-progress-order.ts`, LEAVES NOTHING PENDING. A diff that deletes a pending
fragment or change note is a fold. On the tree it merges into, no fragment or note may still be pending,
except one the diff adds itself (a fold's fragment for a semantic-conflict fix it carries). "The tree it
merges into" depends on the run:
- CI's merge ref: HEAD.
- A fold branch run locally: HEAD's pending files, less those the base ref has consumed since the merge
  base, plus those it has added.
- Main's push run: HEAD, over its first parent.

The push run is the one that sees the fold on the `main` it actually landed on. The arm is not skipped
there, unlike CARRIES AN ENTRY. A diff that consumes nothing prints n/a. The subject is the diff's
deletions, and the oracle is an `ls-tree` of both directories, so neither side reads `fold.ts`.
`fold.ts` is unchanged: it already refuses a HEAD off `origin/main`, so it consumes everything at its own
base. Only the gate can see `main` move afterwards. No engine behavior moved, so no change note.

**Partial restamps (the same review).** `lint-emission-version.ts`'s header gains a third limit. A fold
moves `ENGINE_VERSION` forward, so the gate passes it even when one emitted tree keeps the old stamp.
Only `regen.ts --check` (verify's `drift` row) fails that, so `drift` is load-bearing for every fold.

**Proof, on a synthetic fold in a throwaway clone** (`git clone` of the branch, `fold.ts` run for real).
Fold A was cut at M0. Then "main" moved to M1 with one fragment and one note. Fold B, re-cut at M1, is the
control. Each scenario ran main's gate and the fixed gate side by side:

| Scenario | main's gate | fixed gate |
|---|---|---|
| Fold A on its merge ref (CI) | exit 0, "exempt — a pure fold" | exit 1, LEAVES NOTHING PENDING: 2 file(s) |
| Fold A on its branch, `origin/main` at M1 | exit 0 | exit 1, LEAVES NOTHING PENDING |
| Fold A squashed on main, push run | exit 0 (the arm block is skipped on push) | exit 1, LEAVES NOTHING PENDING |
| Fold B, branch / merge ref / push | exit 0 | exit 0, "leaves nothing pending" |
| An ordinary PR on M1 | exit 0 | exit 0, n/a, not a fold |
| Fold B plus its own fix fragment | exit 0 | exit 0, its own fragment is not left behind |

**The first formula was wrong, and test.ts caught it.** The first version counted everything pending at
HEAD. `test.ts`'s #1880 fixture (a) is a branch that merged main and folded what that merge brought in. It
still holds two fragments that main's own fold had consumed since the merge base, so the merge deletes
them, yet the arm reported them as left behind. The arm now subtracts what the base ref deleted since the
merge base. **Committed cases**, in the same scratch-repo block (`test.ts` (f)): fixture (a) passes; a
stale fold fails by name on its branch, its merge ref and its squash's push run, naming the late
fragment; the re-cut fold passes. Each arm of the new code, mutated, fails a named case there:

- The arm disabled (main's behavior) → three failures. "#2663 leaves nothing pending: a fold cut before main
  moved fails by name on its branch, its merge ref and main's push run…" reads exits 0, 0, 0. The (a) case
  and the re-cut case fail too, because their pass line is gone.
- The push-run call removed → that same case, exits 1, 1, 0.
- The base ref's additions dropped → the same case, exits 0, 1, 1.
- Main's consumption not subtracted → "#1880 folded entries: one merge of main brings two fragments…" and
  "#2663 leaves nothing pending: a branch's fold beside main's fold of the rest passes…".
- Not in `test.ts`: the exemption for a fold's own added file. The synthetic harness above covers it
  (row "Fold B plus its own fix fragment").

**A trap for whoever reruns this.** A `node_modules` symlink in the clone shows as untracked, because
`.gitignore`'s `node_modules/` matches directories only. `fold.ts` then refuses a dirty tree. Add it to
the clone's `.git/info/exclude`.

**The fold being redone tonight is not touched.** This PR changes no fold file. A correct re-cut fold
(B above) passes all three runs.
