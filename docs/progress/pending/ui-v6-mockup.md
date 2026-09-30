## (2026-09-30) — UI redesign: concept v6 mockup (the owner's v5 review applied)

**STATUS: PR open from `ui/v6-mockup`, labeled DO NOT MERGE, for the owner to review.** Design artifacts only, under `docs/superpowers/ui-redesign/`: `concept-v6.src.html`, `concept-v6.html`, `build-v6.mjs`, `audit-v6.mjs` and `concept-v6.md`. The v5 files are unchanged and stay the record. No engine change and no emitted artifact moves, so no ENGINE bump and `CONTRACT_VERSION` is unchanged. `chrome-tokens.mjs` is unchanged too: v6's per-theme rows live in `build-v6.mjs`, so the tile and v5 still build byte-identical.

**What landed.** v5 with `decisions-2026-09-30-v5-review.md` applied: Color gets three sub-pages (IA-1); each tab or sub-page has one preview, which changes only when the page does (V1), and "Keep this view" is gone (V12); a Roles toggle beside the preview title shows that sub-page's families as the editable role × mode matrix (V2); the chrome is layered white preview, neutral 025 levers, neutral 050 top bar (IA-2) with control edges near 3:1 (B1); the plugin has an "Agent: Off" chip (IA-3); and the content sits in containers with large square ramps, big live samples and full-width gradients (V7, V8). The v5 step picker is reused for the matrix and the fill rows (V9).

**Diagnosis: V1 moves homes from sections to pages, so the gate moved with them.** v5's HOMES gave every section a home and the preview followed scroll and focus. In v6 a home belongs to a tab, or to a sub-page when the tab has them, and the build now fails on a section that declares one (that is how scroll-following would come back as data). The audit's oracle is a literal map of the owner's IA (`EXPECT_HOME`), not HOMES, so a swapped home fails in the audit even though the build still sees one home per view.

**Diagnosis: V10 was a rule problem, not a placement problem.** Fills were never manifest levers (they are role overrides), and four of the interactive levers carry the manifest's `advanced` flag. Moving them to their own sub-pages would still have hidden them. The build's tier rule now names the pages where every lever is shown, as a literal (`FIRST_CLASS`: Layout, Surfaces & fills, Interactive). This changes Q4/Q5's rule, and `concept-v6.md` asks the owner to confirm it.

**Diagnosis: B1 is a threshold, so it maps to different tokens per ground and per theme.** One edge role cannot sit near 3:1 on three grounds in two themes. Light: `border.secondary` on white (3.28:1) and neutral 025 (3.06:1), `field.border.rest` on the neutral 050 bar (3.18:1). Dark, computed rather than guessed: `field.border.rest` (neutral 550) clears 3:1 closest on neutral 950 and 900, and `border.secondary` (neutral 500) on the neutral 850 bar. The page sets one CSS variable per ground (`--t-edge`), and the build declares every edge-on-ground pair.

**Tradeoffs made on purpose.**
- **Dark layering is 950 / 900 / 850** (`background.primary`, `.secondary`, `.tertiary`). No step sits between 950 and 900, so the dark levers panel lands on a real role while the light one uses the ramp step (neutral 025 has no role; noted in `concept-v6.md` as a possible engine role, not filed). The cost: `text.secondary` is 4.17:1 on neutral 850, so nothing on the dark bar is set in secondary text, and the Color sub-page labels stay primary.
- **The app opens on Color › Palettes**, as v5's Q2 decided, even though Brand is the first tab. This is an owner question.
- **Editing lives in the levers; the preview shows results.** The one exception is the Roles matrix, which V2 puts in the preview.
- **Gradient stops are editable now** (kind, angle, interpolation, stop palette, step and position). v5 stubbed them.

**Tried and discarded.**
- Ramps as one grid of 20 cells with labels inside each cell. The lightest step vanished against the white card, and at the narrow width a wrapped strip put labels under the wrong swatches. Each ramp is now strips of ten (five when the preview is slim) with a hairline, and the labels sit in their own row.
- A Roles toggle drawn as a segmented control next to an `h2`. It printed the view's name twice. The title itself is now two text tabs, the view and Roles.
- Repeating a card's title as its only lever's label ("Breakpoints / Breakpoints"). The card title now carries that lever's info button.

**Traps for whoever re-verifies this.**
- **A brand specimen drawn on the chrome's card is wrong in one theme.** With dark chrome and the light preview mode, the light-mode outline buttons, links and `icon.primary` vanished into the dark card. The audit skips `[data-content]`, so it could not see it; a screenshot review did. Every specimen now sits on the brand's own `background.primary` for the previewed mode.
- **v5's switch never toggled on a real click.** The drawn track sat on top of its input and took the pointer. The audit found it only once it clicked the Agent switch like a person would. The track now passes clicks through.
- **Commit before every mutation.** The battery restores with `git checkout -- <file>`, and its driver refuses to start a mutation on an unclean tree.
