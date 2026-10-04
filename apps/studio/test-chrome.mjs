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
 *     it by itself (at 380: the strip, pinned to the bottom edge), running on its own operation row (S11)
 *     and no pill left in the top bar; a success keeps it open at 3 s and collapses it by 5 s (the literal
 *     `COLLAPSE_MS`, 4 s, v5 Q9; timed at 1280); a failure (light) or a warning (dark) keeps it open past
 *     5 s, its row's summary showing (at 380: the full-pane sheet); the Activity button's dot and name say
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
 *   · A RESULT'S ROW (plugin, S11): the page row's verdict, clicked on a closed drawer, opens the drawer on
 *     that operation's row, expanded, through the store; the row's own header collapses it and leaves the
 *     drawer open, and expands it again. (Under S1.4 the pill disclosed a shared detail row; S11 gave every
 *     operation its own row, so the pill no longer discloses anything in place.)
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
 * S5.2 ADDS (section 19; Color › Interactive moved to the two panes, so it left LEGACY_PAGES, and sections 4 and
 * 9, which used it as "the first legacy Color page", read Type and Shape):
 *   · SPECIMEN GROUND: the preview's Interactive, Disabled, Links and Icons sections are specimen roots on the
 *     emission's `background.primary`, by name (`EXPECT_INTERACTIVE_SPECIMENS`), both hosts, both themes, every mode.
 *   · CONTROLS REPRESENTED: each of the 10 keys once and shown, every row by its literal role (3 columns × 22, and
 *     the 4 link families), strays fail; no Show advanced; the columns Primary, Neutral, Destructive in that order in
 *     the levers, the jump links and the preview; each jump link resolves to, and focuses, its own group.
 *   · THE TEXT ROW (Q32), on Interactive and on Brand's Style guide: per column and state, the ink is the emission's
 *     `interactive.‹c›.text.‹s›`, no edge, and the ground over the page is the emitted wash (the page at rest).
 *   · RATIO BADGES: each prints the emission's measured contrast for its role, every mode.
 *   · EDITS: the picker under its row, a pick, Return to Auto, Escape; previewing Dark a row writes `modeAnchors`
 *     and not Light's field (Q34); the link palette's Auto unsets the key (Q36); the
 *     strict switch's off unsets it; an accent is the last column everywhere (Q33, Q39).
 *   · The chrome probe on Interactive: both hosts, both themes, 1280, 640 and 380.
 *   · OWNER COPY (2026-10-02, APPROVED, literal): the lever sections are the preview's, Interactive, Disabled,
 *     Links, Icons, with their descriptions, each lever in its section (Q51); the button-set strings (Q53); no
 *     "column", "band" or "muted" in the page's copy (Q53, Q57, Q58); a button set added and removed previewing
 *     Dark persists the same JSON as from Light (Q54); in HC light, HC dark and wireframe every control in a lever
 *     section is disabled, enumerated from the DOM with a floor, under the derived line (Q59).
 *   Owner-copy mutations: "Promote to a column" back → `Q53: the add row reads "Add button set" …`; a section
 *   titled "Actions" → `Q51: Interactive's lever sections are the preview's …`; Add hidden in Dark → `Q54:
 *   previewing Dark, Add button set is shown and enabled`; the action palette select left enabled in a derived
 *   mode → `Q59: previewing HC light, every control on Interactive is disabled … — enabled action-palette-select`.
 *   S5.2 mutations (each after a `wip:` commit): a row writing the light key while previewing Dark → `interactive:
 *   previewing Dark, primary 400 writes modeAnchors.dark.primary and not the light anchor (Q34)`; the Text row
 *   dropped → `text buttons: color-interactive primary has no Text row` and `text buttons: brand primary has no Text
 *   row`; the columns reordered → `… the levers draw the columns in the owner's order …`; a jump link aimed at the
 *   wrong group → `… the jump link "Neutral" resolves to its own column group (neutral) …`.
 *
 * S4f ADDS (section 18; the owner's QA of 2026-10-02 on Color › Surfaces & fills, #2016, #1971):
 *   · BACKGROUND FILLS AS ROWS (QA-B1, QA-B3, QA-B7): its seven rows by role, in order, each a swatch, its name with
 *     its token, and its step picker, Primary first (was "Page"), the contrast floor a row with no token; the two
 *     APPROVED sub-headings; the floor's APPROVED info text (QA-B6); the icon contrast block's info text, Interactive's
 *     Icons description (QA-I10). All literal.
 *   · SCRIM (QA-B10): its own lever section and preview section, its copy APPROVED, the scrim row not in Background fills.
 *   · FIELDS (#2016, Q80): a preview section on the page, and an edit in the levers' Fields reveals it (QA-B9's rule).
 *   · #1971 (Q81): Background and Foreground on white (literal `#ffffff`) with no badge, every other section on the
 *     emission's `background.primary` with its badges; Q23 pairs for Background fills, Scrim and Fields.
 *   · THE LOCK (QA-B12): the pairing button's padlock is the shut shackle while paired and the open one while not
 *     (path data literal), aria-hidden, the button named by its words.
 *   · GRADIENTS (QA-B13 to QA-B16): the switch in its block's header at the top right; no element in the levers paints
 *     a gradient of two colors or more; 24px or more each side of a gradient's divider, and Add gradient's own divider.
 *   · A6 (owner, 2026-10-03): the scrim's wash, in the levers' swatch and the preview's card, over a checkered ground
 *     (a gradient of two colors or more, read from the render), both chrome themes, Light and Dark.
 *   · MARKS (QA-I2): a Page sweep, Light and Dark, every Page the picker offers: each mark themed reads 3:1 or more on
 *     its composited ground in that theme's status icon color, and no worse than the other theme; an unthemed mark is
 *     the badge's ink, only where neither theme reaches 3:1.
 *   S4f mutations, each failing by name: see `docs/progress/pending/ui-s4f-surfaces-rebuild.md`.
 *
 * S5.3 ADDS (section 19b; the owner's QA on Color › Interactive, evening 2026-10-02), and section 19 follows it: the
 * Icons section is gone from the levers and the preview (QA-I10), so 9 keys, 3 specimen sections; Add button set
 * opens its form first (QA-I4); the Q52 re-pair case drives Surfaces & fills' Pair button, its lever gone.
 *   · THE LEVERS, web light 1280: the strict switch with the page-wide settings, above the button sets (QA-I5); the
 *     neutral emphasis opening the Neutral set (QA-I6); no icon contrast control and no Icons section (QA-I10); the
 *     dashed connector (QA-I3); sets at least 40px apart (`space.500`, QA-I7) and the add row further still; Add button
 *     set a full-width dashed button, the color select shown only after it is clicked, Cancel and Escape writing
 *     nothing (QA-I4); the Disabled "Full contrast" switch, its APPROVED captions, its writes ("full" and "reduced",
 *     the segmented control's), and the floor chips only while it is off (QA-I8).
 *   · THE BADGE MARKS (QA-I2), Light, Dark, HC light and HC dark: every mark is the chrome's success icon token, or its
 *     danger icon token for a miss, read from the token tree (`chrome/tokens.mjs`), never from the page's variables,
 *     and clears 3:1 on its composited ground. A miss is forced through the levers' picker so the arm is never empty.
 *   · AS DRAWN, both hosts, both themes, 1280 and 800: no treatment label's token or badge box intersects a button
 *     column (QA-I1); each link state select fills its line, `scrollWidth <= clientWidth`, and its widest option fits
 *     inside its padding (QA-I9). Screenshots `s53-*` when a directory is given.
 *   S5.3 mutations (each after a `wip:` commit): the switch writing "reduced" when on → `QA-I8: switching Full contrast
 *   on writes disabledStrategy "full" …`; the chips drawn under Full → `QA-I8: under Full contrast the floor chips are
 *   not shown`; the select drawn before Add → `QA-I4: before Add button set is clicked, the color select is not shown`;
 *   the Icons lever back → `QA-I10: Interactive draws no icon contrast control …`; the miss mark rule dropped →
 *   `QA-I2 (light): a failing mark is the danger icon token …`.
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
 *   · the apply pill painted into the top bar → `F2 … no status pill is left in the top bar`.
 *   S1.4 review (orchestrator's review of #1929):
 *   · the pill's click without `hostChanged()`, or the drawer's reveal branch removed (S11) →
 *     `F2 … clicking the failure's verdict on the page row opens the drawer on its Set up file row, expanded — open false, …`.
 *   · `runApply` posting `{}` → `Figma menu … Apply Theme posts the brand the page loaded (…), whole — input differs at id, root, …`.
 *   · `runPrune` posting a stale input → `Figma menu … Prune stale posts the brand the page loaded with confirm false, whole — input differs at id`.
 *   · the popover's focusout handler removed → `IA-3 … Tab past the switch closes the popover`.
 *   · Escape handled on the popover only → `IA-3 … Escape on the chip closes its open popover`.
 *   · the row header's toggle removed (S11) → `F2 … the row's own header collapses it, and the drawer stays open`.
 *   · the Figma menu's Apply stuck disabled → `S1.4 … the case stopped at a wait that never resolved, … waiting for locator('[data-p3="figma-option-apply"]')`, and the run goes on.
 *   S11 (#1788), each run against the built bundles:
 *   · the drawer's auto-open on a start removed → `F2 … Apply opens the drawer by itself while it runs, pinned to the bottom edge`.
 *   · the success collapse never scheduled → `F2 … a success collapses the drawer by 5 s (COLLAPSE_MS is 4 s), its result still on the drawer's bar row`.
 *   · the drawer's reveal branch removed, or the page pill's click without `hostChanged()` →
 *     `F2 … clicking the failure's verdict on the page row opens the drawer on its Set up file row, expanded`.
 *   · the busy label's hidden layer taken out of layout (`display: none` for `visibility: hidden`, owner
 *     decision #4 on #1956) → `… the bar's Apply keeps its width while busy (123.1 idle, 126.3 busy)`.
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
import { P, loadModes, resolve as resolveToken } from './chrome/tokens.mjs';

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
const LEGACY_PAGES = ['shape', 'depth', 'layout', 'components'];
/** The places a slice has moved into the two panes (S2: Color › Palettes; S3: Brand; S4a: Color › Surfaces & fills;
 *  S5.2: Color › Interactive; S6.2: Type). A slice that moves a place adds it here in the same change; a place in both
 *  lists, or in neither, fails by name. */
const NEW_PAGES = ['brand', 'color-palettes', 'color-fills', 'color-interactive', 'type'];

/** Plan §4's table: the legacy page(s) each place shows, by the Pages menu hook's suffix, per host. */
const EXPECT_LEGACY = {
  web: {
    shape: ['size-radius'], depth: ['elevation', 'motion'], layout: ['layout'], components: ['size-radius'] },
  figma: {
    shape: ['size-radius'], depth: ['elevation', 'motion'], layout: ['layout'], components: ['components'] },
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
const FILLS_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="surface-base-pick"]', '[data-p3="surface-floor-pick"]',
  '[data-p3="surface-band-palette"]', '[data-p3="surface-band-step-pick"]', '[data-p3="surface-secondary-pick"]', '[data-p3="surface-tertiary-pick"]',
  '[data-p3="surface-inverse-secondary-pick"]', '[data-p3="surface-inverse-tertiary-pick"]', '[data-p3="fill-pick"]', '[data-p3="fills-jump-link"]', '[data-p3="icons-unpair"]',
  '[data-p3="gradients-switch"]', '[data-p3="gradient-name"]', '[data-p3="gradient-remove"]', '[data-p3="gradient-kind"]', '[data-p3="gradient-angle"]',
  '[data-p3="gradient-interpolation"]', '[data-p3="gradient-stop-palette"]', '[data-p3="gradient-stop-step"]', '[data-p3="gradient-stop-position"]',
  '[data-p3="gradient-stop-add"]', '[data-p3="gradient-add"]', '[data-p3="fills-continue"]'];
/** Color › Interactive in the two panes (S5.2): the controls its levers must render, by hook, at the top of the
 *  levers (the jump links, then Actions; the rest of the page is section 19's). */
const INTERACTIVE_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="interactive-jump-link"]', '[data-p3="action-palette-select"]',
  '[data-p3="int-pick"]'];
/** Brand in the two panes (S3): the levers it must render, by hook (v6's Identity, Personality and Modes, and
 *  the way on to Color). */
const BRAND_LEVERS_CONTROLS = ['[data-p3="brand-name"]', '[data-p3="brand-namespace"]', '[data-p3="lever-info"]', '[data-p3="personality-word"]',
  '[data-p3="mode-on-dark"]', '[data-p3="mode-on-hc-light"]', '[data-p3="mode-on-hc-dark"]', '[data-p3="mode-on-wireframe"]',
  '[data-p3="custom-mode-add"]', '[data-p3="brand-continue"]'];
/** Type in the two panes (S6.2): the controls its levers must render, by hook (Faces: the library's Add face, the
 *  face for each text type, Show advanced; the way on to Shape). The lent legacy region is `INSPECT_LEGACY`'s. */
const TYPE_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="face-add-input"]', '[data-p3="face-add"]', '[data-p3="family-select"]',
  '[data-p3="family-all-apply"]', '[data-p3="scale-advanced"]', '[data-p3="type-continue"]'];
/** Each moved place's levers, by place. */
const LEVERS_CONTROLS = { 'color-palettes': PALETTES_LEVERS_CONTROLS, brand: BRAND_LEVERS_CONTROLS, 'color-fills': FILLS_LEVERS_CONTROLS,
  'color-interactive': INTERACTIVE_LEVERS_CONTROLS, type: TYPE_LEVERS_CONTROLS };
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
const CONTROL_KINDS = [['p3-brand', 'brand switcher'], ['p3-verdict', 'verdict'], ['p3-btn', 'button'], ['p3-tab', 'tab'],
  ['p3-seg-tab', 'segment'], ['p3-select', 'select'], ['p3-menu-item', 'menu item'], ['p3-search-input', 'search field'],
  // S2: the levers panel's text fields and sliders, and the step picker's steps.
  ['p3-hex-input', 'text field'], ['p3-range', 'slider'], ['p3-step', 'picker step'],
  // S3: Brand's name, namespace and custom-mode name fields.
  ['p3-text-input', 'text field'],
  // S11: the Activity drawer's bar row (its own toggle) and each operation row's header.
  ['p3-drawer-bar', 'drawer bar'], ['p3-op-head', 'operation row'],
  // S5.2: Color › Interactive's jump links to its column groups.
  ['p3-jump-link', 'jump link']];
/** Legacy views Inspect lends a host to until their slices replace them (S1.3): pinned light and drawn in
 *  `styles.css`, so outside the chrome, like the legacy page. Named literally, by hook. */
const INSPECT_LEGACY = ['[data-p3="inspect-contrast-table"]', '[data-p3="inspect-token-list"]',
  // S3: the Style guide, lent to Brand's preview the same way (pinned light, `styles.css`). Its specimens are
  // section 11's; its legibility is `test:smoke`'s Brand section.
  '[data-p3="brand-style-guide"]',
  // S4a: Color › Surfaces & fills' preview draws the Style guide's legacy sections (owner decision Q5), in a host
  // pinned light the same way. Its specimens are held to the brand's page color in section 16.
  '[data-p3="surfaces-style-guide"]',
  // S5.2: Color › Interactive's preview, the same way. Its specimens are held to the brand's page color in section 19.
  '[data-p3="interactive-style-guide"]',
  // S6.2: Type's preview, the same way (section 20). (S6.2 also lent its levers a legacy region, retired in S6.3.)
  '[data-p3="type-style-guide"]'];

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
    // A closed <details> hides its content with `content-visibility: hidden`, not `display: none`, so its
    // children keep a box and pass the walk below while drawing nothing (S11: the drawer's "Earlier
    // results" list). `checkVisibility` reads content-visibility; the walk is kept for what it reads.
    if (!el.checkVisibility()) return false;
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
  // Legacy fields: Color moved to the two panes in S2, S4a and S5.2 and Type in S6.2 (S6.3 retired the legacy region
  // Type's levers lent), so this reads Layout, still a legacy page, whose grid columns are a legacy select.
  await goPlace(page, 'layout');
  await hooks.need(page, '[data-p3="legacy-page"]');
  const f = await page.evaluate(() => {
    const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s.trim()); const p = m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : [0, 0, 0, 0]; return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = (c) => { const f2 = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f2(c.r) + 0.7152 * f2(c.g) + 0.0722 * f2(c.b); };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const ground = (n0) => { let acc = null; for (let n = n0; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ? over(acc, parse(getComputedStyle(document.body).backgroundColor)) : parse(getComputedStyle(document.body).backgroundColor); };
    const fields = [...document.querySelectorAll('[data-p3="legacy-page"] :is(input[type="text"], input:not([type]), select)')]
      .filter((n) => n.getBoundingClientRect().width > 0);
    return { doc: getComputedStyle(document.documentElement).colorScheme, fields: fields.map((n) => {
      const cs = getComputedStyle(n); const g = ground(n); const x = lum(over(parse(cs.color), g)), y = lum(g);
      return { name: n.getAttribute('data-p3') ?? n.className, value: n.value, scheme: cs.colorScheme, r: Math.floor(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100 };
    }) };
  });
  const where = `${host} dark / Layout`;
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
  ok(!s.open && s.page && s.legacyPage === undefined && s.view === 'type', `a tab change closes Inspect and shows the new page, Type in the two panes (${JSON.stringify({ open: s.open, page: s.legacyPage, view: s.view })})`);
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
  // Shape, the first legacy page with a mode strip (Type edits every mode as columns and draws none, #416).
  await goPlace(page, 'shape');
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
/** An operation's row header in the drawer (S11): its disclosure state and its chevron's drawn transform. */
const rowOf = (page, op) => page.evaluate((k) => {
  const n = document.querySelector(`[data-p3="activity-drawer"] [data-p3="activity-op"][data-op="${k}"] [data-p3="op-head"]`);
  const ico = n?.querySelector('.p3-ico');
  return n ? { expanded: n.getAttribute('aria-expanded'), chev: ico ? getComputedStyle(ico).transform : null } : null;
}, op);
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
    // S11: every operation that has run has its row: its state, its verdict pill, its phase while running,
    // and its summary when that is showing.
    ops: Object.fromEntries([...document.querySelectorAll('[data-p3="activity-drawer"] [data-p3="activity-op"]')].map((n) => [n.dataset.op, {
      state: n.dataset.state, verdict: n.querySelector('[data-p3="op-verdict"]')?.textContent ?? null,
      phase: n.querySelector('[data-p3="op-progress"]')?.textContent ?? null,
      summary: vis(n.querySelector('[data-p3="op-summary"]')) ? n.querySelector('[data-p3="op-summary"]').textContent : null,
    }])),
    last: document.querySelector('[data-p3="activity-toggle"]')?.textContent ?? null,
    // Any write status in the top bar: a page row's pending pill (by its class: this suite never renders one,
    // so its hook would be one the guard cannot see), its verdict, or a drawer row's verdict pill.
    barPills: document.querySelectorAll('[data-p3="top-bar"] :is(.bar-seed, [data-p3="status-verdict"], [data-p3="op-verdict"])').length,
    note: vis(document.querySelector('[data-p3="activity-note"]')) ? document.querySelector('[data-p3="activity-note"]').textContent : null,
    pinned: !!dr && vis(d) && Math.abs(dr.bottom - window.innerHeight) <= 1,
    sheet: !!dr && !!br && vis(d) && dr.top >= br.bottom - 1 && Math.abs(dr.bottom - window.innerHeight) <= 1 && !vis(document.querySelector('[data-p3="legacy-frame"]')),
  };
});
const sinceMs = async (page, t0, ms) => { const left = t0 + ms - Date.now(); if (left > 0) await page.waitForTimeout(left); };
/** A write's control's label as drawn: the text of whichever label layer is visible. A control carries its idle
 *  and busy labels in one cell (owner decision #4 on #1956); both visible, or neither, reads as both, or empty. */
const SHOWN = `(n) => n ? ([...n.querySelectorAll('[data-p3="label-idle"], [data-p3="label-busy"]')].filter((x) => getComputedStyle(x).visibility === 'visible').map((x) => x.textContent).join('') || (n.querySelector('[data-p3^="label-"]') ? '' : n.textContent)) : null`;
const menuState = (page) => page.evaluate((shownSrc) => { const shown = eval(shownSrc); return {
  open: !!document.querySelector('[data-p3="figma-menu"]'), expanded: document.querySelector('[data-p3="figma-open"]')?.getAttribute('aria-expanded'),
  items: [...document.querySelectorAll('[data-p3="figma-menu"] [role="menuitem"]')].map((n) => [n.getAttribute('data-p3'), shown(n), n.disabled, n.getAttribute('aria-busy') === 'true' && n.getAttribute('aria-disabled') === 'true']),
  focus: document.activeElement?.getAttribute('data-p3') ?? null,
  page: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage,
}; }, SHOWN);
/** The bar's Apply control: its label as drawn, any aria-label overriding it, whether it is natively disabled,
 *  whether it says it is busy (`aria-busy` and `aria-disabled`, owner decision #4), and its width. */
const applyBar = (page) => page.evaluate((shownSrc) => { const shown = eval(shownSrc); const b = document.querySelector('[data-p3="apply-to-figma"]');
  return { text: shown(b), name: b?.getAttribute('aria-label') ?? null, disabled: b?.disabled ?? null,
    busy: !!b && b.getAttribute('aria-busy') === 'true' && b.getAttribute('aria-disabled') === 'true', width: b ? Math.round(b.getBoundingClientRect().width * 10) / 10 : null }; }, SHOWN);
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
        ok(applyIdle.text === APPLY_LABEL && applyIdle.name === null && !applyIdle.disabled && !applyIdle.busy,
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
        const ra = r.ops['apply'];
        ok(ra?.state === 'running' && ra.phase === 'Writing to Figma…', `F2 ${where}: the running write sits on the drawer's Apply Theme row, reading "Writing to Figma…" (row ${JSON.stringify(ra)})`);
        ok((r.last ?? '').includes('Apply Theme') && (r.last ?? '').includes('Writing to Figma…'), `F2 ${where}: the drawer's bar row names the running write and its phase (read "${r.last}")`);
        hooks.absent(ok, { seen: ra?.state === 'running', state: 'the running write on its drawer row' }, r.barPills === 0, `F2 ${where}: no status pill is left in the top bar (${r.barPills} found)`);
        ok(r.dot === 'run' && r.name === 'Activity, 1 running', `F2 ${where}: Activity's dot and name say a write is running (dot ${r.dot}, name "${r.name}")`);
        if (narrow) {
          ok(!r.open && r.shown && r.pinned && !r.body, `F2 ${where}: at 380 a running write shows in the strip, pinned to the bottom edge, and the drawer stays closed (${JSON.stringify({ open: r.open, shown: r.shown, pinned: r.pinned })})`);
        } else {
          ok(r.open && r.body && r.expanded === 'true' && r.pinned, `F2 ${where}: Apply opens the drawer by itself while it runs, pinned to the bottom edge (${JSON.stringify({ open: r.open, body: r.body, pinned: r.pinned })})`);
          ok(r.note === null && (await rowOf(page, 'apply'))?.expanded === 'true', `F2 ${where}: the open drawer's body shows the Apply Theme row, expanded, and not its empty note (note "${r.note}")`);
        }
        const mr = await measure(page, `${where} / a write running`, host, w);
        check(mr, `${where} / a write running`, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: ['[data-p3="activity-toggle"]'] });
        await shot(narrow ? 'drawer-collapsed' : 'drawer-open');
        const applyBusy = await applyBar(page);
        ok(applyBusy.text === APPLY_RUNNING && applyBusy.busy && applyBusy.disabled === false,
          `${where}: while the write runs, the bar's Apply reads "${APPLY_RUNNING}", busy and aria-disabled, not natively disabled (owner decision #4; read ${JSON.stringify(applyBusy)})`);
        ok(applyBusy.width === applyIdle.width, `${where}: the bar's Apply keeps its width while busy (${applyIdle.width} idle, ${applyBusy.width} busy)`);
        // While it runs, the menu's Apply is busy (focusable, aria-disabled) and Prune stale is unavailable
        // (today's rule: a prune reads what an apply writes); Set up file is neither.
        await openFigma(page);
        const busy = await menuState(page);
        const dis = Object.fromEntries(busy.items.map(([hk, , d, b]) => [hk, b ? 'busy' : d ? 'disabled' : 'ready']));
        ok(dis['figma-option-apply'] === 'busy' && dis['figma-option-prune'] === 'disabled' && dis['figma-option-file-setup'] === 'ready',
          `Figma menu ${where}: while Apply runs, Apply is busy, Prune stale is unavailable and Set up file can run (${JSON.stringify(dis)})`);
        ok(busy.items.find(([hk]) => hk === 'figma-option-apply')?.[1] === APPLY_RUNNING, `Figma menu ${where}: while Apply runs, the menu's Apply reads "${APPLY_RUNNING}" (read "${busy.items.find(([hk]) => hk === 'figma-option-apply')?.[1]}")`);
        await page.keyboard.press('Escape');
        // A success collapses the drawer COLLAPSE_MS after it lands, and not before (timed at 1280).
        await postMsg(page, { type: 'apply-result', ok: true, headline: '✓ Applied 412 variables', summary: '412 variables written.' });
        const t0 = Date.now();
        await page.waitForFunction(() => (document.querySelector('[data-p3="activity-op"][data-op="apply"] [data-p3="op-verdict"]')?.textContent ?? '').includes('✓ Applied'), null, { timeout: 5000 }).catch(() => {});
        if (w === 1280) {
          await sinceMs(page, t0, COLLAPSE_MS - 1000);
          const early = await drawerState(page);
          ok(early.open && early.body, `F2 ${where}: a success keeps the drawer open at ${(COLLAPSE_MS - 1000) / 1000} s (COLLAPSE_MS is ${COLLAPSE_MS / 1000} s) — open ${early.open}`);
          await sinceMs(page, t0, COLLAPSE_MS + 1000);
          const late = await drawerState(page);
          ok(!late.open && !late.body && late.shown && (late.last ?? '').includes('✓ Applied'),
            `F2 ${where}: a success collapses the drawer by ${(COLLAPSE_MS + 1000) / 1000} s (COLLAPSE_MS is ${COLLAPSE_MS / 1000} s), its result still on the drawer's bar row — open ${late.open}, bar "${late.last}"`);
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
        const pruneLabel = async () => { await openFigma(page); const t = await page.evaluate((shownSrc) => eval(shownSrc)(document.querySelector('[data-p3="figma-option-prune"]')), SHOWN); await page.keyboard.press('Escape'); return t; };
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
        await page.waitForFunction((s) => document.querySelector('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-summary"]')?.textContent === s, bad.summary, { timeout: 5000 }).catch(() => {});
        if (w === 1280 || narrow) await sinceMs(page, t1, COLLAPSE_MS + 1000);
        const f = await drawerState(page);
        const fs = f.ops['filesetup'];
        ok(f.open && f.body && fs?.summary === bad.summary, `F2 ${where}: a ${kind} keeps the drawer open${w === 1280 || narrow ? ` past ${(COLLAPSE_MS + 1000) / 1000} s` : ''}, its row's summary showing — open ${f.open}, summary "${fs?.summary}"`);
        ok(f.dot === 'bad' && f.name === 'Activity, 1 needs attention', `F2 ${where}: Activity's dot and name say a result needs attention (dot ${f.dot}, name "${f.name}")`);
        if (narrow) ok(f.sheet, `F2 ${where}: at 380 a ${kind} opens the full-pane sheet under the top row (sheet ${f.sheet})`);
        const mf = await measure(page, `${where} / a ${kind} open`, host, w);
        check(mf, `${where} / a ${kind} open`, columnOf(host, w), narrow ? { ...INSPECT_NARROW_FLOOR, text: 4, fonts: 4, controls: 6 } : PLACE_FLOOR,
          { state: narrow ? 'sheet' : 'page', only: narrow ? ['[data-p3="brand-switcher"]', '[data-p3="activity-open"]', ...FIGMA_BAR, '[data-p3="activity-toggle"]', '[data-p3="op-head"]'] : null, extra: narrow ? [] : ['[data-p3="activity-toggle"]', '[data-p3="op-head"]'] });
        if (narrow) await shot('drawer-open');
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        const c = await drawerState(page);
        ok(!c.open && c.shown && c.dot === 'bad', `F2 ${where}: the drawer's toggle closes it, and the dot keeps the ${kind} (open ${c.open}, dot ${c.dot})`);
        // The page row's verdict asks to be shown: the drawer hears it through the store and opens by hand, on
        // that operation's row, expanded (S11). It discloses nothing in place any more. The verdict is on the
        // Components page, which the menu's Build set… item opens without writing (asserted below).
        await openFigma(page);
        await hooks.click(page.locator(FIGMA_OPTION.build), WAIT);
        await page.waitForFunction(() => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === 'components', null, { timeout: 5000 }).catch(() => {});
        await takePosts(page);
        await hooks.click(page.locator('[data-p3="file-setup-row"] [data-p3="status-verdict"]'), WAIT);
        await settle(page);
        const d1 = await drawerState(page), q1 = await rowOf(page, 'filesetup');
        ok(d1.open && d1.body && d1.expanded === 'true' && d1.ops['filesetup']?.summary === bad.summary && q1?.expanded === 'true' && q1?.chev !== 'none',
          `F2 ${where}: clicking the ${kind}'s verdict on the page row opens the drawer on its Set up file row, expanded — open ${d1.open}, summary "${d1.ops['filesetup']?.summary}", row ${JSON.stringify(q1)}`);
        // The row's own header discloses it, and leaves the drawer open.
        await hooks.click(page.locator('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-head"]'), WAIT);
        await settle(page);
        const d2 = await drawerState(page), q2 = await rowOf(page, 'filesetup');
        ok(d2.open && d2.ops['filesetup']?.summary === null && q2?.expanded === 'false' && q2?.chev === 'none',
          `F2 ${where}: the row's own header collapses it, and the drawer stays open — open ${d2.open}, summary "${d2.ops['filesetup']?.summary}", row ${JSON.stringify(q2)}`);
        await hooks.click(page.locator('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-head"]'), WAIT);
        await settle(page);
        const d3 = await drawerState(page);
        ok(d3.ops['filesetup']?.summary === bad.summary, `F2 ${where}: the header expands it again (summary "${d3.ops['filesetup']?.summary}")`);
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
 *  ground (S3; modeled on S2's `EXPECT_SPECIMENS`). Literal (orchestrator review of #1939). The type sample opens
 *  it (#1942, owner decision Q67, S6.2). */
const STYLE_GUIDE_ROOTS = ['Type sample', 'Background', 'Foreground', 'Text color', 'Border', 'Icon', 'Disabled', 'Interactive'];
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
  // An edit does, and smoothly (owner, 2026-10-01; eased on the chrome's motion tokens since QA-B9). A recorder
  // on the preview body's `scrollTo` notes the behavior each step of a reveal asks for, and `frames()` samples the body's scrollTop on every animation frame until
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
  // QA-B9: the glide is stepped, one \`instant\` position per frame on the chrome's motion tokens, never the
  // browser's \`smooth\` (which takes no duration or curve).
  ok(r1.length >= 2 && r1.every((x) => x === 'instant'), `Q4: without reduced motion the reveal steps its own eased glide, one instant position per frame — asked ${JSON.stringify(r1)}`);
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
  ok(r3.length === 1 && r3[0] === 'instant', `Q4: under reduced motion the reveal asks for one instant scroll — asked ${JSON.stringify(r3)}`);
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
const EXPECT_FILLS_SPECIMENS = ['Background', 'Scrim', 'Foreground', 'Text color', 'Border', 'Focus ring', 'Icon', 'Fields', 'Gradients'];
/** #1971 (owner decision Q81, S4f): the sections that are themselves grounds, Background and Foreground, sit in WHITE
 *  containers and carry no ratio badge; every other section checks contrast against the page and sits on its color.
 *  Literal, the owner's word: white, `#ffffff`, in every mode. Scrim (QA-B10) and Fields (#2016) are S4f's. */
const FILLS_WHITE_SECTIONS = ['Background', 'Foreground'];
const WHITE = '#ffffff';
/** The manifest keys v6 homes on Surfaces & fills, with their hooks. R2: every lever on this page is shown. */
const FILLS_LEVERS = [['surfaces', '[data-p3="lever-surfaces"]'], ['gradients', '[data-p3="lever-gradients"]'],
  // S4f (QA-I10): the Icon section's pairing control is the icon contrast lever's block, as Interactive drew it.
  ['iconContrast', '[data-p3="lever-icon-contrast"]']];
/** S4f (QA-B1): Background fills' rows, by the role each names: the three page tiers (Primary was "Page", QA-B3),
 *  the contrast floor (a setting, named by its input), and the inverse fill's three tiers. Literal. */
const SURFACE_ROW_ROLES = ['background.primary', 'background.secondary', 'background.tertiary', 'surfaces.floorStep',
  'inverse.background.primary', 'inverse.background.secondary', 'inverse.background.tertiary'];
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
// =============================================================================================
// WHAT COUNTS AS A CONTROL in a read-only check (#1991): a derived mode's, or a read-only row's. `button, select, input` alone missed any
// non-native control: a `[role=switch]`, a `[contenteditable]`, any `[tabindex]` element with a click handler
// could stay live in a derived mode and the check would still pass. So: every native control, every ARIA
// widget role, every editable region, and every element in the tab order. OFF means `:disabled` (which also
// covers a control inside a disabled fieldset) or `aria-disabled="true"`. Shared by every derived-mode check
// below, passed into the page as data, so the checks cannot drift apart on what a control is.
const DERIVED_CONTROL_QUERY = [
  'button', 'select', 'textarea', 'input:not([type="hidden"])', 'a[href]',
  ...['button', 'switch', 'checkbox', 'radio', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemradio', 'menuitemcheckbox', 'option', 'combobox', 'textbox']
    .map((r) => `[role="${r}"]`),
  '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])',
].join(', ');
/** The controls under `scope`, less the info toggletips (they open help and edit nothing), each with whether it
 *  is off. Runs in the page; `q` is `DERIVED_CONTROL_QUERY`. */
const DERIVED_CONTROLS = ([scope, q]) => [...document.querySelectorAll(scope)].flatMap((root) => [...root.querySelectorAll(q)])
  .filter((c, i, all) => all.indexOf(c) === i && c.getAttribute('data-p3') !== 'lever-info')
  .map((c) => ({
    hook: c.getAttribute('data-p3') ?? (c.id || `${c.tagName.toLowerCase()}${c.getAttribute('role') ? `[role=${c.getAttribute('role')}]` : ''}`),
    role: c.dataset.role ?? null,
    disabled: c.matches(':disabled') || c.getAttribute('aria-disabled') === 'true',
  }));

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
    badges: Object.fromEntries([...(host?.querySelectorAll('.psec') ?? [])].map((x) => [x.querySelector('.psec-t')?.textContent ?? '?', x.querySelectorAll('[data-p3="ratio-badge"]').length])),
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
        // #1971: Background and Foreground on white, the rest on the page.
        const white = FILLS_WHITE_SECTIONS.includes(name);
        const on = white ? WHITE : want;
        ok(!!r && r.root && r.ground === on, `specimen ground: surfaces & fills ${where}: ${name} is a specimen root on ${white ? `white ${WHITE} (#1971)` : `background.primary ${want}`}${
          !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== on ? ` — ${r.ground === g.card && !white ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
      }
      // #1971: no ratio badge in a section that is a ground; at least one in each section on the page that grades a role.
      const badgesBy = g.badges;
      for (const name of FILLS_WHITE_SECTIONS) ok(badgesBy[name] === 0, `#1971 surfaces & fills ${where}: the ${name} section shows no contrast badge (Q81) — ${badgesBy[name]} drawn`);
      for (const name of ['Text color', 'Border', 'Icon', 'Fields']) ok(badgesBy[name] > 0, `#1971 surfaces & fills ${where}: the ${name} section, on the page, shows its contrast badges — ${badgesBy[name]} drawn`);
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
  const c = await page.evaluate(([lh, roles, q]) => ({
    levers: Object.fromEntries(lh.map((hk) => [hk, document.querySelectorAll(`[data-p3="levers-pane"] ${hk}`).length])),
    rows: Object.fromEntries(roles.map((r) => [r, document.querySelectorAll(`[data-p3="levers-pane"] .p3-fillrow[data-role="${r}"]`).length])),
    strayLevers: [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')].map((n) => n.getAttribute('data-p3')).filter((r) => !lh.includes(`[data-p3="${r}"]`)),
    strayRows: [...document.querySelectorAll('[data-p3="levers-pane"] .p3-fillrow')].map((n) => n.dataset.role).filter((r) => !roles.includes(r)),
    fieldRows: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="field-rows"] .p3-fillrow')].map((n) => n.dataset.role),
    scrim: { rows: document.querySelectorAll('[data-p3="levers-pane"] [data-p3="scrim-row"]').length, read: document.querySelector('[data-p3="levers-pane"] [data-p3="scrim-readout"]')?.textContent ?? null,
      controls: document.querySelectorAll(`[data-p3="levers-pane"] [data-p3="scrim-row"] :is(${q})`).length,
      // QA-B10: which lever section holds it, by that section's own title.
      section: document.querySelector('[data-p3="levers-pane"] [data-p3="scrim-row"]')?.closest('.p3-lsec')?.querySelector('.p3-lsec-title')?.textContent ?? null,
      inBackground: [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lsec')].filter((x) => x.querySelector('.p3-lsec-title')?.textContent === 'Background fills')
        .some((x) => !!x.querySelector('[data-p3="scrim-row"], [data-role="scrim.default"]') || x.textContent.includes('scrim.default')) },
    // QA-B1: Background fills' rows, in order, each with its name, its token and its picker.
    surfRows: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="lever-surfaces"] [data-p3="surface-row"]')].map((r) => ({
      role: r.dataset.role, label: r.querySelector('.p3-fill-label')?.textContent ?? null, token: r.querySelector('.p3-fill-tok')?.textContent ?? null,
      swatch: !!r.querySelector('.p3-fill-sw'), pick: r.querySelector('.p3-pick')?.getAttribute('data-p3') ?? null })),
    surfSubs: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="lever-surfaces"] .p3-rows-sub')].map((n) => n.textContent),
    // Q50: the icon rows, as drawn while the default theme's icons match text.
    icons: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="icon-rows"] .p3-fillrow [data-p3="fill-pick"]')].map((b) => ({ role: b.dataset.role, disabled: b.disabled, text: b.querySelector('.p3-btn-label')?.textContent ?? '' })),
    pairNote: document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"] p')?.textContent ?? null,
    unpair: document.querySelector('[data-p3="levers-pane"] [data-p3="icons-unpair"]')?.textContent ?? null,
    focus: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="focus-row"]')].map((n) => ({ role: n.dataset.role, controls: n.querySelectorAll(q).length })),
    jumps: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="fills-jump-link"]')].map((a) => ({ text: a.textContent, to: document.querySelector(a.getAttribute('href'))?.querySelector('.p3-lsec-title')?.textContent ?? null })),
  }), [FILLS_LEVERS.map(([, hk]) => hk), [...SURFACE_ROW_ROLES, ...FOREGROUND_ROW_ROLES, ...FILL_ROW_ROLES, ...TEXT_ROW_ROLES, ...BORDER_ROW_ROLES, ...ICON_ROW_ROLES, ...FIELD_ROW_ROLES, ...READONLY_ROW_ROLES], DERIVED_CONTROL_QUERY]);
  // The scrim, read-only (S4c): one row, no control, its primitive and opacity in Light, from the emission's own
  // alias and that primitive's alpha.
  const scrimAlias = String(OUT[OUT_ROOT]?.color?.scrim?.default?.$value ?? '').slice(1, -1).split('.');
  const [scrimPal, scrimStep] = scrimAlias.slice(-2);
  const scrimAlpha = OUT[OUT_ROOT]?.core?.palette?.[scrimPal]?.[scrimStep]?.$extensions?.prism3?.alpha;
  const wantScrim = `${scrimPal} ${scrimStep} · ${Math.round(scrimAlpha * 100)}%`;
  ok(c.scrim.rows === 1 && c.scrim.controls === 0 && c.scrim.read === wantScrim,
    `${host}: Surfaces & fills shows the scrim once, read-only, as "${wantScrim}" — ${c.scrim.rows} row(s), ${c.scrim.controls} control(s), read ${JSON.stringify(c.scrim.read)}`);
  ok(c.scrim.section === 'Scrim' && !c.scrim.inBackground,
    `${host}: QA-B10: the scrim is in its own Scrim section, not in Background fills — in ${JSON.stringify(c.scrim.section)}${c.scrim.inBackground ? ', and still drawn inside Background fills' : ''}`);
  // QA-B1, QA-B3, QA-B7 (APPROVED): the two sub-headings, then the rows in the Foreground rows' pattern (a swatch, the name
  // with its token under it, the step picker), the page tiers named Primary (was "Page"), Secondary, Tertiary, then the
  // contrast floor (no token: a setting); the inverse fill's three tiers. The inverse names are the brief's (DRAFT).
  const WANT_SURF_ROWS = [
    ['background.primary', 'Primary', 'background.primary', 'surface-base-pick'], ['background.secondary', 'Secondary', 'background.secondary', 'surface-secondary-pick'],
    ['background.tertiary', 'Tertiary', 'background.tertiary', 'surface-tertiary-pick'], ['surfaces.floorStep', 'Contrast floor', null, 'surface-floor-pick'],
    ['inverse.background.primary', 'Inverse primary', 'inverse.background.primary', 'surface-band-step-pick'],
    ['inverse.background.secondary', 'Inverse secondary', 'inverse.background.secondary', 'surface-inverse-secondary-pick'],
    ['inverse.background.tertiary', 'Inverse tertiary', 'inverse.background.tertiary', 'surface-inverse-tertiary-pick'],
  ].map(([role, label, token, pick]) => ({ role, label, token, swatch: true, pick }));
  ok(JSON.stringify(c.surfRows) === JSON.stringify(WANT_SURF_ROWS), `${host}: QA-B1/QA-B3: Background fills draws its rows in the Foreground pattern, Primary first — read ${JSON.stringify(c.surfRows)}`);
  ok(JSON.stringify(c.surfSubs) === JSON.stringify(['Default background fills', 'Inverse background fills']),
    `${host}: QA-B7: Background fills' sub-sections are "Default background fills" and "Inverse background fills" — read ${JSON.stringify(c.surfSubs)}`);
  for (const [key, hk] of FILLS_LEVERS) ok(c.levers[hk] === 1, `${host}: Surfaces & fills lever ${key} renders its hook ${hooks.role(hk)} once — rendered ${c.levers[hk]}`);
  for (const r of [...SURFACE_ROW_ROLES, ...FOREGROUND_ROW_ROLES, ...FILL_ROW_ROLES, ...TEXT_ROW_ROLES, ...BORDER_ROW_ROLES, ...ICON_ROW_ROLES, ...FIELD_ROW_ROLES, ...READONLY_ROW_ROLES]) ok(c.rows[r] === 1, `${host}: Surfaces & fills renders the ${r} row once — rendered ${c.rows[r]}`);
  // The focus rings (S4d, #1966): read-only rows, no control.
  ok(JSON.stringify(c.focus) === JSON.stringify([{ role: 'border.focus', controls: 0 }, { role: 'inverse.border.focus', controls: 0 }]), `${host}: Border shows border.focus and inverse.border.focus read-only — read ${JSON.stringify(c.focus)}`);
  // Q50, paired (the default theme's iconContrast is "text"): every icon row is disabled and says which text role it
  // follows, the twin named by the engine's rule (\`text\` for \`icon\`), restated here; the note and the button, APPROVED copy.
  const twin = (r) => r.replace(/(^|\.)icon\./, '$1text.');
  const badLock = ICON_ROW_ROLES.filter((r) => { const b = c.icons.find((x) => x.role === r); return !b || !b.disabled || b.text !== `Follows ${twin(r)}`; });
  ok(c.icons.length === ICON_ROW_ROLES.length && badLock.length === 0, `${host}: paired, each of the ${ICON_ROW_ROLES.length} icon rows is locked and reads "Follows text.X"${badLock.length ? ` — not: ${badLock.slice(0, 4).map((r) => `${r} ${JSON.stringify(c.icons.find((x) => x.role === r))}`).join(', ')}` : ''}`);
  ok(c.pairNote === 'Icons follow their text color. Unpair them to set icons on their own.' && c.unpair === 'Unpair icons from text', `${host}: the Icon section's note and button are the approved copy — read ${JSON.stringify([c.pairNote, c.unpair])}`);
  // Jump links (Q49): one per section, each to its own section, in order.
  ok(JSON.stringify(c.jumps.map((j) => j.text)) === JSON.stringify(c.jumps.map((j) => j.to)) && c.jumps.length === 9, `${host}: a jump link to each of the 9 sections, each naming its target — read ${JSON.stringify(c.jumps)}`);
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
    tokens: Object.fromEntries(['surface-base-pick', 'surface-secondary-pick', 'surface-tertiary-pick', 'surface-band-step-pick', 'surface-band-palette', 'surface-inverse-secondary-pick',
      'surface-inverse-tertiary-pick', 'surface-floor-pick'].map((hk) => {
      const sel = document.querySelector(`[data-p3="fills-levers"] [data-p3="${hk}"]`);
      const lab = sel?.id ? document.querySelector(`[data-p3="fills-levers"] label[for="${sel.id}"]`) : null;
      return [hk, lab?.querySelector('.p3-fill-tok')?.textContent ?? null];
    })),
    // The four tiers' names, their tokens under them (S4e; QA-B2 puts the name first).
    tierNames: ['surface-secondary-pick', 'surface-tertiary-pick', 'surface-inverse-secondary-pick', 'surface-inverse-tertiary-pick'].map((hk) => {
      const sel = document.querySelector(`[data-p3="fills-levers"] [data-p3="${hk}"]`);
      const lab = sel?.id ? document.querySelector(`[data-p3="fills-levers"] label[for="${sel.id}"]`) : null;
      return lab?.querySelector('.p3-fill-label')?.textContent ?? null;
    }),
    // The inverse fill's palette select, by its own label (the owner's rename of "band" to "fill", 2026-10-02; S4f DRAFT).
    inverseName: (() => {
      const sel = document.querySelector('[data-p3="fills-levers"] [data-p3="surface-band-palette"]');
      const lab = sel?.id ? document.querySelector(`[data-p3="fills-levers"] label[for="${sel.id}"]`) : null;
      return lab?.textContent ?? null;
    })(),
    // QA-B6: the contrast floor row's own info text, the toggletip its info button controls.
    floorTip: (() => {
      const info = document.querySelector('[data-p3="fills-levers"] [data-p3="surface-row"][data-role="surfaces.floorStep"] [data-p3="lever-info"]');
      const id = info?.getAttribute('aria-controls');
      return id ? document.getElementById(id)?.textContent ?? null : null;
    })(),
    // QA-I10: the icon contrast block's info text, its toggletip.
    iconTip: (() => {
      const info = document.querySelector('[data-p3="fills-levers"] [data-p3="lever-icon-contrast"] [data-p3="lever-info"]');
      const id = info?.getAttribute('aria-controls');
      return id ? document.getElementById(id)?.textContent ?? null : null;
    })(),
  }));
  // The owner's direction (S4c): Page names background.primary and the Inverse band inverse.background.primary,
  // the grounds `surfaces.<mode>.base` and `.inverseBase` set (#956); the contrast floor is a setting. Literal.
  // S4e (#1972, Q41): the four tiers name the tokens their inputs set.
  // S4f (QA-B1): Inverse primary's step picker names inverse.background.primary; the palette select above it names none.
  const WANT_TOKENS = { 'surface-base-pick': 'background.primary', 'surface-secondary-pick': 'background.secondary', 'surface-tertiary-pick': 'background.tertiary',
    'surface-band-step-pick': 'inverse.background.primary', 'surface-band-palette': null, 'surface-inverse-secondary-pick': 'inverse.background.secondary',
    'surface-inverse-tertiary-pick': 'inverse.background.tertiary', 'surface-floor-pick': null };
  ok(JSON.stringify(copy.tokens) === JSON.stringify(WANT_TOKENS), `${host}: each surface control names the token it sets, the floor none — read ${JSON.stringify(copy.tokens)}`);
  ok(JSON.stringify(copy.tierNames) === JSON.stringify(['Secondary', 'Tertiary', 'Inverse secondary', 'Inverse tertiary']),
    `${host}: the four tier controls are named Secondary, Tertiary, Inverse secondary, Inverse tertiary (#2001, approved) — read ${JSON.stringify(copy.tierNames)}`);
  ok(copy.inverseName === 'Inverse fill palette', `${host}: the inverse fill's palette select is named "Inverse fill palette" (S4f, draft; "fill", the owner's rename) — read ${JSON.stringify(copy.inverseName)}`);
  ok(copy.floorTip === 'The background most text, icon and fill colors are checked against for contrast. Auto uses background.secondary.',
    `${host}: QA-B6: the contrast floor's info text is the owner's — read ${JSON.stringify(copy.floorTip)}`);
  ok(copy.iconTip === 'The icon color set by the icon contrast floor: matches text at 4.5:1, or held to the 3:1 non-text floor.',
    `${host}: QA-I10: the icon contrast block carries Interactive's Icons description (ICONS_DESC) — read ${JSON.stringify(copy.iconTip)}`);
  const FILLS_COPY = {
    intro: 'Background and foreground fills, text, fields and gradients: the colors every page is built on.',
    titles: ['Background fills', 'Scrim', 'Foreground', 'Foreground fills', 'Text color', 'Border', 'Icon', 'Fields', 'Gradients'],
    // S4f (QA-B10): the scrim left Background fills, so its description is the owner's Q26 intro; Scrim's is APPROVED.
    'Background fills': 'The base page planes and their inverse counterparts.',
    Scrim: "The overlay that dims the page behind a modal. It isn't editable.",
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
  // S4f (QA-B7): Background fills' two sub-headings come first, the APPROVED words.
  ok(JSON.stringify(copy.subs) === JSON.stringify(['Default background fills', 'Inverse background fills', 'Inverse', 'Inverse', 'Inverse', 'Inverse', 'Inverse']),
    `${host}: Background fills heads its two groups (QA-B7), and Foreground, Foreground fills, Text color, Border and Icon each head their inverse rows "Inverse" — read ${JSON.stringify(copy.subs)}`);
  ok(copy.intro === FILLS_COPY.intro, `${host}: the Surfaces & fills intro is the owner's (Q27) — read ${JSON.stringify(copy.intro)}`);
  ok(JSON.stringify(copy.titles) === JSON.stringify(FILLS_COPY.titles), `${host}: the Surfaces & fills sections are ${FILLS_COPY.titles.join(', ')} — read ${JSON.stringify(copy.titles)}`);
  for (const t of ['Background fills', 'Scrim', 'Foreground', 'Text color', 'Border', 'Icon', 'Fields']) ok(copy.descs[t] === FILLS_COPY[t], `${host}: the ${t} intro is the owner's — read ${JSON.stringify(copy.descs[t])}`);
  // Q23: the levers' descriptions are the preview sections' own, read off both sides as rendered, so an edit to one
  // side alone fails here as well as against the literal above. Background fills pairs with the preview's
  // Background (Q26's rename); since S4f Scrim (QA-B10) and Fields (#2016) have preview sections of their own.
  for (const [t, pv] of [['Background fills', 'Background'], ['Scrim', 'Scrim'], ['Foreground', 'Foreground'], ['Text color', 'Text color'], ['Border', 'Border'], ['Icon', 'Icon'], ['Fields', 'Fields']]) {
    ok(copy.previewDescs[pv] === FILLS_COPY[t], `${host}: the preview's ${pv} description is the one the levers' ${t} copies (Q23) — read ${JSON.stringify(copy.previewDescs[pv])}`);
  }
  ok(copy.surfacesName === 'Background fills' && copy.modeHeads === 0, `${host}: the surfaces lever is named Background fills, with no per-mode subheading (Q22, Q26) — read ${JSON.stringify(copy.surfacesName)}, ${copy.modeHeads} mode subheading(s)`);
  // The Background fills info text is the owner's (approved verbatim, 2026-10-02), the Studio's own for this page
  // and not the engine manifest's description, which stays as it is for MCP and the emission. Literal.
  const SURFACES_TIP = 'The page, its tiers and the inverse fill for the mode the preview shows.';
  ok(copy.surfacesTip === SURFACES_TIP, `${host}: the Background fills info text is the owner's — read ${JSON.stringify(copy.surfacesTip)}`);
  ok(c.strayLevers.length === 0, `${host}: every lever block on Surfaces & fills is one of its ${FILLS_LEVERS.length} keys${c.strayLevers.length ? ` — unclassified lever ${c.strayLevers.join(', ')}` : ''}`);
  ok(c.strayRows.length === 0, `${host}: every override row on Surfaces & fills is a listed role${c.strayRows.length ? ` — unlisted row ${c.strayRows.join(', ')}` : ''}`);
  ok(errors.length === 0, `${host} Surfaces & fills levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// =============================================================================================
// S4d owner copy (2026-10-02): "subtle" not "muted" (Q57), "fill" not "band" (Q58), and every control on Surfaces &
// fills read-only in a derived mode, the Unpair button included (Q56, Q59)
// =============================================================================================
// THE ORACLE for "every control" is the DOM itself: every control inside the page's sections, as
// `DERIVED_CONTROL_QUERY` defines one (#1991), enumerated as rendered, with a floor on the count so an empty read fails, less only the info buttons (they open
// help and edit nothing). The words are literals typed here. The derived modes are the engine's three, by name.
const VISIBLE_WORDS = () => {
  const root = document.querySelector('[data-p3="frame"]');
  const out = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.parentElement && !n.parentElement.closest('script, style')) out.push(n.textContent);
  for (const e of root.querySelectorAll('[aria-label], [title], [placeholder]')) out.push(e.getAttribute('aria-label') ?? '', e.getAttribute('title') ?? '', e.getAttribute('placeholder') ?? '');
  return out.join('\n');
};
/** Show `mode` in the preview: its radio, or the select when the radios do not all fit. */
const showMode = async (page, mode) => {
  const radio = page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`);
  if (await radio.count() && await radio.first().isVisible()) await hooks.click(radio.first());
  else await page.locator('[data-p3="mode-select"]').selectOption(mode);
  await page.waitForFunction((m) => document.querySelector('[data-p3="levers-pane"] [data-p3="surfaces-group"]')?.dataset.mode !== undefined
    && [...document.querySelectorAll('[data-p3="mode-option"]')].some((b) => b.dataset.mode === m && b.getAttribute('aria-checked') === 'true')
    || document.querySelector('[data-p3="mode-select"]')?.value === m, mode, { timeout: 5000 }).catch(() => {});
};
const FILLS_SCOPE = '[data-p3="fills-levers"] .p3-lsec';
const fillsControls = (page) => page.evaluate(DERIVED_CONTROLS, [FILLS_SCOPE, DERIVED_CONTROL_QUERY]);
/** At least this many controls on the page in a derived mode: the override rows' pick buttons, the surface
 *  controls, Unpair and the default theme's two gradient editors. Set below the measured count, 145 in each of
 *  hc-light, hc-dark and wireframe on both hosts (printed per mode), so a page that drew less fails. */
const DERIVED_CONTROLS_FLOOR = 140;
/** At least this many of them enabled in Light: all but the 31 icon rows locked while paired. 114 measured. */
const LIGHT_ENABLED_FLOOR = 110;
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  // Wireframe is off in the default theme: turn it on, on Brand, so all three derived modes are checked.
  await goPlace(page, 'brand');
  await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-p3="mode-option"]'), ...document.querySelectorAll('[data-p3="mode-select"] option')]
    .some((b) => (b.dataset?.mode ?? b.value) === 'wireframe'), null, { timeout: 5000 }).catch(() => {});
  await goPlace(page, 'color-fills');
  // Q57 and Q58: the words, as rendered across the page, the levers and the preview.
  const words = await page.evaluate(VISIBLE_WORDS);
  const muted = words.split('\n').filter((l) => /\bmuted\b/i.test(l));
  const band = words.split('\n').filter((l) => /\bband\b/i.test(l));
  ok(words.length > 1000 && muted.length === 0, `${host}: nothing visible on Surfaces & fills says "muted" (Q57: "subtle", the token's word)${muted.length ? ` — ${JSON.stringify(muted.slice(0, 4))}` : ''}`);
  ok(words.length > 1000 && band.length === 0, `${host}: nothing visible on Surfaces & fills says "band" (Q58: "fill")${band.length ? ` — ${JSON.stringify(band.slice(0, 4))}` : ''}`);
  const labels = await page.evaluate(() => Object.fromEntries([
    ['icon-brand-subtle', '[data-p3="fill-row-icon-brand-subtle"]'], ['text-brand-subtle', '[data-p3="fill-row-text-brand-subtle"]'],
    ['inverse-icon-danger-subtle', '[data-p3="fill-row-inverse-icon-danger-subtle"]'],
  ].map(([r, sel]) => [r, document.querySelector(`[data-p3="levers-pane"] ${sel} .p3-fill-label`)?.textContent ?? null])));
  ok(JSON.stringify(labels) === JSON.stringify({ 'icon-brand-subtle': 'Brand, subtle', 'text-brand-subtle': 'Brand ink, subtle', 'inverse-icon-danger-subtle': 'Danger, subtle' }),
    `${host}: the subtle rows are labeled "Brand, subtle", "Brand ink, subtle", "Danger, subtle" (Q57) — read ${JSON.stringify(labels)}`);
  const fillNames = await page.evaluate(() => ({
    step: document.querySelector('[data-p3="levers-pane"] [data-p3="surface-band-step-pick"]')?.getAttribute('aria-label') ?? null,
    palette: document.querySelector('[data-p3="levers-pane"] [data-p3="surface-band-palette"]')?.getAttribute('aria-label') ?? null,
  }));
  // S4f: the step picker is the Inverse primary row's, named by its visible label (WCAG 2.5.3); the palette select says "fill".
  ok(/^Inverse primary, Light: /.test(fillNames.step ?? '') && fillNames.palette === 'Inverse fill palette, Light',
    `${host}: the inverse.background.primary controls' accessible names are "Inverse primary" and "Inverse fill palette" (Q58) — read ${JSON.stringify(fillNames)}`);
  // Light, the proof the read below sees controls that CAN be enabled: the Unpair button is, and most controls are.
  const light = await fillsControls(page);
  const lightUnpair = light.find((c) => c.hook === 'icons-unpair');
  ok(lightUnpair && !lightUnpair.disabled && light.length >= DERIVED_CONTROLS_FLOOR && light.filter((c) => !c.disabled).length >= LIGHT_ENABLED_FLOOR,
    `${host}: in Light the page's controls edit, Unpair included (${light.filter((c) => !c.disabled).length} of ${light.length} enabled; Unpair ${JSON.stringify(lightUnpair)})`);
  for (const mode of ['hc-light', 'hc-dark', 'wireframe']) {
    await showMode(page, mode);
    await page.waitForFunction((m) => document.querySelector('[data-p3="levers-pane"] [data-p3="surfaces-group"]')?.dataset.mode && document.querySelector('[data-p3="levers-pane"] .p3-state')?.textContent?.includes('auto-derived'), mode, { timeout: 5000 }).catch(() => {});
    const cs = await fillsControls(page);
    const live = cs.filter((c) => !c.disabled);
    const unpair = cs.find((c) => c.hook === 'icons-unpair');
    console.log(`  ${host} ${mode}: ${cs.length} controls on Surfaces & fills, ${live.length} enabled`);
    ok(cs.length >= DERIVED_CONTROLS_FLOOR && live.length === 0,
      `${host} ${mode}: every control on Surfaces & fills is disabled (Q59) — ${cs.length} controls (floor ${DERIVED_CONTROLS_FLOOR}), ${live.length} enabled${live.length ? `: ${live.slice(0, 6).map((c) => `${c.hook}${c.role ? ` ${c.role}` : ''}`).join(', ')}` : ''}`);
    ok(unpair?.disabled === true, `${host} ${mode}: the Unpair button is drawn and disabled (Q56) — read ${JSON.stringify(unpair)}`);
  }
  ok(errors.length === 0, `${host} S4d owner copy and derived modes: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// Q52: re-pairing icons with text clears every icon override, page and inverse, in every mode, asking first when
// there are any, in the plural for two and the singular for one (Q60); icons stay unpaired until Pair icons. Driven
// from Surfaces & fills' "Pair icons with text" (Q61) since S5.3: Interactive's icon contrast lever, where this
// case began (#1974), is gone (the owner's QA-I10). THE ORACLE is the brand the web host persists after every edit (`prism3:brandInput`), read
// before and after; what Pair leaves is a literal typed here. The dialog's words are the APPROVED copy, literal.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  const stored = () => page.evaluate(() => localStorage.getItem('prism3:brandInput'));
  const pickStep = async (rowSel, step) => {
    const row = `[data-p3="levers-pane"] ${rowSel}`;
    await hooks.click(page.locator(`${row} [data-p3="fill-pick"]`));
    await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"][data-step="${step}"]`));
    await page.waitForFunction((r) => /^Override/.test(document.querySelector(`${r} [data-p3="fill-pick"]`)?.textContent?.trim() ?? ''), row, { timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape');
  };
  const unpair = async () => {
    await goPlace(page, 'color-fills');
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-unpair"]'));
    await page.waitForFunction(() => !document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"]'), null, { timeout: 5000 }).catch(() => {});
  };
  const pairBtn = () => page.locator('[data-p3="levers-pane"] [data-p3="icons-pair"]');
  const paired = () => page.waitForFunction(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"]'), null, { timeout: 5000 }).catch(() => {});
  const dialog = () => page.evaluate(() => {
    const d = document.querySelectorAll('[data-p3="icons-pair-confirm"]');
    const el = d[0];
    return { n: d.length, title: el?.querySelector('.p3-confirm-title')?.textContent ?? null, body: [...(el?.querySelectorAll('.p3-confirm-line') ?? [])].map((x) => x.textContent),
      go: el?.querySelector('[data-p3="icons-pair-confirm-go"]')?.textContent ?? null, cancel: el?.querySelector('[data-p3="icons-pair-confirm-cancel"]')?.textContent ?? null,
      unpaired: !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-pair"]') };
  });
  // Ask to re-pair, waiting for the dialog without requiring it, so a re-pair that asks nothing fails below by name
  // rather than at a hook wait.
  const askPair = async () => {
    await hooks.click(pairBtn());
    await page.waitForFunction(() => !!document.querySelector('[data-p3="icons-pair-confirm"]'), null, { timeout: 5000 }).catch(() => {});
  };
  // No icon overrides: no dialog, and iconContrast is "text" again.
  await unpair();
  ok(JSON.parse(await stored() ?? 'null')?.input?.iconContrast === '3:1', 'Q52 setup: Unpair persisted iconContrast "3:1"');
  await hooks.click(pairBtn());
  await paired();
  const d0 = await dialog();
  const s0 = JSON.parse(await stored() ?? 'null')?.input;
  hooks.absent(ok, { seen: await page.evaluate(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"]')), state: 'the Icon section' }, d0.n === 0, `Q52: re-pairing with no icon overrides asks nothing (${d0.n} dialog(s))`);
  ok(s0?.iconContrast === 'text' && s0?.overrides === undefined, `Q52: re-pairing with no icon overrides writes iconContrast "text" (${JSON.stringify(s0?.iconContrast)}, overrides ${JSON.stringify(s0?.overrides)})`);
  // Two icon overrides, one page and one inverse, and a text override that must survive.
  // inverse.icon.secondary, not inverse.icon.primary: under "3:1" the primary row stays locked to its text (#1982).
  await unpair();
  await pickStep('[data-p3="fill-row-icon-brand"]', '700');
  await pickStep('[data-p3="fill-row-inverse-icon-secondary"]', '200');
  await pickStep('[data-p3="fill-row-text-brand"]', '300');
  const before = await stored();
  const b0 = JSON.parse(before ?? 'null')?.input;
  const ICON_OV = { 'icon.brand': { palette: 'primary', step: '700' }, 'inverse.icon.secondary': { palette: 'neutral', step: '200' }, 'text.brand': { palette: 'primary', step: '300' } };
  ok(b0?.iconContrast === '3:1' && JSON.stringify(b0?.overrides) === JSON.stringify({ light: ICON_OV }),
    `Q52 setup: two icon overrides and a text override persisted (${JSON.stringify(b0?.overrides)})`);
  await askPair();
  const d1 = await dialog();
  const WANT = { n: 1, title: 'Pair icons with text?', body: ['This removes 2 custom icon colors. Icons will follow their text color again.'], go: 'Pair icons', cancel: 'Cancel', unpaired: true };
  ok(JSON.stringify(d1) === JSON.stringify(WANT), `Q52: re-pairing with 2 icon overrides asks first, in the approved words, icons still unpaired — read ${JSON.stringify(d1)}`);
  ok(await stored() === before, 'Q52: the dialog open, nothing is written yet');
  if (d1.n !== 1) ok(false, 'Q52: Cancel and Pair icons NOT REACHED: re-pairing with 2 icon overrides drew no dialog');
  else {
    // Cancel: nothing changes, byte for byte.
    await hooks.click(page.locator('[data-p3="icons-pair-confirm-cancel"]'));
    const d2 = await dialog();
    ok(d2.n === 0 && d2.unpaired && await stored() === before, `Q52: Cancel closes the dialog and changes nothing (${d2.n} dialog(s), icons ${d2.unpaired ? 'unpaired' : 'PAIRED'}, brand ${await stored() === before ? 'unchanged' : 'CHANGED'})`);
    // Pair: iconContrast "text", every icon override gone, the text override kept.
    await hooks.click(pairBtn());
    await hooks.need(page, '[data-p3="icons-pair-confirm"]');
    await hooks.click(page.locator('[data-p3="icons-pair-confirm-go"]'));
    await paired();
    const a = JSON.parse(await stored() ?? 'null')?.input;
    ok(a?.iconContrast === 'text' && JSON.stringify(a?.overrides) === JSON.stringify({ light: { 'text.brand': { palette: 'primary', step: '300' } } }),
      `Q52: Pair icons writes iconContrast "text" and clears icon.brand and inverse.icon.secondary, keeping text.brand (iconContrast ${JSON.stringify(a?.iconContrast)}, overrides ${JSON.stringify(a?.overrides)})`);
  }
  // One icon override: the singular body (Q60), then Pair clears it, the text override still kept.
  await unpair();
  await pickStep('[data-p3="fill-row-icon-brand"]', '700');
  const b1 = JSON.parse(await stored() ?? 'null')?.input;
  ok(b1?.iconContrast === '3:1' && JSON.stringify(b1?.overrides) === JSON.stringify({ light: { 'text.brand': { palette: 'primary', step: '300' }, 'icon.brand': { palette: 'primary', step: '700' } } }),
    `Q60 setup: one icon override and the text override persisted (${JSON.stringify(b1?.overrides)})`);
  await askPair();
  const d3 = await dialog();
  const WANT1 = { n: 1, title: 'Pair icons with text?', body: ['This removes 1 custom icon color. Icons will follow their text color again.'], go: 'Pair icons', cancel: 'Cancel', unpaired: true };
  ok(JSON.stringify(d3) === JSON.stringify(WANT1), `Q60: re-pairing with 1 icon override asks first, the body singular, icons still unpaired — read ${JSON.stringify(d3)}`);
  if (d3.n === 1) await hooks.click(page.locator('[data-p3="icons-pair-confirm-go"]'));
  await paired();
  const a1 = JSON.parse(await stored() ?? 'null')?.input;
  ok(a1?.iconContrast === 'text' && JSON.stringify(a1?.overrides) === JSON.stringify({ light: { 'text.brand': { palette: 'primary', step: '300' } } }),
    `Q60: Pair icons with 1 icon override writes iconContrast "text" and clears icon.brand, keeping text.brand (iconContrast ${JSON.stringify(a1?.iconContrast)}, overrides ${JSON.stringify(a1?.overrides)})`);
  ok(errors.length === 0, `Q52 re-pair: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// Q61: re-pair from Surfaces & fills. While icons are unpaired, the Icon section shows the APPROVED note and the
// "Pair icons with text" button in place of the paired note and Unpair; the button writes `iconContrast: "text"` at
// once with no icon override to lose, and otherwise asks first in Q52's words, singular for one (Q60). Disabled in
// every derived mode (Q59). THE ORACLE: the copy is literal, typed here; a write is the brand the web host persists
// (`prism3:brandInput`), read before and after; the figma host's write is read off what it draws (the paired note
// back). The derived modes are the engine's three, by name.
const ICON_SECTION = () => {
  const q = (s) => document.querySelector(`[data-p3="levers-pane"] ${s}`);
  return {
    pairedNote: q('[data-p3="icons-paired"] p')?.textContent ?? null, unpair: q('[data-p3="icons-unpair"]')?.textContent ?? null,
    unpairedNote: q('[data-p3="icons-unpaired"] p')?.textContent ?? null, pair: q('[data-p3="icons-pair"]')?.textContent ?? null,
    pairDisabled: q('[data-p3="icons-pair"]')?.disabled ?? null, dialogs: document.querySelectorAll('[data-p3="icons-pair-confirm"]').length,
  };
};
const PAIRED_NOTE = 'Icons follow their text color. Unpair them to set icons on their own.';
const UNPAIRED_NOTE = 'Icons are set on their own. Pair them to follow their text color again.';
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  await goPlace(page, 'brand');
  await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-p3="mode-option"]'), ...document.querySelectorAll('[data-p3="mode-select"] option')]
    .some((b) => (b.dataset?.mode ?? b.value) === 'wireframe'), null, { timeout: 5000 }).catch(() => {});
  await goPlace(page, 'color-fills');
  const s0 = await page.evaluate(ICON_SECTION);
  ok(s0.pairedNote === PAIRED_NOTE && s0.unpair === 'Unpair icons from text' && s0.unpairedNote === null && s0.pair === null,
    `${host} Q61: paired, the Icon section shows its note and "Unpair icons from text", and no Pair button — read ${JSON.stringify(s0)}`);
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-unpair"]'));
  await page.waitForFunction(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-pair"]'), null, { timeout: 5000 }).catch(() => {});
  const s1 = await page.evaluate(ICON_SECTION);
  ok(s1.unpairedNote === UNPAIRED_NOTE && s1.pair === 'Pair icons with text' && s1.pairDisabled === false && s1.pairedNote === null && s1.unpair === null,
    `${host} Q61: unpaired, the Icon section shows the approved note and an enabled "Pair icons with text" in place of the paired note and Unpair — read ${JSON.stringify(s1)}`);
  for (const mode of ['hc-light', 'hc-dark', 'wireframe']) {
    await showMode(page, mode);
    await page.waitForFunction(() => document.querySelector('[data-p3="levers-pane"] .p3-state')?.textContent?.includes('auto-derived'), null, { timeout: 5000 }).catch(() => {});
    const s = await page.evaluate(ICON_SECTION);
    ok(s.pair === 'Pair icons with text' && s.pairDisabled === true, `${host} ${mode} Q61: the Pair button is drawn and disabled (Q59) — read ${JSON.stringify(s)}`);
  }
  await showMode(page, 'light');
  await page.waitForFunction(() => document.querySelector('[data-p3="levers-pane"] [data-p3="icons-pair"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
  // No icon overrides: Pair writes at once, no dialog.
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-pair"]'));
  await page.waitForFunction(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"]'), null, { timeout: 5000 }).catch(() => {});
  const s2 = await page.evaluate(ICON_SECTION);
  hooks.absent(ok, { seen: s2.pairedNote !== null || s2.pair !== null, state: 'the Icon section' }, s2.dialogs === 0, `${host} Q61: Pair with no icon overrides asks nothing (${s2.dialogs} dialog(s))`);
  ok(s2.pairedNote === PAIRED_NOTE && s2.unpair === 'Unpair icons from text' && s2.pair === null,
    `${host} Q61: Pair with no icon overrides pairs icons again, the paired note and Unpair back — read ${JSON.stringify(s2)}`);
  if (host === 'web') {
    const st = JSON.parse(await page.evaluate(() => localStorage.getItem('prism3:brandInput')) ?? 'null')?.input;
    ok(st?.iconContrast === 'text' && st?.overrides === undefined, `web Q61: Pair with no icon overrides persists iconContrast "text" (${JSON.stringify(st?.iconContrast)}, overrides ${JSON.stringify(st?.overrides)})`);
  }
  ok(errors.length === 0, `${host} Q61 Pair on Surfaces & fills: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// Q61 with one icon override: the dialog in Q52's words with the singular body (Q60); Cancel writes nothing, byte
// for byte; Pair icons clears the override and writes iconContrast "text".
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  const stored = () => page.evaluate(() => localStorage.getItem('prism3:brandInput'));
  const dialog = () => page.evaluate(() => {
    const d = document.querySelectorAll('[data-p3="icons-pair-confirm"]');
    const el = d[0];
    return { n: d.length, title: el?.querySelector('.p3-confirm-title')?.textContent ?? null, body: [...(el?.querySelectorAll('.p3-confirm-line') ?? [])].map((x) => x.textContent),
      go: el?.querySelector('[data-p3="icons-pair-confirm-go"]')?.textContent ?? null, cancel: el?.querySelector('[data-p3="icons-pair-confirm-cancel"]')?.textContent ?? null };
  });
  await goPlace(page, 'color-fills');
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-unpair"]'));
  await page.waitForFunction(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-pair"]'), null, { timeout: 5000 }).catch(() => {});
  const row = '[data-p3="levers-pane"] [data-p3="fill-row-icon-brand"]';
  await hooks.click(page.locator(`${row} [data-p3="fill-pick"]`));
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"][data-step="700"]'));
  await page.waitForFunction((r) => /^Override/.test(document.querySelector(`${r} [data-p3="fill-pick"]`)?.textContent?.trim() ?? ''), row, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press('Escape');
  const before = await stored();
  const b0 = JSON.parse(before ?? 'null')?.input;
  ok(b0?.iconContrast === '3:1' && JSON.stringify(b0?.overrides) === JSON.stringify({ light: { 'icon.brand': { palette: 'primary', step: '700' } } }),
    `Q61 setup: unpaired, one icon override persisted (${JSON.stringify(b0?.iconContrast)}, ${JSON.stringify(b0?.overrides)})`);
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-pair"]'));
  await hooks.need(page, '[data-p3="icons-pair-confirm"]');
  const d1 = await dialog();
  const WANT = { n: 1, title: 'Pair icons with text?', body: ['This removes 1 custom icon color. Icons will follow their text color again.'], go: 'Pair icons', cancel: 'Cancel' };
  ok(JSON.stringify(d1) === JSON.stringify(WANT), `Q61: Pair on Surfaces & fills with 1 icon override asks first, the body singular (Q60) — read ${JSON.stringify(d1)}`);
  ok(await stored() === before, 'Q61: the dialog open, nothing is written yet');
  await hooks.click(page.locator('[data-p3="icons-pair-confirm-cancel"]'));
  const d2 = await dialog();
  ok(d2.n === 0 && await stored() === before, `Q61: Cancel closes the dialog and the stored brand is byte-identical (${d2.n} dialog(s), brand ${await stored() === before ? 'unchanged' : 'CHANGED'})`);
  await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-pair"]'));
  await hooks.need(page, '[data-p3="icons-pair-confirm"]');
  await hooks.click(page.locator('[data-p3="icons-pair-confirm-go"]'));
  await page.waitForFunction(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-paired"]'), null, { timeout: 5000 }).catch(() => {});
  const a = JSON.parse(await stored() ?? 'null')?.input;
  ok(a?.iconContrast === 'text' && a?.overrides === undefined,
    `Q61: Pair icons on Surfaces & fills writes iconContrast "text" and clears the icon override (iconContrast ${JSON.stringify(a?.iconContrast)}, overrides ${JSON.stringify(a?.overrides)})`);
  ok(errors.length === 0, `Q61 re-pair with an override: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// =============================================================================================
// S4f (the owner's QA of 2026-10-02 on Surfaces & fills): the lock on the icon pairing button follows the state
// (QA-B12); the gradients switch in its block's header (QA-B13), no gradient drawn in the levers (QA-B14), room around
// the gradients' dividers (QA-B15, QA-B16); and the badge marks (QA-I2) read on whatever Page the brand sets.
// THE ORACLES: the padlock's two shackles are literals typed here; "a gradient drawn" is any element in the levers whose
// computed background is a CSS gradient, read from the render, whatever its hook; the marks are held to the composited
// ground each is drawn on, computed HERE, and to the chrome themes' own success and danger icon colors, read off probe
// elements stamped with each theme, never off the module that picks.
// =============================================================================================
{
  /** The shut and the open shackle, as drawn (`lock` and `unlock` in `shell/dom.ts`), by their path data. Literal. */
  const SHUT = 'M5.4 7.2V5.2a2.6 2.6 0 0 1 5.2 0v2';
  const OPEN = 'M5.4 7.2V5.2a2.6 2.6 0 0 1 5.1-.7';
  for (const host of ['web', 'figma']) {
    const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
    await goPlace(page, 'color-fills');
    const lock = () => page.evaluate(() => {
      const b = document.querySelector('[data-p3="levers-pane"] :is([data-p3="icons-unpair"], [data-p3="icons-pair"])');
      const svg = b?.querySelector('svg');
      return { hook: b?.getAttribute('data-p3') ?? null, name: b?.textContent?.trim() ?? null, label: b?.getAttribute('aria-label'),
        hidden: svg?.getAttribute('aria-hidden') ?? null, shackle: svg?.querySelectorAll('path')[0]?.getAttribute('d') ?? null,
        drawn: svg ? Math.round(svg.getBoundingClientRect().width) : 0, inBlock: !!b?.closest('[data-p3="lever-icon-contrast"]') };
    });
    const p0 = await lock();
    ok(p0.hook === 'icons-unpair' && p0.shackle === SHUT && p0.hidden === 'true' && p0.name === 'Unpair icons from text' && p0.label === null && p0.drawn > 0 && p0.inBlock,
      `${host} QA-B12: paired, the pairing button draws the shut padlock, decorative, beside its words, in the icon contrast block — read ${JSON.stringify(p0)}`);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="icons-unpair"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="levers-pane"] [data-p3="icons-pair"]'), null, { timeout: 5000 }).catch(() => {});
    const p1 = await lock();
    ok(p1.hook === 'icons-pair' && p1.shackle === OPEN && p1.hidden === 'true' && p1.name === 'Pair icons with text' && p1.label === null && p1.drawn > 0,
      `${host} QA-B12: unpaired, the pairing button draws the open padlock, decorative, beside its words — read ${JSON.stringify(p1)}`);
    // Gradients (QA-B13, QA-B14, QA-B15, QA-B16).
    const gr = await page.evaluate(() => {
      const blk = document.querySelector('[data-p3="levers-pane"] [data-p3="lever-gradients"]');
      const head = blk?.querySelector('.p3-lever-head');
      const sw = blk?.querySelector('[data-p3="gradients-switch"]');
      const hb = head?.getBoundingClientRect(), sb = sw?.getBoundingClientRect();
      // A gradient DRAWN is a linear or radial CSS gradient (the engine's two kinds) between two colors or more. The
      // scrim's swatch sits on the chrome's transparency checkerboard (A6), a conic pattern, and is not one.
      const colors = (bg) => new Set((bg.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? []).map((x) => x.replace(/\s+/g, '')));
      const painted = [...document.querySelectorAll('[data-p3="levers-pane"] *')].filter((n) => { const bg = getComputedStyle(n).backgroundImage; return /(linear|radial)-gradient\(/.test(bg) && colors(bg).size >= 2; })
        .map((n) => n.getAttribute('data-p3') ?? n.className?.baseVal ?? n.className);
      const eds = [...(blk?.querySelectorAll('[data-p3="gradient-editor"]') ?? [])];
      const box = (n) => n.getBoundingClientRect();
      // Room on each side of a divider: from the last control of one gradient to the next's divider, and from that
      // divider to the next gradient's first control. Then from Add gradient's divider down to the button.
      const ctl = (e) => [...e.querySelectorAll('input, select, button')].filter((x) => box(x).height > 0);
      const sides = eds.slice(1).map((e, i) => {
        const prevCtl = ctl(eds[i]), line = box(e).top, first = ctl(e)[0];
        return { above: Math.round(line - Math.max(...prevCtl.map((x) => box(x).bottom))), below: Math.round(box(first).top - line) };
      });
      const addRow = blk?.querySelector('[data-p3="gradient-add-row"]'), add = blk?.querySelector('[data-p3="gradient-add"]');
      const last = eds[eds.length - 1];
      return {
        inHead: !!sw && sw.closest('.p3-lever-head') === head, right: hb && sb ? Math.round(hb.right - sb.right) : null, top: hb && sb ? Math.round(sb.top - hb.top) : null,
        painted, n: eds.length, sides,
        addLine: addRow ? getComputedStyle(addRow).borderTopStyle : null,
        addAbove: addRow && add ? Math.round(box(add).top - box(addRow).top) : null,
        addBelowLast: addRow && last ? Math.round(box(addRow).top - Math.max(...ctl(last).map((x) => box(x).bottom))) : null,
      };
    });
    ok(gr.inHead && gr.right !== null && gr.right <= 1 && gr.top !== null && gr.top <= 12, `${host} QA-B13: the gradients switch sits at the top right of its block's header — read ${JSON.stringify({ inHead: gr.inHead, right: gr.right, top: gr.top })}`);
    ok(gr.painted.length === 0, `${host} QA-B14: the levers draw no gradient (the preview shows them)${gr.painted.length ? ` — drawn by ${gr.painted.join(', ')}` : ''}`);
    // S4a gave 8px above a divider and 12px under it; QA-B16 asks for more on both sides: 24px (the scale's 300) each.
    ok(gr.n >= 2 && gr.sides.length === gr.n - 1 && gr.sides.every((x) => x.above >= 24 && x.below >= 24),
      `${host} QA-B16: each gradient is set apart from the next by its divider, 24px or more on both sides — read ${JSON.stringify(gr.sides)} (${gr.n} gradients)`);
    ok(gr.addLine === 'solid' && gr.addAbove >= 32 && gr.addBelowLast >= 24,
      `${host} QA-B15: Add gradient has its own divider, with more room above the button (${gr.addAbove}px) than the gradients have (24px), and room below the last gradient (${gr.addBelowLast}px) — divider ${gr.addLine}`);
    ok(errors.length === 0, `${host} S4f lock and gradients: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    await ctx.close();
  }
}
// A6 (owner, 2026-10-03): the scrim's wash sits over a checkered ground, in the levers' swatch and the preview's card, so
// it reads as translucent: both chrome themes, Light and Dark previewed. THE ORACLE is the render: the element under
// the wash paints a CSS gradient of two colors or more as its background image (a checkerboard is a conic or repeated
// gradient), and the wash on it is a translucent color (alpha under 1) that covers it.
for (const theme of ['light', 'dark']) {
  const { ctx, page, errors } = await open({ host: 'web', theme, w: 1280, h: 900 });
  await goPlace(page, 'color-fills');
  for (const mode of ['light', 'dark']) {
    await showMode(page, mode);
    const got = await page.evaluate(() => {
      const colors = (bg) => new Set((bg.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? []).map((x) => x.replace(/\s+/g, '')));
      const read = (under, wash) => {
        const u = document.querySelector(under), w = u?.querySelector(wash);
        if (!u || !w) return { found: false };
        const bg = getComputedStyle(u).backgroundImage, wb = getComputedStyle(w).backgroundColor;
        const a = /rgba\([^)]*,\s*([0-9.]+)\)/.exec(wb);
        const U = u.getBoundingClientRect(), W = w.getBoundingClientRect();
        return { found: true, checkered: /gradient\(/.test(bg) && colors(bg).size >= 2, image: bg.slice(0, 90), wash: wb, translucent: !!a && Number(a[1]) > 0 && Number(a[1]) < 1,
          covers: W.width >= U.width - 2 && W.height >= U.height * 0.5 };
      };
      return { levers: read('[data-p3="levers-pane"] [data-p3="scrim-swatch"]', '[data-p3="scrim-wash"]'),
        preview: read('[data-p3="preview-body"] [data-p3="scrim-checker"]', '[data-p3="scrim-wash"]') };
    });
    for (const [where, r] of Object.entries(got)) {
      ok(r.found && r.checkered && r.translucent && r.covers,
        `A6 web ${theme}, previewing ${mode}: the scrim's ${where === 'levers' ? 'swatch in the levers' : 'card in the preview'} draws its wash over a checkered ground — read ${JSON.stringify(r)}`);
    }
  }
  ok(errors.length === 0, `A6 web ${theme}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
// QA-I2 on Surfaces & fills: a Page sweep. Every Page the picker offers in Light and in Dark (white, every neutral step,
// black), and every ratio badge's mark in the preview: a mark stamped with a chrome theme is drawn in that theme's
// success (pass) or danger (miss) icon color, at 3:1 or more against the ground it is ACTUALLY on, and that theme reads
// at least as well there as the other; a mark left unstamped is in the badge's own ink, and only where neither theme
// reaches 3:1. Both kinds of ground must be met (a stamped mark on a light ground and on a dark one), or the sweep proves nothing.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  await goPlace(page, 'color-fills');
  const MARKS = () => {
    const card = document.querySelector('[data-p3="preview-body"] [data-p3="surfaces-style-guide"]');
    const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ? over(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 }; };
    const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    // The themes' icon colors, from probe elements stamped with each theme, as computed colors.
    const theme = (t) => { const s = document.createElement('span'); s.dataset.theme = t; card.append(s); s.style.color = 'var(--p3-ok-icon)'; const ok = parse(getComputedStyle(s).color); s.style.color = 'var(--p3-bad-icon)'; const bad = parse(getComputedStyle(s).color); s.remove(); return { ok, bad }; };
    const T = { light: theme('light'), dark: theme('dark') };
    return [...card.querySelectorAll('.sg-ratio-mk')].map((mk) => {
      const kind = mk.closest('[data-below="true"]') ? 'bad' : 'ok';
      const g = groundOf(mk);
      const col = parse(getComputedStyle(mk).color);
      const badge = parse(getComputedStyle(mk.closest('.sg-ratio')).color);
      const best = Math.max(ratio(T.light[kind], g), ratio(T.dark[kind], g));
      return { kind, stamped: mk.dataset.theme ?? null, r: ratio(col, g), best, other: mk.dataset.theme ? ratio(T[mk.dataset.theme === 'light' ? 'dark' : 'light'][kind], g) : null,
        themed: mk.dataset.theme ? Math.abs(ratio(col, T[mk.dataset.theme][kind]) - 1) < 0.01 : null, ink: Math.abs(ratio(col, badge) - 1) < 0.01, dark: lum(g) < 0.18 };
    });
  };
  let states = 0, stamped = 0, fallback = 0, onDark = 0, onLight = 0;
  const bad = [];
  for (const mode of ['light', 'dark']) {
    await showMode(page, mode);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="surface-base-pick"]'));
    await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
    const steps = await page.locator('[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"]').evaluateAll((ns) => ns.map((n) => n.dataset.step));
    ok(steps.length >= 12 && steps.includes('white') && steps.includes('black'), `QA-I2 sweep: previewing ${mode}, the Page picker offers white, the neutral steps and black (${steps.length})`);
    for (const st of steps) {
      await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"][data-step="${st}"]`));
      await page.waitForFunction((k) => document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"] [aria-pressed="true"]')?.dataset.step === k, st, { timeout: 5000 }).catch(() => {});
      const ms = await page.evaluate(MARKS);
      states++;
      for (const m of ms) {
        if (m.stamped) {
          stamped++; if (m.dark) onDark++; else onLight++;
          if (!(m.themed && m.r >= 3 && m.r + 1e-6 >= m.other)) bad.push(`${mode} Page ${st}: a ${m.kind} mark themed ${m.stamped} reads ${m.r.toFixed(2)}:1 on its ground (the other theme ${m.other?.toFixed(2)}:1, drawn in its theme's color: ${m.themed})`);
        } else {
          fallback++;
          if (!(m.ink && m.best < 3)) bad.push(`${mode} Page ${st}: a ${m.kind} mark left unthemed ${m.ink ? '' : 'is not in the badge ink, and '}where a theme reaches ${m.best.toFixed(2)}:1`);
        }
      }
    }
    await page.keyboard.press('Escape');
  }
  console.log(`  QA-I2 sweep: ${states} Page states, ${stamped} themed marks (${onLight} on light grounds, ${onDark} on dark), ${fallback} in the badge ink`);
  ok(states >= 24 && stamped > 0 && onDark > 0 && onLight > 0, `QA-I2 sweep: the Page sweep met themed marks on light and on dark grounds (${states} states, ${onLight} light, ${onDark} dark)`);
  ok(bad.length === 0, `QA-I2 sweep: every badge mark on Surfaces & fills reads at 3:1 or more in the better chrome theme's status icon color, or keeps the badge's ink where neither theme reaches 3:1${bad.length ? ` — ${bad.slice(0, 3).join(' | ')} (${bad.length} in all)` : ''}`);
  ok(errors.length === 0, `QA-I2 sweep: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
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

// =============================================================================================
// 19. S5.2: Color › Interactive — specimens on the page color, levers and rows represented, every column in
//     order, jump links, the Text row against the emission, ratio badges, the previewed mode, the chrome
// =============================================================================================
console.log(`\nColor › Interactive (S5.2)\n${'='.repeat(78)}`);
/** EXPECTED, by name (represented, not counted; docs/34): the preview's specimen roots, each a section on the
 *  brand's page color. Literal: the shared Interactive and Disabled sections (Q32), and Links. No Icons section
 *  since S5.3 (the owner's QA-I10). */
const EXPECT_INTERACTIVE_SPECIMENS = ['Interactive', 'Disabled', 'Links'];
/** The manifest keys v6 homes on Interactive, with their hooks. R2: every lever on this page is shown (the floor
 *  chips, `disabledMin`, while the Full contrast switch is off, which it is on the example brands). `iconContrast`
 *  left in S5.3 (QA-I10). */
const INTERACTIVE_LEVERS = ['actionPalette', 'outlineInteraction', 'neutralEmphasis', 'interactivePalettes', 'strictInteractiveContrast',
  'linkPalette', 'linkStateRungs', 'disabledStrategy', 'disabledMin'].map((k) => [k, `[data-p3="${kebabHook(k)}"]`]);
/** The columns the default theme ships, in the owner's order (Q33): Primary, Neutral, Destructive. */
const INTERACTIVE_COLUMNS = [['primary', 'Primary'], ['neutral', 'Neutral'], ['destructive', 'Destructive']];
/** Every row a column draws under the default theme's outline hover (overlay-neutral: the overlay wash, no
 *  subtle tint), typed out per family and state; then the four link families' resting link. Literal (Q33). */
const COLUMN_ROWS = (c) => [
  ...['fill', 'text', 'border'].flatMap((f) => [`interactive.${c}.${f}`, `inverse.interactive.${c}.${f}`]).flatMap((p) => [`${p}.rest`, `${p}.hover`, `${p}.pressed`]),
  `interactive.${c}.overlay.hover`, `interactive.${c}.overlay.pressed`, `interactive.${c}.on-fill`, `inverse.interactive.${c}.on-fill`,
];
const INTERACTIVE_ROW_ROLES = [...INTERACTIVE_COLUMNS.flatMap(([c]) => COLUMN_ROWS(c)),
  'text.link.default', 'inverse.text.link.default', 'icon.link.default', 'inverse.icon.link.default'];
ok(INTERACTIVE_ROW_ROLES.length === 3 * 22 + 4, `the literal row list names ${INTERACTIVE_ROW_ROLES.length} rows (3 columns × 22, and 4 link families)`);
/** THE ORACLE for a role in a mode, from the committed emission, never from the page: its hex (an 8-digit hex
 *  for a wash), the contrast the engine measured, and what it measured it against. */
const EMIT = (() => {
  const out = join(REPO, 'packages/engine/out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const leafAt = (path) => path.split('.').reduce((n, k) => n?.[k], base);
  const hexOf = (path, seen = 0) => {
    const v = leafAt(path)?.$value;
    if (typeof v !== 'string' || seen > 20) return null;
    const m = /^\{(.+)\}$/.exec(v);
    return m ? hexOf(m[1], seen + 1) : v.toLowerCase();
  };
  return (mode, role) => {
    const leaf = leafAt(`${root}.color.${role}`);
    const x = leaf?.$extensions?.prism3;
    const at = mode === 'light' ? x : x?.modes?.[mode];
    if (!at) return null;
    return { hex: at.aliasOf ? hexOf(at.aliasOf) : (leaf.$value ?? '').toLowerCase(), contrast: at.contrast, against: at.against, min: at.min };
  };
})();
ok(/^#[0-9a-f]{6}$/.test(EMIT('dark', 'interactive.primary.text.hover')?.hex ?? '') && /^#[0-9a-f]{8}$/.test(EMIT('light', 'interactive.primary.overlay.hover')?.hex ?? ''),
  `the oracle resolves a role and a wash per mode from the emission (${EMIT('dark', 'interactive.primary.text.hover')?.hex}, ${EMIT('light', 'interactive.primary.overlay.hover')?.hex})`);
/** Composite an `#rrggbb[aa]` over an opaque `#rrggbb`, as a hex. */
const overHex = (fg, bg) => {
  const p = (h, i) => parseInt(h.slice(i, i + 2), 16);
  const a = fg.length === 9 ? p(fg, 7) / 255 : 1;
  return `#${[1, 3, 5].map((i) => Math.round(p(fg, i) * a + p(bg, i) * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
};
/** A computed CSS color as `#rrggbb[aa]`. */
const cssHex = (s) => {
  const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim());
  if (!m) return null;
  const v = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  const h = v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  return `#${h}${v.length > 3 && v[3] < 1 ? Math.round(v[3] * 255).toString(16).padStart(2, '0') : ''}`;
};
const groundsIn = (page, hostHook) => page.evaluate((hk) => {
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ?? { r: 255, g: 255, b: 255, a: 1 }; };
  const hex = (c) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  const host = document.querySelector(`[data-p3="preview-body"] [data-p3="${hk}"]`);
  const grounds = [...(host?.querySelectorAll('.sg-ground') ?? [])];
  return { card: host ? hex(groundOf(host)) : null, roots: grounds.map((g) => ({ name: g.closest('.psec')?.querySelector('.psec-t')?.textContent ?? '?', root: g.getAttribute('data-p3') === 'specimen', ground: hex(groundOf(g)) })) };
}, hostHook);
const chooseMode = async (page, mode) => {
  await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
  await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
};
// Specimen grounds: both hosts, both chrome themes, every mode.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'color-interactive');
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await chooseMode(page, mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await groundsIn(page, 'interactive-style-guide');
        const want = EMITTED[mode];
        for (const name of EXPECT_INTERACTIVE_SPECIMENS) {
          const r = g.roots.find((x) => x.name === name);
          ok(!!r && r.root && r.ground === want, `specimen ground: interactive ${where}: ${name} is a specimen root on background.primary ${want}${
            !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== want ? ` — ${r.ground === g.card ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
        }
        const unlisted = g.roots.filter((x) => !EXPECT_INTERACTIVE_SPECIMENS.includes(x.name)).map((x) => x.name);
        ok(unlisted.length === 0, `specimen ground: interactive ${where}: every section ground drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
      }
    } catch (e) {
      ok(false, `S5.2 specimen grounds ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
for (const [key, hk] of INTERACTIVE_LEVERS) ok(!!manifest.levers.find((l) => l.key === key), `the manifest has the Interactive lever ${key} (${hooks.role(hk)})`);
// Represented: each lever once, every row by its literal role once, nothing else; no Show advanced; the columns
// in order in the levers, the jump links and the preview; each jump link lands on its own group.
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'color-interactive');
    const c = await page.evaluate(([lh, roles]) => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const shown = (n) => !!n && n.getClientRects().length > 0;
      return {
        levers: Object.fromEntries(lh.map((hk) => [hk, pane.querySelectorAll(hk).length])),
        visible: Object.fromEntries(lh.map((hk) => [hk, shown(pane.querySelector(hk))])),
        rows: Object.fromEntries(roles.map((r) => [r, pane.querySelectorAll(`.p3-fillrow[data-role="${r}"]`).length])),
        strayLevers: [...pane.querySelectorAll('.p3-lever')].map((n) => n.getAttribute('data-p3')).filter((r) => !lh.includes(`[data-p3="${r}"]`)),
        strayRows: [...pane.querySelectorAll('.p3-fillrow')].map((n) => n.dataset.role).filter((r) => !roles.includes(r)),
        advanced: [...pane.querySelectorAll('button, a, [role="button"]')].filter((b) => /advanced/i.test(`${b.textContent} ${b.getAttribute('data-p3') ?? ''} ${b.getAttribute('aria-label') ?? ''}`)).map((b) => b.textContent.trim()),
        columns: [...pane.querySelectorAll('[data-p3="interactive-column"]')].map((n) => [n.dataset.column, n.querySelector('.p3-icol-title')?.textContent]),
        jumps: [...pane.querySelectorAll('[data-p3="interactive-jump-link"]')].map((a) => {
          const to = a.hash ? document.getElementById(a.hash.slice(1)) : null;
          return { col: a.dataset.column, text: a.textContent, target: to ? [to.getAttribute('data-p3'), to.dataset.column, to.querySelector('.p3-icol-title')?.textContent] : null };
        }),
        preview: [...document.querySelectorAll('[data-p3="interactive-style-guide"] [data-p3="style-guide-palette"] .sg-rn')].map((n) => n.textContent).filter((t) => t !== 'Disabled'),
      };
    }, [INTERACTIVE_LEVERS.map(([, hk]) => hk), INTERACTIVE_ROW_ROLES]);
    for (const [key, hk] of INTERACTIVE_LEVERS) ok(c.levers[hk] === 1 && c.visible[hk], `${host}: Interactive lever ${key} renders its hook ${hooks.role(hk)} once, shown — rendered ${c.levers[hk]}, shown ${c.visible[hk]}`);
    const missing = INTERACTIVE_ROW_ROLES.filter((r) => c.rows[r] !== 1);
    ok(missing.length === 0, `${host}: Interactive renders each of its ${INTERACTIVE_ROW_ROLES.length} rows once${missing.length ? ` — levers rows lack ${missing.map((r) => `${r} (${c.rows[r]})`).join(', ')}` : ''}`);
    ok(c.strayLevers.length === 0, `${host}: every lever block on Interactive is one of its ${INTERACTIVE_LEVERS.length} keys${c.strayLevers.length ? ` — unclassified lever ${c.strayLevers.join(', ')}` : ''}`);
    ok(c.strayRows.length === 0, `${host}: every row on Interactive is a listed role${c.strayRows.length ? ` — unlisted row ${c.strayRows.join(', ')}` : ''}`);
    ok(c.advanced.length === 0, `${host}: Color › Interactive shows every lever: it offers no Show advanced${c.advanced.length ? ` — offers Show advanced (${c.advanced.join(', ')})` : ''}`);
    const wantCols = INTERACTIVE_COLUMNS.map(([col, name]) => [col, name]);
    ok(JSON.stringify(c.columns) === JSON.stringify(wantCols), `${host}: the levers draw the columns in the owner's order, Primary, Neutral, Destructive (Q33) — drew ${JSON.stringify(c.columns)}`);
    ok(JSON.stringify(c.preview) === JSON.stringify(INTERACTIVE_COLUMNS.map(([, n]) => n)), `${host}: the preview draws the columns in the same order — drew ${JSON.stringify(c.preview)}`);
    ok(JSON.stringify(c.jumps.map((j) => j.col)) === JSON.stringify(INTERACTIVE_COLUMNS.map(([col]) => col)), `${host}: a jump link per column, in order — ${JSON.stringify(c.jumps.map((j) => j.col))}`);
    for (const j of c.jumps) ok(!!j.target && j.target[0] === 'interactive-column' && j.target[1] === j.col && j.target[2] === j.text,
      `${host}: the jump link "${j.text}" resolves to its own column group (${j.col}) — targets ${JSON.stringify(j.target)}`);
    // Following a link moves focus to the group it names, and leaves the preview where it was (V1).
    const view0 = (await previewView(page)).view;
    for (const [col] of INTERACTIVE_COLUMNS.slice().reverse()) {
      await hooks.click(page.locator(`[data-p3="interactive-jump-link"][data-column="${col}"]`));
      const f = await page.evaluate(() => ({ hook: document.activeElement?.getAttribute('data-p3'), col: document.activeElement?.dataset.column }));
      ok(f.hook === 'interactive-column' && f.col === col, `${host}: following the ${col} jump link focuses its group (${JSON.stringify(f)})`);
    }
    ok((await previewView(page)).view === view0, `V1: ${host} following a jump link never moves the preview's home (${view0})`);
    ok(errors.length === 0, `${host} Interactive levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S5.2 represented ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// The Text row (Q32), on Interactive and on Brand's Style guide, against the emission: per column and state the
// ink is `interactive.‹c›.text.‹s›`, there is no edge, and the ground is the outline hover wash (none at rest).
// Then every ratio badge on the page against the engine's own measured contrast.
const readTextRows = (page, hostHook) => page.evaluate((hk) => [...document.querySelectorAll(`[data-p3="${hk}"] [data-p3="style-guide-palette"]`)].map((b) => {
  const row = b.querySelector('[data-p3="style-guide-text"]');
  return { name: b.querySelector('.sg-rn')?.textContent, buttons: row ? [...row.querySelectorAll('[data-p3="style-guide-button"]')].map((x) => { const cs = getComputedStyle(x); return { ink: cs.color, bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor }; }) : null };
}).filter((x) => x.name !== 'Disabled'), hostHook);
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    for (const [place, hk, label] of [['color-interactive', 'interactive-style-guide', 'color-interactive'], ['brand', 'brand-style-guide', 'brand']]) {
      await goPlace(page, place);
      for (const mode of host === 'web' ? ['light', 'dark', 'hc-light', 'hc-dark'] : ['light', 'dark']) {
        await chooseMode(page, mode);
        const rows = await readTextRows(page, hk);
        const page0 = EMITTED[mode];
        for (const [col, name] of INTERACTIVE_COLUMNS) {
          const r = rows.find((x) => x.name === name);
          if (!r?.buttons) { ok(false, `text buttons: ${label} ${col} has no Text row (${host}, ${mode})`); continue; }
          ok(r.buttons.length === 3, `text buttons: ${label} ${col} draws rest, hover and pressed (${r.buttons.length}, ${host}, ${mode})`);
          ['rest', 'hover', 'pressed'].forEach((st, i) => {
            const b = r.buttons[i];
            if (!b) return;
            const ink = EMIT(mode, `interactive.${col}.text.${st}`)?.hex;
            ok(cssHex(b.ink) === ink, `text button ${label} ${col}/${st} (${host}, ${mode}): ink ${cssHex(b.ink)}, emitted interactive.${col}.text.${st} ${ink}`);
            const edge = cssHex(b.bc);
            ok(parseFloat(b.bw) === 0 || (edge?.length === 9 && edge.endsWith('00')), `text button ${label} ${col}/${st} (${host}, ${mode}): draws no edge${parseFloat(b.bw) === 0 || edge?.endsWith('00') ? '' : ` — text button ${col}/${st} draws an edge (${b.bw} ${edge})`}`);
            const wash = st === 'rest' ? null : EMIT(mode, `interactive.${col}.overlay.${st}`)?.hex;
            const got = cssHex(b.bg);
            const drawn = got ? overHex(got.length === 7 ? `${got}ff` : got, page0) : null;
            const want = wash ? overHex(wash, page0) : page0;
            ok(drawn === want, `text button ${label} ${col}/${st} (${host}, ${mode}): its ground over the page is ${drawn}; the emitted ${wash ? `interactive.${col}.overlay.${st} ${wash}` : 'page (no wash at rest)'} over ${page0} is ${want}`);
          });
        }
        if (place !== 'color-interactive') continue;
        // Ratio badges: each one's number is the engine's own measured contrast for its role in this mode.
        const badges = await page.evaluate(() => [...document.querySelectorAll('[data-p3="interactive-style-guide"] [data-p3="ratio-badge"]')].map((n) => [n.dataset.role, n.querySelector('.sg-ratio-n')?.textContent]));
        const off = badges.filter(([role, txt]) => { const e = EMIT(mode, role); return !e || typeof e.contrast !== 'number' || Math.abs(parseFloat(txt) - e.contrast) > 0.011; });
        ok(badges.length >= 60 && off.length === 0, `ratio badges (${host}, ${mode}): ${badges.length} badges each print the emission's measured contrast for their role (floor 60)${off.length ? ` — ${off.slice(0, 4).map(([r, t]) => `${r} ${t} vs ${EMIT(mode, r)?.contrast}`).join(' | ')}` : ''}`);
      }
    }
    ok(errors.length === 0, `${host} text buttons: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S5.2 text buttons ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Edits: a row edits the previewed mode (Q34): Light writes the column's own field, Dark writes modeAnchors and
// leaves Light's alone; the picker opens under its row on its step, a pick writes and keeps focus, the preview
// repaints to the emission's step, Return to Auto reverts, Escape closes to its button. A derived mode is
// read-only. The link palette's Auto unsets the key; an accent column appears last, in the levers and the preview.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'color-interactive');
    const view0 = (await previewView(page)).view;
    const pick = (role) => page.locator(`[data-p3="levers-pane"] [data-p3="int-pick"][data-role="${role}"]`);
    const filledRest = () => page.evaluate(() => { const b = [...document.querySelectorAll('[data-p3="interactive-style-guide"] [data-p3="style-guide-palette"]')].find((x) => x.querySelector('.sg-rn')?.textContent === 'Primary')?.querySelector('[data-p3="style-guide-button"]'); return b ? getComputedStyle(b).backgroundColor : null; });
    await hooks.click(pick('interactive.primary.fill.rest'));
    await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
    const o = await page.evaluate(() => { const pk = document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"]'); return { under: pk?.closest('.p3-fillrow-wrap')?.querySelector('.p3-fillrow')?.dataset.role, focus: document.activeElement?.dataset.step ?? null, pressed: pk?.querySelector('[aria-pressed="true"]')?.dataset.step ?? null }; });
    ok(o.under === 'interactive.primary.fill.rest' && o.pressed === '600' && o.focus === '600', `interactive: the primary fill's picker opens under its row on its step, primary 600, focused (${JSON.stringify(o)})`);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="700"]'));
    await page.waitForFunction(() => /Override/.test(document.querySelector('[data-p3="int-pick"][data-role="interactive.primary.fill.rest"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const p1 = await persisted(page);
    const f1 = await page.evaluate(() => ({ focus: document.activeElement?.dataset.step ?? null, open: !!document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"]') }));
    ok(p1?.actionAnchorStep === 700 && p1?.modeAnchors === undefined && f1.focus === '700' && f1.open, `interactive: in Light, primary 700 writes actionAnchorStep 700 and no modeAnchors, the picker kept open on 700 (${JSON.stringify({ a: p1?.actionAnchorStep, m: p1?.modeAnchors, ...f1 })})`);
    ok(await filledRest() === rgbOf(palHex('primary', '700')), `interactive: the preview's primary Filled rest repaints to the emission's primary 700 ${palHex('primary', '700')} (${await filledRest()})`);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-auto"]'));
    await page.waitForFunction(() => /^Auto/.test(document.querySelector('[data-p3="int-pick"][data-role="interactive.primary.fill.rest"]')?.textContent?.trim() ?? ''), null, { timeout: 5000 }).catch(() => {});
    ok((await persisted(page))?.actionAnchorStep === undefined && await filledRest() === rgbOf(palHex('primary', '600')), `interactive: Return to Auto clears the anchor and the fill is the emission's primary 600 again (${await filledRest()})`);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="levers-pane"] [data-p3="step-picker"]'), focus: document.activeElement?.getAttribute('data-p3'), role: document.activeElement?.dataset.role }));
    ok(!closed.open && closed.focus === 'int-pick' && closed.role === 'interactive.primary.fill.rest', `interactive: Escape closes the picker to its button (${JSON.stringify(closed)})`);
    // Q34: previewing Dark, the same row writes Dark's anchor and leaves Light's field alone.
    await chooseMode(page, 'dark');
    const line = await page.evaluate(() => document.querySelector('[data-p3="interactive-columns"] .p3-sub')?.textContent);
    ok(line === 'Editing Dark, the mode the preview shows.', `interactive: the columns say which mode they edit ("${line}")`);
    await hooks.click(pick('interactive.primary.fill.rest'));
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][data-step="400"]'));
    await page.waitForFunction(() => /Override/.test(document.querySelector('[data-p3="int-pick"][data-role="interactive.primary.fill.rest"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const p2 = await persisted(page);
    ok(JSON.stringify(p2?.modeAnchors) === '{"dark":{"primary":400}}' && p2?.actionAnchorStep === undefined,
      `interactive: previewing Dark, primary 400 writes modeAnchors.dark.primary and not the light anchor (Q34) — wrote modeAnchors ${JSON.stringify(p2?.modeAnchors)}, actionAnchorStep ${p2?.actionAnchorStep}`);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-auto"]'));
    await page.waitForFunction(() => /^Auto/.test(document.querySelector('[data-p3="int-pick"][data-role="interactive.primary.fill.rest"]')?.textContent?.trim() ?? ''), null, { timeout: 5000 }).catch(() => {});
    ok((await persisted(page))?.modeAnchors === undefined, `interactive: Auto in Dark prunes modeAnchors (${JSON.stringify((await persisted(page))?.modeAnchors)})`);
    await page.keyboard.press('Escape');
    // A derived mode is read-only, every lever (Q59): held in its own case below, every derived mode.
    await chooseMode(page, 'light');
    // The link palette: neutral writes it; Auto unsets it (Q36); the WCAG 1.4.1 warning follows the engine's note.
    const lp = page.locator('[data-p3="link-palette-select"]');
    ok((await lp.inputValue()) === '' && (await lp.locator('option').first().textContent()) === 'Auto: follows action palette', `interactive: the link palette starts on "Auto: follows action palette" (${await lp.inputValue()})`);
    await lp.selectOption('neutral');
    await page.waitForFunction(() => !!document.querySelector('[data-p3="link-palette-warning"]'), null, { timeout: 5000 }).catch(() => {});
    const warn = await page.evaluate(() => document.querySelector('[data-p3="link-palette-warning"]')?.textContent ?? null);
    ok((await persisted(page))?.linkPalette === 'neutral' && /WCAG 1\.4\.1/.test(warn ?? ''), `interactive: a neutral link palette is written and warns for WCAG 1.4.1 ("${warn}")`);
    await lp.selectOption('');
    await page.waitForFunction(() => !document.querySelector('[data-p3="link-palette-warning"]'), null, { timeout: 5000 }).catch(() => {});
    const p3 = await persisted(page);
    ok(p3 && !('linkPalette' in p3), `interactive: Auto unsets linkPalette rather than writing a palette's name (Q36) — persisted linkPalette ${JSON.stringify(p3?.linkPalette)}`);
    // The strict switch: on writes true, off unsets the key.
    await hooks.click(page.locator('[data-p3="strict-contrast-switch"]'));
    const s1 = (await persisted(page))?.strictInteractiveContrast;
    await hooks.click(page.locator('[data-p3="strict-contrast-switch"]'));
    const s2 = await persisted(page);
    ok(s1 === true && s2 && !('strictInteractiveContrast' in s2), `interactive: the strict switch writes true, and off unsets the key (${s1}, then ${JSON.stringify(s2?.strictInteractiveContrast)})`);
    // An accent column: promoted, it is last in the levers, the jump links and the preview; removed, it is gone.
    await hooks.click(page.locator('[data-p3="column-add-open"]'));
    await page.locator('[data-p3="column-promote-select"]').selectOption('accent');
    await hooks.click(page.locator('[data-p3="column-promote"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="interactive-column"][data-column="accent"]'), null, { timeout: 5000 }).catch(() => {});
    const acc = await page.evaluate(() => ({
      levers: [...document.querySelectorAll('[data-p3="interactive-column"]')].map((n) => n.dataset.column),
      jumps: [...document.querySelectorAll('[data-p3="interactive-jump-link"]')].map((n) => n.dataset.column),
      preview: [...document.querySelectorAll('[data-p3="interactive-style-guide"] [data-p3="style-guide-palette"] .sg-rn')].map((n) => n.textContent).filter((t) => t !== 'Disabled'),
    }));
    ok(JSON.stringify(acc) === JSON.stringify({ levers: ['primary', 'neutral', 'destructive', 'accent'], jumps: ['primary', 'neutral', 'destructive', 'accent'], preview: ['Primary', 'Neutral', 'Destructive', 'Accent'] }),
      `interactive: a promoted accent is the last column in the levers, the jump links and the preview (Q33, Q39) — ${JSON.stringify(acc)}`);
    await hooks.click(page.locator('[data-p3="interactive-column"][data-column="accent"] [data-p3="column-remove"]'));
    await page.waitForFunction(() => !document.querySelector('[data-p3="interactive-column"][data-column="accent"]'), null, { timeout: 5000 }).catch(() => {});
    ok((await persisted(page))?.interactivePalettes === undefined, `interactive: Remove button set takes the accent out (${JSON.stringify((await persisted(page))?.interactivePalettes)})`);
    ok((await previewView(page)).view === view0, `V1 edit: Interactive's edits never move the preview's home (${view0})`);
    ok(errors.length === 0, `interactive edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S5.2 Interactive edits: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Owner copy (Q51, Q53, Q58, Q57, APPROVED, literal): the lever sections are the preview's, in its order; the
// button-set strings; the Links and Icons descriptions, the same in the levers and the preview.
const EXPECT_INTERACTIVE_SECTIONS = [
  ['Interactive', 'Each button set is a full set of fill, text, border and state colors.'],
  ['Disabled', 'One shared, stateless inert set — reused by every control. No per-palette or inverse variant.'],
  ['Links', 'The link color in each state, on the page and on the inverse fill.'],
];
/** Which section each lever sits in (Q51), by hook. */
const EXPECT_LEVER_SECTION = [['actionPalette', 'Interactive'], ['outlineInteraction', 'Interactive'], ['neutralEmphasis', 'Interactive'],
  ['interactivePalettes', 'Interactive'], ['strictInteractiveContrast', 'Interactive'], ['disabledStrategy', 'Disabled'], ['disabledMin', 'Disabled'],
  ['linkPalette', 'Links'], ['linkStateRungs', 'Links']];
const EVERY_SET = 'Every button set is shown, including ones you added.';
const ADD_SET_HINT = 'Add a brand color on Palettes to use it for another button set.';
/** Every mode on the page by its picker: a radio where they fit, else the select of the same modes. */
const chooseAnyMode = async (page, mode) => {
  const radio = page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`);
  if (await radio.count() && await radio.isVisible()) await hooks.click(radio);
  else await page.locator('[data-p3="mode-select"]').selectOption(mode);
  await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true'
    || document.querySelector('[data-p3="mode-select"]')?.value === m, mode);
};
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'color-interactive');
    const copy = await page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const secs = [...pane.querySelectorAll('[data-p3="lever-section"]')];
      const prev = (t) => [...document.querySelectorAll('[data-p3="interactive-style-guide"] .psec')].find((s) => s.querySelector('.psec-t')?.textContent === t)?.querySelector('.psec-d')?.textContent ?? null;
      return {
        sections: secs.map((s) => [s.querySelector('.p3-lsec-title')?.textContent, s.querySelector('.p3-lsec-desc')?.textContent ?? null]),
        leverIn: Object.fromEntries([...pane.querySelectorAll('.p3-lever')].map((n) => [n.getAttribute('data-p3'), n.closest('[data-p3="lever-section"]')?.querySelector('.p3-lsec-title')?.textContent])),
        preview: { Links: prev('Links'), Disabled: prev('Disabled'), Interactive: prev('Interactive') },
        previewTitles: [...document.querySelectorAll('[data-p3="interactive-style-guide"] .psec-t')].map((n) => n.textContent),
        landmark: pane.querySelector('[data-p3="interactive-jump"]')?.getAttribute('aria-label'),
        add: pane.querySelector('[data-p3="column-add-open"]')?.textContent?.trim() ?? null,
        // The button sets lever's info toggletip, the text its own info button controls (`aria-controls`).
        setsTip: (() => {
          const info = pane.querySelector('[data-p3="lever-interactive-palettes"] [data-p3="lever-info"]');
          const id = info?.getAttribute('aria-controls');
          return id ? document.getElementById(id)?.textContent ?? null : null;
        })(),
        // The page's own copy and the preview's, with the manifest's descriptions (`.p3-tip`, engine prose) left out.
        visible: [...pane.querySelectorAll('.p3-lsec, .p3-intro, .p3-jump'), document.querySelector('[data-p3="interactive-style-guide"]')].map((n) => {
          const c = n.cloneNode(true); for (const t of c.querySelectorAll('.p3-tip')) t.remove();
          return `${c.textContent} ${[...c.querySelectorAll('[aria-label], [title]')].map((x) => `${x.getAttribute('aria-label') ?? ''} ${x.getAttribute('title') ?? ''}`).join(' ')}`;
        }).join(' ') + ` ${pane.querySelector('[data-p3="interactive-jump"]')?.getAttribute('aria-label') ?? ''}`,
      };
    });
    ok(JSON.stringify(copy.sections) === JSON.stringify(EXPECT_INTERACTIVE_SECTIONS),
      `Q51: Interactive's lever sections are the preview's, Interactive, Disabled, Links, with their approved copy — drew ${JSON.stringify(copy.sections)}`);
    // Q23 and QA-I10 (S5.3): the preview's sections are the levers' sections, one for one, Icons in neither.
    ok(JSON.stringify(copy.previewTitles) === JSON.stringify(EXPECT_INTERACTIVE_SECTIONS.map(([t]) => t)),
      `Q23: the Interactive preview's sections are the levers' sections, Icons in neither (QA-I10) — the preview drew ${JSON.stringify(copy.previewTitles)}`);
    for (const [key, sec] of EXPECT_LEVER_SECTION) ok(copy.leverIn[kebabHook(key)] === sec, `Q51: the ${key} lever sits in ${sec} (sits in ${copy.leverIn[kebabHook(key)]})`);
    for (const t of ['Links', 'Disabled']) {
      const want = EXPECT_INTERACTIVE_SECTIONS.find(([n]) => n === t)[1];
      ok(copy.preview[t] === want, `Q23: the preview's ${t} description is the levers' ("${copy.preview[t]}")`);
    }
    ok((copy.preview.Interactive ?? '').endsWith(` ${EVERY_SET}`), `Q53: the preview's Interactive description ends "${EVERY_SET}" ("${copy.preview.Interactive}")`);
    ok(copy.landmark === 'Button sets', `Q53: the jump links' landmark is "Button sets" ("${copy.landmark}")`);
    // The button sets lever's info text is the owner's (approved verbatim, 2026-10-02), the Studio's own for this
    // page; the engine's description (which says "columns") stays as MCP and the emission read it. Literal.
    ok(copy.setsTip === 'Add a button set from any brand color on Palettes. Each set gets fill, text, border and state colors in every mode.', `Q53: the button sets lever's info text is the owner's — read ${JSON.stringify(copy.setsTip)}`);
    ok(copy.add === 'Add button set', `Q53: the add row reads "Add button set" (${JSON.stringify(copy.add)})`);
    const stray = ['column', 'band', 'muted'].filter((w) => new RegExp(`\\b${w}`, 'i').test(copy.visible.replace(/\b(?:interactive|inverse)\.[\w.-]+/g, '')));
    ok(stray.length === 0, `Q53, Q57, Q58: no "column", "band" or "muted" in the page's visible copy, labels and titles (the manifest's lever descriptions aside)${stray.length ? ` — found ${stray.join(', ')}` : ''}`);

    // Q54: a button set is added and removed in every editable mode, and the write is mode-independent: added while
    // previewing Dark, the persisted brand is byte-identical to the same add from Light.
    const addSet = async () => {
      await hooks.click(page.locator('[data-p3="column-add-open"]'));
      await page.locator('[data-p3="column-promote-select"]').selectOption('accent');
      await hooks.click(page.locator('[data-p3="column-promote"]'));
      await page.waitForFunction(() => !!document.querySelector('[data-p3="interactive-column"][data-column="accent"]'), null, { timeout: 5000 }).catch(() => {});
      return JSON.stringify(await persisted(page));
    };
    const removeSet = async () => {
      await hooks.click(page.locator('[data-p3="interactive-column"][data-column="accent"] [data-p3="column-remove"]'));
      await page.waitForFunction(() => !document.querySelector('[data-p3="interactive-column"][data-column="accent"]'), null, { timeout: 5000 }).catch(() => {});
      return JSON.stringify(await persisted(page));
    };
    const before = JSON.stringify(await persisted(page));
    const fromLight = await addSet();
    const rm = await page.evaluate(() => { const b = document.querySelector('[data-p3="interactive-column"][data-column="accent"] [data-p3="column-remove"]'); return { text: b?.textContent?.trim() ?? null, label: b?.getAttribute('aria-label') ?? null }; });
    ok(rm.text === 'Remove button set' && rm.label === 'Remove the Accent button set', `Q53: remove reads "Remove button set", named "Remove the Accent button set" (${JSON.stringify(rm)})`);
    const hint = await page.evaluate(() => ({ select: !!document.querySelector('[data-p3="column-promote-select"]'), hint: document.querySelector('[data-p3="column-promote-hint"]')?.textContent ?? null }));
    ok(!hint.select && hint.hint === ADD_SET_HINT, `Q53: with nothing left to add, the hint reads "${ADD_SET_HINT}" (${JSON.stringify(hint)})`);
    const lightRemoved = await removeSet();
    await chooseAnyMode(page, 'dark');
    const darkCtl = await page.evaluate(() => { const b = document.querySelector('[data-p3="column-add-open"]'); return { add: !!b && b.getClientRects().length > 0 && !b.disabled }; });
    ok(darkCtl.add, `Q54: previewing Dark, Add button set is shown and enabled (${JSON.stringify(darkCtl)})`);
    const fromDark = await addSet();
    ok(fromDark === fromLight, `Q54: a button set added previewing Dark persists the same JSON as the same add from Light — Light ${fromLight}, Dark ${fromDark}`);
    const darkRm = await page.evaluate(() => { const b = document.querySelector('[data-p3="interactive-column"][data-column="accent"] [data-p3="column-remove"]'); return !!b && b.getClientRects().length > 0 && !b.disabled; });
    ok(darkRm, `Q54: previewing Dark, the added set offers Remove button set, enabled (${darkRm})`);
    const darkRemoved = await removeSet();
    ok(darkRemoved === lightRemoved && darkRemoved === before, `Q54: removed previewing Dark, the brand is the one removed from Light, and the one before the add (${darkRemoved})`);
    await chooseAnyMode(page, 'light');

    // Q59: in each derived mode every lever on the page is disabled, brand-wide ones included, under the derived
    // line. Enumerated from the DOM: every control in a lever section (`DERIVED_CONTROL_QUERY`, #1991) but the info toggletips.
    await goPlace(page, 'brand');
    await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="mode-option"][data-mode="wireframe"], [data-p3="mode-select"] option[value="wireframe"]'));
    await goPlace(page, 'color-interactive');
    const DERIVED = [['hc-light', 'HC light'], ['hc-dark', 'HC dark'], ['wireframe', 'Wireframe']];
    /** The floor on the controls a derived mode must hold disabled: the 3 built-in sets' pickers alone are 3 × 18. */
    const DERIVED_CONTROLS_FLOOR = 60;
    for (const [mode, label] of DERIVED) {
      await chooseAnyMode(page, mode);
      await page.waitForFunction((l) => document.querySelector('[data-p3="interactive-derived"]')?.textContent?.startsWith(l), label, { timeout: 5000 }).catch(() => {});
      const ctls = await page.evaluate(DERIVED_CONTROLS, ['[data-p3="levers-pane"] [data-p3="lever-section"]', DERIVED_CONTROL_QUERY]);
      const d = {
        n: ctls.length,
        enabled: ctls.filter((c) => !c.disabled).map((c) => c.hook),
        hooks: [...new Set(ctls.map((c) => c.hook))],
        line: await page.evaluate(() => document.querySelector('[data-p3="interactive-derived"]')?.textContent ?? null),
      };
      ok(d.line === `${label} is auto-derived — read-only. Edit Light or Dark and it follows.`, `Q59: previewing ${label}, the derived line shows ("${d.line}")`);
      ok(d.n >= DERIVED_CONTROLS_FLOOR && d.enabled.length === 0,
        `Q59: previewing ${label}, every control on Interactive is disabled (${d.n - d.enabled.length}/${d.n}, floor ${DERIVED_CONTROLS_FLOOR})${d.enabled.length ? ` — enabled ${[...new Set(d.enabled)].join(', ')}` : ''}`);
      for (const hk of ['action-palette-select', 'link-palette-select', 'strict-contrast-switch', 'disabled-full-switch', 'disabled-min-chips-3', 'neutral-emphasis-chips-subtle', 'link-rung-hover', 'column-add-open', 'int-pick'])
        ok(d.hooks.includes(hk), `Q59: previewing ${label}, the ${hk} control is among those held disabled`);
    }
    await chooseAnyMode(page, 'light');
    const back = await page.evaluate(() => ({ line: !!document.querySelector('[data-p3="interactive-derived"]'), sel: document.querySelector('[data-p3="action-palette-select"]')?.disabled }));
    ok(!back.line && back.sel === false, `Q59: back in Light, the derived line is gone and the levers are editable (${JSON.stringify(back)})`);
    ok(errors.length === 0, `interactive owner copy: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S5.2 owner copy: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// =============================================================================================
// 19b. S5.3: the Interactive page polish (the owner's QA, evening 2026-10-02: QA-I1 to QA-I10)
// =============================================================================================
console.log(`\nColor › Interactive polish (S5.3)\n${'='.repeat(78)}`);
/** THE ORACLE for the badge marks (QA-I2): the chrome's status icon tokens, read from the token tree the chrome is
 *  built from (`chrome/tokens.mjs` over the committed emission), for each chrome theme. Never the page's own
 *  `--p3-*` variables: the renderer is the subject. */
const STATUS = (() => {
  const m = loadModes();
  const hx = (tree, p) => String(resolveToken(tree, P(p)).value).toLowerCase();
  return { ok: [hx(m.light, 'color.icon.success'), hx(m.dark, 'color.icon.success')], bad: [hx(m.light, 'color.icon.danger'), hx(m.dark, 'color.icon.danger')] };
})();
ok(STATUS.ok.every((x) => /^#[0-9a-f]{6}$/.test(x)) && STATUS.bad.every((x) => /^#[0-9a-f]{6}$/.test(x)) && STATUS.ok[0] !== STATUS.bad[0],
  `QA-I2 oracle: the success and danger icon tokens resolve per chrome theme (ok ${STATUS.ok.join(' / ')}, bad ${STATUS.bad.join(' / ')})`);
/** QA-I7: the gap between two button sets, at least `space.500` (40px), one step past S5.2's `space.300` (24px). */
const SET_GAP_MIN = 40;
/** QA-I8, APPROVED verbatim: the switch's label and its caption in each state. */
const DISABLED_COPY = { label: 'Full contrast', on: 'Disabled controls keep full contrast.', off: 'Disabled controls drop to the floor you pick.' };
/** QA-I8: the two values the segmented control it replaces wrote, the manifest's option values, literal. */
const DISABLED_WRITES = { on: 'full', off: 'reduced' };
/** Every badge mark in the Interactive preview: its computed color, whether it marks a miss, and the composited
 *  ground under it. */
const readMarks = (page) => page.evaluate(() => {
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ?? { r: 255, g: 255, b: 255, a: 1 }; };
  const hex = (c) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  return [...document.querySelectorAll('[data-p3="interactive-style-guide"] [data-p3="ratio-badge"]')].flatMap((b) => {
    const mk = b.querySelector('.sg-ratio-mk');
    if (!mk) return [];
    return [{ role: b.dataset.role, below: b.dataset.below === 'true', color: hex(parse(getComputedStyle(mk).color)), ground: hex(groundOf(mk)), ink: hex(parse(getComputedStyle(b).color)) }];
  });
});
const lumHex = (hx) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; const n = (i) => parseInt(hx.slice(i, i + 2), 16); return 0.2126 * f(n(1)) + 0.7152 * f(n(3)) + 0.0722 * f(n(5)); };
const ratioHex = (a, b) => { const [x, y] = [lumHex(a), lumHex(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// The levers: the order of the page-wide settings (QA-I5), the neutral emphasis in the Neutral set (QA-I6), no Icons
// (QA-I10), the dashed connector (QA-I3), the spacing between sets (QA-I7), the add flow (QA-I4) and the Disabled
// switch (QA-I8), each against a literal written above or here. THE ORACLE for a write is the persisted brand.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'color-interactive');
    const stored = () => page.evaluate(() => localStorage.getItem('prism3:brandInput'));
    const lay = await page.evaluate((iconHook) => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const sec = pane.querySelector('[data-p3="lever-section"]');
      const top = [...sec.children].filter((n) => n.matches('.p3-lever')).map((n) => n.getAttribute('data-p3'));
      const neutral = pane.querySelector('[data-p3="interactive-column"][data-column="neutral"]');
      const kids = neutral ? [...neutral.children] : [];
      const groups = [...pane.querySelectorAll('[data-p3="interactive-column"]')].map((g) => g.getBoundingClientRect());
      const add = pane.querySelector('[data-p3="column-add"]')?.getBoundingClientRect();
      const states = pane.querySelector('[data-p3="int-row-states"]');
      return {
        top,
        neutralFirst: kids.findIndex((n) => n.matches('[data-p3="lever-neutral-emphasis"]')),
        neutralRows: kids.findIndex((n) => n.matches('.p3-fillrows')),
        icons: pane.querySelectorAll(`[data-p3="${iconHook}"]`).length,
        iconsTitle: [...pane.querySelectorAll('.p3-lsec-title')].some((t) => /^Icons?$/.test(t.textContent)),
        dashed: states ? getComputedStyle(states).borderLeftStyle : null,
        gaps: groups.slice(1).map((r, i) => r.top - groups[i].bottom),
        addGap: add && groups.length ? add.top - groups[groups.length - 1].bottom : null,
      };
    }, kebabHook('iconContrast'));
    ok(JSON.stringify(lay.top) === JSON.stringify(['lever-action-palette', 'lever-outline-interaction', 'lever-strict-interactive-contrast', 'lever-interactive-palettes']),
      `QA-I5: the strict switch sits with the page-wide settings, above the button sets — Interactive draws ${JSON.stringify(lay.top)}`);
    ok(lay.neutralFirst === 1 && lay.neutralRows > lay.neutralFirst, `QA-I6: the neutral emphasis opens the Neutral button set, under its heading and above its rows (at ${lay.neutralFirst}, rows at ${lay.neutralRows})`);
    hooks.absent(ok, { seen: lay.top.length > 0, state: "Interactive's levers" }, lay.icons === 0 && !lay.iconsTitle,
      `QA-I10: Interactive draws no icon contrast control and no Icons section (${lay.icons} ${kebabHook('iconContrast')}, Icons title ${lay.iconsTitle})`);
    ok(lay.dashed === 'dashed', `QA-I3: the line beside Hover and Pressed under a rest row is dashed (border-left-style ${lay.dashed})`);
    ok(lay.gaps.length >= 2 && lay.gaps.every((g) => g >= SET_GAP_MIN - 0.5), `QA-I7: button sets stand at least ${SET_GAP_MIN}px apart (${lay.gaps.map((g) => g.toFixed(1)).join(', ')})`);
    ok(lay.addGap !== null && lay.addGap > Math.max(...lay.gaps) + 0.5, `QA-I4: Add button set stands further from the last set than the sets stand from each other (${lay.addGap?.toFixed(1)} vs ${Math.max(...lay.gaps).toFixed(1)})`);

    // QA-I4: the color select only after Add button set is clicked; Cancel and Escape write nothing.
    const addState = () => page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const shown = (n) => !!n && n.getClientRects().length > 0;
      const open = pane.querySelector('[data-p3="column-add-open"]');
      const box = pane.querySelector('[data-p3="column-add"]');
      return {
        box: !!box, open: shown(open), openText: open?.textContent?.trim() ?? null, openDashed: open ? getComputedStyle(open).borderTopStyle : null,
        openFull: open && box ? Math.abs(open.getBoundingClientRect().width - box.getBoundingClientRect().width) <= 1 : false,
        select: shown(pane.querySelector('[data-p3="column-promote-select"]')), go: shown(pane.querySelector('[data-p3="column-promote"]')),
        label: [...pane.querySelectorAll('[data-p3="column-add-form"] label')].map((l) => l.textContent),
        focus: document.activeElement?.getAttribute('data-p3') ?? null,
      };
    });
    const before = await stored();
    const a0 = await addState();
    hooks.absent(ok, { seen: a0.box, state: 'the add row' }, !a0.select && !a0.go, `QA-I4: before Add button set is clicked, the color select is not shown (${JSON.stringify(a0)})`);
    ok(a0.openText === 'Add button set' && a0.openDashed === 'dashed' && a0.openFull, `QA-I4: Add button set is a full-width dashed button (${JSON.stringify(a0)})`);
    await hooks.click(page.locator('[data-p3="column-add-open"]'));
    const a1 = await addState();
    ok(!a1.open && a1.select && a1.go && a1.focus === 'column-promote-select' && JSON.stringify(a1.label) === JSON.stringify(['Color for the new button set']),
      `QA-I4: clicked, Add button set gives way to the select, labeled "Color for the new button set" and focused, and the add (${JSON.stringify(a1)})`);
    ok(await stored() === before, 'QA-I4: opening the add form writes nothing');
    await hooks.click(page.locator('[data-p3="column-promote-cancel"]'));
    const a2 = await addState();
    ok(a2.open && !a2.select && a2.focus === 'column-add-open' && await stored() === before, `QA-I4: Cancel puts Add button set back, focused, and writes nothing (${JSON.stringify(a2)})`);
    await hooks.click(page.locator('[data-p3="column-add-open"]'));
    await page.keyboard.press('Escape');
    const a3 = await addState();
    ok(a3.open && !a3.select && a3.focus === 'column-add-open' && await stored() === before, `QA-I4: Escape in the add form does what Cancel does (${JSON.stringify(a3)})`);
    // The last color left to add: Add button set gives way to the hint, and focus must not drop to the page body. It
    // lands on the new set's group, as that set's jump link would put it.
    await hooks.click(page.locator('[data-p3="column-add-open"]'));
    await page.locator('[data-p3="column-promote-select"]').selectOption('accent');
    await hooks.click(page.locator('[data-p3="column-promote"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="interactive-column"][data-column="accent"]'), null, { timeout: 5000 }).catch(() => {});
    const lastAdd = await page.evaluate(() => ({
      hint: !!document.querySelector('[data-p3="column-promote-hint"]'), body: document.activeElement === document.body,
      focus: document.activeElement?.getAttribute('data-p3') ?? document.activeElement?.tagName ?? null, column: document.activeElement?.dataset?.column ?? null,
    }));
    ok(lastAdd.hint && !lastAdd.body && lastAdd.focus === 'interactive-column' && lastAdd.column === 'accent',
      `QA-I4: adding the last color left keeps focus off the page body, on the new set's group (${JSON.stringify(lastAdd)})`);
    await hooks.click(page.locator('[data-p3="interactive-column"][data-column="accent"] [data-p3="column-remove"]'));
    await page.waitForFunction(() => !document.querySelector('[data-p3="interactive-column"][data-column="accent"]'), null, { timeout: 5000 }).catch(() => {});

    // QA-I8: the switch, its captions, its writes, and the chips only while it is off.
    const dis = () => page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const sw = pane.querySelector('[data-p3="disabled-full-switch"]');
      const lever = sw?.closest('.p3-lever');
      return {
        label: lever?.querySelector('.p3-lever-name')?.textContent ?? null, on: sw?.getAttribute('aria-checked') ?? null,
        caption: pane.querySelector('[data-p3="disabled-full-caption"]')?.textContent ?? null,
        chips: [...pane.querySelectorAll('[data-p3="disabled-min-chips"] [role="radio"]')].filter((b) => b.getClientRects().length > 0).length,
      };
    });
    const d0 = await dis();
    ok(d0.label === DISABLED_COPY.label && d0.on === 'false' && d0.caption === DISABLED_COPY.off && d0.chips === 4,
      `QA-I8: the Disabled control is the "${DISABLED_COPY.label}" switch, off on prism3, captioned "${DISABLED_COPY.off}", the four floor chips shown (${JSON.stringify(d0)})`);
    await hooks.click(page.locator('[data-p3="disabled-full-switch"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="disabled-full-switch"]')?.getAttribute('aria-checked') === 'true', null, { timeout: 5000 }).catch(() => {});
    const w1 = await persisted(page);
    const d1 = await dis();
    ok(w1?.disabledStrategy === DISABLED_WRITES.on, `QA-I8: switching Full contrast on writes disabledStrategy "${DISABLED_WRITES.on}", as the segmented control did (wrote ${JSON.stringify(w1?.disabledStrategy)})`);
    ok(d1.on === 'true' && d1.caption === DISABLED_COPY.on, `QA-I8: on, the caption reads "${DISABLED_COPY.on}" (${JSON.stringify(d1)})`);
    hooks.absent(ok, { seen: d1.on === 'true', state: 'the Full contrast switch, on' }, d1.chips === 0, `QA-I8: under Full contrast the floor chips are not shown (${d1.chips} shown)`);
    await hooks.click(page.locator('[data-p3="disabled-full-switch"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="disabled-full-switch"]')?.getAttribute('aria-checked') === 'false', null, { timeout: 5000 }).catch(() => {});
    const w2 = await persisted(page);
    const d2 = await dis();
    ok(w2?.disabledStrategy === DISABLED_WRITES.off && d2.chips === 4 && d2.caption === DISABLED_COPY.off,
      `QA-I8: switching it off writes disabledStrategy "${DISABLED_WRITES.off}" and shows the four chips again (wrote ${JSON.stringify(w2?.disabledStrategy)}, ${JSON.stringify(d2)})`);
    await hooks.click(page.locator('[data-p3="disabled-min-chips-4"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="disabled-min-chips-4"]')?.getAttribute('aria-checked') === 'true', null, { timeout: 5000 }).catch(() => {});
    ok((await persisted(page))?.disabledMin === 4, `QA-I8: with the switch off, a floor chip writes disabledMin (${JSON.stringify((await persisted(page))?.disabledMin)})`);

    // QA-I2: every mark in the preview is the success or danger icon token, by what it marks, and clears 3:1 on
    // its ground. A miss is forced in Light and in Dark through the levers' own picker, so the arm is never empty.
    for (const [mode, step] of [['light', 'first'], ['dark', 'last']]) {
      await chooseMode(page, mode);
      await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="int-pick"][data-role="interactive.primary.text.rest"]'));
      const steps = page.locator('[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"]');
      await hooks.click(step === 'first' ? steps.first() : steps.last());
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !!document.querySelector('[data-p3="interactive-style-guide"] [data-p3="ratio-badge"][data-below="true"]'), null, { timeout: 5000 }).catch(() => {});
      const marks = await readMarks(page);
      const misses = marks.filter((m) => m.below);
      const passes = marks.filter((m) => !m.below);
      ok(misses.length >= 1 && passes.length >= 20, `QA-I2 (${mode}): the preview draws a forced miss and its passes (${misses.length} misses, ${passes.length} passes)`);
      const redOff = misses.filter((m) => !STATUS.bad.includes(m.color));
      ok(misses.length >= 1 && redOff.length === 0, `QA-I2 (${mode}): a failing mark is the danger icon token (${STATUS.bad.join(' or ')})${redOff.length ? ` — ${redOff.slice(0, 3).map((m) => `${m.role} ${m.color}`).join(', ')}` : ''}`);
      const greenOff = passes.filter((m) => !STATUS.ok.includes(m.color));
      ok(greenOff.length === 0, `QA-I2 (${mode}): a passing mark is the success icon token (${STATUS.ok.join(' or ')})${greenOff.length ? ` — ${greenOff.slice(0, 3).map((m) => `${m.role} ${m.color}`).join(', ')}` : ''}`);
      const low = marks.filter((m) => ratioHex(m.color, m.ground) < NONTEXT_MIN);
      ok(low.length === 0, `QA-I2 (${mode}): every mark clears ${NONTEXT_MIN}:1 on its ground${low.length ? ` — ${low.slice(0, 3).map((m) => `${m.role} ${m.color} on ${m.ground} ${ratioHex(m.color, m.ground).toFixed(2)}:1`).join(', ')}` : ''}`);
    }
    for (const mode of ['hc-light', 'hc-dark']) {
      await chooseMode(page, mode);
      const marks = await readMarks(page);
      const low = marks.filter((m) => ratioHex(m.color, m.ground) < NONTEXT_MIN || !(m.below ? STATUS.bad : STATUS.ok).includes(m.color));
      ok(marks.length >= 20 && low.length === 0, `QA-I2 (${mode}): ${marks.length} marks, each its status token and clear of ${NONTEXT_MIN}:1 on its ground${low.length ? ` — ${low.slice(0, 3).map((m) => `${m.role} ${m.color} on ${m.ground}`).join(', ')}` : ''}`);
    }
    ok(errors.length === 0, `S5.3 levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S5.3 levers: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// QA-I2 on every page lightness: Page swept down prism3's neutral ladder in Light, through the mid-grays where neither
// chrome theme's icon color reaches 3:1. THE ORACLE is the render (each mark's computed color and the composited
// ground under it) and the status tokens from the token tree, never the page's own choice (docs/34). Each mark either
// clears 3:1 on its ground, or, only where neither theme's token for it reaches 3:1 there, keeps the badge's own ink,
// as origin/main drew every mark.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'color-fills');
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="surface-base-pick"]'));
    const steps = await page.locator('[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"]').evaluateAll((bs) => bs.map((b) => b.dataset.step));
    await page.keyboard.press('Escape');
    ok(steps.length >= 10, `QA-I2 sweep: the Page picker offers the neutral ladder (${steps.length} steps: ${steps.join(', ')})`);
    let lowest = Infinity, lowestAt = '', fallbacks = 0, points = 0, grounds = new Set();
    const bad = [];
    for (const step of steps) {
      await goPlace(page, 'color-fills');
      await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="surface-base-pick"]'));
      await hooks.click(page.locator(`[data-p3="levers-pane"] [data-p3="step-picker"] [data-p3="step-picker-step"][data-step="${step}"]`));
      await page.keyboard.press('Escape');
      await goPlace(page, 'color-interactive');
      const marks = await readMarks(page);
      points++;
      let fellBack = false;
      for (const m of marks) {
        grounds.add(m.ground);
        const r = ratioHex(m.color, m.ground);
        const tokens = m.below ? STATUS.bad : STATUS.ok;
        const reach = Math.max(...tokens.map((t) => ratioHex(t, m.ground)));
        if (r < lowest) { lowest = r; lowestAt = `Page ${step}, ${m.role}${m.below ? ' (miss)' : ''} ${m.color} on ${m.ground}`; }
        // Where neither theme's token reaches 3:1, the mark must be the base fallback, the badge's own ink.
        if (reach < NONTEXT_MIN) {
          if (m.color === m.ink) { fellBack = true; continue; }
          bad.push(`Page ${step}: ${m.role} ${m.color} on ${m.ground} is not the badge ink ${m.ink}, and no status token reaches 3:1 there (best ${reach.toFixed(2)}:1)`);
          continue;
        }
        if (r >= NONTEXT_MIN) continue;
        bad.push(`Page ${step}: ${m.role} ${m.color} on ${m.ground} ${r.toFixed(2)}:1 (a status token reaches ${reach.toFixed(2)}:1; badge ink ${m.ink})`);
      }
      if (fellBack) fallbacks++;
      ok(marks.length >= 20, `QA-I2 sweep, Page ${step}: the preview draws its marks (${marks.length})`);
    }
    ok(fallbacks >= 1, `QA-I2 sweep: the ladder reaches a page where no status token clears ${NONTEXT_MIN}:1, so the fallback is exercised (${fallbacks} step(s))`);
    ok(bad.length === 0, `QA-I2 sweep: on every Page step each mark clears ${NONTEXT_MIN}:1 on its ground, or keeps the badge's ink where neither theme's token can${bad.length ? ` — ${bad.slice(0, 4).join(' | ')}` : ''}`);
    console.log(`  QA-I2 sweep: ${points} Page steps, ${grounds.size} grounds, lowest mark ${lowest.toFixed(2)}:1 (${lowestAt}), ${fallbacks} step(s) with a mark on the badge-ink fallback`);
    ok(errors.length === 0, `QA-I2 sweep: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `QA-I2 sweep: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// QA-I1 and QA-I9, as drawn: both hosts, both chrome themes, at 1280 and 800. No treatment label's foot line (its
// token and badge) reaches into the buttons beside it, by bounding box; every link state select fills its line and
// shows its longest option uncut.
for (const w of [1280, 800]) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors } = await open({ host, theme, w, h: 900 });
      const where = `${host} ${theme} ${w}`;
      try {
        if (w < 1280) {
          // As at 640 (below): the preview covers the sub-nav's last tab, so the keyboard reaches Interactive.
          await hooks.click(page.locator('[data-p3="tab-color"]'));
          await page.locator('[data-p3="color-sub-interactive"]').focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'color-interactive');
          await page.evaluate(() => document.fonts.ready);
        } else await goPlace(page, 'color-interactive');
        const g = await page.evaluate((rungSels) => {
          const boxOf = (n) => { const rs = [n, ...n.querySelectorAll('*')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0); return rs.length ? { l: Math.min(...rs.map((r) => r.left)), r: Math.max(...rs.map((r) => r.right)), t: Math.min(...rs.map((r) => r.top)), b: Math.max(...rs.map((r) => r.bottom)) } : null; };
          const hit = (a, b) => a && b && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
          const rows = [...document.querySelectorAll('[data-p3="interactive-style-guide"] .sg-trow')];
          const over = rows.flatMap((row) => {
            const lab = row.querySelector('.sg-tlab');
            const bs = row.querySelector('[data-p3="style-guide-buttons"]');
            const L = lab ? boxOf(lab) : null;
            return bs && [...bs.children].some((c) => hit(L, boxOf(c))) ? [`${row.closest('[data-p3="style-guide-palette"]')?.querySelector('.sg-rn')?.textContent}/${lab.firstChild?.textContent}`] : [];
          });
          const pane = document.querySelector('[data-p3="levers-pane"]');
          const rung = ([st, sel]) => {
            const s = pane.querySelector(sel);
            const ctl = s?.closest('.p3-lever-ctl');
            if (!s || !ctl) return { st, missing: true };
            const cs = getComputedStyle(s);
            const probe = document.createElement('span');
            probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font}`;
            document.body.append(probe);
            const widest = Math.max(...[...s.options].map((o) => { probe.textContent = o.textContent; return probe.getBoundingClientRect().width; }));
            probe.remove();
            const room = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            return { st, fill: s.getBoundingClientRect().width >= ctl.getBoundingClientRect().width - 1, scroll: s.scrollWidth <= s.clientWidth, widest: Math.round(widest), room: Math.round(room) };
          };
          return { rows: rows.length, over, rungs: rungSels.map(rung) };
        }, [['hover', '[data-p3="link-rung-hover"]'], ['pressed', '[data-p3="link-rung-pressed"]'], ['visited', '[data-p3="link-rung-visited"]']]);
        ok(g.rows >= 12 && g.over.length === 0, `QA-I1 ${where}: no treatment label's token or badge overlaps the buttons beside it (${g.rows} rows)${g.over.length ? ` — overlaps in ${g.over.join(', ')}` : ''}`);
        for (const r of g.rungs) {
          ok(!r.missing && r.fill && r.scroll && r.widest <= r.room,
            `QA-I9 ${where}: the ${r.st} link state select fills its line and shows its longest option uncut (${JSON.stringify(r)})`);
        }
        if (SHOTS) {
          await page.screenshot({ path: join(SHOTS, `s53-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
          await page.locator('[data-p3="lever-link-state-rungs"]').scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(SHOTS, `s53-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-links.png`) });
        }
        ok(errors.length === 0, `S5.3 ${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `S5.3 drawn ${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}
// The chrome on Interactive: both hosts, both themes, 1280, 640 and 380 (the Settings pane, then the Preview pane
// when narrow), and once with a picker open.
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors } = await open({ host, theme, w, h });
      try {
        if (w === 640) {
          // At 640 the sub-nav runs past the levers pane and the preview covers its last tab, so a pointer
          // cannot reach Interactive (reported with S5.2); the keyboard can, and that is the path driven.
          await hooks.click(page.locator('[data-p3="tab-color"]'));
          await page.locator('[data-p3="color-sub-interactive"]').focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'color-interactive');
          await page.evaluate(() => document.fonts.ready);
        } else await goPlace(page, 'color-interactive');
        const where = `${host} ${theme} ${w} / color-interactive`;
        const narrow = w <= 560;
        const m = await measure(page, where, host, w);
        check(m, where, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s5-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
        if (narrow) {
          await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
          const mp = await measure(page, `${where} / preview`, host, w);
          check(mp, `${where} / preview`, columnOf(host, w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: 'preview' });
        } else {
          // By keyboard: at 640 the levers pane scrolls sideways, and a pointer click can land on the preview.
          await page.locator('[data-p3="levers-pane"] [data-p3="int-pick"]').first().focus();
          await page.keyboard.press('Enter');
          await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
          const mk = await measure(page, `${where}, a picker open`, host, w);
          check(mk, `${where}, a picker open`, columnOf(host, w), PLACE_FLOOR, { extra: ['[data-p3="step-picker-step"]', '[data-p3="step-picker-close"]', '[data-p3="step-picker-palette"]'] });
          if (SHOTS) await page.screenshot({ path: join(SHOTS, `s5-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-picker.png`) });
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `S5.2 chrome ${host} ${theme} ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 20. Type (S6.2, S6.3): Font families in the two panes, the type sample and the preview's sections
// =============================================================================================
console.log(`\nType (S6.2, S6.3)\n${'='.repeat(78)}`);
/** EXPECTED, by name (represented, not counted; docs/34): the Type preview's specimen roots, each a section on the
 *  brand's page color. Literal: the shared type sample (#1942), then one section per lever section (Q23), then the
 *  read-only Building blocks (Q73). */
const EXPECT_TYPE_SPECIMENS = ['Type sample', 'Font families', 'Scale', 'Weights and styles', 'Line height and letter spacing', 'Building blocks'];
/** Open every Show advanced on Type (Font families', Scale's and the page's), so the S6.3 levers are drawn. */
const openTypeAdvanced = async (page) => {
  for (const hk of ['scale-advanced', 'type-sections-advanced']) {
    const sel = `[data-p3="${hk}"]`;
    await hooks.need(page, sel);
    if ((await page.locator(sel).getAttribute('aria-expanded')) !== 'true') await hooks.click(page.locator(sel));
    await page.waitForFunction((x) => document.querySelector(x)?.getAttribute('aria-expanded') === 'true', sel);
  }
};
/** The text types, in order, each with the plain name its token carries under it (owner decision Q68, its example
 *  "Body face", with the owner's rule of 2026-10-02 applied: never "face" in visible copy). Literal. */
const TYPE_FACES = [['display', 'Display family'], ['title', 'Title family'], ['body', 'Body family'], ['label', 'Label family'],
  ['caption', 'Caption family'], ['eyebrow', 'Eyebrow family'], ['code', 'Code family']];
/** The default theme's faces, from the emission, the oracle for what each select shows in Light. */
const TYPE_FACE_OF = (g) => {
  let v = OUT[OUT_ROOT]?.core?.font?.family?.[g]?.$value;
  for (let i = 0; typeof v === 'string' && v.startsWith('{') && i < 8; i++) v = v.slice(1, -1).replace(`${OUT_ROOT}.`, '').split('.').reduce((n, k) => n?.[k], OUT[OUT_ROOT])?.$value;
  return v;
};
ok(TYPE_FACE_OF('body') === 'Inter' && TYPE_FACE_OF('display') === 'Playfair Display', `the oracle resolves the default theme's faces from the emission (body ${TYPE_FACE_OF('body')}, display ${TYPE_FACE_OF('display')})`);
/** The Faces copy (Q23: the lever section and the preview section say the same thing). DRAFT, typed here. */
const FACES_COPY = ['Font families', 'The font families in the brand, and the family each text type uses.'];
const sectionGrounds = (page, hk) => page.evaluate((hostHook) => {
  const parse = (x) => { const m = /^rgba?\(([^)]+)\)$/.exec((x ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ?? { r: 255, g: 255, b: 255, a: 1 }; };
  const hex = (c) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  const host = document.querySelector(`[data-p3="preview-body"] [data-p3="${hostHook}"]`);
  const grounds = [...(host?.querySelectorAll('.sg-ground') ?? [])];
  return { card: host ? hex(groundOf(host)) : null, roots: grounds.map((g) => ({ name: g.closest('.psec')?.querySelector('.psec-t')?.textContent ?? '?', root: g.getAttribute('data-p3') === 'specimen', ground: hex(groundOf(g)) })),
    sections: [...(host?.querySelectorAll('.psec') ?? [])].map((x) => ({ name: x.querySelector('.psec-t')?.textContent ?? '?', bg: hex(groundOf(x)) })) };
}, hk);
// Specimen grounds and Q24's gray containers: both hosts, both themes, every mode.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'type');
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await chooseMode(page, mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await sectionGrounds(page, 'type-style-guide');
        const want = EMITTED[mode];
        for (const name of EXPECT_TYPE_SPECIMENS) {
          const r = g.roots.find((x) => x.name === name);
          ok(!!r && r.root && r.ground === want, `specimen ground: type ${where}: ${name} is a specimen root on background.primary ${want}${
            !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== want ? ` — ${r.ground === g.card ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
        }
        const unlisted = g.roots.filter((x) => !EXPECT_TYPE_SPECIMENS.includes(x.name)).map((x) => x.name);
        ok(unlisted.length === 0, `specimen ground: type ${where}: every section ground drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
        const offGray = g.sections.filter((x) => x.bg !== LEVERS_GRAY).map((x) => `${x.name} on ${x.bg}`);
        ok(g.sections.length >= EXPECT_TYPE_SPECIMENS.length && offGray.length === 0,
          `Q24 section containers: type ${where}: every section container is the levers panel's gray ${LEVERS_GRAY} (${g.sections.length} read)${offGray.length ? ` — ${offGray.join(', ')}` : ''}`);
      }
    } catch (e) {
      ok(false, `S6.2 specimen grounds ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
// Represented, on both hosts: the two Faces levers once; every text type's select by its plain name FIRST, its token
// under it in mono (QA-B2, which reversed Q68's token-first order); the library's faces by name first, token under; code's None (Q75, literal); Light's
// selects on the emission's faces; the four-tab bar gone; the lent legacy region drawn; Show advanced holding Apply
// to all and the remove button; Q23's Faces copy the same in the levers and the preview.
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await hooks.need(page, '[data-p3="lever-typography-type-scale"]');
    const r = await page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const fams = [...pane.querySelectorAll('[data-p3="family-row"]')].map((row) => {
        const name = row.querySelector('.p3-fill-name');
        const sel = row.querySelector('[data-p3="family-select"]');
        return { group: row.dataset.group, first: name?.firstElementChild?.className ?? null, tok: name?.querySelector('.p3-fill-tok')?.textContent ?? null,
          tokFont: name?.querySelector('.p3-fill-tok') ? getComputedStyle(name.querySelector('.p3-fill-tok')).fontFamily : null,
          label: name?.querySelector('.p3-fill-label')?.textContent ?? null, labelFor: name?.getAttribute('for') === sel?.id,
          value: sel?.selectedOptions[0]?.textContent ?? null, options: sel ? [...sel.options].map((o) => o.textContent) : [] };
      });
      const lib = [...pane.querySelectorAll('[data-p3="face-row"]')].map((row) => ({ slug: row.dataset.slug, first: row.querySelector('.p3-fill-name')?.firstElementChild?.className ?? null,
        tok: row.querySelector('.p3-fill-name .p3-fill-tok')?.textContent ?? null }));
      const lsec = pane.querySelector('[data-p3="lever-section"]');
      const prev = [...document.querySelectorAll('[data-p3="type-style-guide"] .psec')].find((x) => x.querySelector('.psec-t')?.textContent === 'Font families');
      return {
        blocks: ['lever-typography-typeface-library', 'lever-typography-families'].map((hk) => pane.querySelectorAll(`[data-p3="${hk}"]`).length),
        fams, lib, tabs: pane.querySelectorAll('.pvseg').length + document.querySelectorAll('[data-p3="legacy-page"] .pvseg').length,
        lent: pane.querySelectorAll('.p3-legacy-card').length,
        leverCopy: [lsec?.querySelector('.p3-lsec-title')?.textContent ?? null, lsec?.querySelector('.p3-lsec-desc')?.textContent ?? null],
        previewCopy: [prev?.querySelector('.psec-t')?.textContent ?? null, prev?.querySelector('.psec-d')?.textContent ?? null],
        source: document.querySelector('[data-p3="typeface-source"]')?.textContent ?? null,
      };
    });
    ok(r.blocks.every((n) => n === 1), `${host}: the library and the face-for-each-text-type levers render once each (${r.blocks.join(', ')})`);
    ok(JSON.stringify(r.fams.map((f) => f.group)) === JSON.stringify(TYPE_FACES.map(([g]) => g)), `${host}: a face select per text type, in order — drew ${JSON.stringify(r.fams.map((f) => f.group))}`);
    for (const [g, label] of TYPE_FACES) {
      const f = r.fams.find((x) => x.group === g);
      ok(!!f && f.first === 'p3-fill-label' && f.tok === `font.family.${g}` && f.label === label && f.labelFor && /JetBrains Mono|P3 Chrome Mono/.test(f.tokFont ?? ''),
        `QA-B2: ${host}: the ${g} select is named "${label}" first, then font.family.${g} in mono — read ${JSON.stringify(f && { first: f.first, tok: f.tok, label: f.label, labelFor: f.labelFor, font: f.tokFont })}`);
      ok(f?.value === (g === 'code' ? TYPE_FACE_OF('code') : TYPE_FACE_OF(g)), `${host}: in Light the ${g} select shows the emission's face ${TYPE_FACE_OF(g)} (shows ${f?.value})`);
    }
    const code = r.fams.find((x) => x.group === 'code');
    ok(!!code && code.options.includes('None — no code styles'), `Q75: ${host}: code's select offers "None — no code styles" (${JSON.stringify(code?.options)})`);
    ok(r.lib.length >= 3 && r.lib.every((x) => x.first === 'p3-fill-label' && x.tok === `font.typeface.${x.slug}`), `QA-B2: ${host}: every library face is named first, its token under it (${JSON.stringify(r.lib)})`);
    ok(r.tabs === 0, `${host}: the four-tab bar (Primitives · Semantics · Text styles · Preview) is gone (${r.tabs} drawn)`);
    ok(r.lent === 0, `${host}: the levers draw no lent legacy region (S6.3 retired it; ${r.lent} drawn)`);
    ok(JSON.stringify(r.leverCopy) === JSON.stringify(FACES_COPY) && JSON.stringify(r.previewCopy) === JSON.stringify(r.leverCopy),
      `Q23: ${host}: the Faces lever section and the preview's Faces section have one heading and description — levers ${JSON.stringify(r.leverCopy)}, preview ${JSON.stringify(r.previewCopy)}`);
    ok(r.source === 'On this device', `${host}: before the host sends a font list, the library's availability reads "On this device" (${r.source})`);
    // The owner (2026-10-03, #2036): "Font families should not be advanced, that's a major brand lever." Apply to all
    // and the remove button are drawn without any fold: Font families' section holds no Show advanced, and Apply to
    // all sits in no fold's body.
    const fam = await page.evaluate(() => {
      const sec = document.querySelector('#p3-lsec-type-0');
      const all = document.querySelector('[data-p3="family-all-apply"]');
      return { title: sec?.querySelector('.p3-lsec-title')?.textContent ?? null, folds: sec ? sec.querySelectorAll('.p3-advrow, [aria-controls^="p3-advb"]').length : -1,
        all: !!all && sec?.contains(all), inFold: !!all?.closest('.p3-advbody') };
    });
    ok(fam.title === 'Font families' && fam.folds === 0 && fam.all && !fam.inFold,
      `owner (2026-10-03): ${host}: Font families sits outside Show advanced: Apply to all is drawn in it, in no fold (${JSON.stringify(fam)})`);
    // S6.3: the other two folds, so the scans below read every lever on the page.
    await openTypeAdvanced(page);
    // The owner's rule (2026-10-02): never "face" as a word in visible copy, on the levers (the lent region, the
    // info toggletips, which are in the DOM while hidden, and Show advanced's controls included) or the preview. Read off the rendered DOM: every text
    // node, option and aria-label, title and placeholder, with the token pills taken out (`font.typeface.*` is a
    // token, and fine). Code, hooks and classes are not copy and are not read.
    const faceWords = await page.evaluate(() => {
      const out = [];
      for (const root of [document.querySelector('[data-p3="levers-pane"]'), document.querySelector('[data-p3="preview-body"]')]) {
        const c = root.cloneNode(true);
        for (const t of c.querySelectorAll('[data-p3="token-pill"], .p3-fill-tok')) t.remove();
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (/\bfaces?\b/i.test(n.textContent)) out.push(n.textContent.trim().slice(0, 80));
        for (const e of c.querySelectorAll('[aria-label], [title], [placeholder]')) for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute(a); if (v && /\bfaces?\b/i.test(v)) out.push(`${a} "${v.slice(0, 80)}"`); }
      }
      return out;
    });
    ok(faceWords.length === 0, `owner rule: ${host}: no "face" or "faces" in the Type page's visible copy, levers and preview, token pills aside${faceWords.length ? ` — found ${faceWords.slice(0, 4).map((x) => `"${x}"`).join(', ')}` : ''}`);
    // The owner's plain words (Q70, with Q53, Q57 and Q58), read the same way, every Show advanced open: no "rung",
    // "leading", "tracking", "cut", "baseline", "weight role", "category", "column", "band" or "muted" in the Type
    // page's visible copy. The words are typed here, from the decisions.
    const PLAIN = /\b(rungs?|leading|tracking|cuts?|baseline|weight roles?|categor(y|ies)|columns?|bands?|muted)\b/i;
    const plainWords = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const out = [];
      for (const root of [document.querySelector('[data-p3="levers-pane"]'), document.querySelector('[data-p3="preview-body"]')]) {
        const c = root.cloneNode(true);
        for (const t of c.querySelectorAll('[data-p3="token-pill"], .p3-fill-tok')) t.remove();
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (re.test(n.textContent)) out.push(n.textContent.trim().slice(0, 80));
        for (const e of c.querySelectorAll('[aria-label], [title], [placeholder], [aria-description]')) for (const a of ['aria-label', 'title', 'placeholder', 'aria-description']) { const v = e.getAttribute(a); if (v && re.test(v)) out.push(`${a} "${v.slice(0, 80)}"`); }
      }
      return out;
    }, PLAIN.source);
    ok(plainWords.length === 0, `Q70 plain words: ${host}: no "rung", "leading", "tracking", "cut", "baseline", "weight role", "category", "column", "band" or "muted" in the Type page's visible copy, levers and preview${plainWords.length ? ` — found ${plainWords.slice(0, 4).map((x) => `"${x}"`).join(', ')}` : ''}`);
    ok(errors.length === 0, `${host} Type levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S6.2 represented ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Edits (Q22, Q62 option A): Light writes the brand value; previewing Dark, the same select writes
// modeLevers.dark.families and leaves the brand value alone, shown as Auto: follows Light until set, with Return to
// Auto; the library takes a face and refuses a duplicate; Show advanced removes an unused face. Each write read back
// from the PERSISTED brand.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    const view0 = (await previewView(page)).view;
    const body = page.locator('[data-p3="family-select"][data-group="body"]');
    const p0 = await persisted(page);
    await body.selectOption('JetBrains Mono');
    await page.waitForFunction(() => document.querySelector('[data-p3="family-select"][data-group="body"]')?.value === 'JetBrains Mono');
    const p1 = await persisted(page);
    ok(p1?.typography?.families?.body === 'JetBrains Mono' && p1?.modeLevers === undefined, `type: in Light, the body face writes typography.families.body (${JSON.stringify({ body: p1?.typography?.families?.body, modeLevers: p1?.modeLevers })})`);
    await body.selectOption('Inter');
    await page.waitForFunction(() => document.querySelector('[data-p3="family-select"][data-group="body"]')?.value === 'Inter');
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(p0), 'type: setting body back to Inter returns the persisted brand to its bytes');
    await chooseMode(page, 'dark');
    const auto = await page.evaluate(() => { const s = document.querySelector('[data-p3="family-select"][data-group="body"]'); return { value: s?.value, text: s?.selectedOptions[0]?.textContent, line: document.querySelector('[data-p3="lever-typography-families"] .p3-sub')?.textContent }; });
    ok(auto.value === '' && auto.text === 'Auto: follows Light (Inter)' && auto.line === 'Editing Dark, the mode the preview shows.',
      `Q62: previewing Dark, the body select starts on "Auto: follows Light (Inter)" under the editing line (${JSON.stringify(auto)})`);
    await page.locator('[data-p3="family-select"][data-group="body"]').selectOption('JetBrains Mono');
    await page.waitForFunction(() => !!document.querySelector('[data-p3="family-reset"][data-group="body"]'), null, { timeout: 5000 }).catch(() => {});
    const p2 = await persisted(page);
    ok(p2?.modeLevers?.dark?.families?.body === 'JetBrains Mono' && p2?.typography?.families?.body === p0?.typography?.families?.body,
      `previewing Dark, body face writes modeLevers.dark.families.body and not the brand value — wrote modeLevers ${JSON.stringify(p2?.modeLevers)}, typography.families.body ${JSON.stringify(p2?.typography?.families?.body)}`);
    const prevFace = await page.evaluate(() => [...document.querySelectorAll('[data-p3="type-style-guide"] [data-p3="faces-type-row"]')].find((r) => r.dataset.group === 'body')?.querySelectorAll('td')[1]?.textContent);
    ok(prevFace === 'JetBrains Mono', `type: previewing Dark, the preview's Faces section names the Dark body face (${prevFace})`);
    await hooks.click(page.locator('[data-p3="family-reset"][data-group="body"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="family-select"][data-group="body"]')?.value === '');
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(p0), 'type: Return to Auto prunes modeLevers: the persisted brand is the one loaded');
    await chooseMode(page, 'light');
    // The library: add a face, refuse a duplicate by slug, then remove it under Show advanced.
    await page.locator('[data-p3="face-add-input"]').fill('Roboto');
    await hooks.click(page.locator('[data-p3="face-add"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="face-row"][data-slug="roboto"]'), null, { timeout: 5000 }).catch(() => {});
    ok(JSON.stringify((await persisted(page))?.typography?.typefaceLibrary) === '["Roboto"]', `type: Add face stages Roboto in typography.typefaceLibrary (${JSON.stringify((await persisted(page))?.typography?.typefaceLibrary)})`);
    await page.locator('[data-p3="face-add-input"]').fill('roboto');
    await hooks.click(page.locator('[data-p3="face-add"]'));
    await hooks.need(page, '[data-p3="face-add-error"]');
    const dup = await page.evaluate(() => document.querySelector('[data-p3="face-add-error"]')?.textContent);
    ok(dup === 'Roboto is already in the library.' && JSON.stringify((await persisted(page))?.typography?.typefaceLibrary) === '["Roboto"]', `type: a duplicate by slug is refused, nothing written ("${dup}")`);
    await hooks.click(page.locator('[data-p3="face-row"][data-slug="roboto"] [data-p3="face-remove"]'));
    await page.waitForFunction(() => !document.querySelector('[data-p3="face-row"][data-slug="roboto"]'), null, { timeout: 5000 }).catch(() => {});
    ok(JSON.stringify((await persisted(page))?.typography?.typefaceLibrary) === '[]', `type: Show advanced's remove takes the unused face out (the legacy bytes, [] left) (${JSON.stringify((await persisted(page))?.typography?.typefaceLibrary)})`);
    const inUse = await page.evaluate(() => ['inter', 'playfair-display', 'jetbrains-mono'].map((x) => !!document.querySelector(`[data-p3="face-row"][data-slug="${x}"] [data-p3="face-remove"]`)));
    ok(inUse.every((x) => !x), `type: a face a text type uses offers no remove (${JSON.stringify(inUse)})`);
    ok((await previewView(page)).view === view0, `V1 edit: Type's edits never move the preview's home (${view0})`);
    ok(errors.length === 0, `type edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S6.2 Type edits: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Q59, Q74: in each derived mode every control on Type is disabled, the lent region included, under the derived
// line. Enumerated from the DOM: every button, select and input in a lever section but the info toggletips.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'brand');
    await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="mode-option"][data-mode="wireframe"], [data-p3="mode-select"] option[value="wireframe"]'));
    await goPlace(page, 'type');
    await hooks.need(page, '[data-p3="lever-typography-type-scale"]');
    // Every Show advanced open first, in Light, so the S6.3 sections are drawn when a derived mode is previewed.
    await openTypeAdvanced(page);
    /** The floor on the controls a derived mode must hold disabled: the weights matrix alone is 42 checks, the
     *  italic chips 21, the nudges 14 and the line height and letter spacing pickers 13. */
    const DERIVED_CONTROLS_FLOOR = 150;
    for (const [mode, label] of [['hc-light', 'HC light'], ['hc-dark', 'HC dark'], ['wireframe', 'Wireframe']]) {
      await chooseAnyMode(page, mode);
      await page.waitForFunction((l) => document.querySelector('[data-p3="type-derived"]')?.textContent?.startsWith(l), label, { timeout: 5000 }).catch(() => {});
      const d = await page.evaluate(() => {
        const pane = document.querySelector('[data-p3="levers-pane"]');
        // The info buttons and Scale's Show advanced only disclose; they edit nothing, so they stay live (checked below).
        const ctls = [...pane.querySelectorAll('[data-p3="lever-section"] :is(button, select, input)')].filter((n) => !n.matches('[data-p3="lever-info"], [data-p3="scale-advanced"]'));
        return { n: ctls.length, enabled: ctls.filter((n) => !n.disabled).map((n) => n.getAttribute('data-p3') ?? n.tagName), hooks: [...new Set(ctls.map((n) => n.getAttribute('data-p3')))],
          line: document.querySelector('[data-p3="type-derived"]')?.textContent ?? null };
      });
      ok(d.line === `${label} is auto-derived — read-only. Edit Light or Dark and it follows.`, `Q59: previewing ${label}, the derived line shows on Type ("${d.line}")`);
      ok(d.n >= DERIVED_CONTROLS_FLOOR && d.enabled.length === 0,
        `Q59: previewing ${label}, every control on Type is disabled, the advanced sections included (${d.n - d.enabled.length}/${d.n}, floor ${DERIVED_CONTROLS_FLOOR})${d.enabled.length ? ` — enabled ${[...new Set(d.enabled)].join(', ')}` : ''}`);
      for (const hk of ['family-select', 'face-add-input', 'face-add', 'family-all-apply', 'type-scale-compact', 'type-size-desktop', 'type-size-mobile',
        'type-fluid', 'type-min-viewport', 'type-ceiling', 'title-floor-16', 'caption-floor-10', 'size-floor-8', 'weight-pick', 'weight-cell', 'link-cell',
        'italic-choice-only', 'pin-cut-input', 'lh-pick', 'ls-pick', 'nudge-lh', 'nudge-ls'])
        ok(d.hooks.includes(hk), `Q59: previewing ${label}, the ${hk} control on Type is among those held disabled`);
    }
    // In a derived mode Scale's Show advanced stays openable, so Individual sizes can be read; everything it opens is
    // disabled (Q59). Closed first, then opened, previewing HC light.
    await chooseAnyMode(page, 'hc-light');
    await page.waitForFunction(() => !!document.querySelector('[data-p3="type-derived"]'), null, { timeout: 5000 }).catch(() => {});
    // Bounded, and its failure kept: a fold held disabled is what the check below must report, by name.
    if ((await page.locator('[data-p3="scale-advanced"]').getAttribute('aria-expanded')) === 'true') await hooks.click(page.locator('[data-p3="scale-advanced"]'), { timeout: 5000 }).catch(() => {});
    const fold0 = await page.evaluate(() => ({ disabled: document.querySelector('[data-p3="scale-advanced"]')?.disabled, open: document.querySelector('[data-p3="scale-advanced"]')?.getAttribute('aria-expanded') }));
    await hooks.click(page.locator('[data-p3="scale-advanced"]'), { timeout: 5000 }).catch(() => {});
    const fold1 = await page.evaluate(() => {
      const b = document.querySelector('#p3-advb-type-scale');
      const ctls = b ? [...b.querySelectorAll('button, select, input')].filter((n) => !n.matches('[data-p3="lever-info"]')) : [];
      return { open: document.querySelector('[data-p3="scale-advanced"]')?.getAttribute('aria-expanded'), shown: !!b && !b.hidden, n: ctls.length, enabled: ctls.filter((n) => !n.disabled && n.getAttribute('aria-disabled') !== 'true').map((n) => n.getAttribute('data-p3')) };
    });
    ok(fold0.disabled === false && fold1.open === 'true' && fold1.shown && fold1.n >= 10 && fold1.enabled.length === 0,
      `Q59: previewing HC light, Scale's Show advanced opens Individual sizes read-only: the fold is live and every control inside it is disabled (fold disabled ${fold0.disabled}, open ${fold1.open}, ${fold1.n} controls${fold1.enabled.length ? `, enabled ${[...new Set(fold1.enabled)].join(', ')}` : ''})`);
    await chooseAnyMode(page, 'light');
    const back = await page.evaluate(() => ({ line: !!document.querySelector('[data-p3="type-derived"]'), sel: document.querySelector('[data-p3="family-select"]')?.disabled, scale: document.querySelector('[data-p3="type-scale-compact"]')?.disabled, weight: document.querySelector('[data-p3="weight-pick"]')?.disabled }));
    ok(!back.line && back.sel === false && back.scale === false && back.weight === false, `Q59: back in Light, Type's derived line is gone and its controls, the advanced ones included, are editable (${JSON.stringify(back)})`);
    ok(errors.length === 0, `type derived: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S6.2 derived modes: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// The chrome on Type: both hosts, both themes, 1280, 640 and 380 (the Settings pane, then the Preview pane when
// narrow).
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors } = await open({ host, theme, w, h });
      try {
        await goPlace(page, 'type');
        const where = `${host} ${theme} ${w} / type`;
        const narrow = w <= 560;
        const m = await measure(page, where, host, w);
        check(m, where, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s6-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
        if (narrow) {
          await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
          const mp = await measure(page, `${where} / preview`, host, w);
          check(mp, `${where} / preview`, columnOf(host, w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: 'preview' });
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `S6.2 chrome ${host} ${theme} ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 20b. Type (S6.3): Scale, Scale limits, Weights and styles, Line height and letter spacing — represented, their
//      copy, the Q23 pairs, the label read first (QA-B2), the previewed mode (Q22, Q62), brand-wide values from any
//      editable mode (Q54), the style count's repaint (#831), and typography.responsive's one home (Q71)
//
//      Independence (docs/34): the copy, the lever hooks, the pairs and the expected writes are literals typed here
//      from the owner's decisions and the legacy page's bytes; the style counts come from the committed emission;
//      every write is read back from the PERSISTED brand (`prism3:brandInput`).
//
//      Mutations this fails by name: a Dark weight edit writing the brand value → `previewing Dark, a weight edit
//      writes modeLevers.dark.weights.strong and not the brand value …`; Layout's responsive section left in →
//      `typography.responsive is drawn on Type only — also on Layout …`.
// =============================================================================================
console.log(`\nType (S6.3)\n${'='.repeat(78)}`);
/** Q23: each lever section, in order, and the preview section it pairs with (Scale limits with Scale, scope §3). */
const TYPE_PAIRS = [['Font families', 'Font families'], ['Scale', 'Scale'], ['Scale limits', 'Scale'], ['Weights and styles', 'Weights and styles'],
  ['Line height and letter spacing', 'Line height and letter spacing']];
/** The S6.3 sections' descriptions, DRAFT, literal (the preview's paired section says the same, Q23). */
const TYPE_S63_COPY = {
  Scale: 'The size of each heading style on desktop and mobile, and the scale they step along.',
  'Scale limits': 'Where the heading scale starts and stops, and whether headings scale between mobile and desktop.',
  'Weights and styles': 'The weight behind each name, the weights each text type ships, and its italic and link styles.',
  'Line height and letter spacing': 'The step each line height and letter spacing name uses, and how far each text type moves from it.',
};
/** Every S6.3 lever, by its hook, drawn once each (represented, not counted). */
const TYPE_S63_LEVERS = ['lever-typography-type-scale', 'lever-typography-sizes', 'lever-typography-responsive', 'lever-typography-display-ceiling',
  'lever-typography-title-floor', 'lever-typography-caption-floor', 'lever-typography-size-floor', 'lever-typography-weight-roles', 'lever-typography-weights',
  'lever-typography-italics', 'lever-typography-faces', 'lever-typography-line-heights', 'lever-typography-letter-spacings', 'lever-typography-leading-shift'];
/** Literal copy on the controls: the chips (the manifest's scale labels; Q6's italic chips), the floors, the
 *  owner's words for fluid sizing (Q70) and the way to Layout. */
const TYPE_S63_WORDS = {
  scale: ['Compact', 'Default', 'Expressive'], italic: ['Upright', 'Upright + italic', 'Italic only'],
  title: ['18px', '16px'], caption: ['11px', '10px'], size: ['10px', '8px'],
  fluid: 'Headings scale between mobile and desktop', layout: 'Depends on Layout: breakpoints',
};
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await openTypeAdvanced(page);
    const r = await page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const txt = (sel) => [...pane.querySelectorAll(sel)].map((n) => n.textContent.trim());
      const nameOf = (row) => { const n = row?.querySelector('.p3-fill-name'); return n ? [...n.children].slice(0, 2).map((c) => [c.className, c.textContent]) : null; };
      return {
        levers: Object.fromEntries([...pane.querySelectorAll('[data-p3^="lever-typography-"]')].map((n) => n.getAttribute('data-p3')).reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map())),
        lsec: [...pane.querySelectorAll('[data-p3="lever-section"]')].map((x) => [x.querySelector('.p3-lsec-title')?.textContent ?? null, x.querySelector('.p3-lsec-desc')?.textContent ?? null]),
        psec: [...document.querySelectorAll('[data-p3="type-style-guide"] .psec')].map((x) => [x.querySelector('.psec-t')?.textContent ?? null, x.querySelector('.psec-d')?.textContent ?? null]),
        words: {
          scale: txt('[data-p3="type-scale"] [role="radio"]'), italic: txt('[data-p3="italic-row"][data-group="body"] [role="radio"]'),
          title: txt('[data-p3="title-floor"] [role="radio"]'), caption: txt('[data-p3="caption-floor"] [role="radio"]'), size: txt('[data-p3="size-floor"] [role="radio"]'),
          fluid: pane.querySelector('[data-p3="lever-typography-responsive"] .p3-lever-name')?.textContent ?? null,
          layout: pane.querySelector('[data-p3="type-fluid-layout"]')?.textContent?.trim() ?? null,
        },
        folds: ['scale-advanced', 'type-sections-advanced'].map((hk) => document.querySelector(`[data-p3="${hk}"]`)?.textContent?.trim()),
        names: {
          weight: nameOf(pane.querySelector('[data-p3="weight-row"][data-role="strong"]')),
          lh: nameOf(pane.querySelector('[data-p3="lh-row"][data-key="normal"]')),
          size: nameOf(pane.querySelector('[data-p3="type-size-row"][data-group="title"]')),
          matrix: nameOf(pane.querySelector('[data-p3="weights-row"][data-group="body"]')),
        },
      };
    });
    const missing = TYPE_S63_LEVERS.filter((k) => r.levers[k] !== 1).map((k) => `${k} ×${r.levers[k] ?? 0}`);
    ok(missing.length === 0, `${host}: every S6.3 Type lever is drawn once (${TYPE_S63_LEVERS.length})${missing.length ? ` — ${missing.join(', ')}` : ''}`);
    ok(JSON.stringify(r.lsec.map(([t]) => t)) === JSON.stringify(TYPE_PAIRS.map(([t]) => t)), `${host}: Type's lever sections, in order: ${TYPE_PAIRS.map(([t]) => t).join(', ')} — drew ${r.lsec.map(([t]) => t).join(', ')}`);
    for (const [title, want] of TYPE_PAIRS) {
      const lev = r.lsec.find(([t]) => t === title), pre = r.psec.find(([t]) => t === want);
      ok(!!lev && !!pre && (title !== want || lev[1] === pre[1]),
        `Q23: ${host}: the lever section "${title}" pairs with the preview's "${want}"${title === want ? ', one description on both sides' : ''} — levers ${JSON.stringify(lev)}, preview ${JSON.stringify(pre)}`);
      if (TYPE_S63_COPY[title]) ok(lev?.[1] === TYPE_S63_COPY[title], `${host}: "${title}" reads "${TYPE_S63_COPY[title]}" (${JSON.stringify(lev?.[1])})`);
    }
    for (const [k, want] of Object.entries(TYPE_S63_WORDS)) ok(JSON.stringify(r.words[k]) === JSON.stringify(want), `${host}: the ${k} copy reads ${JSON.stringify(want)} (${JSON.stringify(r.words[k])})`);
    ok(JSON.stringify(r.folds) === JSON.stringify(['Hide 1 advanced', 'Hide 12 advanced']), `${host}: the two Show advanced folds, open, read Hide 1 and Hide 12 advanced (${JSON.stringify(r.folds)})`);
    const WANT_NAMES = {
      weight: [['p3-fill-label', 'Strong'], ['p3-fill-tok', 'font.weight-role.strong']], lh: [['p3-fill-label', 'normal'], ['p3-fill-tok', 'font.line-height-role.normal']],
      matrix: [['p3-fill-label', 'Body'], ['p3-fill-tok', 'type.body']],
    };
    for (const [k, want] of Object.entries(WANT_NAMES)) ok(JSON.stringify(r.names[k]) === JSON.stringify(want), `QA-B2: ${host}: the ${k} control reads its label first and its token under it, ${JSON.stringify(want)} (${JSON.stringify(r.names[k])})`);
    ok(r.names.size?.[0]?.[0] === 'p3-fill-label' && /^type\.title\./.test(r.names.size?.[1]?.[1] ?? ''), `QA-B2: ${host}: a heading size reads its label first and its type.title.* token under it (${JSON.stringify(r.names.size)})`);
    ok(errors.length === 0, `${host} Type S6.3 levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S6.3 represented ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// The previewed mode (Q22, Q62): previewing Dark, a weight, a heading's desktop size and a line height swap write
// modeLevers.dark.* and leave the brand value alone, each shown as "Auto: follows Light (…)" until set; a brand-wide
// value (a nudge) writes the same bytes from Dark as from Light (Q54); a value that breaks the order is offered
// disabled with its reason and writes nothing; the style count follows a weight tick at once (#831).
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await openTypeAdvanced(page);
    const p0 = await persisted(page);
    /** Open a value picker by its button, click a value, and wait for the repaint. */
    const pick = async (btn, v) => {
      if ((await page.locator(btn).getAttribute('aria-expanded')) !== 'true') await hooks.click(page.locator(btn));
      await hooks.click(page.locator(`[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="${v}"]`));
      await page.waitForFunction((x) => document.querySelector(`[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="${x}"]`)?.getAttribute('aria-pressed') === 'true', String(v), { timeout: 5000 }).catch(() => {});
    };
    const reset = async (btn) => {
      if ((await page.locator(btn).getAttribute('aria-expanded')) !== 'true') await hooks.click(page.locator(btn));
      await hooks.click(page.locator('[data-p3="value-picker"] [data-p3="value-picker-reset"]'));
      await page.waitForTimeout(80);
    };
    const close = async () => { if (await page.locator('[data-p3="value-picker-close"]').count()) await hooks.click(page.locator('[data-p3="value-picker-close"]')); };
    // In Light, a weight past its neighbor is offered disabled with the reason, and clicking it writes nothing.
    await hooks.click(page.locator('[data-p3="weight-pick"][data-role="strong"]'));
    const refused = await page.evaluate(() => { const b = document.querySelector('[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="300"]'); return { off: b?.getAttribute('aria-disabled'), why: b?.querySelector('.p3-vpick-why')?.textContent ?? null }; });
    ok(refused.off === 'true' && refused.why === 'Lighter than emphasis (500). Weights stay in order.', `Q65: the strong weight's 300 is offered disabled with its reason (${JSON.stringify(refused)})`);
    // force: Playwright holds an aria-disabled button not actionable; the point is that a click on it writes nothing.
    await hooks.click(page.locator('[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="300"]'), { force: true });
    await page.waitForTimeout(80);
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(p0), 'Q65: clicking a disabled weight writes nothing');
    await close();
    // #831: a weight tick repaints the text type's style count at once. Oracle: the emission's type.display leaves
    // and its display sizes, so ticking one more weight adds one style per size.
    const dispLeaves = (() => { const out = []; const w = (n) => { for (const [k, v] of Object.entries(n ?? {})) { if (k.startsWith('$')) continue; if (v?.$type === 'typography') out.push(v); else w(v); } }; w(OUT[OUT_ROOT]?.type?.display); return out; })();
    const dispSizes = new Set(dispLeaves.map((v) => v.$extensions?.prism3?.variant)).size;
    const countOf = () => page.evaluate(() => document.querySelector('[data-p3="weights-row"][data-group="display"] [data-p3="weights-count"]')?.textContent ?? null);
    ok((await countOf()) === `${dispLeaves.length} styles`, `#831: display's style count is the emission's ${dispLeaves.length} styles (${await countOf()})`);
    await hooks.click(page.locator('[data-p3="weights-row"][data-group="display"] [data-p3="weight-cell"][data-role="subtle"]'));
    await page.waitForFunction((w) => document.querySelector('[data-p3="weights-row"][data-group="display"] [data-p3="weights-count"]')?.textContent === w, `${dispLeaves.length + dispSizes} styles`, { timeout: 5000 }).catch(() => {});
    ok((await countOf()) === `${dispLeaves.length + dispSizes} styles`, `#831: ticking subtle on display repaints its count at once, ${dispLeaves.length + dispSizes} styles (${await countOf()})`);
    await hooks.click(page.locator('[data-p3="weights-row"][data-group="display"] [data-p3="weight-cell"][data-role="subtle"]'));
    await page.waitForFunction((w) => document.querySelector('[data-p3="weights-row"][data-group="display"] [data-p3="weights-count"]')?.textContent === w, `${dispLeaves.length} styles`, { timeout: 5000 }).catch(() => {});
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(p0), '#831: unticking it returns the persisted brand to its bytes');
    // A nudge in Light (brand-wide), its bytes noted, then undone.
    await page.locator('[data-p3="nudge-lh"][data-group="body"]').selectOption('1');
    await page.waitForFunction(() => document.querySelector('[data-p3="nudge-lh"][data-group="body"]')?.value === '1');
    const pLight = await persisted(page);
    ok(pLight?.typography?.leadingShift?.body === 1 && pLight?.modeLevers === undefined, `type: in Light, body one step looser writes typography.leadingShift.body 1 (${JSON.stringify(pLight?.typography?.leadingShift)})`);
    await page.locator('[data-p3="nudge-lh"][data-group="body"]').selectOption('0');
    await page.waitForFunction(() => document.querySelector('[data-p3="nudge-lh"][data-group="body"]')?.value === '0');
    const pZero = await persisted(page);
    await chooseMode(page, 'dark');
    // Dark: the weight.
    const auto = await page.evaluate(() => document.querySelector('[data-p3="weight-pick"][data-role="strong"] .p3-btn-label')?.textContent);
    ok(auto === 'Auto: follows Light (600)', `Q62: previewing Dark, the strong weight reads "Auto: follows Light (600)" ("${auto}")`);
    await pick('[data-p3="weight-pick"][data-role="strong"]', 700);
    const p1 = await persisted(page);
    ok(p1?.modeLevers?.dark?.weights?.strong === 700 && JSON.stringify(p1?.typography?.weightRoles) === JSON.stringify(p0?.typography?.weightRoles),
      `previewing Dark, a weight edit writes modeLevers.dark.weights.strong and not the brand value — wrote modeLevers ${JSON.stringify(p1?.modeLevers)}, typography.weightRoles ${JSON.stringify(p1?.typography?.weightRoles)}`);
    await reset('[data-p3="weight-pick"][data-role="strong"]');
    await close();
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(pZero), 'Q62: Return to Auto on the Dark weight prunes modeLevers: the persisted brand is the one before');
    // Dark: a heading's desktop size.
    const sizeBtn = '[data-p3="type-size-desktop"][data-group="title"][data-variant="xs"]';
    const sAuto = await page.evaluate((s) => document.querySelector(`${s} .p3-btn-label`)?.textContent, sizeBtn);
    ok(sAuto === 'Auto: follows Light (18px)', `Q62: previewing Dark, title xs's desktop size reads "Auto: follows Light (18px)" ("${sAuto}")`);
    await pick(sizeBtn, 16);
    const p2 = await persisted(page);
    ok(p2?.modeLevers?.dark?.typeSizes?.title?.xs === 16 && p2?.typography?.sizes === undefined,
      `previewing Dark, a heading's desktop size writes modeLevers.dark.typeSizes.title.xs and not typography.sizes — wrote ${JSON.stringify(p2?.modeLevers)}, ${JSON.stringify(p2?.typography?.sizes)}`);
    await reset(sizeBtn);
    await close();
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(pZero), 'Q62: Return to Auto on the Dark size prunes modeLevers');
    // Dark: a line height swap (Light has none).
    await page.locator('[data-p3="lh-swap"][data-name="normal"]').selectOption('relaxed');
    await page.waitForFunction(() => document.querySelector('[data-p3="lh-swap"][data-name="normal"]')?.value === 'relaxed');
    const p3 = await persisted(page);
    ok(p3?.modeLevers?.dark?.lineHeights?.normal === 'relaxed' && JSON.stringify(p3?.typography) === JSON.stringify(pZero?.typography),
      `previewing Dark, a line height swap writes modeLevers.dark.lineHeights.normal and nothing brand-wide — wrote ${JSON.stringify(p3?.modeLevers)}`);
    await page.locator('[data-p3="lh-swap"][data-name="normal"]').selectOption('');
    await page.waitForFunction(() => document.querySelector('[data-p3="lh-swap"][data-name="normal"]')?.value === '');
    // Dark: the same nudge writes the same bytes as from Light (Q54).
    await page.locator('[data-p3="nudge-lh"][data-group="body"]').selectOption('1');
    await page.waitForFunction(() => document.querySelector('[data-p3="nudge-lh"][data-group="body"]')?.value === '1');
    ok(JSON.stringify(await persisted(page)) === JSON.stringify(pLight), 'Q54: previewing Dark, body one step looser writes the same bytes as from Light');
    await page.locator('[data-p3="nudge-lh"][data-group="body"]').selectOption('0');
    await page.waitForFunction(() => document.querySelector('[data-p3="nudge-lh"][data-group="body"]')?.value === '0');
    await chooseMode(page, 'light');
    // The floors: caption 10 then back unsets; size 8 shows its warning, then back.
    await hooks.click(page.locator('[data-p3="caption-floor-10"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="caption-floor-10"]')?.getAttribute('aria-checked') === 'true');
    ok((await persisted(page))?.typography?.captionFloor === 10, 'type: the 10px caption floor writes typography.captionFloor 10');
    await hooks.click(page.locator('[data-p3="caption-floor-11"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="caption-floor-11"]')?.getAttribute('aria-checked') === 'true');
    ok(!('captionFloor' in ((await persisted(page))?.typography ?? {})), 'type: back to 11px, the caption floor is unset (the default)');
    await hooks.click(page.locator('[data-p3="size-floor-8"]'));
    await hooks.need(page, '[data-p3="size-floor-warn"]');
    const warn = await page.evaluate(() => document.querySelector('[data-p3="size-floor-warn"]')?.textContent);
    ok(warn === '8px is below the sizes the contrast floors were set for. Use it only for fine print that has an accessible alternative.', `type: the 8px size floor shows its warning ("${warn}")`);
    await hooks.click(page.locator('[data-p3="size-floor-10"]'));
    await page.waitForFunction(() => !document.querySelector('[data-p3="size-floor-warn"]'));
    // B8b (owner, 2026-10-03): under the Compact scale the 16px smallest title is disabled, with the approved reason;
    // back on Default it is live again. Nothing is written by the disabled chip.
    await hooks.click(page.locator('[data-p3="type-scale-compact"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="type-scale-compact"]')?.getAttribute('aria-checked') === 'true');
    const f16 = await page.evaluate(() => { const b = document.querySelector('[data-p3="title-floor-16"]'); return { off: b?.disabled, why: b?.title }; });
    ok(f16.off === true && f16.why === 'The Compact scale already places a title at 16px, so the engine refuses 16px with it.',
      `B8b: under the Compact scale the 16px smallest title is disabled with its reason (${JSON.stringify(f16)})`);
    await hooks.click(page.locator('[data-p3="type-scale-default"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="type-scale-default"]')?.getAttribute('aria-checked') === 'true');
    ok((await page.evaluate(() => document.querySelector('[data-p3="title-floor-16"]')?.disabled)) === false, 'B8b: back on the Default scale the 16px smallest title is selectable again');
    // #2044 (owner, 2026-10-04): with display md set individually, on desktop or on mobile, a largest display size
    // below it is disabled with the approved reason, and every one at or above md stays live. EXPECTED typed here:
    // the ceiling order and the reason's words, never read from the page's module (docs/34).
    {
      const ORDER = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'];
      const REASON = 'Smaller than display md, which you set individually.';
      const ceil = () => page.evaluate(() => [...document.querySelectorAll('[data-p3="type-ceiling"] option')].map((o) => ({ v: o.value, off: o.disabled, why: o.title })));
      const firstFree = () => page.evaluate(() => document.querySelector('[data-p3="value-picker"] [data-p3="value-picker-value"]:not([aria-disabled="true"]):not([aria-pressed="true"])')?.getAttribute('data-value') ?? null);
      const pCeil = await persisted(page);
      for (const [vp, btn] of [['desktop', '[data-p3="type-size-desktop"][data-group="display"][data-variant="md"]'], ['mobile', '[data-p3="type-size-mobile"][data-group="display"][data-variant="md"]']]) {
        await hooks.click(page.locator(btn));
        await hooks.need(page, '[data-p3="value-picker"]');
        const to = await firstFree();
        await pick(btn, to);
        await close();
        await page.waitForFunction(() => document.querySelector('[data-p3="type-ceiling"] option[value="sm"]')?.disabled === true, null, { timeout: 5000 }).catch(() => {});
        const got = await ceil();
        const want = ORDER.map((v) => (v === 'sm' ? { v, off: true, why: REASON } : { v, off: false, why: '' }));
        ok(JSON.stringify(got) === JSON.stringify(want),
          `#2044: with display md set on ${vp} (${to}px), display.sm is disabled with "${REASON}" and md to 3xl stay live (${JSON.stringify(got)})`);
        await reset(btn);
        await close();
        ok(JSON.stringify(await persisted(page)) === JSON.stringify(pCeil), `#2044: releasing display md's ${vp} size returns the brand to its bytes`);
        ok((await ceil()).every((o) => !o.off), `#2044: with no display size set, every largest display size is live again (${vp})`);
      }
    }
    // A text type that pins a font style cannot be Italic only: the chip is disabled with the reason.
    const pinIn = page.locator('[data-p3="pin-cut-row"][data-cat="body"][data-role="default"] [data-p3="pin-cut-input"]');
    await pinIn.fill('Medium');
    await pinIn.evaluate((e) => e.blur());
    await page.waitForFunction(() => document.querySelector('[data-p3="italic-row"][data-group="body"] [data-p3="italic-choice-only"]')?.disabled === true, null, { timeout: 5000 }).catch(() => {});
    const only = await page.evaluate(() => { const b = document.querySelector('[data-p3="italic-row"][data-group="body"] [data-p3="italic-choice-only"]'); return { off: b?.disabled, why: b?.title }; });
    ok(only.off === true && only.why === 'This text type pins a font style. Clear the pin first: Italic only sets the style from the weight.', `type: with a pinned style, body's "Italic only" is disabled with its reason (${JSON.stringify(only)})`);
    await page.locator('[data-p3="pin-cut-row"][data-cat="body"][data-role="default"] [data-p3="pin-cut-input"]').fill('');
    await page.locator('[data-p3="pin-cut-row"][data-cat="body"][data-role="default"] [data-p3="pin-cut-input"]').evaluate((e) => e.blur());
    await page.waitForFunction(() => document.querySelector('[data-p3="italic-row"][data-group="body"] [data-p3="italic-choice-only"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
    const pEnd = await persisted(page);
    // Against the brand after the nudge was undone: a zero nudge leaves `leadingShift: {}` (the legacy bytes).
    ok(JSON.stringify(pEnd) === JSON.stringify(pZero), `type: every edit after the nudge undone, the persisted brand is the one it was${JSON.stringify(pEnd) === JSON.stringify(pZero) ? '' : ` — typography ${JSON.stringify(pEnd?.typography)}, modeLevers ${JSON.stringify(pEnd?.modeLevers)}; was ${JSON.stringify(pZero?.typography)}`}`);
    ok(errors.length === 0, `type S6.3 edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S6.3 Type edits: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// typography.responsive has one home (owner decision Q71): Type › Scale limits draws it, and the legacy Layout page,
// which drew "Responsive type sizing" and its fluid read-out (#361), no longer does. Both hosts.
for (const host of ['web', 'figma']) {
  const { ctx, page } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await openTypeAdvanced(page);
    const onType = await page.evaluate(() => document.querySelectorAll('[data-p3="levers-pane"] [data-p3="lever-typography-responsive"]').length);
    await goPlace(page, 'layout');
    await hooks.need(page, '[data-p3="legacy-page"]');
    const onLayout = await page.evaluate(() => {
      const lp = document.querySelector('[data-p3="legacy-page"]');
      const out = [];
      for (const t of lp.querySelectorAll('[data-p3="section-title"], .cs-title, h2, h3')) if (/responsive type|fluid/i.test(t.textContent)) out.push(`title "${t.textContent.trim()}"`);
      if (lp.querySelector('[data-sg-section="type-fluid"], [data-sg-section="type-scale"]')) out.push('the fluid read-out');
      if (/Fluid heading sizing|Min viewport|Max viewport/.test(lp.textContent)) out.push('the fluid switch or the viewport fields');
      return out;
    });
    ok(onType === 1 && onLayout.length === 0, `typography.responsive is drawn on Type only${onType !== 1 ? ` — drawn ${onType} time(s) on Type` : ''}${onLayout.length ? ` — also on Layout (${onLayout.join(', ')})` : ''} (${host})`);
  } catch (e) {
    ok(false, `S6.3 responsive home ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 21. QA-B9, QA-B17, QA-I11 (owner decisions, 2026-10-02): an edit on Surfaces & fills and Interactive eases the
//     preview to its section, on the chrome's motion tokens, and jumps under reduced motion; nothing but an edit
//     moves it, and no edit changes its page; the jump links ease the same way under "Jump to:"; each page keeps
//     both panes' scroll positions for the session.
//
//     Independence (docs/34): which preview section a lever section pairs with is typed here as the owner's
//     decisions state it (Q23 headings, Q26 and Q44 for the two renamed ones), never read from
//     `follow-edit.ts`'s table; the motion values are the default theme's `motion.transition.default` as
//     literals; every position is read from the rendered layout.
//
//     Mutations this fails by name: drop the reveal on Surfaces & fills → `QA-B9: editing a Border step on
//     Surfaces & fills brings the preview's Border section into view …`; ignore reduced motion →
//     `QA-B9: under reduced motion the reveal lands at once …`; reveal on focus → `QA-B9: focusing a lever …
//     does not move the preview …`; no restore → `QA-I11: back on Surfaces & fills, both panes are where they
//     were …`; a wrong label → `QA-B17: … the jump links' visible label reads "Jump to:" …`.
// =============================================================================================
console.log(`\nQA-B9, B17, I11 — the eased reveal, the jump links, the remembered scroll\n${'='.repeat(78)}`);
{
  /** The lever section → the preview section it reveals, as the owner decided them (typed, not imported). */
  const PAIRS_FILLS = { 'Background fills': 'Background', Scrim: 'Scrim', Foreground: 'Foreground', 'Foreground fills': 'Foreground', 'Text color': 'Text color', Border: 'Border', Icon: 'Icon', Fields: 'Fields', Gradients: 'Gradients' };
  /** `motion.transition.default` of the default theme: `motion.duration.normal` and `motion.easing.standard`. */
  const MOTION = { dur: '200ms', ease: 'cubic-bezier(0.2, 0, 0, 1)' };
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    /** The preview section headed `title`: its box against the body's, and where the body is. */
    const sec = (title) => page.evaluate((t) => {
      const body = document.querySelector('[data-p3="preview-body"]');
      const head = [...body.querySelectorAll('[data-p3="section-title"]')].find((n) => n.textContent === t);
      const el = head?.closest('.psec');
      const b = body.getBoundingClientRect(), r = el?.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(body.firstElementChild).paddingTop || '0');
      return { found: !!el, top: Math.round(body.scrollTop), max: body.scrollHeight - body.clientHeight, rel: r ? Math.round(r.top - b.top) : null, pad,
        inView: !!r && r.top >= b.top - 1 && r.top < b.bottom - 40, view: body.dataset.view, place: document.querySelector('[data-p3="frame"]')?.dataset.place };
    }, title);
    const setTop = (hook, y) => page.evaluate(([h, v]) => { const n = document.querySelector(`[data-p3="${h}"]`); n.scrollTop = v; return Math.round(n.scrollTop); }, [hook, y]);
    /** Every animation frame's scrollTop of a pane, and the time it took, until it has held still for ten frames. */
    const frames = (which) => page.evaluate((w) => new Promise((res) => {
      const b = document.querySelector(w === 'levers' ? '[data-p3="levers-pane"]' : '[data-p3="preview-body"]');
      const tops = [Math.round(b.scrollTop)];
      const t0 = performance.now();
      let still = 0, moved = null, settled = null;
      const tick = (now) => {
        const t = Math.round(b.scrollTop);
        if (t !== tops[tops.length - 1]) { still = 0; moved ??= now; settled = now; } else still++;
        tops.push(t);
        if (still >= 10 || tops.length > 400) res({ tops, ms: moved === null ? 0 : Math.round(settled - moved + 16), t0 }); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), which);
    const between = (tops) => new Set(tops.filter((t) => t !== tops[0] && t !== tops[tops.length - 1])).size;
    const lands = (s) => s.inView && (Math.abs(s.rel - s.pad) <= 2 || s.top >= s.max - 1);

    await goPlace(page, 'color-fills');
    // The panes read the chrome's default transition.
    const tok = await page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"], [data-p3="preview-body"]')]
      .map((n) => [getComputedStyle(n).getPropertyValue('--p3-scroll-dur').trim(), getComputedStyle(n).getPropertyValue('--p3-scroll-ease').trim()]));
    ok(tok.length === 2 && tok.every(([d, e]) => d === MOTION.dur && e === MOTION.ease),
      `QA-B9: both panes scroll on the chrome's default transition, ${MOTION.dur} and ${MOTION.ease} — read ${JSON.stringify(tok)}`);

    // (a) Surfaces & fills: a Border step picked with the preview at its top eases the Border section into view.
    await setTop('preview-body', 0);
    const a0 = await sec(PAIRS_FILLS.Border);
    ok(a0.found && !a0.inView, `QA-B9: on Surfaces & fills the preview's Border section starts below the fold, so the reveal can move (${JSON.stringify(a0)})`);
    await hooks.click(page.locator('#p3-lsec-fills-5 [data-p3="fill-pick"]').first());
    await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
    const opened = await sec(PAIRS_FILLS.Border);
    ok(opened.top === 0, `QA-B9: opening a step picker is not an edit, and does not move the preview (scrollTop ${opened.top}, was 0)`);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][aria-pressed="false"]').first());
    const fa = await frames('preview');
    const a1 = await sec(PAIRS_FILLS.Border);
    ok(lands(a1), `QA-B9: editing a Border step on Surfaces & fills brings the preview's Border section into view, its top ${a1.pad}px under the body's (top at ${a1.rel}px, scrollTop ${a1.top}, in view ${a1.inView})`);
    ok(between(fa.tops) >= 2, `QA-B9: without reduced motion the Surfaces & fills reveal glides through positions on its way (${between(fa.tops)} in-between over ${fa.tops.length} frames, ${fa.tops[0]} → ${fa.tops[fa.tops.length - 1]})`);
    ok(fa.ms >= 120 && fa.ms <= 800, `QA-B9: the glide lasts about the default transition's ${MOTION.dur} (${fa.ms}ms from first move to settled)`);
    ok(a1.view === 'surfaces' && a1.place === 'color-fills', `QA-B9: an edit on Surfaces & fills never changes the preview's page or view (V1) — ${a1.place} / ${a1.view}`);

    // (b2) #2016 (Q80): Fields has a preview section now, so a field step picked eases the preview's Fields section into
    // view, as Border's does. Section 8 of the levers is Fields (Background fills, Scrim, Foreground, Foreground fills,
    // Text color, Border, Icon, Fields), read by its title so a reorder fails here by name.
    await page.keyboard.press('Escape');
    await setTop('preview-body', 0);
    const f0 = await sec(PAIRS_FILLS.Fields);
    const fieldsSec = await page.evaluate(() => [...document.querySelectorAll('[data-p3="fills-levers"] .p3-lsec')].find((x) => x.querySelector('.p3-lsec-title')?.textContent === 'Fields')?.id ?? null);
    ok(f0.found && !f0.inView && !!fieldsSec, `#2016: on Surfaces & fills the preview draws a Fields section, below the fold, and the levers a Fields section (${JSON.stringify(f0)}, levers #${fieldsSec})`);
    if (fieldsSec) {
      await hooks.click(page.locator(`#${fieldsSec} [data-p3="fill-pick"]`).nth(1));
      await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');
      await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][aria-pressed="false"]').first());
      await frames('preview');
      const f1 = await sec(PAIRS_FILLS.Fields);
      ok(lands(f1), `#2016: editing a Fields step on Surfaces & fills brings the preview's Fields section into view (top at ${f1.rel}px, scrollTop ${f1.top}, in view ${f1.inView})`);
      await page.keyboard.press('Escape');
    }
    await hooks.click(page.locator('#p3-lsec-fills-5 [data-p3="fill-pick"]').first());
    await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]');

    // (c) Under reduced motion it lands at once: in place when the edit returns, and no frame between.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setTop('preview-body', 0);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][aria-pressed="false"]').first());
    const c1 = await sec(PAIRS_FILLS.Border);
    const fc = await frames('preview');
    ok(lands(c1) && between(fc.tops) === 0 && fc.tops.every((t) => t === c1.top),
      `QA-B9: under reduced motion the reveal lands at once, with no frame between (at ${c1.rel}px, frames ${JSON.stringify([...new Set(fc.tops)])})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.keyboard.press('Escape');

    // (d) Focusing a lever (by Tab and by focus()), and changing the mode, never move the preview.
    await setTop('preview-body', 0);
    await page.locator('#p3-lsec-fills-6 [data-p3="icons-unpair"], #p3-lsec-fills-6 [data-p3="icons-pair"]').first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const d1 = await frames('preview');
    ok(d1.tops.every((t) => t === 0), `QA-B9: focusing a lever on Surfaces & fills does not move the preview (scrollTops ${JSON.stringify([...new Set(d1.tops)])})`);
    await chooseAnyMode(page, 'dark');
    const d2 = await frames('preview');
    ok(d2.tops.every((t) => t === 0), `QA-B9: changing the mode on Surfaces & fills does not move the preview (scrollTops ${JSON.stringify([...new Set(d2.tops)])})`);
    await chooseAnyMode(page, 'light');

    // (f) A jump link eases its section to the top of the levers pane, under the visible "Jump to:".
    const lab = await page.evaluate(() => ({
      text: document.querySelector('[data-p3="fills-jump"] [data-p3="jump-label"]')?.textContent ?? null,
      first: document.querySelector('[data-p3="fills-jump"]')?.firstElementChild?.getAttribute('data-p3') ?? null,
      name: document.querySelector('[data-p3="fills-jump"]')?.getAttribute('aria-label') ?? null,
    }));
    ok(lab.text === 'Jump to:' && lab.first === 'jump-label', `QA-B17: on Surfaces & fills the jump links' visible label reads "Jump to:", first in the links (${JSON.stringify(lab)})`);
    ok(lab.name === 'Sections on this page', `QA-B17: the jump links' landmark keeps its accessible name "Sections on this page" ("${lab.name}")`);
    const jumpTo = async (i) => {
      await setTop('levers-pane', 0);
      await hooks.click(page.locator('[data-p3="fills-jump-link"]').nth(i));
      const f = await frames('levers');
      const j = await page.evaluate((k) => {
        const pane = document.querySelector('[data-p3="levers-pane"]');
        const s = document.querySelector(`#p3-lsec-fills-${k}`);
        return { rel: Math.round(s.getBoundingClientRect().top - pane.getBoundingClientRect().top), top: Math.round(pane.scrollTop),
          focus: document.activeElement?.id ?? null, view: document.querySelector('[data-p3="preview-body"]')?.dataset.view };
      }, i);
      return { f, j };
    };
    const ja = await jumpTo(5);
    ok(Math.abs(ja.j.rel) <= 2 && ja.j.focus === 'p3-lsec-fills-5', `QA-B17: the Border jump link lands its section at the top of the levers pane, and focuses it (${JSON.stringify(ja.j)})`);
    ok(between(ja.f.tops) >= 2, `QA-B17: without reduced motion a jump link glides through positions on its way (${between(ja.f.tops)} in-between over ${ja.f.tops.length} frames)`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const jb = await jumpTo(4);
    ok(Math.abs(jb.j.rel) <= 2 && between(jb.f.tops) === 0, `QA-B17: under reduced motion a jump link lands at once (top at ${jb.j.rel}px, frames ${JSON.stringify([...new Set(jb.f.tops)])})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // (e) Both panes keep their place per page, for the session: Surfaces & fills → Palettes → back.
    const L = await setTop('levers-pane', 700), P = await setTop('preview-body', 900);
    ok(L > 0 && P > 0, `QA-I11: both panes on Surfaces & fills scroll (levers ${L}, preview ${P}), so the restore is observable`);
    await goPlace(page, 'color-palettes');
    const pal = await page.evaluate(() => [document.querySelector('[data-p3="levers-pane"]').scrollTop, document.querySelector('[data-p3="preview-body"]').scrollTop].map(Math.round));
    ok(pal[0] === 0 && pal[1] === 0, `QA-I11: Palettes opens where it was left, at its top, not at Surfaces & fills' place (${JSON.stringify(pal)})`);
    await setTop('preview-body', 300);
    await goPlace(page, 'color-fills');
    const e1 = await page.evaluate(() => [document.querySelector('[data-p3="levers-pane"]').scrollTop, document.querySelector('[data-p3="preview-body"]').scrollTop].map(Math.round));
    const fe = await frames('preview');
    ok(Math.abs(e1[0] - L) <= 2 && Math.abs(e1[1] - P) <= 2, `QA-I11: back on Surfaces & fills, both panes are where they were (levers ${e1[0]}, was ${L}; preview ${e1[1]}, was ${P})`);
    ok(between(fe.tops) === 0 && fe.tops.every((t) => Math.abs(t - P) <= 2), `QA-I11: the restore does not glide, and no reveal follows it (frames ${JSON.stringify([...new Set(fe.tops)])})`);
    await goPlace(page, 'color-palettes');
    const e2 = await page.evaluate(() => Math.round(document.querySelector('[data-p3="preview-body"]').scrollTop));
    ok(Math.abs(e2 - 300) <= 2, `QA-I11: each page keeps its own place: Palettes' preview is back at 300 (${e2})`);

    // (b) Interactive: a link palette edit, with the preview at its top, eases the Links section into view. (S5.3,
    // QA-I10, removed Interactive's icon contrast control and its Icons section; Links is the section below the fold.)
    await goPlace(page, 'color-interactive');
    await setTop('preview-body', 0);
    const b0 = await sec('Links');
    ok(b0.found && !b0.inView, `QA-B9: on Interactive the preview's Links section starts below the fold, so the reveal can move (${JSON.stringify(b0)})`);
    const lk = page.locator('[data-p3="levers-pane"] [data-p3="link-palette-select"]');
    const opts = await lk.evaluate((s) => [...s.options].filter((o) => !o.selected && !o.disabled).map((o) => o.value));
    await lk.selectOption(opts[0]);
    const fb = await frames('preview');
    const b1 = await sec('Links');
    ok(lands(b1), `QA-B9: editing the link palette on Interactive brings the preview's Links section into view, its top ${b1.pad}px under the body's or the preview at its end (top at ${b1.rel}px, scrollTop ${b1.top} of ${b1.max})`);
    ok(between(fb.tops) >= 2, `QA-B9: without reduced motion the Interactive reveal glides through positions on its way (${between(fb.tops)} in-between over ${fb.tops.length} frames)`);
    ok(b1.view === 'interactive' && b1.place === 'color-interactive', `QA-B9: an edit on Interactive never changes the preview's page or view (V1) — ${b1.place} / ${b1.view}`);
    const ilab = await page.evaluate(() => ({ text: document.querySelector('[data-p3="interactive-jump"] [data-p3="jump-label"]')?.textContent ?? null, name: document.querySelector('[data-p3="interactive-jump"]')?.getAttribute('aria-label') ?? null }));
    ok(ilab.text === 'Jump to:' && ilab.name === 'Button sets', `QA-B17: on Interactive the jump links' visible label reads "Jump to:", and the landmark keeps "Button sets" (${JSON.stringify(ilab)})`);
    // (g) Type (S6.3): an edit in a Type lever section eases the preview to the section it pairs with (Q23): the
    // type scale to Scale; a limit (the caption floor) to Scale too, its pair by the scope (§3); a weight tick to
    // Weights and styles. Pairs typed here.
    await goPlace(page, 'type');
    await openTypeAdvanced(page);
    const typeEdit = async (what, sel, want) => {
      await setTop('preview-body', 0);
      const t0 = await sec(want);
      await hooks.click(page.locator(sel));
      const f = await frames('preview');
      const t1 = await sec(want);
      ok(t0.found && !t0.inView && lands(t1) && t1.view === 'type' && t1.place === 'type',
        `QA-B9: editing ${what} on Type brings the preview's ${want} section into view, on the same page (from below the fold: ${!t0.inView}; top at ${t1.rel}px, scrollTop ${t1.top} of ${t1.max}; ${t1.place} / ${t1.view})`);
      return f;
    };
    const ft = await typeEdit('the type scale', '[data-p3="type-scale-compact"]', 'Scale');
    ok(between(ft.tops) >= 2, `QA-B9: without reduced motion the Type reveal glides through positions on its way (${between(ft.tops)} in-between over ${ft.tops.length} frames)`);
    await typeEdit('the type scale back', '[data-p3="type-scale-default"]', 'Scale');
    await typeEdit('the caption floor (Scale limits)', '[data-p3="caption-floor-10"]', 'Scale');
    await typeEdit('the caption floor back', '[data-p3="caption-floor-11"]', 'Scale');
    await typeEdit('a weight tick', '[data-p3="weights-row"][data-group="eyebrow"] [data-p3="link-cell"]', 'Weights and styles');
    await typeEdit('the same tick back', '[data-p3="weights-row"][data-group="eyebrow"] [data-p3="link-cell"]', 'Weights and styles');
    // Focusing a Type lever, and opening a picker, are not edits: the preview stays where it is.
    await setTop('preview-body', 0);
    await hooks.click(page.locator('[data-p3="weight-pick"][data-role="strong"]'));
    const tf = await frames('preview');
    ok(tf.tops.every((t) => t === 0), `QA-B9: opening a value picker on Type does not move the preview (scrollTops ${JSON.stringify([...new Set(tf.tops)])})`);
    ok(errors.length === 0, `QA-B9/B17/I11: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `QA-B9/B17/I11: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 22. The shared styling pass (the owner's QA, evening 2026-10-02: QA-B2, B5, B8, B11, B18, I12, R1), read from the RENDERED layout on both hosts and in both chrome themes.
//
//     Independence (docs/34): every length and color the page is held to is read here from the token tree the
//     chrome is built from (`chrome/tokens.mjs` over the committed emission): `space.300` for the row gap,
//     `core.dimension.40` for the swatch, `core.font.size.12` for the row text, and `color.inverse.background.primary`
//     with `color.inverse.text.primary` for Continue, per chrome theme. Never the page's `--p3-*` variables, never
//     `chrome.css`. Which controls count as a row's name, a select or a step-picker button is read by element and
//     hook (`select`, a step-picker button by its hook, the `.p3-fill-name` block), and each page must REPRESENT each
//     row type, so an empty page cannot pass. The 16px caret allowance and the 0.5px tolerance are literals here.
//
//     Mutations this fails by name: the token back above the label → `QA-B2: … the token sits below its label …`;
//     a pick button's caret back after its text → `QA-B5: … every select and step-picker button has its caret within
//     16px of its right edge …`; the row gap back to 150 → `QA-B8: … rows stand space.300 apart …`; the swatch at 32 →
//     `QA-B11: … every swatch is 40×40 …`; Continue back to the ghost button → `QA-I12: … Continue is the filled
//     primary button …`.
// =============================================================================================
console.log(`\nShared styling (QA-B2, B5, B8, B11, B18, I12, R1)\n${'='.repeat(78)}`);
/** THE ORACLE: the chrome's own tokens, per chrome theme, from the token tree the chrome is built from. */
const STYLE = (() => {
  const m = loadModes();
  const v = (tree, p) => String(resolveToken(tree, P(p)).value).toLowerCase();
  const px = (s) => (s.endsWith('rem') ? parseFloat(s) * 16 : parseFloat(s));
  const rgb = (hx) => `rgb(${parseInt(hx.slice(1, 3), 16)}, ${parseInt(hx.slice(3, 5), 16)}, ${parseInt(hx.slice(5, 7), 16)})`;
  return {
    rowGap: px(v(m.light, 'space.300')), swatch: px(v(m.light, 'core.dimension.40')), rowText: px(v(m.light, 'core.font.size.12')),
    fill: { light: rgb(v(m.light, 'color.inverse.background.primary')), dark: rgb(v(m.dark, 'color.inverse.background.primary')) },
    ink: { light: rgb(v(m.light, 'color.inverse.text.primary')), dark: rgb(v(m.dark, 'color.inverse.text.primary')) },
  };
})();
ok(STYLE.rowGap === 24 && STYLE.swatch === 40 && STYLE.rowText === 12 && /^rgb\(/.test(STYLE.fill.light) && STYLE.fill.light !== STYLE.fill.dark,
  `shared styling oracle: space.300, core.dimension.40 and core.font.size.12 resolve to px, and the inverse fill per theme (${JSON.stringify(STYLE)})`);
/** A caret is within this many px of its control's right edge (the task's allowance, literal). */
const CARET_EDGE = 16;
/** Every `.p3-fill-name` in the levers pane: where its label and its token sit, and which row type it is in. */
const readNames = (page) => page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"] .p3-fill-name')].filter((n) => n.offsetParent).map((n) => {
  const lab = n.querySelector('.p3-fill-label'), tok = n.querySelector('.p3-fill-tok');
  const L = lab?.getBoundingClientRect(), T = tok?.getBoundingClientRect();
  const kind = n.closest('[data-p3="family-row"]') ? 'type-family' : n.closest('[data-p3="face-row"]') ? 'type-face' : n.closest('[data-p3="interactive-levers"]') ? 'interactive-row'
    : n.closest('[data-p3="type-size-row"]') ? 'type-size' : n.closest('[data-p3="weight-row"]') ? 'type-weight'
    : n.closest('[data-p3="lh-row"]') ? 'type-line-height' : n.closest('[data-p3="ls-row"]') ? 'type-letter-spacing'
    // S4f (QA-B1): Background fills' controls are rows now, inside the surfaces lever; a name in a `.p3-field` is the
    // shape they had before.
    : n.closest('[data-p3="lever-surfaces"] .p3-fillrow') ? 'background-row' : n.closest('.p3-fillrow') ? 'fill-row' : n.closest('.p3-field') ? 'fill-field' : 'other';
  return { kind, role: n.closest('.p3-fillrow')?.dataset.role ?? null, token: tok?.textContent ?? null, label: lab?.textContent ?? null, below: !!L && !!T && T.top >= L.bottom - 0.5,
    labTop: L ? Math.round(L.top) : null, tokTop: T ? Math.round(T.top) : null, tokFont: tok ? getComputedStyle(tok).fontFamily : null };
}));
/** Every select and step-picker button drawn in the levers pane: height, font size, alignment and where its caret is. */
/** The step-picker buttons, by hook (literal, so the hook guard reads them). */
const PICK_SEL = ['fill-pick', 'int-pick', 'surface-base-pick', 'surface-secondary-pick', 'surface-tertiary-pick', 'surface-band-step-pick',
  'surface-inverse-secondary-pick', 'surface-inverse-tertiary-pick', 'surface-floor-pick'].map((x) => `button[data-p3="${x}"]`).join(', ');
const readControls = (page) => page.evaluate((PICKS) => {
  const pane = document.querySelector('[data-p3="levers-pane"]');
  // The chrome's selects. (Type's lent legacy region was excluded until S6.3 replaced it; every select is chrome now.)
  const sels = [...pane.querySelectorAll('select')].filter((s) => s.offsetParent).map((s) => {
    const r = s.getBoundingClientRect();
    const caret = s.parentElement?.querySelector(':scope > svg');
    const c = caret?.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return { kind: 'select', hook: s.getAttribute('data-p3'), h: +r.height.toFixed(2), fs: parseFloat(cs.fontSize), align: cs.textAlign,
      caretGap: c ? +(r.right - c.right).toFixed(2) : null, textStart: null };
  });
  const picks = [...pane.querySelectorAll(PICKS)].filter((b) => b.offsetParent).map((b) => {
    const r = b.getBoundingClientRect();
    const svgs = b.querySelectorAll(':scope > svg');
    const caret = svgs[svgs.length - 1]?.getBoundingClientRect();
    const label = b.querySelector(':scope > span');
    const lr = label?.getBoundingClientRect();
    return { kind: 'pick', hook: b.getAttribute('data-p3'), h: +r.height.toFixed(2), fs: label ? parseFloat(getComputedStyle(label).fontSize) : null,
      align: label ? getComputedStyle(label).textAlign : null, caretGap: caret ? +(r.right - caret.right).toFixed(2) : null,
      textStart: lr ? +(lr.left - r.left - parseFloat(getComputedStyle(b).borderLeftWidth) - parseFloat(getComputedStyle(b).paddingLeft)).toFixed(2) : null };
  });
  return [...sels, ...picks];
}, PICK_SEL);
/** The vertical gaps between consecutive rows in each row list: [list, gap]. */
const readRowGaps = (page) => page.evaluate(() => {
  const out = [];
  /** Consecutive visible nodes; with `isRow`, only neighbors that are both rows (a sub-heading between two breaks the pair). */
  const pairs = (list, nodes, isRow = () => true) => { const v = nodes.filter((n) => n.offsetParent); for (let i = 1; i < v.length; i++) if (isRow(v[i - 1]) && isRow(v[i])) out.push([list, +(v[i].getBoundingClientRect().top - v[i - 1].getBoundingClientRect().bottom).toFixed(2)]); };
  const pane = document.querySelector('[data-p3="levers-pane"]');
  // Surfaces & fills: a section's rows, each a row and the picker under it when open (none open here).
  // S4f: Background fills' two row lists (QA-B1) and the Fields rows join them.
  for (const box of pane.querySelectorAll('[data-p3="surface-default-rows"], [data-p3="surface-inverse-rows"], [data-p3="foreground-rows"], [data-p3="text-rows"], [data-p3="border-rows"], [data-p3="field-rows"]')) pairs(box.getAttribute('data-p3'), [...box.children], (n) => !!n.querySelector(':scope > .p3-fillrow'));
  // Interactive: a set's rest rows, and the state rows under each.
  const g = pane.querySelector('[data-p3="int-row-group"]');
  if (g) {
    const rest = g.querySelector(':scope > :first-child'), states = g.querySelector('[data-p3="int-row-states"]');
    if (rest && states) pairs('interactive rest → states', [rest, states]);
    if (states) pairs('interactive states', [...states.children]);
    const col = g.parentElement;
    pairs('interactive groups', [...col.querySelectorAll(':scope > [data-p3="int-row-group"]')]);
  }
  // Type: the font family rows.
  const fr = pane.querySelector('[data-p3="family-rows"]');
  if (fr) pairs('type families', [...fr.querySelectorAll(':scope > [data-p3="family-row"]')]);
  return out;
});
for (const [host, theme] of [['web', 'light'], ['web', 'dark'], ['figma', 'light'], ['figma', 'dark']]) {
  const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
  const where = `${host} ${theme}`;
  try {
    const names = [], ctls = [], gaps = [], swatches = [], nexts = [];
    for (const place of ['color-fills', 'color-interactive', 'type', 'brand']) {
      await goPlace(page, place);
      // Type (S6.3): every Show advanced open, so its size, weight, line height and letter spacing rows are read.
      if (place === 'type') await openTypeAdvanced(page);
      // Brand draws a select only for a custom mode's base: add one, so the page is represented.
      if (place === 'brand') {
        await hooks.click(page.locator('[data-p3="custom-mode-add"]'));
        await hooks.need(page, '[data-p3="custom-mode-base"]');
      }
      names.push(...(await readNames(page)).map((n) => ({ ...n, place })));
      ctls.push(...(await readControls(page)).map((c) => ({ ...c, place })));
      gaps.push(...(await readRowGaps(page)).map(([l, g]) => ({ list: `${place} ${l}`, g })));
      swatches.push(...await page.evaluate(() => [...document.querySelectorAll('[data-p3="levers-pane"] .p3-fill-sw')].filter((n) => n.offsetParent)
        .map((n) => { const r = n.getBoundingClientRect(); return [+r.width.toFixed(2), +r.height.toFixed(2)]; })));
      nexts.push(await page.evaluate((p) => {
        const b = document.querySelector('[data-p3="levers-pane"] :is([data-p3="fills-continue"], [data-p3="interactive-continue"], [data-p3="type-continue"], [data-p3="brand-continue"])');
        if (!b) return { place: p, found: false };
        const cs = getComputedStyle(b), lab = b.querySelector('span');
        return { place: p, found: true, bg: cs.backgroundColor, ink: getComputedStyle(lab ?? b).color, edge: cs.borderTopColor, text: b.textContent };
      }, place));
    }
    // QA-B2: each row type is represented, and in each the token sits below its label, in mono.
    // S4f: Surfaces & fills' Background fills controls, which were fields, are rows (QA-B1): that kind is required in their place.
    const kinds = ['fill-row', 'background-row', 'interactive-row', 'type-family', 'type-face', 'type-size', 'type-weight', 'type-line-height', 'type-letter-spacing'];
    const missing = kinds.filter((k) => !names.some((n) => n.kind === k));
    ok(missing.length === 0, `QA-B2: ${where}: every row type draws a name and token (fill rows, Background fills rows, Interactive rows, Type families and faces, and Type's sizes, weights, line heights and letter spacings) — missing ${JSON.stringify(missing)}`);
    // S4f: Background fills' rows (QA-B1), the Scrim row (QA-B10) and the Fields rows are among those read, by token.
    const S4F_TOKENS = ['background.primary', 'background.secondary', 'background.tertiary', 'inverse.background.primary', 'inverse.background.secondary',
      'inverse.background.tertiary', 'scrim.default', 'field.fill', 'field.border.rest', 'inverse.field.placeholder'];
    const notRead = S4F_TOKENS.filter((t) => !names.some((n) => n.place === 'color-fills' && n.token === t));
    ok(notRead.length === 0, `QA-B2: ${where}: Surfaces & fills' Background fills, Scrim and Fields rows are read as name-and-token rows${notRead.length ? ` — not read: ${notRead.join(', ')}` : ''}`);
    // The contrast floor row is a setting with no token (S4f): the one name drawn without one, by role. The arms below
    // read only names that have a token.
    const tokenless = names.filter((n) => n.token === null);
    ok(tokenless.every((n) => n.role === 'surfaces.floorStep') && tokenless.length <= 1,
      `QA-B2: ${where}: only the contrast floor row draws a name with no token under it — read ${JSON.stringify(tokenless.map((n) => [n.place, n.role, n.label]))}`);
    const tokened = names.filter((n) => n.token !== null);
    const above = tokened.filter((n) => !n.below);
    ok(names.length >= 20 && above.length === 0,
      `QA-B2: ${where}: in every row type the token sits below its label, so the label is read first (${names.length} read)${above.length ? ` — ${JSON.stringify(above.slice(0, 3))}` : ''}`);
    // …and the two are the right way round: the mono line reads as a token path (dotted, no spaces), the label
    // above it does not. A call that hands the label and the token in the wrong order fails here.
    const PATH = /^[a-z0-9*-]+(\.[a-z0-9*-]+)+$/;
    const swapped = tokened.filter((n) => !PATH.test(n.token ?? '') || PATH.test(n.label ?? ''));
    ok(swapped.length === 0, `QA-B2: ${where}: in every row the mono line under the label is a token path and the label is not${swapped.length ? ` — ${JSON.stringify(swapped.slice(0, 3).map((n) => [n.kind, n.label, n.token]))}` : ''}`);
    const notMono = tokened.filter((n) => !/JetBrains Mono|P3 Chrome Mono/.test(n.tokFont ?? ''));
    ok(notMono.length === 0, `QA-B2: ${where}: every token under a label is set in the chrome's mono${notMono.length ? ` — ${JSON.stringify(notMono.slice(0, 2))}` : ''}`);
    // QA-B5, QA-B18: selects and step-picker buttons, each page represented.
    const placesWith = (k) => [...new Set(ctls.filter((c) => c.kind === k).map((c) => c.place))];
    ok(placesWith('select').length === 4 && placesWith('pick').length === 2 && ctls.some((c) => c.hook === 'custom-mode-base'),
      `QA-B5: ${where}: selects are read on all four pages and step-picker buttons on Surfaces & fills and Interactive (selects on ${JSON.stringify(placesWith('select'))}, picks on ${JSON.stringify(placesWith('pick'))})`);
    const hs = [...new Set(ctls.map((c) => c.h))];
    ok(ctls.length >= 20 && Math.max(...hs) - Math.min(...hs) <= 0.5,
      `QA-B5: ${where}: every select and step-picker button in a levers pane has one height (${ctls.length} read, heights ${JSON.stringify(hs)})${hs.length > 1 ? ` — e.g. ${JSON.stringify(ctls.filter((c) => c.h !== hs[0]).slice(0, 2))}` : ''}`);
    const farCaret = ctls.filter((c) => c.caretGap === null || c.caretGap > CARET_EDGE || c.caretGap < 0);
    ok(farCaret.length === 0, `QA-B5: ${where}: every select and step-picker button has its caret within ${CARET_EDGE}px of its right edge${farCaret.length ? ` — ${JSON.stringify(farCaret.slice(0, 3))}` : ''}`);
    const centered = ctls.filter((c) => !['left', 'start'].includes(c.align) || (c.textStart !== null && Math.abs(c.textStart) > 0.5));
    ok(centered.length === 0, `QA-B5: ${where}: every select's and step-picker button's text is set from the left${centered.length ? ` — ${JSON.stringify(centered.slice(0, 3))}` : ''}`);
    const bigText = ctls.filter((c) => c.fs !== STYLE.rowText);
    ok(bigText.length === 0, `QA-B18: ${where}: row select and step-picker button text is ${STYLE.rowText}px (core.font.size.12)${bigText.length ? ` — ${JSON.stringify(bigText.slice(0, 3))}` : ''}`);
    // QA-B8: the gap between consecutive rows, in each row list.
    const lists = [...new Set(gaps.map((x) => x.list.split(' ')[0]))];
    const offGap = gaps.filter((x) => Math.abs(x.g - STYLE.rowGap) > 0.5);
    ok(lists.length === 3 && gaps.length >= 10 && offGap.length === 0,
      `QA-B8: ${where}: rows stand space.300 (${STYLE.rowGap}px) apart on Surfaces & fills, Interactive and Type (${gaps.length} gaps on ${JSON.stringify(lists)})${offGap.length ? ` — ${JSON.stringify(offGap.slice(0, 3))}` : ''}`);
    // QA-B11: every swatch, 40 × 40.
    const offSw = swatches.filter(([w, h]) => Math.abs(w - STYLE.swatch) > 0.5 || Math.abs(h - STYLE.swatch) > 0.5);
    ok(swatches.length >= 20 && offSw.length === 0, `QA-B11: ${where}: every swatch is ${STYLE.swatch}×${STYLE.swatch} (core.dimension.40; ${swatches.length} read)${offSw.length ? ` — ${JSON.stringify(offSw.slice(0, 3))}` : ''}`);
    // QA-I12: Continue, on each page, is the filled primary button: the inverse fill, its edge and its ink.
    const offNext = nexts.filter((n) => !n.found || n.bg !== STYLE.fill[theme] || n.edge !== STYLE.fill[theme] || n.ink !== STYLE.ink[theme]);
    ok(nexts.length === 4 && offNext.length === 0,
      `QA-I12: ${where}: Continue is the filled primary button on every levers page (fill ${STYLE.fill[theme]}, ink ${STYLE.ink[theme]})${offNext.length ? ` — ${JSON.stringify(offNext)}` : ''}`);
    // QA-R1: Add custom mode is the dashed add row, the list's full width, beside Interactive's (one helper).
    const add = await page.evaluate(() => {
      const b = document.querySelector('[data-p3="levers-pane"] [data-p3="custom-mode-add"]');
      const ctl = b?.closest('.p3-lever-ctl');
      if (!b || !ctl) return null;
      const cs = getComputedStyle(b);
      return { styles: [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle], w: +b.getBoundingClientRect().width.toFixed(2), full: +ctl.getBoundingClientRect().width.toFixed(2), bg: cs.backgroundColor, text: b.textContent };
    });
    ok(!!add && add.styles.every((s) => s === 'dashed') && Math.abs(add.w - add.full) <= 0.5 && add.bg === 'rgba(0, 0, 0, 0)' && add.text === 'Add custom mode',
      `QA-R1: ${where}: Add custom mode is a dashed add row, the list's full width, unfilled — read ${JSON.stringify(add)}`);
    ok(errors.length === 0, `shared styling: ${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `shared styling ${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// QA-R1's behavior, on the studio: the add row still adds a mode and moves focus to its name.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'brand');
    const before = await page.locator('[data-p3="custom-mode-row"]').count();
    await hooks.click(page.locator('[data-p3="custom-mode-add"]'));
    await page.waitForFunction((n) => document.querySelectorAll('[data-p3="custom-mode-row"]').length === n + 1, before);
    const foc = await page.evaluate(() => document.activeElement?.getAttribute('data-p3'));
    ok(foc === 'custom-mode-name', `QA-R1: the add row adds a custom mode and moves focus to its name (${before} → ${before + 1} rows, focus on ${foc})`);

    ok(errors.length === 0, `QA-R1: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `QA-R1: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

hooks.report(ok);
console.log(`\nLowest chrome text ${lows.text}:1, lowest edge or indicator ${lows.edge}:1, lowest focus ring ${lows.focus}:1, smallest target ${lows.target.toFixed(1)}px.`);
console.log(`${executed - failed}/${executed} chrome assertions passed.`);
await browser.close();
server.close();
if (failed) process.exit(1);
