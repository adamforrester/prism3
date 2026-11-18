## (2026-11-18) — A restore of a path with uncommitted work saves that work to a named stash entry first (#1050)

**What ships.** `.claude/hooks/pre-tool-use-restore-autostash.mjs`, a PreToolUse hook for Bash, and its battery
`tools/restore-autostash/mutations.sh`. When a command restores a path with uncommitted tracked work, the hook saves the
tree's uncommitted work as stash entry `auto-before-restore-<UTC stamp>`, reports the entry's commit SHA and how to get
a file back (`git show <sha>:<path>`), and lets the command run. It is live only once the owner adds the hook's entry to
`.claude/settings.json`. The entry is in the PR body, because agents never edit that file.

**Why `stash create` + `stash store`, not `stash push`.** `create` builds the stash commit without touching the index or
the working tree, so the restore does exactly what it would have done without the hook. `push` resets the paths to HEAD
first, which changes the result of a restore from the index: with staged work and a different unstaged edit,
`git checkout -- f` should leave the staged text, and after a push it leaves HEAD's. Arm P12 pins this, and mutant M3
(push in place of create) fails it as CHANGED.

**Named, and reported by SHA.** The stash stack is shared by every worktree and session, and a bare `git stash pop` took
another session's entry (#923). So the entry carries a name, and the report gives the commit SHA, which never moves,
rather than `stash@{n}`, which shifts as others push. Recovery never needs a bare pop or drop, so #923's guard and this
hook do not conflict.

**False-denial cost: none.** The hook never refuses a restore unless the work is dirty and the stash write failed (arm
F1). Its cost is one stash entry per restore of a dirty path, deliberate discards included.

**Stated limits.** It cannot see a restore built at runtime (`$(...)`, `eval`, `xargs`, a script file). It does not hold
an untracked file that `git checkout <ref> -- <path>` overwrites because `<ref>` tracks it, since `git stash create`
holds tracked work only. `git reset --hard`, `git checkout -f <branch>` and `git clean` are not path restores and are out
of scope.

**Measured.** `sh tools/restore-autostash/mutations.sh`: 27 passed, 0 failed. That is 13 restore forms, 6 negative arms,
the fail-closed arm, and 7 mutants, each failing its named arm for its named reason: M1 broken `checkout` matcher (P1,
NOSTASH), M2 unnamed stash (P1, UNNAMED), M3 `push` in place of `create` (P12, CHANGED), M4 always-dirty check (N1,
STASHED), M5 `cd` not followed (P7, NOSTASH), M6 deny dropped (F1, NODENY), M7 `sh -c` not read (P10, NOSTASH). The
battery's first draft counted stash entries by name in the NOSTASH check, so M2 reported NOSTASH rather than UNNAMED.
That is the right arm for the wrong reason, which docs/34 corollary 4 counts as a failed mutation. The two questions are
now asked separately.
