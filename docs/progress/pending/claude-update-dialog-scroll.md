## (2026-10-27) — Update file: a tick keeps the checklist's scroll (#3082 part 2)

**Status:** plugin UI fix + `test:chrome` arm. No engine change, so no change note: no committed artifact, emission or
component surface moves. CONTRACT unchanged. #3082 part 1 (what an engine update does to the due count, Q811) is the
owner's open question and is untouched here.

### What changed

- **The bug:** in Update file's checklist, ticking a set (a new component far down the list, for example) jumped the
  dialog back to the top. `paint()` in `apps/studio/src/shell/update-file.ts` rebuilds the whole overlay on every
  change, so the new body started at `scrollTop` 0. Focus already survived: the focused `data-key` was restored with
  `preventScroll`.
- **The fix:** `paint()` reads the old body's `scrollTop` before it rebuilds and sets it on the new one after, when the
  tab is the same (the body carries `data-tab`); a new tab still starts at the top. Every repaint goes through `paint()`
  (a tick, the hand-edit choice, and each host answer on the topics it subscribes to: a check landing, hand edits, the
  file's sets), so the one change covers them all.
- **The arm** (`test:chrome` section `ia2`, shard 1, figma host, both themes): it opens Update file on a file that holds
  4 sets, so every other set is listed as new and the checklist is taller than the dialog; asserts the last new set
  starts below the fold, scrolls the body down, ticks it, and asserts the scroll moved by at most 1px and focus is on
  that box (`set=<id>`). A second assertion repaints from a host answer (the check again) and holds the scroll and focus
  there too. With the restore removed, both fail by name (`#3082: ticking a set below the fold keeps the body's scroll`,
  `#3082: a host answer's repaint keeps the body's scroll`).

### The narrow tier

- At the narrow tier, `.p3-frame[data-w="narrow"] .p3-bardlg-col { overflow: visible }` would stop the body scrolling,
  but `chrome.css`'s `.p3-frame[data-w="narrow"] .p3-bardlg-col.p3-upd-body` rule restores `overflow-y: auto`, so the
  body stays the scroller there too. Measured at 400×700: the arm passes, and fails without the restore. The arm now
  runs that narrow pass as well as 1280×900.
