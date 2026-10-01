## (2026-10-01) — UI redesign S1.2: the frame — top bar, tabs with Color's sub-nav, two panes, the legacy frame, narrow mode, test:chrome

**STATUS: branch `ui/s1-2-frame`, stacked on `ui/s1-1-chrome-tokens` (#1905); not pushed.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The spec is `docs/superpowers/ui-redesign/implementation-plan.md` §3.3–3.6, §4, §6 and §9, with the owner's decisions D1, D2, D5, D6, D8, the radius split (2026-10-01), and the owner's QA notes on v6, recorded in `docs/superpowers/ui-redesign/decisions-2026-10-01-qa.md` (Q1–Q4).

**What the user sees.** Every page still renders its legacy page, but inside the new frame:
- **A top bar** on neutral 050 with a hairline: the brand switcher (the brand's swatch, its name, a chevron), then Export, the **Pages** menu (the old rail, D1 and D5) and, in the studio, the light / dark / system **theme toggle**. In the plugin, the write actions and their status pills stay in the bar until S1.4 moves them into the Figma menu and the Activity drawer, with **Apply to Figma** last and the only inverse-filled control.
- **The tab row** on neutral 025: Brand · Color · Type · Shape · Depth & motion · Layout · Components, a real `tablist` (arrow keys, Home, End, roving tab stop). A magnifier at its end opens settings search (Q3).
- **Color's sub-nav** — Palettes · Surfaces & fills · Interactive, a segmented `tablist` — **under** the tab row's divider (Q1).
- **The legacy frame**, full width under the tab row, pinned light, showing the legacy page plan §4 maps the tab to. Depth & motion adds a local switch labeled **Elevation · Motion** (D8). Web Components shows the legacy Size & radius page (its Buttons block), the plugin's shows the legacy Components page.
- **Dark mode (D2).** The chrome follows the studio's toggle (system by default, kept per viewer in `localStorage`) or Figma's theme in the plugin, live. The legacy frame, the notices row and every legacy popover (brand menu, Pages menu, export and prune dialogs) carry `data-theme="light"`, so they stay light, fields included.
- **Narrow (380 × 420).** One sticky top row (brand, Export and Pages as glyphs, the theme glyph); the tabs become a select with the magnifier beside it; nothing else sticks.
- **The two panes** exist (levers on 025, preview on white, the preview's title row) but no page renders them until S2 moves Color › Palettes.

### Diagnosis and structure

- **The frame is mounted once per app view and lends slots.** `src/shell/frame.ts` owns the bar, the tab row, the sub-nav, the notices row, the legacy frame and the panes. `main.ts`'s `build()` still re-renders what it always did, but into the frame's slots: the bar's legacy controls (`renderBar`), the notices (the error bar and the apply detail) and the legacy page. Because the frame outlives the render, a tab keeps focus across the page change it causes.
- **Navigation is the P2 model, both ways.** A tab, the Depth & motion switch and the Pages menu all call `setPage` and nothing else. `main.ts` subscribes to `page` once, at module load, and re-renders the legacy frame; the tab row subscribes on mount (and unsubscribes on unmount) for its own selection. `loadBrand` sets a `loading` flag around `loadInput`, because `loadInput` sets the page before it resolves the new brand, and the subscriber must not render a half-loaded brand.
- **Which tab is selected is shell state, not a function of the page,** because Shape and web Components share one legacy page. A page change from elsewhere keeps the selection when it still shows the page, and otherwise picks the first tab that does (`placeOfPage`); a page no tab shows (the plugin's Style guide) selects none.
- **The repaint guard (plan §3.10) lands here**, with the first shell code: `test-shell-imports.ts` parses every file under `src/shell/`, `src/domains/` and `src/preview/` and fails on any identifier named `apply`, `applyFull`, `build`, `renderBar` or `setVolatile` (a literal list), naming file and line. It first proves its detector on a fixture holding all five, and that comments and strings are not references.
- **Narrow is a width class, not a media query**, because `chrome.css` may hold no raw length: `data-w="narrow"` from a `ResizeObserver` at 560px, concept v6's break.
- **`--chrome-h`** is published by the frame (`syncSticky`): the whole head when wide, the top row alone when narrow, so the legacy mode strip sticks under what actually sticks.

### Decisions applied

- **Radius:** `radius-xl` is the product's first own row (`PRODUCT_VARS` in `spec.mjs`, from `radius.xl`, following the radius lever). Containers (the theme menu, the segmented track) take it; controls (buttons, fields, segments, the tab focus ring) take `radius-lg`. The segmented track is concentric: `radius-xl` around `radius-lg` segments at a 2px inset.
- **Layering (IA-2):** bar on `background.secondary`, the tab row and levers on `core.palette.neutral.025` through v6's `levers-bg` row, the preview on `background.primary`; dark as v6 chose. **Edges (B1):** `edge-bar` (`field.border.rest`, light) on the bar, `edge` (`border.secondary`, light) on the 025 ground and on white.
- **Fonts and finish:** Inter on every chrome text node (measured by CDP), no shadows, Apply the only inverse fill.
- **D6** is S1.4's: the bottom-left agent chip stays, and is the one named inline-style exemption in `test:chrome`, which fails as stale the day the chip stops rendering.

### The owner's QA notes (`decisions-2026-10-01-qa.md`)

- **Q1** — the sub-nav is its own row under the tab row's hairline; in the two-pane layout it opens the levers column.
- **Q2** — the tab row and the preview title row both take `bar-h` and sit in **one grid row**, so their dividers cannot drift apart whatever either holds. `test:chrome` checks the two bottom edges at 1280, light and dark, on Color (with the sub-nav) and Brand (without): **0.00px apart**. No page renders the panes in S1.2, so the check sets `data-layout="panes"` itself, measures the real stylesheet, and puts it back; S2 replaces the force with Color › Palettes.
- **Q3 — for the owner's review: keep or remove.** Search sits behind a magnifier (named "Search settings", 28px and up) at the end of the tab row. It opens a field in place; Escape or the close button clears it and returns focus to the magnifier. The field is built once and never rebuilt: typing writes `setSearch`, the legacy page filters itself in a pass over its DOM (`applySearch`, subscribed to `search` and run after every legacy render), and the count comes back through `search:hits` to a polite status line. Typing "radius" on Shape reads "radius", shows the radius lever (Corner softness, and Radius anchor and Hairline radius), and hides Density. **Deferred:** search across every page, with the page each result lives on, needs the levers as data and arrives with the levers panel from S2; bespoke legacy editors (palette rows, the surfaces grid, the gradient editor) are not knobs and hide while a search runs.
- **Q4** is recorded as deferred: a trial in one slice, likely S2.

### test:chrome

`apps/studio/test-chrome.mjs`, wired into `ci.yml` (after both builds), `verify.ts`, CLAUDE.md §4, CONTRIBUTING.md §3 and the PR template. It drives both bundles over host × theme × width (1280, 640, 380 × 420), then every place at 1280 in both themes, then Q2, #1031 and behavior. Every color comes from the render; every floor, expected control, the legacy map (plan §4's table), the font name and the layer step are literals in the file.

| Floor (literal) | Lowest measured |
|---|---|
| Text 4.5:1 | 4.64:1 (dark, `text-2` tabs on `levers-bg`) |
| Edges and indicators 3:1 | 3.06:1 (light 380, the tab select on neutral 025: B1's own floor) |
| Focus rings 2px at 3:1 | 15:1, every ring 2px |
| Targets 24 × 24 | 28px (the narrow bar's icon buttons) |
| Layers 1.04:1 per step | light 1.07 and 1.13; dark 1.08 and 1.11 |

Also: every chrome text element draws the embedded Inter; no shadows; no runtime inline value outside `[data-content]` (the brand swatch is the one, marked `data-content`); no horizontal scroll at 640, 380 or 1280; every place in `LEGACY_PAGES` renders the legacy frame and lands on its plan §4 page; a legacy field under a dark theme resolves a light `color-scheme`. Run time about 46 s (1,894 assertions).

**Mutations, each after a commit, diff checked non-empty, each failing by name:**

| Mutation | Fails with |
|---|---|
| M1 `.p3-btn` given `var(--p3-edge)` | `edge button[export-open] "Export" 2.7:1 < 3` (light) |
| M2 the tab row painted `bg-page` | `IA-2 layers: levers-bg on bg-page 1:1, … (they turn back)` |
| M3 a runtime `box-shadow` on the bar | `shadow: div[top-bar] …: rgba(0, 0, 0, 0.2) 0px 1px 2px 0px` |
| M4 `style.color` on the brand name | `runtime inline value outside [data-content] — span.p3-brand-name "prism3" sets color` |
| M5 the preview title row given its own height | `Q2 light 1280 / color-palettes: … dividers are 17.00px apart` |
| M6 the search field rebuilt per keystroke | `search: the field reads "radius" after typing it (search 1280: read "suidar")` — concept v6's bug, reproduced |
| M7 `import { build } from '../main'` in `frame.ts` | `src/shell/frame.ts:28: references the legacy repaint tier "build"` |
| M8 the `test:chrome` line dropped from CLAUDE.md | `lint-doc-gates`: `"New shell chrome suite (UI redesign S1.2)" is missing from CLAUDE.md §4` |
| M9 Brand's legacy list emptied | `page brand is listed as legacy and renders the legacy frame (… layout "panes", …)` |
| M10 Type mapped to the Layout page | `type: the tab row lands on legacy page "typography" (plan §4) — shows "layout"` |
| M11 the tabs set in the mono face | `every chrome text element draws in the embedded Inter — … drew JetBrains Mono` |
| M12 the legacy frame's light pin removed | `every legacy field resolves a light color-scheme … — pname-input mono "accent" dark` (the ink alone stays 15.96:1, which is why the scheme is the check) |
| M13 the magnifier shrunk | `every chrome control is at least 24 × 24 — button[search-open] "Search settings" 16.0 × 16.0` |
| M14 focus ring 1px in `line-1` | `focus brand-switcher 1px 1.13:1` |
| M15 sub-page labels in `text-2` | `text button[color-sub-fills] "Surfaces & fills" 4.16:1` (dark) |

### Suites moved onto the frame

The rail's hooks and `active` state moved with it into the Pages menu, so the sweeps reach every legacy page by the same hooks; each suite opens the menu first (smoke, verdict, start, the mode audit) and waits for the legacy frame's `data-legacy-page`, since a closed menu shows no active item. Other changes, each for a stated reason:
- **smoke** `STATE_NODE_FLOOR` 20 → 12: the rail's 20-odd labels, subtitles, note and stamp were part of every state's count; the sparsest legitimate states (Typography and Layout in a derived mode) now measure 17. §4's #1031 arm reads the popover's and each control's `color-scheme`, no longer the document's, which is dark in a dark theme now by design.
- **start** §8 holds the same line per field (no dark scheme over a light ground) and on the legacy frame; "the editor rendered" counts tabs, not rail rows.
- **verdict** reads the apply detail's visibility from computed style; the bar's notices now hide with `hidden`, not an inline `display`.
- The build stamp (#474) moved from the rail's foot into the Pages menu, with a `build-stamp` hook.

Counts: smoke 3,380, verdict 158 of 158, start all pass, studio `test` adds `test-shell-imports` (11).

### Traps

- **The scratchpad is shared between lanes.** A runner script written to the session scratchpad was overwritten by another lane's battery (which `cd`s into its own worktree) and one invocation ran that lane's battery instead; it restored its tree. Keep runner scripts in a lane-private directory.
- **`getComputedStyle` works on `display: none`.** The layer check reads the preview pane's ground from its computed style while the pane is hidden; that is the value it will paint, but it is not yet a rendered pixel.
- **A legacy control in the bar inherits the bar's font and color** unless the rule sets them per control. No chrome rule sets a font or color on a container that holds legacy content.
- **`[hidden]` loses to an author `display`.** The legacy-frame search marks use their own attribute with an `!important` rule scoped to the legacy frame.
- **The tab row is tight in the two-pane layout**: seven tabs and the magnifier overflow the 42% column at 1280 and scroll. Nothing renders it in S1.2; S2 decides.

### Held for the owner

Each is the option closest to v6, picked and flagged under the owner's overnight rule; none is brand-facing.
- **Q3 search: keep or remove** (the owner's own question). Also its copy: "Search settings", "N settings match", "No setting on this page matches", "Close search".
- **"Pages" is a top-bar button at every width**, not an overflow item (plan §4 says "in the top bar's overflow"; the bar has no overflow menu until S1.3/S1.4 give it content). At 380, Export, Pages and the theme drop to glyphs instead of moving into a "More" menu as v6 did.
- **The theme menu counts as a container** (`radius-xl`) under the 2026-10-01 radius split, which names cards, panels and the drawer.
- **No hover wash.** The stricter S1.1 build refuses an undeclared color, so a hover shows an edge (buttons, segments, the ghost theme button) or the inset fill (menu items) instead of v6's translucent wash.
- **Plugin at 380:** Apply to Figma and Prune stale wrap to a second bar row until S1.4 moves them.
- **The legacy brand menu hangs from the switcher's left edge** now that the switcher starts the bar (it used to sit at the right).
- **The Depth & motion switch sits inside the legacy frame, aligned with the tabs** (24px), not with the legacy page's centered column.
- **The legacy page column widens** from about 850px beside the rail to the old 1,120px cap, since the rail is gone.
- **"Apply to Figma" keeps its label**; v6 calls it "Apply Theme", a copy change left to S1.4.

**Verify.** `npm run verify` after merging the updated S1.1 (`a24bc037`): 69 gates, 68 PASS and 1 FAIL in 958 s; the one failure was `lint-progress-order` refusing this fragment's own unfilled placeholders, fixed in the next commit, after which `lint-progress-order` passes on its own. `chrome` 46 s, `smoke` 210 s, `mode-audit` 32 s (the gate #1900 added: 12 of 12 hooks, through the Pages menu).
