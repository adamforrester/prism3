## (2026-11-16) — The hand-edit pass runs again when the write that ended it ends (#3804)

**What.** `handEditsPass` (`apps/plugin/src/main.ts`) stops at `stale()` when a write holds the file (#3737, #3802),
and posts nothing: no `hand-edits` for the sets it had not reached, and no `done`. The panel's `handPass` stays
`'running'`, so `statusesOf` keeps those sets at **Checking**. Only two things asked for the pass: the load sequence and
the end of an Update file run. So an Apply theme, Build, File setup, Style guide or Prune confirmed while the load-time
pass was still reading left those sets at Checking until the plugin reloaded.

**The fix.** It takes #3804's first option:
- When `stale()` finds a write holding the file, it records the pass as owed (`handPassOwed`).
- `guarded`'s `finally` asks for a new pass once the write has released the hold, over the file the write left.
- A pass that a newer request supersedes owes nothing, because the newer one owns the work.
- A new pass clears the flag as it starts.

The panel needs no change: the new pass's per-set `hand-edits` posts, then its `done`, move those sets out of Checking.
After an Update file run, the panel asks for its own pass as well. That request supersedes the owed one, which ends
where it is.

**Kept to `main.ts`'s line count**, as #3802 did, so the seven guide citations into `main.ts` (`lint-guide-claims`)
stay put. That's why the change sits on the existing lines.

**Test.** `test-prune-main.ts`, `main/hand pass after the write`, through the real `main.ts`. After #3802's arm
(a pass asked for while a prune holds the file posts nothing), the hold is released and the test waits:
- On main: nothing more is posted (`posted after it []`), so it fails.
- With the fix, the pass runs to its end unasked (`[{"type":"hand-edits","done":true}]`).

Mutations, each failing by name with `main/hand pass after the write`:
- the write's end not asking for the owed pass;
- `stale()` not recording the pass as owed.

**A test this moved.** `test-build-completed.ts`'s `q810/mid-write` measured its "the write's end clears the cached
sets" claim inside section 7's build hold, where a hand-edit pass is also asked. Now that pass is owed, and it re-reads
the file as the build ends. `readPresent` always reads afresh, so that read refilled the cache whether or not the
write's end had cleared it. The arm failed (0 page loads after), and its own mutation could no longer fail it. It now
has a hold of its own (section 7a) with no pass asked. It passes 136/136, and its documented mutation (the write-end
clear dropped) fails it by name again (`1 page loads during, 0 after`).
