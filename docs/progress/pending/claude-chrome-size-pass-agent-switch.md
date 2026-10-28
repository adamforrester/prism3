## (2026-10-28) — Chrome size pass and the Agent switch (#3083, Q3083.1 A, Q3083.2 B–Q3083.7 B)

**Status:** chrome-only build of the owner's 2026-10-28 picks on the #3083 size-pass wireframe, on the plugin and the web
studio alike. Patch change note: no token, emitted tree or component surface moves. CONTRACT unchanged. Before-and-after
renders of the built plugin UI at 1280 and 380, light and dark, are in a private artifact linked from the PR.

### What changed

- **Type (Q3083.1 A).** `fs-20` 20 → 18 (view title), `fs-16` 16 → 14 (section and dialog titles), `fs-14` 14 → 12 (body
  and controls). `fs-12` (secondary) stays 12, set apart by its ink. Each variable keeps its old name and reads a new
  token path (`chrome/spec.mjs` V6_VARS, `chrome/tokens.mjs` TILE_VARS), as the wireframe proposed, so the mockups and
  the product still read one row and no rule moves. The names now lie about their sizes; renaming them is left to a
  later pass, once the sizes settle (PR Q3083.9).
- **Controls (Q3083.2 B).** `ctl-h-sm` 36 → 32 (`core.dimension.32`: buttons, the brand switcher, Update file, selects),
  `ctl-h` 40 → 36 (`size.sm.height`: fields, chips, the segmented track). `bar-h` (the bar and the tab row, 56) and
  `ctl-h-xs` (the narrow tier's 28) are unchanged.
- **Hand edits (Q3083.3 A, Q3083.4 A).** Update file's segmented control in the body is now a `p3-select` labeled
  "Hand edits", in `p3-bardlg-foot` just before Cancel and Update file, shown only when the check finds hand edits. It
  is 32px tall (`ctl-h-sm`). At 380 it takes its own row (`flex-basis: 100%`). The options read "Keep", "Overwrite",
  "Accept as baseline" (DRAFT, `UPDATE_COPY.handChoice`). A repaint keeps focus on it (`data-key="hand"`).
- **Agent (Q3083.5 B, Q3083.6 A, Q3083.7 B).** The bar's Agent tile is now the chrome's switch (`switchEl`) with a
  `<label>` "Agent" beside it, both directly on the bar ground. It is `role="switch"`, `aria-checked`, named "Agent",
  and still posts `agent-link`, same hook (`agent-toggle`). The label is a `<label for>` rather than text inside the
  button, so the switch stays the one track-and-knob kind #2183 holds every switch to, and a click on the word turns it
  too. At 380 (and under the bar's fit steps) the label drops and the switch stands alone.
  - **Size:** bar-only rows in PRODUCT_VARS: `bar-track-w` 36, `bar-track-h` 20, `bar-thumb` 16, `bar-thumb-inset` 2,
    from the dimension grid (no brand token: `control.size.*` stops at sm). Hit target: the switch button is 36 × 32 at
    1280 and 36 × 28 at 380, both over the 24px floor.
  - **Colors:** off, the track's edge is `edge-bar` (its declared pair on `bar-bg`, 3.52:1 in dark), not `edge` (2.92:1
    on the dark bar). On, the track is `inv-bg`, hover `inv-bg-2`. **New pairs in `spec.mjs` PAIRS:** `inv-bg` on
    `bar-bg` (3:1) and `inv-bg-2` on `bar-bg` (3:1). `edge-bar` on `bar-bg`'s description now names the off track.
    The knob keeps the page switch's roles on the track's own fill (`icon-2` on `bg-page`, `inv-text` on `inv-bg`,
    both already declared).
  - **Retired:** the tile, its green dot (`.p3-agent-dot`), the mark's padding rule, and the on fill and edge on the
    bar (Q738 A, Q788 C). The rail's on-fill rule keeps its current-area arm alone (no rail tile sets `data-on` now).
- **One fix found in the renders:** the page switch's on-knob rule comes later in `chrome.css` at the same weight as the
  bar switch's, so the on knob moved by the page switch's 24px and overshot the 36px track. The bar rule now carries
  one more class; 29b holds the knob inside the track.

### Tests moved with it (`test:chrome`)

- **30 (TY2 A):** the oracle's literal map (`HEADING_TOKEN_PATHS`) moves `fs-14` → `core.font.size.12` and `fs-16` →
  `core.font.size.14`, typed from the decision, still not imported from `tokens.mjs`.
- **#2322:** the view title is 18px Bold at −4%.
- **C3:** the build stamp and the menu items are both 12 now, so the stamp is held to "no larger, and in another ink"
  (PR Q3083.8).
- **29 (S13.1):** no bar tiles on either host now; Agent is a bare switch (no `p3-btn`, no fill, no edge). New arm: a
  bar button 32, a field 36, the bar 56, above the narrow tier.
- **29b:** the Q738 A / Q788 C arm is replaced by the Agent switch as drawn, link off and on, 1280 and 380: a switch
  named "Agent", no tile mark or dot, track 36 × 20 with the knob inside it, hit target ≥ 24 each way, label shown at
  1280 and dropped at 380, and each color against the ground behind it (off: edge ≥ 3:1 on the bar, knob ≥ 3:1 on the
  track; on: track ≥ 3:1 on the bar, knob ≥ 3:1 on the track).
- **T7 / Q731, #2879, #2213:** `aria-pressed` → `aria-checked`, `role="switch"`, no dot.
- **39 (forced colors):** the `agent dot` case becomes `agent switch`: on, the track in `Highlight`, the knob in
  `HighlightText`.
- **ia2:** the hand-edits choice is a 32px select labeled "Hand edits", in the foot before Cancel and Update file, with
  the three short words; and in the #3082 pass, on the foot's row at 1280 and on its own row at 400.
- `apps/plugin/test-start-screen.mjs` reads the bar switch's `aria-checked`.

### Mutations (each in a `wip:` commit, each failing by name)

Each was applied alone to the committed tree, both bundles rebuilt, and only the sections named run; each restored
before the next, the tree checked clean.

- `fs-16` back to `core.font.size.16` → `TY2 A … L1 "Identity" (section title) fs 16, want fs-16 14` (352, section 30).
- `fs-20` back to `core.font.size.20` → `#2322 #3083 web … the view title is 18px Bold at −4%` (2).
- `ctl-h-sm` back to `size.sm.height` → `S13.1 … #3083 Q3083.2 B: a bar button is 32 tall …` (brand 36; 8).
- `ctl-h` back to `core.dimension.40` → the same arm (field 40; 8).
- The off track's edge back to `edge` → `29b figma dark 1280: #3083 Q3083.5 B: with the link off, the Agent switch's
  track edge clears 3:1 … 2.92:1` (dark only, 1280 and 380; light passes at 3.18:1, as the wireframe measured).
- The track at the page switch's width → `29b … #3083 Q3083.7 B: the Agent switch's track is the bar-only 36 × 20 …`
  (track [48,20]; 8). Dropping the bar size rows' rule outright fails the build instead (`[variables] mapped but unused
  variable --p3-bar-track-h`).
- The on knob's rule one class weaker → the same arm, `knob inside false` (4). It first passed: 29b read the knob
  mid-slide, so the arm now waits for the knob's transition to finish.
- The narrow rule hiding the label dropped → `29b figma … 380: #3083 Q3083.6 A: the Agent switch's label is dropped at
  380` (4).
- A dot put back on the switch → `29b … #3083 Q3083.5 B: … with no tile mark and no dot` (8).
- `p3-btn` added to the switch → `S13.1 figma …: #3083 Q3083.5 B: Agent is a bare switch on the bar ground …` (6).
- The hand-edits select pushed to the body → `IA2 figma … 1280: #3083 Q3083.3 A: the hand-edits choice is a 32px select
  … in the foot …` and `… sits in the foot's row …` (4).
- The narrow `flex-basis` dropped → `IA2 figma … 400: #3083 Q3083.3 A: the hand-edits select takes its own row …` (2).
- The new pair `inv-bg` on `bar-bg` held to 30:1 → the chrome build fails, `[pairs] inv-bg on bar-bg in dark: 15.00:1 <
  30:1 (the Agent switch's on track on the top bar)`, and in light at 16.00:1.

### Traps

- **A switch's knob slides.** Any probe of its position must wait for the transition (`getAnimations()`), or it reads
  a knob that has not moved yet and passes on a broken rule.
- **Same-weight rules later in `chrome.css` win.** The page switch's rules sit near the end of the file; a variant
  written earlier needs one more class, not just the same selector shape.
- **Hand edits at 380:** the dialog sits inside `.p3-frame`, so the narrow tier's own-row rule keys on
  `.p3-frame[data-w="narrow"]` like the other dialog rules.
