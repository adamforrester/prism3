## (2026-11-19) — A guard against a bare `git stash pop`, `apply` or `drop` (#923)

**What ships.** `.claude/hooks/pre-tool-use-stash-guard.mjs`, a PreToolUse hook for Bash, and its battery
`tools/stash-guard/mutations.sh` (owner decision #923 A). A `git stash pop`, `apply` or `drop` that names no explicit
entry is denied, and the reason prints the stack and the `git show 'stash@{n}:<path>'` remedy. Explicit means
`stash@{n}`, a bare index or a SHA. `stash` and `refs/stash` are not explicit: git reads both as `stash@{0}`, the entry
the guard is about. **It is not live yet.** Agents never edit `.claude/settings.json`, so the PR body carries the exact
entry for the owner to add.

**Why now.** #4064 turned on the restore auto-stash hook (#1050), which pushes an entry onto the shared `refs/stash`
for every restore of a dirty path, so `stash@{0}` is less likely than ever to be yours (the audit's comment on #923).
The auto-stash hook's header had said the guard "allows" an explicit drop as if it were wired; it now names the file and
says it applies once `settings.json` wires it.

**Choices.** The empty stack is not special-cased: the decision names the command, and a bare pop on an empty stack
does nothing either way. The tokenizer is copied from the auto-stash hook, not imported, so each hook stays one file its
own battery can mutate. `git stash clear` and `git stash branch` (which pops `stash@{0}`) are out of the decision's
scope and filed as #4290.

**Measured.** `sh tools/stash-guard/mutations.sh`: 33 passed, 0 failed. That is 14 denied forms, 8 allowed forms
(A1 runs `git stash apply 'stash@{1}'` and checks it applied that entry), and 11 mutants, each failing its named arm. The four added in review (#4291): a wrapper (`time`), an env prefix, `bash -lc`, and git by its path.
