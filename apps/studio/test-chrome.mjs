/**
 * `test:chrome` — the new shell's chrome, measured as rendered (UI redesign S1.2,
 * `docs/superpowers/ui-redesign/implementation-plan.md` §6.1 and §6.2).
 *
 *   npm run -w @prism3/studio build && npm run -w @prism3/plugin build
 *   npm run -w @prism3/studio test:chrome [screenshot-dir]
 *
 * It drives BOTH built bundles: the studio's `dist/main.js` and the plugin's `dist/ui.html` (loaded
 * top-level, with Figma's theme stubbed the way `apps/plugin/test-start-screen.mjs` stubs it). So it runs
 * after both builds. A separate suite from `test:smoke` because the axes differ: smoke sweeps page × mode ×
 * brand over the legacy pages; this sweeps host × theme × width over the chrome around them.
 *
 * ── what it holds, each as a literal floor ─────────────────────────────────────────────────────
 *
 *   · TEXT at 4.5:1 (3:1 at a large size), every chrome text node, composited over the ground it is drawn on.
 *   · EDGES AND INDICATORS at 3:1: each control's drawn edge against what is outside it (B1), a selected
 *     tab's underline, and every glyph against its ground.
 *   · FOCUS RINGS: every chrome control reached by Tab draws a ring at least 2px wide, at 3:1 against what
 *     is outside the control.
 *   · TARGETS: every chrome control is at least 24 × 24.
 *   · FONTS DRAWN: CDP `CSS.getPlatformFontsForNode` on every chrome text element — the embedded Inter
 *     (`isCustomFont`), never a device face. Not `document.fonts.check()`, which answers true for a face
 *     that is absent (the v5 finding).
 *   · NO SHADOWS (T5): every chrome element and its `::before` / `::after`.
 *   · NO RUNTIME INLINE VALUES in the chrome: an element outside `[data-content]` with a `style` attribute
 *     fails unless it sets only custom properties (§9.1: the build's raw-value scan reads source text, and
 *     a `${…}` value escapes it).
 *   · NO HORIZONTAL SCROLL at 640 (1280 at 200% zoom, §9.1), at 380 and at 1280.
 *   · CONTROLS REPRESENTED, NOT COUNTED: each column (host × width) names the controls it must render, by
 *     hook, literally; every chrome control must be classified (an unknown one fails); and each column
 *     has literal floors for what was measured.
 *   · THE LAYER ORDER (IA-2): the preview, the levers ground and the top bar are three distinct steps, in
 *     one direction, in both themes.
 *   · ONE HEADER LINE (the owner's QA note Q2): the tab row's divider and the preview title row's divider
 *     at one y, within 0.5px, at 1280, light and dark, with the Color sub-nav and without.
 *   · THE LEGACY FRAME: every place in `LEGACY_PAGES` renders the legacy frame, showing the legacy page
 *     plan §4 maps it to; and a legacy field in a dark theme keeps light UA ink (#1031's mechanism).
 *   · BEHAVIOR: the tab row navigates by click and by arrow key; the theme toggle applies and persists;
 *     the plugin follows Figma's theme live; search (Q3) types in order, keeps its caret, filters, and
 *     closes back to its icon.
 *
 * ── independence (docs/34) ─────────────────────────────────────────────────────────────────────
 *
 * Every color here is read from the RENDER (computed, composited styles), never from `chrome/spec.mjs`'s
 * declared PAIRS, which `lint:contrast` reads; the two are partners, neither derived from the other. The
 * floors, the expected controls, the legacy map, the font name and the layer step are literals written in
 * this file. The legacy map is plan §4's table, typed here, not imported from `src/shell/pages.ts`. The
 * radius lever the search test looks for is read from the committed `schema/lever-manifest.json`, not from
 * the page.
 *
 * WHAT IS SKIPPED, BY A LITERAL LIST AND NEVER BY A MARKER THE PAGE SETS (§4). `LEGACY_PAGES` names the
 * places not moved yet; for those, the legacy page inside the legacy frame is outside the chrome (smoke
 * measures it). The list can only shrink: a listed place that renders the new layout fails by name. Brand
 * content (`[data-content]`) is skipped for color and inline values. No chrome node is exempt from the
 * inline-value check: the one S1.2 named (the plugin's bottom-left agent chip) went in S1.4 (D6), and its
 * exemption went with it, as it said it would.
 *
 * NOTHING FORCED (S2). S1.2 and S1.3 set the frame's `data-layout="panes"` themselves for the Q2 check and
 * the preview-header checks, because no page rendered the two panes. S2 moved Color › Palettes, the opening
 * page, into them, so every one of those checks now measures Color › Palettes as it renders. Q2's "a page
 * without the sub-nav" waits for the first moved page outside Color (S3).
 *
 * S1.3 ADDS (sections 7–9), each against a literal oracle typed here or an engine artifact:
 *   · ONE HOME PER PAGE (V1): every place names its literal home view and title (`EXPECT_HOME`), visited in
 *     two orders; scrolling the page and focusing its controls never changes it; nothing offers "Keep this
 *     view" (V12).
 *   · INSPECT (F1): the verdict reads the decided count (884) and opens Inspect › Contrast over the legacy
 *     frame, with Health first and its literal lines; Tokens redraws in place from its own controls; the
 *     Decisions log shows the engine's decisions verbatim (oracle: `$extensions.prism3.decisions` in the
 *     committed `packages/engine/out/prism3.tokens.json`); Back and Escape close it to the page, its scroll
 *     and the opener's focus; a tab change closes it. Measured at every width, both themes, both hosts.
 *   · THE MODE CONTROL (Q1, model B): a radiogroup of the literal modes, derived ones hatched; choosing a
 *     mode makes the legacy page draw it, and the legacy strip's choice checks it here; arrow keys move.
 *   · NO DEVICE FACE: every chrome text element draws in the embedded faces, every glyph. S1.3 tolerated
 *     U+2192 (→) in the Decisions log and S1.4 the four verdict glyphs, in a scoped `FACE_GAPS` list; #1924
 *     re-subset the face to carry them, and the owner's 2026-10-01 copy decision replaced the last one,
 *     U+22EF (⋯), with "…" (U+2026). The list was empty, so it is gone, scope map and all: a device face
 *     drawing any glyph anywhere in the chrome fails.
 *
 * S1.4 ADDS (section 10), on both hosts, both themes, at 1280, 640 and 380:
 *   · THE ACTIVITY DRAWER (F2): nothing drawn before anything runs; a write started from the Figma menu opens
 *     it by itself (at 380: the strip, pinned to the bottom edge), with its pill in the drawer's bar row
 *     and none left in the top bar; a success keeps it open at 3 s and collapses it by 5 s (the literal
 *     `COLLAPSE_MS`, 4 s, v5 Q9; timed at 1280); a failure (light) or a warning (dark) keeps it open past
 *     5 s, its detail showing (at 380: the full-pane sheet); the Activity button's dot and name say
 *     running, needs attention or new result, in concept v6's words. The studio's drawer opens on its note.
 *   · THE FIGMA MENU (plugin): its five items by literal label; Arrow Down, Home, End, Arrow Up (wrapping),
 *     Escape and Tab; each item's effect observed on the wire (the write message the old control posted,
 *     captured off the bus, payload and all: Apply and Prune must carry the brand the page loaded, read
 *     from the committed `schema/example-brands.json`, never from the UI) or as the legacy page it opens;
 *     Apply and Prune stale unavailable while Apply runs. The studio has none.
 *   · THE AGENT CHIP (IA-3, D6): in the top bar's Agent slot, the same slot node after the bar re-renders,
 *     "Agent: Off"; its popover's switch posts `agent-link`, and the main thread's state turns it on with
 *     today's status line; Escape closes it to the chip; Tab past the switch closes it; Shift+Tab back to the
 *     chip keeps it, and Escape on the chip closes it. The bottom-left chip is gone, checked through
 *     `hooks.absent` with the new chip as proof. The studio renders neither the slot nor the chip.
 *   · A RESULT'S PILL (plugin): closing the drawer closes the detail it showed (the pill reads collapsed, its
 *     chevron unturned); clicking the pill on a closed drawer opens the drawer on its detail, through the
 *     store; clicking it again closes the detail and leaves the drawer open on its note.
 *   · A wait that never resolves in this section fails its case by name ("the case stopped at …") and the
 *     run goes on to the next case.
 *   · The full chrome probe runs in each of those states: the drawer open, a write running, a failure open,
 *     the Figma menu open, the Agent popover open.
 *
 * S2 ADDS (sections 11–14, and Palettes in every earlier section, since it is the opening page):
 *   · MOVED PAGES: `NEW_PAGES` (literal) beside `LEGACY_PAGES`; every place is in exactly one, and a moved place
 *     renders the two panes (one at 380), never the legacy frame.
 *   · SPECIMEN GROUND (plan §6.1, §9.1): every specimen root in the Palettes preview sits on the brand's
 *     `background.primary` for the previewed mode, both hosts, both chrome themes, every mode. Oracle: the
 *     committed emission, its alias chain resolved here in Node; the rendered ground is composited.
 *   · CONTROLS REPRESENTED: each manifest key v6 homes on Palettes (`PALETTES_LEVERS`, literal, with its tier
 *     and hook) renders its `lever-*` hook exactly once, the advanced ones only behind Show advanced; a lever
 *     block that is none of them fails as unclassified. The new controls are classified (`CONTROL_KINDS`).
 *   · EDITS: a lever edit repaints the preview by subscription, keeps the field's focus and value, and never
 *     moves the preview's home (V1); a brand color added or removed adds or removes its ramp; a rename onto
 *     another palette's name is refused.
 *   · THE STEP PICKER (V9) on a fixture page this suite builds from `src/ui/step-picker.ts` (it ships
 *     unmounted until S4): the grid, each ratio against the engine's own contrast function (bundled here
 *     from `packages/engine/color.ts`), the below-floor mark, the current step, arrow keys, Home, End, Up and
 *     Down by a row, Enter, the palette select, Return to Auto, Escape and Close returning focus, and the
 *     step it writes.
 *   · Mono text: an element set in the chrome's mono alias must draw the embedded JetBrains Mono.
 *
 *   S2 mutations, each failing by name:
 *   · a palette strip drawn on the chrome card → `specimen ground: palettes … is the chrome card (…)`.
 *   · a Palettes lever not rendered → `Palettes lever primary renders its hook lever-primary once — rendered 0`.
 *   · a Palettes lever rendered twice → `… renders its hook lever-neutral-chroma once — rendered 2`.
 *   · the preview following focus → `V1 focus: … color-palettes control … the preview stayed palettes (now …)`.
 *   · the step picker writing the next step → `step picker: choosing … writes those steps — wrote …`.
 *
 * S4a ADDS (section 16; Color › Surfaces & fills moved to the two panes, so it left LEGACY_PAGES):
 *   · SPECIMEN GROUND: each section of its preview (the Style guide's Background, Foreground, Text color, Border
 *     and Icon, owner decision Q5, and Gradients) is a specimen root on the emission's `background.primary`,
 *     named literally in `EXPECT_FILLS_SPECIMENS`, both hosts, both chrome themes, every mode.
 *   · CONTROLS REPRESENTED: `surfaces` and `gradients` once each, and every fill and text row by its literal
 *     role; a stray lever or row fails. The preview's light-pinned legacy host joins `INSPECT_LEGACY`.
 *   · THE STEP PICKER, MOUNTED (V9): under its row, on the current step, a pick writes and keeps focus, the
 *     preview repaints to the emission's step, Return to Auto, Escape to the button, V1.
 *   · A GRADIENT STOP edit writes that stop and no other, and the preview draws both stops from the emission.
 *   · The chrome probe on Surfaces & fills: both hosts, both themes, 1280, 640 and 380.
 *
 * S4c ADDS (the owner's decisions of 2026-10-02):
 *   · The Focus ring section is a listed specimen root after Border (Q30).
 *   · Q24: every section container in the preview is the levers panel's gray, EXPECTED from the emission's
 *     `core.palette.neutral.025` (IA-2's light levers ground; the preview's host is pinned light), in both
 *     chrome themes and every mode, and the light levers panel itself renders that value.
 *   · One set of surface controls (Q22); no link row (Q28: a `text.link.default` row is an unlisted row);
 *     the Fields rows, one per field role the EMISSION names, page and inverse (Q29).
 *   S4a mutations: a fill row not rendered or rendered twice (`… renders the foreground.info row once — rendered
 *   0 / 2`); the preview following focus (`V1 focus: … color-fills control …`); a section's ground on the
 *   chrome card (`specimen ground: surfaces & fills … is the chrome card`); a stop edit writing the first stop
 *   (`gradient: setting the second stop of "brand" to step 300 writes that stop and no other …`).
 *
 * THE Q4 TRIAL (section 15, its own commit, for the owner's decision): an edit to a Palettes lever scrolls the
 * preview to the palette it changes; focusing a lever, scrolling the levers and changing the mode do not.
 * Mutation: the trigger moved from the edit to focus → `Q4: focusing a lever does not move the preview (…)`.
 *
 * S3 ADDS (section 16, and Brand in sections 1, 2, 3, 7 and 11):
 *   · MOVED: Brand leaves `LEGACY_PAGES` for `NEW_PAGES`; it renders the two panes on both hosts, both themes, at
 *     1280, 640 and 380 (section 1), its Preview pane at 380, and the rings Tab draws through its levers.
 *   · Q2's SECOND CASE, for real: a page without the sub-nav (Brand), the two dividers at one y (section 3).
 *   · SPECIMEN GROUND: the Style guide's grounds, lent into Brand's preview, sit on the brand's background.primary
 *     for the previewed mode (section 11).
 *   · CONTROLS REPRESENTED: the five schema inputs v6 homes on Brand (`BRAND_LEVERS`, literal) each render once,
 *     and no other lever block does; Personality offers the engine's nine words (literal) in its order.
 *   · v5 answer 4: Brand name and Token namespace side by side at 1280, 640 and 380, both hosts.
 *   · T2: the placeholder (`pds3`) and the reserved (`prism`) namespaces warn in v6's words; a draft reaches
 *     nothing until Rename namespace and its confirm; Escape closes the confirm back to the field.
 *   · Q3: dark off asks first, naming high contrast dark and the verdict's new count (442 of 884, from Health's
 *     literal 221 per mode); Cancel keeps it; confirming drops both; high contrast dark stays locked off with
 *     its reason until dark is back, and dark back does not bring it back.
 *   · The name reaches the bar per keystroke (the `identity` topic) and the persisted brand; personality and the
 *     custom modes reach the brand; the Style guide's own select redraws it inside the preview (the lent repaint).
 *
 *   S3 mutations, each after a `wip:` commit, each failing by name (the studio rebuilt; the plugin bundle not):
 *   · the namespace lever not rendered → `web 1280: Brand lever root renders its hook lever-root once — rendered 0`.
 *   · the personality lever rendered twice → `web 1280: Brand lever personality renders its hook lever-personality once — rendered 2`.
 *   · the preview following focus in Brand's levers → `V1 focus: web brand control 0 took focus and the preview stayed guide (now palettes)`.
 *   · a Style guide ground drawn on the card → `specimen ground: brand web light 1280, previewing dark: every specimen root sits
 *     on background.primary #0d0d0e — Background is the chrome card (#ffffff) | …`.
 *   · Brand's preview title row moved 4px → `Q2 light 1280 / brand: the tab row's divider and the preview title row's divider
 *     are 4.00px apart (tolerance 0.5px)`.
 *
 * S3 REVIEW ROUND (orchestrator's review of #1939): the Style guide's roots by name (`STYLE_GUIDE_ROOTS`); each
 * personality chip's word against the engine's vocabulary; a refused Dark off (a custom mode based on Dark)
 * named in the confirm, marked refused, the saved brand unchanged; and section 17, the mode control at 4, 5 and
 * 6 modes at every width, no option clipped. Mutations: Border drawn off its ground → `specimen ground: brand …
 * Border is a specimen root on background.primary … — not a specimen root, on the chrome card (#ffffff)`; the
 * soft chip labeled "gentle" → `web 1280: personality chip 7 reads "gentle" and writes "soft"; the engine's word
 * is "soft"`; no fallback to the select → `web light 1280 / brand, 5 modes: every mode is choosable in the
 * preview header, none clipped — {…"clipped":["custom-1"]…}`.
 *
 * NOT COVERED: right-to-left layout (the product ships no RTL locale; new CSS uses logical-friendly
 * flex and grid, §9.1), and text-only zoom.
 *
 * MUTATIONS THIS FAILS BY NAME (each run after a commit, with the diff checked non-empty):
 *   · `.p3-btn` given the page edge (`var(--p3-edge)`) → `edge button "Export" 2.70:1 < 3` (light).
 *   · the tab row painted `bg-page` → `IA-2 layers (light): levers-bg on bg-page 1.00:1 < 1.04`.
 *   · a `box-shadow` set from script on the top bar → `shadow: div.p3-bar …`.
 *   · `style.color` set on the brand switcher's name → `runtime inline value outside [data-content]`.
 *   · the preview header row given its own height → `Q2: … the two dividers are … apart`.
 *   · the search field rebuilt per keystroke → `search: the field reads "radius" after typing it`.
 *   S1.3:
 *   · Brand's and Components' homes swapped in `pages.ts` → `V1 home: web brand shows comps ("Components"), want guide`.
 *   · scroll-following added to the frame → `V1 scroll: web color-palettes scrolled to 50% and the preview stayed …`.
 *   · the verdict opening Tokens → `the verdict opens Inspect › Contrast (… selected "Tokens")`.
 *   · Inspect's Back not restoring the legacy page → `Inspect closes back to the legacy page (…)`.
 *   · the mode control writing a local value instead of `setCurrentMode` →
 *     `mode control: choosing Dark makes the legacy page draw Dark (… shows "Light")`.
 *   · the Decisions log dropping its first note → `… the Decisions log shows the engine's 18 decisions, verbatim and in order`.
 *   S1.4:
 *   · `COLLAPSE_MS` set to 2 s → `F2 … a success keeps the drawer open at 3 s (COLLAPSE_MS is 4 s)`.
 *   · a failure scheduling the collapse → `F2 … a failure keeps the drawer open past 5 s, its detail showing`.
 *   · the Prune stale item running the Apply write → `Figma menu … Prune stale posts a dry-run prune (prune:false) — posted ["apply-theme"]`.
 *   · the bottom-left chip mounted again → `D6 … the bottom-left agent chip is gone …` and the inline-value check.
 *   · the apply pill painted into the top bar → `F2 … the running write's pill sits in the drawer's bar row`.
 *   S1.4 review (orchestrator's review of #1929):
 *   · the pill's click without `hostChanged()`, or the drawer's `detailOpened` branch removed →
 *     `F2 … clicking the failure's pill on a closed drawer opens the drawer on its detail, the pill expanded — open false, …`.
 *   · `runApply` posting `{}` → `Figma menu … Apply Theme posts the brand the page loaded (…), whole — input differs at id, root, …`.
 *   · `runPrune` posting a stale input → `Figma menu … Prune stale posts the brand the page loaded with confirm false, whole — input differs at id`.
 *   · the popover's focusout handler removed → `IA-3 … Tab past the switch closes the popover`.
 *   · Escape handled on the popover only → `IA-3 … Escape on the chip closes its open popover`.
 *   · a collapse leaving the detail open → `F2 … closing the drawer closes the warning's detail with it — its pill reads collapsed, chevron down`.
 *   · the Figma menu's Apply stuck disabled → `S1.4 … the case stopped at a wait that never resolved, … waiting for locator('[data-p3="figma-option-apply"]')`, and the run goes on.
 *   S1.3 review (orchestrator's review of #1923):
 *   · the token list's rows removed → `… Inspect › Tokens opens on Primitives, with palette.neutral.950 at #0d0d0e — row null`.
 *   · Inspect lending a no-op repaint, or `(h) => renderPreviewTokens(h)` (the `paintVolatile` fallback) →
 *     `… a control inside Inspect › Tokens redraws the list inside Inspect (Semantics: text.primary → …; row null, …)`.
 *   · the contract table given no rows → `… Inspect › Contrast lists the preview spec's 34 contracts, in order — listed 0`.
 *   · `→` appended to the Back label → `… every chrome text element draws in the embedded Inter — … Back to Palett drew DejaVu Sans (device), Inter`.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from './test-hooks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const SHOTS = process.argv[2] ? resolve(process.argv[2]) : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const hooks = hookGuard(import.meta.url);

let failed = 0;
let executed = 0;
const ok = (cond, label) => {
  executed++;
  if (cond) return;
  failed++;
  console.error(`  ✗ ${label}`);
};

// ── the literal floors ───────────────────────────────────────────────────────────────────────────
const TEXT_MIN = 4.5;
const LARGE_TEXT_MIN = 3;
const NONTEXT_MIN = 3;        // edges, indicators, glyphs, focus rings (WCAG 1.4.11)
const FOCUS_WIDTH_MIN = 2;
const TARGET_MIN = 24;
const UI_FONT = 'Inter';      // the embedded face's own family name, as the platform reports it
/** The embedded monospace face (S2 is the first page to set values in it: hex codes, tokens, step keys). An
 *  element whose computed family asks for the chrome's mono alias must draw this one, and nothing else. */
const MONO_FONT = 'JetBrains Mono';
const MONO_ALIAS = 'P3 Chrome Mono';
/* No device face may draw anything in the chrome. There used to be a `FACE_GAPS` list here: characters the
 *  embedded Inter did not carry, each tolerated in one scope. #1924 re-subset the face for → ✓ ✗ ⚠, and the
 *  owner's 2026-10-01 decision replaced U+22EF (⋯), which Inter lacks, with "…" (U+2026), which it carries.
 *  The `[glyphs]` build check (`chrome/glyphs.mjs`) fails the build on a gap in the notes, the verdicts or
 *  the shell's own copy before this test runs, and its `NEVER_DRAWN` keeps ⋯ and VS16 out of every source
 *  literal; this is the as-drawn half. */
/** The plugin's Apply control, by its literal label (owner, 2026-10-01: concept v6's "Apply Theme" replaces
 *  "Apply to Figma"), idle and while a write runs. Typed here, never read from the source. */
const APPLY_LABEL = 'Apply Theme';
const APPLY_RUNNING = '\u2026 Applying\u2026';
const LAYER_STEP = 1.04;
const ALIGN_TOLERANCE = 0.5;
const WIDTHS = [{ w: 1280, h: 900 }, { w: 640, h: 900 }, { w: 380, h: 420 }];

/** The places not moved yet. A domain slice that moves a place removes it here, in the same change. */
const LEGACY_PAGES = ['color-interactive', 'type', 'shape', 'depth', 'layout', 'components'];
/** The places a slice has moved into the two panes (S2: Color › Palettes; S3: Brand; S4a: Color › Surfaces & fills).
 *  A slice that moves a place adds it here in the same change; a place in both lists, or in neither, fails by name. */
const NEW_PAGES = ['brand', 'color-palettes', 'color-fills'];

/** Plan §4's table: the legacy page(s) each place shows, by the Pages menu hook's suffix, per host. */
const EXPECT_LEGACY = {
  web: { 'color-interactive': ['interactive'],
    type: ['typography'], shape: ['size-radius'], depth: ['elevation', 'motion'], layout: ['layout'], components: ['size-radius'] },
  figma: { 'color-interactive': ['interactive'],
    type: ['typography'], shape: ['size-radius'], depth: ['elevation', 'motion'], layout: ['layout'], components: ['components'] },
};
/** How each place is reached in the tab row: its tab's hook, then its sub-page's when it has one. */
const PLACE_CLICKS = {
  brand: ['[data-p3="tab-brand"]'],
  'color-palettes': ['[data-p3="tab-color"]', '[data-p3="color-sub-palettes"]'],
  'color-fills': ['[data-p3="tab-color"]', '[data-p3="color-sub-fills"]'],
  'color-interactive': ['[data-p3="tab-color"]', '[data-p3="color-sub-interactive"]'],
  type: ['[data-p3="tab-type"]'],
  shape: ['[data-p3="tab-shape"]'],
  depth: ['[data-p3="tab-depth"]'],
  layout: ['[data-p3="tab-layout"]'],
  components: ['[data-p3="tab-components"]'],
};
/** D8: the Depth & motion switch is labeled with the two legacy page names. */
const DEPTH_SWITCH_LABELS = ['Elevation', 'Motion'];

/** Each column's controls, by hook, on the opening page (Color › Palettes). Wide is 1280 and 640; narrow is
 *  380. Away from Color the sub-pages are not drawn; on Depth & motion the local switch is (`expectFor`). */
const TABS = ['[data-p3="tab-brand"]', '[data-p3="tab-color"]', '[data-p3="tab-type"]', '[data-p3="tab-shape"]', '[data-p3="tab-depth"]', '[data-p3="tab-layout"]', '[data-p3="tab-components"]'];
const COLOR_SUBS = ['[data-p3="color-sub-palettes"]', '[data-p3="color-sub-fills"]', '[data-p3="color-sub-interactive"]'];
const BAR = ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="search-open"]'];
/** The plugin's own top-bar controls (S1.4): the Agent chip (IA-3), the Figma menu, and Apply Theme. */
const FIGMA_BAR = ['[data-p3="agent-chip"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]'];
const EXPECT_CONTROLS = {
  'web wide': [...BAR, '[data-p3="theme-toggle"]', ...TABS, ...COLOR_SUBS],
  'web narrow': [...BAR, '[data-p3="theme-toggle"]', '[data-p3="tab-select"]', ...COLOR_SUBS],
  'figma wide': [...BAR, ...FIGMA_BAR, ...TABS, ...COLOR_SUBS],
  'figma narrow': [...BAR, ...FIGMA_BAR, '[data-p3="tab-select"]', ...COLOR_SUBS],
};
const DEPTH_SWITCH = ['[data-p3="legacy-switch-elevation"]', '[data-p3="legacy-switch-motion"]'];
/** Color › Palettes in the two panes (S2): the levers it must render on the Settings side, by hook, and the
 *  preview header's controls. Narrow shows one pane (the Settings one at boot) and the pane toggle. */
const PALETTES_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="primary-hex"]', '[data-p3="brand-color-name"]', '[data-p3="brand-color-remove"]',
  '[data-p3="brand-color-add"]', '[data-p3="neutral-source-follow"]', '[data-p3="neutral-source-custom"]', '[data-p3="neutral-chroma-slider"]',
  '[data-p3="palettes-advanced"]', '[data-p3="palettes-continue"]'];
/** Color › Surfaces & fills in the two panes (S4a): the controls its levers must render, by hook. The page draws
 *  the default theme's two gradients, so their editors' controls are here too. Since S4c one set of surface
 *  controls, for the previewed mode (owner decision Q22). */
const FILLS_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="surface-base-pick"]', '[data-p3="surface-floor"]',
  '[data-p3="surface-band-palette"]', '[data-p3="surface-band-step-pick"]', '[data-p3="fill-pick"]', '[data-p3="fills-jump-link"]', '[data-p3="icons-unpair"]',
  '[data-p3="gradients-switch"]', '[data-p3="gradient-name"]', '[data-p3="gradient-remove"]', '[data-p3="gradient-kind"]', '[data-p3="gradient-angle"]',
  '[data-p3="gradient-interpolation"]', '[data-p3="gradient-stop-palette"]', '[data-p3="gradient-stop-step"]', '[data-p3="gradient-stop-position"]',
  '[data-p3="gradient-stop-add"]', '[data-p3="gradient-add"]', '[data-p3="fills-continue"]'];
/** Brand in the two panes (S3): the levers it must render, by hook (v6's Identity, Personality and Modes, and
 *  the way on to Color). */
const BRAND_LEVERS_CONTROLS = ['[data-p3="brand-name"]', '[data-p3="brand-namespace"]', '[data-p3="lever-info"]', '[data-p3="personality-word"]',
  '[data-p3="mode-on-dark"]', '[data-p3="mode-on-hc-light"]', '[data-p3="mode-on-hc-dark"]', '[data-p3="mode-on-wireframe"]',
  '[data-p3="custom-mode-add"]', '[data-p3="brand-continue"]'];
/** Each moved place's levers, by place. */
const LEVERS_CONTROLS = { 'color-palettes': PALETTES_LEVERS_CONTROLS, brand: BRAND_LEVERS_CONTROLS, 'color-fills': FILLS_LEVERS_CONTROLS };
/** The preview header: the mode choice and Inspect. The mode choice is the radios, or, where they do not all fit
 *  (640, or a brand with more modes, S3 review), the select of the same modes: either one represents it (an
 *  inner list is any-of). Section 17 holds which one shows and that no option is ever clipped. */
const PREVIEW_HEAD = [['[data-p3="mode-option"]', '[data-p3="mode-select"]'], '[data-p3="inspect-open"]'];
const PANE_TOGGLE = ['[data-p3="pane-toggle-settings"]', '[data-p3="pane-toggle-preview"]'];
const expectFor = (column, place, state = 'page') => {
  const narrow = column.endsWith('narrow');
  const base = EXPECT_CONTROLS[column].filter((h) => place.startsWith('color-') || !COLOR_SUBS.includes(h));
  const levers = LEVERS_CONTROLS[place];
  if (!levers) return [...base, ...(place === 'depth' ? DEPTH_SWITCH : [])];
  // A moved place. Narrow, on the Preview pane (Inspect opens there), the tab row and the levers are hidden.
  if (narrow && state !== 'page') return [...base.filter((x) => !['[data-p3="tab-select"]', '[data-p3="search-open"]', ...COLOR_SUBS].includes(x)), ...PANE_TOGGLE, ...(state === 'preview' ? PREVIEW_HEAD : [])];
  if (narrow) return [...base, ...levers, ...PANE_TOGGLE];
  return [...base, ...levers, ...(state === 'inspect' ? [] : PREVIEW_HEAD)];
};
/** Per column, the least each measurement must have seen on the opening page, so an empty read fails
 *  naming itself. Set below the measured values (printed per state), above what a chrome that rendered
 *  nothing would give. `PLACE_FLOOR` is the same for every other place, where the sub-pages are gone. */
const FLOORS = {
  'web wide': { text: 12, edges: 15, glyphs: 4, controls: 15, fonts: 12, focus: 7 },
  'web narrow': { text: 4, edges: 18, glyphs: 6, controls: 9, fonts: 4, focus: 7 },
  'figma wide': { text: 14, edges: 22, glyphs: 3, controls: 16, fonts: 14, focus: 8 },
  'figma narrow': { text: 6, edges: 25, glyphs: 5, controls: 10, fonts: 6, focus: 8 },
};
/** The controls Tab must reach on the opening page, by hook: each tablist is one stop (a roving tabindex). */
const FOCUS_STOPS = {
  'web wide': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="theme-toggle"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'web narrow': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="theme-toggle"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'figma wide': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="agent-chip"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'figma narrow': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="agent-chip"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
};
const PLACE_FLOOR = { text: 9, edges: 10, glyphs: 3, controls: 12, fonts: 9 };
/** Inspect at 380: the tab row is a select and the bar is glyphs, so fewer chrome words are drawn. */
const INSPECT_NARROW_FLOOR = { text: 5, edges: 10, glyphs: 3, controls: 8, fonts: 5 };
/** Every chrome control is one of these, by class. A control that is none fails as unclassified. */
const CONTROL_KINDS = [['p3-brand', 'brand switcher'], ['p3-verdict', 'verdict'], ['p3-pill-btn', 'status pill'], ['p3-btn', 'button'], ['p3-tab', 'tab'], ['p3-jump-link', 'jump link'],
  ['p3-seg-tab', 'segment'], ['p3-select', 'select'], ['p3-menu-item', 'menu item'], ['p3-search-input', 'search field'],
  // S2: the levers panel's text fields and sliders, and the step picker's steps.
  ['p3-hex-input', 'text field'], ['p3-range', 'slider'], ['p3-step', 'picker step'],
  // S3: Brand's name, namespace and custom-mode name fields.
  ['p3-text-input', 'text field']];
/** Legacy views Inspect lends a host to until their slices replace them (S1.3): pinned light and drawn in
 *  `styles.css`, so outside the chrome, like the legacy page. Named literally, by hook. */
const INSPECT_LEGACY = ['[data-p3="inspect-contrast-table"]', '[data-p3="inspect-token-list"]',
  // S3: the Style guide, lent to Brand's preview the same way (pinned light, `styles.css`). Its specimens are
  // section 11's; its legibility is `test:smoke`'s Brand section.
  '[data-p3="brand-style-guide"]',
  // S4a: Color › Surfaces & fills' preview draws the Style guide's legacy sections (owner decision Q5), in a host
  // pinned light the same way. Its specimens are held to the brand's page color in section 16.
  '[data-p3="surfaces-style-guide"]'];

// ── servers: the studio, and the plugin with Figma's theme stubbed ──────────────────────────────────
const STUDIO = HERE;
let pluginHtml;
try { pluginHtml = readFileSync(join(REPO, 'apps/plugin/dist/ui.html'), 'utf8'); } catch {
  console.error('✗ apps/plugin/dist/ui.html is missing: run `npm run -w @prism3/plugin build` first.');
  process.exit(1);
}
const FIGMA = {
  light: { cls: 'figma-light', vars: { '--figma-color-bg': '#ffffff', '--figma-color-text': '#000000e5' } },
  dark: { cls: 'figma-dark', vars: { '--figma-color-bg': '#2c2c2c', '--figma-color-text': '#ffffff' } },
};
const themedPlugin = (t) => {
  const f = FIGMA[t];
  const style = `<style>:root{${Object.entries(f.vars).map(([k, v]) => `${k}:${v}`).join(';')}}</style>`;
  const out = pluginHtml.replace(/<html([^>]*)>/, `<html$1 class="${f.cls}">`).replace(/<head>/, `<head>${style}`);
  if (out === pluginHtml) throw new Error('the Figma theme stub did not apply to dist/ui.html');
  return out;
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/plugin') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(themedPlugin(url.searchParams.get('figma') === 'dark' ? 'dark' : 'light'));
    return;
  }
  try {
    const p = join(STUDIO, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

/** A booted app on the opening page, Color › Palettes (the two panes, from S2). Studio: from the start
 *  screen's prism3 chip, the OS scheme emulated. Plugin: Figma's theme stubbed, then the start screen the host
 *  asks for, then the first example. */
const open = async ({ host, theme, w, h, store }) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  if (store) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, store);
  if (host === 'web') {
    await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
    await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }));
  } else {
    await page.goto(`${ORIGIN}/plugin?figma=${theme}`, { waitUntil: 'load' });
    await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
    await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }));
  }
  await hooks.need(page, '[data-p3="frame"]');
  await hooks.need(page, '[data-p3="palettes-levers"]');
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errors };
};

/** Reach a place through the tab row (the select, when narrow), and wait for the frame to show it. */
const goPlace = async (page, place) => {
  const narrow = await page.evaluate(() => document.querySelector('[data-p3="frame"]')?.dataset.w === 'narrow');
  const [tabSel, subSel] = PLACE_CLICKS[place];
  if (narrow) await page.locator('[data-p3="tab-select"]').selectOption(hooks.role(tabSel).slice('tab-'.length));
  else await hooks.click(page.locator(tabSel));
  if (subSel) await hooks.click(page.locator(subSel));
  await page.waitForFunction((p) => document.querySelector('[data-p3="frame"]')?.dataset.place === p, place);
  await page.evaluate(() => document.fonts.ready);
};

// ── the in-page probe ────────────────────────────────────────────────────────────────────────────
/** Everything measurable about the chrome in its current state. */
const PROBE = (opt) => {
  const frame = document.querySelector('[data-p3="frame"]');
  const unparsed = [];
  const parse = (s, where) => {
    const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim());
    if (!m) { unparsed.push(`${where} "${s}"`); return null; }
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => {
    const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const fl = (n) => Math.floor(n * 100) / 100;
  /** The opaque ground an element is drawn on: its own background and its ancestors', composited. */
  const groundOf = (el) => {
    let acc = null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor, `${n.tagName} background`);
      if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return { ...acc, a: 1 }; }
    }
    const canvas = parse(getComputedStyle(document.body).backgroundColor, 'body background') ?? { r: 255, g: 255, b: 255, a: 1 };
    return acc ? over(acc, { ...canvas, a: 1 }) : { ...canvas, a: 1 };
  };
  const label = (el) => {
    const hk = el.getAttribute('data-p3');
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${hk ? `[${hk}]` : `.${(el.getAttribute('class') ?? '').split(' ')[0]}`} "${name}"`;
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const legacyPage = document.querySelector('[data-p3="legacy-page"]');
  const place = frame?.dataset.place ?? '';
  const skipLegacy = opt.legacyPages.includes(place);
  /** Inside the chrome: in the frame, outside brand content, outside the legacy page of a listed place,
   *  outside the notices' legacy cards and the legacy popovers (pinned light, `styles.css`). */
  const inChrome = (el) => frame?.contains(el)
    && !el.closest('[data-content]')
    && !(skipLegacy && legacyPage?.contains(el))
    && !el.closest('[data-p3="notices"] > *')
    && !el.closest('.barmenu-wrap > [data-theme="light"]')
    && !opt.inspectLegacy.some((sel) => el.closest(sel));

  const all = [...(frame?.querySelectorAll('*') ?? [])].filter(inChrome);
  const drawn = all.filter(shown);

  // text
  const text = [];
  for (const el of drawn) {
    if (el.closest('svg')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    const ink = parse(cs.color, `${label(el)} color`);
    if (!ink) continue;
    const g = groundOf(el);
    const px = parseFloat(cs.fontSize), weight = Number(cs.fontWeight);
    const large = px >= 24 || (px >= 18.66 && weight >= 700);
    text.push({ el: label(el), r: fl(ratio(over(ink, g), g)), large });
    el.setAttribute('data-cprobe', cs.fontFamily.includes(opt.monoAlias) ? 'mono' : 'text');
  }
  // fields: the value a field draws, on its own fill
  const fields = [];
  // A range and a color well draw no value text, so they have no ink to measure here.
  for (const el of drawn.filter((n) => n.matches('input:not([type="checkbox"]):not([type="range"]):not([type="color"]), select'))) {
    const cs = getComputedStyle(el);
    const ink = parse(cs.color, `${label(el)} color`);
    const g = groundOf(el);
    if (ink) fields.push({ el: label(el), r: fl(ratio(over(ink, g), g)), scheme: cs.colorScheme });
  }
  // controls, their kinds, targets, edges
  const CONTROL = 'button, select, input:not([type="hidden"]), [role="tab"], [role="menuitemradio"], a[href]';
  const controls = [];
  const unclassified = [];
  const edges = [];
  for (const el of drawn.filter((n) => n.matches(CONTROL))) {
    const cls = el.getAttribute('class') ?? '';
    const kind = opt.kinds.find(([c]) => cls.split(/\s+/).includes(c));
    if (!kind) { unclassified.push(label(el)); continue; }
    const r = el.getBoundingClientRect();
    controls.push({ el: label(el), kind: kind[1], hook: el.getAttribute('data-p3'), w: r.width, h: r.height });
    const cs = getComputedStyle(el);
    const outside = groundOf(el.parentElement);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs[`border${side}Width`]) < 1 || cs[`border${side}Style`] === 'none') continue;
      const c = parse(cs[`border${side}Color`], `${label(el)} border`);
      if (!c || c.a === 0) continue;
      // A tab's underline is drawn on the tab row; every other edge against what is outside the control.
      edges.push({ el: label(el), side, r: fl(ratio(over(c, outside), outside)) });
    }
  }
  // glyphs
  const glyphs = [];
  for (const svg of drawn.filter((n) => n.matches('svg.p3-ico'))) {
    const c = parse(getComputedStyle(svg).color, `${label(svg.parentElement)} glyph`);
    const g = groundOf(svg.parentElement);
    if (c) glyphs.push({ el: `glyph in ${label(svg.parentElement)}`, r: fl(ratio(over(c, g), g)) });
  }
  // shadows, on every chrome element and its pseudo-elements, drawn or not
  const shadows = [];
  for (const el of all) {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (cs.boxShadow !== 'none' || cs.textShadow !== 'none' || /drop-shadow/.test(cs.filter)) {
        shadows.push(`${label(el)}${pseudo ?? ''}: ${cs.boxShadow !== 'none' ? cs.boxShadow : cs.textShadow !== 'none' ? cs.textShadow : cs.filter}`);
      }
    }
  }
  // runtime inline values, over the whole document outside brand content and the skipped legacy page
  const inline = [];
  for (const el of document.querySelectorAll('[style]')) {
    if (el.closest('[data-content]') || (skipLegacy && legacyPage?.contains(el))) continue;
    if (opt.inspectLegacy.some((sel) => el.closest(sel))) continue;
    if (el.closest('[data-p3="start-screen"]')) continue;
    const props = [...el.style].filter((p) => !p.startsWith('--'));
    if (props.length) inline.push(`${label(el)} sets ${props.slice(0, 4).join(', ')}`);
  }
  // layers (IA-2): the preview pane's, the levers ground's and the top bar's grounds, as computed
  const bg = (sel) => { const n = document.querySelector(sel); return n ? parse(getComputedStyle(n).backgroundColor, `${sel} background`) : null; };
  const layers = { page: bg('[data-p3="preview-pane"] [data-p3="preview-head"]'), body: bg('[data-p3="preview-body"]'), levers: bg('[data-p3="tab-row"]'),
    leversPane: bg('[data-p3="levers-pane"]'), bar: bg('[data-p3="top-bar"]') };
  const L = (c) => (c ? lum(c) : NaN);
  return {
    place, layout: frame?.dataset.layout, w: frame?.dataset.w, theme: document.documentElement.dataset.theme,
    legacyShown: !!legacyPage && shown(legacyPage),
    inspectShown: [...document.querySelectorAll('[data-p3="inspect-body"]')].some(shown), panesShown: [...document.querySelectorAll('[data-p3="levers-pane"], [data-p3="preview-body"]')].some(shown),
    leversShown: [...document.querySelectorAll('[data-p3="levers-pane"]')].some(shown), previewShown: [...document.querySelectorAll('[data-p3="preview-body"]')].some(shown),
    legacyPage: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage,
    text, fields, controls, unclassified, edges, glyphs, shadows, inline, unparsed,
    layers: {
      leversOnPage: layers.levers && layers.page ? fl(ratio(layers.levers, layers.page)) : null,
      barOnLevers: layers.bar && layers.levers ? fl(ratio(layers.bar, layers.levers)) : null,
      oneDirection: (L(layers.levers) - L(layers.page)) * (L(layers.bar) - L(layers.levers)) > 0,
      paneMatchesRow: JSON.stringify(layers.leversPane) === JSON.stringify(layers.levers),
      bodyMatchesHead: JSON.stringify(layers.body) === JSON.stringify(layers.page),
    },
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  };
};

/** The fonts every probed text element drew, by CDP — leaf text elements only (a container reports its
 *  descendants' faces, the S1.1 trap). */
const fontsDrawn = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  // Every probed text node: `text` (the UI face) or `mono` (the mono face, S2).
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-cprobe]' });
  const out = [];
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const { attributes } = await cdp.send('DOM.getAttributes', { nodeId });
    const want = attributes[attributes.indexOf('data-cprobe') + 1] === 'mono' ? MONO_FONT : UI_FONT;
    const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
    out.push({ el: outerHTML.slice(0, 60), fonts: fonts.map((f) => `${f.familyName}${f.isCustomFont ? '' : ' (device)'}`),
      gapFonts: fonts.filter((f) => f.familyName !== want || !f.isCustomFont).reduce((n, f) => n + f.glyphCount, 0) });
  }
  await cdp.detach();
  await page.evaluate(() => { for (const n of document.querySelectorAll('[data-cprobe]')) n.removeAttribute('data-cprobe'); });
  return out;
};

/** Tab through the chrome from the top of the page, reading the ring each control draws. */
const focusRings = async (page) => {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.keyboard.press('Tab');
  const seen = [];
  for (let i = 0; i < 30; i++) {
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { done: false, skip: true };
      // Tab has left the chrome for a legacy page, or for the Style guide lent into Brand's preview (S3), which
      // draws in `styles.css` like the legacy page it came from.
      if (el.closest('[data-p3="legacy-page"], [data-p3="brand-style-guide"]')) return { done: true };
      const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s.trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const groundOf = (n0) => { let acc = null; for (let n = n0; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return { ...acc, a: 1 }; } } return acc ? over(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 }; };
      const cs = getComputedStyle(el);
      let width = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) : 0;
      let color = width ? cs.outlineColor : null;
      if (!width) {   // a tab draws its ring on ::before, inside the row's scroll box
        const b = getComputedStyle(el, '::before');
        if (b.content !== 'none' && b.display !== 'none' && b.visibility !== 'hidden' && parseFloat(b.opacity) > 0 && b.borderTopStyle !== 'none') { width = parseFloat(b.borderTopWidth); color = b.borderTopColor; }
      }
      const c = color ? parse(color) : null;
      // A ring drawn inside the control's box (a negative outline offset: the two scrolling panes, S2) is seen
      // against the control's own ground; every other ring against what is outside it.
      const g = groundOf(width && parseFloat(cs.outlineOffset) < 0 ? el : el.parentElement);
      return { hook: el.getAttribute('data-p3') ?? `${el.tagName.toLowerCase()}.${el.className}`, inFrame: !!el.closest('[data-p3="frame"]'),
        width, r: c ? Math.floor(ratio(over(c, g), g) * 100) / 100 : 0 };
    });
    if (r.done) break;
    if (!r.skip && r.inFrame) seen.push(r);
    await page.keyboard.press('Tab');
  }
  return seen;
};

const columnOf = (host, w) => `${host} ${w <= 560 ? 'narrow' : 'wide'}`;
const measure = async (page, where, host, w) => {
  const m = await page.evaluate(PROBE, { legacyPages: LEGACY_PAGES, kinds: CONTROL_KINDS, inspectLegacy: INSPECT_LEGACY, monoAlias: MONO_ALIAS });
  const fonts = await fontsDrawn(page);
  return { ...m, fonts };
};

/** `only`: the controls this state shows, replacing the column's list (the narrow Preview pane, which hides
 *  the tab row). */
/** `state`: 'page' (the default: a legacy place's legacy page in the legacy frame, or a moved place's two
 *  panes), 'inspect' (Inspect over the legacy frame, or over a moved place's preview), 'sheet' (the Activity
 *  drawer as the full-pane sheet at 380, S1.4), or 'preview' (a moved place on its narrow Preview pane).
 *  `extra`: hooks this state adds. */
const check = (m, where, column, floor = FLOORS[column], { state = 'page', extra = [], only = null } = {}) => {
  ok(m.unparsed.length === 0, `${where}: every computed color the probe met was parsed${m.unparsed.length ? ` — ${m.unparsed.slice(0, 3).join(' | ')}` : ''}`);
  // the two lists: every place is in exactly one
  const listed = LEGACY_PAGES.includes(m.place), moved = NEW_PAGES.includes(m.place);
  ok(listed !== moved, `${where}: place "${m.place}" is in exactly one of LEGACY_PAGES and NEW_PAGES (legacy ${listed}, moved ${moved})`);
  const shows = `layout "${m.layout}", legacy page ${m.legacyShown ? 'shown' : 'hidden'}, levers ${m.leversShown ? 'shown' : 'hidden'}, preview ${m.previewShown ? 'shown' : 'hidden'}, Inspect ${m.inspectShown ? 'shown' : 'hidden'}`;
  if (listed && state === 'page') {
    ok(m.layout === 'legacy' && m.legacyShown && !m.panesShown && !m.inspectShown, `page ${m.place} is listed as legacy and renders the legacy frame (${where}: ${shows})`);
  }
  if (moved && state === 'page') {
    // Wide: both panes. Narrow: one pane, the Settings one unless the state says otherwise.
    const want = m.w === 'narrow' ? m.leversShown && !m.previewShown : m.leversShown && m.previewShown;
    ok(m.layout === 'panes' && want && !m.legacyShown && !m.inspectShown, `page ${m.place} is listed as moved and renders the two panes (${where}: ${shows})`);
  }
  if (moved && state === 'preview') {
    ok(m.layout === 'panes' && m.previewShown && !m.leversShown && !m.legacyShown, `${where}: the narrow Preview pane shows the preview alone (${shows})`);
  }
  if (state === 'sheet') {
    ok(!m.legacyShown && !m.panesShown && !m.inspectShown, `${where}: the Activity sheet covers the page (${shows})`);
  }
  if (state === 'inspect') {
    ok(listed ? m.layout === 'legacy' && m.inspectShown && !m.legacyShown && !m.panesShown
      : m.layout === 'panes' && m.inspectShown && !m.previewShown && !m.legacyShown && (m.w === 'narrow' || m.leversShown),
    `${where}: Inspect covers the ${listed ? 'legacy frame' : 'preview'} (${shows})`);
  }
  // text
  ok(m.text.length >= floor.text, `${where}: measured ${m.text.length} chrome text nodes (floor ${floor.text})`);
  const dim = m.text.filter((t) => t.r < (t.large ? LARGE_TEXT_MIN : TEXT_MIN));
  ok(dim.length === 0, `${where}: every chrome text node clears ${TEXT_MIN}:1 (${LARGE_TEXT_MIN}:1 large)${dim.length ? ` — ${dim.slice(0, 4).map((t) => `text ${t.el} ${t.r}:1`).join(' | ')}` : ''}`);
  const fdim = m.fields.filter((f) => f.r < TEXT_MIN);
  ok(fdim.length === 0, `${where}: every chrome field inks its value at ${TEXT_MIN}:1${fdim.length ? ` — ${fdim.map((f) => `${f.el} ${f.r}:1`).join(' | ')}` : ''}`);
  // controls
  ok(m.unclassified.length === 0, `${where}: every chrome control is classified${m.unclassified.length ? ` — unclassified control ${m.unclassified.slice(0, 4).join(', ')}` : ''}`);
  ok(m.controls.length >= floor.controls, `${where}: measured ${m.controls.length} chrome controls (floor ${floor.controls})`);
  const have = new Set(m.controls.map((c) => c.hook));
  for (const want of [...(only ?? expectFor(column, m.place, state)), ...extra]) {
    const alts = Array.isArray(want) ? want : [want];
    ok(alts.some((a) => have.has(hooks.role(a))), `${where}: the chrome renders ${alts.join(' or ')} and it was measured`);
  }
  const small = m.controls.filter((c) => c.w < TARGET_MIN - 0.01 || c.h < TARGET_MIN - 0.01);
  ok(small.length === 0, `${where}: every chrome control is at least ${TARGET_MIN} × ${TARGET_MIN}${small.length ? ` — ${small.slice(0, 4).map((c) => `${c.el} ${c.w.toFixed(1)} × ${c.h.toFixed(1)}`).join(' | ')}` : ''}`);
  // edges and indicators
  ok(m.edges.length >= floor.edges, `${where}: measured ${m.edges.length} control edges and indicators (floor ${floor.edges})`);
  // One line per control (its weakest side), so the message names every control that fails.
  const weak = [...new Map(m.edges.filter((e) => e.r < NONTEXT_MIN).sort((a, b) => b.r - a.r).map((e) => [e.el, e])).values()];
  ok(weak.length === 0, `${where}: every control edge and indicator clears ${NONTEXT_MIN}:1${weak.length ? ` — ${weak.slice(0, 6).map((e) => `edge ${e.el} ${e.r}:1 < ${NONTEXT_MIN}`).join(' | ')}` : ''}`);
  ok(m.glyphs.length >= floor.glyphs, `${where}: measured ${m.glyphs.length} glyphs (floor ${floor.glyphs})`);
  const faint = m.glyphs.filter((g) => g.r < NONTEXT_MIN);
  ok(faint.length === 0, `${where}: every glyph clears ${NONTEXT_MIN}:1${faint.length ? ` — ${faint.slice(0, 4).map((g) => `${g.el} ${g.r}:1`).join(' | ')}` : ''}`);
  // fonts
  ok(m.fonts.length >= floor.fonts, `${where}: read the drawn fonts of ${m.fonts.length} chrome text elements (floor ${floor.fonts})`);
  // No glyph in any face but the embedded one (no FACE_GAPS: see the note above APPLY_LABEL).
  const offFace = m.fonts.filter((f) => !f.fonts.length || f.gapFonts > 0);
  ok(offFace.length === 0, `${where}: every chrome text element draws in the embedded ${UI_FONT} (${MONO_FONT} where it is set in mono)${offFace.length ? ` — ${offFace.slice(0, 3).map((f) => `${f.el} drew ${f.fonts.join(', ') || 'nothing'}`).join(' | ')}` : ''}`);
  // shadows, inline values, overflow
  ok(m.shadows.length === 0, `${where}: no chrome element draws a shadow (T5)${m.shadows.length ? ` — shadow: ${m.shadows.slice(0, 3).join(' | ')}` : ''}`);
  ok(m.inline.length === 0, `${where}: no runtime inline value outside [data-content]${m.inline.length ? ` — ${m.inline.slice(0, 4).join(' | ')}` : ''}`);
  ok(m.overflowX <= 1, `${where}: no horizontal page scroll (${m.overflowX}px past the viewport)`);
  // layers
  const L = m.layers;
  ok(L.leversOnPage !== null && L.leversOnPage >= LAYER_STEP && L.barOnLevers >= LAYER_STEP && L.oneDirection,
    `${where}: IA-2 layers: levers-bg on bg-page ${L.leversOnPage}:1, bar-bg on levers-bg ${L.barOnLevers}:1, each at least ${LAYER_STEP}:1 and in one direction${L.oneDirection ? '' : ' (they turn back)'}`);
  ok(L.paneMatchesRow && L.bodyMatchesHead, `${where}: the levers pane takes the tab row's ground and the preview body the preview head's`);
};

const report = (m, where) => {
  const lo = (xs) => (xs.length ? Math.min(...xs.map((x) => x.r)) : NaN);
  console.log(`  ${where}: ${m.text.length} text (lowest ${lo(m.text)}:1), ${m.controls.length} controls, ${m.edges.length} edges (lowest ${lo(m.edges)}:1), ${m.glyphs.length} glyphs (lowest ${lo(m.glyphs)}:1), ${m.fonts.length} fonts read`);
};

// =============================================================================================
// 1. Every column: host × theme × width, on the opening page, then focus rings
// =============================================================================================
console.log(`\nChrome — host × theme × width\n${'='.repeat(78)}`);
const lows = { text: Infinity, edge: Infinity, focus: Infinity, target: Infinity };
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    for (const { w, h } of WIDTHS) {
      const where = `${host} ${theme} ${w}`;
      const column = columnOf(host, w);
      const { ctx, page, errors } = await open({ host, theme, w, h });
      const m = await measure(page, where, host, w);
      ok(m.theme === (host === 'web' ? 'system' : theme), `${where}: <html data-theme> is "${m.theme}"`);
      check(m, where, column);
      report(m, where);
      for (const t of m.text) lows.text = Math.min(lows.text, t.r);
      for (const e of m.edges) lows.edge = Math.min(lows.edge, e.r);
      for (const c of m.controls) lows.target = Math.min(lows.target, c.w, c.h);
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s12-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
      // Focus rings: every chrome control Tab reaches.
      const rings = await focusRings(page);
      console.log(`    focus: ${rings.length} controls reached by Tab (lowest ring ${rings.length ? Math.min(...rings.map((r) => r.r)) : NaN}:1)`);
      const reached = new Set(rings.map((r) => r.hook));
      for (const want of FOCUS_STOPS[column]) ok(reached.has(hooks.role(want)), `${where}: Tab reaches ${want} and its ring was measured`);
      ok(rings.length >= FLOORS[column].focus, `${where}: Tab reached ${rings.length} chrome controls (floor ${FLOORS[column].focus})`);
      const badRing = rings.filter((r) => r.width < FOCUS_WIDTH_MIN || r.r < NONTEXT_MIN);
      ok(badRing.length === 0, `${where}: every focused chrome control draws a ring at least ${FOCUS_WIDTH_MIN}px wide at ${NONTEXT_MIN}:1${badRing.length ? ` — ${badRing.slice(0, 4).map((r) => `focus ${r.hook} ${r.width}px ${r.r}:1`).join(' | ')}` : ''}`);
      for (const r of rings) lows.focus = Math.min(lows.focus, r.r);
      // S3: Brand, the second moved page, in the same column: its levers, then (narrow) its Preview pane, then
      // the rings Tab draws through its levers.
      await goPlace(page, 'brand');
      const mb = await measure(page, `${where} / brand`, host, w);
      check(mb, `${where} / brand`, column, PLACE_FLOOR);
      report(mb, `${where} / brand`);
      for (const t of mb.text) lows.text = Math.min(lows.text, t.r);
      for (const e of mb.edges) lows.edge = Math.min(lows.edge, e.r);
      for (const c of mb.controls) lows.target = Math.min(lows.target, c.w, c.h);
      // #1770's claim, moved here from the brand menu's Modes section (retired, #1943): the always-on Light row
      // says it is locked in words at the chrome text bar, never by a fade. The row by its hook, its note found
      // among the text nodes this probe measured (by the probe's own label), and that node's own ratio.
      const lightRow = await page.evaluate(() => {
        const note = document.querySelector('[data-p3="levers-pane"] [data-p3="mode-on-light"] .p3-check-note');
        return { row: !!note, note: note?.textContent ?? null };
      });
      const lightNote = mb.text.find((t) => lightRow.note && t.el.startsWith(`span.p3-check-note "${lightRow.note.slice(0, 20)}`));
      ok(lightRow.row && !!lightNote && lightNote.r >= TEXT_MIN,
        `${where} / brand: the locked Light row says so in words ("${lightRow.note}") measured at ${TEXT_MIN}:1 (${lightNote ? `${lightNote.r}:1` : 'not measured'}) (#1770)`);
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s3-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-brand.png`) });
      if (w <= 560) {
        await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        const mp = await measure(page, `${where} / brand preview`, host, w);
        check(mp, `${where} / brand preview`, column, { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: 'preview' });
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s3-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-brand-preview.png`) });
        await hooks.click(page.locator('[data-p3="pane-toggle-settings"]'));
      }
      const brandRings = await page.evaluate(() => { document.querySelector('[data-p3="levers-pane"]').scrollTop = 0; return true; }) && await focusRings(page);
      const brandReached = new Set(brandRings.map((r) => r.hook));
      for (const want of ['[data-p3="brand-name"]', '[data-p3="brand-namespace"]', '[data-p3="personality-word"]']) ok(brandReached.has(hooks.role(want)), `${where} / brand: Tab reaches ${want} and its ring was measured`);
      const badBrandRing = brandRings.filter((r) => r.width < FOCUS_WIDTH_MIN || r.r < NONTEXT_MIN);
      ok(badBrandRing.length === 0, `${where} / brand: every focused control draws a ring at least ${FOCUS_WIDTH_MIN}px wide at ${NONTEXT_MIN}:1${badBrandRing.length ? ` — ${badBrandRing.slice(0, 4).map((r) => `focus ${r.hook} ${r.width}px ${r.r}:1`).join(' | ')}` : ''}`);
      for (const r of brandRings) lows.focus = Math.min(lows.focus, r.r);
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      await ctx.close();
    }
  }
}

// =============================================================================================
// 2. Every place: the legacy map, the layout, and the chrome on each (1280, light and dark)
// =============================================================================================
console.log(`\nPlaces — the tab row and the legacy frame\n${'='.repeat(78)}`);
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    for (const place of Object.keys(PLACE_CLICKS)) {
      await goPlace(page, place);
      const where = `${host} ${theme} 1280 / ${place}`;
      const want = EXPECT_LEGACY[host][place] ?? [];
      const shows = await page.evaluate(() => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage);
      if (NEW_PAGES.includes(place)) ok(shows === undefined, `${where}: a moved place names no legacy page — names "${shows}"`);
      else ok(shows === want[0], `${where}: the tab row lands on legacy page "${want[0]}" (plan §4) — shows "${shows}"`);
      if (want.length > 1) {
        // D8: the local switch, its labels, and the second page through it.
        const labels = (await page.locator('[data-p3="legacy-switch"] [role="tab"]').allTextContents()).map((s) => s.trim());
        ok(JSON.stringify(labels) === JSON.stringify(DEPTH_SWITCH_LABELS), `${where}: the local switch reads ${JSON.stringify(DEPTH_SWITCH_LABELS)} — read ${JSON.stringify(labels)}`);
        await hooks.click(page.locator('[data-p3="legacy-switch-motion"]'));
        await page.waitForFunction((p) => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === p, want[1]);
        ok(true, `${where}: the switch's second item shows "${want[1]}"`);
        const sel = await page.evaluate(() => [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].map((t) => t.textContent.trim()));
        ok(sel.includes('Depth & motion') && sel.includes('Motion'), `${where}: the tab and the switch both stay selected (${sel.join(', ')})`);
      }
      const m = await measure(page, where, host, 1280);
      check(m, where, columnOf(host, 1280), PLACE_FLOOR);
    }
    ok(errors.length === 0, `${host} ${theme} places: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    await ctx.close();
  }
}

// =============================================================================================
// 3. Q2: one header line across the split (1280, light and dark, with and without the sub-nav)
// =============================================================================================
console.log(`\nQ2 — the tab row and the preview title row share one divider\n${'='.repeat(78)}`);
// MEASURED ON COLOR › PALETTES, FOR REAL (S2): the first page that renders the two panes. S1.2 and S1.3 forced
// `data-layout="panes"` here because no page did; that force is gone. Q2 also asks for a page WITHOUT the
// sub-nav: S3 moved Brand, the first page outside Color in the panes, so `NEW_PAGES` carries that case too.
for (const theme of ['light', 'dark']) {
  const { ctx, page } = await open({ host: 'web', theme, w: 1280, h: 900 });
  for (const place of NEW_PAGES) {
    await goPlace(page, place);
    const where = `${theme} 1280 / ${place}`;
    const g = await page.evaluate(() => {
      const line = (sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); return { bottom: r.bottom, h: r.height, border: getComputedStyle(n).borderBottomWidth, shown: r.width > 0 && r.height > 0 }; };
      return { layout: document.querySelector('[data-p3="frame"]').dataset.layout, nav: line('[data-p3="tab-row"]'), head: line('[data-p3="preview-head"]'), sub: line('[data-p3="sub-nav"]') };
    });
    ok(g.layout === 'panes', `Q2 ${where}: the page renders the two panes itself, nothing forced (layout "${g.layout}")`);
    ok(g.nav?.shown && g.head?.shown, `Q2 ${where}: both header rows render in the two-pane layout`);
    ok(g.nav?.border === '1px' && g.head?.border === '1px', `Q2 ${where}: both rows draw a bottom divider (${g.nav?.border}, ${g.head?.border})`);
    const gap = g.nav && g.head ? Math.abs(g.nav.bottom - g.head.bottom) : Infinity;
    ok(gap <= ALIGN_TOLERANCE, `Q2 ${where}: the tab row's divider and the preview title row's divider are ${gap.toFixed(2)}px apart (tolerance ${ALIGN_TOLERANCE}px)`);
    if (place.startsWith('color-')) ok(g.sub?.shown && g.sub.bottom > g.nav.bottom, `Q1 ${where}: the Color sub-nav sits under the tab row's divider`);
    // Q2's second case, measured for real from S3: Brand is the first moved page without the sub-nav, so the
    // tab row alone meets the preview title row. The sub-nav must be absent, or this is the first case again.
    else hooks.absent(ok, { seen: !!g.nav?.shown, state: 'the tab row' }, !g.sub?.shown, `Q2 ${where}: a page outside Color draws no sub-nav, so the check above is the case without it`);
    // All seven tabs fit the levers column at 1280 (S2 closed the row up so they do), so none is out of view.
    const fit = await page.evaluate(() => { const t = document.querySelector('[data-p3="tab-row"] [role="tablist"]'); return { sw: t.scrollWidth, cw: t.clientWidth }; });
    ok(fit.sw <= fit.cw + 1, `${where}: the seven tabs fit the levers column without scrolling (${fit.sw}px in ${fit.cw}px)`);
  }
  await ctx.close();
}

// =============================================================================================
// 4. #1031 in a dark theme: a legacy field keeps light UA ink
// =============================================================================================
console.log(`\n#1031 — legacy fields in a dark theme\n${'='.repeat(78)}`);
for (const host of ['web', 'figma']) {
  const { ctx, page } = await open({ host, theme: 'dark', w: 1280, h: 900 });
  // A legacy page: Palettes moved to the two panes in S2 and Surfaces & fills in S4a. Interactive is the first
  // legacy Color page.
  await goPlace(page, 'color-interactive');
  const f = await page.evaluate(() => {
    const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s.trim()); const p = m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : [0, 0, 0, 0]; return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = (c) => { const f2 = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f2(c.r) + 0.7152 * f2(c.g) + 0.0722 * f2(c.b); };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const ground = (n0) => { let acc = null; for (let n = n0; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ? over(acc, parse(getComputedStyle(document.body).backgroundColor)) : parse(getComputedStyle(document.body).backgroundColor); };
    const fields = [...document.querySelectorAll('[data-p3="legacy-page"] input[type="text"], [data-p3="legacy-page"] input:not([type]), [data-p3="legacy-page"] select')]
      .filter((n) => n.getBoundingClientRect().width > 0);
    return { doc: getComputedStyle(document.documentElement).colorScheme, fields: fields.map((n) => {
      const cs = getComputedStyle(n); const g = ground(n); const x = lum(over(parse(cs.color), g)), y = lum(g);
      return { name: n.getAttribute('data-p3') ?? n.className, value: n.value, scheme: cs.colorScheme, r: Math.floor(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100 };
    }) };
  });
  const where = `${host} dark / Color › Surfaces & fills`;
  ok(/\bdark\b/.test(f.doc), `${where}: the document resolves a dark color-scheme ("${f.doc}") — the premise this check is about`);
  ok(f.fields.length >= 1, `${where}: measured ${f.fields.length} legacy field(s) (floor 1)`);
  const bad = f.fields.filter((x) => /\bdark\b/.test(x.scheme) || x.r < TEXT_MIN);
  ok(bad.length === 0, `${where}: every legacy field resolves a light color-scheme and inks its value at ${TEXT_MIN}:1${bad.length ? ` — ${bad.map((x) => `${x.name} "${x.value}" ${x.scheme} ${x.r}:1`).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 5. Behavior: tabs by key, the theme toggle, Figma's theme live, the theme menu's own chrome
// =============================================================================================
console.log(`\nBehavior\n${'='.repeat(78)}`);
{
  const { ctx, page } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  await goPlace(page, 'type');
  await page.locator('[data-p3="tab-type"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'shape');
  const k = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-p3'), sel: document.querySelector('[data-p3="tab-shape"]')?.getAttribute('aria-selected'), shows: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage }));
  ok(k.focus === 'tab-shape' && k.sel === 'true' && k.shows === 'size-radius', `ArrowRight on Type selects Shape, keeps focus on it, and shows its legacy page (${JSON.stringify(k)})`);

  // The theme menu, open: its own chrome, measured (light and, after choosing it, dark).
  await hooks.click(page.locator('[data-p3="theme-toggle"]'));
  await hooks.need(page, '[data-p3="theme-menu"]');
  const menu = await measure(page, 'web light 1280 / theme menu open', 'web', 1280);
  const items = new Set(menu.controls.map((c) => c.hook));
  for (const want of ['[data-p3="theme-option-light"]', '[data-p3="theme-option-dark"]', '[data-p3="theme-option-system"]']) ok(items.has(hooks.role(want)), `theme menu: ${want} is rendered and measured`);
  check(menu, 'web light 1280 / theme menu open', 'web wide', PLACE_FLOOR);
  await hooks.click(page.locator('[data-p3="theme-option-dark"]'));
  const t = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('prism3:chromeTheme'), bar: getComputedStyle(document.querySelector('[data-p3="top-bar"]')).backgroundColor }));
  ok(t.theme === 'dark' && t.stored === 'dark', `choosing Dark sets <html data-theme="dark"> and keeps it (${JSON.stringify(t)})`);
  await page.reload({ waitUntil: 'networkidle' });
  await hooks.need(page, '[data-p3="frame"]');
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  ok(after === 'dark', `the theme choice survives a reload (data-theme "${after}")`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 's12-studio-dark-1280-chosen.png') });
  await ctx.close();
}
{
  const { ctx, page } = await open({ host: 'figma', theme: 'light', w: 1280, h: 900 });
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.evaluate(() => document.documentElement.classList.replace('figma-light', 'figma-dark'));
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  const bar = await page.evaluate(() => getComputedStyle(document.querySelector('[data-p3="top-bar"]')).backgroundColor);
  ok(before === 'light', `the plugin starts on Figma's light theme (data-theme "${before}")`);
  ok(bar !== 'rgb(233, 233, 233)', `the plugin follows Figma to dark live: the top bar repaints (${bar})`);
  const toggles = await page.locator('[data-p3="theme-toggle"]').count();
  hooks.absent(ok, { seen: await page.locator('[data-p3="top-bar"]').count() === 1, state: 'the plugin\'s top bar' }, toggles === 0, 'the plugin offers no theme toggle (it follows Figma)');
  await ctx.close();
}

// =============================================================================================
// 6. Search (the owner's QA note Q3): typed in order, caret kept, filtered, closed back to its icon
// =============================================================================================
console.log(`\nSearch (Q3)\n${'='.repeat(78)}`);
const manifest = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/lever-manifest.json'), 'utf8'));
const labelOf = (key) => manifest.levers.find((l) => l.key === key)?.label;
const RADIUS = labelOf('radiusScale');
const DENSITY = labelOf('density');
ok(!!RADIUS && !!DENSITY, `the manifest names the radius lever ("${RADIUS}") and the density lever ("${DENSITY}")`);
for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 420 }]) {
  const { ctx, page } = await open({ host: 'web', theme: 'light', w, h });
  await goPlace(page, 'shape');
  const where = `search ${w}`;
  const opener = await page.evaluate(() => { const b = document.querySelector('[data-p3="search-open"]'); const r = b.getBoundingClientRect(); return { name: b.getAttribute('aria-label'), w: r.width, h: r.height }; });
  ok(opener.name === 'Search settings' && opener.w >= TARGET_MIN && opener.h >= TARGET_MIN, `${where}: the magnifier is named "Search settings" and is at least ${TARGET_MIN}px (${JSON.stringify(opener)})`);
  await hooks.click(page.locator('[data-p3="search-open"]'));
  await hooks.need(page, '[data-p3="search-input"]');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-p3'));
  ok(focused === 'search-input', `${where}: opening search focuses its field (focus on ${focused})`);
  const field = await page.evaluate(() => { const n = document.querySelector('[data-p3="search-input"]'); n.dataset.cid = 'same'; return true; });
  await page.keyboard.type('radius', { delay: 20 });
  const r = await page.evaluate((labels) => {
    const input = document.querySelector('[data-p3="search-input"]');
    const knobs = [...document.querySelectorAll('[data-p3="legacy-page"] .knob')];
    const vis = (k) => k.getBoundingClientRect().height > 0;
    const named = (l) => knobs.find((k) => k.querySelector('.knob-label, .chips-legend')?.textContent.trim() === l);
    return { value: input.value, same: input.dataset.cid === 'same', status: document.querySelector('[data-p3="search-status"]')?.textContent,
      visible: knobs.filter(vis).length, radius: !!named(labels[0]) && vis(named(labels[0])), density: named(labels[1]) ? vis(named(labels[1])) : null };
  }, [RADIUS, DENSITY]);
  ok(field && r.value === 'radius', `search: the field reads "radius" after typing it (${where}: read "${r.value}")`);
  ok(r.same, `${where}: the field is the same element after typing (never rebuilt)`);
  ok(r.radius, `${where}: the results contain the radius lever ("${RADIUS}")`);
  ok(r.density === false, `${where}: a setting that does not match ("${DENSITY}") is hidden (${r.density === null ? 'not on the page' : 'visible'})`);
  ok(r.status === `${r.visible} settings match`, `${where}: the status line counts what is shown ("${r.status}", ${r.visible} shown)`);
  // The caret holds: Home, then a keystroke, lands at the start.
  await page.keyboard.press('Home');
  await page.keyboard.type('x');
  const caret = await page.evaluate(() => document.querySelector('[data-p3="search-input"]').value);
  ok(caret === 'xradius', `${where}: the caret holds where it is put (Home, then "x", reads "${caret}")`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `s12-studio-light-${w}-search.png`) });
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-p3'), open: document.querySelector('[data-p3="search"]')?.dataset.open, hidden: document.querySelectorAll('[data-search-hidden]').length }));
  ok(closed.focus === 'search-open' && closed.open === 'false' && closed.hidden === 0, `${where}: Escape closes search, clears the filter, and returns focus to the magnifier (${JSON.stringify(closed)})`);
  await ctx.close();
}

// Search on a moved page (S2): the levers panel filters itself in place, advanced levers included, and counts.
{
  const CHROMA = labelOf('neutral.chroma');
  const PRIMARY = labelOf('primary');
  ok(!!CHROMA && !!PRIMARY, `the manifest names the neutral chroma lever ("${CHROMA}") and the primary lever ("${PRIMARY}")`);
  const { ctx, page } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  await hooks.click(page.locator('[data-p3="search-open"]'));
  await hooks.need(page, '[data-p3="search-input"]');
  await page.keyboard.type('chroma', { delay: 20 });
  const r = await page.evaluate((labels) => {
    const blocks = [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')];
    const vis = (n) => n.getBoundingClientRect().height > 0;
    const named = (l) => blocks.find((b) => b.querySelector('.p3-lever-name')?.textContent.trim() === l);
    return { value: document.querySelector('[data-p3="search-input"]').value, status: document.querySelector('[data-p3="search-status"]')?.textContent,
      shown: blocks.filter(vis).length, chroma: !!named(labels[0]) && vis(named(labels[0])), primary: named(labels[1]) ? vis(named(labels[1])) : null,
      pinned: !!document.querySelector('[data-p3="lever-neutral-anchor"]') };
  }, [CHROMA, PRIMARY]);
  ok(r.value === 'chroma' && r.chroma, `search palettes: typing "chroma" shows the "${CHROMA}" lever (${JSON.stringify(r)})`);
  ok(r.primary === false, `search palettes: a lever that does not match ("${PRIMARY}") is hidden (${r.primary === null ? 'not on the page' : 'visible'})`);
  ok(r.pinned, 'search palettes: the search reaches the advanced levers (the pinned neutral is drawn while it runs)');
  ok(r.status === `${r.shown} settings match`, `search palettes: the status line counts what is shown ("${r.status}", ${r.shown} shown)`);
  await page.keyboard.press('Escape');
  const after = await page.evaluate(() => ({ hidden: [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')].filter((n) => n.getBoundingClientRect().height === 0).length, focus: document.activeElement?.getAttribute('data-p3') }));
  ok(after.hidden === 0 && after.focus === 'search-open', `search palettes: Escape shows every lever again and returns to the magnifier (${JSON.stringify(after)})`);
  await ctx.close();
}

// =============================================================================================
// 7. One home per page (V1): every place names its literal home, and nothing but a place change moves it
// =============================================================================================
console.log(`\nHomes (V1, V12) — one home per page, never moved by scroll or focus\n${'='.repeat(78)}`);
/** Concept v6's homes, typed here (never imported from `src/shell/pages.ts`): each place's view id and the
 *  title the preview header shows for it. */
const EXPECT_HOME = {
  brand: ['guide', 'Style guide'], 'color-palettes': ['palettes', 'Palettes'], 'color-fills': ['surfaces', 'Surfaces & fills'],
  'color-interactive': ['interactive', 'Interactive'], type: ['type', 'Type'], shape: ['shape', 'Size & shape'],
  depth: ['depth', 'Depth & motion'], layout: ['layout', 'Layout'], components: ['comps', 'Components'],
};
const previewView = (page) => page.evaluate(() => ({
  view: document.querySelector('[data-p3="preview-body"]')?.dataset.view ?? null,
  title: document.querySelector('[data-p3="preview-title"]')?.textContent ?? null,
}));
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  // Visit every place twice, in two orders, so a home that follows the previous page cannot pass.
  for (const place of [...Object.keys(PLACE_CLICKS), ...Object.keys(PLACE_CLICKS).reverse()]) {
    await goPlace(page, place);
    const got = await previewView(page);
    const [view, title] = EXPECT_HOME[place];
    ok(got.view === view && got.title === title, `V1 home: ${host} ${place} shows ${got.view} ("${got.title}"), want ${view} ("${title}")`);
  }
  // Scroll and focus, on every place: the preview's view never changes (V1). The legacy page is what
  // scrolls and takes focus while the page is legacy; every focusable control in it is visited, up to a cap.
  let scrolls = 0, focuses = 0;
  for (const place of Object.keys(PLACE_CLICKS)) {
    await goPlace(page, place);
    const before = (await previewView(page)).view;
    // A moved place scrolls in its panes (the frame is fixed), and its controls are in the levers pane.
    const moved = NEW_PAGES.includes(place);
    const scope = moved ? '[data-p3="levers-pane"]' : '[data-p3="legacy-page"]';
    for (const at of [0.5, 1, 0]) {
      await page.evaluate(([f, mv]) => {
        if (!mv) { window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f); return; }
        for (const n of document.querySelectorAll('[data-p3="levers-pane"], [data-p3="preview-body"]')) n.scrollTop = (n.scrollHeight - n.clientHeight) * f;
      }, [at, moved]);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const now = (await previewView(page)).view;
      scrolls++;
      ok(now === before, `V1 scroll: ${host} ${place} scrolled to ${at * 100}% and the preview stayed ${before} (now ${now})`);
    }
    const n = await page.evaluate((sc) => document.querySelectorAll(`${sc} :is(button, input, select, textarea, [tabindex="0"])`).length, scope);
    if (moved) ok(n >= 10, `V1 focus: ${host} ${place} offers ${n} controls to focus in its levers (floor 10)`);
    const step = Math.max(1, Math.floor(n / 12));
    for (let i = 0; i < n; i += step) {
      await page.evaluate(([k, sc]) => document.querySelectorAll(`${sc} :is(button, input, select, textarea, [tabindex="0"])`)[k]?.focus(), [i, scope]);
      const now = (await previewView(page)).view;
      focuses++;
      ok(now === before, `V1 focus: ${host} ${place} control ${i} took focus and the preview stayed ${before} (now ${now})`);
    }
  }
  console.log(`  ${host}: ${scrolls} scroll checks, ${focuses} focus checks`);
  ok(scrolls >= 27 && focuses >= 27, `${host}: ran ${scrolls} scroll and ${focuses} focus checks (floor 27 each)`);
  // V12: nothing offers "Keep this view".
  const keep = await page.evaluate(() => ({ frame: !!document.querySelector('[data-p3="frame"]'), n: [...document.querySelectorAll('[data-p3="frame"] *')].filter((e) => /keep this view/i.test(e.textContent ?? '') && !e.children.length).length }));
  hooks.absent(ok, { seen: keep.frame, state: 'the frame' }, keep.n === 0, `V12 keep: ${host} offers no "Keep this view" (${keep.n} found)`);
  ok(errors.length === 0, `${host} homes: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 8. Inspect (F1): over the legacy frame, from the verdict; its three views; back to where it was
// =============================================================================================
console.log(`\nInspect — the verdict opens Contrast, with Health first\n${'='.repeat(78)}`);
/** The verdict, as the owner decided it (v4 review Q2, v5 Q2) and concept v6 words it: literals. */
const VERDICT_LINE = 'All 884 pairs at or above floor';
const HEALTH_LINE = 'All 884 pairs at or above floor.';
const HEALTH_MODES = ['Light: 221 of 221 at or above', 'Dark: 221 of 221 at or above', 'High contrast light: 221 of 221 at or above', 'High contrast dark: 221 of 221 at or above'];
const INSPECT_TABS = ['Contrast', 'Tokens', 'Decisions log'];
/** The Decisions log's oracle: the engine's own decisions for the default theme, from the committed artifact
 *  (`$extensions.prism3.decisions` in `packages/engine/out/prism3.tokens.json`), never from the page. */
const DECISIONS = JSON.parse(readFileSync(join(REPO, 'packages/engine/out/prism3.tokens.json'), 'utf8')).$extensions?.prism3?.decisions ?? [];
ok(DECISIONS.length >= 10, `the committed default theme records ${DECISIONS.length} decisions (floor 10, so an empty read fails)`);
/** Inspect › Tokens' oracle (orchestrator review of #1923: the check read only "a table is there"). One
 *  primitive and one semantic, by literal path, with the value each must show read from the committed
 *  `out/prism3.tokens.json`, never from the page or the renderer. The list opens on Primitives; its own
 *  Semantics control must redraw it, inside Inspect, to the semantic. */
const OUT = JSON.parse(readFileSync(join(REPO, 'packages/engine/out/prism3.tokens.json'), 'utf8'));
const OUT_ROOT = OUT.$extensions?.prism3?.root;
const TOK_PRIMITIVE = { cat: 'core', path: 'palette.neutral.950' };
const TOK_SEMANTIC = { cat: 'color', path: 'text.primary' };
const at = (cat, path) => path.split('.').reduce((n, k) => n?.[k], OUT[OUT_ROOT]?.[cat]);
const TOK_PRIMITIVE_HEX = at(TOK_PRIMITIVE.cat, TOK_PRIMITIVE.path)?.$extensions?.prism3?.hex;
const TOK_SEMANTIC_ALIAS = at(TOK_SEMANTIC.cat, TOK_SEMANTIC.path)?.$extensions?.prism3?.aliasOf?.replace(`${OUT_ROOT}.`, '');
ok(/^#[0-9a-f]{6}$/i.test(TOK_PRIMITIVE_HEX ?? '') && /^core\.palette\./.test(TOK_SEMANTIC_ALIAS ?? ''),
  `the committed default theme carries ${TOK_PRIMITIVE.path} (${TOK_PRIMITIVE_HEX}) and ${TOK_SEMANTIC.path} → ${TOK_SEMANTIC_ALIAS}`);
/** Inspect › Contrast's oracle. Every row: the committed `schema/preview-spec.json`'s contracts, in order,
 *  in the table's literal "component · variant — label" wording. One pair's ratios: the primary button's
 *  label on its fill, each mode's ratio read from the emitted `contrast` of
 *  `color.interactive.primary.on-fill` (measured against `interactive.primary.fill.rest`, asserted below)
 *  in the committed `out/prism3.tokens.json`. */
const SPEC = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/preview-spec.json'), 'utf8'));
const CONTRACT_ROWS = SPEC.components.flatMap((c) => c.variants.flatMap((v) => (v.contracts ?? []).map((ct) => `${c.id} · ${v.name} — ${ct.label ?? `${ct.min}:1`}`)));
const KNOWN_PAIR = 'button · rest — label on fill';
const ONFILL = OUT[OUT_ROOT]?.color?.interactive?.primary?.['on-fill']?.$extensions?.prism3 ?? {};
const MODE_COLS = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark' };
const KNOWN_RATIOS = Object.fromEntries(Object.entries(MODE_COLS).map(([m, col]) => {
  const x = m === 'light' ? ONFILL : ONFILL.modes?.[m];
  return [col, x?.against === 'interactive.primary.fill.rest' && typeof x.contrast === 'number' ? x.contrast.toFixed(2) : null];
}));
ok(CONTRACT_ROWS.length >= 10 && CONTRACT_ROWS.includes(KNOWN_PAIR) && Object.values(KNOWN_RATIOS).every(Boolean),
  `the committed preview spec declares ${CONTRACT_ROWS.length} contracts, including "${KNOWN_PAIR}", whose emitted ratios are ${JSON.stringify(KNOWN_RATIOS)}`);
/** A legacy table inside `host`, as text: header cells, then each row's cells. */
const tableText = (page, host) => page.evaluate((host) => {
  const all = [...document.querySelectorAll(`[data-p3="${host}"] table tr`)];
  const cells = (r) => [...r.children].map((c) => c.textContent.trim());
  const head = all.find((r) => r.querySelector('th'));
  return { head: head ? cells(head) : [], rows: all.filter((r) => !r.querySelector('th')).map(cells) };
}, host);
const inspectState = (page) => page.evaluate(() => {
  const vis = (sel) => { const n = document.querySelector(sel); if (!n) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none'; };
  return {
    open: vis('[data-p3="inspect-body"]'), legacy: vis('[data-p3="legacy-page"]'), previewHead: vis('[data-p3="preview-head"]'),
    // The page Inspect covers: the legacy page, or a moved page's preview (S2).
    page: vis('[data-p3="legacy-page"]') || vis('[data-p3="preview-body"]'),
    tab: document.querySelector('[data-p3="inspect-head"] [role="tab"][aria-selected="true"]')?.textContent ?? null,
    tabs: [...document.querySelectorAll('[data-p3="inspect-head"] [role="tab"]')].map((t) => t.textContent),
    first: document.querySelector('[data-p3="inspect-body"] > * > :first-child')?.getAttribute('data-p3') ?? null,
    focus: document.activeElement?.getAttribute('data-p3') ?? null,
    legacyPage: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage, y: Math.round(window.scrollY),
    py: Math.round(document.querySelector('[data-p3="preview-body"]')?.scrollTop ?? 0),
    view: document.querySelector('[data-p3="preview-body"]')?.dataset.view,
    place: document.querySelector('[data-p3="frame"]')?.dataset.place,
  };
});
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    for (const { w, h } of WIDTHS) {
      const where = `${host} ${theme} ${w}`;
      const { ctx, page, errors } = await open({ host, theme, w, h });
      const name = await page.evaluate(() => ({ text: document.querySelector('[data-p3="verdict"]')?.textContent, label: document.querySelector('[data-p3="verdict"]')?.getAttribute('aria-label') }));
      ok(name.label === `Verdict: ${VERDICT_LINE}. Open Inspect, Contrast`, `${where}: the verdict is named "Verdict: ${VERDICT_LINE}. Open Inspect, Contrast" — named "${name.label}"`);
      if (w > 560) ok(name.text === VERDICT_LINE, `${where}: the verdict reads "${VERDICT_LINE}" — reads "${name.text}"`);
      // Scroll the page first, so "closes back to it" includes where it was: the window for a legacy page, the
      // preview body for a moved one (its frame is fixed; at 380 the preview pane is shown first).
      if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
      await page.evaluate(() => {
        window.scrollTo(0, Math.min(400, document.documentElement.scrollHeight - window.innerHeight));
        const b = document.querySelector('[data-p3="preview-body"]');
        if (b) b.scrollTop = Math.min(400, b.scrollHeight - b.clientHeight);
      });
      const before = await inspectState(page);
      await hooks.click(page.locator('[data-p3="verdict"]'));
      // Wait for Inspect, not for Health: a verdict that opened another view must fail by name below.
      await hooks.need(page, '[data-p3="inspect-body"] > *');
      const s1 = await inspectState(page);
      ok(s1.open && !s1.page, `the verdict opens Inspect over the page (${where}: Inspect ${s1.open ? 'shown' : 'hidden'}, page ${s1.page ? 'shown' : 'hidden'})`);
      ok(s1.tab === 'Contrast', `the verdict opens Inspect › Contrast (${where}: selected "${s1.tab}")`);
      ok(JSON.stringify(s1.tabs) === JSON.stringify(INSPECT_TABS), `${where}: Inspect's views are ${INSPECT_TABS.join(', ')} — read ${s1.tabs.join(', ')}`);
      ok(s1.first === 'health', `${where}: Health is at the top of Inspect › Contrast (first is "${s1.first}")`);
      ok(s1.focus === 'inspect-tab-contrast', `${where}: focus moves to the Contrast tab (on "${s1.focus}")`);
      const health = await page.evaluate(() => ({ line: document.querySelector('[data-p3="health-summary"]')?.textContent, modes: [...document.querySelectorAll('[data-p3="health-modes"] li')].map((l) => l.textContent) }));
      ok(health.line === HEALTH_LINE, `${where}: Health reads "${HEALTH_LINE}" — reads "${health.line}"`);
      ok(JSON.stringify(health.modes) === JSON.stringify(HEALTH_MODES), `${where}: Health lists each mode — ${JSON.stringify(health.modes)}`);
      const table = await page.locator('[data-p3="inspect-contrast-table"] table').count();
      ok(table === 1, `${where}: Inspect › Contrast carries the contrast contract table (${table} table(s))`);
      const ct = await tableText(page, 'inspect-contrast-table');
      const labels = ct.rows.map((r) => r[0]);
      ok(JSON.stringify(labels) === JSON.stringify(CONTRACT_ROWS), `${where}: Inspect › Contrast lists the preview spec's ${CONTRACT_ROWS.length} contracts, in order — listed ${labels.length}${labels.length ? `, first "${labels[0]}"` : ''}`);
      const known = ct.rows.find((r) => r[0] === KNOWN_PAIR);
      const shown = known ? Object.fromEntries(Object.keys(KNOWN_RATIOS).map((col) => [col, known[ct.head.indexOf(col)] ?? null])) : null;
      ok(JSON.stringify(shown) === JSON.stringify(KNOWN_RATIOS), `${where}: Inspect › Contrast shows "${KNOWN_PAIR}" at the emitted ratios ${JSON.stringify(KNOWN_RATIOS)} — shows ${JSON.stringify(shown)}`);
      const m = await measure(page, `${where} / Inspect › Contrast`, host, w);
      check(m, `${where} / Inspect › Contrast`, columnOf(host, w), w <= 560 ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { state: 'inspect', extra: ['[data-p3="inspect-tab-contrast"]', '[data-p3="inspect-close"]'] });
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s13-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-inspect-contrast.png`) });
      // Tokens: the legacy token list, whose own controls redraw it in place, inside Inspect.
      await hooks.click(page.locator('[data-p3="inspect-tab-tokens"]'));
      await hooks.need(page, '[data-p3="inspect-token-list"] table');
      /** The row whose name cell reads `path`: its cells' text, or null when no row does. */
      const tokRow = async (path) => (await tableText(page, 'inspect-token-list')).rows.find((r) => r[0] === path) ?? null;
      const prim = await tokRow(TOK_PRIMITIVE.path);
      ok(!!prim && prim.slice(1).some((c) => c.includes(TOK_PRIMITIVE_HEX)), `${where}: Inspect › Tokens opens on Primitives, with ${TOK_PRIMITIVE.path} at ${TOK_PRIMITIVE_HEX} — row ${JSON.stringify(prim)}`);
      ok(!(await tokRow(TOK_SEMANTIC.path)), `${where}: Inspect › Tokens does not list the semantic ${TOK_SEMANTIC.path} before its Semantics control is chosen`);
      const tiers = page.locator('[data-p3="inspect-token-list"] button').filter({ hasText: 'Semantics' });
      await hooks.click(tiers.first());
      const sem = await tokRow(TOK_SEMANTIC.path);
      const stillOpen = await page.evaluate(() => !!document.querySelector('[data-p3="inspect-body"] [data-p3="inspect-token-list"]'));
      ok(stillOpen && !!sem && (sem[1] ?? '').includes(TOK_SEMANTIC_ALIAS) && !(await tokRow(TOK_PRIMITIVE.path)),
        `${where}: a control inside Inspect › Tokens redraws the list inside Inspect (Semantics: ${TOK_SEMANTIC.path} → ${TOK_SEMANTIC_ALIAS}; row ${JSON.stringify(sem)}, Inspect ${stillOpen ? 'open' : 'closed'})`);
      const mt = await measure(page, `${where} / Inspect › Tokens`, host, w);
      check(mt, `${where} / Inspect › Tokens`, columnOf(host, w), w <= 560 ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { state: 'inspect', extra: ['[data-p3="inspect-tab-tokens"]'] });
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s13-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-inspect-tokens.png`) });
      // The Decisions log: the engine's notes, in its order and its words.
      await hooks.click(page.locator('[data-p3="inspect-tab-log"]'));
      await hooks.need(page, '[data-p3="decisions-list"]');
      const notes = await page.evaluate(() => [...document.querySelectorAll('[data-p3="decisions-list"] [data-p3="decision"]')].map((n) => n.textContent));
      ok(JSON.stringify(notes) === JSON.stringify(DECISIONS), `${where}: the Decisions log shows the engine's ${DECISIONS.length} decisions, verbatim and in order — showed ${notes.length}${notes.length ? `, first "${notes[0].slice(0, 40)}…"` : ''}`);
      const ml = await measure(page, `${where} / Inspect › Decisions log`, host, w);
      check(ml, `${where} / Inspect › Decisions log`, columnOf(host, w), w <= 560 ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { state: 'inspect', extra: ['[data-p3="inspect-tab-log"]'] });
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s13-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-inspect-log.png`) });
      // Back: the legacy page, where it was, with focus on the verdict that opened Inspect.
      await hooks.click(page.locator('[data-p3="inspect-close"]'));
      const s2 = await inspectState(page);
      ok(!s2.open && s2.page && s2.legacyPage === before.legacyPage && s2.view === before.view, `Inspect closes back to the page (${where}: Inspect ${s2.open ? 'shown' : 'hidden'}, page ${s2.page ? 'shown' : 'hidden'}, legacy page "${s2.legacyPage}", was "${before.legacyPage}")`);
      ok(Math.abs(s2.y - before.y) <= 1 && Math.abs(s2.py - before.py) <= 1, `${where}: Inspect closes back to where the page was scrolled (y ${s2.y}, was ${before.y}; preview ${s2.py}, was ${before.py})`);
      if (NEW_PAGES.includes(before.place)) ok(before.py > 0, `${where}: the preview was scrolled before Inspect opened (${before.py}px), so the check above is not vacuous`);
      ok(s2.focus === 'verdict', `${where}: closing Inspect returns focus to the verdict that opened it (on "${s2.focus}")`);
      ok(s2.view === before.view, `${where}: Inspect never moves the preview's home (${s2.view}, was ${before.view})`);
      // Escape closes it too.
      await hooks.click(page.locator('[data-p3="verdict"]'));
      await hooks.need(page, '[data-p3="health"]');
      await page.keyboard.press('Escape');
      const s3 = await inspectState(page);
      ok(!s3.open && s3.page && s3.focus === 'verdict', `${where}: Escape closes Inspect back to the page (${JSON.stringify({ open: s3.open, focus: s3.focus })})`);
      ok(errors.length === 0, `${where} Inspect: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      await ctx.close();
    }
  }
}
{
  // A page change closes Inspect (V1: a new page shows its home).
  const { ctx, page } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  await hooks.click(page.locator('[data-p3="verdict"]'));
  await hooks.need(page, '[data-p3="health"]');
  await goPlace(page, 'type');
  const s = await inspectState(page);
  ok(!s.open && s.page && s.legacyPage === 'typography' && s.view === 'type', `a tab change closes Inspect and shows the new page (${JSON.stringify({ open: s.open, page: s.legacyPage, view: s.view })})`);
  await ctx.close();
}

// =============================================================================================
// 9. The preview header in the two-pane layout, on Color › Palettes (S2: for real, nothing forced)
// =============================================================================================
console.log(`\nThe preview header — the mode control and Inspect (Color › Palettes)\n${'='.repeat(78)}`);
/** The default theme's modes, as the mode control must show them, and which are derived (hatched): the
 *  owner's mode model (Q1, model B) and the engine's mode registry, typed here. */
const EXPECT_MODES = [['light', 'Light', false], ['dark', 'Dark', false], ['hc-light', 'HC light', true], ['hc-dark', 'HC dark', true]];
const modeState = (page) => page.evaluate(() => ({
  radios: [...document.querySelectorAll('[data-p3="mode-control"] [data-p3="mode-option"]')].map((b) => ({
    mode: b.dataset.mode, label: b.querySelector('.p3-mode-name')?.textContent, checked: b.getAttribute('aria-checked'), role: b.getAttribute('role'),
    hatch: /repeating-linear-gradient/.test(getComputedStyle(b).backgroundImage), tab: b.tabIndex })),
  group: document.querySelector('[data-p3="mode-control"]')?.getAttribute('role'),
  legacy: document.querySelector('[data-p3="legacy-page"] [data-p3="mode-tab"].on [data-p3="mode-tab-name"]')?.textContent ?? null,
}));
for (const theme of ['light', 'dark']) {
  const where = `web ${theme} 1280 / color-palettes`;
  const { ctx, page, errors } = await open({ host: 'web', theme, w: 1280, h: 900 });
  const st = await modeState(page);
  ok(st.group === 'radiogroup', `${where}: the mode control is a radiogroup (role "${st.group}")`);
  ok(JSON.stringify(st.radios.map((r) => [r.mode, r.label])) === JSON.stringify(EXPECT_MODES.map(([m, l]) => [m, l])), `${where}: the mode control offers ${EXPECT_MODES.map(([, l]) => l).join(', ')} — read ${st.radios.map((r) => r.label).join(', ')}`);
  for (const [m, , derived] of EXPECT_MODES) {
    const r = st.radios.find((x) => x.mode === m);
    if (r?.checked !== 'true') ok(r?.hatch === derived, `${where}: ${m} is ${derived ? '' : 'not '}hatched (derived modes are, Q1)`);
  }
  ok(st.radios.filter((r) => r.checked === 'true').map((r) => r.mode).join() === 'light' && st.radios.every((r) => r.role === 'radio'), `${where}: Light is the one checked radio at boot (${st.radios.filter((r) => r.checked === 'true').map((r) => r.mode)})`);
  const mp = await measure(page, `${where} / preview header`, 'web', 1280);
  check(mp, `${where} / preview header`, 'web wide', PLACE_FLOOR);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `s13-studio-${theme}-1280-mode-control.png`) });
  // The mode control writes the mode the legacy pages draw in, and the legacy strip writes the same one back.
  await hooks.click(page.locator('[data-p3="mode-option"][data-mode="dark"]'));
  const a = await modeState(page);
  ok(a.radios.find((r) => r.mode === 'dark')?.checked === 'true', `${where}: choosing Dark in the mode control checks it`);
  await goPlace(page, 'color-interactive');
  await page.waitForFunction(() => document.querySelector('[data-p3="legacy-page"] [data-p3="mode-tab"].on [data-p3="mode-tab-name"]')?.textContent === 'Dark', null, { timeout: 5000 }).catch(() => {});
  const a2 = await modeState(page);
  ok(a2.legacy === 'Dark', `mode control: choosing Dark makes the legacy page draw Dark (${where}: the legacy mode strip shows "${a2.legacy}")`);
  await hooks.click(page.locator('[data-p3="legacy-page"] [data-p3="mode-tab"]').filter({ hasText: 'HC light' }));
  await goPlace(page, 'color-palettes');
  const b = await modeState(page);
  ok(b.radios.find((r) => r.mode === 'hc-light')?.checked === 'true', `${where}: the legacy strip's HC light checks HC light in the mode control (${b.radios.filter((r) => r.checked === 'true').map((r) => r.mode)})`);
  // Arrow keys move along the radios and choose as they go.
  await page.locator('[data-p3="mode-option"][data-mode="hc-light"]').focus();
  await page.keyboard.press('ArrowRight');
  const c = await modeState(page);
  const focusMode = await page.evaluate(() => document.activeElement?.dataset.mode);
  ok(c.radios.find((r) => r.mode === 'hc-dark')?.checked === 'true' && focusMode === 'hc-dark', `${where}: ArrowRight on HC light checks and focuses HC dark (checked ${c.radios.filter((r) => r.checked === 'true').map((r) => r.mode)}, focus ${focusMode})`);
  // Inspect from the preview header: it covers the preview, not the levers, and closes back to it.
  const homeBefore = (await previewView(page)).view;
  await hooks.click(page.locator('[data-p3="inspect-open"]'));
  await hooks.click(page.locator('[data-p3="inspect-option-tokens"]'));
  await hooks.need(page, '[data-p3="inspect-token-list"]');
  const pin = await page.evaluate(() => {
    const vis = (sel) => { const n = document.querySelector(sel); if (!n) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const line = (sel) => document.querySelector(sel)?.getBoundingClientRect().bottom;
    return { inspect: vis('[data-p3="inspect-body"]'), head: vis('[data-p3="preview-head"]'), levers: vis('[data-p3="levers-pane"]'), tab: document.querySelector('[data-p3="inspect-head"] [aria-selected="true"]')?.textContent, gap: Math.abs(line('[data-p3="tab-row"]') - line('[data-p3="inspect-head"]')) };
  });
  ok(pin.inspect && !pin.head && pin.levers && pin.tab === 'Tokens', `${where}: Inspect opens over the preview, beside the levers (${JSON.stringify(pin)})`);
  ok(pin.gap <= ALIGN_TOLERANCE, `Q2 ${where}: Inspect's header divider meets the tab row's (${pin.gap.toFixed(2)}px apart)`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `s13-studio-${theme}-1280-panes-inspect.png`) });
  await hooks.click(page.locator('[data-p3="inspect-close"]'));
  const back = await page.evaluate(() => ({ head: !!document.querySelector('[data-p3="preview-head"]')?.getClientRects().length, focus: document.activeElement?.getAttribute('data-p3'), view: document.querySelector('[data-p3="preview-body"]')?.dataset.view }));
  ok(back.head && back.focus === 'inspect-open' && back.view === homeBefore, `${where}: Inspect closes back to the preview, focus on Inspect (${JSON.stringify(back)})`);
  ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await open({ host, theme, w, h });
      if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
      const where = `${host} ${theme} ${w} / color-palettes`;
      const mp = await measure(page, `${where} / preview`, host, w);
      check(mp, `${where} / preview`, columnOf(host, w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: w <= 560 ? 'preview' : 'page' });
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s2-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-preview.png`) });
      await ctx.close();
    }
  }
}

// =============================================================================================
// 10. S1.4: the Activity drawer (F2), the Figma menu and the Agent chip (IA-3, D6)
// =============================================================================================
console.log(`\nActivity, the Figma menu and the Agent chip (S1.4)\n${'='.repeat(78)}`);
/** F2 and v5 Q9, as the owner decided them: a success collapses the drawer 4 s after it lands. Literal. */
const COLLAPSE_MS = 4000;
/** The Figma menu's items, by hook suffix and label: today's labels (the bar's two controls, the file-setup
 *  button) and concept v6's two option-first items. Literal. */
const FIGMA_ITEMS = [['apply', APPLY_LABEL], ['prune', 'Prune stale'], ['file-setup', 'Set up file'], ['build', 'Build set…'], ['style-guide', 'Style guide…']];
/** Each item's hook, spelled out so the hook guard reads every one. */
const FIGMA_OPTION = { apply: '[data-p3="figma-option-apply"]', prune: '[data-p3="figma-option-prune"]', 'file-setup': '[data-p3="figma-option-file-setup"]',
  build: '[data-p3="figma-option-build"]', 'style-guide': '[data-p3="figma-option-style-guide"]' };
/** What each item must do, observed: the write message it posts to the main thread (the message the old
 *  control posted), or the legacy page it opens. Typed here from `apps/plugin/src/messages.ts`'s names. */
const FIGMA_EFFECT = { apply: ['apply-theme'], prune: ['prune:false'], 'file-setup': ['file-setup'], build: 'components', 'style-guide': 'style-guide' };
/** The Figma menu's Prune item while each half of a prune runs (`figmaActions` in main.ts). Literal. */
const PRUNE_LABEL = { preview: '… Checking…', delete: '… Removing…' };
/** The drawer's note, per host: concept v6's plugin line, and the studio's own. Literal. */
const DRAWER_NOTE = { figma: 'Results of Apply, Build and Prune appear here after they run.', web: 'Nothing has run in this session.' };
const AGENT_LINE = 'Lets an agent on this computer run Prism3 commands in this file. Off at every launch; only you can turn it on.';
/** An agent-link state the main thread could publish, and the status line it must read as (today's words). */
const AGENT_ON = { v: 1, on: true, since: '2026-10-01T09:00:00.000Z', engineVersion: 'x', build: 'x', pollMs: 1000, transports: { mailbox: true, bridge: false }, lastCommand: null, inboxError: null };
const AGENT_ON_LINE = 'Listening — file mailbox, every 1 s · no command yet';
const AGENT_OFF_LINE = 'Off — agent commands are ignored.';
/** What each write must carry on the wire, worked out without the UI: the brand the page loaded is the
 *  committed `schema/example-brands.json`'s prism3 (the start screen's chip), and no edit is made in this
 *  section, so Apply and Prune must post that input whole. Shapes from `apps/plugin/src/messages.ts`. */
const BOOT_INPUT = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/example-brands.json'), 'utf8')).prism3;
const FIGMA_WIRE = { apply: { type: 'apply-theme', input: BOOT_INPUT }, prune: { type: 'prune', input: BOOT_INPUT, confirm: false }, 'file-setup': { type: 'file-setup' } };
const AGENT_WIRE = { type: 'agent-link', on: true };
/** Section 10's bound on a wait or a click: a stuck control fails the case by name instead of crashing the run. */
const WAIT = { timeout: 10000 };

const postMsg = (page, msg) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), msg);
/** Record every write the UI posts toward the main thread (in this harness `parent` is the page itself),
 *  the whole message, payload included. */
const recordPosts = (page) => page.evaluate(() => {
  window.__writes = [];
  window.addEventListener('message', (e) => {
    const m = e.data?.pluginMessage;
    if (m && ['apply-theme', 'prune', 'file-setup', 'build-components', 'style-guide', 'agent-link'].includes(m.type)) window.__writes.push(JSON.parse(JSON.stringify(m)));
  });
});
/** The messages posted since the last call. A post is delivered as a task, so one task is let through first. */
const takeWrites = (page) => page.evaluate(() => new Promise((r) => setTimeout(() => { const w = window.__writes.slice(); window.__writes.length = 0; r(w); }, 50)));
const keyOf = (m) => (m.type === 'prune' ? `prune:${m.confirm}` : m.type === 'agent-link' ? `agent-link:${m.on}` : m.type);
/** The writes posted since the last call, by kind. */
const takePosts = async (page) => (await takeWrites(page)).map(keyOf);
/** A value with its object keys sorted, as JSON: two messages are the same write when these match. */
const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
/** Where a posted message departs from the one it must be: the fields that differ, and inside `input`, its keys. */
const wireDiff = (got, want) => {
  if (!got) return 'nothing posted';
  const differ = (a, b) => [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => canon(a?.[k]) !== canon(b?.[k]));
  const keys = differ(got, want);
  if (!keys.length) return 'the same message';
  return keys.map((k) => (k === 'input' && got.input && typeof got.input === 'object' ? `input differs at ${differ(got.input, want.input).join(', ') || '(order)'}` : `${k} ${JSON.stringify(got[k])?.slice(0, 60)}`)).join('; ');
};
/** One write posted, and it is exactly `want`. */
const isWire = (ws, want) => ws.length === 1 && canon(ws[0]) === canon(want);
/** A pill in the drawer's bar row by its headline: its disclosure state and its chevron's drawn transform. */
const pillOf = (page, headline) => page.evaluate((hl) => {
  const n = [...document.querySelectorAll('[data-p3="activity-drawer"] [data-p3="bar"] [data-p3="status-verdict"]')].find((x) => (x.textContent ?? '').startsWith(hl));
  const ico = n?.querySelector('.p3-ico');
  return n ? { expanded: n.getAttribute('aria-expanded'), chev: ico ? getComputedStyle(ico).transform : null } : null;
}, headline);
/** Why a case stopped: the error's first line, and the locator it was waiting for. */
const stopped = (e) => { const lines = String(e?.message ?? e).replace(/\u001b\[[0-9;]*m/g, '').split('\n'); return [lines[0], lines.find((l) => /waiting for/.test(l))?.trim()].filter(Boolean).join(' · '); };
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const drawerState = (page) => page.evaluate(() => {
  const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let x = n; x && x.nodeType === 1; x = x.parentElement) if (getComputedStyle(x).display === 'none') return false; return true; };
  const d = document.querySelector('[data-p3="activity-drawer"]');
  const btn = document.querySelector('[data-p3="activity-open"]');
  const bar = document.querySelector('[data-p3="top-bar"]');
  const dr = d?.getBoundingClientRect(), br = bar?.getBoundingClientRect();
  return {
    shown: vis(d), open: d?.dataset.open === 'true', body: vis(document.querySelector('[data-p3="activity-body"]')),
    expanded: btn?.getAttribute('aria-expanded') ?? null, name: btn?.getAttribute('aria-label') ?? null,
    dot: btn?.querySelector('[data-state]')?.dataset.state ?? null,
    pills: [...document.querySelectorAll('[data-p3="activity-drawer"] [data-p3="bar"] :is([data-p3="status-pill"], [data-p3="status-verdict"])')].map((n) => n.textContent),
    barPills: document.querySelectorAll('[data-p3="top-bar"] :is([data-p3="status-pill"], [data-p3="status-verdict"])').length,
    note: vis(document.querySelector('[data-p3="activity-note"]')) ? document.querySelector('[data-p3="activity-note"]').textContent : null,
    detail: vis(document.querySelector('[data-p3="apply-detail"]')) ? document.querySelector('[data-p3="apply-detail"]').textContent : null,
    pinned: !!dr && vis(d) && Math.abs(dr.bottom - window.innerHeight) <= 1,
    sheet: !!dr && !!br && vis(d) && dr.top >= br.bottom - 1 && Math.abs(dr.bottom - window.innerHeight) <= 1 && !vis(document.querySelector('[data-p3="legacy-frame"]')),
  };
});
const sinceMs = async (page, t0, ms) => { const left = t0 + ms - Date.now(); if (left > 0) await page.waitForTimeout(left); };
const menuState = (page) => page.evaluate(() => ({
  open: !!document.querySelector('[data-p3="figma-menu"]'), expanded: document.querySelector('[data-p3="figma-open"]')?.getAttribute('aria-expanded'),
  items: [...document.querySelectorAll('[data-p3="figma-menu"] [role="menuitem"]')].map((n) => [n.getAttribute('data-p3'), n.textContent, n.disabled]),
  focus: document.activeElement?.getAttribute('data-p3') ?? null,
  page: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage,
}));
/** The bar's Apply control: its text, any aria-label overriding that text, and whether it can run. */
const applyBar = (page) => page.evaluate(() => { const b = document.querySelector('[data-p3="apply-to-figma"]');
  return { text: b?.textContent ?? null, name: b?.getAttribute('aria-label') ?? null, disabled: b?.disabled ?? null }; });
const openFigma = async (page) => { await hooks.click(page.locator('[data-p3="figma-open"]'), WAIT); await hooks.need(page, '[data-p3="figma-menu"]', WAIT); };

for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    for (const { w, h } of WIDTHS) {
      const where = `${host} ${theme} ${w}`;
      const narrow = w <= 560;
      const shot = (name) => (SHOTS ? page.screenshot({ path: join(SHOTS, `s14-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-${name}.png`) }) : null);
      const { ctx, page, errors } = await open({ host, theme, w, h });
      try {
        await recordPosts(page);
        // Idle: nothing has run, so the drawer is not drawn and the button says nothing more than its name.
        const idle = await drawerState(page);
        ok(!idle.shown && !idle.open && idle.expanded === 'false' && idle.name === 'Activity' && idle.dot === 'none',
          `F2 ${where}: before anything runs the drawer is not drawn and Activity reads "Activity" with no dot (${JSON.stringify({ shown: idle.shown, name: idle.name, dot: idle.dot })})`);

        if (host === 'web') {
          // The studio runs no write: Activity opens the drawer on its note, and closes it again.
          await hooks.click(page.locator('[data-p3="activity-open"]'), WAIT);
          const a = await drawerState(page);
          ok(a.shown && a.open && a.body && a.expanded === 'true' && a.note === DRAWER_NOTE.web, `F2 ${where}: Activity shows the drawer with "${DRAWER_NOTE.web}" (${JSON.stringify({ open: a.open, note: a.note })})`);
          const m = await measure(page, `${where} / Activity open`, host, w);
          check(m, `${where} / Activity open`, columnOf(host, w), narrow ? { ...INSPECT_NARROW_FLOOR, text: 3, fonts: 3, controls: 5 } : PLACE_FLOOR, narrow
            ? { state: 'sheet', only: ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="theme-toggle"]', '[data-p3="activity-toggle"]'] }
            : { extra: ['[data-p3="activity-toggle"]'] });
          if (narrow) ok(a.sheet, `F2 ${where}: at 380 Activity opens the full-pane sheet under the top row (sheet ${a.sheet})`);
          await shot('drawer-open');
          await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
          const b = await drawerState(page);
          ok(!b.open && !b.shown && b.expanded === 'false', `F2 ${where}: the drawer's own toggle closes it (${JSON.stringify({ open: b.open, shown: b.shown })})`);
          await shot('drawer-collapsed');
          const bar = await page.locator('[data-p3="top-bar"]').count();
          hooks.absent(ok, { seen: bar === 1, state: 'the studio\'s top bar' }, await page.locator('[data-p3="figma-open"]').count() === 0, `${where}: the studio offers no Figma menu`);
          hooks.absent(ok, { seen: bar === 1, state: 'the studio\'s top bar' }, await page.locator('[data-p3="bar-agent"]').count() === 0 && await page.locator('[data-p3="agent-chip"]').count() === 0, `${where}: the studio renders no Agent slot or chip`);
          ok(errors.length === 0, `${where} Activity: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
          continue;
        }

        // ── the Agent chip (IA-3), in the top bar; the bottom-left chip is gone (D6) ───────────────
        const chip = await page.evaluate(() => {
          const frame = document.querySelector('[data-p3="frame"]');
          const c = document.querySelector('[data-p3="top-bar"] [data-p3="bar-agent"] [data-p3="agent-chip"]');
          // Anything outside the frame that names an agent or holds a control: where the old chip was mounted.
          const outside = [...document.body.querySelectorAll('*')].filter((e) => !frame.contains(e) && !e.contains(frame) && !['SCRIPT', 'STYLE'].includes(e.tagName));
          return {
            inBar: !!c, name: c?.getAttribute('aria-label') ?? null, text: c?.textContent ?? null,
            old: !!document.querySelector('#p3-agent-link'),
            strays: outside.filter((e) => /agent/i.test(e.textContent ?? '') || e.querySelector('button')).map((e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}`),
          };
        });
        ok(chip.inBar && chip.name === 'Agent: Off', `IA-3 ${where}: the Agent chip sits in the top bar's Agent slot and is named "Agent: Off" (${JSON.stringify({ inBar: chip.inBar, name: chip.name })})`);
        if (!narrow) ok(chip.text === 'Agent: Off', `IA-3 ${where}: the Agent chip reads "Agent: Off" (reads "${chip.text}")`);
        hooks.absent(ok, { seen: chip.inBar, state: 'the Agent chip in the top bar' }, !chip.old && chip.strays.length === 0,
          `D6 ${where}: the bottom-left agent chip is gone — nothing outside the frame names an agent or holds a button (found ${JSON.stringify(chip.strays)}, #p3-agent-link ${chip.old ? 'present' : 'absent'})`);
        const slot = await page.evaluate(() => { const s0 = document.querySelector('[data-p3="bar-agent"]'); s0.__p3Mark = 'slot'; return true; });
        // A re-render of the legacy bar (the Pages menu opening and closing) keeps the same slot, chip inside.
        await hooks.click(page.locator('[data-p3="pages-menu"]'), WAIT);
        await hooks.click(page.locator('[data-p3="pages-menu"]'), WAIT);
        const kept = await page.evaluate(() => { const s1 = document.querySelector('[data-p3="bar-agent"]'); return s1?.__p3Mark === 'slot' && !!s1.querySelector('[data-p3="agent-chip"]'); });
        ok(slot && kept, `IA-3 ${where}: the Agent slot is the same node after the bar re-renders, and still holds the chip`);
        await hooks.click(page.locator('[data-p3="agent-chip"]'), WAIT);
        await hooks.need(page, '[data-p3="agent-popover"]', WAIT);
        const pop = await page.evaluate(() => ({
          sw: document.querySelector('[data-p3="agent-switch"]')?.getAttribute('role'), checked: document.querySelector('[data-p3="agent-switch"]')?.getAttribute('aria-checked'),
          lines: [...document.querySelectorAll('[data-p3="agent-popover"] p')].map((n) => n.textContent), status: document.querySelector('[data-p3="agent-status"]')?.textContent,
          focus: document.activeElement?.getAttribute('data-p3'), expanded: document.querySelector('[data-p3="agent-chip"]')?.getAttribute('aria-expanded'),
        }));
        ok(pop.sw === 'switch' && pop.checked === 'false' && pop.focus === 'agent-switch' && pop.expanded === 'true', `IA-3 ${where}: the chip opens its popover on the switch, off (${JSON.stringify({ sw: pop.sw, checked: pop.checked, focus: pop.focus })})`);
        ok(pop.lines[0] === AGENT_LINE && pop.status === AGENT_OFF_LINE, `IA-3 ${where}: the popover says what the link does and that it is off (${JSON.stringify(pop.lines)})`);
        const mc = await measure(page, `${where} / Agent popover`, host, w);
        check(mc, `${where} / Agent popover`, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: ['[data-p3="agent-switch"]'] });
        await shot('agent');
        await takePosts(page);
        await hooks.click(page.locator('[data-p3="agent-switch"]'), WAIT);
        const sw = await takeWrites(page);
        ok(isWire(sw, AGENT_WIRE), `IA-3 ${where}: the switch asks the main thread to turn the link on, ${JSON.stringify(AGENT_WIRE)} (posted ${JSON.stringify(sw)})`);
        await postMsg(page, { type: 'agent-link-state', state: AGENT_ON });
        await page.waitForFunction(() => document.querySelector('[data-p3="agent-chip"]')?.getAttribute('aria-label') === 'Agent: On', null, { timeout: 5000 }).catch(() => {});
        const on = await page.evaluate(() => ({ name: document.querySelector('[data-p3="agent-chip"]')?.getAttribute('aria-label'), checked: document.querySelector('[data-p3="agent-switch"]')?.getAttribute('aria-checked'), status: document.querySelector('[data-p3="agent-status"]')?.textContent }));
        ok(on.name === 'Agent: On' && on.checked === 'true' && on.status === AGENT_ON_LINE, `IA-3 ${where}: the main thread's state turns the chip on and the status line reads "${AGENT_ON_LINE}" (${JSON.stringify(on)})`);
        await postMsg(page, { type: 'agent-link-state', state: { ...AGENT_ON, on: false, since: null } });
        await page.keyboard.press('Escape');
        const shut = await page.evaluate(() => ({ pop: !!document.querySelector('[data-p3="agent-popover"]'), focus: document.activeElement?.getAttribute('data-p3') }));
        ok(!shut.pop && shut.focus === 'agent-chip', `IA-3 ${where}: Escape closes the popover back to the chip (${JSON.stringify(shut)})`);
        // Focus leaving the popover closes it: Tab past the switch. Shift+Tab back to the chip stays inside, and
        // Escape on the chip closes the popover it opened.
        const agentPop = () => page.evaluate(() => ({ pop: !!document.querySelector('[data-p3="agent-popover"]'), expanded: document.querySelector('[data-p3="agent-chip"]')?.getAttribute('aria-expanded'), focus: document.activeElement?.getAttribute('data-p3') ?? document.activeElement?.tagName.toLowerCase() ?? null }));
        await hooks.click(page.locator('[data-p3="agent-chip"]'), WAIT);
        await hooks.need(page, '[data-p3="agent-popover"]', WAIT);
        await page.keyboard.press('Tab');
        const tabbed = await agentPop();
        ok(!tabbed.pop && tabbed.expanded === 'false' && tabbed.focus !== 'agent-switch', `IA-3 ${where}: Tab past the switch closes the popover (${JSON.stringify(tabbed)})`);
        if (!tabbed.pop) await hooks.click(page.locator('[data-p3="agent-chip"]'), WAIT);
        await hooks.need(page, '[data-p3="agent-popover"]', WAIT);
        await page.locator('[data-p3="agent-switch"]').focus();
        await page.keyboard.press('Shift+Tab');
        const back = await agentPop();
        ok(back.pop && back.expanded === 'true' && back.focus === 'agent-chip', `IA-3 ${where}: Shift+Tab from the switch to the chip keeps the popover open (${JSON.stringify(back)})`);
        await page.keyboard.press('Escape');
        const escChip = await agentPop();
        ok(!escChip.pop && escChip.expanded === 'false' && escChip.focus === 'agent-chip', `IA-3 ${where}: Escape on the chip closes its open popover (${JSON.stringify(escChip)})`);

        // ── the Figma menu: by keyboard, then each item's action ──────────────────────────────────
        await page.locator('[data-p3="figma-open"]').focus();
        await page.keyboard.press('ArrowDown');
        const k0 = await menuState(page);
        ok(k0.open && k0.expanded === 'true' && k0.focus === 'figma-option-apply', `Figma menu ${where}: Arrow Down on the button opens the menu on its first item (${JSON.stringify({ open: k0.open, focus: k0.focus })})`);
        ok(JSON.stringify(k0.items.map(([hk, l]) => [hk, l])) === JSON.stringify(FIGMA_ITEMS.map(([id, l]) => [hooks.role(FIGMA_OPTION[id]), l])),
          `Figma menu ${where}: the items read ${FIGMA_ITEMS.map(([, l]) => l).join(', ')} — read ${k0.items.map(([, l]) => l).join(', ')}`);
        const keys = [];
        for (const key of ['ArrowDown', 'End', 'Home', 'ArrowUp']) { await page.keyboard.press(key); keys.push((await menuState(page)).focus); }
        ok(JSON.stringify(keys) === JSON.stringify(['figma-option-prune', 'figma-option-style-guide', 'figma-option-apply', 'figma-option-style-guide']),
          `Figma menu ${where}: Arrow Down, End, Home and Arrow Up (wrapping) move along the items (${keys.join(', ')})`);
        const mm = await measure(page, `${where} / Figma menu open`, host, w);
        check(mm, `${where} / Figma menu open`, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: Object.values(FIGMA_OPTION) });
        await shot('figma-menu');
        await page.keyboard.press('Escape');
        const k1 = await menuState(page);
        ok(!k1.open && k1.expanded === 'false' && k1.focus === 'figma-open', `Figma menu ${where}: Escape closes it back to its button (${JSON.stringify({ open: k1.open, focus: k1.focus })})`);
        await openFigma(page);
        await page.keyboard.press('Tab');
        ok(!(await menuState(page)).open, `Figma menu ${where}: Tab closes the menu`);

        // The bar's Apply, idle: its label and its accessible name are the literal label.
        const applyIdle = await applyBar(page);
        ok(applyIdle.text === APPLY_LABEL && applyIdle.name === null && !applyIdle.disabled,
          `${where}: the bar's Apply reads "${APPLY_LABEL}", named by its text, and can run (read ${JSON.stringify(applyIdle)})`);
        // Apply Theme, from the menu: the write the bar's Apply posts, and the drawer opens by itself (F2).
        await takePosts(page);
        await openFigma(page);
        await hooks.click(page.locator('[data-p3="figma-option-apply"]'), WAIT);
        const wa = await takeWrites(page);
        const pa = wa.map(keyOf);
        ok(JSON.stringify(pa) === JSON.stringify(FIGMA_EFFECT.apply), `Figma menu ${where}: Apply Theme posts ${FIGMA_EFFECT.apply} — posted ${JSON.stringify(pa)}`);
        ok(isWire(wa, FIGMA_WIRE.apply), `Figma menu ${where}: Apply Theme posts the brand the page loaded (example-brands.json's prism3), whole — ${wireDiff(wa[0], FIGMA_WIRE.apply)}`);
        await settle(page);
        const r = await drawerState(page);
        ok(r.pills.includes('Writing to Figma…'), `F2 ${where}: the running write's pill sits in the drawer's bar row (pills ${JSON.stringify(r.pills)})`);
        hooks.absent(ok, { seen: r.pills.length > 0, state: 'a status pill in the drawer' }, r.barPills === 0, `F2 ${where}: no status pill is left in the top bar (${r.barPills} found)`);
        ok(r.dot === 'run' && r.name === 'Activity, 1 running', `F2 ${where}: Activity's dot and name say a write is running (dot ${r.dot}, name "${r.name}")`);
        if (narrow) {
          ok(!r.open && r.shown && r.pinned && !r.body, `F2 ${where}: at 380 a running write shows in the strip, pinned to the bottom edge, and the drawer stays closed (${JSON.stringify({ open: r.open, shown: r.shown, pinned: r.pinned })})`);
        } else {
          ok(r.open && r.body && r.expanded === 'true' && r.pinned, `F2 ${where}: Apply opens the drawer by itself while it runs, pinned to the bottom edge (${JSON.stringify({ open: r.open, body: r.body, pinned: r.pinned })})`);
          ok(r.note === DRAWER_NOTE.figma, `F2 ${where}: the open drawer's body reads "${DRAWER_NOTE.figma}" while nothing is detailed (read "${r.note}")`);
        }
        const mr = await measure(page, `${where} / a write running`, host, w);
        check(mr, `${where} / a write running`, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: ['[data-p3="activity-toggle"]'] });
        await shot(narrow ? 'drawer-collapsed' : 'drawer-open');
        const applyBusy = await applyBar(page);
        ok(applyBusy.text === APPLY_RUNNING && applyBusy.disabled,
          `${where}: while the write runs, the bar's Apply reads "${APPLY_RUNNING}", disabled (read ${JSON.stringify(applyBusy)})`);
        // While it runs, the menu offers neither Apply nor Prune (today's rule: a prune reads what an apply writes).
        await openFigma(page);
        const busy = await menuState(page);
        const dis = Object.fromEntries(busy.items.map(([hk, , d]) => [hk, d]));
        ok(dis['figma-option-apply'] === true && dis['figma-option-prune'] === true && dis['figma-option-file-setup'] === false,
          `Figma menu ${where}: while Apply runs, Apply and Prune stale are unavailable and Set up file is not (${JSON.stringify(dis)})`);
        await page.keyboard.press('Escape');
        // A success collapses the drawer COLLAPSE_MS after it lands, and not before (timed at 1280).
        await postMsg(page, { type: 'apply-result', ok: true, headline: '✓ Applied 412 variables', summary: '412 variables written.' });
        const t0 = Date.now();
        await page.waitForFunction(() => [...document.querySelectorAll('[data-p3="bar"] [data-p3="status-verdict"]')].some((n) => (n.textContent ?? '').includes('✓ Applied')), null, { timeout: 5000 }).catch(() => {});
        if (w === 1280) {
          await sinceMs(page, t0, COLLAPSE_MS - 1000);
          const early = await drawerState(page);
          ok(early.open && early.body, `F2 ${where}: a success keeps the drawer open at ${(COLLAPSE_MS - 1000) / 1000} s (COLLAPSE_MS is ${COLLAPSE_MS / 1000} s) — open ${early.open}`);
          await sinceMs(page, t0, COLLAPSE_MS + 1000);
          const late = await drawerState(page);
          ok(!late.open && !late.body && late.shown && late.pills.some((p) => p.includes('✓ Applied')),
            `F2 ${where}: a success collapses the drawer by ${(COLLAPSE_MS + 1000) / 1000} s (COLLAPSE_MS is ${COLLAPSE_MS / 1000} s), its result still on the drawer's bar row — open ${late.open}, pills ${JSON.stringify(late.pills)}`);
          await shot('drawer-collapsed');
        } else if (narrow) {
          const s1 = await drawerState(page);
          ok(!s1.open && s1.shown && s1.dot === 'unread' && s1.name === 'Activity, new result', `F2 ${where}: at 380 a success stays in the strip and marks a new result (${JSON.stringify({ open: s1.open, dot: s1.dot, name: s1.name })})`);
        }
        // Prune stale, from the menu: the dry run the old Prune stale button posted.
        await openFigma(page);
        await hooks.click(page.locator('[data-p3="figma-option-prune"]'), WAIT);
        const wp = await takeWrites(page);
        const pp = wp.map(keyOf);
        ok(JSON.stringify(pp) === JSON.stringify(FIGMA_EFFECT.prune), `Figma menu ${where}: Prune stale posts a dry-run prune (${FIGMA_EFFECT.prune}) — posted ${JSON.stringify(pp)}`);
        ok(isWire(wp, FIGMA_WIRE.prune), `Figma menu ${where}: Prune stale posts the brand the page loaded with confirm false, whole — ${wireDiff(wp[0], FIGMA_WIRE.prune)}`);
        // While the dry run is out, the menu's Prune item says so (#1954). The expected text is the literal label.
        const pruneLabel = async () => { await openFigma(page); const t = await page.evaluate(() => document.querySelector('[data-p3="figma-option-prune"]')?.textContent ?? null); await page.keyboard.press('Escape'); return t; };
        const checking = await pruneLabel();
        ok(checking === PRUNE_LABEL.preview, `Figma menu ${where}: while the dry run is out, Prune stale reads "${PRUNE_LABEL.preview}" (read "${checking}")`);
        // The dry run finds something, the confirm dialog opens, and its Delete posts the real prune; while that
        // runs, the item reads the delete's label. The delete's result then lands as the dry run's empty one did.
        await postMsg(page, { type: 'prune-result', ok: true, applied: false, count: 3, summary: '3 stale items: 3 variables.' });
        await hooks.click(page.locator('[data-p3="prune-dialog"] [data-p3="dialog-confirm"]'), WAIT);
        const wd = await takePosts(page);
        ok(JSON.stringify(wd) === JSON.stringify(['prune:true']), `Figma menu ${where}: the prune dialog's Delete posts the confirmed prune — posted ${JSON.stringify(wd)}`);
        const removing = await pruneLabel();
        ok(removing === PRUNE_LABEL.delete, `Figma menu ${where}: while the delete runs, Prune stale reads "${PRUNE_LABEL.delete}" (read "${removing}")`);
        await postMsg(page, { type: 'prune-result', ok: true, applied: true, count: 3, summary: 'Removed 3 stale items.' });
        // Set up file, from the menu: the write the page's own button posts. Its result fails (light) or warns
        // (dark), and either keeps the drawer open (F2); at 380 it opens the full-pane sheet.
        await openFigma(page);
        await hooks.click(page.locator('[data-p3="figma-option-file-setup"]'), WAIT);
        const wf = await takeWrites(page);
        const pf = wf.map(keyOf);
        ok(JSON.stringify(pf) === JSON.stringify(FIGMA_EFFECT['file-setup']), `Figma menu ${where}: Set up file posts ${FIGMA_EFFECT['file-setup']} — posted ${JSON.stringify(pf)}`);
        ok(isWire(wf, FIGMA_WIRE['file-setup']), `Figma menu ${where}: Set up file posts ${JSON.stringify(FIGMA_WIRE['file-setup'])} and nothing more — ${wireDiff(wf[0], FIGMA_WIRE['file-setup'])}`);
        const kind = theme === 'light' ? 'failure' : 'warning';
        const bad = theme === 'light'
          ? { type: 'file-setup-result', ok: false, headline: '✗ file setup failed', summary: 'file setup failed: a page named Components already exists' }
          : { type: 'file-setup-result', ok: false, headline: '⚠ 2 pages skipped', summary: '2 pages already present were skipped: Cover, Sandbox' };
        await postMsg(page, bad);
        const t1 = Date.now();
        await page.waitForFunction((s) => document.querySelector('[data-p3="apply-detail"]')?.textContent === s, bad.summary, { timeout: 5000 }).catch(() => {});
        if (w === 1280 || narrow) await sinceMs(page, t1, COLLAPSE_MS + 1000);
        const f = await drawerState(page);
        ok(f.open && f.body && f.detail === bad.summary, `F2 ${where}: a ${kind} keeps the drawer open${w === 1280 || narrow ? ` past ${(COLLAPSE_MS + 1000) / 1000} s` : ''}, its detail showing — open ${f.open}, detail "${f.detail}"`);
        ok(f.dot === 'bad' && f.name === 'Activity, 1 needs attention', `F2 ${where}: Activity's dot and name say a result needs attention (dot ${f.dot}, name "${f.name}")`);
        if (narrow) ok(f.sheet, `F2 ${where}: at 380 a ${kind} opens the full-pane sheet under the top row (sheet ${f.sheet})`);
        const mf = await measure(page, `${where} / a ${kind} open`, host, w);
        check(mf, `${where} / a ${kind} open`, columnOf(host, w), narrow ? { ...INSPECT_NARROW_FLOOR, text: 4, fonts: 4, controls: 6 } : PLACE_FLOOR,
          { state: narrow ? 'sheet' : 'page', only: narrow ? ['[data-p3="brand-switcher"]', '[data-p3="activity-open"]', ...FIGMA_BAR, '[data-p3="activity-toggle"]', '[data-p3="status-verdict"]'] : null, extra: narrow ? [] : ['[data-p3="activity-toggle"]', '[data-p3="status-verdict"]'] });
        if (narrow) await shot('drawer-open');
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        const c = await drawerState(page);
        ok(!c.open && c.shown && c.dot === 'bad', `F2 ${where}: the drawer's toggle closes it, and the dot keeps the ${kind} (open ${c.open}, dot ${c.dot})`);
        // Closing the drawer closes the detail it showed: the pill reads collapsed, its chevron unturned.
        const c1 = await pillOf(page, bad.headline);
        ok(c1?.expanded === 'false' && c1?.chev === 'none', `F2 ${where}: closing the drawer closes the ${kind}'s detail with it — its pill reads collapsed, chevron down (${JSON.stringify(c1)})`);
        // Clicking that pill opens its detail, and the drawer hears it through the store and opens by hand.
        const pillLoc = page.locator('[data-p3="activity-drawer"] [data-p3="status-verdict"]').filter({ hasText: bad.headline });
        await hooks.click(pillLoc, WAIT);
        await settle(page);
        const d1 = await drawerState(page), q1 = await pillOf(page, bad.headline);
        ok(d1.open && d1.body && d1.expanded === 'true' && d1.detail === bad.summary && q1?.expanded === 'true' && q1?.chev !== 'none',
          `F2 ${where}: clicking the ${kind}'s pill on a closed drawer opens the drawer on its detail, the pill expanded — open ${d1.open}, detail "${d1.detail}", pill ${JSON.stringify(q1)}`);
        await hooks.click(pillLoc, WAIT);
        await settle(page);
        const d2 = await drawerState(page), q2 = await pillOf(page, bad.headline);
        ok(d2.open && d2.detail === null && d2.note === DRAWER_NOTE.figma && q2?.expanded === 'false' && q2?.chev === 'none',
          `F2 ${where}: clicking the pill again closes its detail, and the drawer stays open on its note — open ${d2.open}, detail "${d2.detail}", note "${d2.note}", pill ${JSON.stringify(q2)}`);
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        // The two option-first items open the pages that hold those options; neither writes on its own.
        for (const id of ['build', 'style-guide']) {
          await openFigma(page);
          await hooks.click(page.locator(FIGMA_OPTION[id]), WAIT);
          await page.waitForFunction((p) => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === p, FIGMA_EFFECT[id], { timeout: 5000 }).catch(() => {});
          const g = await menuState(page);
          const px = await takePosts(page);
          ok(g.page === FIGMA_EFFECT[id] && px.length === 0, `Figma menu ${where}: ${FIGMA_ITEMS.find(([x]) => x === id)[1]} opens the ${FIGMA_EFFECT[id]} page and writes nothing (page "${g.page}", posted ${JSON.stringify(px)})`);
        }
        // The bar's own Apply runs the same write the menu's item does.
        await hooks.click(page.locator('[data-p3="apply-to-figma"]'), WAIT);
        const wb = await takeWrites(page);
        const pb = wb.map(keyOf);
        ok(JSON.stringify(pb) === JSON.stringify(FIGMA_EFFECT.apply), `${where}: the bar's Apply Theme posts ${FIGMA_EFFECT.apply}, as the menu's does — posted ${JSON.stringify(pb)}`);
        ok(isWire(wb, FIGMA_WIRE.apply), `${where}: the bar's Apply Theme posts the brand the page loaded, whole — ${wireDiff(wb[0], FIGMA_WIRE.apply)}`);
        ok(wa.length === 1 && wb.length === 1 && canon(wa[0]) === canon(wb[0]), `${where}: the bar's Apply and the Figma menu's post the same message — ${wireDiff(wb[0], wa[0])}`);
        const bad2 = errors.filter((e) => !/WebSocket/.test(e));
        ok(bad2.length === 0, `${where} S1.4: 0 console errors (the agent link's bridge socket aside)${bad2.length ? ` — ${bad2.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        // A wait that never resolves (a control stuck disabled, a hook that never renders) fails this case by
        // name and the run goes on to the next one, rather than ending as a TimeoutError.
        ok(false, `S1.4 ${where}: the case stopped at a wait that never resolved, and the rest of it was skipped — ${stopped(e)}`);
      } finally {
        await ctx.close();
      }
    }
  }
}

// =============================================================================================
// 11. S2: specimens sit on the brand's page color for the previewed mode, never on the chrome's card
// =============================================================================================
console.log(`\nSpecimen grounds — Color › Palettes and Brand (plan §6.1, §9.1)\n${'='.repeat(78)}`);
/** THE ORACLE, resolved in Node from the engine's committed emission, never from the page: each mode's
 *  `color.background.primary`, its alias chain followed through the base tree with that mode's overlay. */
const EMITTED = (() => {
  const out = join(REPO, 'packages/engine/out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const leafAt = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
  const withOverlay = (mode) => {
    if (mode === 'light') return base;
    const t = structuredClone(base);
    const ov = JSON.parse(readFileSync(join(out, `prism3.${mode}.overlay.tokens.json`), 'utf8'));
    const put = (src, dst) => { for (const [k, v] of Object.entries(src)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) dst[k] = v; else put(v, dst[k] ??= {}); } };
    put(ov, t);
    return t;
  };
  const resolveHex = (tree, path, seen = 0) => {
    const v = leafAt(tree, path)?.$value;
    if (typeof v !== 'string' || seen > 20) return null;
    const m = /^\{(.+)\}$/.exec(v);
    return m ? resolveHex(tree, m[1], seen + 1) : v.toLowerCase();
  };
  return Object.fromEntries(['light', 'dark', 'hc-light', 'hc-dark'].map((m) => [m, resolveHex(withOverlay(m), `${root}.color.background.primary`)]));
})();
ok(Object.values(EMITTED).every((x) => /^#[0-9a-f]{6}$/.test(x ?? '')), `the oracle resolved background.primary for every mode from the emission (${JSON.stringify(EMITTED)})`);
ok(EMITTED.light !== EMITTED.dark, `the oracle's light and dark page colors differ (${EMITTED.light}, ${EMITTED.dark}), so a specimen on the wrong ground can fail`);
/** EXPECTED, by name (represented, not counted; docs/34): every strip the default theme's Palettes preview
 *  draws at 1280, as palette-strip, where each must be a specimen root on the page color. prism3 emits seven
 *  ramps of 20 steps (two strips of ten each), and the opacity scale's 12 steps make two strips more. The
 *  alpha ramps are not here: they draw on a checkerboard by design (`preview/palettes.ts`). Literal. */
const EXPECT_SPECIMENS = ['primary', 'accent', 'neutral', 'success', 'warning', 'danger', 'info', 'opacity'].flatMap((p) => [`${p}-1`, `${p}-2`]);
/** Every strip in the preview, named by its palette and its place in that palette (1-based), whether it is
 *  marked a specimen root, and the ground it composites onto. The checkerboard alpha strips are skipped. */
const groundsOf = (page) => page.evaluate(() => {
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ?? { r: 255, g: 255, b: 255, a: 1 }; };
  const hex = (c) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  const strips = [...document.querySelectorAll('[data-p3="preview-body"] .p3-sqs:not(.p3-checker)')];
  // S3: Brand's Style guide, lent into the preview. Each of its sections is named by its title; its root is the
  // ground it draws its specimens on. A section drawn without one is measured where its content actually sits.
  const secs = [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="brand-style-guide"] .psec')];
  const card = (strips[0] ?? secs[0])?.closest('.p3-card, .p3-legacy-card');
  const seen = {};
  return { card: card ? hex(groundOf(card)) : null, strips: [...strips.map((n) => {
    const pal = n.closest('[data-palette]')?.dataset.palette ?? (n.closest('[data-p3="opacity-scale"]') ? 'opacity' : '?');
    seen[pal] = (seen[pal] ?? 0) + 1;
    return { name: `${pal}-${seen[pal]}`, root: n.getAttribute('data-p3') === 'specimen', ground: hex(groundOf(n)) };
  }), ...secs.map((sec) => {
    const g = sec.querySelector(':scope > .sg-ground');
    return { name: sec.querySelector('[data-p3="section-title"]')?.textContent ?? '?', root: !!g && g.getAttribute('data-p3') === 'specimen', ground: hex(groundOf(g ?? sec.lastElementChild ?? sec)) };
  })] };
});
/** The Style guide's specimen roots, by section title, in order: each section `renderPreviewStyleGuide` draws on a
 *  ground (S3; modeled on S2's `EXPECT_SPECIMENS`). Literal (orchestrator review of #1939). */
const STYLE_GUIDE_ROOTS = ['Background', 'Foreground', 'Text color', 'Border', 'Icon', 'Disabled', 'Interactive'];
/** Each moved place's preview, with the specimens it must draw, by name. */
const SPECIMEN_PLACES = { 'color-palettes': ['palettes', EXPECT_SPECIMENS], brand: ['brand', STYLE_GUIDE_ROOTS] };
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    for (const [place, [label, expect]] of Object.entries(SPECIMEN_PLACES)) {
      await goPlace(page, place);
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
        await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await groundsOf(page);
        const want = EMITTED[mode];
        for (const name of expect) {
          const st = g.strips.find((x) => x.name === name);
          ok(!!st && st.root && st.ground === want, `specimen ground: ${label} ${where}: ${name} is a specimen root on background.primary ${want}${
            !st ? ' — not drawn' : !st.root ? ` — not a specimen root, on ${st.ground === g.card ? `the chrome card (${st.ground})` : st.ground}` : st.ground !== want ? ` — ${st.ground === g.card ? `is the chrome card (${st.ground})` : `is ${st.ground}`}` : ''}`);
        }
        const unlisted = g.strips.filter((x) => !expect.includes(x.name)).map((x) => x.name);
        ok(unlisted.length === 0, `specimen ground: ${label} ${where}: every ${label === 'brand' ? 'Style guide section' : 'strip'} drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
      }
      // Back to Light, so the next place starts where the page booted.
      await hooks.click(page.locator('[data-p3="mode-option"][data-mode="light"]'));
    }
    await ctx.close();
  }
}

// =============================================================================================
// 12. S2: the Palettes levers, represented and not counted (plan §6.1)
// =============================================================================================
console.log(`\nControls represented — the Palettes levers\n${'='.repeat(78)}`);
/** The manifest keys v6 homes on Color › Palettes, and the tier each sits in (R2: the manifest flag decides
 *  on Palettes), with the hook each must render. Literal: the decision, never read from `pages.ts`. */
const PALETTES_LEVERS = [
  ['primary', '[data-p3="lever-primary"]', false], ['brandColors', '[data-p3="lever-brand-colors"]', false],
  ['neutral.hue', '[data-p3="lever-neutral-hue"]', false], ['neutral.chroma', '[data-p3="lever-neutral-chroma"]', false],
  ['neutral.anchor', '[data-p3="lever-neutral-anchor"]', true],
  ['status.success', '[data-p3="lever-status-success"]', true], ['status.warning', '[data-p3="lever-status-warning"]', true],
  ['status.danger', '[data-p3="lever-status-danger"]', true], ['status.info', '[data-p3="lever-status-info"]', true],
];
/** The hook rule, written here (the `leverHook` contract: dots to dashes, camel case to kebab case). */
const kebabHook = (k) => `lever-${k.replace(/\./g, '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
for (const [key, hook, adv] of PALETTES_LEVERS) {
  const lev = manifest.levers.find((l) => l.key === key);
  ok(!!lev, `the manifest has the Palettes lever ${key}`);
  ok(hooks.role(hook) === kebabHook(key), `${key}'s hook is ${kebabHook(key)} (listed ${hooks.role(hook)})`);
  ok(!!lev?.advanced === adv, `${key} is ${adv ? '' : 'not '}advanced in the manifest (R2: the flag decides on Palettes)`);
}
for (const host of ['web', 'figma']) {
  const { ctx, page } = await open({ host, theme: 'light', w: 1280, h: 900 });
  const count = () => page.evaluate((hs) => Object.fromEntries(hs.map((hk) => [hk, document.querySelectorAll(`[data-p3="levers-pane"] ${hk}`).length])), PALETTES_LEVERS.map(([, hk]) => hk));
  const strays = () => page.evaluate((hs) => [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')].map((n) => n.getAttribute('data-p3')).filter((r) => !hs.includes(`[data-p3="${r}"]`)), PALETTES_LEVERS.map(([, hk]) => hk));
  const c0 = await count();
  for (const [key, hook, adv] of PALETTES_LEVERS) {
    if (adv) hooks.absent(ok, { seen: c0['[data-p3="lever-primary"]'] === 1, state: 'the everyday Palettes levers' }, c0[hook] === 0, `${host}: Palettes lever ${key} waits behind Show advanced (${c0[hook]} rendered)`);
    else ok(c0[hook] === 1, `${host}: Palettes lever ${key} renders its hook ${hooks.role(hook)} once — rendered ${c0[hook]}`);
  }
  await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
  await hooks.need(page, '[data-p3="lever-status-info"]');
  const c1 = await count();
  for (const [key, hook] of PALETTES_LEVERS) ok(c1[hook] === 1, `${host}: Palettes lever ${key} renders its hook ${hooks.role(hook)} once with Show advanced open — rendered ${c1[hook]}`);
  const st = await strays();
  ok(st.length === 0, `${host}: every lever block on Palettes is one of its ${PALETTES_LEVERS.length} keys${st.length ? ` — unclassified lever ${st.join(', ')}` : ''}`);
  const label = await page.evaluate(() => document.querySelector('[data-p3="palettes-advanced"]')?.textContent);
  ok(label === 'Hide 5 advanced', `${host}: the disclosure reads "Hide 5 advanced" when open (reads "${label}")`);
  // The advanced levers are chrome too: measured with Show advanced open.
  const ma = await measure(page, `${host} light 1280 / Palettes, Show advanced open`, host, 1280);
  check(ma, `${host} light 1280 / Palettes, Show advanced open`, columnOf(host, 1280), PLACE_FLOOR, { extra: ['[data-p3="neutral-pin-switch"]', '[data-p3="status-success-source"]'] });
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `s2-${host === 'web' ? 'studio' : 'plugin'}-light-1280-advanced.png`), fullPage: false });
  await ctx.close();
}

// =============================================================================================
// 13. S2: an edit repaints the preview by subscription, and moves nothing (V1)
// =============================================================================================
console.log(`\nEdits — the levers write, the preview repaints\n${'='.repeat(78)}`);
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  const view0 = await previewView(page);
  const hero = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-p3="palette"][data-palette="primary"] .p3-hero')).backgroundColor);
  const field = page.locator('[data-p3="primary-hex"]');
  await field.fill('#00aa55');
  await field.press('Enter');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-p3="palette"][data-palette="primary"] .p3-hero')).backgroundColor === 'rgb(0, 170, 85)', null, { timeout: 5000 }).catch(() => {});
  ok(await hero() === 'rgb(0, 170, 85)', `edit: a primary of #00aa55 typed in the hex field repaints the preview's primary hero to it (${await hero()})`);
  const after = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-p3'), value: document.querySelector('[data-p3="primary-hex"]').value }));
  ok(after.focus === 'primary-hex' && after.value === '#00aa55', `edit: the hex field keeps its focus and its value through the repaint (${JSON.stringify(after)})`);
  const view1 = await previewView(page);
  ok(view1.view === view0.view, `V1 edit: a lever edit never moves the preview's home (${view1.view}, was ${view0.view})`);
  // A brand color: add one, and it gets its own ramp in the preview; remove it, and the ramp goes.
  const ramps = () => page.locator('[data-p3="preview-body"] [data-p3="palette"]').count();
  const n0 = await ramps();
  await hooks.click(page.locator('[data-p3="brand-color-add"]'));
  await page.waitForFunction((n) => document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]').length === n + 1, n0, { timeout: 5000 }).catch(() => {});
  const added = await page.evaluate(() => ({ n: document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]').length, focus: document.activeElement?.getAttribute('data-p3'), names: [...document.querySelectorAll('[data-p3="brand-color-name"]')].map((i) => i.value) }));
  ok(added.n === n0 + 1 && added.focus === 'brand-color-name', `edit: Add brand color adds a ramp to the preview and focuses the new color's name (${JSON.stringify(added)}, was ${n0})`);
  const rm = page.locator('[data-p3="brand-color-remove"]').last();
  await hooks.click(rm);
  // Removing asks first (owner, 2026-10-01; the confirm's own checks are in 13c). Counted, not waited on, so a
  // removal that skips the confirm fails here by name instead of ending the run.
  const asked = await page.locator('[data-p3="brand-color-confirm-go"]').count();
  ok(asked === 1, `edit: removing a brand color asks first (${asked} confirm shown)`);
  if (asked) await hooks.click(page.locator('[data-p3="brand-color-confirm-go"]'));
  await page.waitForFunction((n) => document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]').length === n, n0, { timeout: 5000 }).catch(() => {});
  ok(await ramps() === n0, `edit: removing that color takes its ramp out of the preview (${await ramps()}, want ${n0})`);
  // A rename onto another palette's name is refused, and the field puts the old name back.
  const nameField = page.locator('[data-p3="brand-color-name"]').first();
  const was = await nameField.inputValue();
  await nameField.fill('primary');
  await nameField.press('Enter');
  await nameField.press('Tab');
  ok(await page.locator('[data-p3="brand-color-name"]').first().inputValue() === was, `edit: renaming a brand color to "primary" is refused and the name stays "${was}"`);
  await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
  // The neutral sliders, as the legacy page had them: only a custom tint edits them. Under Follow primary the
  // chroma is read-only; with a pinned neutral both are read-only and show the anchor's own hue and chroma.
  const sliders = () => page.evaluate(() => {
    const hue = document.querySelector('[data-p3="neutral-hue-slider"]'), ch = document.querySelector('[data-p3="neutral-chroma-slider"]');
    const meta = document.querySelector('[data-p3="lever-neutral-anchor"] .p3-colorfield-meta')?.textContent ?? '';
    const m = /OKLCH ([\d.]+) ([\d.]+) ([\d.]+)°/.exec(meta);
    return { hue: hue ? { disabled: hue.disabled, value: Number(hue.value) } : null, chroma: ch ? { disabled: ch.disabled, value: Number(ch.value) } : null,
      anchor: m ? { c: Number(m[2]), h: Number(m[3]) } : null };
  });
  await hooks.click(page.locator('[data-p3="neutral-source-custom"]'));
  const custom = await sliders();
  ok(custom.hue && !custom.hue.disabled && custom.chroma && !custom.chroma.disabled, `neutral: a custom tint edits hue and chroma (${JSON.stringify(custom)})`);
  await hooks.click(page.locator('[data-p3="neutral-source-follow"]'));
  const follow = await sliders();
  ok(follow.chroma?.disabled === true, `neutral: under Follow primary the chroma slider is read-only, as on the legacy page (${JSON.stringify(follow.chroma)})`);
  await hooks.click(page.locator('[data-p3="neutral-source-custom"]'));
  await hooks.click(page.locator('[data-p3="neutral-pin-switch"]'));
  await hooks.need(page, '[data-p3="neutral-anchor-hex"]');
  const pinned = await sliders();
  ok(pinned.hue?.disabled === true && pinned.chroma?.disabled === true && !!pinned.anchor
    && Math.abs(pinned.hue.value - pinned.anchor.h) <= 1 && Math.abs(pinned.chroma.value - pinned.anchor.c) <= 0.0015,
  `neutral: a pinned neutral makes hue and chroma read-only and shows the anchor's own (${JSON.stringify(pinned)})`);
  // Pinning seeds the anchor from the neutral's own hue and chroma, so the read above would pass with the
  // sliders still pointed at the neutral (#1954). Move the anchor to a literal color and read them again.
  // THE ORACLE: the engine's own OKLCH conversion, bundled for Node from its source, applied to that literal
  // hex. Neither the slider code nor the page's meta readout feeds it.
  const NEW_ANCHOR = '#6b5f52';
  const esbuildP = await import('esbuild');
  const engColor = await esbuildP.build({ entryPoints: [join(REPO, 'packages/engine/color.ts')], bundle: true, platform: 'node', format: 'esm', write: false });
  const { rgbToOklch: toOk, hexToRgb: toRgb } = await import(`data:text/javascript;base64,${Buffer.from(engColor.outputFiles[0].text).toString('base64')}`);
  const want = toOk(toRgb(NEW_ANCHOR));
  ok(Math.abs(want.h - pinned.hue.value) > 5 && Math.abs(want.c - pinned.chroma.value) > 0.002,
    `neutral: the new anchor ${NEW_ANCHOR} (h ${want.h.toFixed(1)}°, c ${want.c.toFixed(4)}) is far from the pinned seed (h ${pinned.hue?.value}, c ${pinned.chroma?.value}), so a slider left on the seed fails`);
  const ancField = page.locator('[data-p3="neutral-anchor-hex"]');
  await ancField.fill(NEW_ANCHOR);
  await ancField.press('Enter');
  await page.waitForFunction((h) => Math.abs(Number(document.querySelector('[data-p3="neutral-hue-slider"]')?.value) - h) <= 1, want.h, { timeout: 5000 }).catch(() => {});
  const moved = await sliders();
  ok(moved.hue?.disabled === true && moved.chroma?.disabled === true
    && Math.abs(moved.hue.value - want.h) <= 1 && Math.abs(moved.chroma.value - want.c) <= 0.0015,
  `neutral: after the pinned anchor changes to ${NEW_ANCHOR}, the read-only sliders show its hue ${want.h.toFixed(1)}° and chroma ${want.c.toFixed(4)} (read hue ${moved.hue?.value}, chroma ${moved.chroma?.value})`);
  ok(errors.length === 0, `edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 13b. A status color switched to Custom starts from the color the role resolves to (owner, 2026-10-01)
// =============================================================================================
// THE ORACLE is the engine itself, bundled for Node from its source: the boot brand (the committed
// example-brands.json's prism3, read at BOOT_INPUT) with the case's source set, resolved, and the role's
// light-mode `foreground.<role>` read off it. It never calls `statusSeedHex`. The page's own preview is a
// second witness: the oracle's hex must be one of the squares the preview draws for the palette the role
// draws from, so the oracle and the page are resolving the same brand.
console.log(`\nStatus seed — Custom starts from the role's resolved color\n${'='.repeat(78)}`);
{
  const esbuild = await import('esbuild');
  const eng = await esbuild.build({ stdin: { contents: "export { brandTheme } from '@prism3/engine/theme'; export { resolveAllModes } from '@prism3/engine/modes';", resolveDir: join(HERE, 'src'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false, loader: { '.json': 'json' }, logLevel: 'silent' });
  const { brandTheme, resolveAllModes } = await import(`data:text/javascript;base64,${Buffer.from(eng.outputFiles[0].text).toString('base64')}`);
  // What the role resolves to with `src` set, the way the source select writes it: a borrow is `roleColors`,
  // Auto is neither `roleColors` nor `status` for that role.
  const oracle = (role, src) => {
    const inp = structuredClone(BOOT_INPUT);
    if (inp.status) delete inp.status[role];
    if (inp.roleColors) delete inp.roleColors[role];
    if (src.startsWith('use:')) inp.roleColors = { ...(inp.roleColors ?? {}), [role]: src.slice(4) };
    const t = brandTheme(inp);
    const light = resolveAllModes(t).find((m) => m.mode === 'light');
    return { hex: light.roles[`foreground.${role}`]?.hex?.toLowerCase(), palette: t.roleToPalette[role] };
  };
  // Each role's hooks, spelled literally for the hook guard.
  const CASES = [
    { role: 'success', src: 'use:accent', name: 'Use accent', sel: '[data-p3="status-success-source"]', hex: '[data-p3="status-success-hex"]', pick: '[data-p3="status-success-color"]' },
    { role: 'warning', src: 'auto', name: 'Auto', sel: '[data-p3="status-warning-source"]', hex: '[data-p3="status-warning-hex"]', pick: '[data-p3="status-warning-color"]' },
    { role: 'danger', src: 'use:primary', name: 'Use primary', sel: '[data-p3="status-danger-source"]', hex: '[data-p3="status-danger-hex"]', pick: '[data-p3="status-danger-color"]' },
  ];
  for (const { role, src, name, sel: selQ, hex: hexQ, pick: pickQ } of CASES) {
    const want = oracle(role, src);
    const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
    await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
    const sel = page.locator(selQ);
    await sel.selectOption(src);
    await page.waitForFunction(([q, v]) => document.querySelector(q)?.value === v, [selQ, src], { timeout: 5000 }).catch(() => {});
    const drawn = await page.evaluate((p) => [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]')]
      .filter((n) => n.dataset.palette === p && !n.classList.contains('p3-pal-reuse')).flatMap((n) => [...n.querySelectorAll('.p3-sqk-hex')].map((x) => `#${x.textContent.toLowerCase()}`)), want.palette);
    ok(!!want.hex && drawn.includes(want.hex), `status seed: ${role} on "${name}" resolves to ${want.hex} (engine, light foreground.${role}), a square the preview draws in palette.${want.palette} — drew ${drawn.length} squares${drawn.includes(want.hex) ? '' : ` (${drawn.slice(0, 4).join(' ')}…)`}`);
    await sel.selectOption('custom');
    await hooks.need(page, hexQ);
    const field = page.locator(hexQ);
    const seeded = await field.inputValue();
    ok(seeded === want.hex, `status seed: ${role} switched from "${name}" to Custom starts from the color the role resolved to, ${want.hex} — seeded ${seeded}`);
    const state = await page.evaluate(([r, sq, pq]) => ({ src: document.querySelector(sq)?.value, picker: document.querySelector(pq)?.value,
      own: [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]')].some((n) => n.dataset.palette === r && !n.classList.contains('p3-pal-reuse')) }), [role, selQ, pickQ]);
    ok(state.src === 'custom' && /^#[0-9a-f]{6}$/.test(seeded) && state.picker === seeded && state.own,
      `status seed: ${role}'s seeded color is a valid custom color (source custom, the picker agrees, its own ramp in the preview) (${JSON.stringify({ seeded, ...state })})`);
    // Editable: a typed hex takes, and the source label follows it.
    const label = () => page.evaluate((q) => document.querySelector(q)?.selectedOptions[0]?.textContent ?? '', selQ);
    const l0 = await label();
    const next = seeded === '#2266cc' ? '#cc6622' : '#2266cc';
    await field.fill(next);
    await field.press('Enter');
    await page.waitForFunction(([q, l]) => document.querySelector(q)?.selectedOptions[0]?.textContent !== l, [selQ, l0], { timeout: 5000 }).catch(() => {});
    const l1 = await label();
    ok(l1 !== l0 && l1.startsWith('Custom: ') && await field.inputValue() === next, `status seed: ${role}'s custom color is editable — typing ${next} moves the source to "${l1}" (was "${l0}")`);
    ok(errors.length === 0, `status seed (${role}): 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    await ctx.close();
  }
}

// =============================================================================================
// 13c. Removing a brand color asks first, in place (owner, 2026-10-01)
// =============================================================================================
// THE ORACLE for "nothing saved" and "exactly today's removal" is the brand the web host persists after
// every edit (`prism3:brandInput` in localStorage), read before and after. The expected removal is written
// out here for this brand, by hand, from what the removal has always done (S2's cascade, docs/24 #53): the
// color leaves `brandColors`, a status role that borrowed it goes back to Auto, and a gradient stop on it
// moves to primary. It never calls `removalEffects` or `cascadeRemove`.
console.log(`\nRemove a brand color — the confirm\n${'='.repeat(78)}`);
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  const stored = () => page.evaluate(() => localStorage.getItem('prism3:brandInput'));
  const accentRamp = () => page.evaluate(() => [...document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]')].some((n) => n.dataset.palette === 'accent'));
  // Make the removal cascade: success borrows accent (prism3's two gradients already have accent stops).
  await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
  await page.locator('[data-p3="status-success-source"]').selectOption('use:accent');
  await page.waitForFunction(() => document.querySelector('[data-p3="status-success-source"]')?.value === 'use:accent', null, { timeout: 5000 }).catch(() => {});
  const before = await stored();
  const b0 = JSON.parse(before ?? 'null')?.input;
  ok(b0?.roleColors?.success === 'accent' && b0.brandColors?.some((x) => x.name === 'accent'), `confirm: the setup persisted, with success borrowing accent (${JSON.stringify(b0?.roleColors)})`);
  const rmAccent = page.locator('[data-p3="brand-color-remove"][aria-label="Remove accent"]');
  const panel = () => page.evaluate(() => {
    const c = document.querySelectorAll('[data-p3="brand-color-confirm"]');
    const el = c[0];
    return { n: c.length, title: el?.querySelector('.p3-confirm-title')?.textContent ?? null, items: [...(el?.querySelectorAll('li') ?? [])].map((x) => x.textContent),
      named: el ? document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent ?? null : null, focus: document.activeElement?.getAttribute('data-p3') ?? null };
  });
  // Asks first: the click opens the confirm and removes nothing. If it does not ask, the checks after this one
  // have nothing to drive, so they are skipped and this one fails by name.
  await hooks.click(rmAccent);
  const p1 = await panel();
  confirmChecks: {
  const WANT_ITEMS = ['The success color goes back to Auto.', 'In the brand gradient, 1 stop switches to primary.', 'In the glow gradient, 1 stop switches to primary.'];
  ok(p1.n === 1 && p1.title === 'Remove accent?' && p1.named === 'Remove accent?' && p1.focus === 'brand-color-confirm-go',
    `confirm: Remove accent asks first, "Remove accent?" names it and focus is on its action, as S3's confirms do (${JSON.stringify(p1)})`);
  ok(JSON.stringify(p1.items) === JSON.stringify(WANT_ITEMS), `confirm: it names what else the removal changes — ${JSON.stringify(p1.items)}, want ${JSON.stringify(WANT_ITEMS)}`);
  ok(await accentRamp() && await stored() === before, 'confirm: while it asks, accent is still in the preview and nothing is saved');
  if (p1.n !== 1) break confirmChecks;
  // Cancel writes nothing, closes, and returns focus to the button.
  await hooks.click(page.locator('[data-p3="brand-color-confirm-cancel"]'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const p2 = await panel();
  ok(p2.n === 0 && p2.focus === 'brand-color-remove', `confirm: Cancel closes it and returns focus to the remove button (${JSON.stringify(p2)})`);
  const afterCancel = await stored();
  ok(afterCancel === before && await accentRamp(), `confirm: Cancel saves nothing — the stored brand is byte-identical and accent keeps its ramp${afterCancel === before ? '' : ` (now ${afterCancel?.slice(0, 120)}…)`}`);
  if (!await rmAccent.count()) break confirmChecks;
  // Escape is Cancel.
  await hooks.click(rmAccent);
  await hooks.need(page, '[data-p3="brand-color-confirm"]');
  await page.keyboard.press('Escape');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const p3 = await panel();
  ok(p3.n === 0 && p3.focus === 'brand-color-remove' && await stored() === before, `confirm: Escape closes it and saves nothing (${JSON.stringify(p3)})`);
  // Confirm is today's removal and cascade, exactly.
  const want = structuredClone(b0);
  want.brandColors = want.brandColors.filter((x) => x.name !== 'accent');
  delete want.roleColors.success;
  if (!Object.keys(want.roleColors).length) delete want.roleColors;
  for (const g of want.gradients ?? []) for (const st of g.stops) if (st.palette === 'accent') st.palette = 'primary';
  await hooks.click(rmAccent);
  await hooks.click(page.locator('[data-p3="brand-color-confirm-go"]'));
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-p3="preview-body"] [data-p3="palette"]')].some((n) => n.dataset.palette === 'accent'), null, { timeout: 5000 }).catch(() => {});
  const got = JSON.parse(await stored() ?? 'null')?.input;
  ok(!await accentRamp() && canon(got) === canon(want), `confirm: Remove removes accent with the same cascade as before — ${canon(got) === canon(want) ? 'the stored brand is the expected one' : wireDiff({ input: got }, { input: want })}`);
  }
  ok(errors.length === 0, `confirm: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 14. S2: the step picker (V9), on a test-only fixture page (it ships unmounted until S4's fill rows)
// =============================================================================================
console.log(`\nThe step picker — on its fixture\n${'='.repeat(78)}`);
{
  const esbuild = await import('esbuild');
  const { chromeCss } = await import('./chrome/esbuild-plugin.mjs');
  // THE ORACLE'S ARITHMETIC: the engine's own contrast function, bundled for Node from its source, applied
  // to the hex values the fixture hands the picker. The component's ratios are compared against it.
  const engineColor = await esbuild.build({ entryPoints: [join(REPO, 'packages/engine/color.ts')], bundle: true, platform: 'node', format: 'esm', write: false });
  const { contrast, hexToRgb } = await import(`data:text/javascript;base64,${Buffer.from(engineColor.outputFiles[0].text).toString('base64')}`);
  // The fixture: a page that mounts the shipped `src/ui/step-picker.ts` beside an opener and records what it
  // writes. Built here, served by this suite, never shipped.
  const FIXTURE = `
    import { stepPicker } from './ui/step-picker';
    import CSS from 'p3:chrome-css';
    import { brandTheme } from '@prism3/engine/theme';
    import { resolveAllModes } from '@prism3/engine/modes';
    import brands from '@prism3/engine/schema/example-brands.json';
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') || 'light';
    const t = brandTheme(brands.prism3);
    const light = resolveAllModes(t).find((x) => x.mode === 'light');
    const role = 'foreground.brand';
    const r = light.roles[role];
    const [pal, step] = r.path.split('.palette.')[1].split('.');
    const palettes = t.palettes.map((p) => ({ palette: p.palette, steps: p.steps.map((s) => ({ key: s.key, hex: s.hex })) }));
    // A role is measured against another role, or against a palette step ("neutral.050").
    const hexOfRef = (ref) => light.roles[ref]?.hex ?? t.palettes.find((x) => x.palette === ref.split('.')[0])?.steps.find((x) => x.key === ref.split('.')[1])?.hex;
    const against = { hex: hexOfRef(r.against), name: r.against, floor: r.min };
    window.__fixture = { role, palettes, against, current: { palette: pal, step } };
    window.__writes = [];
    const card = document.createElement('div'); card.className = 'p3-card';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'p3-btn p3-btn-page'; open.textContent = 'Pick a step';
    open.dataset.p3 = 'fixture-open';
    card.append(open); document.body.append(card);
    document.body.style.background = 'var(--p3-bg-page)';
    let picker = null;
    open.onclick = () => {
      picker?.el.remove();
      picker = stepPicker({ role, modeLabel: 'Light (base)', palettes, current: { palette: pal, step }, against, overridden: true,
        onPick: (p, s) => window.__writes.push(p + ' ' + s), onAuto: () => window.__writes.push('auto'),
        onClose: () => { picker?.el.remove(); picker = null; open.focus(); } });
      card.append(picker.el); picker.focusCurrent();
    };`;
  const built = await esbuild.build({ stdin: { contents: FIXTURE, resolveDir: join(HERE, 'src'), loader: 'ts' }, bundle: true, format: 'esm', write: false,
    loader: { '.css': 'text' }, define: { PRISM3_HOST: "'web'", PRISM3_BUILD: "'local'" }, plugins: [chromeCss()], logLevel: 'silent' });
  const fixtureJs = built.outputFiles[0].text;
  const fx = createServer((req, res) => {
    if (req.url.startsWith('/fixture.js')) { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(fixtureJs); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><meta charset="utf-8"><title>Step picker fixture</title></head><body><script type="module" src="/fixture.js"></script></body></html>');
  });
  await new Promise((r) => fx.listen(0, '127.0.0.1', r));
  const FX = `http://127.0.0.1:${fx.address().port}`;
  const readSteps = (page) => page.evaluate(() => [...document.querySelectorAll('[data-p3="step-picker-step"]')].map((b) => ({
    palette: b.dataset.palette, key: b.dataset.step, below: b.dataset.below === 'true', pressed: b.getAttribute('aria-pressed'),
    ratio: b.querySelector('.p3-step-ratio')?.textContent ?? '', mark: !!b.querySelector('.p3-step-ratio svg'), label: b.getAttribute('aria-label'), tab: b.tabIndex,
    chip: getComputedStyle(b.querySelector('.p3-step-chip')).backgroundColor })));
  const fmt = (r) => `${(Math.floor(r * 100) / 100).toFixed(2)}:1`;
  const rgbOf = (hx) => { const c = hexToRgb(hx); return `rgb(${c.r}, ${c.g}, ${c.b})`; };
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 760, height: 900 } });
    const page = await ctx.newPage();
    await hooks.watch(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${FX}/?theme=${theme}`, { waitUntil: 'load' });
    const where = `step picker ${theme}`;
    const F = await page.evaluate(() => window.__fixture);
    ok(F.against && F.against.floor > 0, `${where}: the fixture's role (${F.role}) has a floor to mark against (${JSON.stringify(F.against)})`);
    await hooks.click(page.locator('[data-p3="fixture-open"]'));
    await hooks.need(page, '[data-p3="step-picker"]');
    const shownPal = F.palettes.find((p) => p.palette === F.current.palette);
    const st = await readSteps(page);
    // The swatch grid: one step per palette step, in order, each its own color.
    ok(st.length === shownPal.steps.length && st.every((x, i) => x.key === shownPal.steps[i].key && x.chip === rgbOf(shownPal.steps[i].hex)),
      `${where}: the grid shows ${F.current.palette}'s ${shownPal.steps.length} steps, in order, each in its color (showed ${st.length})`);
    // Each ratio, against the engine's contrast of the same two hex values.
    const wrongRatio = st.filter((x, i) => x.ratio !== fmt(contrast(hexToRgb(shownPal.steps[i].hex), hexToRgb(F.against.hex))));
    ok(wrongRatio.length === 0, `${where}: every step's ratio is the engine's contrast against ${F.against.name}${wrongRatio.length ? ` — ${wrongRatio.slice(0, 3).map((x) => `${x.key} shows ${x.ratio}`).join(' | ')}` : ''}`);
    const wrongMark = st.filter((x, i) => x.below !== (contrast(hexToRgb(shownPal.steps[i].hex), hexToRgb(F.against.hex)) + 1e-9 < F.against.floor) || x.below !== x.mark || x.below !== /below floor/.test(x.label));
    ok(wrongMark.length === 0 && st.some((x) => x.below) && st.some((x) => !x.below), `${where}: a step below the ${F.against.floor}:1 floor, and only one, carries the below-floor mark, in its glyph and its name${wrongMark.length ? ` — ${wrongMark.slice(0, 3).map((x) => x.key).join(', ')}` : ''}`);
    const cur = st.filter((x) => x.pressed === 'true').map((x) => x.key);
    ok(JSON.stringify(cur) === JSON.stringify([F.current.step]), `${where}: the current step (${F.current.step}) is the one marked current (${cur.join(', ')})`);
    // The picker's own chrome: text, step edges, targets.
    const chrome = await page.evaluate(() => {
      const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); const p = m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : [0, 0, 0, 0]; return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const ground = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ?? { r: 255, g: 255, b: 255, a: 1 }; };
      const pk = document.querySelector('[data-p3="step-picker"]');
      const text = [...pk.querySelectorAll('*')].filter((e) => !e.closest('[data-content]') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .map((e) => ({ t: e.textContent.trim().slice(0, 20), r: Math.floor(ratio(over(parse(getComputedStyle(e).color), ground(e)), ground(e)) * 100) / 100 }));
      const edges = [...pk.querySelectorAll('.p3-step')].map((b) => Math.floor(ratio(parse(getComputedStyle(b).borderTopColor), ground(b.parentElement)) * 100) / 100);
      const small = [...pk.querySelectorAll('button, select')].map((b) => b.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length;
      return { text, edges, small };
    });
    const dim = chrome.text.filter((x) => x.r < TEXT_MIN);
    ok(chrome.text.length >= 10 && dim.length === 0, `${where}: the picker's ${chrome.text.length} text nodes clear ${TEXT_MIN}:1${dim.length ? ` — ${dim.slice(0, 3).map((x) => `"${x.t}" ${x.r}:1`).join(' | ')}` : ''}`);
    ok(chrome.edges.length > 0 && chrome.edges.every((r) => r >= NONTEXT_MIN), `${where}: every step's edge clears ${NONTEXT_MIN}:1 (lowest ${Math.min(...chrome.edges)}:1)`);
    ok(chrome.small === 0, `${where}: every picker control is at least ${TARGET_MIN} × ${TARGET_MIN} (${chrome.small} smaller)`);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `s2-step-picker-${theme}.png`) });
    // Keyboard: focus starts on the current step; arrows, Home and End move; Up and Down move a row.
    const focus = () => page.evaluate(() => document.activeElement?.dataset.step ?? document.activeElement?.getAttribute('data-p3'));
    const keys = shownPal.steps.map((x) => x.key);
    const i0 = keys.indexOf(F.current.step);
    ok(await focus() === F.current.step, `${where}: opening puts focus on the current step (${await focus()})`);
    await page.keyboard.press('ArrowRight');
    ok(await focus() === keys[i0 + 1], `${where}: ArrowRight moves to the next step (${await focus()}, want ${keys[i0 + 1]})`);
    await page.keyboard.press('Home');
    ok(await focus() === keys[0], `${where}: Home moves to the first step (${await focus()})`);
    const cols = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-p3="step-picker-step"]')]; return b.filter((x) => x.offsetTop === b[0].offsetTop).length; });
    await page.keyboard.press('ArrowDown');
    ok(await focus() === keys[Math.min(cols, keys.length - 1)], `${where}: ArrowDown moves one row (${cols} columns) down (${await focus()})`);
    await page.keyboard.press('End');
    ok(await focus() === keys[keys.length - 1], `${where}: End moves to the last step (${await focus()})`);
    // Focus ring on a step: 2px at 3:1 against the picker it sits on.
    const ring = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { w: parseFloat(cs.outlineWidth), style: cs.outlineStyle }; });
    ok(ring.style !== 'none' && ring.w >= FOCUS_WIDTH_MIN, `${where}: a focused step draws a ring at least ${FOCUS_WIDTH_MIN}px wide (${JSON.stringify(ring)})`);
    // What it writes: the step chosen, by click and by Enter, through the callback the fixture records.
    await page.evaluate(() => { window.__writes.length = 0; });
    const target = keys[Math.max(0, i0 - 2)];
    await hooks.click(page.locator(`[data-p3="step-picker-step"][data-step="${target}"]`));
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    let w = await page.evaluate(() => window.__writes.slice());
    ok(JSON.stringify(w) === JSON.stringify([`${F.current.palette} ${target}`, `${F.current.palette} ${keys[keys.length - 1]}`]),
      `step picker: choosing ${F.current.palette} ${target}, then ${keys[keys.length - 1]} by Enter, writes those steps — wrote ${JSON.stringify(w)} (${theme})`);
    // Another palette: the grid follows the select, and a choice writes that palette's step.
    await page.locator('[data-p3="step-picker-palette"]').selectOption('neutral');
    const ns = await readSteps(page);
    const nPal = F.palettes.find((p) => p.palette === 'neutral');
    ok(ns.length === nPal.steps.length && ns.every((x) => x.palette === 'neutral') && ns.every((x) => x.pressed === 'false'), `${where}: choosing the neutral palette shows its ${nPal.steps.length} steps, none current (${ns.length})`);
    await hooks.click(page.locator('[data-p3="step-picker-step"][data-step="300"]'));
    // Return to Auto.
    await hooks.click(page.locator('[data-p3="step-picker-auto"]'));
    w = await page.evaluate(() => window.__writes.slice(2));
    ok(JSON.stringify(w) === JSON.stringify(['neutral 300', 'auto']), `${where}: a neutral step writes "neutral 300", and Return to Auto writes "auto" — wrote ${JSON.stringify(w)}`);
    // Escape closes and returns focus to the opener; Close does the same.
    await page.locator('[data-p3="step-picker-step"]').first().focus();
    await page.keyboard.press('Escape');
    const e1 = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="step-picker"]'), focus: document.activeElement?.getAttribute('data-p3') }));
    ok(!e1.open && e1.focus === 'fixture-open', `${where}: Escape closes the picker and returns focus to what opened it (${JSON.stringify(e1)})`);
    await hooks.click(page.locator('[data-p3="fixture-open"]'));
    await hooks.click(page.locator('[data-p3="step-picker-close"]'));
    const e2 = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="step-picker"]'), focus: document.activeElement?.getAttribute('data-p3') }));
    ok(!e2.open && e2.focus === 'fixture-open', `${where}: Close closes the picker and returns focus to what opened it (${JSON.stringify(e2)})`);
    ok(errors.length === 0, `${where}: 0 page errors${errors.length ? ` — ${errors[0]}` : ''}`);
    await ctx.close();
  }
  fx.close();
}

// =============================================================================================
// 15. THE Q4 TRIAL (QA note Q4, for the owner's decision): an EDIT reveals the palette it changes; focus,
//     scrolling and the mode never move the preview (V1 still holds for them)
// =============================================================================================
console.log(`\nQ4 trial — an edit reveals its palette\n${'='.repeat(78)}`);
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  const state = (palette) => page.evaluate((p) => {
    const body = document.querySelector('[data-p3="preview-body"]');
    const el = [...body.querySelectorAll('[data-p3="palette"]')].find((n) => n.dataset.palette === p);
    const b = body.getBoundingClientRect(), r = el?.getBoundingClientRect();
    return { top: Math.round(body.scrollTop), inView: !!r && r.top >= b.top - 1 && r.top < b.bottom - 40, view: body.dataset.view };
  }, palette);
  const toBottom = () => page.evaluate(() => { const b = document.querySelector('[data-p3="preview-body"]'); b.scrollTop = b.scrollHeight; return Math.round(b.scrollTop); });
  // Focus does not move it.
  const bottom = await toBottom();
  ok(bottom > 0 && !(await state('neutral')).inView, `Q4: the preview scrolls (to ${bottom}px), with the neutral ramp out of view, so the checks below can move`);
  await page.locator('[data-p3="neutral-chroma-slider"]').focus();
  await page.locator('[data-p3="primary-hex"]').focus();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const f = await state('primary');
  ok(f.top === bottom, `Q4: focusing a lever does not move the preview (scrollTop ${f.top}, was ${bottom})`);
  // Scrolling the levers pane does not move it.
  await page.evaluate(() => { const l = document.querySelector('[data-p3="levers-pane"]'); l.scrollTop = l.scrollHeight; });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  ok((await state('primary')).top === bottom, `Q4: scrolling the levers does not move the preview (scrollTop ${(await state('primary')).top}, was ${bottom})`);
  // An edit does, and smoothly (owner, 2026-10-01). A recorder on the preview body's `scrollTo` notes the
  // behavior each reveal asks for, and `frames()` samples the body's scrollTop on every animation frame until
  // it has held still for ten frames: a smooth reveal passes through positions between start and end.
  await page.evaluate(() => {
    window.__reveals = [];
    const o = Element.prototype.scrollTo;
    Element.prototype.scrollTo = function (...a) {
      if (this.matches('[data-p3="preview-body"]')) window.__reveals.push(a[0] && typeof a[0] === 'object' ? a[0].behavior ?? 'auto' : 'auto');
      return o.apply(this, a);
    };
  });
  const reveals = () => page.evaluate(() => window.__reveals.splice(0));
  const frames = () => page.evaluate(() => new Promise((res) => {
    const b = document.querySelector('[data-p3="preview-body"]');
    const tops = [Math.round(b.scrollTop)];
    let still = 0;
    const tick = () => {
      const t = Math.round(b.scrollTop);
      still = t === tops[tops.length - 1] ? still + 1 : 0;
      tops.push(t);
      if (still >= 10 || tops.length > 300) res(tops); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  const between = (tops, from) => new Set(tops.filter((t) => t !== from && t !== tops[tops.length - 1])).size;
  // The neutral chroma, by keyboard on its slider, reveals the neutral ramp.
  await page.locator('[data-p3="neutral-chroma-slider"]').focus();
  await reveals();
  await page.keyboard.press('ArrowRight');
  const t1 = await frames();
  const e1 = await state('neutral');
  ok(e1.inView && e1.top < bottom, `Q4: editing the neutral chroma scrolls the preview to the neutral ramp (in view ${e1.inView}, scrollTop ${e1.top}, was ${bottom})`);
  const r1 = await reveals();
  ok(r1.length >= 1 && r1.every((x) => x === 'smooth'), `Q4: without reduced motion the reveal asks for a smooth scroll — asked ${JSON.stringify(r1)}`);
  ok(between(t1, bottom) >= 2, `Q4: without reduced motion the preview passes through positions on its way (${between(t1, bottom)} in-between positions over ${t1.length} frames, ${t1[0]} → ${t1[t1.length - 1]})`);
  // And the primary hex, from the bottom again, reveals the primary ramp.
  await toBottom();
  await page.locator('[data-p3="primary-hex"]').fill('#2244aa');
  await page.locator('[data-p3="primary-hex"]').press('Enter');
  await frames();
  const e2 = await state('primary');
  ok(e2.inView, `Q4: editing the primary color scrolls the preview to the primary ramp (in view ${e2.inView}, scrollTop ${e2.top})`);
  ok(e2.view === 'palettes', `Q4: an edit never changes the preview's home (V1) — ${e2.view}`);
  // Under reduced motion the reveal jumps: the ramp is in view as soon as the edit returns, with no frames
  // in between.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const bottom2 = await toBottom();
  await reveals();
  await page.locator('[data-p3="neutral-chroma-slider"]').focus();
  await page.keyboard.press('ArrowRight');
  const e3 = await state('neutral');
  const t3 = await frames();
  const r3 = await reveals();
  ok(e3.inView && e3.top < bottom2, `Q4: under reduced motion the neutral ramp is in view right after the edit (in view ${e3.inView}, scrollTop ${e3.top}, was ${bottom2})`);
  ok(r3.length >= 1 && r3.every((x) => x === 'instant'), `Q4: under reduced motion the reveal asks for an instant scroll — asked ${JSON.stringify(r3)}`);
  ok(between(t3, e3.top) === 0 && t3[t3.length - 1] === e3.top, `Q4: under reduced motion the preview does not move after the jump (${JSON.stringify([...new Set(t3)])})`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // The mode does not move it.
  const before = await toBottom();
  await hooks.click(page.locator('[data-p3="mode-option"][data-mode="dark"]'));
  ok((await state('primary')).top === before, `Q4: changing the mode does not move the preview (scrollTop ${(await state('primary')).top}, was ${before})`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 's2-q4-after-edit.png') });
  ok(errors.length === 0, `Q4: 0 console errors${errors.length ? ` — ${errors[0]}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 16. S3: Brand — its levers represented, Identity side by side, the namespace warning, Personality, the
//     modes (Q3), and the Style guide lent into the preview
// =============================================================================================
console.log(`\nBrand — the levers, the namespace, the modes (S3)\n${'='.repeat(78)}`);
/** The schema inputs v6 homes on Brand, with the hook each lever block must render once. Literal: the
 *  decision (IA-1: Brand holds identity, personality and modes), never read from `pages.ts`. None is a
 *  manifest lever, so the hook rule is `leverHook`'s, applied here by hand. */
const BRAND_LEVERS = [['id', '[data-p3="lever-id"]'], ['root', '[data-p3="lever-root"]'], ['personality', '[data-p3="lever-personality"]'],
  ['modes', '[data-p3="lever-modes"]'], ['customModes', '[data-p3="lever-custom-modes"]']];
/** The engine's personality words, in its order (`TRAITS`, `packages/engine/vocabulary.ts`), typed here. */
const PERSONALITY = ['energetic', 'calm', 'premium', 'restrained', 'bold', 'generous', 'dense', 'soft', 'sharp'];
/** What one word fills, by manifest key: `soft` sets radiusScale and shadow.softness to "soft" (vocabulary.ts). */
const SOFT_SETS = [['radiusScale', 'soft'], ['shadow.softness', 'soft']];
/** T2 (v4 review) in concept v6's words: the namespace warning for each reserved or placeholder value. */
const NS_WARN = { pds3: 'pds3 is the default theme’s placeholder. Set your brand’s namespace before you export.',
  prism: 'prism is reserved for the shipped catalog. Set your brand’s namespace before you export.' };
/** Q3 (v4 review 3, v5): the confirm's sentence for the default theme, 221 gated pairs per mode (Health's literal). */
const DARK_OFF_TITLE = 'Turn off Dark and high contrast dark';
/** The Dark-off confirm's line when a custom mode is based on dark (orchestrator review of #1939), the reviewer's
 *  decision in the words chosen for it, typed here. */
const BASED_ON_DARK = 'Custom mode custom-1 is based on Dark, so turning Dark off is refused until it is based on Light or removed.';
const DARK_OFF_LINE = 'High contrast dark follows dark, so it turns off too. The two modes’ 442 pairs leave the verdict (884 becomes 442).';
const persisted = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput'))?.input ?? null; } catch { return null; } });
const modeRadios = (page) => page.evaluate(() => [...document.querySelectorAll('[data-p3="mode-control"] [data-p3="mode-option"]')].map((b) => b.dataset.mode));
const checkState = (page, sel) => page.evaluate((x) => { const b = document.querySelector(x); return b ? { checked: b.getAttribute('aria-checked'), locked: b.getAttribute('aria-disabled') === 'true', note: b.querySelector('.p3-check-note')?.textContent } : null; }, sel);

/** The engine's own vocabulary, bundled for Node from its source (as section 14 bundles `color.ts`): each chip's
 *  visible word must be the word the engine knows, the one it writes (orchestrator review of #1939). */
const VOCAB = await (async () => {
  const esbuild = await import('esbuild');
  const out = await esbuild.build({ entryPoints: [join(REPO, 'packages/engine/vocabulary.ts')], bundle: true, platform: 'node', format: 'esm', write: false });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
})();
const ENGINE_WORDS = Object.keys(VOCAB.TRAITS ?? {});
ok(ENGINE_WORDS.length === PERSONALITY.length, `the engine's vocabulary carries ${ENGINE_WORDS.length} personality words (the decision lists ${PERSONALITY.length})`);
// Represented, and side by side (v5 answer 4) at every width, on both hosts.
for (const host of ['web', 'figma']) {
  for (const { w, h } of WIDTHS) {
    const { ctx, page } = await open({ host, theme: 'light', w, h });
    await goPlace(page, 'brand');
    const where = `${host} ${w}`;
    const counts = await page.evaluate((hs) => Object.fromEntries(hs.map((hk) => [hk, document.querySelectorAll(`[data-p3="levers-pane"] ${hk}`).length])), BRAND_LEVERS.map(([, hk]) => hk));
    for (const [key, hk] of BRAND_LEVERS) ok(counts[hk] === 1, `${where}: Brand lever ${key} renders its hook ${hooks.role(hk)} once — rendered ${counts[hk]}`);
    const strays = await page.evaluate((hs) => [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')].map((n) => n.getAttribute('data-p3')).filter((r) => !hs.includes(`[data-p3="${r}"]`)), BRAND_LEVERS.map(([, hk]) => hk));
    ok(strays.length === 0, `${where}: every lever block on Brand is one of its ${BRAND_LEVERS.length} inputs${strays.length ? ` — unclassified lever ${strays.join(', ')}` : ''}`);
    const words = await page.locator('[data-p3="personality-word"]').evaluateAll((ns) => ns.map((n) => n.dataset.word));
    ok(JSON.stringify(words) === JSON.stringify(PERSONALITY), `${where}: Personality offers the engine's ${PERSONALITY.length} words in its order — offers ${JSON.stringify(words)}`);
    // What each chip SAYS, against what the engine calls the word it writes: a chip labeled one word and
    // writing another passes the `data-word` check above.
    const chipText = await page.locator('[data-p3="personality-word"]').evaluateAll((ns) => ns.map((n) => [n.dataset.word, n.textContent.trim()]));
    chipText.forEach(([w, t], i) => ok(t === ENGINE_WORDS[i] && w === ENGINE_WORDS[i], `${where}: personality chip ${i} reads "${t}" and writes "${w}"; the engine's word is "${ENGINE_WORDS[i]}"`));
    ok(chipText.length === ENGINE_WORDS.length, `${where}: one chip per engine word (${chipText.length} of ${ENGINE_WORDS.length})`);
    const id = await page.evaluate(() => {
      const r = (sel) => { const n = document.querySelector(sel); if (!n) return null; const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
      return { name: r('[data-p3="brand-name"]'), ns: r('[data-p3="brand-namespace"]') };
    });
    ok(!!id.name && !!id.ns && Math.abs(id.name.b - id.ns.b) < 1 && id.name.r <= id.ns.l && id.name.w >= 80 && id.ns.w >= 80,
      `v5 answer 4 ${where}: Brand name and Token namespace sit side by side, on one line (${JSON.stringify(id)})`);
    await ctx.close();
  }
}

{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  // One case, run to its end or stopped by name (as section 10's are): a step that throws, such as a field a
  // mutation removed, fails here and the run goes on to its report.
  try {
  await goPlace(page, 'brand');
  const view0 = await previewView(page);
  const nsNote = () => page.evaluate(() => ({
    warn: document.querySelector('[data-p3="namespace-warning"]')?.textContent ?? null,
    path: document.querySelector('[data-p3="namespace-path"]')?.textContent ?? null,
    rename: !!document.querySelector('[data-p3="namespace-rename"]'),
    field: document.querySelector('[data-p3="brand-namespace"]')?.value,
    described: document.querySelector('[data-p3="brand-namespace"]')?.getAttribute('aria-describedby'),
  }));
  // T2: the default theme boots on its placeholder namespace, and the field says so before any export.
  const n0 = await nsNote();
  ok(n0.field === 'pds3' && n0.warn === NS_WARN.pds3, `T2: the default theme's namespace field reads pds3 and warns "${NS_WARN.pds3}" (${JSON.stringify(n0)})`);
  ok(n0.described === 'p3-namespace-note' && !n0.rename, `T2: the namespace field is described by its note, and offers no rename while unchanged (${JSON.stringify(n0)})`);
  const field = page.locator('[data-p3="brand-namespace"]');
  await page.evaluate(() => { document.querySelector('[data-p3="brand-namespace"]').dataset.cid = 'same'; });
  await field.fill('prism');
  const n1 = await nsNote();
  ok(n1.warn === NS_WARN.prism && n1.rename, `T2: a draft of "prism" warns "${NS_WARN.prism}" and offers the rename (${JSON.stringify(n1)})`);
  await field.fill('acme');
  const n2 = await nsNote();
  ok(n2.warn === null && n2.path === 'Token paths start with acme, for example acme.color.text.primary.' && n2.rename, `T2: a draft of "acme" warns nothing and names the paths it makes (${JSON.stringify(n2)})`);
  ok(await page.evaluate(() => document.querySelector('[data-p3="brand-namespace"]').dataset.cid === 'same'), 'namespace: the field is the same element after typing (never rebuilt)');
  ok((await persisted(page))?.root === 'pds3', `namespace: a draft reaches nothing until it is renamed (persisted root "${(await persisted(page))?.root}")`);
  // The rename asks once more, in place, and only its confirm renames.
  await hooks.click(page.locator('[data-p3="namespace-rename"]'));
  await hooks.need(page, '[data-p3="namespace-confirm"]');
  const conf = await page.evaluate(() => ({ title: document.querySelector('[data-p3="namespace-confirm"] .p3-confirm-title')?.textContent, role: document.querySelector('[data-p3="namespace-confirm"]')?.getAttribute('role'), focus: document.activeElement?.getAttribute('data-p3') }));
  ok(conf.title === 'Rename namespace to acme' && conf.role === 'dialog' && conf.focus === 'namespace-confirm-go', `namespace: Rename asks first, its action focused (${JSON.stringify(conf)})`);
  const mc = await measure(page, 'web light 1280 / brand, rename confirm open', 'web', 1280);
  check(mc, 'web light 1280 / brand, rename confirm open', 'web wide', PLACE_FLOOR, { extra: ['[data-p3="namespace-confirm-go"]', '[data-p3="namespace-confirm-cancel"]'] });
  await page.keyboard.press('Escape');
  const esc = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="namespace-confirm"]'), focus: document.activeElement?.getAttribute('data-p3') }));
  ok(!esc.open && esc.focus === 'brand-namespace', `namespace: Escape closes the confirm and returns to the field (${JSON.stringify(esc)})`);
  await hooks.click(page.locator('[data-p3="namespace-rename"]'));
  await hooks.click(page.locator('[data-p3="namespace-confirm-go"]'));
  await page.waitForFunction(() => !document.querySelector('[data-p3="namespace-rename"]'));
  const n3 = await nsNote();
  ok((await persisted(page))?.root === 'acme' && n3.field === 'acme' && n3.path?.startsWith('Token paths start with acme'), `namespace: confirming renames the brand's namespace (persisted "${(await persisted(page))?.root}", ${JSON.stringify(n3)})`);
  // The name: per keystroke, to the bar's brand switcher, the field never rebuilt.
  const nm = page.locator('[data-p3="brand-name"]');
  await page.evaluate(() => { document.querySelector('[data-p3="brand-name"]').dataset.cid = 'same'; });
  await nm.fill('acme-brand');
  const nmState = await page.evaluate(() => ({ bar: document.querySelector('[data-p3="brand-switcher"] .p3-brand-name')?.textContent, same: document.querySelector('[data-p3="brand-name"]').dataset.cid === 'same', focus: document.activeElement?.getAttribute('data-p3') }));
  ok(nmState.bar === 'acme-brand' && nmState.same && nmState.focus === 'brand-name', `name: typing a name reaches the bar's brand switcher, the field kept and focused (${JSON.stringify(nmState)})`);
  ok((await persisted(page))?.id === 'acme-brand', `name: the name reaches the persisted brand without a rebuild (#1196) — "${(await persisted(page))?.id}"`);

  // Personality: a word turns on, says what it fills, and reaches the brand.
  const soft = page.locator('[data-p3="personality-word"][data-word="soft"]');
  await hooks.click(soft);
  const want = `soft: ${SOFT_SETS.map(([k, v]) => `${labelOf(k)} → ${v}`).join(', ')}.`;
  const ps = await page.evaluate(() => ({ pressed: document.querySelector('[data-p3="personality-word"][data-word="soft"]')?.getAttribute('aria-pressed'), sub: document.querySelector('[data-p3="lever-personality"] .p3-sub')?.textContent }));
  ok(ps.pressed === 'true' && ps.sub === want, `personality: choosing soft presses it and says "${want}" (${JSON.stringify(ps)})`);
  ok(JSON.stringify((await persisted(page))?.personality) === '["soft"]', `personality: soft reaches the brand (${JSON.stringify((await persisted(page))?.personality)})`);
  await hooks.click(soft);
  ok((await persisted(page))?.personality === undefined, `personality: unpressing the last word clears it (${JSON.stringify((await persisted(page))?.personality)})`);

  // Q3: dark off takes high contrast dark with it, after a confirm that says what goes and what the verdict becomes.
  ok(JSON.stringify(await modeRadios(page)) === '["light","dark","hc-light","hc-dark"]', `Q3: the default theme previews four modes (${await modeRadios(page)})`);
  await hooks.click(page.locator('[data-p3="mode-on-dark"]'));
  await hooks.need(page, '[data-p3="mode-off-confirm"]');
  const dc = await page.evaluate(() => ({ title: document.querySelector('[data-p3="mode-off-confirm"] .p3-confirm-title')?.textContent, lines: [...document.querySelectorAll('[data-p3="mode-off-confirm"] .p3-confirm-line')].map((n) => n.textContent), focus: document.activeElement?.getAttribute('data-p3'), go: document.querySelector('[data-p3="mode-off-confirm-go"]')?.textContent }));
  ok(dc.title === DARK_OFF_TITLE && dc.lines[0] === DARK_OFF_LINE && dc.go === 'Turn off both modes' && dc.focus === 'mode-off-confirm-go',
    `Q3: turning dark off first says it takes high contrast dark and what the verdict becomes (${JSON.stringify(dc)})`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 's3-studio-light-1280-dark-off-confirm.png') });
  await hooks.click(page.locator('[data-p3="mode-off-confirm-cancel"]'));
  const kept = await checkState(page, '[data-p3="mode-on-dark"]');
  ok(kept?.checked === 'true' && await page.evaluate(() => document.activeElement?.getAttribute('data-p3')) === 'mode-on-dark', `Q3: Cancel keeps dark on and returns focus to it (${JSON.stringify(kept)})`);
  await hooks.click(page.locator('[data-p3="mode-on-dark"]'));
  await hooks.click(page.locator('[data-p3="mode-off-confirm-go"]'));
  await page.waitForFunction(() => document.querySelectorAll('[data-p3="mode-control"] [data-p3="mode-option"]').length === 2);
  const hcd = await checkState(page, '[data-p3="mode-on-hc-dark"]');
  const verdictNow = await page.evaluate(() => document.querySelector('[data-p3="verdict"]')?.textContent);
  ok(JSON.stringify(await modeRadios(page)) === '["light","hc-light"]' && verdictNow === 'All 442 pairs at or above floor', `Q3: confirming turns off dark and high contrast dark (modes ${await modeRadios(page)}, verdict "${verdictNow}")`);
  ok(hcd?.checked === 'false' && hcd.locked && hcd.note === 'Off while dark is off: it follows dark.', `Q3: high contrast dark stays off and locked while dark is off, and says why (${JSON.stringify(hcd)})`);
  // A locked check keeps its focus stop (aria-disabled), so it is activated the way a keyboard user would:
  // Playwright refuses a click on an aria-disabled element, which is itself the pointer half of the claim.
  await page.locator('[data-p3="mode-on-hc-dark"]').focus();
  await page.keyboard.press('Space');
  ok(JSON.stringify(await modeRadios(page)) === '["light","hc-light"]', `Q3: the locked high contrast dark cannot be turned on (${await modeRadios(page)})`);
  await hooks.click(page.locator('[data-p3="mode-on-dark"]'));
  await page.waitForFunction(() => document.querySelectorAll('[data-p3="mode-control"] [data-p3="mode-option"]').length === 3);
  const back = await checkState(page, '[data-p3="mode-on-hc-dark"]');
  ok(JSON.stringify(await modeRadios(page)) === '["light","dark","hc-light"]' && back?.checked === 'false' && !back.locked, `Q3: dark on again unlocks high contrast dark and leaves it off (${await modeRadios(page)}, ${JSON.stringify(back)})`);
  // A mode with nothing to drop turns off at once: wireframe on, then off.
  await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
  await page.waitForFunction(() => !!document.querySelector('[data-p3="mode-option"][data-mode="wireframe"]'));
  await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
  const wf = await page.evaluate(() => ({ confirm: !!document.querySelector('[data-p3="mode-off-confirm"]'), radio: !!document.querySelector('[data-p3="mode-option"][data-mode="wireframe"]') }));
  ok(!wf.confirm && !wf.radio, `modes: wireframe turns on, and off again with no confirm (it drops nothing) (${JSON.stringify(wf)})`);
  // A custom mode: added, named, previewable, removed.
  await hooks.click(page.locator('[data-p3="custom-mode-add"]'));
  await page.waitForFunction(() => !!document.querySelector('[data-p3="mode-option"][data-mode="custom-1"]'));
  const cm = await page.evaluate(() => ({ name: document.querySelector('[data-p3="custom-mode-name"]')?.value, focus: document.activeElement?.getAttribute('data-p3') }));
  ok(cm.name === 'custom-1' && cm.focus === 'custom-mode-name', `custom modes: Add custom mode adds custom-1, previewable, its name focused (${JSON.stringify(cm)})`);
  // A custom mode based on Dark makes the engine refuse Dark off (orchestrator review of #1939): the confirm says
  // so first, and confirming anyway is refused whole, the brand and the saved brand exactly as they were.
  await page.locator('[data-p3="custom-mode-base"]').selectOption('dark');
  await page.waitForFunction(() => document.querySelector('[data-p3="custom-mode-base"]')?.value === 'dark');
  const savedBefore = JSON.stringify(await persisted(page));
  await hooks.click(page.locator('[data-p3="mode-on-dark"]'));
  await hooks.need(page, '[data-p3="mode-off-confirm"]');
  const based = await page.evaluate(() => document.querySelector('[data-p3="mode-off-based"]')?.textContent ?? null);
  ok(based === BASED_ON_DARK, `Q3: the Dark-off confirm names the custom mode based on dark — says ${JSON.stringify(based)}`);
  await hooks.click(page.locator('[data-p3="mode-off-confirm-go"]'));
  const refusedNow = await page.evaluate(() => ({ refused: document.querySelector('[data-p3="lever-modes"]')?.dataset.refused ?? null, dark: document.querySelector('[data-p3="mode-on-dark"]')?.getAttribute('aria-checked') }));
  ok(refusedNow.refused === 'true' && refusedNow.dark === 'true' && JSON.stringify(await modeRadios(page)) === '["light","dark","hc-light","custom-1"]',
    `Q3: a refused Dark off marks Modes refused and leaves dark on (${JSON.stringify(refusedNow)}, modes ${await modeRadios(page)})`);
  ok(JSON.stringify(await persisted(page)) === savedBefore, 'Q3: a refused Dark off leaves the saved brand exactly as it was');
  await hooks.click(page.locator('[data-p3="custom-mode-remove"]'));
  await page.waitForFunction(() => !document.querySelector('[data-p3="mode-option"][data-mode="custom-1"]'));
  ok(true, 'custom modes: removing custom-1 takes it out of the preview\'s modes');

  // The Style guide is lent, and its own control redraws it in place, inside the preview (never a legacy tier).
  const sg = () => page.evaluate(() => ({ ground: document.querySelector('[data-p3="brand-style-guide"] [data-p3="style-guide-ground"]')?.value ?? null, roots: document.querySelectorAll('[data-p3="preview-body"] [data-p3="brand-style-guide"] [data-p3="specimen"]').length }));
  const sg0 = await sg();
  await page.locator('[data-p3="brand-style-guide"] [data-p3="style-guide-ground"]').selectOption('inverse.background.primary');
  const sg1 = await sg();
  ok(sg0.ground === 'background.primary' && sg1.ground === 'inverse.background.primary' && sg1.roots === STYLE_GUIDE_ROOTS.length, `Style guide: its ground select redraws it inside Brand's preview (${JSON.stringify(sg0)} → ${JSON.stringify(sg1)})`);
  const view1 = await previewView(page);
  ok(view1.view === view0.view && view1.view === 'guide', `V1 edit: Brand's edits never move the preview's home (${view1.view}, was ${view0.view})`);
  // Continue opens Color › Palettes.
  await hooks.click(page.locator('[data-p3="brand-continue"]'));
  await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'color-palettes');
  ok(true, 'Brand: Continue to Color › Palettes opens Color › Palettes');
  ok(errors.length === 0, `Brand: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S3 Brand: the case stopped at a step that threw, and the rest of it was skipped — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
}

// =============================================================================================
// 17. S3 review: the mode control never clips an option, with 5 and 6 modes (a custom mode or two)
// =============================================================================================
console.log(`\nThe mode control with 5 and 6 modes (S3 review)\n${'='.repeat(78)}`);
/** What a user can choose in the preview header: each radio drawn wholly inside the control's visible box, or,
 *  when the select is shown instead, its options. A radio cut off by the control's edge counts as not choosable. */
const choosable = (page) => page.evaluate(() => {
  const group = document.querySelector('[data-p3="mode-control"]');
  const sel = document.querySelector('[data-p3="mode-select"]');
  const shown = (n) => !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
  const g = group?.getBoundingClientRect();
  const radios = shown(group) ? [...group.querySelectorAll('[data-p3="mode-option"]')] : [];
  const whole = radios.filter((r) => { const b = r.getBoundingClientRect(); return b.left >= g.left - 0.5 && b.right <= g.right + 0.5; });
  return { radios: radios.length, clipped: radios.filter((r) => !whole.includes(r)).map((r) => r.dataset.mode),
    modes: shown(sel) ? [...sel.options].map((o) => o.value) : whole.map((r) => r.dataset.mode), select: shown(sel), selected: shown(sel) ? sel.value : null };
});
for (const { w, h } of WIDTHS) {
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w, h });
  try {
    await goPlace(page, 'brand');
    const want = ['light', 'dark', 'hc-light', 'hc-dark'];
    // The default theme's four modes first: none clipped at any width (at 640 they did not fit, and the old
    // scroll hid one; the select shows them all).
    if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
    const c4 = await choosable(page);
    ok(c4.clipped.length === 0 && JSON.stringify(c4.modes) === JSON.stringify(want), `web light ${w} / brand, 4 modes: every mode is choosable in the preview header, none clipped — ${JSON.stringify(c4)}`);
    if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-settings"]'));
    for (const n of [1, 2]) {
      await hooks.click(page.locator('[data-p3="custom-mode-add"]'));
      want.push(`custom-${n}`);
      await page.waitForFunction((k) => document.querySelectorAll('[data-p3="mode-control"] [data-p3="mode-option"]').length === k, want.length);
      if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const c = await choosable(page);
      const where = `web light ${w} / brand, ${want.length} modes`;
      ok(c.clipped.length === 0 && JSON.stringify(c.modes) === JSON.stringify(want), `${where}: every mode is choosable in the preview header, none clipped — ${JSON.stringify(c)}`);
      if (c.select) {
        await page.locator('[data-p3="mode-select"]').selectOption(`custom-${n}`);
        const now = await choosable(page);
        ok(now.selected === `custom-${n}`, `${where}: choosing custom-${n} in the select previews it (${now.selected})`);
      }
      const m = await measure(page, where, 'web', w);
      check(m, where, columnOf('web', w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: w <= 560 ? 'preview' : 'page', only: [] });
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s3-studio-light-${w}-brand-${want.length}-modes.png`) });
      if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-settings"]'));
    }
    ok(errors.length === 0, `mode control ${w}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S3 mode control ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 18. S4a: Color › Surfaces & fills — specimens on the page color, levers represented, the step picker
//     mounted, edits and the gradient stops, and the chrome on both hosts, both themes, at every width
// =============================================================================================
console.log(`\nColor › Surfaces & fills (S4a)\n${'='.repeat(78)}`);
/** EXPECTED, by name (represented, not counted; docs/34): the specimen roots the default theme's Surfaces &
 *  fills preview draws, each a section of the Style guide on the brand's page color, plus its gradients (the
 *  default theme ships two). Literal: the owner's decision Q5 names the five sections. */
const EXPECT_FILLS_SPECIMENS = ['Background', 'Foreground', 'Text color', 'Border', 'Focus ring', 'Icon', 'Gradients'];
/** The manifest keys v6 homes on Surfaces & fills, with their hooks. R2: every lever on this page is shown. */
const FILLS_LEVERS = [['surfaces', '[data-p3="lever-surfaces"]'], ['gradients', '[data-p3="lever-gradients"]']];
/** The override rows, by role: concept v6's five bold fills, then what the legacy page carried (the surface
 *  tiers and the text inks). Literal; each must render its row once. No link row (S4c, owner decision Q28:
 *  links are edited on Interactive only), so a `text.link.default` row fails below as an unlisted row. */
const SEM_FILL = ['brand', 'success', 'warning', 'info', 'danger'];
const SEM_INK = ['brand', 'success', 'warning', 'danger', 'info'];
const TIERS3 = ['primary', 'secondary', 'tertiary'];
/** S4d (owner decision Q44): the neutral ladder, page and inverse, in its own Foreground section. */
const FOREGROUND_ROW_ROLES = [...TIERS3.map((t) => `foreground.${t}`), ...TIERS3.map((t) => `inverse.foreground.${t}`)];
/** S4d (Q49): the bold fills, then their subtle tints and the on-color inks, then the inverse band's fills. */
const FILL_ROW_ROLES = [...SEM_FILL.map((s) => `foreground.${s}`), ...SEM_FILL.map((s) => `foreground.${s}-subtle`), ...SEM_FILL.map((s) => `text.on-${s}`),
  ...SEM_FILL.map((s) => `inverse.foreground.${s}`), ...SEM_FILL.map((s) => `inverse.foreground.${s}-subtle`)];
const inks = (p) => [...TIERS3.map((t) => `${p}.${t}`), ...SEM_INK.map((s) => `${p}.${s}`), ...SEM_INK.map((s) => `${p}.${s}-subtle`)];
const TEXT_ROW_ROLES = [...inks('text'), ...inks('inverse.text')];
/** S4d (Q49): the borders, page and inverse; the focus rings are read-only rows (#1966), below. */
const BORDER_ROW_ROLES = [...[...TIERS3, ...SEM_FILL].map((s) => `border.${s}`), ...[...TIERS3, ...SEM_FILL].map((s) => `inverse.border.${s}`)];
/** S4d (Q50): every icon role, page and inverse, each with the text twin it follows while paired. */
const ICON_ROW_ROLES = [...inks('icon'), ...SEM_INK.map((s) => `icon.on-${s}`), ...inks('inverse.icon')];
/** The Fields rows (S4c, owner decision Q29): one per field role the default theme EMITS, page and inverse,
 *  read from the committed emission rather than from the page, so a role the engine adds needs a row too. The
 *  count is held to the eight Q29 names, so an empty read fails. */
/** The read-only rows: the scrim (S4c, the owner's decision of 2026-10-02), a wash with no step to pick. */
const READONLY_ROW_ROLES = ['scrim.default', 'border.focus', 'inverse.border.focus'];
const FIELD_ROW_ROLES = (() => {
  const out = [];
  const walk = (n, path) => { if (!n || typeof n !== 'object') return; if ('$value' in n) { out.push(path.join('.')); return; } for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v, [...path, k]); };
  walk(OUT[OUT_ROOT]?.color?.field, ['field']);
  walk(OUT[OUT_ROOT]?.color?.inverse?.field, ['inverse', 'field']);
  return out;
})();
ok(FIELD_ROW_ROLES.length === 8 && FIELD_ROW_ROLES.includes('field.fill') && FIELD_ROW_ROLES.includes('inverse.field.placeholder'),
  `the emission names the eight field roles the Fields section must carry (read ${FIELD_ROW_ROLES.join(', ')})`);
/** The emission's own palette steps, the oracle for a pick (an override repoints a role to a step, so the
 *  step's hex is what the role must paint). */
const PALETTE = OUT[OUT_ROOT].core.palette;
const palHex = (p, st) => String(PALETTE?.[p]?.[st]?.$value ?? '').toLowerCase();
const rgbOf = (hx) => `rgb(${parseInt(hx.slice(1, 3), 16)}, ${parseInt(hx.slice(3, 5), 16)}, ${parseInt(hx.slice(5, 7), 16)})`;
const fillsGrounds = (page) => page.evaluate(() => {
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ?? { r: 255, g: 255, b: 255, a: 1 }; };
  const hex = (c) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  const host = document.querySelector('[data-p3="preview-body"] [data-p3="surfaces-style-guide"]');
  const grounds = [...(host?.querySelectorAll('.sg-ground') ?? [])];
  return { card: host ? hex(groundOf(host)) : null, roots: grounds.map((g) => ({ name: g.closest('.psec')?.querySelector('.psec-t')?.textContent ?? '?', root: g.getAttribute('data-p3') === 'specimen', ground: hex(groundOf(g)) })),
    sections: [...(host?.querySelectorAll('.psec') ?? [])].map((x) => ({ name: x.querySelector('.psec-t')?.textContent ?? '?', bg: hex(groundOf(x)) })),
    levers: hex(groundOf(document.querySelector('[data-p3="levers-pane"]'))) };
});
/** Q24 (S4c): each section container in the preview takes the levers panel's gray. EXPECTED from the TOKEN, not
 *  from the page or `chrome/spec.mjs`: IA-2 puts the levers panel on neutral 025 in the light theme, and the
 *  preview's sections sit in a host pinned light, so in either chrome theme their containers composite to
 *  the emission's own `core.palette.neutral.025`. In the light theme the rendered levers panel is held to the
 *  same value, so the expectation is also the panel the owner compared against. */
const LEVERS_GRAY = String(OUT[OUT_ROOT]?.core?.palette?.neutral?.['025']?.$value ?? '').toLowerCase();
ok(/^#[0-9a-f]{6}$/.test(LEVERS_GRAY) && LEVERS_GRAY !== '#ffffff', `the oracle read the levers panel's light gray from the emission's neutral 025 (${LEVERS_GRAY})`);
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    await goPlace(page, 'color-fills');
    for (const [mode] of EXPECT_MODES) {
      if (host === 'figma' && mode.startsWith('hc')) continue;
      await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
      await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
      const where = `${host} ${theme} 1280, previewing ${mode}`;
      const g = await fillsGrounds(page);
      const want = EMITTED[mode];
      for (const name of EXPECT_FILLS_SPECIMENS) {
        const r = g.roots.find((x) => x.name === name);
        ok(!!r && r.root && r.ground === want, `specimen ground: surfaces & fills ${where}: ${name} is a specimen root on background.primary ${want}${
          !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== want ? ` — ${r.ground === g.card ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
      }
      const unlisted = g.roots.filter((x) => !EXPECT_FILLS_SPECIMENS.includes(x.name)).map((x) => x.name);
      ok(unlisted.length === 0, `specimen ground: surfaces & fills ${where}: every section ground drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
      const offGray = g.sections.filter((x) => x.bg !== LEVERS_GRAY).map((x) => `${x.name} on ${x.bg}`);
      ok(g.sections.length >= EXPECT_FILLS_SPECIMENS.length && offGray.length === 0,
        `Q24 section containers: surfaces & fills ${where}: every section container is the levers panel's gray ${LEVERS_GRAY} (${g.sections.length} read)${offGray.length ? ` — ${offGray.join(', ')}` : ''}`);
      if (theme === 'light') ok(g.levers === LEVERS_GRAY, `Q24 section containers: ${where}: the levers panel itself is ${LEVERS_GRAY} in the light theme (rendered ${g.levers})`);
    }
    await ctx.close();
  }
}
for (const [key, hk] of FILLS_LEVERS) {
  ok(!!manifest.levers.find((l) => l.key === key), `the manifest has the Surfaces & fills lever ${key}`);
  ok(hooks.role(hk) === kebabHook(key), `${key}'s hook is ${kebabHook(key)} (listed ${hooks.role(hk)})`);
}
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  await goPlace(page, 'color-fills');
  const c = await page.evaluate(([lh, roles]) => ({
    levers: Object.fromEntries(lh.map((hk) => [hk, document.querySelectorAll(`[data-p3="levers-pane"] ${hk}`).length])),
    rows: Object.fromEntries(roles.map((r) => [r, document.querySelectorAll(`[data-p3="levers-pane"] .p3-fillrow[data-role="${r}"]`).length])),
    strayLevers: [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')].map((n) => n.getAttribute('data-p3')).filter((r) => !lh.includes(`[data-p3="${r}"]`)),
    strayRows: [...document.querySelectorAll('[data-p3="levers-pane"] .p3-fillrow')].map((n) => n.dataset.role).filter((r) => !roles.includes(r)),
    fieldRows: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="field-rows"] .p3-fillrow')].map((n) => n.dataset.role),
    scrim: { rows: document.querySelectorAll('[data-p3="levers-pane"] [data-p3="scrim-row"]').length, read: document.querySelector('[data-p3="levers-pane"] [data-p3="scrim-readout"]')?.textContent ?? null,
      controls: document.querySelectorAll('[data-p3="levers-pane"] [data-p3="scrim-row"] :is(button, select, input)').length },
    // Q50: the icon rows, as drawn while the default theme's icons match text.
    icons: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="icon-rows"] .p3-fillrow [data-p3="fill-pick"]')].map((b) => ({ role: b.dataset.role, disabled: b.disabled, text: b.querySelector('.p3-btn-label')?.textContent ?? '' })),
    pairNote: document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"] p')?.textContent ?? null,
    unpair: document.querySelector('[data-p3="levers-pane"] [data-p3="icons-unpair"]')?.textContent ?? null,
    focus: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="focus-row"]')].map((n) => ({ role: n.dataset.role, controls: n.querySelectorAll('button, select, input').length })),
    jumps: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="fills-jump-link"]')].map((a) => ({ text: a.textContent, to: document.querySelector(a.getAttribute('href'))?.querySelector('.p3-lsec-title')?.textContent ?? null })),
  }), [FILLS_LEVERS.map(([, hk]) => hk), [...FOREGROUND_ROW_ROLES, ...FILL_ROW_ROLES, ...TEXT_ROW_ROLES, ...BORDER_ROW_ROLES, ...ICON_ROW_ROLES, ...FIELD_ROW_ROLES, ...READONLY_ROW_ROLES]]);
  // The scrim, read-only (S4c): one row, no control, its primitive and opacity in Light, from the emission's own
  // alias and that primitive's alpha.
  const scrimAlias = String(OUT[OUT_ROOT]?.color?.scrim?.default?.$value ?? '').slice(1, -1).split('.');
  const [scrimPal, scrimStep] = scrimAlias.slice(-2);
  const scrimAlpha = OUT[OUT_ROOT]?.core?.palette?.[scrimPal]?.[scrimStep]?.$extensions?.prism3?.alpha;
  const wantScrim = `${scrimPal} ${scrimStep} · ${Math.round(scrimAlpha * 100)}%`;
  ok(c.scrim.rows === 1 && c.scrim.controls === 0 && c.scrim.read === wantScrim,
    `${host}: Background fills shows the scrim once, read-only, as "${wantScrim}" — ${c.scrim.rows} row(s), ${c.scrim.controls} control(s), read ${JSON.stringify(c.scrim.read)}`);
  for (const [key, hk] of FILLS_LEVERS) ok(c.levers[hk] === 1, `${host}: Surfaces & fills lever ${key} renders its hook ${hooks.role(hk)} once — rendered ${c.levers[hk]}`);
  for (const r of [...FOREGROUND_ROW_ROLES, ...FILL_ROW_ROLES, ...TEXT_ROW_ROLES, ...BORDER_ROW_ROLES, ...ICON_ROW_ROLES, ...FIELD_ROW_ROLES, ...READONLY_ROW_ROLES]) ok(c.rows[r] === 1, `${host}: Surfaces & fills renders the ${r} row once — rendered ${c.rows[r]}`);
  // The focus rings (S4d, #1966): read-only rows, no control.
  ok(JSON.stringify(c.focus) === JSON.stringify([{ role: 'border.focus', controls: 0 }, { role: 'inverse.border.focus', controls: 0 }]), `${host}: Border shows border.focus and inverse.border.focus read-only — read ${JSON.stringify(c.focus)}`);
  // Q50, paired (the default theme's iconContrast is "text"): every icon row is disabled and says which text role it
  // follows, the twin named by the engine's rule (\`text\` for \`icon\`), restated here; the note and the button, APPROVED copy.
  const twin = (r) => r.replace(/(^|\.)icon\./, '$1text.');
  const badLock = ICON_ROW_ROLES.filter((r) => { const b = c.icons.find((x) => x.role === r); return !b || !b.disabled || b.text !== `Follows ${twin(r)}`; });
  ok(c.icons.length === ICON_ROW_ROLES.length && badLock.length === 0, `${host}: paired, each of the ${ICON_ROW_ROLES.length} icon rows is locked and reads "Follows text.X"${badLock.length ? ` — not: ${badLock.slice(0, 4).map((r) => `${r} ${JSON.stringify(c.icons.find((x) => x.role === r))}`).join(', ')}` : ''}`);
  ok(c.pairNote === 'Icons follow their text color. Unpair them to set icons on their own.' && c.unpair === 'Unpair icons from text', `${host}: the Icon section's note and button are the approved copy — read ${JSON.stringify([c.pairNote, c.unpair])}`);
  // Jump links (Q49): one per section, each to its own section, in order.
  ok(JSON.stringify(c.jumps.map((j) => j.text)) === JSON.stringify(c.jumps.map((j) => j.to)) && c.jumps.length === 8, `${host}: a jump link to each of the 8 sections, each naming its target — read ${JSON.stringify(c.jumps)}`);
  ok(JSON.stringify([...c.fieldRows].sort()) === JSON.stringify([...FIELD_ROW_ROLES].sort()), `${host}: the Fields section holds exactly the emitted field roles' rows — holds ${JSON.stringify(c.fieldRows)}`);
  // The approved copy (S4c, owner decisions Q26, Q27, Q29; Q23 for "Text color"), read as rendered. Literal.
  const copy = await page.evaluate(() => ({
    intro: document.querySelector('[data-p3="fills-levers"] .p3-intro')?.textContent ?? null,
    titles: [...document.querySelectorAll('[data-p3="fills-levers"] .p3-lsec-title')].map((n) => n.textContent),
    descs: Object.fromEntries([...document.querySelectorAll('[data-p3="fills-levers"] .p3-lsec')].map((n) => [n.querySelector('.p3-lsec-title')?.textContent, n.querySelector('.p3-lsec-desc')?.textContent ?? null])),
    // The preview's own section descriptions, by title, as rendered (Q23: the levers side copies them).
    previewDescs: Object.fromEntries([...document.querySelectorAll('[data-p3="section-head"]')].map((n) => [n.querySelector('[data-p3="section-title"]')?.textContent, n.querySelector('[data-p3="section-description"]')?.textContent ?? null])),
    surfacesName: document.querySelector('[data-p3="fills-levers"] [data-p3="lever-surfaces"] .p3-lever-name')?.textContent ?? null,
    // The info toggletip the block's own button controls (`aria-controls`), so it is that button's text.
    surfacesTip: (() => {
      const info = document.querySelector('[data-p3="fills-levers"] [data-p3="lever-surfaces"] [data-p3="lever-info"]');
      const id = info?.getAttribute('aria-controls');
      return id ? document.getElementById(id)?.textContent ?? null : null;
    })(),
    modeHeads: document.querySelectorAll('[data-p3="fills-levers"] .p3-modegroup-title').length,
    fgLabels: [...document.querySelectorAll('[data-p3="fills-levers"] [data-p3="foreground-rows"] .p3-fillrow')].map((n) => [n.dataset.role, n.querySelector('.p3-fill-label')?.textContent]),
    subs: [...document.querySelectorAll('[data-p3="fills-levers"] .p3-rows-sub')].map((n) => n.textContent),
    // The token a surface control names, read off the label its select is named by (`for`), so it is the
    // control's own label and not text elsewhere in the block.
    tokens: Object.fromEntries(['surface-base-pick', 'surface-band-palette', 'surface-floor'].map((hk) => {
      const sel = document.querySelector(`[data-p3="fills-levers"] [data-p3="${hk}"]`);
      const lab = sel?.id ? document.querySelector(`[data-p3="fills-levers"] label[for="${sel.id}"]`) : null;
      return [hk, lab?.querySelector('.p3-fill-tok')?.textContent ?? null];
    })),
    // The Inverse fill control's own name, under its token (the owner's rename of "band" to "fill", 2026-10-02).
    inverseName: (() => {
      const sel = document.querySelector('[data-p3="fills-levers"] [data-p3="surface-band-palette"]');
      const lab = sel?.id ? document.querySelector(`[data-p3="fills-levers"] label[for="${sel.id}"]`) : null;
      return lab?.querySelector('.p3-field-label')?.textContent ?? null;
    })(),
  }));
  // The owner's direction (S4c): Page names background.primary and the Inverse band inverse.background.primary,
  // the grounds `surfaces.<mode>.base` and `.inverseBase` set (#956); the contrast floor is a setting. Literal.
  const WANT_TOKENS = { 'surface-base-pick': 'background.primary', 'surface-band-palette': 'inverse.background.primary', 'surface-floor': null };
  ok(JSON.stringify(copy.tokens) === JSON.stringify(WANT_TOKENS), `${host}: each surface control names the token it sets, the floor none — read ${JSON.stringify(copy.tokens)}`);
  ok(copy.inverseName === 'Inverse fill', `${host}: the inverse.background.primary control is named "Inverse fill" (the owner's rename, 2026-10-02) — read ${JSON.stringify(copy.inverseName)}`);
  const FILLS_COPY = {
    intro: 'Background and foreground fills, text, fields and gradients: the colors every page is built on.',
    titles: ['Background fills', 'Foreground', 'Foreground fills', 'Text color', 'Border', 'Icon', 'Fields', 'Gradients'],
    'Background fills': 'The base page planes, their inverse counterparts, and the scrim that dims them behind a modal.',
    // Q44: the APPROVED heading with the preview's Foreground description (Q23); Border and Icon take the preview's (Q23).
    Foreground: 'Content surfaces placed ON the page — the neutral and inverse ladders, plus semantic fills in bold and subtle weights, each paired with its on-surface text.',
    Border: 'Neutral separators, the focus ring, and semantic borders — their own category, not a surface.',
    'Text color': 'Every text color at one size, shown on the current surface and its inverse counterpart. On-color text lives with the fills above.',
    Icon: 'Icon color at the neutral tiers, the semantic set, and the on-color icons that sit on bold fills.',
    Fields: 'Form field fills, borders and text, in every state.',
  };
  // Q44: the neutral ladder labeled Primary, Secondary, Tertiary (no "Surface — card / panel / nested"), then its inverse
  // under the preview's "Inverse" sub-heading, which also heads the inverse group of every other section that has one.
  const FG_LABELS = [['foreground.primary', 'Primary'], ['foreground.secondary', 'Secondary'], ['foreground.tertiary', 'Tertiary'],
    ['inverse.foreground.primary', 'Primary'], ['inverse.foreground.secondary', 'Secondary'], ['inverse.foreground.tertiary', 'Tertiary']];
  ok(JSON.stringify(copy.fgLabels) === JSON.stringify(FG_LABELS), `${host}: the Foreground section's rows are labeled Primary, Secondary, Tertiary (Q44) — read ${JSON.stringify(copy.fgLabels)}`);
  ok(JSON.stringify(copy.subs) === JSON.stringify(['Inverse', 'Inverse', 'Inverse', 'Inverse', 'Inverse']), `${host}: Foreground, Foreground fills, Text color, Border and Icon each head their inverse rows "Inverse" — read ${JSON.stringify(copy.subs)}`);
  ok(copy.intro === FILLS_COPY.intro, `${host}: the Surfaces & fills intro is the owner's (Q27) — read ${JSON.stringify(copy.intro)}`);
  ok(JSON.stringify(copy.titles) === JSON.stringify(FILLS_COPY.titles), `${host}: the Surfaces & fills sections are ${FILLS_COPY.titles.join(', ')} — read ${JSON.stringify(copy.titles)}`);
  for (const t of ['Background fills', 'Foreground', 'Text color', 'Border', 'Icon', 'Fields']) ok(copy.descs[t] === FILLS_COPY[t], `${host}: the ${t} intro is the owner's — read ${JSON.stringify(copy.descs[t])}`);
  // Q23: the levers' Foreground and Text color descriptions are the preview sections' own, read off both sides
  // as rendered, so an edit to one side alone fails here as well as against the literal above.
  for (const t of ['Foreground', 'Text color']) ok(copy.previewDescs[t] === FILLS_COPY[t], `${host}: the preview's ${t} description is the one the levers copy (Q23) — read ${JSON.stringify(copy.previewDescs[t])}`);
  ok(copy.surfacesName === 'Background fills' && copy.modeHeads === 0, `${host}: the surfaces lever is named Background fills, with no per-mode subheading (Q22, Q26) — read ${JSON.stringify(copy.surfacesName)}, ${copy.modeHeads} mode subheading(s)`);
  // The Background fills info text is the owner's (approved verbatim, 2026-10-02), the Studio's own for this page
  // and not the engine manifest's description, which stays as it is for MCP and the emission. Literal.
  const SURFACES_TIP = 'The page and the inverse fill for the mode the preview shows. The contrast floor moves with the page.';
  ok(copy.surfacesTip === SURFACES_TIP, `${host}: the Background fills info text is the owner's — read ${JSON.stringify(copy.surfacesTip)}`);
  ok(c.strayLevers.length === 0, `${host}: every lever block on Surfaces & fills is one of its ${FILLS_LEVERS.length} keys${c.strayLevers.length ? ` — unclassified lever ${c.strayLevers.join(', ')}` : ''}`);
  ok(c.strayRows.length === 0, `${host}: every override row on Surfaces & fills is a listed role${c.strayRows.length ? ` — unlisted row ${c.strayRows.join(', ')}` : ''}`);
  ok(errors.length === 0, `${host} Surfaces & fills levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// The step picker, mounted (V9): it opens under its row on the current step, a pick writes the step and keeps
// the picker's focus, the preview repaints to the emission's own step, Return to Auto reverts, Escape closes it
// to its button; and nothing of this moves the preview's home (V1).
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  await goPlace(page, 'color-fills');
  const view0 = (await previewView(page)).view;
  const pick = page.locator('[data-p3="levers-pane"] [data-p3="fill-row-foreground-brand"] [data-p3="fill-pick"]');
  const label0 = (await pick.textContent()).trim();
  await hooks.click(pick);
  await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
  const opened = await page.evaluate(() => {
    const pk = document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"]');
    return { underRow: pk?.closest('.p3-fillrow-wrap')?.querySelector('.p3-fillrow')?.getAttribute('data-p3'), focus: document.activeElement?.dataset.step ?? null, pressed: pk?.querySelector('[aria-pressed="true"]')?.dataset.step ?? null };
  });
  ok(opened.underRow === 'fill-row-foreground-brand' && opened.pressed === '600' && opened.focus === '600',
    `fills: the brand row's picker opens under the row on its current step, primary 600, focused (${JSON.stringify(opened)}; button read "${label0}")`);
  const card = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-p3="surfaces-style-guide"] .sg-card[data-sg-role="foreground.brand"]')).backgroundColor);
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="700"]'));
  await page.waitForFunction(() => /Override/.test(document.querySelector('[data-p3="fill-row-foreground-brand"] [data-p3="fill-pick"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
  const after = await page.evaluate(() => ({ label: document.querySelector('[data-p3="fill-row-foreground-brand"] [data-p3="fill-pick"]')?.textContent.trim(), focus: document.activeElement?.dataset.step ?? null, open: !!document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"]') }));
  ok(/^Override · primary 700/.test(after.label ?? '') && after.focus === '700' && after.open,
    `fills: choosing primary 700 writes the override, keeps the picker open and its focus on 700 (${JSON.stringify(after)})`);
  ok(await card() === rgbOf(palHex('primary', '700')), `fills: the preview's brand fill repaints to the emission's primary 700 ${palHex('primary', '700')} (${await card()})`);
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-auto"]'));
  await page.waitForFunction(() => /^Auto/.test(document.querySelector('[data-p3="fill-row-foreground-brand"] [data-p3="fill-pick"]')?.textContent?.trim() ?? ''), null, { timeout: 5000 }).catch(() => {});
  ok(await card() === rgbOf(palHex('primary', '600')), `fills: Return to Auto puts the brand fill back on the emission's primary 600 (${await card()})`);
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"]'), focus: document.activeElement?.getAttribute('data-p3'), role: document.activeElement?.dataset.role }));
  ok(!closed.open && closed.focus === 'fill-pick' && closed.role === 'foreground.brand', `fills: Escape closes the picker to its button (${JSON.stringify(closed)})`);
  ok((await previewView(page)).view === view0, `V1 edit: a fill pick never moves the preview's home (${view0})`);
  // A gradient stop: the second stop of "brand" moved to step 300 writes THAT stop, and the bar and the preview
  // draw both stops from the emission's palette (the first is untouched).
  const stops = () => page.evaluate(() => [...document.querySelectorAll('[data-p3="gradient-editor"][data-gradient="brand"] [data-p3="gradient-stop"]')]
    .map((r) => ({ palette: r.querySelector('[data-p3="gradient-stop-palette"]').value, step: r.querySelector('[data-p3="gradient-stop-step"]').value })));
  const s0 = await stops();
  await page.locator('[data-p3="gradient-editor"][data-gradient="brand"] [data-p3="gradient-stop"]').nth(1).locator('[data-p3="gradient-stop-step"]').selectOption('300');
  await page.waitForFunction(() => document.querySelectorAll('[data-p3="gradient-editor"][data-gradient="brand"] [data-p3="gradient-stop-step"]')[1]?.value === '300', null, { timeout: 5000 }).catch(() => {});
  const s1 = await stops();
  const want = [s0[0], { palette: s0[1]?.palette, step: '300' }];
  ok(JSON.stringify(s1) === JSON.stringify(want), `gradient: setting the second stop of "brand" to step 300 writes that stop and no other — wrote ${JSON.stringify(s1)} (want ${JSON.stringify(want)})`);
  const pad3 = (n) => String(n).padStart(3, '0');
  const img = await page.evaluate(() => getComputedStyle(document.querySelector('[data-p3="gradient-specimen"][data-gradient="brand"]')).backgroundImage);
  const c0 = rgbOf(palHex(s0[0].palette, pad3(s0[0].step))), c1 = rgbOf(palHex(s0[1].palette, '300'));
  ok(img.includes(c0) && img.includes(c1), `gradient: the preview draws "brand" from ${s0[0].palette} ${s0[0].step} (${c0}) to ${s0[1].palette} 300 (${c1}) — drew ${img}`);
  ok(errors.length === 0, `fills edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// The chrome on Surfaces & fills: both hosts, both themes, 1280, 640 and 380 (the Settings pane, then the
// Preview pane when narrow), and once with a picker open.
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors } = await open({ host, theme, w, h });
      await goPlace(page, 'color-fills');
      const where = `${host} ${theme} ${w} / color-fills`;
      const narrow = w <= 560;
      const m = await measure(page, where, host, w);
      check(m, where, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR);
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s4-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
      if (narrow) {
        await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        const mp = await measure(page, `${where} / preview`, host, w);
        check(mp, `${where} / preview`, columnOf(host, w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: 'preview' });
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s4-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-preview.png`) });
      } else {
        await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="fill-pick"]').first());
        await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
        const mk = await measure(page, `${where}, a picker open`, host, w);
        check(mk, `${where}, a picker open`, columnOf(host, w), PLACE_FLOOR, { extra: ['[data-p3="step-picker-step"]', '[data-p3="step-picker-close"]', '[data-p3="step-picker-palette"]'] });
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s4-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-picker.png`) });
      }
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      await ctx.close();
    }
  }
}

hooks.report(ok);
console.log(`\nLowest chrome text ${lows.text}:1, lowest edge or indicator ${lows.edge}:1, lowest focus ring ${lows.focus}:1, smallest target ${lows.target.toFixed(1)}px.`);
console.log(`${executed - failed}/${executed} chrome assertions passed.`);
await browser.close();
server.close();
if (failed) process.exit(1);
