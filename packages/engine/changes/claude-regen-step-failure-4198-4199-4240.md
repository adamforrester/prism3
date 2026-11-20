---
engine: patch
---
`regen --check` puts the tree back when a step fails (#4199). A failed step used to exit from inside the check, before the restore ran, so it left committed artifacts rewritten, their timestamps at the epoch, and its temp directory behind. The restore now runs in `finally`, and the check returns its report so the CLI sets the exit code after the tree is back. `check(steps)` is exported, so `test.ts` drives the stopped-emission detector (#1059) with stub steps (#4198). Each step now starts with node and tsx's loader instead of `npx tsx` (#4240), which saves about 3 s a regen. No committed artifact changes.
