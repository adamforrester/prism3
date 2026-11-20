## (2026-11-20) — The #4199 temp-directory arm counts only its own (#4371)

**What.** The `#4199` arm in `packages/engine/test.ts` checked that a failed `regen --check` removes its
temp directory by counting `prism3-regen-*` entries in the shared OS temp directory before and after. Any
other `regen --check` on the machine creates and deletes its own entries there, so a verify run that
overlapped `drift` and `engine-test` failed with `-1 left` or `1 left`, with no defect behind it. Two
review lanes saw it.

**Fix.** The arm's two `regen --check` calls now run with `TMPDIR`, `TMP` and `TEMP` pointed at a fresh
private directory. `os.tmpdir()` reads them on every call, and the spawned steps inherit them. The count
reads only that directory, and an arm asserts the switch took (`tmpdir()` is the private root). The
environment is restored, and the private directory removed, in the arm's `finally`.

**Test.** The arm now plants a neighbor, `prism3-regen-4371-neighbor-<pid>`, in the shared temp directory
between the check and the count: another run's directory, made deterministic. Main's counting with the
neighbor: `❌ #4199: regen --check removes its temp directory when a step fails (1 left)`. The fix: exit 0.
Mutation of the subject (`regen.ts` skips its `rmSync(tmp)`): `❌ … (2 left)`. The leak is still caught,
in the private root.
