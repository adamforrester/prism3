## (2026-10-27) — Update file's badge counts everything it would change, live (#3081, Q810 A)

**Status:** plugin panel and main thread. ENGINE patch (change note). CONTRACT unchanged. The executor is unchanged, so
`EXECUTOR_REVISION` stays.

### What changed

- **The badge counts what Update file would change (Q810 A, the owner's decision of 2026-10-27).** It counts the
  component sets due against the brand the panel holds (Q699 A), plus one item for Theme changes the file does not hold
  yet (`badgeCount`, `state/update-file.ts`). The button's accessible name says the same count ("Update file, 3 due").
  Before this, the badge was the ledger read at load, against the stored brand. It did not move when a setting changed,
  and it never counted Theme.
- **A cheap recount, its own message.** The panel sends `due-request` with its brand and a sequence number. It sends it
  after a setting changes (`brand`, and `identity` for a name typed without a rebuild) and after each write's verdict
  (`DUE_AFTER`). It waits 250 ms after the last change of a burst (`DUE_DEBOUNCE_MS`), so a drag or quick clicks ask
  once. The main thread answers with `file-due` (`fileDue`, `main.ts`): one root read for the ledger, one for the stored
  brand, and each present set materialized once. It reuses the sets the last `presentDefs` found (`presentCache`), so it
  never loads every page or walks the file, and it never runs the full check. A write starting or ending clears that
  cache (`guarded`), so the next recount reads the file again. The panel keeps the newest answer by sequence.
- **Apply Theme does not reset the `isDirty` baseline.** That was unverified in #3007's entry. `provenance` is
  reassigned only by a load (`loadInput`, `initSession`, `clearOrigin`); `apply-result` leaves it alone. So the Theme
  item does not come from `isDirty`. It comes from the main thread's reading of the file's stored brand (`holdsInput`,
  `persist-figma.ts`): both brands go through the same serialize and parse, compared with keys sorted. Apply Theme stores
  the brand it wrote (`persistInput`, `apply-theme.ts`), so the recount after Apply drops the Theme item. An agent's
  Apply counts the same way, because the answer reads the file, not the panel's own record.
- **No count before a brand is chosen.** On a fresh or library file the load's `file-sets` can land before the host's
  restore answers, while the panel holds only the boot placeholder. The panel neither asks nor shows a live answer until
  a brand is chosen and resolves (`liveShown`). Found by the independent review. The same holds after a failed restore
  (a stored brand the engine refuses in resolution): a setting change asks nothing, and the badge keeps the load's read.
- **The checklist is untouched.** It still reads its own `file-sets` and `update-check` answers, so #3028's Theme-unticked
  behavior (Q701 B) holds. A live answer landing while the checklist is open moves the badge and nothing in the
  checklist.

### Measurements

The recount, in Node, at the largest size it can see: all 57 buildable sets present, a full ledger, the example brand
stored, the panel's brand one lever apart, 50 runs. Median 11.8 ms, p90 13.2 ms, max 41.5 ms; the stored-brand compare
alone is 0.2 ms. It does not grow with the file's size, because the page load and the document-wide search are skipped
(`q810/cheap`: 0 page loads per recount). With the debounce, a burst of edits costs one recount.

### Gates and mutations

Each mutation was made on a committed tree and failed by name:

| Mutation | Fails |
|---|---|
| `badgeCount` drops the Theme item | `test-update-file.ts`: "Q810 A badge: unapplied Theme changes count as one item …" |
| `badgeCount` reads the load's read over the recount | `test-update-file.ts`: "Q810 A badge: it rises when a setting changes …" |
| The reduce keeps an older `file-due` answer | `test-update-file.ts`: "Q810 A recount: an answer overtaken by a newer request never shows" |
| `fileDue` reads the stored brand whatever the panel sends | `test-build-completed.ts`: "q810/rises" |
| `fileDue` reads the file's sets every time | `test-build-completed.ts`: "q810/cheap" |
| `guarded` keeps the cached sets after a write | `test-build-completed.ts`: "q810/after a write" |
| `holdsInput` compares without sorting keys | `test-build-completed.ts`: "q810/theme" |
| Apply Theme stores no brand (`apply-theme.ts`) | `test:readback-parity`: "#3081: before Apply Theme the fresh file holds no brand; after it, the file holds the brand applied …" |
| `recountDue` asks at once, no debounce (`apps/studio/src/main.ts`) | `test:chrome`: "IA2 figma … Q810 A: three quick changes ask for the count once …" ("3 asked") |
| No recount on `brand` | `test:chrome`: "IA2 figma … Q810 A: three quick changes ask for the count once …" ("0 asked") and "… the badge rises on a setting change …" |
| `DUE_AFTER` emptied | `test:chrome`: "IA2 figma … Q810 A: after a run, the panel asks for the count again …" and "… the badge drops after a run …" |
| The shell paints the load's read (`badgeCount(…, null)`) | `test:chrome`: "IA2 figma … Q810 A: the badge rises on a setting change …" |
| The checklist reads the live answer for its due sets | `test:chrome`: "IA2 figma … #3028 Q701 B: with Theme unticked, a live answer landing while the checklist is open …" |
| `liveShown` reduced to `!restoreFailure` (asks with the boot placeholder) | `test:chrome`: "IA2 figma … Q810 A: before a brand is chosen … the panel asks for no count and shows no live answer …" ("early":1) |
| `!restoreFailure &&` dropped from `liveShown` (review's MC) | `test:chrome`: "IA2 figma … Q810 A: after a failed restore (the stored brand does not resolve), a setting change asks for no count …" ("asked":1, badge "4"), light and dark |
| `guarded`'s end-of-write clear dropped, the start clear kept (review's MF) | `test-build-completed.ts`: "q810/mid-write: a recount asked during a write answers from the sets cached mid-write …" (0 page loads after) |
| No recount on `identity` (`subscribe('identity', recountDue)` dropped; review's MID) | `test:chrome`: "IA2 figma … Q810 A: a brand name typed with no setting changed asks for the count once, after the debounce, carrying the new name …" ("asked":0), light and dark |
| `fileDue`'s `catch` posts no `error` (review's MX) | `test-build-completed.ts`: "q810/error: a recount whose read of the file fails answers with the error, and nothing due" ("error":null) |

The chrome rows ran as mutated builds in the same worktree, each rebuilt and restored, never pushed.

### Owed by #3090 (due by plan), which lands after this

The agreed order is #3089, this PR, then #3090. #3090 gives `dueOf` a fourth argument, `print`, defaulting to
`() => null`, and with no print a printed entry under a moved engine reads `unrecorded`, never `due`. `fileDue` here
calls `dueOf(…, ledgerNow(input))` with three arguments, and nothing flags it: git merges `main.ts` clean and the plugin
typechecks. So when #3090 lands, it owes:

- `fileDue` passing `printNow(input)` into `dueOf`, as `fileSets` does (`needsPrint` with `breathe()`, then the print);
- a `q810` arm in `test-build-completed.ts`: a printed entry under an older `ENGINE_VERSION` whose plan the panel's brand
  changes is counted, and the same entry with an unchanged plan is not;
- the recount's cost measured again: a print projects each engine-moved set's plans (about 0.85 s for every def in
  Node, by #3090's review), which the 11.8 ms median above does not include, and `q810/cheap` counts page loads only.

Without the first, the badge never counts an engine-moved set whose drawing changed, while the checklist lists it as
Due.

### Gaps

- Nothing was run in Figma. The recount's cost is measured in Node; inside Figma, the root reads are the only file access
  it makes.
- A set added or removed by hand is not seen by the recount until the next `file-sets` read (the checklist opening, or
  the read after a run) or a write.
- A file that holds no brand counts Theme as one item once a brand is chosen (Q810.1 on the PR, built as A).
- The badge's words ("3 due") are DRAFT, part of the pending wording pass (Q2909.10 A). This PR adds no new words.
