## (2026-11-01) — verify: a skipped sharded gate prints no `--unsharded` hint, now held by a self-check (#3229)

Nit N1 from #3228's MERGE verdict. #3228 said a PASS or SKIP row prints no `--unsharded` hint, but only PASS had a
self-check arm, so the reviewer's mutation M3 (the hint on any non-PASS outcome) survived. A sharded SKIP means a
shard could not launch, and there the CPU-contention hint points the wrong way.

- **The arm.** `combineShards(g, [run('1','PASS'), run('2','SKIP')])` must not print `--unsharded`; if it does, the
  runner's self-check fails as `combineShards prints the --unsharded hint under a sharded gate that was skipped
  (#3227)`. The self-checks run on every `verify.ts` invocation, `--list` included.
- **Proof.** M3 (`if (outcome === 'FAIL')` → `if (outcome !== 'PASS')` in `combineShards`) fails it by name, and only
  it. Unmutated, the self-check is clean.
- Runner only: nothing emitted moves, so no `changes/` note.
