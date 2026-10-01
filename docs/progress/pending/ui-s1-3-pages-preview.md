## (2026-10-01) — UI redesign S1.3: pages as data, one home per page, the mode control, the verdict and Inspect

**STATUS: PR open from `ui/s1-3-pages-preview`, stacked on #1922 (S1.2), itself stacked on #1905 (S1.1).** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The spec is `docs/superpowers/ui-redesign/implementation-plan.md` §3.5, §3.7, §3.8, §3.10, §4 and §6, with the owner's decisions D4 (satisfied by #1883 through #1893, so the Decisions log ships), Q1 model B, V1, V12, v5 Q2 and Q7 (Health at the top of Inspect › Contrast), the 2026-10-01 radius split, and the QA notes Q1–Q4 (`decisions-2026-10-01-qa.md`).

**What the user sees.**
- **The verdict** on the top bar, after the brand switcher: a status dot and "All 884 pairs at or above floor" (concept v6's words; "N of 884 below floor, M modes" when something fails). At 380 only the dot shows; the name always carries the line. Clicking it opens **Inspect › Contrast**.
- **Inspect** opens over the page and closes back to it, with its scroll position and the focus on whatever opened it. Its header holds three tabs, **Contrast · Tokens · Decisions log**, and "Back to ‹the page's home›". Escape closes it, and so does a tab change. **Contrast** starts with **Health** ("All 884 pairs at or above floor.", "221 per mode × 4 modes", one line per mode), then the existing contrast contract table. **Tokens** is the existing token list, whose own controls now redraw it inside Inspect. **Decisions log** lists the engine's notes for the brand, verbatim and in the engine's order, with concept v6's line "N decisions the engine recorded for this brand, in the engine's own words."
- **Every page is still legacy**, so the two panes (and with them the preview header's title, the mode control and the Inspect menu) are built but not shown until S2 moves Color › Palettes. While a page is legacy, Inspect covers the legacy frame, which is that page's preview until its slice moves it.
- **The mode control** (Q1, model B), in the preview header: a radio group of the brand's modes, each with a status dot and the count below floor when there is one; derived modes (high contrast, wireframe) are hatched. It writes `setCurrentMode`, the setter the legacy mode strip uses.

### Diagnosis and structure

- **`shell/pages.ts` is concept v6's `HOMES` block as a typed `as const` constant** (`VIEWS`, `INSPECT`, `DOMAINS` with sub-pages, sections, rows and lever keys), plus each page's `legacy` list from S1.2. The prose (intros, section descriptions) is v6's, verbatim. `TABS`, `legacyOf`, `placeOfPage` and the rest keep their S1.2 shapes, now read off the data, and `homeOf` and `viewLabel` are new.
- **`PageKey` is derived from the data** (closes #1846's second item for good): every key a `legacy` list names, plus `MENU_LEGACY` (the plugin's Style guide). `state/store.ts` re-exports it. `NAV` in `main.ts` is still checked against it both ways, so a slice that empties a list must delete the rail row in the same change, or `typecheck` fails.
- **`state/verdict.ts`** is DOM-free: every role with a floor (`min > 0`, measured against something other than itself), in every mode, from `resolveAllModes`, as concept v6 counts it. It is cached by the theme object's identity, so the bar, the mode control and Health share one count per edit. Derived modes come from the engine's own `BUILTIN_MODES` kinds.
- **`shell/preview.ts`** holds the mode control, the verdict button, the Inspect menu and the Inspect views. **`shell/frame.ts`** owns Inspect's state and region. Everything repaints from store topics (`brand`, `mode`, `page`); nothing names a legacy tier, and `test-shell-imports.ts` now scans `preview.ts` by name.
- **Legacy views are lent, not imported.** `main.ts` passes `renderPreviewContracts` and `renderPreviewTokens` to `mountFrame`. The token list takes a `repaint` callback (defaulting to `paintVolatile`, so the legacy Preview page is unchanged), and Inspect lends its own. Both draw into hosts pinned light (D2), since `styles.css` has no dark theme. Health and the Decisions log follow the chrome theme.
- **A mode change from the shell reaches the legacy page through the store.** `main.ts` subscribes to `mode` once and, a microtask later, re-renders the legacy page only if it was last drawn in another mode. The legacy writers already repaint synchronously, so they never cause a second render; the shell's control, which repaints nothing legacy, does get one.
- **The frame writes `data-layout` only when the layout a place calls for changes.** That is what lets `test:chrome` force the two panes and keep them forced across a re-render (see the traps).
- **The bar may wrap, and the verdict gives way first.** The verdict takes the bar's free space up to its full line (`flex: 100 1 0; max-width: max-content`) and truncates before anything wraps. At 640 the plugin's bar wraps Apply to a second row until S1.4 moves the write actions into the Figma menu.

### The Q2 check stays forced

No page renders the two panes for real in S1.3, so the Q2 divider check keeps forcing `data-layout="panes"`, as S1.2 left it. S1.3's preview-header checks force it the same way. S2 replaces every force with Color › Palettes. New in S1.3: Inspect's header divider meets the tab row's at 0.00px when Inspect covers the preview.

### Tests

- **`test-pages.ts`** (new, in the studio `test` script, 53 assertions) ports `build-v6.mjs` checks 1–3. **Coverage:** every manifest lever is placed once, with its tier from the manifest flag outside the literal `FIRST_CLASS` pages. **Homes:** each tab or sub-page has one home, no section and no tab with sub-pages declares one, no home is an Inspect view, and every view is some page's home. **Roles:** all 268 emitted color roles are in exactly one Roles family (Surfaces & fills 121, Interactive 147), and Palettes has none. The oracles are the committed `lever-manifest.json` and `out/prism3.tokens.json`, plus literal IA-1, `FIRST_CLASS`, `ROLES_PAGES` and `NO_ROLES`. The duplicate-key check is `typecheck`'s (TS1117).
- **`test-verdict-count.ts`** (new, 21 assertions). The literals are 884, 221 per mode, prism3's four modes, and concept v6's copy. A below-floor override must be counted, and the derived set must match the owner's mode model.
- **`test:chrome`** grows to **3,893 assertions, in about 1 min 52 s** (S1.2's run was 46 s). New sections:
  - **Homes.** Every place lands on its literal home and title, visited in two orders, on both hosts. Scrolling (27 checks per host) and focusing (128 web, 110 plugin) never move the preview. Nothing offers "Keep this view".
  - **Inspect, over the legacy frame,** for both hosts and both themes at 1280, 640 and 380. The verdict's name and line, Contrast selected, Health first with its literal lines, the contract table present, Tokens redrawn in place by its own control, and the Decisions log equal to the oracle: 18 notes from `$extensions.prism3.decisions` in the committed `out/prism3.tokens.json`. Back and Escape restore the page, its scroll and the opener's focus. The full chrome probe (contrast, edges, targets, fonts, shadows, inline values, overflow) runs on all three views. A tab change closes Inspect.
  - **The preview header, panes forced.** The modes are a radiogroup of the literal four, with the derived ones hatched. Choosing Dark makes the legacy page draw Dark, and the legacy strip's HC light checks HC light here. Arrow keys move along the radios. Inspect from the menu covers the preview beside the levers, and closes back to it with focus on Inspect. The chrome probe runs at every width on both hosts.
- **Suites:** smoke 3,380 pass, start all pass, verdict 191 of 191 after the bc7ccf8a merge, and the mode audit (`--check-badges`) 12 of 12.

**Cost of the verdict:** it adds one `resolveAllModes` per edit, 18.9 ms in Node for prism3, on top of a rebuild (`brandTheme` and `resolvePreview`) of 81.0 ms. `resolvePreview` runs its own `resolveAllModes` internally and does not expose the result; sharing it would be an engine change, so it is left as is.

**Mutations, each after a commit, diff checked non-empty, each failing by name:**

| Mutation | Fails with |
|---|---|
| M1 `radiusHairline` removed from the data | `manifest keys with no home: radiusHairline` |
| M2 the Motion section given a home | `section declares a home view: Depth & motion › Motion → "depth"` |
| M3 `veil` dropped from Surfaces & fills' roles | `color roles in no Color sub-page's Roles matrix: veil.dark.subtle, …` |
| M4 Interactive palettes put behind Show advanced | `… strictInteractiveContrast: manifest advanced=true, placed advanced in Color › Interactive › Interactive palettes` (with `interactivePalettes`) |
| M5 the verdict counts roles with no floor | `prism3 gates 884 roles across its modes (the v4 review's number) — counted 936` |
| M6 Brand's home swapped to Components' | `V1 home: web brand shows comps ("Components"), want guide ("Style guide")` |
| M7 scroll-following added to the frame | `V1 scroll: web color-palettes scrolled to 50% and the preview stayed palettes (now guide)` |
| M8 the verdict opens Tokens | `the verdict opens Inspect › Contrast (web light 1280: selected "Tokens")` |
| M9 Back leaves Inspect open | `Inspect closes back to the legacy page (web light 1280: Inspect shown, …)` |
| M10 the mode control keeps a local value instead of `setCurrentMode` | `mode control: choosing Dark makes the legacy page draw Dark (… the legacy mode strip shows "Light")` |
| M11 the Decisions log drops its first note | `the Decisions log shows the engine's 18 decisions, verbatim and in order — showed 17` |
| M12 `import { apply } from '../main'` in `preview.ts` | `src/shell/preview.ts:25: references the legacy repaint tier "apply"` |
| M13 focus-following added to the frame | `V1 focus: web color-palettes control 0 took focus and the preview stayed palettes (now guide)` |
| M14 Health moved below the contract table | `Health is at the top of Inspect › Contrast (first is "inspect-contrast-table")` |

Dropping only the `against === 'self'` clause survives `test-verdict-count`, because prism3's self-measured roles carry no minimum. M5 targets the clause that counts. The first M8 run timed out on a wait for Health instead of failing by name; the check now waits for Inspect's body, and the rerun fails by name.

### Traps

- **The embedded Inter subset lacks U+2192 (→)**, and one engine note uses it (typography: "weights … → 300/400/…"). The Decisions log shows notes verbatim (D4), so a device face draws that one glyph. `test:chrome` allows a non-Inter face only for the characters in the literal `FACE_GAPS` list, one glyph each, so any other fallback still fails. The fix is a wider font subset, or the engine choosing another character, and either is outside this slice.
- **A forced layout dies on the next render** unless the frame writes `data-layout` only when it changes. Opening Inspect re-renders, so S1.2's one-shot force could not hold through S1.3's checks.
- **The narrow tab-row rule hid every `.p3-tabs`,** Inspect's included. It is scoped to `.p3-nav` now.
- **Palettes has no legacy mode strip** (palettes are primitives), so the mode-control checks run on Surfaces & fills.

### Held for the owner

Each is the option closest to v6, picked and flagged under the owner's overnight rule; none is brand-facing.
- **Inspect over the legacy frame.** v6 opens Inspect over the preview pane. Until a page moves, the legacy frame stands in for that pane, so the verdict works on every page today.
- **The preview header is one row.** v6 put the modes on a second row, which offset the dividers. Q2 asks for one shared row height, so the title, the modes and Inspect share one row, and the modes scroll sideways if a brand ships many. There is no Compare and no narrow mode select (v6 had both). At 380 the header wraps.
- **The legacy contract table and token list sit pinned light inside Inspect,** in a page-colored container. In dark that is a light block (D2). v6 had its own per-role Pairs table and token view; the plan says to reuse the legacy ones.
- **Health is the verdict, the breadth and the per-mode lines only.** v6's Warnings, "Also checked" and Build identity blocks are left for a later slice. The card's subtitle is cut from v6's "What the verdict counts, and what else was checked" to "What the verdict counts", so it does not claim checks it does not show.
- **The Decisions log is one card in engine order.** v6 grouped notes by domain with a regex and linked each to a lever, which needs the levers panel (S2 and on). The card title "Decisions log" and its "N notes" count are new neutral wording.
- **The verdict takes `radius-lg`,** as a control under the 2026-10-01 split. v6 drew it as a pill.
- **The mode control keeps v6's per-mode status dots.** The legacy strip dropped them (#54), and v6 is the newer decision.
- **New neutral copy:** "Back to ‹view›", "Preview mode", ", derived", "all pass", "N below floor" (v6's menu note), and "Verdict: … Open Inspect, Contrast" (v6's screen-reader text).
- **Not built:** the Roles toggle and matrix (S4 and S5; the plan puts no S1.3 stub in it), and Q4 scroll-to-lever (deferred).
