## (2026-10-30) — Plugin open searches the file a page per turn, and paints before any read (#3170 part 1)

**Status:** plugin main thread only. ENGINE patch (change note). CONTRACT unchanged. The executor is unchanged
(`main.ts` is outside `write-components.ts`' reach), so `EXECUTOR_REVISION` stays.

### Why #3111 did not end the hang

#3111 took the page loads off the path to the panel's first answer and spread them one per turn. The stand-in it added
priced a page load and nothing else, and its search of the whole file cost nothing. In Figma, a document-wide
`findAllWithCriteria` walks every node of every loaded page inside one turn, and the open path still ran it:
- once per read in `presentNames`, and again in `isSetUp` for the read after open;
- **once per set in the hand-edit pass** (`handEditsOf` → `locateSets`), about 50 times on the 60-page stand-in;
- in a second read beside the first: the badge's live recount (#3096) asks about 250 ms after the ledger's answer, before
  the read after open has filled `presentCache`, so `fileDue` started a full read of its own.

The hand-edit pass also projected every present set's plans in one turn (`updateTargets(present)`), about 0.5 s in Node.

The stand-in now prices a page search too (`SEARCH_MS` a page, so a whole-file search is that times 60, in one turn), and
the panel's live recount arrives at open as the studio sends it. At 330 ms a page load and 20 ms a page search:

| | before (`main`) | after |
|---|---|---|
| Panel's first answer | 411 ms, 0 pages loaded | 416 ms, 0 pages loaded |
| Whole-file searches, open to the pass's end | 57 | **0** |
| Most pages searched in one turn | 120 (2 400 ms held) | **1 (20 ms held)** |
| Longest stall of the event loop | 3 612 ms | **338 ms** (one page load) |
| Hand-edit pass done | 89 397 ms | **23 459 ms** |

Before, the thread was handed back, but each turn after the full read held it for 1.2 s or more for about a minute, so
the file and the panel read as hung.

### The change (`apps/plugin/src/main.ts`)

- **`searchPagesYielding`:** each page is loaded, then searched, in a turn of its own. The readers that took a root
  (`presentNames`, `isSetUp`, the hand-edit pass's `locateSets`) get `rootOver(nodes)`, a root that answers from that
  one read. A host whose pages cannot be searched one at a time (a Node shim) is searched in one go, as before.
- **`readPresent`, one read at a time:** a caller that asks while a read is going shares it. That covers the badge's
  recount, the checklist's request and Style guides' catalog. A write starting or ending drops the read in flight, and
  a read begun before a write does not leave its answer as `presentCache` (`presentGen`).
- **The hand-edit pass** finds each set in that read and projects one set's plans per turn.
- **`ui-ready` paints first:** its own turn posts only the root reads (the brand, the link state and the settings).
  The variable read-back, the font list and the ledger's answer then each start in a turn of their own.
- **Style guides' catalog** reads `isSetUp` from the same paged read.

### Gates (`apps/plugin/test-open-large-file.ts`)

New arms:
- `open/paint-first`: the turn that answers `ui-ready` loads, searches and projects nothing.
- `open/no-walk`: no whole-file search runs from open to the pass's end, the live recounts included.
- `open/search-yields`: no turn searches more than one page.
- `open/one-read`: each page is searched at most twice (the read after open and the pass).
- `open/plans`: the pass projects one set per turn.

Mutations, each run on a committed `wip:` tree, each failing by name:
- the reads moved back into the `ui-ready` turn → `open/paint-first`;
- `readPresent` back on one whole-file search → `open/no-walk`, `open/search-yields`;
- the pass searching `figma` again → `open/no-walk` (50 searches);
- no shared read → `open/one-read`;
- every set projected in one turn → `open/plans`;
- `isSetUp(figma.root)` in `fileSets` or in Style guides' catalog → `open/no-walk`.

On `main`'s `main.ts`, all five arms fail.

Two other suites' hosts changed, and neither of their arms was loosened:
- `test-style-guide-page.ts`: the cell sets now sit on the first page, as in a Figma file, and the catalog arms release
  the turns the catalog's paged read hands back.
- `test-agent-link.ts`: a 0 ms timer runs on its own turn. Only the poll loop's timers (1 000 ms) are held, so
  `ui-ready`'s reads can start.

### Not measured, and left open

- Nothing was run in Figma. A page's search cost there depends on its node count, and one page's search cannot be
  split, so a page of tens of thousands of nodes still holds one turn for its whole search.
- The first projection of a session costs about 180 ms in Node (module warm-up). It is the longest turn left before
  the first answer.
- The variable read-back and the font list are async host calls. The shim cannot price them.
- The Update check (`previewUpdate`) still searches the whole file several times per set (`locateSets`,
  `fileBlockers`, `hostPorts`, `findDocBlock`). That is the Update half of #3170, filed as #3177.
