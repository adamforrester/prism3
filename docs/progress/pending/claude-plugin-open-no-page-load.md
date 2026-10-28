## (2026-10-28) — Plugin open loads no page before the panel is ready (#3110)

**Status:** plugin main thread and the shared studio shell. ENGINE patch (change note). CONTRACT unchanged. The
executor is unchanged, so `EXECUTOR_REVISION` stays.

### The cause, measured

The owner saw the plugin and the file freeze for about 20 s on opening the plugin in the reference brand's master
(about 60 pages), on a fresh Figma session. It was not every time: Figma keeps a page loaded for the rest of a session,
so only the first open pays. The read at load, `file-sets` (#2909, #3007), called `presentDefs`, whose first line was
`figma.loadAllPagesAsync()`. Figma loads pages on the main thread, so that one call held the plugin and the canvas
until every page was in.

The stand-in (`apps/plugin/test-open-large-file.ts`) is a 60-page file in the shim: 6 dividers, 50 sets one per page,
and a root ledger naming 45 of them, 3 due. Loading a page burns `PAGE_MS` of main-thread time, as Figma's load does, and
the document-wide search refuses until `loadAllPagesAsync` was called, as under `dynamic-page`. At 330 ms a page,
which is the reference file's 20 s spread over 60 pages:

| | before | after |
|---|---|---|
| Panel's first answer (`file-sets`, the badge's count) | 19 810 ms, 60 pages loaded | 11 ms, 0 pages loaded |
| Most pages loaded in one turn of the main thread | 60 (19 800 ms held) | 1 (330 ms held) |
| Full read of the file's sets | is the first answer | 19 833 ms, one page a turn, after the panel is ready |
| Hand-edit pass done | 20 431 ms | 20 599 ms |

The stage that took the time is the page loads: 19 814 ms of the 19 822 ms `file-sets` stage. The ledger read took
0–1 ms, materializing and reading what is due 7–10 ms, the document-wide search 0–1 ms, and the hand-edit pass's own
work 766 ms (one member a set in the stand-in). The test runs at 20 ms a page by default (1211 ms → 11 ms to the
first answer, worst turn 60 pages → 1). The total work does not shrink. What changes is that none of it happens before
the panel is ready, and no turn holds the thread for more than one page.

### The fix

- **Open answers from the ledger alone (`ledgerSets`, `main.ts`).** At `ui-ready` the main thread reads the root ledger
  and posts `file-sets` with no page loaded. The sets it names are present, and what is due is read against the stored
  brand, as the read at load always was. It is marked `partial`: the ledger cannot see a set built before it or by hand,
  nor one deleted since, and `setUp` needs a document-wide search, so it is not read (sent false). The badge counts from
  it at once.
- **Pages load one per turn (`loadPagesYielding`).** Every place in `main.ts` that needs every page loads them this way:
  `presentDefs` (the full read after open, the checklist's own read, the hand-edit pass), the scoped check, Style
  guides' catalog, prune, and each write's entry. It loads the pages one at a time with `breathe` between them, then
  calls `loadAllPagesAsync`. The executors' own `loadAllPagesAsync` calls, which run after their entry, then have
  nothing left to load. That last call has nothing left to load, but under `dynamic-page` the document-wide searches after
  it (`presentNames`, the update's `locateSets`) need it called.
- **The reads after open are tagged (`atOpen`).** The full read after open now yields, so a checklist opened during it
  can be answered first, under the panel's brand (Q699 A), while the read after open measures the stored brand. Both of
  the host's reads after open carry `atOpen`. A read after open never replaces an answer the panel asked for
  (`host-session.ts`), and the checklist never takes one as its answer (`awaitingRead`). Answers to a request stay
  untagged, as before. Before this, `loadAllPagesAsync` held the thread, so the read after open always landed first.
  The independent review found this race.
- **The panel shows Checking (DRAFT).** While the answer is partial, a set the ledger does not name reads Checking
  (`UPDATE_COPY.status.checking`, already a placeholder, Q2909.10 A), never Not in file. Update file's checklist waits on
  the full read with its existing "Checking the file…" (`awaitingRead`). A partial answer never replaces a full one
  (`host-session.ts`).
- **Stage timings, behind a flag.** `timed` in `main.ts` keeps each stage's time only when `PRISM3_OPEN_TIMINGS` is an
  array on the global. The stand-in sets it and prints the stages; a normal run times nothing.

Unchanged: the checklist still sends its own `file-sets-request` and reads under the panel's brand (Q699 A). Theme
unticked still reads the stored brand (#3028, Q701 B). The background hand-edit pass still runs after the full read.

### Gates and mutations

Each mutation was made on a committed `wip:` tree and failed by name:

| Mutation | Fails |
|---|---|
| `ui-ready` reads the file first (`fileSets()` in place of `ledgerSets()`) | `test-open-large-file.ts`: "open/ready: the panel's first answer lands with no page loaded" (60 of 60) |
| `loadPagesYielding` as one `loadAllPagesAsync` | `test-open-large-file.ts`: "open/yields: no turn of the event loop loads more than one page" (worst 60) |
| `ledgerSets` drops `partial` | `test-open-large-file.ts`: "open/partial: that answer says it is the ledger's alone" |
| `statusesOf` reads a partial answer's missing set as Not in file | `test-update-file.ts`: "#3110 status: at open, a set the ledger does not name reads Checking …" |
| `awaitingRead` ignores `partial` | `test-update-file.ts`: "#3110 checklist: it never opens on the answer at open …" |
| `host-session` lets a partial answer replace a full one | `test-host-session.ts`: "#3110: an answer at open arriving after a full read leaves the full read in place" |
| `host-session` lets a read after open replace an answer the panel asked for | `test-host-session.ts`: "#3110: the host's read after open, landing after an answer the panel asked for, leaves that answer in place" |
| `awaitingRead` takes a read after open as the checklist's answer | `test-update-file.ts`: "#3110 checklist: the host's read after open, landing after the checklist asked, is not its answer" |
| The full read after open posted untagged | `test-open-large-file.ts`: "open/full: the full read follows, tagged as the read after open …" |
| `styleGuideCatalog` back on one `loadAllPagesAsync` (asked mid-read) | `test-open-large-file.ts`: "open/yields: … the reads asked mid-read included" (worst 51) |

### Gaps

- Nothing was run in Figma. The stand-in burns a fixed time per page. In Figma, a page's load time depends on what is on
  it, and the plugin cannot yield inside a single page's load.
- The full read and the hand-edit pass still load every page after open, now one per turn. Whether the pass should wait
  until Components or Update file is opened, so that a plain open loads no page at all, is a held question for the
  owner (Q3110.1 on the PR).
- A set the ledger names but that was deleted by hand shows on the badge until the full read lands, about 20 s later on
  the 60-page file. #3091 tracks the same gap for the live recount.
