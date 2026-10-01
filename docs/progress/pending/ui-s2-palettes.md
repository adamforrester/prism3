## (2026-10-01) — UI redesign S2: Color › Palettes in the two panes, the step picker, the specimen-ground check

**STATUS: branch `ui/s2-palettes`, stacked on `ui/s1-4-activity`; not pushed.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The spec is `docs/superpowers/ui-redesign/implementation-plan.md` (S2 under "Per slice", §4, §5, §6.1, §9.1), concept v6's Palettes page (V7, V8, V9), the v6 review (R2, R3), and the QA notes (Q1–Q4, `decisions-2026-10-01-qa.md`).

**What the user sees.** Color › Palettes, the opening page, is the first page in the new two-pane layout, with no legacy frame:
- **The levers panel** (neutral 025, white cards), in concept v6's order: the intro; **Primary** (the color picker, the hex, the OKLCH readout, "Pinned at step 600 of the primary ramp. The other 19 steps are derived."); **Brand colors** (a row per color: picker, name, hex, remove; then the dashed **Add brand color**); **Neutrals** (Follow primary · Custom tint, the hue slider or "Hue follows primary", then chroma); behind **Show 5 advanced**, the **Pinned neutral** switch and the four **Status colors** (Auto, Custom, or Use ‹palette›). Last, **Continue to Surfaces & fills**. Each lever has the manifest's label and an info toggletip with the manifest's description. An engine refusal rings the lever that caused it: "Refused. The preview keeps the last valid theme."
- **The preview** (white), per v6: **Brand palettes**, **Neutral**, **Status palettes**, **Alpha and opacity**, each a container. Each palette has the 56px hero swatch at its anchor, its hex, `palette.‹name›`, the roles it drives ("drives brand, action", or "decorative"), and, when the brand pins a color in it, the **Anchor** pill. Under that are two strips of ten large squares with a hairline, and the step and hex under each (five to a strip when the preview is narrow). Every strip sits on the brand's own `background.primary` for the mode the preview shows.
- **The mode control** in the preview header, which S1.3 built, is on screen for real now: it changes the page color under the specimens.
- **Search** (Q3) filters the levers panel in place, advanced levers included, and counts what it shows.
- The seven tabs now fit the levers column at 1280. The row's padding closes to 16px and the tab gap to 12px in the two-pane layout.

### Diagnosis and structure

- **A page moves by data.** `shell/pages.ts` gives every page a `status` (`legacy` | `new`). Palettes is `new`, and its `legacy` list is empty. `LegacyPageKey` comes from the legacy lists, as `PageKey` did, and `NAV` is checked against it both ways. `NewPageKey` comes from the `new` pages. The store's `page` holds either one, so `loadInput`'s `setPage('palettes')` and the boot page are unchanged. The frame's `NEW_PAGES` maps each moved page to its levers module and its preview module. They are mounted once per visit and released on leaving, subscriptions included; a page set to `new` with no row there fails `typecheck`.
- **New code, new files.** `domains/color-palettes.ts` (the levers), `preview/palettes.ts` (the preview), `ui/lever-kit.ts` (the lever block and its controls, shared from here on), `ui/step-picker.ts`, and `state/palette-input.ts`. The last is the DOM-free writes the legacy page's closures did: the rename and remove cascades (docs/24 #53), the anchor read from the last-good input (M-16), the add handler that materializes `brandColors` on the edit and never on a render (#1033), the rename collision guard, and the exclusive status sources.
- **Repaint by subscription only.** A control writes through `palette-input.ts` and calls `rebuild()`. The `brand` topic repaints the levers, the preview and the shell, and a new `main.ts` subscription repaints the legacy chrome around them (the engine-error bar, the bar's dirty state). It runs only while a moved page is in view, since on a legacy page the writer's `apply()` already does that. The levers redraw whole only when their shape changes; otherwise each control updates in place, and a focused field is left alone. The repaint guard now scans `src/ui/` too, and `renderWorkspace` joins its literal list of tiers.
- **Legacy, guarded.** `renderWorkspace` draws nothing for a moved page and empties the volatile painter. `applySearch` leaves a moved page to its own filter. The Palettes rail row, its renderer and its copy are gone.
- **`lint-ramp-steps` follows the alpha steps.** It read authored step arrays from `main.ts` only, and the alpha/opacity steps moved with the Palettes preview (`ALPHA_STEPS_UI` → `preview/palettes.ts`'s `ALPHA_STEPS`). The gate now reads both files by path, and its entry follows the new name. Mutation: renaming the constant `ALPHA_TIERS` fails `STALE CLASSIFICATION — RAMPS names \`ALPHA_STEPS\`, which … no longer declares`.
- **`resolveAllModes` once per edit.** `state/verdict.ts` exports the cached `resolvedModes(theme)`. The verdict and the preview's page color share it.

### Retired from `main.ts` (9,971 → 9,482 lines)

The legacy Palettes region: `anchorStepFor`, `rampBands`, `cascadeRename`, `cascadeRemove`, the "Palettes page (#59)" header, `anchorField`, `brandRow`, `neutralRow`, `renderPrimitives`, `statusSeedHex`, `setStatusHue`, `statusRow`, `renderAlphaAndOpacity` with `ALPHA_STEPS_UI` and `alphaHex`, the unused `chunk`, the `autoPlaceStep` import, the `palettes` rows in `NAV`, `PAGE_COPY` and `PAGE_RENDERERS`, and its `pageHasModeVaryingControl` case. Every behavior survived in the new modules, except the ones retired or changed on purpose (below).

**Behavior changed on purpose, each the option closest to v6:**
- The neutral's three-way Source select (Auto, Custom tint, Pinned color) is v6's two chips plus the advanced Pinned neutral switch. Pinning now keeps `neutral.auto` as it was (v6), so unpinning returns to the previous source. The legacy select deleted it.
- A status role that borrows or reuses another palette shows one line ("borrows primary", "reuses primary") instead of drawing that ramp a second time. The legacy page repeated the ramp, and v6 left the role out.
- The anchor pill shows only where the brand pins a color (the legacy page's rule: primary, brand colors, a pinned neutral, a custom status hue). v6 showed 500 on the derived neutral and the Auto status ramps, which claims an anchor nobody set.
- Removing a brand color is immediate, as it was on the legacy page. v6's confirm dialog, which lists what follows the removal, is not built.
- The opacity row draws `text.primary` for the previewed mode on the page color. The legacy page drew a fixed ink, and v6 drew a checkerboard.

### Tests

- **`test:chrome`: 6,908 assertions** (S1.4: 5,824), about 5 min 30 s. No state is forced any more. The Q2 check and the preview-header checks measure Color › Palettes as it renders. Q2's second case, a page without the sub-nav, waits for the first moved page outside Color (S3). New:
  - `NEW_PAGES` beside `LEGACY_PAGES` (each place in exactly one);
  - **specimen ground** on both hosts, both chrome themes and every mode. The oracle is the committed emission's `background.primary`, its alias chain resolved in Node;
  - **controls represented**: the literal `PALETTES_LEVERS`, each manifest key with its tier and hook, rendered exactly once, the advanced ones only behind Show advanced. A lever block outside the list fails as unclassified;
  - **edits**: one repaints the preview and keeps the field's focus and value, never moves the home (V1), and adds or removes a ramp; a rename onto "primary" is refused;
  - the **step picker** on a fixture (below);
  - search on Palettes;
  - V1 scroll and focus inside the panes;
  - Inspect over the preview, which restores the preview's scroll;
  - mono text must draw the embedded JetBrains Mono.
- **`test:smoke`: 3,276** (S1.4: 3,380). The Pages-menu sweep lost Palettes (180 assertions), and a new section, "Color › Palettes, the moved page", runs per corpus brand and per mode on the new hooks. It holds every ramp and every step's hex against the brand's committed emission, every strip's ground against the emission's `background.primary`, and checks 0 console errors, the error bar hidden and no overflow.
- **`test:verdict` 191/191, `test:start` all pass, `audit:modes --check-badges` 12/12.** Each boot wait moved from the legacy frame to the frame. The verdict's off-page build reaches Palettes by its tab. The mode audit checks that the Pages menu offers Surfaces & fills and no longer offers Palettes.
- **Studio `test`:** `test-shell-imports` 28 and `test-pages` 71 (it adds "moved pages": each page's status against a literal `MOVED` list, and a `new` page names no legacy page).

**Mutations, each after a `wip:` commit, diff checked non-empty, each failing by name:**

| | Mutation | Fails with |
|---|---|---|
| a | the first primary strip drawn on the chrome card | `specimen ground: palettes web light 1280, previewing dark: … — primary is the chrome card (#ffffff)` (7 failures) |
| b | the primary lever not rendered | `web: Palettes lever primary renders its hook lever-primary once — rendered 0` |
| c | the neutral chroma lever rendered twice | `web: Palettes lever neutral.chroma renders its hook lever-neutral-chroma once — rendered 2` |
| d | the preview following focus in the levers | `V1 focus: web color-palettes control 0 took focus and the preview stayed palettes (now surfaces)` |
| e | `import { build } from '../main'` in `domains/color-palettes.ts` | `src/domains/color-palettes.ts:27: references the legacy repaint tier "build"`, and `… imports "../main", which reaches src/main.ts` |
| f | the step picker writing the next step | `step picker: choosing primary 500, then 950 by Enter, writes those steps — wrote ["primary 550","primary 950"] (light)` |

**Edit to paint**, in the built studio at 1280: the median time from a primary color edit to the next frame, 35 edits after 5 warm-ups, five runs of each build, alternated. Before (S1.4's legacy page) the per-run medians were 58–67 ms (median 61 ms). After, they were 60–71 ms (median 68 ms). The JavaScript is the same (a median of 40–45 ms in both). The rest is the layout and paint of a page that now draws both panes. The first draft rebuilt the whole preview per edit and measured 160 ms. Keyed blocks (an unchanged ramp keeps its nodes, and a moved color or anchor is patched in place) and skipping same-value writes brought it back to this.

### The step picker ships unmounted

The plan lists the step picker (V9) under S2, but concept v6 gives Palettes no use for it. Its homes are the Surfaces & fills fill rows and the Roles matrix cells, which write role overrides, and Palettes has no step to pick (R3). The orchestrator decided it ships in S2 as the shared `ui/step-picker.ts`, with no product mount, and its first product use is S4's fill rows. `test:chrome` builds a fixture page from it (never a shipped route) and checks:
- the swatch grid;
- each ratio, against the engine's own `contrast` on the same hex values (`packages/engine/color.ts`, bundled for Node by the suite);
- the below-floor mark, in its glyph and its name;
- the current step;
- the arrow keys, Home, End, and Up and Down by a row;
- Enter, the palette select and Return to Auto;
- Escape and Close, each returning focus to the opener;
- the value it writes, through the callback the fixture records.

### Traps

- **A scrolling pane is a focus stop.** Chromium makes a scrollable region keyboard-focusable, so the levers pane and the preview body got a 2px inset ring. `test:chrome`'s ring check now reads an inset ring (negative offset) against the element's own ground. Against its parent's, the legacy body behind the dark chrome, it read 1.03:1.
- **◆ is in neither embedded face.** v6's anchor diamond is a CSS shape here.
- **A parameter named `build` trips the repaint guard**, as it should: the guard matches identifiers, not calls. The preview's keyed cache calls its builder `make`.
- **The emission's palette `against`** can be a palette step (`neutral.050`), not a role. The fixture resolves both.

### Held for the owner

Each is the option closest to v6, picked and flagged under the overnight rule. None is brand-facing.
- **The step picker is unmounted until S4** (above), the orchestrator's call.
- **Sliders are the native range** filled with `icon`. v6 drew its own track with a `--pct` variable, which the chrome build refuses (only `--p3-*` variables, and only mapped ones). The rail and thumb are not measured for 3:1, because the probe reads CSS edges.
- **The Pinned neutral switch is a button with `role="switch"`**, a dot and v6's words ("Pinned", "Off: the ramp is derived from hue and chroma"), the S1.4 Agent switch's form. v6 drew a track and thumb.
- **The neutral chips are a radiogroup of segment buttons**, as the mode control is, not v6's native radios inside labels. Their focus ring has to be measurable.
- **Tabs at 640:** the row still scrolls sideways (the levers column is 269px). v6 had a "Show more domains" cue, which is not built.
- **Opacity on the page color; alpha on a checkerboard.** The alpha ramps are the same constants for every brand, so they are not specimen roots (named in `preview/palettes.ts`).
- **No v6 "Compare"** in the preview header (S1.3's call stands).
- **New neutral copy:** "borrows ‹palette›", "reuses ‹palette›", "Add brand color" (v6's "+ Add brand color" without the plus sign, which is the glyph), "Show 5 advanced" / "Hide 5 advanced" (v6's pattern), "Continue to Surfaces & fills" (v6's pattern), "Brand color name", "Remove ‹name›", "Pick a step" and "Light (base)" (fixture only), "Refused. The preview keeps the last valid theme." (v6's). The status options are v6's: "Auto: reuses ‹p› (‹hue›, ‹h›°)", "Auto: synthesized ‹hue›, ‹h›°", "Custom color", "Custom: ‹hue›, ‹h›°" and "Use ‹p›".

### The Q4 trial (its own commit, for the owner's decision)

The owner's QA note Q4 invited a trial on one section: the preview follows the lever being edited. On Color › Palettes, **an edit** to a lever scrolls the preview so the palette it changes is in view: primary to the primary ramp, a brand color to its ramp, either neutral lever or the pinned neutral to the neutral ramp, and a status color to its ramp. A palette already in view is left where it is. **Nothing else moves it.** Focusing a lever, scrolling either pane and changing the mode leave the preview where it was, and the home view never changes (V1). It is one small module, `preview/follow-edit.ts`. The edit handler notes the palette before it rebuilds, and the preview reveals it after its repaint. It is one commit on top of S2, so dropping that commit removes it whole. `test:chrome` section 15 checks that an edit reveals the neutral and primary ramps from the bottom of the preview, and that focus, the levers' scroll and the mode do not move it (6,916 assertions with it).

| | Mutation | Fails with |
|---|---|---|
| g | the reveal triggered on focus instead of on an edit | `Q4: focusing a lever does not move the preview (scrollTop 120, was 3024)` |

**For the owner: keep it, apply it everywhere, or drop it.** Adding a brand color and renaming one do not scroll in the trial (the edit has no palette to reveal until the repaint names it).
