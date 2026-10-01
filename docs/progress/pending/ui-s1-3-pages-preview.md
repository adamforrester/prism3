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
- **`test-verdict-count.ts`** (new, 24 assertions). The literals are 884, 221 per mode, prism3's four modes, and concept v6's copy. A below-floor override must be counted, a fixture failing one role in Light and one in Dark must read exactly "2 of 884 below floor, 2 modes" (derived by hand), and the derived set must match the owner's mode model.
- **`test:chrome`** grows to **4,359 assertions, in about 2 min 11 s** (S1.2's run was 46 s; the PR as first opened ran 4,309, which an earlier draft of this entry misstated as 3,893). New sections:
  - **Homes.** Every place lands on its literal home and title, visited in two orders, on both hosts. Scrolling (27 checks per host) and focusing (128 web, 110 plugin) never move the preview. Nothing offers "Keep this view".
  - **Inspect, over the legacy frame,** for both hosts and both themes at 1280, 640 and 380. The verdict's name and line, Contrast selected, Health first with its literal lines, the contract table listing the preview spec's contracts in order with the primary button's label-on-fill ratios equal to the emitted ones, Tokens opening on a literal primitive at its committed hex and redrawn in place by its own Semantics control to a literal semantic at its committed alias, and the Decisions log equal to the oracle: 18 notes from `$extensions.prism3.decisions` in the committed `out/prism3.tokens.json`. Back and Escape restore the page, its scroll and the opener's focus. The full chrome probe (contrast, edges, targets, fonts, shadows, inline values, overflow) runs on all three views. A tab change closes Inspect.
  - **The preview header, panes forced.** The modes are a radiogroup of the literal four, with the derived ones hatched. Choosing Dark makes the legacy page draw Dark, and the legacy strip's HC light checks HC light here. Arrow keys move along the radios. Inspect from the menu covers the preview beside the levers, and closes back to it with focus on Inspect. The chrome probe runs at every width on both hosts.
- **Suites:** smoke 3,380 pass, start all pass, verdict 191 of 191 after the bc7ccf8a merge, and the mode audit (`--check-badges`) 12 of 12.

**Cost of the verdict:** it adds one `resolveAllModes` per edit, 18.9 ms in Node for prism3, on top of a rebuild (`brandTheme` and `resolvePreview`) of 81.0 ms. `resolvePreview` runs its own `resolveAllModes` internally and does not expose the result; sharing it would be an engine change, so it is left as is.

**Edit-to-paint on the studio (plan §9.2, measured, no gate).** The built studio in headless Chromium at 1280 × 900, Color › Palettes, the neutral Hue slider: an `input` event, then the time to the first frame after the last DOM change it caused (a task posted from `requestAnimationFrame` after the final mutation). Each run drops 3 warm-up edits and takes the median of the next 10. **S1.3: 68.4 ms** (the median of 7 runs: 64.5 to 73.3 ms). **Before, the S1.2 tip `f87c173d` built the same way: 59.8 ms** (the median of 5 runs: 56.2 to 63.3 ms). So the verdict costs about 9 ms per edit in the browser, about half the 18.9 ms Node figure. The synchronous input handler is most of it: 53.8 against 44.0 ms.

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

- **The embedded Inter subset lacks U+2192 (→)**, and one engine note uses it (typography: "weights … → 300/400/…"). The Decisions log shows notes verbatim (D4), so a device face draws that one glyph. `test:chrome` allows a non-Inter face only for the characters in the literal `FACE_GAPS` list, one glyph each, and only in text inside the Decisions log (`[data-p3="decisions-log"]`), so any other fallback, and a `→` the chrome writes itself, still fails. The fix is a wider font subset, or the engine choosing another character, and either is outside this slice.
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

### Review round (orchestrator's independent review of #1923)

- **Inspect › Tokens was checked for a `<table>` only.** The check computed whether the list held an alias and never asserted it, so removing every row, a no-op repaint, and lending `(h) => renderPreviewTokens(h)` (which falls back to `paintVolatile`, so the list never redraws in Inspect) all passed. It now reads rows by name: Inspect › Tokens must open on Primitives with `palette.neutral.950` at its committed hex, must not list `text.primary` yet, and after its own Semantics control must list `text.primary` at its committed alias (`core.palette.neutral.950`), with Inspect still open and the primitive gone. The paths are literals; the hex and alias come from `out/prism3.tokens.json`, never from the renderer.
- **Inspect › Contrast was checked with `table >= 1`.** It now needs exactly one table, its rows equal to the contracts in the committed `schema/preview-spec.json`, in order, in the table's literal "component · variant — label" wording (34 rows), and the row "button · rest — label on fill" showing the emitted ratios of `color.interactive.primary.on-fill` (7.82, 4.58, 9.38, 8.88), each mode's `against` asserted to be `interactive.primary.fill.rest`.
- **`test-verdict-count.ts` did not pin the failure count.** A new fixture re-points `text.secondary` to `neutral.100` in Light and to `neutral.900` in Dark. Worked out by hand: one role fails in each of those two modes, nothing in the committed tree is measured against `text.secondary`, and the high-contrast modes carry no override. So the bar must read exactly "2 of 884 below floor, 2 modes", Health "2 of 884 pairs below floor in 2 modes.", and the mode lines "Light: 1 of 221 below", "Dark: 1 of 221 below", then all 221 in each high-contrast mode.
- **Repaint guard at S1.3's seams.** S1.2's hardening already catches `m['apply']()` and a re-export through `src/state/verdict.ts`; both were run as mutations, and the failures are in the table below. `renderWorkspace` joins `LEGACY_TIERS`, since it is the full legacy repaint that `applyFull` and the `mode` subscriber call. Nothing under `src/shell` names it. The header now says six names, and the fixture carries the sixth. **A stated limit, not a check:** a callback that `main.ts` lends (Inspect's `contrast` and `tokens` today) is defined outside the scanned folders and reaches the shell under a neutral name, so a lent body that calls `apply()` is invisible to a static scan of the shell. The guard's header says so, and the frame's header lists the lends.
- **`FACE_GAPS` was honored anywhere in the chrome.** A `→` in the Back label passed. The tolerance now applies only to text nodes inside `[data-p3="decisions-log"]` (`FACE_GAPS_SCOPE`), so the same `→` in the Back label fails.
- **Small items.** The assertion count above is corrected (it was 4,309 as reviewed, and is now 4,359). `.p3-legacy-card` takes `padding: var(--p3-space-300)`, the same as the chrome's own cards, so Inspect › Tokens' toolbar no longer sits on the container edge in dark at 1280 and 380. The edit-to-paint measurement is above.

**Mutations, each after a `wip:` commit, diff checked non-empty, restored with `git checkout -- <file>`:**

| Mutation | Fails with |
|---|---|
| R1 token rows removed (`tokenTableEl` appends none) | `web light 1280: Inspect › Tokens opens on Primitives, with palette.neutral.950 at #0d0d0e — row null` (24 failures, every host, theme and width) |
| R2 Inspect lends a no-op repaint | `web light 1280: a control inside Inspect › Tokens redraws the list inside Inspect (Semantics: text.primary → core.palette.neutral.950; row null, Inspect open)` (12) |
| R3 `tokens: (h) => renderPreviewTokens(h)`, the `paintVolatile` fallback | the same line as R2 (12) |
| R4 the contract table given no rows | `web light 1280: Inspect › Contrast lists the preview spec's 34 contracts, in order — listed 0` and `… shows "button · rest — label on fill" at the emitted ratios {…} — shows null` (24) |
| R5 the verdict's threshold tightened by 0.5 (or by 1; a loosened threshold is #1930's near-floor fixture) | `two-mode fixture: the bar reads "2 of 884 below floor, 2 modes" — read "174 of 884 below floor, 4 modes"` (by 1: `"271 of 884 …"`) |
| R6 `modesFailing` capped at 1 | `two-mode fixture: the bar reads "2 of 884 below floor, 2 modes" — read "2 of 884 below floor, 1 mode"` |
| R7 failures counted in Light only | `two-mode fixture: the bar reads "2 of 884 below floor, 2 modes" — read "1 of 884 below floor, 1 mode"` |
| R8 `(globalThis as any)['apply']()` in `preview.ts` | `src/shell/preview.ts:236: references the legacy repaint tier "apply"` |
| R9 `export { apply } from '../main';` in `src/state/verdict.ts` | `src/shell/preview.ts:22: imports "../state/verdict", which reaches src/main.ts` (and `src/shell/frame.ts:37: imports "./preview", …`) |
| R10 `renderWorkspace()` in `preview.ts` | `src/shell/preview.ts:237: references the legacy repaint tier "renderWorkspace"` |
| R11 `→` appended to the Back label | `web light 1280 / Inspect › Contrast: every chrome text element draws in the embedded Inter — <span class="p3-btn-label" data-cprobe="text">Back to Palett drew DejaVu Sans (device), Inter` (24, at 1280 and 640 on both hosts) |

Before R5 to R7, the old `>= 1` check passed each of them. The general "prism3 has no role below its floor" check also catches R5, but R6 and R7 fail only on the new fixture.

