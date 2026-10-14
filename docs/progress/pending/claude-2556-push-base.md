## (2026-10-14) — The four engine git-history gates compare a squash on main with its parent (#2556)

**What changed.** `lint-emission-version.ts`, `lint-component-surface.ts`, `lint-component-renames.ts`
and `lint-materialization-renames.ts` read their "before" side at the merge base of HEAD and the base
branch. On main's push run that merge base is HEAD itself, so each compared a squash commit with itself
and passed whatever the squash merged: the gap #2551 found in `lint-executor-revision.ts`. Each gate now
passes its merge base through `comparison-base.ts`, which returns HEAD's first parent when the merge base
is HEAD, and fails by name when there is no parent. A PR run is unchanged: its merge base is not HEAD.
New gate `lint-push-base.ts` replays main's push run against each real gate. No engine behavior moved,
so no change note.

**The replay.** A `git clone --shared` of the checkout in `$TMPDIR`, with the working tree on top as one
commit, so an uncommitted gate edit is what gets replayed. Each case commits a squash on `main`, points
`origin/main` at it, unsets `GITHUB_BASE_REF`, and runs the gate from the clone. Two cases per gate:
a squash that breaks the rule must fail by the gate's own assertion, and the same shape with the rule kept
must pass, so a gate that failed everything on main would not read as caught. The breaking squashes are an
artifact moved with no note, a surface baseline moved with no note, a variant value gone with no ledger
entry, and an emitted variable gone with no rule. Each squash restores or touches one file, so the gate's
in-tree arms read a sound tree and only the cross-commit arm can answer. About 25 seconds.

**Mutations, each failing by name.** The helper returning the merge base again fails all four breaking
cases ("expected a failure containing …, got a pass"). Each gate's own call replaced by the merge base,
one at a time, fails only that gate's case. Before landing, main's tip (#2596) was run through all four
gates against its first parent and passes, so this does not turn main red.

**Decisions inside the fix.**
- *The parent replaces the merge base; #2555 kept both.* For a commit-to-commit gate the HEAD-vs-HEAD
  comparison is empty by construction. For the tree-reading gates it sees only an uncommitted edit, and
  the parent's comparison sees that edit too. One base per gate kept each gate's top-level flow as it was.
- *No PR-time "freshest main" arm.* The issue asks for one where a gate claims a number. Since #1807 none
  of the four has a PR claim one: a PR adds a change note named for its branch, and only a fold writes
  `ENGINE_VERSION`. Two folds from one base either write the same text (the second squash is empty) or
  different changelog text at the same lines, which git reports as a conflict. The push-run arm covers
  the rest.
- *Shared, unlike the base-ref ladders.* Which commit counts as "before" is not any gate's subject, and
  four copies would drift. The replay runs the real gates, so a regression in the shared step fails all
  four there.

**Trap for whoever re-verifies this.** On a fresh branch with no commits yet, HEAD is still on main, so a
local run compares against main's last squash rather than against nothing. That is correct, but a fold
that just landed will show up as the diff under review until the branch has its first commit.
