## (2026-11-12) — Update: a run that throws part-way returns what it did (#3697 L1)

**Status:** plugin only. No engine, emission or token-name change, so no change note and no `CONTRACT_VERSION` move.
`update-apply.ts` is outside the executor `lint-executor-revision` walks, so `EXECUTOR_REVISION` stays.

### What was wrong

`main.ts` awaits `applyUpdate` and writes the as-built ledger only after it returns. A throw outside a set's own write
(a slot fill, a re-read, the re-spacing) left `applyUpdate` with nothing. Say sets 1 to 4 update and the fill for set 5
throws: no ledger was written for the sets that finished, and the verdict was one "update failed" line. The next check
re-reads the stamps, so the file healed, but the run's report lost what it had done.

### What changed

- Everything `applyUpdate` does after the named version is saved runs inside one try. A throw sets `failed` on the
  result and returns it, with the outcomes gathered so far, so `main.ts` records the finished sets as it would for a
  run that ended cleanly.
- A set's outcome is pushed as soon as its write returns, before its slot fills, so a throw in the fill keeps the
  write's record.
- `applyVerdict` reads `failed`. The headline is `✗ update failed`, the words `main.ts`'s catch already uses. The first
  line is "The update failed: <why>. What is listed below was done before it." (DRAFT wording for the owner), followed by
  the lines for what was done.

### The test

`test-slot-migration.ts` `failed/…`: a Checkbox group's write finishes, then reading an instance's layers throws during
its slot fill. `applyUpdate` returns rather than throwing. The result says why, and holds the set's outcome with its 6
members updated. The verdict fails with the reason first and keeps the per-set lines. Mutation: the catch rethrowing,
committed as `wip:` and reverted, fails all four arms by name.
