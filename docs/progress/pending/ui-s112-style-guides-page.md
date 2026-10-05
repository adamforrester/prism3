## (2026-10-05) — Build style guides: the page (S11.2, PR 2 of 2)

**STATUS: PR open from `ui/s112-style-guides-page`, DO NOT MERGE until the owner has reviewed the screenshots. Merges `ui/s112-style-guide-plumbing` (PR 1, #2161), which must land first.** No engine or emitted change; no change note owed (UI only, the S-slices' precedent). CONTRACT stands.

**Why.** The owner approved the Build style guides mockup (2026-10-05: P1 variant 1, P2 A, P3 B, P4 A, P5 A, P6–P9, P10, P11 "Style guides", P12 all DRAFT copy) and its options (H4–H9), its heading and its menu item (H10, H11). This builds the page to the mockup, on PR 1's plumbing.

**What it does.**
- **A page no tab shows.** `pages.ts` gains `MENU_PAGES` (`styleGuides`), a third kind of `PageKey` beside the legacy and the moved pages. The frame draws it in its own `page` layout: the head, the page scrolling under it, and the drawer at the foot. It is mounted on arrival and released, with its subscriptions, on leaving. No tab is selected while it shows (P10); Close returns to the page the Figma menu was opened from.
- **The Figma menu's "Build style guides…" opens it** (H11). The legacy Style guide page and its Pages menu entry stay, untouched, until the cleanup PR (H12).
- **The model is pure** (`state/style-guides.ts`, tested in Node): the tree from the catalog (a collection's chain of single groups folded, a chain of single groups as one row), the selection as a set of TABLES (P2 A, P3 B), which rows carry a box (at or above the table level), what starts open (the mockup's call 2), the counts and the words beside Draw, the title box, the options and their defaults (H4–H9: Hex, from each role, REM off, Name cell off), and what Draw sends: every option, and the selection as table KEYS only when it is not every table, so a full run still judges superseded tables.
- **The page** (`shell/style-guides.ts`) draws the mockup: What to draw (Collection, Mode fixed to "Every mode" (P4 A), the four kind boxes, the tree with later-phase rows grayed out, tagged and not pickable (P5 A), Deselect all / Select all, Draw by table title), the run (the summary and Draw, then the table list with Waiting, Drawing, Done and Not drawn, Cancel, a stopped run's line, and a failed table first with its reason and Draw it again), and Options, a group per kind in the selection. Set up file not run: the warning box with its button, and Draw off (P8). It asks for the catalog on open and again when Apply Theme's, Set up file's or its own run's verdict lands. At 380: one column, the run first, Draw in a bar pinned to the bottom (P9).
- **Activity (P1 variant 1, the mockup's call 11).** The drawer row is titled "Style guides" (P11; the run guard's title moves with it, as `busy/titles` requires). While the page is open, the drawer does not open by itself for the style guide, when it starts or when it fails: its row, the bar row and the red dot still record it, and the verdict's own request to be shown is not taken as a click. Away from the page, F2 is unchanged. At 380, the closed strip carries the run's progress bar.
- **Chrome.** The page's rules in `chrome.css`, on existing variables plus the switch's four (`track-w`, `track-h`, `thumb`, `thumb-inset`, added to `SHELL_VARS`); every color pair it draws is already declared in `PAIRS`. Two glyphs, `dash` (a part-checked box) and `error`.

**Held for the owner.**
- **The refusal now reads "Style guides is already running. Try again when it finishes."** P11 renames the operation, and the approved refusal is built from the operation's title. The words follow mechanically; flagged in case the owner wants "are".
- **A failed table's reason is the host's own message**, shown as it comes. The mockup's "‹font› is unavailable in this Figma." has no source today: a font Figma cannot load is a named miss inside a drawn table, not a failed table (PR 1's note).
- **A catalog the host could not read** shows the host's message under the intro. No approved copy covers that case.
- **The switch follows the mockup** (concept v6's track and knob), not the studio's existing dot-and-word switch used on the levers pages. Two switch styles now ship.

**Tests.**
- `apps/studio/test-style-guides.ts` (new, in the studio `test` step): the model, on a typed catalog.
- `apps/plugin/test-style-guides-page.mjs` (new, run by `test:verdict` after `test-build-verdict.mjs`): the built `dist/ui.html`, one arm per decision, named by it, and a control arm showing that away from the page a failed style guide still opens Activity.
- `test-chrome.mjs`: the Figma menu's item reads "Build style guides…" and opens the page without writing; the reveal arm reaches the legacy page through the Pages menu. Screenshots: `scratchpad/s112-shots/`.

**Mutations,** after a `wip:` commit, each restored from HEAD; each fails by name:

| Mutation | Fails |
|---|---|
| a variable boxed below the table level | "tree: below the table level nothing carries a box (100, 200, 4, 8, …)", "tree: each collection folds …" |
| REM on by default | "draw: the defaults (H4–H9): Hex, from each token's role, REM off, Name cell off" |
| the selection always sent as keys | "draw: every table selected sends no tables filter, so the run judges superseded tables" |
