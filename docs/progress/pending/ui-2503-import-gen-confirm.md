## (2026-10-10) — Studio: a late file read no longer swaps the brand a waiting Replace confirm names (#2503)

**STATUS: branch `ui/2503-import-gen-confirm`.** Studio code only (`apps/studio/src/main.ts`), held by the plugin start
suite. No engine change, no artifact moves, no ENGINE bump. `CONTRACT_VERSION` unchanged. No new copy.

**The defect (found by Lane D reviewing #2493).**
- Make an unsaved edit, choose a file in Import and let its read be held, then paste aurora's design.md and click Load.
- The confirm reads "Replace the current brand with “aurora”?". When the read finishes, the same confirm reads “harbor”, with nothing to say it changed, and Replace loads harbor.
- #2493's A14 guard drops a read whose box closed or took another file. A pasted Load and an example click do neither: the box stays open and `importGen` doesn't move.

**The fix.** `stageImport` and `stageLoad` each bump `importGen`. Each is the newer choice, so a held read is stale by the time it finishes.
- `stageLoad` covers the paste and the example.
- `stageImport` covers a paste that fails to validate, which never reaches `stageLoad`. Without it, the late read loaded harbor straight over the paste's error (with no edits, nothing asks first).
- The file read's own `stageImport` call bumps too. It's harmless: its check has already passed.

**Tests** (`apps/plugin/test-start-screen.mjs` §5b, on #2493's held-`FileReader` harness):
- **Pasted Load:** the confirm still names “aurora” after the read finishes, and Replace loads aurora.
- **Example:** the confirm still names "the aurora example".
- **Failed paste:** the error stays and the brand doesn't change.

**Mutations,** each from a `wip:` commit against the rebuilt bundle, failing by name:
- **Both bumps removed** (the code on `main`): 4 fail.
  - `#2503 a pasted Load while a file read is held keeps its confirm naming aurora …`, with after "Replace the current brand with “harbor”? …";
  - `#2503 Replace then loads the pasted brand, not the late read — brand "harbor"`;
  - the example arm;
  - the failed-paste arm (`error null, brand "harbor"`).
- **`stageLoad`'s bump alone removed:** only the example arm fails.
- **`stageImport`'s bump alone removed:** only the failed-paste arm fails.

So each line of the fix is held on its own.
