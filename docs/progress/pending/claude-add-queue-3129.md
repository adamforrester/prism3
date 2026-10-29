## (2026-10-28) — Components chooses what to add; Update file shows To add and Due (#3129)

Builds the owner-approved wireframe on #3129 (Q832 A, Q833 A; Q3129.1–13 all A), with the owner's revisions R1–R7 and
Q835 A of 2026-10-28. Engine `{{ENGINE_VERSION}}` (patch: no emitted artifact moves).

### What changed

- **The add queue lives in the file** (`apps/plugin/src/add-queue.ts`, new and pure). Shared plugin data on the root,
  namespace `prism3`, one key per set, `addQueue.<defId>` = the ISO time it was queued. One key per set so two teammates
  ticking at once never lose a tick; shared so an agent in the file can read it. The order is not stored: it is shown and
  built in Components' list order (`inListOrder`).
- **Reads never write.** `fileSets`, `ledgerSets` and `fileDue` report the queue minus the sets the file holds and the
  defs the engine cannot build. The keys are cleared where the ledger records a set that landed whole (beside
  `recordSets`), and by a queue write, which also clears stale keys; every Update file run ends with one carrying no ids.
- **Components (plugin):** boxes come back from #2700's markup, acting on the file's queue through `add-queue` instead of
  the session's selection (`sel` is retired, and with it the dead Build bar and Build all). One box per family (R5): a
  family's row, or a set alone on its row, two-state (`familyBox`); a family's parts have none, and a family partly in
  the file queues its missing parts. Section boxes stay three-state; a section of one family carries that family's box.
  A row with nothing to add keeps an empty cell, so names align. Each tier's caption line carries Select all and
  Deselect all (R1, replacing the page control); the shared settings sit under a Component settings tier (R2). The page
  title moves to the left of the levers header with the search flush right (R3, Q835 A), and Components shows no mode
  control (R4; its preview follows Theme's mode). The boxes wait for the host's full read (#3110's ledger-only answer
  draws none).
- **Update file:** Theme, Components (To add and Due as its subtitles, R6), Style guides. To add has Remove (focus moves
  to the next row's Remove) and Remove all from two rows up; an empty queue on a set-up file shows no To add (R7); a
  fresh file starts with nothing queued and offers Add all. Due uses Components' display names. The badge adds the
  queue, and its name is split (`badgeParts`, `badgeName`).
- **The web studio is unchanged** (Q3129.12 A).

### Traps

- **The test harness hears the UI's own posts.** In `test:chrome` and the render scripts, `parent.postMessage` from the
  UI lands on the UI's own `message` listener. `add-queue` is both the request's and the answer's type, so the parser
  drops an `add-queue` with no `queued` list; without that, every tick was answered by its own echo as an empty queue.
- **The run's queue write needs the file's sets.** `addQueue` reuses `presentCache`; after a run it is cleared, so that
  one write loads every page (one per turn, #3110), as the read after the run does anyway.

### Not covered

- An agent command that queues sets (the storage allows one; the wireframe did not add it).
- #3123 (the size pass) was open while this was built: it and this PR both edit `shell/update-file.ts` (the hand-edits
  choice, which #3123 moves into the foot as a select). Whichever lands second resolves it.
