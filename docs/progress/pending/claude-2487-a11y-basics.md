## (2026-10-10) — Studio: accessibility basics — a named surface select, one main landmark, the focus floor on legacy controls, finish announcements (#2487 PR 4)

PR 4 of the merged Studio redesign review on #2487. It closes D2, D5, B2 (D#7 and A#7), A15, and D6. The owner's decisions Q194–Q197 (2026-10-10) cover Activity's finish announcement, the selected-segment edge, the display-only specimens and the landmark names.

- **D2.** Brand's "View style guide on" surface select (`style-guide-ground`) is named by its caption. `aria-labelledby` points at the `pfield` span, and the id is minted per draw.
- **D5 and Q197.** The frame's panes (levers plus preview) carry `role="main"`. It's a role rather than the element, because the Build style guides page is already a `<main>` and the two never show together. The lever sections, the Interactive columns and the preview pane lose their names, so they are no longer regions. The preview body becomes a named `group` instead of a region: the scroller can take focus, so it keeps the preview's title as its name. Only Inspect and Activity remain named regions.
- **B2.** One `styles.css` rule gives the chrome's ring (`--p3-focus-width`/`--p3-focus-ring`/`--p3-focus-offset`) to the legacy controls that drew the browser's 1px ring. They are `.seg-b` and `.pvseg-b`, `.pv-tscroll`, `.mo-replay`, `.mo-slowmo-sel` and every `.select`. `.pv-tscroll` is the token list's scrolling table, which Chrome makes focusable. The sweep found it, and no lane had named it. Section 27's sweep no longer skips the token list, Brand's Style guide, Depth & motion's preview or Interactive's. It also reads Inspect › Token list on Semantics, and requires the seven controls by hook (`B2_RING_NEEDS`). The token list's segments gained hooks for this (`token-tier-*`, `token-path-*`).
- **Q195.** `.seg-b.on` gets a 2px `--ink` underline (inset box-shadow), which is how the same view's nested tier segment marks its selection. Section 44 measures it at 3:1 or more against its own fill and its neighbor's ground.
- **Q196 (closes D6).** The Interactive specimens are `inert`. They're no longer Tab stops or AX buttons, and nothing about how they're drawn changes.
- **Q194.** Activity's status line now announces a run's finish, not only its start: "‹Operation› finished." for a clean run, and "‹Operation› failed: ‹first line of the host's detail›." for a failure. A warning reads "‹Operation› finished with a warning: ‹reason›.", told apart the way the Activity button counts failures. All wording is DRAFT and held for the owner on the PR.
- **A15.** The `.sg-failpill` border is the `:root` token `--fail-edge`, at the same value. `lint-contrast.mjs` gained an `UNHELD` list: colors drawn outside `:root` that it reads and prints but holds to no floor, each with its reason. A literal back in that rule fails the gate.

### The trap in Q194: the line was wiped by the next reading

The first version set the finish line and kept the old rule, which empties the line once nothing runs. It read `""` every time, because `closeDetail()` re-enters `onHost` straight away with a reading that has nothing to say, and that reading emptied the line. Now the line is emptied only when it still holds a start or a refusal (`liveRunning`). A finish line stands until the next start replaces it. A run that ends with no verdict still empties the line, as before, so the next start's words are a change.

### Mutations

Each mutation ran after a `wip:` commit, with both bundles rebuilt, and each fails by name:

- `aria-labelledby` dropped → `#2487 … / brand: D2 … (read "")`
- `role="main"` dropped → `D5 Q197 exactly one main landmark … (main 0, …)`
- a lever section or the preview pane named again → the same arm (`regions ["Identity","Modes","Personality"]` or `["Preview"]`)
- the underline dropped → `Q195 … (best null)`
- `inert` dropped → `Q196 Tab never lands on a specimen (39 of 67 stops …)` and the AX arm
- the ring rule dropped → `#2144 … 10 miss: brand style-guide-ground …`
- the finish line not pushed, or the line emptied unconditionally → the four `Q194` arms in `test-build-verdict.mjs`
- the reason dropped → the failure and warning arms
- the border back to a literal → `lint:contrast FAILED — .sg-failpill border-color is #e6a2a2, not var(--fail-edge)`

### Not done, on purpose

- **No skip link.** It isn't decided, so it's held for the owner.
- **Inspect › Token list's two selects have no name either, and its segments expose no selected state.** These are outside this PR's findings, filed as #2492.
- **The fail pill's edge stays 2.09:1.** The text and the "!" carry the state. Whether the edge should reach 3:1 is the owner's call.
