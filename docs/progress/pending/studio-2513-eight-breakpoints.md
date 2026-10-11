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

The mutation lines are in the PR.
