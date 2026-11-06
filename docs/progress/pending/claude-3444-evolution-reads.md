## (2026-11-06) — lint-token-consumers: a def's evolution history is not a read (#3444)

**Status:** gate change only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged. Option A of
#3444.

### What changed

- **`lint-token-consumers.ts`.** The `defs` reader walks each def by key path and skips `notes.evolution` (`HISTORY`,
  written in the gate by hand). That field is history: a line saying the icon once took a token kept the token read
  after its binding was gone. The other `notes` fields state live behavior and still read.
- **A floor for the skip.** If no def has a `notes.evolution` field, the gate fails: a rename in the schema would
  otherwise leave the skip matching nothing, and the gate back to counting history without a word.
- **Header.** WHAT COUNTS AS A READ names the skip, and LIMITS says history written in any other field still reads,
  so history belongs in `notes.evolution`.

### Re-measured

Nothing moves today: 621 guaranteed, 382 read (224 by defs), 239 unread, 27 entries. No token on main was read only
by a history note, because #3438 had already reworded Link's evolution line to name no token path. The run reports
58 defs' `notes.evolution` skipped.

### Verification

Each mutation was committed first and restored with `git show HEAD:<path> > <path>`.
- **The issue's case.** Drop ` and color.icon.link.visited on a standalone link's trailing icon` from Link's
  `codeOnly` visited entry and add an evolution line naming the token. The gate fails
  `unclaimed: 'color.icon.link.visited'`. Main's gate on the same tree passes.
- **The inverse.** Keep the binding and add the same evolution line, and the gate passes.
- **The floor.** Point `HISTORY` at `notes.history`, and the gate fails
  `floor: no def has a 'notes.history' field`.

### For whoever re-verifies this

#3447 (`codeOnly` as data) wraps each `codeOnly` entry as `{ class, disposition, description }`. The walk still
reaches the description string, so those reads hold. The two PRs touch different files. If #3447 lands first, run
the gate again and check that the `by defs` count stays 224.
