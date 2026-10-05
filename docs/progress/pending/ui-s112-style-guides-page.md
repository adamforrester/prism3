## (2026-10-05) — Build style guides: the page (S11.2, PR 2 of 2)

**STATUS: PR #2171 open from `ui/s112-style-guides-page`; the owner reviewed the screenshots and approved it (SG1, below). Merges `ui/s112-style-guide-plumbing` (PR 1, #2161), which must land first.** No engine or emitted change; no change note owed (UI only, the S-slices' precedent). CONTRACT stands.

**Why.** The owner approved the Build style guides mockup (2026-10-05: P1 variant 1, P2 A, P3 B, P4 A, P5 A, P6–P9, P10, P11 "Style guides", P12 all DRAFT copy) and its options (H4–H9), its heading and its menu item (H10, H11). This builds the page to the mockup, on PR 1's plumbing.

**What it does.**
- **A page no tab shows.** `pages.ts` gains `MENU_PAGES` (`styleGuides`), a third kind of `PageKey` beside the legacy and the moved pages. The frame draws it in its own `page` layout: the head, the page scrolling under it, and the drawer at the foot. It is mounted on arrival and released, with its subscriptions, on leaving. No tab is selected while it shows (P10); Close returns to the page the Figma menu was opened from.
- **The Figma menu's "Build style guides…" opens it** (H11). The legacy Style guide page and its Pages menu entry stay, untouched, until the cleanup PR (H12).
- **The model is pure** (`state/style-guides.ts`, tested in Node): the tree from the catalog (a collection's chain of single groups folded, a chain of single groups as one row), the selection as a set of TABLES (P2 A, P3 B), which rows carry a box (at or above the table level), what starts open (the mockup's call 2), the counts and the words beside Draw, the title box, the options and their defaults (H4–H9: Hex, from each role, REM off, Name cell off), and what Draw sends: every option, and the selection as table KEYS only when it is not every table, so a full run still judges superseded tables.
- **The page** (`shell/style-guides.ts`) draws the mockup: What to draw (Collection, Mode fixed to "Every mode" (P4 A), the four kind boxes, the tree with later-phase rows grayed out, tagged and not pickable (P5 A), Deselect all / Select all, Draw by table title), the run (the summary and Draw, then the table list with Waiting, Drawing, Done and Not drawn, Cancel, a stopped run's line, and a failed table first with its reason and Draw it again), and Options, a group per kind in the selection. Set up file not run: the warning box with its button, and Draw off (P8). It asks for the catalog on open and again when Apply Theme's, Set up file's or its own run's verdict lands. At 380: one column, the run first, Draw in a bar pinned to the bottom (P9).
- **Activity (P1 variant 1, the mockup's call 11).** The drawer row is titled "Style guides" (P11; the run guard's title moves with it, as `busy/titles` requires). While the page is open, the drawer does not open by itself for the style guide, when it starts or when it fails: its row, the bar row and the red dot still record it, and the verdict's own request to be shown is not taken as a click. Away from the page, F2 is unchanged. At 380, the closed strip carries the run's progress bar.
- **Chrome.** The page's rules in `chrome.css`, on existing variables plus the switch's four (`track-w`, `track-h`, `thumb`, `thumb-inset`, added to `SHELL_VARS`); every color pair it draws is already declared in `PAIRS`. Two glyphs, `dash` (a part-checked box) and `error`.

**Owner decisions (2026-10-05), on the screenshots of #2171:**
- **SG1:** the page is approved as built.
- **SG2:** the refusal stays "Style guides is already running. Try again when it finishes." (P11 renamed the operation, and the approved refusal is built from its title.)
- **SG3 A:** a failed table shows the host's own reason, as it comes. The mockup's "‹font› is unavailable in this Figma." has no source today: a font Figma cannot load is a named miss inside a drawn table, not a failed table (PR 1's note). No change.
- **SG4:** approved copy. When the host cannot read the file's catalog, the page says exactly "Couldn't read this file's variables. Close the page and open it again." in place of the host's message. Built here, with its test and mutation.
- **SG5 A:** the switch stays the mockup's track and knob. Moving the studio's other switches over is a separate issue, filed by the coordinator.

**Tests.**
- `apps/studio/test-style-guides.ts` (new, in the studio `test` step): the model, on a typed catalog.
- `apps/plugin/test-style-guides-page.mjs` (new, run by `test:verdict` after `test-build-verdict.mjs`): the built `dist/ui.html`, one arm per decision, named by it (SG4 included), and a control arm showing that away from the page a failed style guide still opens Activity.
- `test-chrome.mjs`: the Figma menu's item reads "Build style guides…" and opens the page without writing; the reveal arm reaches the legacy page through the Pages menu. Screenshots: `scratchpad/s112-shots/`.

**Mutations,** after a `wip:` commit, each restored from HEAD; each fails by name:

| Mutation | Fails |
|---|---|
| a variable boxed below the table level | "tree: below the table level nothing carries a box (100, 200, 4, 8, …)", "tree: each collection folds …" |
| REM on by default | "draw: the defaults (H4–H9): Hex, from each token's role, REM off, Name cell off" |
| the selection always sent as keys | "draw: every table selected sends no tables filter, so the run judges superseded tables" |
| the drawer never quiet (frame's `quiet` always false) | "P1, P11: Activity records the run in its "Style guides" row and does not open by itself while the page shows it (open true…)", "P1 (call 11): a failure the page shows marks Activity, and the drawer stays closed (open true…)" |
| Draw on before Set up file | "P8: Set up file not run: a warning with its button, and Draw off, described by the warning (…disabled false…)" |
| the host's raw message shown in place of SG4's words | "SG4: a catalog the host could not read says exactly the approved words, never the host's message ("in getLocalVariablesAsync: the document is closed")" |
| Draw it again by title, not key | "P6: Draw it again draws Primary alone, by key, and the title box names it (["Primary"], …)" |

**Trap.** Playwright will not click an `aria-disabled` control, and waits for it to be enabled until its timeout. Checking that a later-phase box ignores a click needs `{ force: true }`. Also, `window.postMessage` to itself is asynchronous, so a read straight after a click misses the message the click posted. Settle first.
