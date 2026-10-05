/**
 * `test:chrome` — the new shell's chrome, measured as rendered (UI redesign S1.2,
 * `docs/superpowers/ui-redesign/implementation-plan.md` §6.1 and §6.2).
 *
 *   npm run -w @prism3/studio build && npm run -w @prism3/plugin build
 *   npm run -w @prism3/studio test:chrome [screenshot-dir]
 *
 * It drives BOTH built bundles: the studio's `dist/main.js` and the plugin's `dist/ui.html` (loaded
 * top-level, with Figma's theme stubbed the way `apps/plugin/test-start-screen.mjs` stubs it). So it runs
 * after both builds, and refuses at startup if `dist/ui.html` is older than any file it is built from (#2037):
 * a studio-only rebuild would otherwise leave the figma host testing the old UI. A separate suite from `test:smoke` because the axes differ: smoke sweeps page × mode ×
 * brand over the legacy pages; this sweeps host × theme × width over the chrome around them.
 *
 * ── what it holds, each as a literal floor ─────────────────────────────────────────────────────
 *
 *   · TEXT at 4.5:1 (3:1 at a large size), every chrome text node, composited over the ground it is drawn on.
 *   · EDGES AND INDICATORS at 3:1: each control's drawn edge against what is outside it (B1), a selected
 *     tab's underline, and every glyph against its ground.
 *   · FOCUS RINGS: every chrome control reached by Tab draws a ring at least 2px wide, at 3:1 against what
 *     is outside the control, and (#2144, owner decision FR1 A) in Prism3's `color.border.focus`, 2px outside it.
 *     The expected hex is the emission's, walked here (`FOCUS_HEX`); section 27 reads every place's whole tab order.
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
 * THE PRODUCT MARK (owner, 2026-10-04), in section 1, every host × theme × width: the studio's top bar starts with
 * the mark, once, ahead of the brand switcher; it reads "Prism3 Studio" as text and as its accessible name, is not a
 * control, and its name is shown wide (measured at 4.5:1) and dropped narrow, the logo kept. The plugin's bar has none.
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
 *   · #1971 (Q81): Background with no badge, every other section with its badges (Foreground's since GR2, the owner,
 *     2026-10-04: each bold fill's badge prints its emitted hex against the emitted floor); Q23 pairs for
 *     Background fills, Scrim and Fields. The grounds (the owner, 2026-10-03, #1971's follow-up): every section on the
 *     emission's `background.primary` for the previewed mode, except Foreground, on the emission's contrast floor
 *     (`foreground.brand`'s `against` in that mode, resolved from the committed tree, `EMITTED_FLOOR`), with a line
 *     inside its ground naming that step.
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
 * S7 ADDS (section 24; Shape moved to the two panes, so it left LEGACY_PAGES and EXPECT_LEGACY): its levers represented
 * once each by the keys the owner placed (D1 A), with the retired Hairline radius switch absent (#2053); the preview's
 * Density, Radius, Spacing and Building blocks on the brand's page color in every mode, each sample in the brand's own
 * roles (D2 A); the approved copy and the Q23 pairs (Base radius with Radius); D6's "Medium button · 44px" labels and
 * every emitted radius size drawn in order (#1881); the previewed mode (Q22) with Auto following LIGHT for a Dark-based
 * custom mode (scope finding 7), brand-wide values from Dark (Q54), every control held in each derived mode with the
 * preview still drawn (Q59); the routes by tab (Continue to Depth & motion; See Components per host) and the plugin's
 * Pages-menu way to the Button options (D4 B, D5 B); the reveal (QA-B9); and the chrome at every width. Moved to new
 * hooks: the keyboard check (section 5) now lands on Shape's levers; the Search check (section 6) runs on Shape's
 * levers by their hooks; the mode-strip sync (section 9) runs on Depth & motion, the first legacy page with a strip.
 *
 * S8.2 ADDS (section 26; Components moved to the two panes on both hosts, the last tab, so LEGACY_PAGES and EXPECT_LEGACY
 * are empty): the four Button options represented once each (G6 A) with the way to Shape › Density; the preview's Button
 * specimen in the brand's action colors (G7 A) and the Component sets list on the brand's page in every mode; the drafted
 * copy and the Q23 pairs; the intro's set count against the committed component docs; the web drawing no build control,
 * no Figma menu and no Pages menu (G5, G19), the plugin a Build button for the chosen set (G2); Set up file nowhere on
 * the page (G8) and no "Internal"/"experimental" (G3); Q59 in each derived mode; the reveal (QA-B9); Q54 from Dark; the
 * chrome at every width. Moved: the Figma menu's Build set… now opens the Components TAB (section 10, FIGMA_EFFECT);
 * the page-row verdict that opens the drawer is re-hosted on the plugin's Style guide row, since Set up file has no page
 * row now (section 10); #1031 is re-hosted on the plugin's Style guide Customize selects and retired, held, on the web,
 * which has no legacy page left (section 4); the legacy mode strip's sync check is retired, held, since no place shows a
 * legacy page with a strip (section 9); Layout's Continue and Shape's See Components land on the Components tab's levers
 * on both hosts (sections 25 and 24), and the plugin's Pages menu offers the Style guide alone.
 *
 * S8.3 RETIRES two web holds S8.2 left, now that `test:smoke` section 1 walks every place on the tabs (every mode, every
 * corpus brand) and asserts no legacy page is drawn and the mode agrees on each: section 4's web arm (#1031 is measured
 * on the plugin's Style guide alone) and section 9's legacy mode-strip hold.
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
 *
 * #2179 ADDS: the Contrast floor row in Default background fills draws its picker on the right, beside its name, its
 * right edge on the other three rows' picker edge, every brand × mode at 1280 and 380 (web). Mutation: the floor row's
 * `p3-fillrow` class dropped → `#2179 web 1280 prism3 / light: the Contrast floor's picker ends at the other rows' picker edge …`.
 * FL1 A (#2197): on Auto the floor's label reads "Auto · ‹step›" (prism3: the emission's floor), its tooltip and accessible
 * name keep the full sentence, and the label is not cut off. Mutation: the long label back as the visible one →
 * `#2179 web 1280 prism3 / light: FL1 A: the Contrast floor's Auto label reads "Auto · ‹step›" …`.
 */
import { createServer } from 'node:http';
import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from './test-hooks.mjs';
import { P, loadModes, resolve as resolveToken } from './chrome/tokens.mjs';
import { assertBundleFresh, PLUGIN_UI_SOURCE_ROOTS, STUDIO_SOURCE_ROOTS } from './test-bundle-freshness.mjs';

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

/** The places not moved yet. A domain slice that moves a place removes it here, in the same change. Empty since S8.2
 *  moved Components, the last tab: no place shows a legacy page (the plugin's Style guide is a Pages menu page that
 *  no tab shows, `MENU_LEGACY`). */
const LEGACY_PAGES = [];
/** The places a slice has moved into the two panes (S2: Color › Palettes; S3: Brand; S4a: Color › Surfaces & fills;
 *  S5.2: Color › Interactive; S6.2: Type; S7: Shape; S9.2: Depth & motion; S10: Layout). A slice that moves a place adds it
 *  here in the same change; a place in both lists, or in neither, fails by name. */
const NEW_PAGES = ['brand', 'color-palettes', 'color-fills', 'color-interactive', 'type', 'shape', 'depth', 'layout', 'components'];

/** Plan §4's table: the legacy page(s) each place shows, by the Pages menu hook's suffix, per host. */
const EXPECT_LEGACY = {
  // Empty on both hosts since S8.2 (Components moved): `web.components` was Size & radius, `figma.components` Components.
  web: {},
  figma: {},
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

/** Each column's controls, by hook, on the opening page (Color › Palettes). Wide is 1280 and 640; narrow is
 *  380. Away from Color the sub-pages are not drawn (`expectFor`). (D8's Depth & motion switch went with S9.2.) */
const TABS = ['[data-p3="tab-brand"]', '[data-p3="tab-color"]', '[data-p3="tab-type"]', '[data-p3="tab-shape"]', '[data-p3="tab-depth"]', '[data-p3="tab-layout"]', '[data-p3="tab-components"]'];
const COLOR_SUBS = ['[data-p3="color-sub-palettes"]', '[data-p3="color-sub-fills"]', '[data-p3="color-sub-interactive"]'];
const BAR = ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="search-open"]'];
/** The plugin's own top-bar controls (S1.4): the Pages menu (the plugin keeps it for the Style guide until S11.2; the web
 *  draws none since S8.2, owner decision G19 A, which section 26 holds), the Agent chip (IA-3), the Figma menu, and Apply
 *  Theme. */
const FIGMA_BAR = ['[data-p3="pages-menu"]', '[data-p3="agent-chip"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]'];
const EXPECT_CONTROLS = {
  'web wide': [...BAR, '[data-p3="theme-toggle"]', ...TABS, ...COLOR_SUBS],
  'web narrow': [...BAR, '[data-p3="theme-toggle"]', '[data-p3="tab-select"]', ...COLOR_SUBS],
  'figma wide': [...BAR, ...FIGMA_BAR, ...TABS, ...COLOR_SUBS],
  'figma narrow': [...BAR, ...FIGMA_BAR, '[data-p3="tab-select"]', ...COLOR_SUBS],
};
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
/** Shape in the two panes (S7): the controls its levers must render, by hook (Density's chips and the way to
 *  Components, Radius' slider and Control shape chips, Show advanced, the way on to Depth & motion). */
const SHAPE_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="density-choice-comfortable"]', '[data-p3="shape-see-components"]',
  '[data-p3="radius-scale-slider"]', '[data-p3="control-shape-choice-rounded"]', '[data-p3="shape-advanced"]', '[data-p3="shape-continue"]'];
/** Depth & motion in the two panes (S9.2), previewing Light: the softness slider, Elevation's Show advanced, the tempo
 *  chips, an easing picker button per role, the way on to Layout. The rest is section 23's. */
const DEPTH_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="shadow-softness"]', '[data-p3="depth-tint-advanced"]',
  '[data-p3="tempo-snappy"]', '[data-p3="easing-pick"]', '[data-p3="depth-continue"]'];
/** Components in the two panes (S8.2): the way to Shape › Density, a Button option chip per lever, the minimum-width
 *  slider. The rest is section 26's. */
const COMPONENTS_LEVERS_CONTROLS = ['[data-p3="lever-info"]', '[data-p3="components-density-link"]', '[data-p3="button-icons-choice-attached"]',
  '[data-p3="button-content-size-choice-match"]', '[data-p3="button-label-weight-choice-emphasis"]', '[data-p3="button-min-width-slider"]'];
/** Each moved place's levers, by place. */
const LEVERS_CONTROLS = { 'color-palettes': PALETTES_LEVERS_CONTROLS, brand: BRAND_LEVERS_CONTROLS, 'color-fills': FILLS_LEVERS_CONTROLS,
  'color-interactive': INTERACTIVE_LEVERS_CONTROLS, type: TYPE_LEVERS_CONTROLS, shape: SHAPE_LEVERS_CONTROLS, depth: DEPTH_LEVERS_CONTROLS,
  components: COMPONENTS_LEVERS_CONTROLS };
/** The preview header: the mode choice and Inspect. The mode choice is the radios, or, where they do not all fit
 *  (640, or a brand with more modes, S3 review), the select of the same modes: either one represents it (an
 *  inner list is any-of). Section 17 holds which one shows and that no option is ever clipped. */
const PREVIEW_HEAD = [['[data-p3="mode-option"]', '[data-p3="mode-select"]'], '[data-p3="inspect-open"]'];
const PANE_TOGGLE = ['[data-p3="pane-toggle-settings"]', '[data-p3="pane-toggle-preview"]'];
const expectFor = (column, place, state = 'page') => {
  const narrow = column.endsWith('narrow');
  const base = EXPECT_CONTROLS[column].filter((h) => place.startsWith('color-') || !COLOR_SUBS.includes(h));
  const levers = LEVERS_CONTROLS[place];
  if (!levers) return base;
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
  'web wide': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="theme-toggle"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'web narrow': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="theme-toggle"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
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
  ['p3-jump-link', 'jump link'],
  // S6.3's value picker, first measured open on Depth & motion (S9.2): each value is a button of its own.
  ['p3-vpick', 'picker value']];
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
  '[data-p3="type-style-guide"]',
  // S10: Layout's preview, the same way (section 25).
  '[data-p3="layout-style-guide"]',
  // S7: Shape's preview, the same way (section 24).
  '[data-p3="shape-style-guide"]',

  // S9.2: Depth & motion's preview, the same way (section 23).
  '[data-p3="depth-style-guide"]',
  // S8.2: Components' preview, the same way (section 26). Its set list's radios and Build button are the preview's own
  // controls, on the brand's page, held there.
  '[data-p3="components-style-guide"]'];

// ── servers: the studio, and the plugin with Figma's theme stubbed ──────────────────────────────────
const STUDIO = HERE;
let pluginHtml;
try { pluginHtml = readFileSync(join(REPO, 'apps/plugin/dist/ui.html'), 'utf8'); } catch {
  console.error('✗ apps/plugin/dist/ui.html is missing: run `npm run -w @prism3/plugin build` first.');
  process.exit(1);
}
// ── both hosts' bundles must be at least as new as what they are built from (#2037, #2067) ────────────
// The figma host loads `apps/plugin/dist/ui.html` and the web host `apps/studio/dist/main.js`. A rebuild of
// one after an edit leaves the other stale, and that arm then measures the old UI and reports it as this one.
// The check, its roots and why they are literal: `test-bundle-freshness.mjs`.
assertBundleFresh({ repo: REPO, bundle: 'apps/plugin/dist/ui.html', roots: PLUGIN_UI_SOURCE_ROOTS, label: 'ui.html freshness',
  effect: 'the figma host would test the old UI', build: 'npm run -w @prism3/plugin build' });
assertBundleFresh({ repo: REPO, bundle: 'apps/studio/dist/main.js', roots: STUDIO_SOURCE_ROOTS, label: 'main.js freshness',
  effect: 'the web host would test the old UI', build: 'npm run -w @prism3/studio build' });
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
const showMode = async (page, mode) => {
  const radio = page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`);
  if (await radio.count() && await radio.first().isVisible()) await hooks.click(radio.first());
  else await page.locator('[data-p3="mode-select"]').selectOption(mode);
  await page.waitForFunction((m) => document.querySelector('[data-p3="levers-pane"] [data-p3="surfaces-group"]')?.dataset.mode !== undefined
    && [...document.querySelectorAll('[data-p3="mode-option"]')].some((b) => b.dataset.mode === m && b.getAttribute('aria-checked') === 'true')
    || document.querySelector('[data-p3="mode-select"]')?.value === m, mode, { timeout: 5000 }).catch(() => {});
};
const WAIT = { timeout: 10000 };
const FLOOR_BADGED = ['brand', 'danger', 'success', 'warning', 'info'];
const ON_FILL_CARDS = [...['primary', 'secondary', 'tertiary'].map((t) => [`inverse.foreground.${t}`, 'inverse.text.primary']),
  ...FLOOR_BADGED.map((sem) => [`foreground.${sem}-subtle`, `text.${sem}`])];
/** WCAG 2 contrast of two hexes, computed here (the oracle side), never read from the studio. */
const wcagHex = (a, b) => {
  const lum = (hx) => { const f = (i) => { const x = parseInt(hx.slice(i, i + 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5); };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const EMITTED_FLOOR = (() => {
  const out = join(REPO, 'packages/engine/out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const leafAt = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
  const treeFor = (mode) => {
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
  return Object.fromEntries(['light', 'dark', 'hc-light', 'hc-dark'].map((m) => {
    const t = treeFor(m);
    const step = leafAt(t, `${root}.color.foreground.brand`)?.$extensions?.prism3?.against ?? null;
    const hex = step ? (resolveHex(t, `${root}.color.${step}`) ?? resolveHex(t, `${root}.core.palette.${step}`)) : null;
    // GR2: each bold fill's emitted hex and what it is measured against, for its badge's expected ratio.
    // A mode's overlay carries only the leaves whose VALUE varies, so a fill whose hex is the same in every mode keeps
    // its per-mode `against` on the base leaf (`$extensions.prism3.modes.<mode>`), read first.
    const againstIn = (path) => leafAt(base, path)?.$extensions?.prism3?.modes?.[m]?.against ?? leafAt(t, path)?.$extensions?.prism3?.against ?? null;
    const fills = Object.fromEntries(FLOOR_BADGED.map((sem) => [sem, { hex: resolveHex(t, `${root}.color.foreground.${sem}`), against: againstIn(`${root}.color.foreground.${sem}`) }]));
    // Q13(a): each on-fill card's two roles, emitted hexes, for the drawn-pairing badge's oracle.
    const roles = Object.fromEntries(ON_FILL_CARDS.flat().map((k) => [k, resolveHex(t, `${root}.color.${k}`)]));
    return [m, { step, hex, fills, roles }];
  }));
})();
// #2179 (owner QA, 2026-10-05): the Contrast floor row is drawn in the rows' own layout, its step picker on the right
// beside its name, not under it. Every brand the start screen offers × every mode it previews, at 1280 and at 380, on the
// web host. THE ORACLE is the other three rows of Default background fills (Primary, Secondary, Tertiary), measured in
// the same render: the floor's picker ends where theirs end (right edges within ALIGN_TOLERANCE), its top sits inside
// its name's line (above the label's bottom edge), and it sits beside its name exactly when theirs do (at 380 as at 1280).
{
  const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p0 = await ctx0.newPage();
  await p0.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  await hooks.need(p0, '[data-p3="start-example"]');
  const brands = (await p0.locator('[data-p3="start-example"]').allTextContents()).map((n) => n.trim());
  await ctx0.close();
  ok(brands.length >= 2, `#2179: the start screen offers the corpus brands (found ${brands.length}: ${brands.join(', ')})`);
  const FLOOR_ROW_PROBE = () => [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="surface-default-rows"] [data-p3="surface-row"]')].map((r) => {
    const box = (n) => { const b = n?.getBoundingClientRect(); return b && b.width > 0 ? { top: b.top, bottom: b.bottom, left: b.left, right: b.right } : null; };
    const pk = r.querySelector('.p3-pick'), lab = pk?.querySelector('.p3-btn-label');
    return { role: r.dataset.role, label: box(r.querySelector('.p3-fill-label')), name: box(r.querySelector('.p3-fill-label')?.closest('.p3-fill-name') ?? r.querySelector('.p3-fill-label')), pick: box(pk),
      text: lab?.textContent ?? null, aria: pk?.getAttribute('aria-label') ?? null, title: pk?.getAttribute('title') ?? null,
      scroll: lab ? [lab.scrollWidth, lab.clientWidth] : null };
  });
  let measured = 0;
  for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 800 }]) {
    for (const brand of brands) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light' });
      const page = await ctx.newPage();
      await hooks.watch(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
      await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
      await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: brand }));
      await hooks.need(page, '[data-p3="frame"]');
      await goPlace(page, 'color-fills');
      await hooks.need(page, '[data-p3="levers-pane"] [data-p3="surface-default-rows"]');
      const modes = await page.evaluate(() => {
        const r = [...document.querySelectorAll('[data-p3="mode-option"]')].map((n) => n.dataset.mode);
        return r.length ? r : [...document.querySelectorAll('[data-p3="mode-select"] option')].map((o) => o.value);
      });
      ok(modes.length >= 2, `#2179 web ${w} ${brand}: the mode control offers ${modes.length} modes (${modes.join(', ')})`);
      for (const mode of modes) {
        // At 380 the mode control is on the Preview pane, and the rows on the Settings pane.
        if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        await showMode(page, mode);
        if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-settings"]'));
        await page.waitForFunction((m) => document.querySelector('[data-p3="levers-pane"] [data-p3="surfaces-group"]')?.dataset.mode !== undefined, mode, WAIT).catch(() => {});
        const rows = await page.evaluate(FLOOR_ROW_PROBE);
        const where = `#2179 web ${w} ${brand} / ${mode}`;
        const floor = rows.find((r) => r.role === 'surfaces.floorStep');
        const others = rows.filter((r) => ['background.primary', 'background.secondary', 'background.tertiary'].includes(r.role));
        const drawn = floor?.pick && floor.label && others.length === 3 && others.every((r) => r.pick && r.label && r.name);
        ok(drawn, `${where}: Default background fills draws Primary, Secondary, Tertiary and Contrast floor, each with its picker — read ${JSON.stringify(rows.map((r) => [r.role, !!r.pick]))}`);
        if (!drawn) continue;
        measured++;
        const besideOf = (r) => r.pick.left >= r.name.right - ALIGN_TOLERANCE && r.pick.top < r.label.bottom;
        const offRight = others.filter((r) => Math.abs(r.pick.right - floor.pick.right) > ALIGN_TOLERANCE);
        ok(offRight.length === 0, `${where}: the Contrast floor's picker ends at the other rows' picker edge (right ${floor.pick.right.toFixed(1)}; ${others.map((r) => `${r.role} ${r.pick.right.toFixed(1)}`).join(', ')})`);
        ok(floor.pick.top < floor.label.bottom, `${where}: the Contrast floor's picker starts on its name's line, not under it (picker top ${floor.pick.top.toFixed(1)}, label bottom ${floor.label.bottom.toFixed(1)})`);
        const theirs = [...new Set(others.map(besideOf))];
        ok(theirs.length === 1 && besideOf(floor) === theirs[0], `${where}: the Contrast floor's picker sits beside its name exactly as the other rows' do (floor ${besideOf(floor) ? 'beside' : 'under'}; others ${theirs.map((b) => (b ? 'beside' : 'under')).join(', ')})`);
        // FL1 A (owner, #2197): on Auto the button shows "Auto · ‹palette› ‹step›", the step as the picker names steps; the
        // full sentence ("Auto · follows background.secondary (‹step›)" when it follows the tier) is its tooltip and is
        // in its accessible name. For prism3 the step is the committed emission's floor (`EMITTED_FLOOR`), not the page's.
        const auto = /^Auto\b/.test(floor.title ?? '');
        if (auto) {
          const step = (/^Auto · ([a-z0-9-]+ [0-9]+)$/.exec(floor.text ?? '') ?? [])[1] ?? null;
          const want = brand === 'prism3' && EMITTED_FLOOR[mode]?.step ? `Auto · ${EMITTED_FLOOR[mode].step.split('.').join(' ')}` : null;
          ok(step !== null && (want === null || floor.text === want), `${where}: FL1 A: the Contrast floor's Auto label reads "Auto · ‹step›"${want ? ` (${JSON.stringify(want)}, the emission's floor)` : ''} — read ${JSON.stringify(floor.text)}`);
          ok(step !== null && (floor.title === `Auto · follows background.secondary (${step})` || floor.title === `Auto · ${step}`),
            `${where}: FL1 A: the Contrast floor's tooltip is the full sentence for the same step — read ${JSON.stringify(floor.title)}`);
        }
        ok(!!floor.title && /^Contrast floor, [^:]+: /.test(floor.aria ?? '') && (floor.aria ?? '').endsWith(`: ${floor.title}. Pick a step`),
          `${where}: FL1 A: the Contrast floor's accessible name keeps the full sentence — read ${JSON.stringify(floor.aria)} (tooltip ${JSON.stringify(floor.title)})`);
        ok(!!floor.scroll && floor.scroll[0] <= floor.scroll[1], `${where}: FL1 A: the Contrast floor's label fits its button on one line, not cut off (scrollWidth ${floor.scroll?.[0]}, clientWidth ${floor.scroll?.[1]})`);
      }
      ok(errors.length === 0, `#2179 web ${w} ${brand}: 0 uncaught errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      await ctx.close();
    }
  }
  ok(measured >= brands.length * 2 * 2, `#2179: the floor row was measured in ${measured} brand × mode × width states (floor ${brands.length * 2 * 2})`);
}
console.log(`${executed - failed}/${executed} chrome assertions passed.`);
await browser.close();
server.close();
if (failed) process.exit(1);