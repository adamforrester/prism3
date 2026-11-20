## (2026-11-19) — regen --check restores the tree when a step fails, and its stopped-emission detector has an arm

`regen --check` says it reports and never rewrites. That held only on the success path (#4199): `runStep` called `process.exit(1)` from inside `check()`'s `try`, and the restore sat after the comparisons, not in `finally`. A failing step left committed files rewritten, every artifact's mtime at the epoch, and a `/tmp/prism3-regen-*` directory behind. Reproduced on main by dirtying `out/aurora.ai.json` in a commit and adding `process.exit(3)` to `emit-analysis-reports.ts`: main leaves `M packages/engine/out/aurora.ai.json` and one temp directory; this branch leaves neither.

### What changed

- A failed step throws `StepFailed`. `check()` catches it, restores in `finally` (only once every snapshot is complete, so a half-taken snapshot never deletes what it did not copy), removes the temp directory in an inner `finally`, and returns a `CheckReport`. The CLI sets `process.exitCode` from it.
- `check(steps, { quiet })` is exported, so `test.ts` drives the gate with stub steps (#4198). The new arms, at the end of the section that holds #2029's `restoreTree` arms: a step that exits 0 and writes nothing is named `silent`, and the artifacts it left unwritten are named; a step that rewrites an artifact followed by one that fails leaves every artifact's bytes and mtime as they were and no temp directory. The oracle is the arm's own walk of the artifact directories, not regen's `artifactPaths`.
- Steps start as `process.execPath` with tsx's loader flags from `process.execArgv` (#4240), the way `lint-push-base.ts` starts its gates. Still one process per step, which the per-step write record needs. Outside tsx it falls back to `npx tsx`. `regen --check` measured 22.2/21.4 s on main and 19.0/18.8 s here.

### Mutations, each failing by name

- Neutering both detectors (no `silent` push, `unwritten = []`), the issue's mutation: `#4198: regen --check names a step that exits 0 and writes nothing as silent` and `#4198: … names a committed artifact no step wrote as stale`.
- Skipping the restore when a step failed: `#4199: regen --check puts every artifact back, bytes and mtimes, when a step fails after another rewrote one (bytes: packages/engine/out/aurora.ai.json …)`.
- Dropping the temp cleanup: `#4199: regen --check removes its temp directory when a step fails (2 left)`.

### Trap

The restore has always set timestamps to the millisecond, so a fresh checkout's sub-millisecond mtime comes back up to 1 ms off (Node rounds `mtimeMs`). The arm compares mtimes within 1 ms; a skipped restore leaves the epoch, far outside that.
