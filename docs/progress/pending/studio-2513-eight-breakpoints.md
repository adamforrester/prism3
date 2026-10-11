## (2026-10-10) — Layout: a brand that arrives with eight breakpoints draws with its error, and Remove takes it back to seven (#2513)

**Status:** Studio only (`apps/studio/src/state/layout-input.ts` and its tests). No engine change, no artifact moves,
no ENGINE bump, CONTRACT unchanged. One visible label is new, DRAFT for the owner (below).

### The diagnosis

`namesFor` asks the engine to name a breakpoint list, and the engine refuses more than seven ("The brand can have at
most seven breakpoints. This brand has 8.") without naming any of it.
- **Drawing threw.** The Layout page names its rows through `namesFor`, so drawing an eight-breakpoint brand
  threw.
- **Remove was refused.** `commitBreakpoints` names the list as it stands before writing, and its `catch` refused
  every change, Remove included. So a brand an agent wrote with eight breakpoints could neither be drawn nor brought
  back.

### What changed

- **`namesFor` names a list longer than seven.** The first seven take the engine's names for seven, and each width
  past them is named by its width (`2560px`). No engine name is restated, and none collides with one.
- **`commitBreakpoints` refuses more than seven explicitly.** That refusal used to come from `namesFor` throwing,
  which no longer happens. An eighth Add, or an edit at eight, is still refused and writes nothing. A Remove from
  eight, which leaves seven, is written.

**DRAFT for the owner:** the label of a width past the seventh. It's the row's name, as the page shows it (for
example `breakpoint.2560px`, and "Remove 2560px"). It's drawn only for a brand that arrived with too many
breakpoints, beside the engine's error line.

### Tests and mutations

- **`test-layout-input.ts` §7:**
  - eight breakpoints are named without throwing (`["xs","sm","md","lg","xl","2xl","3xl","2560px"]`);
  - one Remove (768) leaves a valid seven, and the brand resolves.

  §6's existing "an eighth breakpoint is refused" arm now holds the explicit refusal.
- **`test-smoke.mjs`** (every brand), with a live write of eight:
  - the Layout page draws all eight rows with the error line and no page error;
  - one Remove (480) clears the bar and stores `[0,320,768,1024,1440,1920,2560]`.

Mutations, each from a `wip:` commit and restored with `git checkout --`:
- **`namesFor`'s guard for more than seven removed** (the fix):
  - `✗ #2513: eight breakpoints are named without throwing … — The brand can have at most seven breakpoints. This brand has 8.`
  - `✗ #2513: one Remove (768) leaves a valid seven … — {"dropped":[],"refused":true}, [0,320,480,768,1024,1440,1920,2560], …`
  - in test:smoke, on every brand: `✗ <brand>: #2513: eight breakpoints draw on the Layout page with the error line and no page error — … 1 page error(s) (page.evaluate: Error: The brand can have at most seven breakpoints …)`
  - and `✗ <brand>: #2513: one Remove (480) leaves a valid seven: … bar still shown, stored [0,320,480,1024,1440,1920,2560], 2 page error(s)`
- **`commitBreakpoints`' refusal of more than seven removed:** `✗ an eighth breakpoint is refused before anything is written, the seven and their settings byte-identical — {"dropped":[]}, {"breakpoints":[0,480,768,1024,1440,1920,2560,2816],…}` (§6's existing arm).

### A trap for whoever re-verifies this

**Without the fix, the draw throws inside the live write's own `page.evaluate`.** As first written, the smoke arm
ended the whole suite on that throw rather than failing by name. It now counts the throw as a page error, and its
Remove click is bounded, so the mutation run reaches the named lines.
