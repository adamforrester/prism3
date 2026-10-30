## (2026-10-30) — The Update check and apply read the file once, a page per turn (#3177)

**Status:** plugin read layer only. ENGINE patch (change note). CONTRACT unchanged. The executor's code is unchanged
(`update-plan.ts`, `update-apply.ts` and the new `run-read.ts` are outside `write-components.ts`' reach), so
`EXECUTOR_REVISION` stays. Built on #3181 (#3170 part 1), which must merge first.

### Why Update locked the panel

#3181 took the whole-file searches off plugin open. The Update check (`previewUpdate`) and apply (`applyUpdate`) still
searched the whole file several times per set, each search in one turn of the main thread: `hostPorts`, `locateSets` and
`fileBlockers` in the dry run, `findDocBlock` for the usage panels, and in the apply `liveFor`, the executor's own
lookups, the verify and the furniture. And nothing yielded between sets, so on a large file the check was one turn.

Measured on `test-open-large-file.ts`'s stand-in (60 pages, 50 sets; 20 ms a page load, 5 ms a page search), an Update
check and apply over every set, as after a theme change:

| | check before | check after | apply before | apply after |
|---|---|---|---|---|
| Whole-file searches | 102 | **0** | 354 | **0** |
| Most pages searched in one turn | 6 120 | **1** | 21 240 | **1** |
| Times each page is searched | 102 | **3** | 354 | **3–6** |
| Longest stall of the event loop | 30 823 ms | **558 ms** | 106 588 ms | **484 ms** |
| Total time | 32 603 ms | **3 031 ms** | 108 275 ms | **3 944 ms** |

The answers are the same before and after, digested whole: check `ec208d1a` (previewHash `54ce985f`), apply `d8a3e491`.
The stand-in's sets have no variables, so its apply refuses each set at the preflight and writes no member. The writes
are #3170 part 2's lane. The stall left is not a search: no turn searches more than one page (5 ms here).

### The change

- **`run-read.ts`:** `readRun` loads each page in a turn of its own, then searches it once per criterion, each search
  in a turn of its own. The root it returns stands in for the file's. Its pages, plugin data and every other member are
  the file's own. Only `findAllWithCriteria` is answered from the read, filtered live: a node renamed reads under its
  new name, one removed is left out, pages reordered answer in their new order, and a page made during the run is
  searched when first asked for. A search it does not cover goes to the file. `rereadAfter` searches again the pages
  that nodes sit on, or every page.
- **`update-plan.ts`:** `UPDATE_READ` names what a run searches for: components and sets, the canvas furniture by its tag,
  and the usage panels by theirs. `runHost` wraps a host in one read. `previewUpdate` reads through it, unless its host
  already reads a run's.
- **`update-apply.ts`:** `applyUpdate` reads once, and its dry run shares the read. The executor's port shares it too,
  when it is the same file (as `figma` is both in the plugin). The page a set sits on is read again after its write, and
  again after its furniture is drawn. The whole file is read again after #2989's move between pages: without that, a set
  moved to a page the run made answers twice, and `furnishUpdate` skips a set it finds twice.
- **`main.ts` (shared with the part-2 lane):** `checkSets` and `updateComponents` drop their `loadPagesYielding()` (the
  read loads the pages). The furniture and the usage panel draw through the run's host, so `panelFor` takes an `api`
  that defaults to `figma`.

The check and the apply each read once. They do not share a read: the file can change between the check and the
confirm, and the apply's hash check needs the file as it is when the confirm runs.

### Gates

- `test-open-large-file.ts`: `update/check-no-walk`, `update/apply-no-walk`, `update/search-yields`, `update/one-read`
  and `update/answers`. On #3181's head the first four fail.
- New `test-run-read.ts` (in the plugin's `test`):
  - the read against the whole-file search as the oracle (`run/*`);
  - an apply that writes, on a set the executor built, with one object as host and executor, against a twin read by
    whole-file search (`apply/same`, `apply/no-walk`, `apply/reread`, `apply/moved`).
- The update fixtures pass unchanged: `test-update-apply.ts` (815 assertions), `test-update-components.ts`,
  `test-update-fresh.ts` and `test-apply-summary.ts`. `previewUpdate` and `applyUpdate` read through the run's root
  themselves, so every fixture runs on it.

Each mutation was made on a committed `wip:` tree and failed by name:

| Mutation | Fails |
|---|---|
| dry run without the run's read | `entry/check`, `update/one-read`, `update/answers`, `apply/no-walk`, `apply/reread` |
| executor handed the file's root | `apply/no-walk` |
| apply without the run's read | `update/apply-no-walk`, `update/search-yields`, `update/one-read`, `apply/no-walk`, `apply/reread` |
| a page's criteria searched in one turn | `update/search-yields` |
| the apply's dry run reading again | `update/one-read`, `apply/reread` |
| `rereadAfter` doing nothing | `run/reread`, `run/order`, `run/new-page`, `apply/reread` |
| no re-read after a set's write | `apply/reread` |
| no re-read after its furniture | `apply/reread` |
| no re-read after a move between pages | `apply/moved` |
| furniture drawn on `figma` | `update/apply-no-walk`, `update/search-yields`, `update/one-read` |
| removed nodes kept | `run/live` |

### Not in this change

- Capture baseline and Adopt still load every page and then search the whole file per set (`captureBaselines`,
  `adoptMembers`). Filed as #3189.
- The executor's `findAll` by name runs on its failure path only (a nest or swap target it cannot find), and still
  searches the whole file.
- Nothing was run in Figma. One page's search cannot be split, so a very dense page still holds one turn for its search.
