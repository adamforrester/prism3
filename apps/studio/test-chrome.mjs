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
 * THE HEADING RULE (section 30; heading pass 1 of 2, TY2 A, owner approval 2026-10-06), on both hosts, both themes, at 1280 and 380,
 * every page with its Show advanced open: each heading level's computed size, weight, line height (and L1's tracking, L3's
 * ink) and the space after it, against the chrome tokens' values read from the committed emission by this file's own walk;
 * the audit's per-page heading list, each found at its level, with literal floors on the counts; every ⓘ button's hit-min
 * target, its place after the heading text and on the line's center; and no glyph in a hint line, nor any ⓘ glyph outside
 * a button, in Light and High contrast light (HP3); and a sweep of every heading element and heading-styled text, each of
 * which must be a level, a table header or a reasoned exemption, with no heading tag skipping a level.
 *
 * S12 ADDS (section 28), on both hosts, both themes, at 1280 and 380 (the frame's `data-w` waited on): THE START WINDOW
 * over the studio, every owner decision against a literal typed in the section: the heading per host (G17), no Close on
 * the first run and Close when reopened (S9, S10), the cards in the order color (with "Start blank" as its secondary action, N1 A),
 * examples, import (S8),
 * "Start from this color" (S1), the color starting at the working brand's primary (G14), a bad hex refused in words
 * (S3), Import disabled while the paste box is empty and named in both states, every card's border equal, Upload on the
 * import card's heading row and its X1 description (the owner's review of #2142), the brand menu's empty paste (S2), import errors that open "Line ‹n›: " only when the line is known (S7), the wrong file type
 * (S6), the guard over 3 edits opening ON TOP of the start (S4) with focus on Cancel (S5), its approved words (S10),
 * Discard drawn in Prism3's destructive fill and on-fill (oracle: the committed emission, S5), Cancel and Escape back to
 * the start, Close back to the brand byte-identical with its origin kept, and the brand menu's paste and upload showing
 * the same words as the start's for the same input (one shared check). The chrome probe runs in the first-run, reopened
 * and guard states; the start's example dots are `data-content`, so the old start-screen exemption from the inline-value
 * check is gone. Every start path (color, Blank, an example, paste, upload) is held to the guard over 1 edit and to no guard
 * over 0, on both hosts and themes (the review of #2142).
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
 * THE ONE CONTRAST EXEMPTION: INACTIVE CONTROLS (owner decision F1 A, 2026-10-05). WCAG 2.2 exempts a user
 * interface component that is not available for user interaction from SC 1.4.3 and SC 1.4.11, and the owner
 * decided that a disabled text field in the chrome draws Prism3's own disabled text field skin exactly
 * (`color.disabled.fill`, `.border`, `.on-fill`), which sits under both floors (3.05:1 and 3.04:1 text, 1.80:1
 * and 1.65:1 edge, light and dark). The audit exempts a node from its floor only when it is, or sits inside, a
 * control that is `:disabled` or `aria-disabled="true"`, never by class name or hook; and it still asserts, by
 * name, that each exempted node is disabled in the accessibility tree, takes no focus and no scripted edit, and
 * draws exactly those three roles, read from the committed emission (`checkExempt`, above `check`). Each run
 * prints how many nodes it exempted; section 2 fails a Layout sweep that exempted none, and plants a canary there
 * (the same field, not disabled) that must fail its floor. Mutations, each failing by name:
 *   · the first breakpoint field not disabled, its colors kept → `web light 1280 / layout: every chrome field inks
 *     its value at 4.5:1 — input[bp-input] "sm, px" 3.05:1`, its edge at 1.8:1, and `… the contrast audit exempted
 *     0 disabled node(s) …`, on both hosts and both themes (22 failures).
 *   · the exemption widened to the field's class → `… the exemption canary, … is not exempted and fails 4.5:1 —
 *     {…"exempted":true}`, on both hosts and both themes, and nothing else (4 failures).
 *   · the field's ink on `disabled.text` → `… the exempted input[bp-input] "sm, px" draws Prism3's disabled roles for
 *     light …` and `F1 A: Layout: web light: … draws Prism3's disabled text field …` (8 failures).
 *
 * X4 A AND Q28 a (owner, 2026-10-05; #2155, #2154, #2174). The exemption covers disabled BUTTONS too, each held to
 * Prism3's disabled roles for its appearance (`DISABLED_SKIN`: filled, outline, text, typed from `button.ts` and
 * `icon-button.ts`), the ink of every label and glyph inside it included; an `aria-disabled` control that keeps its
 * focus stop qualifies only when activating it changes nothing. S12 fails a first run that did not exempt Import, and
 * plants the button canary there. Every canary now carries EVERY computed style of the real control (#2174), so only
 * `:disabled` / `aria-disabled` tells them apart. The section "X4 A, Q28 a" at the end reads every appearance on a real
 * control, one control of each kind hovered off and on, and every control HC light switches off. Mutations, each
 * failing by name, each in a detached worktree:
 *   · the skin's edge dashed → `X4 A: web light: the disabled Import (start-import) draws no dashed edge — …`,
 *     `X4 A derived: … no disabled chrome control draws a dashed edge (438 read) — …` (884 failures).
 *   · the outline edge on `disabled.border` → `X4 A: web light: the disabled Import (start-import) draws Prism3's
 *     disabled outline button: … drew {"fill":"none","edge":"#c0c1c2",…}` (820 failures).
 *   · a chip hover rule after the skin → `Q28 a: web light: a pointer over a disabled chip (personality-word, on brand)
 *     changes nothing (Q28 a)`, on both hosts and both themes, and nothing else (4 failures).
 *   · the select's hover rule without its limit → `Q28 a: web light: a pointer over a disabled select (family-select,
 *     on type) changes nothing (Q28 a)`, on both hosts and both themes, and nothing else (4 failures).
 *   · the exemption keyed on `cursor: not-allowed` → only the canaries: `S12 web light 1280 / start: the exemption
 *     canary, a button with every computed style of the disabled Import … — {…"exempted":…}` (8) and `web light 1280 /
 *     layout: the exemption canary, a field with every computed style …` (4). #2152's canary, which copied the class,
 *     the hook and six colors, passes it.
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
 *   · THE FIGMA MENU (plugin): its four items by literal label, and no Apply Theme (#2178: the bar's filled button
 *     is its one control); Arrow Down, Home, End, Arrow Up (wrapping), Escape and Tab; each item's effect observed
 *     on the wire (the write message the old control posted, captured off the bus, payload and all: the bar's Apply
 *     and the menu's Prune must carry the brand the page loaded, read from the committed `schema/example-brands.json`,
 *     never from the UI) or as the legacy page it opens; Prune stale unavailable while Apply runs. The studio has none.
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
 * S13.1 ADDS (section 29; owner decisions G18 A and N-2 A: the brand menu, Export's dialog and the error line leave the
 * legacy `renderBar` for the chrome, `shell/bar.ts` and `shell/notices.ts`), on both hosts, both themes, at 1280, 640
 * and 380: each piece measured by the probe as chrome (the probe no longer skips the notices row or the bar's popovers;
 * only the plugin's Pages menu list, legacy until S11.2, stays out); the error strip's ground follows the theme, it is
 * full width and right under the top bar; the brand menu stays inside the window and the export dialog is one column
 * at the narrow tier; and the brand menu by keyboard (Enter opens it on the current example, the arrows, Home and End
 * move, Escape closes it back to the switcher; Escape closes the dialog back to Export).
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
 *   · `runApply` posting `{}` → `#2178 … the bar's Apply Theme posts the brand the page loaded (…), whole — input differs at id, root, …`.
 *   · `runPrune` posting a stale input → `Figma menu … Prune stale posts the brand the page loaded with confirm false, whole — input differs at id`.
 *   · the popover's focusout handler removed → `IA-3 … Tab past the switch closes the popover`.
 *   · Escape handled on the popover only → `IA-3 … Escape on the chip closes its open popover`.
 *   · the row header's toggle removed (S11) → `F2 … the row's own header collapses it, and the drawer stays open`.
 *   · the bar's Apply stuck disabled → `S1.4 … the case stopped at a wait that never resolved, … waiting for locator('[data-p3="apply-to-figma"]')`, and the run goes on.
 *   #2178 (the Figma menu's Apply Theme removed, owner decision 2026-10-05):
 *   · the `apply` item put back into `figmaActions` → `#2178 Figma menu … the menu lists no Apply Theme, the bar's button is its one control`
 *     and `Figma menu … the items read Prune stale, Set up file, Build set…, Build style guides… — read Apply Theme, …`.
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
 * FL1 A (#2197): on Auto the floor's label reads "Auto · ‹step›" (prism3: the emission's floor), its tooltip is the full
 * sentence, and the label is not cut off; both hosts. Its COMPUTED accessible name is the owner's option 1 ("Contrast floor,
 * Light: Auto · neutral 050, follows background.secondary. Pick a step"), and each picker's contains its visible label.
 * Mutations: the long label back as the visible one → `#2179 web 1280 prism3 / light: FL1 A: the Contrast floor's Auto
 * label reads "Auto · ‹step›" …`; the earlier name form back → `… option 1: the Contrast floor's computed accessible name is …`.
 *
 * #2180 ADDS: in the plugin, Components' build bar stands at least `space.300` (the stacked-card gap, resolved from the
 * emission) above the Activity drawer, at 1280 and 380, the drawer closed and open, at three scroll positions.
 * Mutation: `.p3-buildbar`'s `bottom` back to 0 → `#2180: figma 1280, drawer closed, at the top: the build bar stands …`.
 *
 * #2208 ADDS (owner decision DB1 A): Brand › Modes' always-on Light row (`mode-on-light`) draws Prism3's disabled check
 * box, and `X4 A derived` reads it: no dashed edge, its box on `disabled.fill`, a solid `disabled.border` and the mark
 * on `disabled.on-fill` (oracle: the committed emission), and it stays a fixed fact (a div, its words unchanged).
 * Mutation: the dashed rule back → `X4 A derived: web light: no disabled chrome control, and not the fixed Light row
 * (mode-on-light, read true), draws a dashed edge (439 read) — brand mode-on-light: …` and `… DB1 A: the fixed Light
 * row's box draws Prism3's disabled check box: …` (8 failures).
 *
 * #2213 ADDS (owner decision N1 A, section 31): in the plugin, light and dark, at 1280 and 380, the agent link's status
 * line in the Activity drawer's bar row, for three published states (off, listening, an inbox error): absent while off;
 * otherwise right of the summary and its time, last before the caret, one line, its words `agentLinkStatusText(state)`
 * (the plugin's formatter, bundled for Node and called here), its ink the emission's `color.text.secondary` (quiet) or
 * `color.text.danger` (an error) at 4.5:1 on its ground, the summary left whole and the caret on the row; cut short at
 * 380, its tooltip and its accessible name (CDP `getPartialAXTree` on its text, and the row's computed name) carry the
 * full words. The web's drawer draws no line. Mutations, each against the built bundles:
 *   · hidden while listening → `#2213 figma light 1280 listening: the status line is drawn in the bar row, …` (4).
 *   · shown while off → `#2213 figma light 1280 off: no status line while the link is off (read "Off — agent commands are ignored.")` (4).
 *   · the error in the quiet ink → `#2213 figma light 1280 error: the line draws in the chrome's error ink, the emission's color.text.danger #a82e2e (read #67696b)` (4).
 *   · the text cut short in the DOM at 380 → `#2213 figma light 380 listening: the accessible name carries the full words: the line's computed text "Listening — file m…", …` (12 in all).
 *   · the line shrinking alongside the summary (`flex: 0 1000 auto`) → `#2213 figma light 380 listening: the caret and the whole summary stay on the row (… whole false)` (4).
 *   · no tooltip at 380 → `#2213 figma light 380 listening: the line's tooltip carries its full words, though it is cut short (… read "null")` (4).
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
/** THE DISABLED ORACLE (F1 A): Prism3's disabled text field skin per chrome theme, resolved in Node from the engine's
 *  committed emission (its alias chain followed through the base tree with the dark overlay), never from the studio's
 *  CSS or `chrome/spec.mjs`. The three roles are the ones `packages/engine/components/text-field.ts` binds for its
 *  disabled state, typed here: `disabled.fill`, `disabled.border` and the on-fill ink (never `disabled.text`). */
const PRISM3_DISABLED = (() => {
  const out = join(REPO, 'packages/engine/out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const leafAt = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
  const dark = structuredClone(base);
  const put = (src, dst) => { for (const [k, v] of Object.entries(src)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) dst[k] = v; else put(v, dst[k] ??= {}); } };
  put(JSON.parse(readFileSync(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8')), dark);
  const hex = (tree, path, seen = 0) => {
    const v = leafAt(tree, path)?.$value;
    if (typeof v !== 'string' || seen > 20) return null;
    const m = /^\{(.+)\}$/.exec(v);
    return m ? hex(tree, m[1], seen + 1) : v.toLowerCase();
  };
  // X4 A adds the two roles the button definitions bind and the text field does not: `disabled.text` and `disabled.icon`.
  const skin = (tree) => ({ fill: hex(tree, `${root}.color.disabled.fill`), edge: hex(tree, `${root}.color.disabled.border`), ink: hex(tree, `${root}.color.disabled.on-fill`),
    text: hex(tree, `${root}.color.disabled.text`), icon: hex(tree, `${root}.color.disabled.icon`) });
  return { light: skin(base), dark: skin(dark) };
})();
/**
 * THE DISABLED SKIN PER APPEARANCE (owner decision X4 A, 2026-10-05, #2155). What Prism3 draws for a disabled control
 * of each appearance the chrome uses, typed here from the engine's definitions and resolved through `PRISM3_DISABLED`,
 * never read from the studio's CSS or `chrome/spec.mjs` (docs/34). `none` is a paint that draws nothing (no fill, no
 * edge on any side).
 *   · field (`text-field.ts`): the disabled fill, a solid `disabled.border` edge, the on-fill ink.
 *   · filled (`button.ts` `filled`, also Discard's `button-destructive`, whose disabled block is the same): the disabled
 *     fill and the on-fill ink for its label and glyph (#784); `filled` keys no border, so no edge.
 *   · outline (`button.ts` `outline`, the chrome's page-colored button): no fill (outline keys none at rest), a solid
 *     edge on `disabled.icon` (#1349), the label on `disabled.text`, the glyph on `disabled.icon`.
 *   · text (`button.ts` `text`, `icon-button.ts` `ghost`: the chrome's ghost buttons and the edgeless mode check): no
 *     fill, no edge, the label on `disabled.text`, the glyph on `disabled.icon`.
 * Which appearance a control has is read from its element and classes. That only picks which skin to expect; the
 * exemption itself is granted only by `:disabled` or `aria-disabled="true"` (`offOf` in PROBE).
 */
const DISABLED_APPEARANCE = (o) => {
  if (['input', 'select', 'textarea'].includes(o.tag)) return 'field';
  const c = new Set(o.cls.split(/\s+/));
  if (['p3-btn-primary', 'p3-next', 'p3-btn-danger'].some((k) => c.has(k))) return 'filled';
  if (['p3-btn-ghost', 'p3-check'].some((k) => c.has(k))) return 'text';
  return 'outline';
};
const DISABLED_SKIN = (appearance, scheme) => {
  const d = PRISM3_DISABLED[scheme];
  if (!d) return null;
  return {
    field: { fill: d.fill, edge: d.edge, ink: d.ink, glyph: d.ink, roles: 'fill color.disabled.fill, a solid edge color.disabled.border, ink color.disabled.on-fill' },
    filled: { fill: d.fill, edge: 'none', ink: d.ink, glyph: d.ink, roles: 'fill color.disabled.fill, no edge, label and glyph color.disabled.on-fill' },
    outline: { fill: 'none', edge: d.icon, ink: d.text, glyph: d.icon, roles: 'no fill, a solid edge color.disabled.icon, label color.disabled.text, glyph color.disabled.icon' },
    text: { fill: 'none', edge: 'none', ink: d.text, glyph: d.icon, roles: 'no fill, no edge, label color.disabled.text, glyph color.disabled.icon' },
  }[appearance];
};
/** A computed color as `#rrggbb` when opaque, `none` when fully transparent, and the raw string otherwise. */
const paintOf = (s) => {
  const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim());
  if (!m) return String(s);
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (p.length > 3 && p[3] === 0) return 'none';
  if (p.length > 3 && p[3] !== 1) return String(s);
  return `#${p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
};
/** What a control draws, from its computed fill, four edges ([color, style, width]) and ink: its fill, its edge (one
 *  solid color on all four sides, `none` when no side draws, or what it draws otherwise) and its ink. */
const drawnSkin = (o) => {
  const sides = o.edges.filter(([c, st, wd]) => st !== 'none' && wd > 0 && paintOf(c) !== 'none');
  const colors = [...new Set(sides.map(([c]) => paintOf(c)))];
  const styles = [...new Set(sides.map(([, st]) => st))];
  const edge = !sides.length ? 'none' : sides.length === 4 && colors.length === 1 && styles.join() === 'solid' ? colors[0] : `${sides.length} side(s) ${colors.join('/')} ${styles.join('/')}`;
  return { fill: paintOf(o.fill), edge, ink: paintOf(o.ink) };
};
/** A computed `rgb(…)` as `#rrggbb`, or null when it is not opaque sRGB. */
const hexOfRgb = (s) => {
  const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim());
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (p.length > 3 && p[3] !== 1) return null;
  return `#${p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
};
/** Every contrast exemption the audit granted this run, by probe: [where, count, hooks]. Printed at the end. */
const EXEMPTIONS = [];
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
const FIGMA_BAR = ['[data-p3="pages-menu"]', '[data-p3="agent-toggle"]', '[data-p3="theme-toggle"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]'];
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
  'web wide': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="theme-toggle"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'web narrow': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="theme-toggle"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'figma wide': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="theme-toggle"]', '[data-p3="agent-toggle"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'figma narrow': ['[data-p3="brand-switcher"]', '[data-p3="verdict"]', '[data-p3="theme-toggle"]', '[data-p3="agent-toggle"]', '[data-p3="activity-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="figma-open"]', '[data-p3="apply-to-figma"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
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
  ['p3-vpick', 'picker value'],
  // S13.1: the brand menu's import box; S12: the start window's paste (measured since S13.1 counts every textarea).
  ['p3-textarea', 'text area'], ['p3-start-paste', 'text area']];
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
 *  screen's prism3 chip (or `brand`'s), the OS scheme emulated, `query` (web only) appended to the page URL.
 *  Plugin: Figma's theme stubbed, then the start screen the host asks for, then the same example. Named
 *  options, so `brand` (#2194) and `query` (#2124) can't be passed in each other's place. */
const open = async ({ host, theme, w, h, store, query = '', brand = 'prism3' }) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  if (store) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, store);
  if (host === 'web') {
    await page.goto(`${ORIGIN}/index.html${query}`, { waitUntil: 'networkidle' });
    await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: brand }));
  } else {
    await page.goto(`${ORIGIN}/plugin?figma=${theme}`, { waitUntil: 'load' });
    await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
    await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: brand }));
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
   *  outside the plugin's Pages menu list (a legacy popover, pinned light, `styles.css`, until S11.2). Since S13.1
   *  the error strip, the brand menu and the export and prune dialogs are chrome, measured here like the rest. */
  const inChrome = (el) => frame?.contains(el)
    && !el.closest('[data-content]')
    && !(skipLegacy && legacyPage?.contains(el))
    && !el.closest('[data-p3="pages-menu-list"]')
    && !opt.inspectLegacy.some((sel) => el.closest(sel));

  const all = [...(frame?.querySelectorAll('*') ?? [])].filter(inChrome);
  const drawn = all.filter(shown);
  const CONTROL = 'button, select, textarea, input:not([type="hidden"]), [role="tab"], [role="menuitemradio"], a[href]';

  // THE CONTRAST EXEMPTION, its predicate (F1 A; see "THE CONTRAST EXEMPTION" above `check`). A measured node is OFF
  // when it is a control, or sits inside one, that is really disabled: `:disabled` (which also covers a control in a
  // disabled fieldset) or `aria-disabled="true"`. Never a class name or a hook. Each off control is listed once in
  // `offs` with what Node needs to hold it to the exemption's three conditions, and tagged `data-coff` so Node can
  // reach it; a measured entry carries its control's index in `offs`, or -1. Whether a node is EXEMPT (off AND under
  // its floor) is decided in Node, against the literal floors.
  const offs = [];
  const offOf = (el) => {
    for (let n = el; n && n.nodeType === 1 && frame?.contains(n); n = n.parentElement) {
      if (!n.matches(CONTROL)) continue;
      if (!(n.matches(':disabled') || n.getAttribute('aria-disabled') === 'true')) continue;
      let i = offs.findIndex((o) => o.node === n);
      if (i < 0) {
        const cs = getComputedStyle(n);
        i = offs.push({ node: n, el: label(n), hook: n.getAttribute('data-p3'), canary: n.hasAttribute('data-ccanary'),
          tag: n.tagName.toLowerCase(), cls: n.getAttribute('class') ?? '',
          prop: n.disabled === true, aria: n.getAttribute('aria-disabled') === 'true',
          fill: cs.backgroundColor, ink: cs.color,
          edges: ['Top', 'Right', 'Bottom', 'Left'].map((side) => [cs[`border${side}Color`], cs[`border${side}Style`], parseFloat(cs[`border${side}Width`])]) }) - 1;
        n.setAttribute('data-coff', String(i));
      }
      return i;
    }
    return -1;
  };

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
    // X4 A: an off node's own ink rides along, so an exempted label is held to its appearance's ink, not only its control.
    text.push({ el: label(el), r: fl(ratio(over(ink, g), g)), large, off: offOf(el), ink: cs.color, canary: !!el.closest('[data-ccanary]') });
    el.setAttribute('data-cprobe', cs.fontFamily.includes(opt.monoAlias) ? 'mono' : 'text');
  }
  // fields: the value a field draws, on its own fill
  const fields = [];
  // A range and a color well draw no value text, so they have no ink to measure here.
  for (const el of drawn.filter((n) => n.matches('input:not([type="checkbox"]):not([type="range"]):not([type="color"]), select, textarea'))) {
    const cs = getComputedStyle(el);
    const ink = parse(cs.color, `${label(el)} color`);
    const g = groundOf(el);
    if (ink) fields.push({ el: label(el), r: fl(ratio(over(ink, g), g)), scheme: cs.colorScheme, off: offOf(el), canary: el.hasAttribute('data-ccanary') });
  }
  // controls, their kinds, targets, edges
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
      edges.push({ el: label(el), side, r: fl(ratio(over(c, outside), outside)), off: offOf(el), canary: !!el.closest('[data-ccanary]') });
    }
  }
  // glyphs
  const glyphs = [];
  for (const svg of drawn.filter((n) => n.matches('svg.p3-ico'))) {
    const c = parse(getComputedStyle(svg).color, `${label(svg.parentElement)} glyph`);
    const g = groundOf(svg.parentElement);
    if (c) glyphs.push({ el: `glyph in ${label(svg.parentElement)}`, r: fl(ratio(over(c, g), g)), off: offOf(svg), ink: getComputedStyle(svg).color, canary: !!svg.closest('[data-ccanary]') });
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
    offs: offs.map(({ node, ...o }) => o),
    // The chrome theme as the generated CSS sets it (`color-scheme` on the root), so the oracle is read for the theme drawn.
    scheme: getComputedStyle(document.documentElement).colorScheme,
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

/** Tab through the chrome from the top of the page, reading the ring each control draws: its width, its color as
 *  drawn (`hex`, the computed color, never a variable name), where it sits (`offset`: the outline's offset, or for a
 *  tab's `::before` ring how far it reaches past the tab's own box), and its contrast against what is outside it.
 *
 *  `all` (#2144's sweep): go on past the first legacy region instead of stopping there, skipping brand content
 *  (`[data-content]`) and the lent legacy views (`skipIn`), until Tab comes back to a control it already read. */
const focusRings = async (page, { all = false, max = 30, skipIn = [], onRing = null } = {}) => {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); for (const n of document.querySelectorAll('[data-fring]')) n.removeAttribute('data-fring'); });
  await page.keyboard.press('Tab');
  const seen = [];
  for (let i = 0; i < max; i++) {
    const r = await page.evaluate(([all, skipIn, pinned]) => {
      const el = document.activeElement;
      if (!el || el === document.body) return { done: false, skip: true };
      if (all) {
        // Back where the sweep started: every stop was read once.
        if (el.hasAttribute('data-fring')) return { done: true };
        el.setAttribute('data-fring', '');
        if (el.closest(['[data-content]', '[data-p3="legacy-page"]', ...skipIn].join(', '))) return { done: false, skip: true, skipped: true };
      } else if (el.closest('[data-p3="legacy-page"], [data-p3="brand-style-guide"]')) return { done: true };
      // (Not `all`: Tab has left the chrome for a legacy page, or for the Style guide lent into Brand's preview
      // (S3), which draws in `styles.css` like the legacy page it came from.)
      const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s.trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const groundOf = (n0) => { let acc = null; for (let n = n0; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return { ...acc, a: 1 }; } } return acc ? over(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 }; };
      const cs = getComputedStyle(el);
      let width = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) : 0;
      let color = width ? cs.outlineColor : null;
      let kind = width ? 'outline' : null;
      let offset = width ? parseFloat(cs.outlineOffset) : null;
      if (!width) {   // a tab draws its ring on ::before, inside the row's scroll box
        const b = getComputedStyle(el, '::before');
        if (b.content !== 'none' && b.display !== 'none' && b.visibility !== 'hidden' && parseFloat(b.opacity) > 0 && b.borderTopStyle !== 'none') {
          width = parseFloat(b.borderTopWidth); color = b.borderTopColor; kind = 'before';
          // How far the ring reaches past the tab's own box on each side (its inline inset is negative).
          offset = Math.min(-parseFloat(b.left), -parseFloat(b.right));
        }
      }
      const c = color ? parse(color) : null;
      const hex = c ? `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}${c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, '0') : ''}` : null;
      // A ring drawn inside the control's box (a negative outline offset: the two scrolling panes, S2) is seen
      // against the control's own ground; every other ring against what is outside it.
      const g = groundOf(width && kind === 'outline' && offset < 0 ? el : el.parentElement);
      const box = el.getBoundingClientRect();
      return { hook: el.getAttribute('data-p3') ?? `${el.tagName.toLowerCase()}.${el.className}`, inFrame: !!el.closest('[data-p3="frame"]'),
        pinnedLight: !!el.closest(pinned.join(', ')), width, hex, kind, offset, box: { x: box.x, y: box.y, w: box.width, h: box.height }, r: c ? Math.floor(ratio(over(c, g), g) * 100) / 100 : 0 };
    }, [all, skipIn, INSPECT_LEGACY]);
    if (r.done) break;
    if (r.skipped) seen.skipped = (seen.skipped ?? 0) + 1;
    if (!r.skip && r.inFrame) { seen.push(r); if (onRing) await onRing(r); }
    await page.keyboard.press('Tab');
  }
  await page.evaluate(() => { for (const n of document.querySelectorAll('[data-fring]')) n.removeAttribute('data-fring'); });
  return seen;
};

// ── the focus ring's color (#2144) ───────────────────────────────────────────────────────────────
/** Owner decision FR1 A (2026-10-05): every chrome focus ring draws in Prism3's `color.border.focus`, 2px wide and
 *  2px outside the control. THE EXPECTED HEX IS READ FROM THE EMISSION, here, with this file's own alias walk: not
 *  from `chrome.css`, not from `chrome/spec.mjs`'s row, and not through `chrome/tokens.mjs`'s `resolve`, which is
 *  the resolver the build writes `--p3-focus-ring` with. A second walk is the point (docs/34, shape 2): a resolver
 *  that went wrong would otherwise agree with itself. The path, the width and the offset are literals. */
const FOCUS_RING_TOKEN = 'color.border.focus';
const FOCUS_OFFSET = 2;
/** Rings drawn INSIDE the control on purpose, by hook: the two scrolling panes, whose ring sits inside their edge
 *  (S2) because outside it would be clipped by the frame. Their ring is held to the color and the width, and to
 *  sitting fully inside (an offset of minus its width). */
const INNER_RINGS = ['levers-pane', 'preview-body'];
const FOCUS_HEX = (() => {
  const out = join(REPO, 'packages', 'engine', 'out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const dark = JSON.parse(readFileSync(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8'));
  const at = (tree, path) => path.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree);
  const leaf = (mode, path) => { const o = mode === 'dark' ? at(dark, path) : undefined; const l = o?.$value !== undefined ? o : at(base, path); if (l?.$value === undefined) throw new Error(`#2144: no token at ${path} in the ${mode} emission`); return l; };
  const walk = (mode, path, hops = 0) => {
    const v = leaf(mode, path).$value;
    const m = typeof v === 'string' && /^\{([^}]+)\}$/.exec(v);
    if (m && hops < 16) return walk(mode, m[1], hops + 1);
    if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`#2144: ${FOCUS_RING_TOKEN} resolves to ${JSON.stringify(v)} in ${mode}, not an opaque hex`);
    return v.toLowerCase();
  };
  return { light: walk('light', `pds3.${FOCUS_RING_TOKEN}`), dark: walk('dark', `pds3.${FOCUS_RING_TOKEN}`) };
})();
/** Every way a measured ring can miss #2144's contract, for the mode its chrome draws in. Empty when it holds. */
const ringMisses = (r, mode) => {
  const miss = [];
  if (r.hex !== FOCUS_HEX[mode]) miss.push(`color ${r.hex}, want ${FOCUS_RING_TOKEN} ${FOCUS_HEX[mode]}`);
  if (!(r.width >= FOCUS_WIDTH_MIN)) miss.push(`${r.width}px wide, want ${FOCUS_WIDTH_MIN}px or more`);
  if (INNER_RINGS.includes(r.hook)) { if (!(r.kind === 'outline' && r.offset <= -r.width)) miss.push(`an inner ring at offset ${r.offset}px, want -${r.width}px or less`); }
  else if (!(r.offset >= FOCUS_OFFSET)) miss.push(`${r.kind ?? 'no ring'} at ${r.offset}px outside, want ${FOCUS_OFFSET}px or more`);
  if (!(r.r >= NONTEXT_MIN)) miss.push(`${r.r}:1 against what is outside it, want ${NONTEXT_MIN}:1`);
  return miss;
};
const ringReport = (bad) => bad.slice(0, 4).map(({ r, miss }) => `${r.hook}: ${miss.join(', ')}`).join(' | ');

const columnOf = (host, w) => `${host} ${w <= 560 ? 'narrow' : 'wide'}`;
/** A running write's "…" (`.p3-spin`, chrome.css) fades to transparent after a 300 ms delay, and PROBE measures
 *  text whatever its alpha: a "…" caught mid-fade scores 2.5 to 2.9:1 and a faded one 1:1. When the audit landed
 *  in that window depended on machine speed (#2073). The fade is the spinner's exit, and the "…" at its full
 *  color is the claim, so the fading and transparent states are deliberately not audited: each measure holds the
 *  "…" at the fade's start and puts it back as it found it. Only the span's own animation (the fade); the arc's,
 *  on `::before`, is left running. */
const holdSpin = (page, hold) => page.evaluate((hold) => {
  for (const s of document.querySelectorAll('.p3-spin')) {
    for (const a of s.getAnimations()) {
      if (hold) { a.p3Held = { t: a.currentTime, state: a.playState }; a.pause(); a.currentTime = 0; continue; }
      const was = a.p3Held;
      if (!was) continue;
      delete a.p3Held;
      if (was.state === 'finished') a.finish();
      else { a.currentTime = was.t; if (was.state === 'running') a.play(); }
    }
  }
}, hold);
/** THE CONTRAST EXEMPTION, which nodes take it: an OFF node (the probe's predicate: really disabled) that measures
 *  under its literal floor. A node that clears its floor needs no exemption and is not counted. Returns `offs` indexes. */
const exemptOf = (m) => {
  const ids = new Set();
  for (const t of m.text) if (t.off >= 0 && t.r < (t.large ? LARGE_TEXT_MIN : TEXT_MIN)) ids.add(t.off);
  for (const f of m.fields) if (f.off >= 0 && f.r < TEXT_MIN) ids.add(f.off);
  for (const e of m.edges) if (e.off >= 0 && e.r < NONTEXT_MIN) ids.add(e.off);
  for (const g of m.glyphs) if (g.off >= 0 && g.r < NONTEXT_MIN) ids.add(g.off);
  return [...ids];
};
/** The exemption's first two conditions, read off the page for the off control `data-coff="i"`: what the browser's
 *  accessibility tree says (CDP, not the DOM predicate that granted it), whether it takes focus, whether a scripted
 *  edit (focus, then typing) changes its value or anything the page stores, and whether a click on it changes
 *  anything: the control itself, what the page stores, the place shown, which windows and menus are open (X4 A). */
const holdsOff = async (page, i) => {
  const sel = `[data-coff="${i}"]`;
  const cdp = await page.context().newCDPSession(page);
  let ax = null, inert = null;
  try {
    await cdp.send('DOM.enable');
    await cdp.send('Accessibility.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
    ax = nodes[0]?.properties?.find((p) => p.name === 'disabled')?.value?.value === true;
    // A control under an open window (S12's guard over the start) is inert: the tree drops it, which is more than
    // disabled, so it reports no disabled property. Read from the tree's own reasons, not the DOM.
    inert = nodes[0]?.ignored === true && (nodes[0]?.ignoredReasons ?? []).some((r) => /inert/i.test(r.name));
  } finally { await cdp.detach(); }
  const read = (x) => page.evaluate((x) => {
    const n = document.querySelector(x);
    return { value: n?.value ?? null, text: n?.textContent ?? null, store: JSON.stringify(Object.entries(localStorage)) };
  }, x);
  const world = (x) => page.evaluate((x) => {
    const n = document.querySelector(x);
    const open = [...document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"], [data-p3="step-picker"], [data-p3="value-picker"]')]
      .filter((d) => d.getClientRects().length).map((d) => d.getAttribute('data-p3') ?? d.getAttribute('role'));
    return JSON.stringify({ control: n?.outerHTML.replace(/ data-c(?:off|probe)="[^"]*"/g, '') ?? null, store: Object.entries(localStorage),
      place: document.querySelector('[data-p3="frame"]')?.dataset.place ?? null, open });
  }, x);
  const before = await read(sel);
  const focused = await page.evaluate((x) => { const n = document.querySelector(x); document.activeElement?.blur?.(); n?.focus(); return !!n && document.activeElement === n; }, sel);
  await page.locator(sel).pressSequentially('7', { timeout: 1000 }).catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const after = await read(sel);
  const w0 = await world(sel);
  // Activation as the platform performs it (`HTMLElement.prototype.click`, which Enter and Space also reach), in the
  // page rather than a Playwright click: a pointer would land on whatever is on top (S12's guard over Import). A
  // native disabled control ignores it, so it tests what an `aria-disabled` one's own handler does.
  await page.evaluate((x) => { const n = document.querySelector(x); if (n) HTMLElement.prototype.click.call(n); }, sel);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const w1 = await world(sel);
  return { ax, inert, focused, changed: JSON.stringify(before) !== JSON.stringify(after), clicked: w0 !== w1 };
};
/** THE EXEMPTION'S CANARY (F1 A, X4 A, #2174): beside the real disabled control `sel`, plant a copy that is NOT
 *  disabled (no `disabled`, no `aria-disabled`) and carries, inline, EVERY computed style of the real control and of
 *  each element inside it, so only `:disabled` / `aria-disabled` tells them apart; probe; remove it. It keeps the
 *  class and the hook too. The copy must be measured and must fail its floor without being exempted, so an
 *  exemption keyed on a class, a hook, a color or any other computed style (`cursor: not-allowed`) fails here by name. */
const PLANT_CANARY = (sel) => {
  // What a copy may differ in and still be a lookalike: the size its place in the row gives it (and the origins that
  // follow from that size), a shorthand that serializes differently from the same longhands, and a non-standard one.
  const CANARY_LAYOUT = new Set(['width', 'height', 'inline-size', 'block-size', 'transform-origin', 'perspective-origin', 'text-decoration', 'app-region']);
  const src = document.querySelector(sel);
  if (!src) return { planted: false };
  const c = src.cloneNode(true);
  const from = [src, ...src.querySelectorAll('*')], to = [c, ...c.querySelectorAll('*')];
  from.forEach((n, i) => { const cs = getComputedStyle(n); for (const p of cs) to[i].style.setProperty(p, cs.getPropertyValue(p)); });
  c.disabled = false;
  for (const a of ['disabled', 'aria-disabled', 'id', 'data-coff', 'data-cprobe']) c.removeAttribute(a);
  c.setAttribute('data-ccanary', '');
  src.after(c);
  const a = getComputedStyle(src), b = getComputedStyle(c);
  const differ = [...a].filter((p) => !CANARY_LAYOUT.has(p) && a.getPropertyValue(p) !== b.getPropertyValue(p));
  return { planted: true, live: !c.matches(':disabled') && c.getAttribute('aria-disabled') !== 'true', differ: differ.slice(0, 6) };
};
const exemptionCanary = async (page, sel = '[data-p3="bp-row"] input:disabled') => {
  const p = await page.evaluate(PLANT_CANARY, sel);
  const m = p.planted ? await page.evaluate(PROBE, { legacyPages: LEGACY_PAGES, kinds: CONTROL_KINDS, inspectLegacy: INSPECT_LEGACY, monoAlias: MONO_ALIAS }) : null;
  await page.evaluate(() => { for (const n of document.querySelectorAll('[data-ccanary]')) n.remove(); for (const n of document.querySelectorAll('[data-coff]')) n.removeAttribute('data-coff'); });
  // What the canary drew that has a floor: its value (a field), its text (a button), its edges and its glyphs.
  const nodes = m ? [...m.fields.filter((x) => x.canary).map((x) => ({ ...x, floor: TEXT_MIN })), ...m.text.filter((x) => x.canary).map((x) => ({ ...x, floor: x.large ? LARGE_TEXT_MIN : TEXT_MIN })),
    ...m.edges.filter((x) => x.canary).map((x) => ({ ...x, floor: NONTEXT_MIN })), ...m.glyphs.filter((x) => x.canary).map((x) => ({ ...x, floor: NONTEXT_MIN }))] : [];
  const ex = m ? new Set(exemptOf(m)) : new Set();
  return { planted: p.planted, live: p.live ?? null, differ: p.differ ?? null, measured: nodes.length, r: nodes.length ? Math.min(...nodes.map((x) => x.r)) : null,
    under: nodes.filter((x) => x.r < x.floor).length, exempted: nodes.filter((x) => x.off >= 0 && ex.has(x.off)).length };
};
/** The canary's verdict: planted live with no computed style apart from the real control, measured, under its floor,
 *  and exempted nowhere. */
const canaryHolds = (c) => c.planted && c.live && c.differ?.length === 0 && c.measured > 0 && c.under > 0 && c.exempted === 0;
const measure = async (page, where, host, w) => {
  await holdSpin(page, true);
  const m = await page.evaluate(PROBE, { legacyPages: LEGACY_PAGES, kinds: CONTROL_KINDS, inspectLegacy: INSPECT_LEGACY, monoAlias: MONO_ALIAS });
  const fonts = await fontsDrawn(page);
  const exempt = [];
  for (const i of exemptOf(m)) exempt.push({ i, ...m.offs[i], ...(await holdsOff(page, i)) });
  await page.evaluate(() => { for (const n of document.querySelectorAll('[data-coff]')) n.removeAttribute('data-coff'); });
  await holdSpin(page, false);
  return { ...m, fonts, exempt };
};

/**
 * THE CONTRAST EXEMPTION (owner decisions F1 A and X4 A, 2026-10-05). WCAG 2.2 exempts a user interface component
 * that is not available for user interaction from SC 1.4.3 (text, 4.5:1) and SC 1.4.11 (non-text, 3:1): an inactive
 * control. The owner decided that a disabled text field (F1 A) and a disabled button (X4 A, #2155) in the chrome take
 * Prism3's own disabled skin exactly, which sits under the floors on purpose (about 3.05:1 field text and 1.8:1 field
 * edge; about 3.9:1 and 3.4:1 button labels, light and dark). So the audit exempts a node from its floor only when:
 *
 *   · it is REALLY DISABLED: the node is, or sits inside, a control that is `:disabled` or `aria-disabled="true"`
 *     (`offOf` in PROBE). Never a class name, a hook, a color, a cursor or a marker the page sets for the test: the
 *     canaries (section 2's field, S12's Import) plant a non-disabled copy carrying every computed style of the real
 *     control, and it must fail its floor (#2174).
 *
 * and every node it exempts is still asserted, by name, to be:
 *
 *   1. disabled to assistive technology: the browser's accessibility tree (CDP `getPartialAXTree`) reports it
 *      disabled, or drops it as inert (under an open window), and it carries the `disabled` property or `aria-disabled`;
 *   2. inert: a scripted edit (focus, then typing) changes nothing, a click changes nothing (the control, what the page
 *      stores, the place, the open windows), and it takes no focus unless it is `aria-disabled` (the mode check, a
 *      matrix check and a refused picker value keep their focus stop on purpose, so their reason is read);
 *   3. drawn in the Prism3 disabled roles for its appearance and the chrome theme (`DISABLED_SKIN`): its fill, its
 *      edge and its ink, and the ink of every label and glyph the audit exempted inside it, read from the committed
 *      emission (`PRISM3_DISABLED`), never from the studio's CSS or `chrome/spec.mjs` (docs/34).
 *
 * Counted, not trusted: every probe's exemptions go to `EXEMPTIONS`, printed at the end of the run; section 2 fails a
 * Layout sweep that exempted nothing, since its first breakpoint field is disabled there by design (D13), and S12
 * fails a first run that did not exempt Import, disabled while the paste box is empty.
 */
const checkExempt = (m, where) => {
  EXEMPTIONS.push([where, m.exempt.length, m.exempt.map((x) => x.hook ?? x.el)]);
  ok(!m.exempt.length || !!PRISM3_DISABLED[m.scheme], `${where}: the chrome theme is light or dark, so the disabled oracle applies (color-scheme "${m.scheme}")`);
  for (const x of m.exempt) {
    ok((x.ax === true || x.inert === true) && (x.prop || x.aria),
      `${where}: the exempted ${x.el} is disabled to assistive technology (accessibility tree disabled ${x.ax}, inert ${x.inert}, disabled property ${x.prop}, aria-disabled ${x.aria})`);
    ok((!x.focused || x.aria) && !x.changed && !x.clicked,
      `${where}: the exempted ${x.el} is inert: no focus unless aria-disabled, no edit, no click (took focus ${x.focused}, a scripted edit changed ${x.changed ? 'something' : 'nothing'}, a click changed ${x.clicked ? 'something' : 'nothing'})`);
    const appearance = DISABLED_APPEARANCE(x);
    const want = DISABLED_SKIN(appearance, m.scheme);
    if (!want) continue;
    const got = drawnSkin(x);
    const labels = [...new Set(m.text.filter((t) => t.off === x.i).map((t) => paintOf(t.ink)))];
    const marks = [...new Set(m.glyphs.filter((g) => g.off === x.i).map((g) => paintOf(g.ink)))];
    ok(got.fill === want.fill && got.edge === want.edge && got.ink === want.ink && labels.every((c) => c === want.ink) && marks.every((c) => c === want.glyph),
      `${where}: the exempted ${x.el} draws Prism3's disabled ${appearance} roles for ${m.scheme}: ${want.roles} (want fill ${want.fill}, edge ${want.edge}, ink ${want.ink}, glyph ${want.glyph}; drew ${JSON.stringify({ ...got, labels, glyphs: marks })})`);
  }
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
  // text (an exempted node, below, is held to the exemption's conditions instead of the floor)
  ok(m.text.length >= floor.text, `${where}: measured ${m.text.length} chrome text nodes (floor ${floor.text})`);
  const dim = m.text.filter((t) => t.r < (t.large ? LARGE_TEXT_MIN : TEXT_MIN) && t.off < 0);
  ok(dim.length === 0, `${where}: every chrome text node clears ${TEXT_MIN}:1 (${LARGE_TEXT_MIN}:1 large)${dim.length ? ` — ${dim.slice(0, 4).map((t) => `text ${t.el} ${t.r}:1`).join(' | ')}` : ''}`);
  const fdim = m.fields.filter((f) => f.r < TEXT_MIN && f.off < 0);
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
  const weak = [...new Map(m.edges.filter((e) => e.r < NONTEXT_MIN && e.off < 0).sort((a, b) => b.r - a.r).map((e) => [e.el, e])).values()];
  ok(weak.length === 0, `${where}: every control edge and indicator clears ${NONTEXT_MIN}:1${weak.length ? ` — ${weak.slice(0, 6).map((e) => `edge ${e.el} ${e.r}:1 < ${NONTEXT_MIN}`).join(' | ')}` : ''}`);
  // THE CONTRAST EXEMPTION: every node it exempted is still held to all three of its conditions.
  checkExempt(m, where);
  ok(m.glyphs.length >= floor.glyphs, `${where}: measured ${m.glyphs.length} glyphs (floor ${floor.glyphs})`);
  const faint = m.glyphs.filter((g) => g.r < NONTEXT_MIN && g.off < 0);
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
      // The product mark (owner, 2026-10-04; on the plugin too since the owner's top-bar decision of 2026-10-05): the
      // bar starts with the logo and "Prism3 Studio", ahead of the brand switcher; narrow keeps the logo and drops the
      // name, which the mark's accessible name keeps. The bar's controls place it first (`bar-main`'s first child).
      // Expected values are the literals here.
      const mk = await page.evaluate(() => {
        const bar = document.querySelector('[data-p3="top-bar"]');
        const marks = [...document.querySelectorAll('[data-p3="product-mark"]')];
        const mark = marks[0] ?? null;
        const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none'; };
        const box = (n) => { const r = n.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
        const sw = document.querySelector('[data-p3="brand-switcher"]');
        const name = mark?.querySelector('.p3-mark-name') ?? null;
        const logo = mark?.querySelector('.logo') ?? null;
        return {
          bar: !!bar, n: marks.length, first: !!mark && bar?.querySelector('[data-p3="bar-main"]')?.firstElementChild === mark,
          inBar: !!mark && !!bar?.contains(mark),
          mark: mark ? box(mark) : null, switcher: sw ? box(sw) : null,
          text: (name?.textContent ?? '').trim(), label: mark?.getAttribute('aria-label') ?? null, role: mark?.getAttribute('role') ?? null,
          nameShown: vis(name), logoShown: vis(logo), logoHidden: logo?.getAttribute('aria-hidden') === 'true',
          control: !!mark && (mark.matches('button, a[href], [tabindex]') || !!mark.querySelector('button, a[href], [tabindex]')),
        };
      });
      {
        const ahead = !!mk.mark && !!mk.switcher && (mk.mark.bottom <= mk.switcher.top + 0.5 || mk.mark.right <= mk.switcher.left + 0.5);
        ok(mk.n === 1 && mk.inBar, `product mark ${where}: the top bar draws the product mark once (${mk.n} found${mk.inBar ? '' : ', none in the top bar'})`);
        ok(mk.first && ahead, `product mark ${where}: the mark is first in the top bar, ahead of the brand switcher (${JSON.stringify({ first: mk.first, mark: mk.mark, switcher: mk.switcher })})`);
        ok(mk.text === 'Prism3 Studio' && mk.label === 'Prism3 Studio' && mk.role === 'img', `product mark ${where}: the mark reads "Prism3 Studio", as text and as its accessible name (${JSON.stringify({ text: mk.text, label: mk.label, role: mk.role })})`);
        ok(mk.logoShown && mk.logoHidden && !mk.control, `product mark ${where}: the logo is drawn and hidden from assistive tech, and the mark is not a control (${JSON.stringify({ logo: mk.logoShown, hidden: mk.logoHidden, control: mk.control })})`);
        const narrow = column.endsWith('narrow');
        ok(mk.nameShown === !narrow, `product mark ${where}: the name is ${narrow ? 'dropped at narrow widths (the logo stays)' : 'shown'} (${mk.nameShown ? 'shown' : 'hidden'})`);
        if (!narrow) {
          const t = m.text.find((x) => x.el.startsWith('span.p3-mark-name'));
          ok(!!t && t.r >= TEXT_MIN, `product mark ${where}: "Prism3 Studio" is measured on the top bar at ${TEXT_MIN}:1 (${t ? `${t.r}:1` : 'not measured'})`);
        }
      }
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
      const offRing = rings.map((r) => ({ r, miss: ringMisses(r, r.pinnedLight ? 'light' : theme) })).filter((x) => x.miss.length);
      ok(offRing.length === 0, `${where}: #2144 every focused chrome control draws its ring in ${FOCUS_RING_TOKEN} (${FOCUS_HEX[theme]}), at least ${FOCUS_WIDTH_MIN}px wide, ${FOCUS_OFFSET}px outside, at ${NONTEXT_MIN}:1${offRing.length ? ` — ${ringReport(offRing)}` : ''}`);
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
      const offBrandRing = brandRings.map((r) => ({ r, miss: ringMisses(r, r.pinnedLight ? 'light' : theme) })).filter((x) => x.miss.length);
      ok(offBrandRing.length === 0, `${where} / brand: #2144 every focused control draws its ring in ${FOCUS_RING_TOKEN} (${FOCUS_HEX[theme]}), at least ${FOCUS_WIDTH_MIN}px wide, ${FOCUS_OFFSET}px outside, at ${NONTEXT_MIN}:1${offBrandRing.length ? ` — ${ringReport(offBrandRing)}` : ''}`);
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
      // D8's local switch between two legacy pages went with S9.2 (Depth & motion moved): no place shows one.
      hooks.absent(ok, { seen: !!(await page.locator('[data-p3="frame"]').count()), state: 'the frame' }, (await page.locator('.p3-switchseg, [role="tablist"][aria-label$=" pages"]:not(.p3-subseg)').count()) === 0,
        `${where}: no place draws a local switch between legacy pages (D8's, retired in S9.2)`);
      const m = await measure(page, where, host, 1280);
      check(m, where, columnOf(host, 1280), PLACE_FLOOR);
      if (place === 'layout') {
        // F1 A: Layout's first breakpoint field is disabled by design (D13), so this sweep must exempt it. A sweep that
        // exempts nothing here has stopped measuring the exemption, or the field, and fails by name.
        ok(m.exempt.length >= 1 && m.exempt.some((x) => x.hook === 'bp-input'),
          `${where}: the contrast audit exempted ${m.exempt.length} disabled node(s), Layout's first breakpoint field among them (floor 1) — ${JSON.stringify(m.exempt.map((x) => x.el))}`);
        const c = await exemptionCanary(page);
        ok(canaryHolds(c),
          `${where}: the exemption canary, a field with every computed style of the disabled field (its class and hook too) that is not disabled, is not exempted and fails its floor — ${JSON.stringify(c)}`);
      }
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
// RE-HOSTED IN S8.2. The Components tab was the last tab with a legacy page (S10 put #1031 there), and S8.2 moved it to
// the two panes. In the plugin the one legacy page left is the Style guide, reached from the Pages menu, whose Customize
// fold holds three selects: that is where #1031 is measured now. On the web no legacy page is left at all (the Pages
// menu is gone, G19 A). The web arm that held that in place is RETIRED in S8.3: `test:smoke` section 1 now walks every
// place in every mode on every brand and asserts no legacy page is drawn, and measures every field it finds.
{
  const host = 'figma';
  const { ctx, page } = await open({ host, theme: 'dark', w: 1280, h: 900 });
  await hooks.click(page.locator('[data-p3="pages-menu"]'));
  await hooks.click(page.locator('[data-p3="rail-page-style-guide"]'));
  await hooks.need(page, '[data-p3="legacy-page"]');
  await hooks.need(page, '[data-p3="style-guide-customize"]');
  await page.evaluate(() => { const d = document.querySelector('[data-p3="style-guide-customize"]'); if (d) d.open = true; });
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
  const where = `${host} dark / Style guide`;
  ok(/\bdark\b/.test(f.doc), `${where}: the document resolves a dark color-scheme ("${f.doc}") — the premise this check is about`);
  ok(f.fields.length >= 3, `${where}: measured ${f.fields.length} legacy field(s) in Customize (floor 3: Color value, Table header, Display style)`);
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
  // S7: Shape is a moved page, so the key lands on its two panes (its levers), not a legacy page.
  await page.waitForFunction(() => !!document.querySelector('[data-p3="shape-levers"]'), null, { timeout: 5000 }).catch(() => {});
  const k = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-p3'), sel: document.querySelector('[data-p3="tab-shape"]')?.getAttribute('aria-selected'),
    shows: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage ?? null, levers: !!document.querySelector('[data-p3="shape-levers"]') }));
  ok(k.focus === 'tab-shape' && k.sel === 'true' && k.shows === null && k.levers, `ArrowRight on Type selects Shape, keeps focus on it, and shows its levers in the two panes (${JSON.stringify(k)})`);

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
  // Since the owner's top-bar decision (2026-10-05) the plugin offers a Theme menu too, on Match Figma by default,
  // which is what the live follow above shows; §29b holds its choices.
  const toggle = await page.evaluate(() => document.querySelector('[data-p3="theme-toggle"]')?.getAttribute('aria-label') ?? null);
  ok(toggle === 'Theme: Match Figma', `the plugin's Theme menu starts on Match Figma ("${toggle}")`);
  await ctx.close();
}

// =============================================================================================
// 6. Search (the owner's QA note Q3): typed in order, caret kept, filtered, closed back to its icon
// =============================================================================================
console.log(`\nSearch (Q3)\n${'='.repeat(78)}`);
const manifest = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/lever-manifest.json'), 'utf8'));
const labelOf = (key) => manifest.levers.find((l) => l.key === key)?.label;
// S7: Shape moved to the two panes, so the search runs on its levers, found by their hooks (the radius softness and
// density levers; the studio names radius softness in its own words, E2, so the label is not the manifest's).
const RADIUS = '[data-p3="lever-radius-scale"]';
const DENSITY = '[data-p3="lever-density"]';
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
  const r = await page.evaluate((sels) => {
    const input = document.querySelector('[data-p3="search-input"]');
    const blocks = [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lever')];
    const vis = (k) => k.getBoundingClientRect().height > 0;
    const at = (sel) => document.querySelector(`[data-p3="levers-pane"] ${sel}`);
    return { value: input.value, same: input.dataset.cid === 'same', status: document.querySelector('[data-p3="search-status"]')?.textContent,
      visible: blocks.filter(vis).length, radius: !!at(sels[0]) && vis(at(sels[0])), density: at(sels[1]) ? vis(at(sels[1])) : null };
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
      advanced: !!document.querySelector('[data-p3="lever-status-success"]') };
  }, [CHROMA, PRIMARY]);
  ok(r.value === 'chroma' && r.chroma, `search palettes: typing "chroma" shows the "${CHROMA}" lever (${JSON.stringify(r)})`);
  ok(r.primary === false, `search palettes: a lever that does not match ("${PRIMARY}") is hidden (${r.primary === null ? 'not on the page' : 'visible'})`);
  ok(r.advanced, 'search palettes: the search reaches the advanced levers (the status colors are drawn while it runs)');
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
      // Since the owner's "A · Menu bar" (2026-10-05) the bar shows "Contrast" and the line is the tooltip's.
      const name = await page.evaluate(() => ({ text: document.querySelector('[data-p3="verdict-tip"]')?.textContent, label: document.querySelector('[data-p3="verdict"]')?.getAttribute('aria-label') }));
      ok(name.label === `Verdict: ${VERDICT_LINE}. Open Inspect, Contrast`, `${where}: the verdict is named "Verdict: ${VERDICT_LINE}. Open Inspect, Contrast" — named "${name.label}"`);
      ok(name.text === VERDICT_LINE, `${where}: the verdict's tooltip reads "${VERDICT_LINE}" — reads "${name.text}"`);
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
  await hooks.click(page.locator('[data-p3="mode-option"][data-mode="dark"]'));
  const a = await modeState(page);
  ok(a.radios.find((r) => r.mode === 'dark')?.checked === 'true', `${where}: choosing Dark in the mode control checks it`);
  // The legacy mode strip's sync check is RETIRED (S8.2 moved the last legacy page with a strip), and the hold S8.2 left
  // here is RETIRED in S8.3: `test:smoke` section 1 walks every place in every mode and asserts no legacy page (and so no
  // legacy strip) is drawn, and that every place's header marks the one mode chosen (mode agreement).
  // The mode chosen on one page is the mode every page draws in: HC light, chosen on Components, holds on Palettes.
  await goPlace(page, 'components');
  await hooks.click(page.locator('[data-p3="mode-option"][data-mode="hc-light"]'));
  await goPlace(page, 'color-palettes');
  const b = await modeState(page);
  ok(b.radios.find((r) => r.mode === 'hc-light')?.checked === 'true', `${where}: HC light, chosen on Components, is the mode Palettes shows (${b.radios.filter((r) => r.checked === 'true').map((r) => r.mode)})`);
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
/** The Figma menu's items, by hook suffix and label: today's labels (the old Prune stale control, the file-setup
 *  button) and concept v6's two option-first items. No Apply Theme (#2178, owner decision 2026-10-05): the bar's
 *  filled button is its one control. Literal. */
const FIGMA_ITEMS = [['prune', 'Prune stale'], ['file-setup', 'Set up file'], ['build', 'Build set…'], ['style-guide', 'Build style guides…']];
/** Each item's hook, spelled out so the hook guard reads every one. */
const FIGMA_OPTION = { prune: '[data-p3="figma-option-prune"]', 'file-setup': '[data-p3="figma-option-file-setup"]',
  build: '[data-p3="figma-option-build"]', 'style-guide': '[data-p3="figma-option-style-guide"]' };
/** What each item must do, observed: the write message it posts to the main thread (the message the old
 *  control posted), or where it opens: a legacy page (Style guide…), or since S8.2 a tab (Build set… opens the
 *  Components tab, owner decision G2 A, where the set is chosen and built). Typed here from
 *  `apps/plugin/src/messages.ts`'s names and the tab's hook. */
const FIGMA_EFFECT = { apply: ['apply-theme'], prune: ['prune:false'], 'file-setup': ['file-setup'], build: { tab: 'components' }, 'style-guide': { menuPage: 'style-guides' } };
/** The Figma menu's Prune item while each half of a prune runs (`figmaActions` in main.ts). Literal. */
const PRUNE_LABEL = { preview: '… Checking…', delete: '… Removing…' };
/** The drawer's note, per host: concept v6's plugin line, and the studio's own. Literal. */
const DRAWER_NOTE = { figma: 'Results of Apply, Build and Prune appear here after they run.', web: 'Nothing has run in this session.' };
/** An agent-link state the main thread could publish, and the status line it must read as (today's words). */
const AGENT_ON = { v: 1, on: true, since: '2026-10-01T09:00:00.000Z', engineVersion: 'x', build: 'x', pollMs: 1000, transports: { mailbox: true, bridge: false }, lastCommand: null, inboxError: null };
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
          check(m, `${where} / Activity open`, columnOf(host, w), narrow ? { ...INSPECT_NARROW_FLOOR, text: 3, fonts: 3, controls: 5, edges: 6 } : PLACE_FLOOR, narrow
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
          hooks.absent(ok, { seen: bar === 1, state: 'the studio\'s top bar' }, await page.locator('[data-p3="bar-agent"]').count() === 0 && await page.locator('[data-p3="agent-toggle"]').count() === 0, `${where}: the studio renders no Agent slot or tile`);
          ok(errors.length === 0, `${where} Activity: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
          continue;
        }

        // ── the Agent tile (IA-3; the owner's T7 A, 2026-10-05), in the top bar; the bottom-left chip is gone (D6) ──
        // A borderless tile between Theme and Activity, its glyph over "Agent" (the label drops at the narrow tier). A
        // click posts the same `agent-link` request the old popover's switch did; the main thread's published state is
        // what the tile shows: the fixed name "Agent" (a toggle, Q44), aria-pressed false or true, and a green dot only while on.
        const agentState = () => page.evaluate(() => {
          const c = document.querySelector('[data-p3="top-bar"] [data-p3="bar-agent"] [data-p3="agent-toggle"]');
          const dot = c?.querySelector('[data-p3="agent-dot"]');
          const lab = c?.querySelector('.p3-tile-label');
          const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden'; };
          return { inBar: !!c, name: c?.getAttribute('aria-label') ?? null, pressed: c?.getAttribute('aria-pressed') ?? null, dot: vis(dot), label: vis(lab) ? lab.textContent : null,
            tip: c?.querySelector('[data-p3="agent-toggle-tip"]')?.textContent ?? null };
        });
        const chip = await page.evaluate(() => {
          const frame = document.querySelector('[data-p3="frame"]');
          // Anything outside the frame that names an agent or holds a control: where the old chip was mounted.
          const outside = [...document.body.querySelectorAll('*')].filter((e) => !frame.contains(e) && !e.contains(frame) && !['SCRIPT', 'STYLE'].includes(e.tagName));
          return {
            inBar: !!document.querySelector('[data-p3="top-bar"] [data-p3="bar-agent"] [data-p3="agent-toggle"]'),
            old: !!document.querySelector('#p3-agent-link'), popover: !!document.querySelector('.p3-agent-chip, .p3-agent-pop'),
            strays: outside.filter((e) => /agent/i.test(e.textContent ?? '') || e.querySelector('button')).map((e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}`),
          };
        });
        const a0 = await agentState();
        ok(a0.inBar && a0.name === 'Agent' && a0.pressed === 'false' && !a0.dot && a0.tip === 'Agent' && a0.label === (narrow ? null : 'Agent'),
          `T7 ${where}: the Agent tile sits in the top bar's Agent slot, named "Agent", aria-pressed false, no dot, ${narrow ? 'its label dropped' : 'labelled "Agent"'} (${JSON.stringify(a0)})`);
        hooks.absent(ok, { seen: chip.inBar, state: 'the Agent tile in the top bar' }, !chip.old && !chip.popover && chip.strays.length === 0,
          `D6 ${where}: the old chips are gone — no bottom-left chip, no Agent chip or popover, and nothing outside the frame names an agent or holds a button (found ${JSON.stringify(chip.strays)}, #p3-agent-link ${chip.old ? 'present' : 'absent'}, chip or popover ${chip.popover ? 'present' : 'absent'})`);
        const slot = await page.evaluate(() => { const s0 = document.querySelector('[data-p3="bar-agent"]'); s0.__p3Mark = 'slot'; return true; });
        // A re-render of the legacy bar (the Pages menu opening and closing) keeps the same slot, tile inside.
        await hooks.click(page.locator('[data-p3="pages-menu"]'), WAIT);
        await hooks.click(page.locator('[data-p3="pages-menu"]'), WAIT);
        const kept = await page.evaluate(() => { const s1 = document.querySelector('[data-p3="bar-agent"]'); return s1?.__p3Mark === 'slot' && !!s1.querySelector('[data-p3="agent-toggle"]'); });
        ok(slot && kept, `IA-3 ${where}: the Agent slot is the same node after the bar re-renders, and still holds the tile`);
        await takePosts(page);
        await hooks.click(page.locator('[data-p3="agent-toggle"]'), WAIT);
        const sw = await takeWrites(page);
        ok(isWire(sw, AGENT_WIRE), `T7 ${where}: a click on the Agent tile asks the main thread to turn the link on, ${JSON.stringify(AGENT_WIRE)} (posted ${JSON.stringify(sw)})`);
        await postMsg(page, { type: 'agent-link-state', state: AGENT_ON });
        await page.waitForFunction(() => document.querySelector('[data-p3="agent-toggle"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
        const a1 = await agentState();
        ok(a1.name === 'Agent' && a1.pressed === 'true' && a1.dot && a1.tip === 'Agent', `T7 ${where}: the main thread's state turns the tile on: named "Agent", aria-pressed true, the dot drawn (${JSON.stringify(a1)})`);
        const mc = await measure(page, `${where} / Agent on`, host, w);
        check(mc, `${where} / Agent on`, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: ['[data-p3="agent-toggle"]'] });
        await shot('agent');
        await hooks.click(page.locator('[data-p3="agent-toggle"]'), WAIT);
        const sw2 = await takeWrites(page);
        ok(isWire(sw2, { type: 'agent-link', on: false }), `T7 ${where}: a click while on asks the main thread to turn the link off (posted ${JSON.stringify(sw2)})`);
        await postMsg(page, { type: 'agent-link-state', state: { ...AGENT_ON, on: false, since: null } });
        await page.waitForFunction(() => document.querySelector('[data-p3="agent-toggle"]')?.getAttribute('aria-pressed') === 'false', null, { timeout: 5000 }).catch(() => {});
        const a2 = await agentState();
        ok(a2.name === 'Agent' && a2.pressed === 'false' && !a2.dot, `T7 ${where}: the published off state clears the dot and the pressed state (${JSON.stringify(a2)})`);

        // ── the Figma menu: by keyboard, then each item's action ──────────────────────────────────
        await page.locator('[data-p3="figma-open"]').focus();
        await page.keyboard.press('ArrowDown');
        const k0 = await menuState(page);
        ok(k0.open && k0.expanded === 'true' && k0.focus === 'figma-option-prune', `Figma menu ${where}: Arrow Down on the button opens the menu on its first item (${JSON.stringify({ open: k0.open, focus: k0.focus })})`);
        ok(JSON.stringify(k0.items.map(([hk, l]) => [hk, l])) === JSON.stringify(FIGMA_ITEMS.map(([id, l]) => [hooks.role(FIGMA_OPTION[id]), l])),
          `Figma menu ${where}: the items read ${FIGMA_ITEMS.map(([, l]) => l).join(', ')} — read ${k0.items.map(([, l]) => l).join(', ')}`);
        // #2178 (owner decision, 2026-10-05): Apply Theme is the bar's filled button and nothing else. Read by label and
        // by hook, so an item put back under either fails here; the proof is the open menu with its items read.
        hooks.absent(ok, { seen: k0.open && k0.items.length > 0, state: 'the Figma menu open with its items' },
          !k0.items.some(([hk, l]) => /apply/i.test(`${hk} ${l}`)),
          `#2178 Figma menu ${where}: the menu lists no Apply Theme, the bar's button is its one control (items ${JSON.stringify(k0.items.map(([hk, l]) => [hk, l]))})`);
        const keys = [];
        for (const key of ['ArrowDown', 'End', 'Home', 'ArrowUp']) { await page.keyboard.press(key); keys.push((await menuState(page)).focus); }
        ok(JSON.stringify(keys) === JSON.stringify(['figma-option-file-setup', 'figma-option-style-guide', 'figma-option-prune', 'figma-option-style-guide']),
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
        // Apply Theme, from the bar's filled button (its one control since #2178): the write, and the drawer opens by itself (F2).
        await takePosts(page);
        await hooks.click(page.locator('[data-p3="apply-to-figma"]'), WAIT);
        const wa = await takeWrites(page);
        const pa = wa.map(keyOf);
        ok(JSON.stringify(pa) === JSON.stringify(FIGMA_EFFECT.apply), `#2178 ${where}: the bar's Apply Theme posts ${FIGMA_EFFECT.apply} — posted ${JSON.stringify(pa)}`);
        ok(isWire(wa, FIGMA_WIRE.apply), `#2178 ${where}: the bar's Apply Theme posts the brand the page loaded (example-brands.json's prism3), whole — ${wireDiff(wa[0], FIGMA_WIRE.apply)}`);
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
        // While it runs, Prune stale is unavailable (today's rule: a prune reads what an apply writes); Set up file
        // is not.
        await openFigma(page);
        const busy = await menuState(page);
        const dis = Object.fromEntries(busy.items.map(([hk, , d, b]) => [hk, b ? 'busy' : d ? 'disabled' : 'ready']));
        ok(dis['figma-option-prune'] === 'disabled' && dis['figma-option-file-setup'] === 'ready',
          `Figma menu ${where}: while Apply runs, Prune stale is unavailable and Set up file can run (${JSON.stringify(dis)})`);
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
        // D-RED A (owner, 2026-10-05): the tile's dot is red ('bad') for a failure and green ('warn') for a warning; the
        // name says it needs attention either way.
        const wantDot = kind === 'failure' ? 'bad' : 'warn';
        ok(f.dot === wantDot && f.name === 'Activity, 1 needs attention', `F2 ${where}: Activity's dot (${wantDot}) and name say a result needs attention (dot ${f.dot}, name "${f.name}")`);
        if (narrow) ok(f.sheet, `F2 ${where}: at 380 a ${kind} opens the full-pane sheet under the top row (sheet ${f.sheet})`);
        const mf = await measure(page, `${where} / a ${kind} open`, host, w);
        check(mf, `${where} / a ${kind} open`, columnOf(host, w), narrow ? { ...INSPECT_NARROW_FLOOR, text: 4, fonts: 4, controls: 6 } : PLACE_FLOOR,
          { state: narrow ? 'sheet' : 'page', only: narrow ? ['[data-p3="brand-switcher"]', '[data-p3="activity-open"]', ...FIGMA_BAR, '[data-p3="activity-toggle"]', '[data-p3="op-head"]'] : null, extra: narrow ? [] : ['[data-p3="activity-toggle"]', '[data-p3="op-head"]'] });
        if (narrow) await shot('drawer-open');
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        const c = await drawerState(page);
        ok(!c.open && c.shown && c.dot === wantDot, `F2 ${where}: the drawer's toggle closes it, and the dot keeps the ${kind} (open ${c.open}, dot ${c.dot})`);
        // The page row's verdict asks to be shown: the drawer hears it through the store and opens by hand, on
        // that operation's row, expanded (S11). It discloses nothing in place any more. RE-HOSTED IN S8.2: Set up file
        // has no page row now (its one control is the Figma menu's, G8 A) and a build's result is the Components
        // tab's per-set line, so the one page row left with a verdict is the Style guide's, which the menu's Style
        // guide… item opens without writing (asserted below). Since S11.2 that item opens the Build style guides page, and
        // the legacy page with this row is reached from the Pages menu until the cleanup (H12). A style guide that failed,
        // as the host posts it:
        await hooks.click(page.locator('[data-p3="pages-menu"]'), WAIT);
        await hooks.click(page.locator('[data-p3="rail-page-style-guide"]'), WAIT);
        await page.waitForFunction(() => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === 'style-guide', null, { timeout: 5000 }).catch(() => {});
        await takePosts(page);
        const sgBad = { type: 'style-guide-result', ok: false, headline: '✗ style guide failed', summary: 'style guide failed: the cell components Set up file adds are missing' };
        await postMsg(page, sgBad);
        await page.waitForFunction(() => !!document.querySelector('[data-p3="style-guide-row"] [data-p3="status-verdict"]'), null, { timeout: 5000 }).catch(() => {});
        // A failed result opens the drawer on its own (F2); close it, so the click below is what opens it.
        await settle(page);
        if ((await drawerState(page)).open) await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        await settle(page);
        const closed0 = await drawerState(page);
        ok(!closed0.open, `F2 ${where}: the drawer is closed before the page row's verdict is clicked (open ${closed0.open})`);
        await hooks.click(page.locator('[data-p3="style-guide-row"] [data-p3="status-verdict"]'), WAIT);
        await settle(page);
        const d1 = await drawerState(page), q1 = await rowOf(page, 'styleguide');
        ok(d1.open && d1.body && d1.expanded === 'true' && d1.ops['styleguide']?.summary === sgBad.summary && q1?.expanded === 'true' && q1?.chev !== 'none',
          `F2 ${where}: clicking a failed style guide's verdict on the page row opens the drawer on its Style guide row, expanded — open ${d1.open}, summary "${d1.ops['styleguide']?.summary}", row ${JSON.stringify(q1)}`);
        // The row's own header discloses it, and leaves the drawer open.
        await hooks.click(page.locator('[data-p3="activity-op"][data-op="styleguide"] [data-p3="op-head"]'), WAIT);
        await settle(page);
        const d2 = await drawerState(page), q2 = await rowOf(page, 'styleguide');
        ok(d2.open && d2.ops['styleguide']?.summary === null && q2?.expanded === 'false' && q2?.chev === 'none',
          `F2 ${where}: the row's own header collapses it, and the drawer stays open — open ${d2.open}, summary "${d2.ops['styleguide']?.summary}", row ${JSON.stringify(q2)}`);
        await hooks.click(page.locator('[data-p3="activity-op"][data-op="styleguide"] [data-p3="op-head"]'), WAIT);
        await settle(page);
        const d3 = await drawerState(page);
        ok(d3.ops['styleguide']?.summary === sgBad.summary, `F2 ${where}: the header expands it again (summary "${d3.ops['styleguide']?.summary}")`);
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        // The two option-first items open where those options are; neither writes on its own. Build set… opens the
        // Components tab (S8.2, G2 A): the tab row selects it, the place is Components, and no legacy page shows.
        for (const id of ['build', 'style-guide']) {
          if (id === 'build') await goPlace(page, 'color-palettes');
          await openFigma(page);
          await hooks.click(page.locator(FIGMA_OPTION[id]), WAIT);
          const want = FIGMA_EFFECT[id];
          if (want.tab) await page.waitForFunction((t) => document.querySelector('[data-p3="frame"]')?.dataset.place === t, want.tab, { timeout: 5000 }).catch(() => {});
          else if (want.menuPage) await page.waitForFunction(() => !!document.querySelector('[data-p3="style-guides"]'), null, { timeout: 5000 }).catch(() => {});
          else await page.waitForFunction((p) => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === p, want.page, { timeout: 5000 }).catch(() => {});
          const g = await menuState(page);
          const at = await page.evaluate(() => ({ place: document.querySelector('[data-p3="frame"]')?.dataset.place ?? null,
            selected: document.querySelector('[data-p3^="tab-"][aria-selected="true"]')?.getAttribute('data-p3') ?? null,
            sets: !!document.querySelector('[data-p3="components-build"]'),
            menuPage: document.querySelector('[data-p3="frame"]')?.dataset.layout === 'page' && !!document.querySelector('[data-p3="style-guides"]') }));
          const px = await takePosts(page);
          const landed = want.tab ? at.place === want.tab && at.selected === `tab-${want.tab}` && g.page === undefined && at.sets
            : want.menuPage ? at.menuPage && at.selected === null : g.page === want.page;
          ok(landed && px.length === 0, `Figma menu ${where}: ${FIGMA_ITEMS.find(([x]) => x === id)[1]} opens the ${want.tab ? `${want.tab} tab` : `${want.page ?? want.menuPage} page`} and writes nothing — ${landed ? '' : 'nothing opened: '}place "${at.place}", tab ${at.selected}, legacy page "${g.page}", Build control ${at.sets}, posted ${JSON.stringify(px)}`);
        }
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
 *  it (#1942, owner decision Q67, S6.2), and the radius sample follows it (owner decision D18 B, S7; its heading is
 *  DRAFT). */
const STYLE_GUIDE_ROOTS = ['Type sample', 'Radius and shadow sample', 'Background', 'Foreground', 'Text color', 'Border', 'Icon', 'Disabled', 'Interactive'];
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
 *  on Palettes), with the hook each must render. Literal: the decision, never read from `pages.ts`. The fourth
 *  field marks a lever whose block is drawn only while pinned (#2175, owner PN1 B): unpinned, `neutral.anchor`'s
 *  control is the Pinned choice in the neutral source, and its color field's block appears once Pinned is chosen. */
const PALETTES_LEVERS = [
  ['primary', '[data-p3="lever-primary"]', false], ['brandColors', '[data-p3="lever-brand-colors"]', false],
  ['neutral.hue', '[data-p3="lever-neutral-hue"]', false], ['neutral.chroma', '[data-p3="lever-neutral-chroma"]', false],
  ['neutral.anchor', '[data-p3="lever-neutral-anchor"]', false, 'pinned'],
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
  for (const [key, hook, adv, only] of PALETTES_LEVERS) {
    if (adv) hooks.absent(ok, { seen: c0['[data-p3="lever-primary"]'] === 1, state: 'the everyday Palettes levers' }, c0[hook] === 0, `${host}: Palettes lever ${key} waits behind Show advanced (${c0[hook]} rendered)`);
    else if (only === 'pinned') hooks.absent(ok, { seen: c0['[data-p3="lever-neutral-hue"]'] === 1, state: 'the Neutrals levers, unpinned' }, c0[hook] === 0, `${host}: Palettes lever ${key} draws no block until Pinned is chosen (${c0[hook]} rendered)`);
    else ok(c0[hook] === 1, `${host}: Palettes lever ${key} renders its hook ${hooks.role(hook)} once — rendered ${c0[hook]}`);
  }
  // Pinned, so every key on the page draws its block below.
  await hooks.click(page.locator('[data-p3="neutral-source-pinned"]'));
  await hooks.need(page, '[data-p3="lever-neutral-anchor"]');
  const cp = await count();
  for (const [key, hook, adv] of PALETTES_LEVERS) if (!adv) ok(cp[hook] === 1, `${host}: pinned, Palettes lever ${key} renders its hook ${hooks.role(hook)} once outside Show advanced — rendered ${cp[hook]}`);
  await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
  await hooks.need(page, '[data-p3="lever-status-info"]');
  const c1 = await count();
  for (const [key, hook] of PALETTES_LEVERS) ok(c1[hook] === 1, `${host}: Palettes lever ${key} renders its hook ${hooks.role(hook)} once with Show advanced open — rendered ${c1[hook]}`);
  const st = await strays();
  ok(st.length === 0, `${host}: every lever block on Palettes is one of its ${PALETTES_LEVERS.length} keys${st.length ? ` — unclassified lever ${st.join(', ')}` : ''}`);
  const label = await page.evaluate(() => document.querySelector('[data-p3="palettes-advanced"]')?.textContent);
  ok(label === 'Hide 4 advanced', `${host}: the disclosure reads "Hide 4 advanced" when open (reads "${label}")`);
  // The advanced levers are chrome too: measured with Show advanced open.
  const ma = await measure(page, `${host} light 1280 / Palettes, Show advanced open`, host, 1280);
  check(ma, `${host} light 1280 / Palettes, Show advanced open`, columnOf(host, 1280), PLACE_FLOOR, { extra: ['[data-p3="neutral-source-pinned"]', '[data-p3="neutral-anchor-hex"]', '[data-p3="status-success-source"]'] });
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
  await hooks.click(page.locator('[data-p3="neutral-source-pinned"]'));
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
// THE GLIDE LOG (#2042): an eased scroll read on frame time, never on the wall clock.
//
//   `easedScrollTo` (`preview/follow-edit.ts`) takes one step per animation frame and reads time only from the
//   frame's timestamp. #2015 measured its glides by sampling scrollTop from a recorder started after the edit
//   returned, against `performance.now()`, so each check depended on how fast the machine drew: under load the
//   recorder joined late and frames came late, and "the glide lasts …" measured 66ms against a 200ms tween.
//
//   So the page's animation frames run on a virtual clock here: each frame is exactly FRAME_MS after the one
//   before it, whatever the wall clock did in between. Every `scrollTo` on the two panes is logged, from before
//   the edit, with the frame time it ran in (null when it ran outside a frame, in the edit itself). Only the
//   frame timestamp is virtual: Playwright's `page.clock` would also fake every timer, `Date` and
//   `performance.now` the studio runs on, which nothing here needs. The log is the same on a busy machine as on
//   an idle one: how many steps a glide takes, the frame time from its first step to its last, and whether
//   each step lies on the declared curve.
// =============================================================================================
/** One virtual animation frame, in ms: a whole number, so frame times add up exactly. */
const FRAME_MS = 16;
/** Put `page`'s animation frames on the virtual clock and start the glide log. Once per page. */
const installGlideLog = (page) => page.evaluate((frame) => {
  if (window.__glide) return;
  const raf = window.requestAnimationFrame.bind(window);
  let real = null, n = 0, at = null;
  // Every callback in one real frame shares its timestamp, so a new timestamp is the next virtual frame.
  window.requestAnimationFrame = (cb) => raf((now) => {
    if (now !== real) { real = now; n++; }
    at = n * frame;
    try { cb(at); } finally { at = null; }
  });
  window.__glide = [];
  const scrollTo = Element.prototype.scrollTo;
  Element.prototype.scrollTo = function (...a) {
    const pane = this.getAttribute?.('data-p3');
    if (pane === 'preview-body' || pane === 'levers-pane') {
      const o = a[0] && typeof a[0] === 'object' ? a[0] : null;
      window.__glide.push({ pane, top: Math.round(o ? o.top : a[1]), behavior: o ? o.behavior ?? 'auto' : 'auto', at });
    }
    return scrollTo.apply(this, a);
  };
}, FRAME_MS);
/** Take the glide log so far, and empty it. */
const takeGlideLog = (page) => page.evaluate(() => window.__glide.splice(0));
/** A CSS `cubic-bezier(x1, y1, x2, y2)` as the progress function it names, solved here by bisection (the
 *  test's own, not `follow-edit.ts`'s). */
const cubicBezier = (css) => {
  const [x1, y1, x2, y2] = /cubic-bezier\(([^)]*)\)/.exec(css)[1].split(',').map(Number);
  const at = (p1, p2, t) => 3 * p1 * t * (1 - t) ** 2 + 3 * p2 * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (at(x1, x2, m) < x) lo = m; else hi = m; }
    return at(y1, y2, (lo + hi) / 2);
  };
};
/** `pane`'s steps in a glide log: how many, what each asked for, the positions strictly between the first and
 *  the last, the frame time from the first step to the last and to the one before it, and whether every step
 *  ran in an animation frame. Given a declared `dur` (ms) and `ease` (a CSS cubic-bezier), also the steps off
 *  that curve by more than 1px, as [frame time, position, the curve's position]. */
const glideOf = (log, pane, dur = null, ease = null) => {
  const s = log.filter((x) => x.pane === pane);
  const asked = s.map((x) => x.behavior);
  if (!s.length) return { steps: 0, asked, between: 0, span: null, before: null, inFrames: false, instant: false, offCurve: [] };
  const from = s[0].top, to = s[s.length - 1].top, t0 = s[0].at;
  const inFrames = s.every((x) => x.at !== null);
  const curve = ease ? cubicBezier(ease) : null;
  const want = (x) => (x.at - t0 >= dur ? to : Math.round(from + (to - from) * curve((x.at - t0) / dur)));
  return {
    steps: s.length, asked, from, to,
    between: new Set(s.map((x) => x.top).filter((t) => (t - from) * (t - to) < 0)).size,
    span: inFrames ? s[s.length - 1].at - t0 : null,
    before: inFrames && s.length >= 2 ? s[s.length - 2].at - t0 : null,
    inFrames, instant: s.every((x) => x.behavior === 'instant'),
    offCurve: inFrames && curve ? s.filter((x) => Math.abs(x.top - want(x)) > 1).map((x) => [x.at - t0, x.top, want(x)]) : [],
  };
};
/** One step, taken in the edit itself rather than in an animation frame: a scroll that lands at once. */
const atOnce = (g) => g.steps === 1 && !g.inFrames;

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
  // An edit does, and smoothly (owner, 2026-10-01; eased on the chrome's motion tokens since QA-B9). The glide
  // log (#2042, above) records each step of a reveal, the behavior it asks for and its position, from before
  // the edit and on frame time; `frames()` samples the body's scrollTop on every animation frame until it has
  // held still for ten frames, which is how the checks wait for a reveal to finish.
  await installGlideLog(page);
  const reveals = async () => glideOf(await takeGlideLog(page), 'preview-body');
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
  ok(r1.steps >= 2 && r1.instant && r1.inFrames, `Q4: without reduced motion the reveal steps its own eased glide, one instant position per frame — asked ${JSON.stringify(r1.asked)}`);
  ok(r1.between >= 2, `Q4: without reduced motion the preview passes through positions on its way (${r1.between} in-between positions over ${r1.steps} steps, ${r1.from} → ${r1.to}; it settled at ${t1[t1.length - 1]})`);
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
  ok(atOnce(r3) && r3.instant, `Q4: under reduced motion the reveal asks for one instant scroll, in the edit itself — asked ${JSON.stringify(r3.asked)}${r3.inFrames ? ', in a frame' : ''}`);
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
  const verdictNow = await page.evaluate(() => document.querySelector('[data-p3="verdict-tip"]')?.textContent);
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
/** #1971 (owner decision Q81, S4f): the page planes, Background, carry no ratio badge; every other section carries its
 *  badges, Foreground included since it sits on the floor it is measured against (GR2, owner 2026-10-04). Literal. */
const FILLS_GROUND_SECTIONS = ['Background'];
/** GR2: the Foreground roles measured against the contrast floor, each badged in the Foreground section. Literal. */
const FLOOR_BADGED = ['brand', 'danger', 'success', 'warning', 'info'];
/** #1971 Q13(a) (owner, 2026-10-05): the Foreground cards whose badge describes the text drawn on the card's own fill,
 *  as [fill, text]: the three Inverse cards (their label) and the five Subtle cards. Literal. */
const ON_FILL_CARDS = [...['primary', 'secondary', 'tertiary'].map((t) => [`inverse.foreground.${t}`, 'inverse.text.primary']),
  ...FLOOR_BADGED.map((sem) => [`foreground.${sem}-subtle`, `text.${sem}`])];
/** #2121: the minimum each of those cards' text is held to, which its badge's ✓/✗ is the verdict of. Literal, never
 *  the badge's or the resolver's own `min`: a status text 4.5:1, and 7:1 in the high-contrast modes; the inverse
 *  label 7:1, and 15:1 in the high-contrast modes (the engine's contracts, as `resolveAllModes` states them for every
 *  example brand on 2026-10-05). */
const ON_FILL_MIN = (mode, ink) => (ink === 'inverse.text.primary' ? (mode.startsWith('hc') ? 15 : 7) : (mode.startsWith('hc') ? 7 : 4.5));
/** WCAG 2 contrast of two hexes, computed here (the oracle side), never read from the studio. */
const wcagHex = (a, b) => {
  const lum = (hx) => { const f = (i) => { const x = parseInt(hx.slice(i, i + 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5); };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** #1971 (owner, 2026-10-03): the grounds follow the previewed mode. Every section sits on the page, Background
 *  included, except these, which sit on the CONTRAST FLOOR: the step `foreground.*` is measured against. Literal. */
const FILLS_FLOOR_SECTIONS = ['Foreground'];
/** The line naming the floor inside that section's ground (APPROVED, owner 2026-10-04, GR1). Literal. */
const FLOOR_LABEL = (step) => `On the contrast floor (${step})`;
/** The contrast floor per mode, from the COMMITTED emission, never the studio's resolver: `foreground.brand`'s
 *  `against` in the mode's tree (the base, or the base under the mode's overlay), resolved as a role or a palette
 *  step to its hex. */
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
ok(Object.values(EMITTED_FLOOR).every((x) => /^#[0-9a-f]{6}$/.test(x.hex ?? '')), `the oracle resolved the contrast floor for every mode from the emission (${JSON.stringify(EMITTED_FLOOR)})`);
ok(Object.entries(EMITTED_FLOOR).some(([m, x]) => x.hex !== EMITTED[m]), `the oracle's contrast floor differs from the page in at least one mode, so a Foreground on the page can fail (${JSON.stringify(EMITTED_FLOOR)} vs ${JSON.stringify(EMITTED)})`);
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
    fgBadges: [...(host?.querySelectorAll('.psec') ?? [])].filter((x) => x.querySelector('.psec-t')?.textContent === 'Foreground')
      .flatMap((x) => [...x.querySelectorAll('[data-p3="ratio-badge"]')].map((b) => ({ role: b.dataset.role, text: b.querySelector('.sg-ratio-n')?.textContent ?? '' }))),
    drawn: [...(host?.querySelectorAll('.psec') ?? [])].filter((x) => x.querySelector('.psec-t')?.textContent === 'Foreground')
      .flatMap((x) => [...x.querySelectorAll('.sg-cw')]).map((cw) => {
        const card = cw.querySelector('.sg-card'), lab = card?.querySelector('.sg-lab'), b = cw.querySelector('[data-p3="ratio-badge"][data-pair]');
        const solid = (css) => { const c = parse(css); return c && c.a >= 0.999 ? hex(c) : null; };
        return { fillRole: card?.dataset.sgRole ?? null, inkRole: lab?.dataset.sgRole ?? null, fill: card ? solid(getComputedStyle(card).backgroundColor) : null, ink: lab ? solid(getComputedStyle(lab).color) : null,
          badge: b ? b.querySelector('.sg-ratio-n')?.textContent ?? '' : null, mark: b ? b.querySelector('.sg-ratio-mk')?.textContent ?? null : null };
      }),
    labels: Object.fromEntries([...(host?.querySelectorAll('.psec') ?? [])].map((x) => [x.querySelector('.psec-t')?.textContent ?? '?', x.querySelector('.sg-ground [data-p3="ground-label"]')?.textContent ?? null])),
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
      const floor = EMITTED_FLOOR[mode];
      for (const name of EXPECT_FILLS_SPECIMENS) {
        const r = g.roots.find((x) => x.name === name);
        // #1971: Foreground on the contrast floor, the rest (Background included) on the page.
        const onFloor = FILLS_FLOOR_SECTIONS.includes(name);
        const on = onFloor ? floor.hex : want;
        ok(!!r && r.root && r.ground === on, `specimen ground: surfaces & fills ${where}: ${name} is a specimen root on ${onFloor ? `the contrast floor ${floor.step} ${floor.hex} (#1971)` : `background.primary ${want}`}${
          !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== on ? ` — ${r.ground === g.card ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
        // #1971: the floor's section names its ground by the emission's step; no other section carries that line.
        const label = onFloor ? FLOOR_LABEL(floor.step) : null;
        ok((g.labels[name] ?? null) === label, `#1971 surfaces & fills ${where}: the ${name} section ${label ? `names its ground "${label}"` : 'carries no ground label'}${(g.labels[name] ?? null) !== label ? ` — read ${JSON.stringify(g.labels[name] ?? null)}` : ''}`);
      }
      // #1971: no ratio badge in a section that is a ground; at least one in each section on the page that grades a role.
      const badgesBy = g.badges;
      for (const name of FILLS_GROUND_SECTIONS) ok(badgesBy[name] === 0, `#1971 surfaces & fills ${where}: the ${name} section shows no contrast badge (Q81) — ${badgesBy[name]} drawn`);
      for (const name of ['Text color', 'Border', 'Icon', 'Fields']) ok(badgesBy[name] > 0, `#1971 surfaces & fills ${where}: the ${name} section, on the page, shows its contrast badges — ${badgesBy[name]} drawn`);
      // GR2: Foreground, on the floor, badges each bold fill; each prints the emitted fill against the emitted floor.
      const offFloor = FLOOR_BADGED.flatMap((sem) => {
        const role = `foreground.${sem}`, b = g.fgBadges.find((x) => x.role === role), e = floor.fills[sem];
        if (!b) return [`${role}: no badge drawn`];
        if (!e?.hex || e.against !== floor.step) return [`${role}: the emission measures it against ${e?.against}, not the floor ${floor.step}`];
        const r = wcagHex(e.hex, floor.hex);
        return Math.abs(parseFloat(b.text) - Math.floor(r * 100) / 100) <= 0.011 ? [] : [`${role} prints ${b.text}, the emitted ${e.hex} on the floor ${floor.hex} measures ${r.toFixed(3)}:1`];
      });
      // Q13(a): every Subtle and Inverse card badges its text on its own fill, as rendered; each rendered color is held to
      // the emission's hex for its role, and the ratio is computed here from the two.
      const offDrawn = ON_FILL_CARDS.flatMap(([fillRole, inkRole]) => {
        const d = g.drawn.find((x) => x.fillRole === fillRole);
        if (!d) return [`${fillRole}: card not drawn`];
        if (d.inkRole !== inkRole) return [`${fillRole}: its text is ${d.inkRole}, not ${inkRole}`];
        if (d.badge === null) return [`${fillRole}: no badge of its drawn pairing`];
        if (d.fill !== floor.roles[fillRole] || d.ink !== floor.roles[inkRole]) return [`${inkRole} on ${fillRole}: renders ${d.ink} on ${d.fill}, the emission says ${floor.roles[inkRole]} on ${floor.roles[fillRole]}`];
        const r = wcagHex(d.ink, d.fill);
        if (!(Math.abs(parseFloat(d.badge) - Math.floor(r * 100) / 100) <= 0.011)) return [`${inkRole} on ${fillRole} prints ${d.badge}, the drawn ${d.ink} on ${d.fill} measures ${r.toFixed(3)}:1`];
        // #2121: and its mark is the verdict of that measured ratio against the text's minimum, typed here (ON_FILL_MIN).
        const wantMark = r + 1e-9 < ON_FILL_MIN(mode, inkRole) ? '✗' : '✓';
        return d.mark === wantMark ? [] : [`${inkRole} on ${fillRole} marks ${JSON.stringify(d.mark)}, the drawn ${r.toFixed(3)}:1 against the ${ON_FILL_MIN(mode, inkRole)}:1 minimum is ${wantMark}`];
      });
      ok(offDrawn.length === 0, `#1971 Q13(a) surfaces & fills ${where}: every Subtle and Inverse card in Foreground badges its text on its own fill, as drawn${offDrawn.length ? ` — ${offDrawn.join(' | ')}` : ''}`);
      ok(offFloor.length === 0, `#1971 GR2 surfaces & fills ${where}: the Foreground section, on the contrast floor, badges each bold fill with its emitted ratio against that floor${offFloor.length ? ` — ${offFloor.join(' | ')}` : ''}`);
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
  // BG1 A (#2181, approved 2026-10-06) shortened QA-B7's "Default background fills" and "Inverse background fills".
  ok(JSON.stringify(c.surfSubs) === JSON.stringify(['Default', 'Inverse']),
    `${host}: QA-B7, BG1 A: Background fills' sub-sections are "Default" and "Inverse" — read ${JSON.stringify(c.surfSubs)}`);
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
    // The info toggletip the block's own button controls (`aria-controls`), so it is that button's text. Since BG1 A the
    // button sits beside the section's title, in the title row of the section that holds the block.
    surfacesTip: (() => {
      const info = document.querySelector('[data-p3="fills-levers"] [data-p3="lever-surfaces"]')?.closest('.p3-lsec')?.querySelector('.p3-lsec-titlerow [data-p3="lever-info"]');
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
    // #1971 (APPROVED, owner 2026-10-05, superseding GR3): the preview's Foreground sits on the contrast floor, so its sentence (and the levers', Q23) says so.
    Foreground: "Content surfaces, shown on the contrast floor they're measured against.",
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
  // S4f (QA-B7): Background fills' two sub-headings come first, the APPROVED words (BG1 A: "Default" and "Inverse").
  ok(JSON.stringify(copy.subs) === JSON.stringify(['Default', 'Inverse', 'Inverse', 'Inverse', 'Inverse', 'Inverse', 'Inverse']),
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
  // #2167: askPair's click waits for its target to SETTLE, and is BOUNDED. Measured before writing it (2026-10-06):
  // the levers pane re-renders whole on every brand update, so icons-pair is a new node after each edit, and the
  // button sits far below the fold (y ≈ 3650 in a pane scrolled to ≈ 3650), so every click scrolls it into view
  // first. Under load (averages 7 to 14) and with the renderer throttled 4×, no click on it was replaced or moved
  // before it landed, and none took over 70ms. The one stall seen (30s at "scrolling into view if needed") is a
  // renderer that could not run, which no wait makes faster. So this waits until the page renders frames with the
  // button and the pane's scrollTop unchanged across consecutive frames, which also covers an eased scroll
  // (`follow-edit.ts`) still stepping. Then it clicks, both bounded. A stall fails THIS arm by name: askPair's
  // callers already report "no dialog" as their own failure. The suite reaches report() instead of dying on a bare
  // Playwright timeout. Local to this site on purpose: the shared `hooks.click` is unchanged.
  const PAIR_SEL = '[data-p3="levers-pane"] [data-p3="icons-pair"]';
  const PAIR_SETTLE_MS = 15000;
  const askPair = async () => {
    const deadline = Date.now() + PAIR_SETTLE_MS * 2;
    const settled = await Promise.race([
      page.evaluate(async ([sel, cap]) => {
        const pane = document.querySelector('[data-p3="levers-pane"]');
        const read = () => {
          const n = document.querySelector(sel);
          if (!n) return null;
          const r = n.getBoundingClientRect();
          return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}|${pane ? Math.round(pane.scrollTop) : 0}`;
        };
        const t0 = performance.now();
        let prev, still = 0, frames = 0;
        while (performance.now() - t0 < cap) {
          await new Promise((r) => requestAnimationFrame(r));
          frames++;
          const now = read();
          if (now !== null && now === prev) { if (++still >= 2) return { ok: true }; } else still = 0;
          prev = now;
        }
        return { ok: false, why: prev === null ? 'it is not in the page' : `it was still moving after ${frames} frames (last box ${prev})` };
      }, [PAIR_SEL, PAIR_SETTLE_MS]),
      new Promise((r) => setTimeout(() => r({ ok: false, dead: true }), PAIR_SETTLE_MS + 1000)),
    ]).catch((e) => ({ ok: false, why: String(e?.message ?? e).split('\n')[0] }));
    // A page that rendered no frame within the bound is DEAD (#2231 review): any later evaluate on it waits
    // with no timeout. Close its context, bounded, and end the arm. Its own ctx.close() below then returns at once.
    if (settled.dead) {
      ok(false, `#2167 askPair: the page rendered no frame within ${PAIR_SETTLE_MS}ms, so it is treated as dead — its context is closed and the rest of this arm is skipped`);
      await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
      return false;
    }
    if (!settled.ok) { ok(false, `#2167 askPair: Pair icons did not settle before its click — ${settled.why}`); return false; }
    try { await hooks.click(pairBtn(), { timeout: Math.max(1000, deadline - Date.now()) }); }
    catch (e) {
      // A renderer that froze after the settle: name it dead at this first failure, as above.
      const alive = await Promise.race([page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(true)))).catch(() => false), new Promise((r) => setTimeout(() => r(false), 3000))]);
      if (!alive) {
        ok(false, `#2167 askPair: the page rendered no frame after the click failed, so it is treated as dead — its context is closed and the rest of this arm is skipped`);
        await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
        return false;
      }
      ok(false, `#2167 askPair: the click on Pair icons did not land — ${String(e?.message ?? e).split('\n')[0]}`);
      return false;
    }
    await page.waitForFunction(() => !!document.querySelector('[data-p3="icons-pair-confirm"]'), null, { timeout: 5000 }).catch(() => {});
    return true;
  };
  // #2167: a stalled askPair ends THIS arm here, by name (it has already failed), rather than letting the next
  // step assume a dialog that never opened. Measured: `unpair()` then waited for an Unpair button that only a
  // completed pairing draws, and threw, so the suite never reached report(). The arm's error check and
  // ctx.close() below still run.
  askPairArm: {
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
  if (!await askPair()) break askPairArm;
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
  if (!await askPair()) break askPairArm;
  const d3 = await dialog();
  const WANT1 = { n: 1, title: 'Pair icons with text?', body: ['This removes 1 custom icon color. Icons will follow their text color again.'], go: 'Pair icons', cancel: 'Cancel', unpaired: true };
  ok(JSON.stringify(d3) === JSON.stringify(WANT1), `Q60: re-pairing with 1 icon override asks first, the body singular, icons still unpaired — read ${JSON.stringify(d3)}`);
  if (d3.n === 1) await hooks.click(page.locator('[data-p3="icons-pair-confirm-go"]'));
  await paired();
  const a1 = JSON.parse(await stored() ?? 'null')?.input;
  ok(a1?.iconContrast === 'text' && JSON.stringify(a1?.overrides) === JSON.stringify({ light: { 'text.brand': { palette: 'primary', step: '300' } } }),
    `Q60: Pair icons with 1 icon override writes iconContrast "text" and clears icon.brand, keeping text.brand (iconContrast ${JSON.stringify(a1?.iconContrast)}, overrides ${JSON.stringify(a1?.overrides)})`);
  }
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
      // HP5 (#2218): the switch moved from the lever's head to its section's title row, at the far end.
      const head = blk?.closest('.p3-lsec')?.querySelector('.p3-lsec-titlerow');
      const sw = head?.querySelector('[data-p3="gradients-switch"]');
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
        inHead: !!sw && sw.closest('.p3-lsec-titlerow') === head, right: hb && sb ? Math.round(hb.right - sb.right) : null, top: hb && sb ? Math.round(sb.top - hb.top) : null,
        painted, n: eds.length, sides,
        addLine: addRow ? getComputedStyle(addRow).borderTopStyle : null,
        addAbove: addRow && add ? Math.round(box(add).top - box(addRow).top) : null,
        addBelowLast: addRow && last ? Math.round(box(addRow).top - Math.max(...ctl(last).map((x) => box(x).bottom))) : null,
      };
    });
    ok(gr.inHead && gr.right !== null && gr.right <= 1 && gr.top !== null && gr.top <= 12, `${host} QA-B13, HP5: the gradients switch sits at the right of its section's title row — read ${JSON.stringify({ inHead: gr.inHead, right: gr.right, top: gr.top })}`);
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
// #2179 (owner QA, 2026-10-05): the Contrast floor row is drawn in the rows' own layout, its step picker on the right
// beside its name, not under it. Every brand the start screen offers × every mode it previews, at 1280 and at 380, on
// both hosts. THE ORACLE is the other three rows of Default background fills (Primary, Secondary, Tertiary), measured in
// the same render: the floor's picker ends where theirs end (right edges within ALIGN_TOLERANCE), its top sits inside
// its name's line (above the label's bottom edge), and it sits beside its name exactly when theirs do (at 380 as at 1280).
// ACCESSIBLE NAMES are the browser's COMPUTED names (CDP `Accessibility.getPartialAXTree`), never the attribute: each
// picker's contains its visible label as one contiguous piece (WCAG 2.5.3), and the floor's on Auto is exactly the
// owner's option 1 on #2193, its mode word from the literal map below.
{
  const MODE_WORD = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark', wireframe: 'Wireframe' };
  /** The computed accessible name of every Default background fills picker, in row order. */
  const axNames = async (cdp) => {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-p3="levers-pane"] [data-p3="surface-default-rows"] [data-p3="surface-row"] .p3-pick' });
    const out = [];
    for (const nodeId of nodeIds) {
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      out.push(nodes.find((n) => !n.ignored)?.name?.value ?? null);
    }
    return out;
  };
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
  for (const host of ['web', 'figma']) for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 800 }]) {
    for (const brand of brands) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light' });
      const page = await ctx.newPage();
      await hooks.watch(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
      if (host === 'web') await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
      else {
        await page.goto(`${ORIGIN}/plugin?figma=light`, { waitUntil: 'load' });
        await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
      }
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Accessibility.enable');
      await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: brand }));
      await hooks.need(page, '[data-p3="frame"]');
      await goPlace(page, 'color-fills');
      await hooks.need(page, '[data-p3="levers-pane"] [data-p3="surface-default-rows"]');
      const modes = await page.evaluate(() => {
        const r = [...document.querySelectorAll('[data-p3="mode-option"]')].map((n) => n.dataset.mode);
        return r.length ? r : [...document.querySelectorAll('[data-p3="mode-select"] option')].map((o) => o.value);
      });
      ok(modes.length >= 2, `#2179 ${host} ${w} ${brand}: the mode control offers ${modes.length} modes (${modes.join(', ')})`);
      for (const mode of modes) {
        // At 380 the mode control is on the Preview pane, and the rows on the Settings pane.
        if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        await showMode(page, mode);
        if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-settings"]'));
        await page.waitForFunction((m) => document.querySelector('[data-p3="levers-pane"] [data-p3="surfaces-group"]')?.dataset.mode !== undefined, mode, WAIT).catch(() => {});
        const rows = await page.evaluate(FLOOR_ROW_PROBE);
        const where = `#2179 ${host} ${w} ${brand} / ${mode}`;
        const floor = rows.find((r) => r.role === 'surfaces.floorStep');
        const others = rows.filter((r) => ['background.primary', 'background.secondary', 'background.tertiary'].includes(r.role));
        const drawn = floor?.pick && floor.label && floor.name && others.length === 3 && others.every((r) => r.pick && r.label && r.name);
        ok(drawn, `${where}: Default background fills draws Primary, Secondary, Tertiary and Contrast floor, each with its name and its picker — read ${JSON.stringify(rows.map((r) => [r.role, { name: !!r.name, label: !!r.label, pick: !!r.pick }]))}`);
        if (!drawn) continue;
        measured++;
        const besideOf = (r) => r.pick.left >= r.name.right - ALIGN_TOLERANCE && r.pick.top < r.label.bottom;
        const offRight = others.filter((r) => Math.abs(r.pick.right - floor.pick.right) > ALIGN_TOLERANCE);
        ok(offRight.length === 0, `${where}: the Contrast floor's picker ends at the other rows' picker edge (right ${floor.pick.right.toFixed(1)}; ${others.map((r) => `${r.role} ${r.pick.right.toFixed(1)}`).join(', ')})`);
        ok(floor.pick.top < floor.label.bottom, `${where}: the Contrast floor's picker starts on its name's line, not under it (picker top ${floor.pick.top.toFixed(1)}, label bottom ${floor.label.bottom.toFixed(1)})`);
        const theirs = [...new Set(others.map(besideOf))];
        ok(theirs.length === 1 && besideOf(floor) === theirs[0], `${where}: the Contrast floor's picker sits beside its name exactly as the other rows' do (floor ${besideOf(floor) ? 'beside' : 'under'}; others ${theirs.map((b) => (b ? 'beside' : 'under')).join(', ')})`);
        // FL1 A (owner, #2197): on Auto the button shows "Auto · ‹palette› ‹step›", the step as the picker names steps;
        // its tooltip is the full sentence ("Auto · follows background.secondary (‹step›)") when it follows the tier, and
        // the label itself when it does not. For prism3 the step is the committed emission's floor (`EMITTED_FLOOR`).
        const names = await axNames(cdp);
        rows.forEach((r, i) => { r.ax = names[i] ?? null; });
        const auto = /^Auto\b/.test(floor.text ?? '');
        if (auto) {
          const step = (/^Auto · ([a-z0-9-]+ [0-9]+)$/.exec(floor.text ?? '') ?? [])[1] ?? null;
          const want = brand === 'prism3' && EMITTED_FLOOR[mode]?.step ? `Auto · ${EMITTED_FLOOR[mode].step.split('.').join(' ')}` : null;
          ok(step !== null && (want === null || floor.text === want), `${where}: FL1 A: the Contrast floor's Auto label reads "Auto · ‹step›"${want ? ` (${JSON.stringify(want)}, the emission's floor)` : ''} — read ${JSON.stringify(floor.text)}`);
          const follows = floor.title === `Auto · follows background.secondary (${step})`;
          ok(step !== null && (follows || floor.title === floor.text),
            `${where}: FL1 A: the Contrast floor's tooltip is the full sentence for the same step, or the label where it follows no tier — read ${JSON.stringify(floor.title)}`);
          // Owner, option 1 on #2193: "Contrast floor, ‹mode›: Auto · ‹step›, follows ‹role›. Pick a step"; with no tier
          // followed, the rows' usual "‹row›, ‹mode›: ‹label›. Pick a step".
          const wantName = `Contrast floor, ${MODE_WORD[mode] ?? mode}: ${floor.text}${follows ? ', follows background.secondary' : ''}. Pick a step`;
          ok(floor.ax === wantName, `${where}: option 1: the Contrast floor's computed accessible name is ${JSON.stringify(wantName)} — read ${JSON.stringify(floor.ax)}`);
        }
        // WCAG 2.5.3 (label in name): each picker's computed accessible name contains its visible label as one piece.
        const noLabel = rows.filter((r) => r.pick && !(r.text && (r.ax ?? '').includes(r.text)));
        ok(noLabel.length === 0 && names.length === rows.length, `${where}: WCAG 2.5.3: each picker's computed accessible name contains its visible label${noLabel.length ? ` — not: ${noLabel.map((r) => `${r.role} shows ${JSON.stringify(r.text)}, named ${JSON.stringify(r.ax)}`).join('; ')}` : ''} (${names.length} names for ${rows.length} rows)`);
        ok(!!floor.scroll && floor.scroll[0] <= floor.scroll[1], `${where}: FL1 A: the Contrast floor's label fits its button on one line, not cut off (scrollWidth ${floor.scroll?.[0]}, clientWidth ${floor.scroll?.[1]})`);
      }
      ok(errors.length === 0, `#2179 ${host} ${w} ${brand}: 0 uncaught errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      await ctx.close();
    }
  }
  ok(measured >= brands.length * 2 * 2 * 2, `#2179: the floor row was measured in ${measured} host × brand × mode × width states (floor ${brands.length * 2 * 2 * 2})`);
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
/** The preview's Faces copy. DRAFT, typed here. The levers drew it too (Q23) until TY1 A and HP2 (#2190, 2026-10-06) split
 *  their section into the two below, each titled by its lever's own name; both reveal the preview's Font families. */
const FACES_COPY = ['Font families', 'The font families in the brand, and the family each text type uses.'];
const TY1_TITLES = ['Typeface library', 'Font family for each text type'];
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
      const lsecs = [...pane.querySelectorAll('[data-p3="lever-section"]')].slice(0, 2);
      const prev = [...document.querySelectorAll('[data-p3="type-style-guide"] .psec')].find((x) => x.querySelector('.psec-t')?.textContent === 'Font families');
      return {
        blocks: ['lever-typography-typeface-library', 'lever-typography-families'].map((hk) => pane.querySelectorAll(`[data-p3="${hk}"]`).length),
        fams, lib, tabs: pane.querySelectorAll('.pvseg').length + document.querySelectorAll('[data-p3="legacy-page"] .pvseg').length,
        lent: pane.querySelectorAll('.p3-legacy-card').length,
        leverCopy: lsecs.map((x) => x.querySelector('.p3-lsec-title')?.textContent ?? null),
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
    ok(JSON.stringify(r.leverCopy) === JSON.stringify(TY1_TITLES) && JSON.stringify(r.previewCopy) === JSON.stringify(FACES_COPY),
      `TY1 A: ${host}: the levers open on ${TY1_TITLES.join(' and ')}, and the preview's Font families keeps its heading and description — levers ${JSON.stringify(r.leverCopy)}, preview ${JSON.stringify(r.previewCopy)}`);
    ok(r.source === 'On this device', `${host}: before the host sends a font list, the library's availability reads "On this device" (${r.source})`);
    // The owner (2026-10-03, #2036): "Font families should not be advanced, that's a major brand lever." Apply to all
    // and the remove button are drawn without any fold: neither of the two sections TY1 A made holds a Show advanced, and
    // Apply to all sits in the family section, in no fold's body.
    const fam = await page.evaluate(() => {
      const secs = ['#p3-lsec-type-0', '#p3-lsec-type-1'].map((id) => document.querySelector(id));
      const all = document.querySelector('[data-p3="family-all-apply"]');
      return { titles: secs.map((x) => x?.querySelector('.p3-lsec-title')?.textContent ?? null), folds: secs.reduce((a, x) => a + (x ? x.querySelectorAll('.p3-advrow, [aria-controls^="p3-advb"]').length : 99), 0),
        all: !!all && !!secs[1]?.contains(all), inFold: !!all?.closest('.p3-advbody') };
    });
    ok(JSON.stringify(fam.titles) === JSON.stringify(TY1_TITLES) && fam.folds === 0 && fam.all && !fam.inFold,
      `owner (2026-10-03): ${host}: the font family sections sit outside Show advanced: Apply to all is drawn in the second, in no fold (${JSON.stringify(fam)})`);
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
    const auto = await page.evaluate(() => { const s = document.querySelector('[data-p3="family-select"][data-group="body"]'); return { value: s?.value, text: s?.selectedOptions[0]?.textContent, line: document.querySelector('[data-p3="lever-typography-families"]')?.closest('.p3-lsec')?.querySelector(':scope > .p3-lsec-head > .p3-sub')?.textContent }; });
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
/** Q23: each lever section, in order, and the preview section it pairs with (Scale limits with Scale, scope §3; TY1 A's two
 *  font family sections with Font families). */
const TYPE_PAIRS = [['Typeface library', 'Font families'], ['Font family for each text type', 'Font families'], ['Scale', 'Scale'], ['Scale limits', 'Scale'], ['Weights and styles', 'Weights and styles'],
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
    // #2054: on the 16px smallest title with title 2xs set individually, brand-wide or in Dark only, the 18px chip
    // is disabled with its reason, and clicking it writes nothing. #2055: with a mobile size set individually, the
    // fluid switch is disabled with its reason, naming every such size, and clicking it writes nothing. EXPECTED
    // typed here: the reasons' words, never read from the page's module (docs/34). Both reasons are DRAFTS
    // pending the owner's approval; a change to either is a change to this arm.
    // On Default, title 2xs sits at the 16px title floor with xs at 18px, so its picker offers no other value; on
    // Expressive xs is 20px, so 18px is free. A mobile size on title 2xs is the same squeeze (at most its desktop
    // 16px, at least the floor 16px), so the unit arm covers mobile and this one covers brand-wide and Dark.
    {
      const R18 = 'Leaves out title 2xs, which you set individually.';
      const chip18 = () => page.evaluate(() => { const b = document.querySelector('[data-p3="title-floor-18"]'); return { off: b?.disabled, why: b?.title }; });
      const firstFree = () => page.evaluate(() => document.querySelector('[data-p3="value-picker"] [data-p3="value-picker-value"]:not([aria-disabled="true"]):not([aria-pressed="true"])')?.getAttribute('data-value') ?? null);
      const pFloor = await persisted(page);
      await hooks.click(page.locator('[data-p3="type-scale-expressive"]'));
      await page.waitForFunction(() => document.querySelector('[data-p3="type-scale-expressive"]')?.getAttribute('aria-checked') === 'true');
      await hooks.click(page.locator('[data-p3="title-floor-16"]'));
      await page.waitForFunction(() => document.querySelector('[data-p3="title-floor-16"]')?.getAttribute('aria-checked') === 'true');
      ok(JSON.stringify(await chip18()) === JSON.stringify({ off: false, why: '' }), `#2054: on 16px with no title 2xs set, the 18px chip is live (${JSON.stringify(await chip18())})`);
      const btn = '[data-p3="type-size-desktop"][data-group="title"][data-variant="2xs"]';
      for (const mode of ['light', 'dark']) {
        await chooseMode(page, mode);
        await hooks.click(page.locator(btn));
        await hooks.need(page, '[data-p3="value-picker"]');
        const to = await firstFree();
        ok(to !== null, `#2054: title 2xs's size offers another value in ${mode} (${to})`);
        await pick(btn, to);
        await close();
        await page.waitForFunction(() => document.querySelector('[data-p3="title-floor-18"]')?.disabled === true, null, { timeout: 5000 }).catch(() => {});
        const got = await chip18();
        ok(got.off === true && got.why === R18, `#2054: with title 2xs set in ${mode} (${to}px), the 18px smallest title is disabled with "${R18}" (${JSON.stringify(got)})`);
        const before = JSON.stringify(await persisted(page));
        // force: Playwright holds a disabled button not actionable; the point is that a click on it writes nothing.
        await hooks.click(page.locator('[data-p3="title-floor-18"]'), { force: true });
        await page.waitForTimeout(80);
        ok(JSON.stringify(await persisted(page)) === before && (await page.locator('[data-p3="title-floor-16"]').getAttribute('aria-checked')) === 'true',
          `#2054: clicking the disabled 18px chip writes nothing (${mode})`);
        await reset(btn);
        await close();
        await page.waitForFunction(() => document.querySelector('[data-p3="title-floor-18"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
        ok((await chip18()).off === false, `#2054: releasing title 2xs's size in ${mode} makes the 18px chip live again`);
      }
      await chooseMode(page, 'light');
      await hooks.click(page.locator('[data-p3="title-floor-18"]'));
      await page.waitForFunction(() => document.querySelector('[data-p3="title-floor-18"]')?.getAttribute('aria-checked') === 'true');
      await hooks.click(page.locator('[data-p3="type-scale-default"]'));
      await page.waitForFunction(() => document.querySelector('[data-p3="type-scale-default"]')?.getAttribute('aria-checked') === 'true');
      ok(JSON.stringify(await persisted(page)) === JSON.stringify(pFloor), `#2054: back on 18px and the Default scale, the brand returns to its bytes`);

      const sw = () => page.evaluate(() => { const b = document.querySelector('[data-p3="type-fluid"]'); return { on: b?.getAttribute('aria-checked'), off: b?.disabled, why: b?.title }; });
      ok(JSON.stringify(await sw()) === JSON.stringify({ on: 'true', off: false, why: '' }), `#2055: with no mobile size set, the fluid switch is on and live (${JSON.stringify(await sw())})`);
      const pFluid = await persisted(page);
      const md = '[data-p3="type-size-mobile"][data-group="display"][data-variant="md"]';
      const sm = '[data-p3="type-size-mobile"][data-group="title"][data-variant="sm"]';
      const steps = [
        [md, 'Removes the mobile size of display md, which you set individually.', 'display md'],
        [sm, 'Removes the mobile sizes of display md and title sm, which you set individually.', 'display md and title sm'],
      ];
      for (const [btn, why, what] of steps) {
        await hooks.click(page.locator(btn));
        await hooks.need(page, '[data-p3="value-picker"]');
        const to = await firstFree();
        await pick(btn, to);
        await close();
        await page.waitForFunction((w) => document.querySelector('[data-p3="type-fluid"]')?.title === w, why, { timeout: 5000 }).catch(() => {});
        const got = await sw();
        ok(JSON.stringify(got) === JSON.stringify({ on: 'true', off: true, why }), `#2055: with ${what} set on mobile, the fluid switch is disabled with "${why}" (${JSON.stringify(got)})`);
        const before = JSON.stringify(await persisted(page));
        // force: Playwright holds a disabled button not actionable; the point is that a click on it writes nothing.
        await hooks.click(page.locator('[data-p3="type-fluid"]'), { force: true });
        await page.waitForTimeout(80);
        ok(JSON.stringify(await persisted(page)) === before && (await sw()).on === 'true', `#2055: clicking the disabled fluid switch writes nothing (${what})`);
      }
      for (const [btn] of steps) { await reset(btn); await close(); }
      await page.waitForFunction(() => document.querySelector('[data-p3="type-fluid"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
      ok(JSON.stringify(await sw()) === JSON.stringify({ on: 'true', off: false, why: '' }), `#2055: releasing both mobile sizes makes the fluid switch live again (${JSON.stringify(await sw())})`);
      ok(JSON.stringify(await persisted(page)) === JSON.stringify(pFluid), '#2055: releasing both mobile sizes returns the brand to its bytes');
    }
    // #2068: a viewport pair the engine refuses is put back rather than written, with the engine's own sentence as
    // the warning under the fields, and the error bar stays quiet. EXPECTED typed here: the owner-approved sentence
    // with the values entered, never read from the page's module (docs/34).
    {
      const vp = (k) => page.locator(k === 'min' ? '[data-p3="type-min-viewport"]' : '[data-p3="type-max-viewport"]');
      const line = () => page.evaluate(() => document.querySelector('[data-p3="type-viewport-refused"]')?.textContent?.trim() ?? null);
      const bar = () => page.evaluate(() => { const e = document.querySelector('[data-p3="error-bar"]'); return !!e && !e.hidden && !!e.textContent?.trim(); });
      ok((await line()) === null, `#2068: on the 375/1280 default, no viewport refusal is shown (${await line()})`);
      const before = JSON.stringify(await persisted(page));
      for (const [k, v, back, why, what] of [
        ['min', '1280', '375', 'The minimum viewport (1280px) must be smaller than the maximum viewport (1280px).', 'min equal to max'],
        ['max', '320', '1280', 'The minimum viewport (375px) must be smaller than the maximum viewport (320px).', 'max below min'],
      ]) {
        await vp(k).fill(v);
        await vp(k).evaluate((e) => e.blur());
        await page.waitForFunction(() => !!document.querySelector('[data-p3="type-viewport-refused"]'), null, { timeout: 5000 }).catch(() => {});
        ok((await line()) === why, `#2068: ${what}, the refusal reads "${why}" (${await line()})`);
        ok((await vp(k).inputValue()) === back, `#2068: ${what}, the field is put back to ${back} (${await vp(k).inputValue()})`);
        ok(JSON.stringify(await persisted(page)) === before && !(await bar()), `#2068: ${what}, nothing is written and the error bar stays quiet`);
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
// #2194 (owner, N3 A, 2026-10-06): the clash message and Release pinned sizes show only when a pinned size is what
// the engine refuses; any other refusal shows its own reason. Both hosts. The shipped Aurora is Expressive with the
// 16px smallest title and nothing pinned, so its Compact chip is refused for the title floor: disabled with the
// title floor's approved reason (Q55 B, its own sentence, not the 16px chip's B8b), that reason shown under the
// chips, and no clash message or Release. Then a real clash (prism3, display md set to 56px, refused under
// Expressive) still shows both. EXPECTED typed here: the
// two sentences' words, never read from the page's module (docs/34).
{
  const CLASH = 'Some sizes you set would clash at this scale. Release them to switch.';
  const FLOOR = "Compact can't be used while the title floor is 16px. Raise the title floor to use it.";
  const scaleState = (page) => page.evaluate(() => {
    const lev = document.querySelector('[data-p3="lever-typography-type-scale"]');
    const chip = (b) => ({ off: !!b?.disabled, why: b?.title ?? '' });
    return {
      compact: chip(document.querySelector('[data-p3="type-scale-compact"]')), default: chip(document.querySelector('[data-p3="type-scale-default"]')),
      expressive: chip(document.querySelector('[data-p3="type-scale-expressive"]')),
      clash: (lev?.textContent ?? '').includes('clash'), release: !!document.querySelector('[data-p3="type-scale-release"]'),
      refused: [...(lev?.querySelectorAll('[data-p3="type-scale-refused"]') ?? [])].map((n) => n.textContent),
      pinned: !!document.querySelector('[data-p3="type-sizes-count"]'),
    };
  });
  for (const host of ['web', 'figma']) {
    {
      const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900, brand: 'aurora' });
      try {
        await goPlace(page, 'type');
        await hooks.need(page, '[data-p3="type-scale-compact"]');
        const s = await scaleState(page);
        ok(!s.pinned && !s.expressive.off && !s.default.off, `#2194: ${host}: Aurora loads with nothing pinned, Default and Expressive live (${JSON.stringify(s)})`);
        ok(s.compact.off && s.compact.why === FLOOR, `#2194: ${host}: Aurora's Compact chip is disabled with the title floor's reason "${FLOOR}" (${JSON.stringify(s.compact)})`);
        ok(JSON.stringify(s.refused) === JSON.stringify([FLOOR]), `#2194: ${host}: Aurora at Compact shows the real reason under the chips, once (${JSON.stringify(s.refused)})`);
        ok(!s.clash && !s.release, `#2194: ${host}: Aurora at Compact, nothing pinned, shows no clash message and no Release pinned sizes (clash ${s.clash}, release ${s.release})`);
        ok(errors.length === 0, `#2194: ${host}: Aurora's Type scale: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `#2194 Aurora ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
    {
      const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
      try {
        await goPlace(page, 'type');
        await openTypeAdvanced(page);
        const btn = '[data-p3="type-size-desktop"][data-group="display"][data-variant="md"]';
        await hooks.click(page.locator(btn));
        await hooks.click(page.locator('[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="56"]'));
        if (await page.locator('[data-p3="value-picker-close"]').count()) await hooks.click(page.locator('[data-p3="value-picker-close"]'));
        await page.waitForFunction(() => !!document.querySelector('[data-p3="type-scale-release"]'), null, { timeout: 5000 }).catch(() => {});
        const s = await scaleState(page);
        ok(s.pinned && s.expressive.off && s.expressive.why === CLASH, `#2194: ${host}: with display md set to 56px, Expressive is disabled with "${CLASH}" (${JSON.stringify(s.expressive)})`);
        ok(s.clash && s.release && s.refused.length === 0, `#2194: ${host}: a real pinned-size clash still shows the clash message and Release pinned sizes, and no other reason (${JSON.stringify(s)})`);
        ok(!s.compact.off, `#2194: ${host}: the same pin builds under Compact, so its chip stays live`);
        await hooks.click(page.locator('[data-p3="type-scale-release"]'));
        await page.waitForFunction(() => !document.querySelector('[data-p3="type-scale-release"]'), null, { timeout: 5000 }).catch(() => {});
        const r = await scaleState(page);
        ok(!r.pinned && !r.expressive.off && !r.release && !r.clash, `#2194: ${host}: Release pinned sizes clears the clash and Expressive is live again (${JSON.stringify(r)})`);
        ok(errors.length === 0, `#2194: ${host}: the pinned clash: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `#2194 pinned clash ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}
// typography.responsive has one home (owner decision Q71): Type › Scale limits draws it, and Layout, whose legacy page
// drew "Responsive type sizing" and its fluid read-out (#361), no longer does. Both hosts. Since S10 Layout is a moved
// page, so this reads its two panes, the levers and the preview, where the legacy page was.
for (const host of ['web', 'figma']) {
  const { ctx, page } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await openTypeAdvanced(page);
    const onType = await page.evaluate(() => document.querySelectorAll('[data-p3="levers-pane"] [data-p3="lever-typography-responsive"]').length);
    await goPlace(page, 'layout');
    await hooks.need(page, '[data-p3="layout-levers"]');
    await hooks.need(page, '[data-p3="layout-style-guide"]');
    const onLayout = await page.evaluate(() => {
      const out = [];
      for (const [name, lp] of [['levers', document.querySelector('[data-p3="levers-pane"]')], ['preview', document.querySelector('[data-p3="preview-body"]')]]) {
        for (const t of lp.querySelectorAll('[data-p3="section-title"], .p3-lsec-title, .cs-title, h2, h3')) if (/responsive type|fluid|scale between/i.test(t.textContent)) out.push(`${name} title "${t.textContent.trim()}"`);
        if (lp.querySelector('[data-p3="lever-typography-responsive"]')) out.push(`the ${name}' typography.responsive lever`);
        if (lp.querySelector('[data-sg-section="type-fluid"], [data-sg-section="type-scale"]')) out.push(`the ${name}' fluid read-out`);
        if (/Fluid heading sizing|Headings scale between|Min viewport|Max viewport/.test(lp.textContent)) out.push(`the ${name}' fluid switch or viewport fields`);
      }
      return out;
    });
    ok(onType === 1 && onLayout.length === 0, `typography.responsive is drawn on Type only${onType !== 1 ? ` — drawn ${onType} time(s) on Type` : ''}${onLayout.length ? ` — also on Layout (${onLayout.join(', ')})` : ''} (${host})`);
  } catch (e) {
    ok(false, `S6.3 responsive home ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 20c. #1993: the Type preview's availability marks (● ○), in the Weights table and its key, are drawn by the
//      embedded UI face. The section sits in the legacy card, whose text stack is the device's, so without
//      `chrome.css`'s rule the marks fall to a device font; and `[glyphs]` (the build) only proves the face HAS them.
//
//      Independence (docs/34): which face drew each mark is read by CDP (`CSS.getPlatformFontsForNode`), never
//      from computed `font-family`; the face name is this file's `UI_FONT` literal. Represented, not counted: the
//      prism3 example must draw at least one ● and one ○ in the table and both in the key, or the check fails
//      rather than passing on nothing.
//
//      Mutations this fails by name: drop the `.tpw-mark` / `.tpw-key` rule from `chrome.css` →
//      `#1993 (web): every availability mark is drawn by Inter, never a device font …`.
// =============================================================================================
console.log(`\n#1993 — the Type preview's availability marks, drawn by the embedded face\n${'='.repeat(78)}`);
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await page.waitForSelector('[data-sg-section="weights-by-face"] .tpw-mark');
    await page.evaluate(() => document.fonts.ready);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId,
      selector: '[data-sg-section="weights-by-face"] .tpw-mark.yes, [data-sg-section="weights-by-face"] .tpw-mark.no, [data-sg-section="weights-by-face"] .tpw-key' });
    const marks = [];
    for (const nodeId of nodeIds) {
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
      marks.push({ el: outerHTML, off: fonts.filter((f) => f.familyName !== UI_FONT || !f.isCustomFont).map((f) => `${f.familyName}${f.isCustomFont ? '' : ' (device)'}`) });
    }
    await cdp.detach();
    const has = (cls, glyph) => marks.some((m) => m.el.includes(`class="${cls}"`) && m.el.includes(`>${glyph}<`));
    ok(has('tpw-mark yes', '●') && has('tpw-mark no', '○') && has('tpw-key', '●') && has('tpw-key', '○'),
      `#1993 (${host}): the Weights table draws a ● and a ○, and its key both (found ${marks.length} marks)`);
    const off = marks.filter((m) => m.off.length);
    ok(marks.length > 0 && off.length === 0,
      `#1993 (${host}): every availability mark is drawn by ${UI_FONT}, never a device font${off.length ? ` — ${off.slice(0, 3).map((m) => `${m.el.slice(0, 50)} drew ${m.off.join(', ')}`).join('; ')}` : ''}`);
    ok(errors.length === 0, `#1993 (${host}): no page errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
}

// =============================================================================================
// 20d. #2103: the plugin's font status, on the brand's page, in the brand's own status text roles. The figma host's
//      labels are the host-list arm of `faceStatus` ("✓ N styles", "✓ Figma has it", "⚠ Figma lacks it"), which
//      `test:smoke` never draws: the web has no host list. Each is painted in the brand's `text.success` (✓) or
//      `text.warning` (⚠) for the mode on screen, on the brand's page color, which the studio does not own.
//
//      For every brand × mode the plugin offers, on the Type place: each label clears 4.5:1 on the ground it is drawn
//      on, and is drawn in the emission's hex for its role. EXPECTED is the committed emission
//      (`packages/engine/out/<brand>.tokens.json`), resolved here in Node, never the studio's resolver or CSS. The
//      labels, their classes and roles are literals here, not read from `ui/fonts.ts` or `faces.ts`.
//
//      BOTH ARMS ARE EXERCISED, NOT ASSUMED (docs/34: represented, not counted). The host's font list is fed in this
//      test only, by the `font-list` message the plugin's main thread sends, posted twice per state: Inter with 36
//      styles ("✓ 36 styles"), then Inter with no count ("✓ Figma has it"). Every corpus brand also sets a face the
//      list leaves out (JetBrains Mono), so "⚠ Figma lacks it" is drawn in both. A label drawn zero times in any
//      brand × mode fails as NOT EXERCISED. No shipped code changes.
//
//      Mutation (#2103): the label painted in the old fixed colors (`stat.style.color = st.ok ? 'var(--ok)' :
//      'var(--ink)'` in `faces.ts`, both bundles rebuilt) fails this section by name.
// =============================================================================================
console.log(`\n#2103 — the plugin's font status, in the brand's status text roles on its page\n${'='.repeat(78)}`);
/** The figma host's three labels, literal. `lists` names which of the two posted font lists draw it. */
const FIGMA_FONT_STATUS = [
  { cls: 'tf-stat ok', text: '✓ 36 styles', role: 'text.success', lists: ['styles'] },
  { cls: 'tf-stat ok', text: '✓ Figma has it', role: 'text.success', lists: ['bare'] },
  { cls: 'tf-stat no', text: '⚠ Figma lacks it', role: 'text.warning', lists: ['styles', 'bare'] },
];
const FIGMA_FONT_LISTS = { styles: { families: ['Inter'], styles: [36] }, bare: { families: ['Inter'], styles: [0] } };
/** A brand's role hex in a mode, from its committed emission: the leaf's per-mode value, its aliases followed. */
const emittedRole = (brand) => {
  let tree;
  try { tree = JSON.parse(readFileSync(join(REPO, 'packages/engine/out', `${brand.toLowerCase()}.tokens.json`), 'utf8')); } catch { return null; }
  const rootKey = Object.keys(tree).find((k) => !k.startsWith('$'));
  const at = (path) => path.split('.').reduce((n, s) => n?.[s], tree[rootKey]);
  const modes = at('color.interactive.primary.on-fill')?.$extensions?.prism3?.figma?.modes ?? [];
  const inMode = (leaf, mode) => (mode !== modes[0] && leaf.$extensions?.prism3?.modes?.[mode]) || { $value: leaf.$value };
  return (key, mode) => {
    const leaf = at(`color.${key}`);
    if (!leaf || !modes.includes(mode)) return null;
    let v = inMode(leaf, mode).$value;
    for (let hops = 0; typeof v === 'string' && v.startsWith('{') && hops < 8; hops++) {
      const target = at(v.slice(1, -1).replace(`${rootKey}.`, ''));
      if (!target) return null;
      v = inMode(target, mode).$value;
    }
    return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
  };
};
/** Every font status label in the Type preview: its text, class, drawn color and the ratio on its composited ground. */
const FONT_STATUS_PROBE = () => {
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const groundOf = (el) => { let acc = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ? over(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 }; };
  const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  return [...document.querySelectorAll('[data-p3="preview-body"] span.tf-stat')].map((n) => {
    const cs = getComputedStyle(n);
    const g = groundOf(n);
    const fg = parse(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 };
    return { text: n.textContent, cls: n.className, color: hex(fg), ground: hex(g), ratio: Math.floor(ratio(over(fg, g), g) * 100) / 100,
      visible: n.getClientRects().length > 0 && cs.visibility !== 'hidden' };
  });
};
const figmaStatusSeen = new Map();   // `${brand} / ${mode} / ${text}` -> { drawn, worst }
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await hooks.watch(page);
  await page.goto(`${ORIGIN}/plugin?figma=light`, { waitUntil: 'load' });
  await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
  await hooks.need(page, '[data-p3="start-example"]');
  const brands = (await page.locator('[data-p3="start-example"]').allTextContents()).map((n) => n.trim());
  await ctx.close();
  ok(brands.length >= 2, `#2103 (figma): the plugin's start screen offers the corpus brands (found ${brands.length}: ${brands.join(', ')})`);
  for (const brand of brands) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    await hooks.watch(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
    try {
      await page.goto(`${ORIGIN}/plugin?figma=light`, { waitUntil: 'load' });
      await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
      await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: brand }));
      await hooks.need(page, '[data-p3="frame"]');
      await goPlace(page, 'type');
      const role = emittedRole(brand);
      ok(role !== null, `#2103 (figma) ${brand}: its committed emission (packages/engine/out/${brand.toLowerCase()}.tokens.json) loads — the oracle the labels are checked against`);
      const modes = await page.locator('[data-p3="mode-option"]').evaluateAll((ns) => ns.map((n) => n.dataset.mode));
      ok(modes.length >= 2, `#2103 (figma) ${brand}: the mode control offers ${modes.length} modes (${modes.join(', ')})`);
      for (const mode of modes) {
        await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
        await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true', mode);
        const drawn = [];
        for (const [list, msg] of Object.entries(FIGMA_FONT_LISTS)) {
          await page.evaluate((m) => window.postMessage({ pluginMessage: { type: 'font-list', ...m } }, '*'), msg);
          const allowed = FIGMA_FONT_STATUS.filter((l) => l.lists.includes(list)).map((l) => l.text);
          await page.waitForFunction((a) => { const s = [...document.querySelectorAll('[data-p3="preview-body"] span.tf-stat')]; return s.length > 0 && s.every((n) => a.includes(n.textContent)); }, allowed, WAIT).catch(() => {});
          drawn.push(...(await page.evaluate(FONT_STATUS_PROBE)).filter((d) => d.visible));
        }
        const where = `#2103 (figma) ${brand} / type / ${mode}`;
        for (const lab of FIGMA_FONT_STATUS) {
          const mine = drawn.filter((d) => d.text === lab.text && d.cls === lab.cls);
          figmaStatusSeen.set(`${brand} / ${mode} / ${lab.text}`, { drawn: mine.length, worst: mine.length ? Math.min(...mine.map((d) => d.ratio)) : null });
          const under = mine.filter((d) => d.ratio < 4.5);
          ok(under.length === 0, `${where}: the font status "${lab.text}" clears 4.5:1 on the brand's page color in all ${mine.length} place(s) drawn${
            under.length ? ` — ${[...new Set(under.map((u) => `${u.ratio}:1 (${u.color} on ${u.ground})`))].slice(0, 3).join(' | ')}` : ''}`);
          const want = role?.(lab.role, mode) ?? null;
          const off = mine.filter((d) => d.color !== want);
          ok(want !== null && off.length === 0, `${where}: the font status "${lab.text}" is drawn in the brand's ${lab.role} ${want} in all ${mine.length} place(s)${
            off.length ? ` — drawn ${[...new Set(off.map((d) => d.color))].join(', ')}` : ''}`);
        }
      }
      ok(errors.length === 0, `#2103 (figma) ${brand}: no page errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `#2103 (figma) ${brand}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
  for (const lab of FIGMA_FONT_STATUS) {
    const cells = [...figmaStatusSeen.keys()].filter((k) => k.endsWith(` / ${lab.text}`));
    const unseen = cells.filter((c) => figmaStatusSeen.get(c).drawn === 0).map((c) => c.slice(0, -(lab.text.length + 3)));
    const worst = Math.min(...cells.map((c) => figmaStatusSeen.get(c)).filter((v) => v.drawn).map((v) => v.worst));
    ok(cells.length >= brands.length * 2 && unseen.length === 0,
      `#2103 (figma): the font status "${lab.text}" was drawn, and so measured, on the Type page in every brand × mode (${cells.length - unseen.length} of ${cells.length}, lowest ${Number.isFinite(worst) ? `${worst}:1` : 'none'})${
        unseen.length ? ` — NOT EXERCISED in ${unseen.slice(0, 4).join(', ')}${unseen.length > 4 ? ', …' : ''}: the label was never drawn there, so its check measured nothing` : ''}`);
    console.log(`  font status "${lab.text}" (figma, #2103): drawn in ${cells.length - unseen.length} of ${cells.length} brand × mode states, lowest ${Number.isFinite(worst) ? `${worst}:1` : 'none'}`);
  }
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
//     literals; every position is read from the rendered layout. A glide is read from the glide log (#2042,
//     above section 15), on frame time: its duration and curve against those literals, never a wall-clock
//     measurement, so a busy machine reads the same glide as an idle one.
//
//     Mutations this fails by name: drop the reveal on Surfaces & fills → `QA-B9: editing a Border step on
//     Surfaces & fills brings the preview's Border section into view …`; the duration token at 0 →
//     `QA-B9: both panes scroll on the chrome's default transition …` and `QA-B9: the glide lasts the default
//     transition's 200ms …`; ignore reduced motion →
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
  const MOTION_MS = 200;
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
    /** Every animation frame's scrollTop of a pane, until it has held still for ten frames (how a check waits
     *  for a scroll to finish), with the glide log of each pane taken since the last call (what it checks). */
    const frames = async (which) => {
      const tops = await page.evaluate((w) => new Promise((res) => {
        const b = document.querySelector(w === 'levers' ? '[data-p3="levers-pane"]' : '[data-p3="preview-body"]');
        const t = [Math.round(b.scrollTop)];
        let still = 0;
        const tick = () => {
          const y = Math.round(b.scrollTop);
          still = y === t[t.length - 1] ? still + 1 : 0;
          t.push(y);
          if (still >= 10 || t.length > 400) res(t); else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), which);
      const g = glideOf(await takeGlideLog(page), which === 'levers' ? 'levers-pane' : 'preview-body', MOTION_MS, MOTION.ease);
      return { tops, g };
    };
    const between = (tops) => new Set(tops.filter((t) => t !== tops[0] && t !== tops[tops.length - 1])).size;
    const lands = (s) => s.inView && (Math.abs(s.rel - s.pad) <= 2 || s.top >= s.max - 1);

    await installGlideLog(page);
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
    await takeGlideLog(page);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][aria-pressed="false"]').first());
    const fa = await frames('preview');
    const a1 = await sec(PAIRS_FILLS.Border);
    ok(lands(a1), `QA-B9: editing a Border step on Surfaces & fills brings the preview's Border section into view, its top ${a1.pad}px under the body's (top at ${a1.rel}px, scrollTop ${a1.top}, in view ${a1.inView})`);
    ok(fa.g.between >= 2, `QA-B9: without reduced motion the Surfaces & fills reveal glides through positions on its way (${fa.g.between} in-between over ${fa.g.steps} steps, ${fa.g.from} → ${fa.g.to})`);
    // #2042: the duration on frame time, not the wall clock. The glide's last step is the first frame at or
    // past the declared duration after its first, and every step lies on the declared curve.
    ok(fa.g.inFrames && fa.g.before !== null && fa.g.before < MOTION_MS && fa.g.span >= MOTION_MS && fa.g.offCurve.length === 0,
      `QA-B9: the glide lasts the default transition's ${MOTION.dur}, on ${MOTION.ease}: its last step is the first frame at or past ${MOTION.dur} after its first (${fa.g.steps} steps, in frames ${fa.g.inFrames}; last at ${fa.g.span}ms, the one before at ${fa.g.before}ms; off the curve ${JSON.stringify(fa.g.offCurve.slice(0, 3))})`);
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

    // (c) Under reduced motion it lands at once: in place when the edit returns, in one step taken in the edit
    // itself, and no frame between.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setTop('preview-body', 0);
    await takeGlideLog(page);
    await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="step-picker-step"][aria-pressed="false"]').first());
    const c1 = await sec(PAIRS_FILLS.Border);
    const fc = await frames('preview');
    ok(lands(c1) && atOnce(fc.g) && between(fc.tops) === 0 && fc.tops.every((t) => t === c1.top),
      `QA-B9: under reduced motion the reveal lands at once, with no frame between (at ${c1.rel}px, ${fc.g.steps} step(s), in frames ${fc.g.inFrames}, frames ${JSON.stringify([...new Set(fc.tops)])})`);
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
      await takeGlideLog(page);
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
    ok(ja.f.g.between >= 2, `QA-B17: without reduced motion a jump link glides through positions on its way (${ja.f.g.between} in-between over ${ja.f.g.steps} steps)`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const jb = await jumpTo(4);
    ok(Math.abs(jb.j.rel) <= 2 && atOnce(jb.f.g) && between(jb.f.tops) === 0, `QA-B17: under reduced motion a jump link lands at once (top at ${jb.j.rel}px, ${jb.f.g.steps} step(s), in frames ${jb.f.g.inFrames}, frames ${JSON.stringify([...new Set(jb.f.tops)])})`);
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
    await takeGlideLog(page);
    await lk.selectOption(opts[0]);
    const fb = await frames('preview');
    const b1 = await sec('Links');
    ok(lands(b1), `QA-B9: editing the link palette on Interactive brings the preview's Links section into view, its top ${b1.pad}px under the body's or the preview at its end (top at ${b1.rel}px, scrollTop ${b1.top} of ${b1.max})`);
    ok(fb.g.between >= 2, `QA-B9: without reduced motion the Interactive reveal glides through positions on its way (${fb.g.between} in-between over ${fb.g.steps} steps)`);
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
      await takeGlideLog(page);
      await hooks.click(page.locator(sel));
      const f = await frames('preview');
      const t1 = await sec(want);
      ok(t0.found && !t0.inView && lands(t1) && t1.view === 'type' && t1.place === 'type',
        `QA-B9: editing ${what} on Type brings the preview's ${want} section into view, on the same page (from below the fold: ${!t0.inView}; top at ${t1.rel}px, scrollTop ${t1.top} of ${t1.max}; ${t1.place} / ${t1.view})`);
      return f;
    };
    const ft = await typeEdit('the type scale', '[data-p3="type-scale-compact"]', 'Scale');
    ok(ft.g.between >= 2, `QA-B9: without reduced motion the Type reveal glides through positions on its way (${ft.g.between} in-between over ${ft.g.steps} steps)`);
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
    : n.closest('[data-p3="lh-row"]') ? 'type-line-height' : n.closest('[data-p3="ls-row"]') ? 'type-letter-spacing' : n.closest('[data-p3="italic-row"]') ? 'type-italic'
    : n.closest('[data-p3="layout-levers"]') ? 'layout-row'
    // S4f (QA-B1): Background fills' controls are rows now, inside the surfaces lever; a name in a `.p3-field` is the
    // shape they had before.
    : n.closest('[data-p3="lever-surfaces"] .p3-fillrow') ? 'background-row' : n.closest('.p3-fillrow') ? 'fill-row' : n.closest('.p3-field') ? 'fill-field' : 'other';
  return { kind, role: n.closest('.p3-fillrow')?.dataset.role ?? null, token: tok?.textContent ?? null, label: lab?.textContent ?? null, below: !!L && !!T && T.top >= L.bottom - 0.5,
    // #2217: a label stacked over its control may carry its token flush right on its own line, after it.
    after: !!L && !!T && T.left >= L.right && T.top < L.bottom,
    labTop: L ? Math.round(L.top) : null, tokTop: T ? Math.round(T.top) : null, tokFont: tok ? getComputedStyle(tok).fontFamily : null };
}));
/** Every select and step-picker button drawn in the levers pane: height, font size, alignment and where its caret is. */
/** The step-picker buttons, by hook (literal, so the hook guard reads them). */
const PICK_SEL = ['fill-pick', 'int-pick', 'surface-base-pick', 'surface-secondary-pick', 'surface-tertiary-pick', 'surface-band-step-pick',
  'surface-inverse-secondary-pick', 'surface-inverse-tertiary-pick', 'surface-floor-pick',
  // S10: Layout's value pickers.
  'layout-columns-pick', 'bp-cols-pick', 'bp-gutter-pick', 'bp-margin-pick'].map((x) => `button[data-p3="${x}"]`).join(', ');
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
    // Brand last: the QA-R1 check below reads its Add custom mode where the loop leaves the page.
    for (const place of ['color-fills', 'color-interactive', 'type', 'layout', 'brand']) {
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
        const b = document.querySelector('[data-p3="levers-pane"] :is([data-p3="fills-continue"], [data-p3="interactive-continue"], [data-p3="type-continue"], [data-p3="brand-continue"], [data-p3="layout-continue"])');
        if (!b) return { place: p, found: false };
        const cs = getComputedStyle(b), lab = b.querySelector('span');
        return { place: p, found: true, bg: cs.backgroundColor, ink: getComputedStyle(lab ?? b).color, edge: cs.borderTopColor, text: b.textContent };
      }, place));
    }
    // QA-B2: each row type is represented, and in each the token sits below its label, in mono.
    // S4f: Surfaces & fills' Background fills controls, which were fields, are rows (QA-B1): that kind is required in their place.
    const kinds = ['fill-row', 'background-row', 'interactive-row', 'type-family', 'type-face', 'type-size', 'type-weight', 'type-line-height', 'type-letter-spacing', 'layout-row'];
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
    // #2217 (heading pass 2): Type's family and italic rows, stacked over their control, carry the token on the label's line,
    // after it (or under it, when the two don't fit); every other row keeps it under its label.
    const ONLINE = new Set(['type-family', 'type-italic']);
    const above = tokened.filter((n) => !(n.below || (ONLINE.has(n.kind) && n.after)));
    ok(names.length >= 20 && above.length === 0,
      `QA-B2: ${where}: in every row type the token sits below its label (or after it on its line, #2217), so the label is read first (${names.length} read)${above.length ? ` — ${JSON.stringify(above.slice(0, 3))}` : ''}`);
    // …and the two are the right way round: the mono line reads as a token path (dotted, no spaces), the label
    // above it does not. A call that hands the label and the token in the wrong order fails here.
    const PATH = /^[a-z0-9*-]+(\.[a-z0-9*-]+)+$/;
    const swapped = tokened.filter((n) => !PATH.test(n.token ?? '') || PATH.test(n.label ?? ''));
    ok(swapped.length === 0, `QA-B2: ${where}: in every row the mono line under the label is a token path and the label is not${swapped.length ? ` — ${JSON.stringify(swapped.slice(0, 3).map((n) => [n.kind, n.label, n.token]))}` : ''}`);
    const notMono = tokened.filter((n) => !/JetBrains Mono|P3 Chrome Mono/.test(n.tokFont ?? ''));
    ok(notMono.length === 0, `QA-B2: ${where}: every token under a label is set in the chrome's mono${notMono.length ? ` — ${JSON.stringify(notMono.slice(0, 2))}` : ''}`);
    // QA-B5, QA-B18: selects and step-picker buttons, each page represented.
    const placesWith = (k) => [...new Set(ctls.filter((c) => c.kind === k).map((c) => c.place))];
    ok(placesWith('select').length === 4 && JSON.stringify(placesWith('pick')) === '["color-fills","color-interactive","layout"]' && ctls.some((c) => c.hook === 'custom-mode-base'),
      `QA-B5: ${where}: selects are read on the four pages that draw one and picker buttons on Surfaces & fills, Interactive and Layout (selects on ${JSON.stringify(placesWith('select'))}, picks on ${JSON.stringify(placesWith('pick'))})`);
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
    ok(nexts.length === 5 && offNext.length === 0,
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

// =============================================================================================
// 23. Depth & motion (S9.2): the page in the two panes, its preview, the previewed mode, the playback
//
//     Independence (docs/34): the copy, the hooks, the pairs, the curves and the expected writes are literals typed
//     here from the owner's decisions (V4, D7–D10, D15, D16, Q22, Q23, Q59) and the legacy pages' bytes; the grounds
//     come from the committed emission; every write is read back from the PERSISTED brand (`prism3:brandInput`).
//
//     Mutations this fails by name: a Dark softness edit written to Light → `Q22: previewing Dark, a softness edit
//     writes modeLevers.dark.shadow.softness and not the brand value …`; a custom mode's Auto from its base's
//     override → `Q22: previewing custom-1 (based on Dark), Auto names Light's value …`; the traces playing under
//     reduced motion → `D9: under reduced motion, a Motion edit plays nothing …`; a section drawn on the chrome card →
//     `specimen ground: depth … is the chrome card`.
// =============================================================================================
console.log(`\nDepth & motion (S9.2)\n${'='.repeat(78)}`);
/** The preview's two sections (V4), each a specimen root on the brand's page; and each lever section with the preview
 *  section it pairs with (Q23; Shadow tint is drawn inside Elevation, D8 A, so it pairs with Elevation too). */
const EXPECT_DEPTH_SPECIMENS = ['Elevation', 'Motion'];
/** The APPROVED copy (owner, 2026-10-04), literal. */
const DEPTH_COPY = {
  intro: 'Shadow character, then motion tempo. One preview holds both.',
  Elevation: 'How soft the shadows are. Dark modes get lighter shadows automatically.',
  Motion: 'How fast things move, and the curve each kind of motion follows.',
  tint: 'Shifts the shadow color off pure black, toward a hue.',
  note: 'Shadows paint this color at 10–14% opacity, so the hue reads far subtler than on the swatch.',
  hint: 'The six curves are fixed. Each role picks one.',
  durations: 'Each duration at this tempo, and its reduced-motion value.',
  spin: 'A loop, not a step: the same at every tempo.',
  springs: 'Physics presets for platforms that animate with springs. Read-only.',
  blocks: 'Every millisecond value the durations use.',
  reduced: 'Reduced motion is on: playing once on request.',
  next: 'Continue to Layout',
  slow: ['Off', '1/2', '1/4', '1/8'],
};
/** Each lever, by hook, drawn once (represented, not counted); Shadow tint's only behind Elevation's Show advanced. */
const DEPTH_LEVERS = ['lever-shadow-softness', 'lever-motion-personality-tempo', 'lever-motion-personality-easing-roles'];
const EASING_ROLES = ['default', 'enter', 'exit', 'emphasized'];
const CURVES = ['linear', 'standard', 'decelerate', 'accelerate', 'expressive', 'calm'];
const openDepth = async (page) => {
  await goPlace(page, 'depth');
  await hooks.need(page, '[data-p3="depth-levers"]');
  // The preview is drawn at every width; at 380 it sits on the hidden pane, so it is waited for attached.
  await hooks.need(page, '[data-p3="depth-style-guide"] .psec', { state: 'attached' });
};
/** Choose a mode in the preview header: its radio, or, where the modes do not all fit, the select of the same modes. */
const chooseModeAny = async (page, mode) => {
  if (await page.locator('[data-p3="mode-select"]').isVisible()) await page.locator('[data-p3="mode-select"]').selectOption(mode);
  else await hooks.click(page.locator(`[data-p3="mode-option"][data-mode="${mode}"]`));
  await page.waitForFunction((m) => document.querySelector(`[data-p3="mode-option"][data-mode="${m}"]`)?.getAttribute('aria-checked') === 'true'
    || document.querySelector('[data-p3="mode-select"]')?.value === m, mode, { timeout: 5000 }).catch(() => {});
};
const openTint = async (page) => {
  const sel = '[data-p3="depth-tint-advanced"]';
  await hooks.need(page, sel);
  if ((await page.locator(sel).getAttribute('aria-expanded')) !== 'true') await hooks.click(page.locator(sel));
  await hooks.need(page, '[data-p3="shadow-tint-hue"]');
};
/** Move a slider to `v` the way a drag does: the value, then `input`. */
const slide = (page, hk, v) => page.evaluate(([h, x]) => { const n = document.querySelector(`[data-p3="${h}"]`); n.value = String(x); n.dispatchEvent(new Event('input', { bubbles: true })); }, [hk, v]);
/** Every dot the traces draw, and the animation each runs now. */
const dotAnims = (page) => page.evaluate(() => [...document.querySelectorAll('[data-p3="depth-style-guide"] [data-p3="transition-dot"]')].map((d) => d.style.animation || ''));

// Specimen grounds and Q24's gray containers: both hosts, both themes, every mode.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await openDepth(page);
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await chooseMode(page, mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await sectionGrounds(page, 'depth-style-guide');
        const want = EMITTED[mode];
        for (const name of EXPECT_DEPTH_SPECIMENS) {
          const r = g.roots.find((x) => x.name === name);
          ok(!!r && r.root && r.ground === want, `specimen ground: depth ${where}: ${name} is a specimen root on background.primary ${want}${
            !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== want ? ` — ${r.ground === g.card ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
        }
        const unlisted = g.roots.filter((x) => !EXPECT_DEPTH_SPECIMENS.includes(x.name)).map((x) => x.name);
        ok(unlisted.length === 0, `specimen ground: depth ${where}: every section ground drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
        const offGray = g.sections.filter((x) => x.bg !== LEVERS_GRAY).map((x) => `${x.name} on ${x.bg}`);
        ok(g.sections.length === EXPECT_DEPTH_SPECIMENS.length && offGray.length === 0,
          `Q24 section containers: depth ${where}: every section container is the levers panel's gray ${LEVERS_GRAY} (${g.sections.length} read)${offGray.length ? ` — ${offGray.join(', ')}` : ''}`);
      }
    } catch (e) {
      ok(false, `S9.2 specimen grounds ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}

// Represented, on both hosts: every lever once (Shadow tint only behind Elevation's Show advanced); the Q23 pairs; the
// approved copy; the easing rows by plain name first, token under (QA-B2); one home, V4's one preview; the Slow motion
// choice; Continue to Layout lands on the Layout tab; the owner's plain words (D16) everywhere on the page.
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await openDepth(page);
    const before = await page.evaluate(() => ({ tint: document.querySelectorAll('[data-p3="levers-pane"] [data-p3="lever-shadow-tint"]').length }));
    ok(before.tint === 0, `D8: ${host}: Shadow tint is behind Elevation's Show advanced until it is opened (${before.tint} drawn)`);
    await openTint(page);
    const r = await page.evaluate((levers) => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const prev = document.querySelector('[data-p3="depth-style-guide"]');
      const secs = [...pane.querySelectorAll('[data-p3="lever-section"]')].map((s) => [s.querySelector('.p3-lsec-title')?.textContent ?? null, s.querySelector('.p3-lsec-desc')?.textContent ?? null]);
      const psecs = [...prev.querySelectorAll('.psec')].map((s) => [s.querySelector('.psec-t')?.textContent ?? null, s.querySelector('.psec-d')?.textContent ?? null]);
      const tint = pane.querySelector('[data-p3="lever-shadow-tint"]');
      return {
        counts: [...levers, 'lever-shadow-tint'].map((hk) => pane.querySelectorAll(`[data-p3="${hk}"]`).length), secs, psecs,
        tintIn: tint?.closest('[data-p3="lever-section"]')?.querySelector('.p3-lsec-title')?.textContent ?? null, tintInFold: !!tint?.closest('.p3-advbody'),
        tintDesc: tint?.textContent.includes('Shifts the shadow color off pure black, toward a hue.') ?? false,
        intro: pane.querySelector('.p3-intro')?.textContent ?? null, next: document.querySelector('[data-p3="depth-continue"]')?.textContent.trim() ?? null,
        rows: [...pane.querySelectorAll('[data-p3="easing-row"]')].map((row) => ({ role: row.dataset.role, first: row.querySelector('.p3-fill-name')?.firstElementChild?.className ?? null,
          label: row.querySelector('.p3-fill-label')?.textContent ?? null, tok: row.querySelector('.p3-fill-tok')?.textContent ?? null })),
        title: document.querySelector('[data-p3="preview-title"]')?.textContent ?? null, view: document.querySelector('[data-p3="preview-body"]')?.dataset.view ?? null,
        slow: [...(prev.querySelector('[data-p3="motion-slowmo"]')?.options ?? [])].map((o) => o.textContent),
        notes: prev.textContent,
      };
    }, DEPTH_LEVERS);
    ok(r.counts.every((n) => n === 1), `${host}: every Depth & motion lever draws its hook once (${[...DEPTH_LEVERS, 'lever-shadow-tint'].map((h, i) => `${h} ${r.counts[i]}`).join(', ')})`);
    ok(r.tintIn === 'Elevation' && r.tintInFold && r.tintDesc, `D8 A: ${host}: Shadow tint sits inside Elevation, behind its own Show advanced, with its approved line (in ${r.tintIn}, fold ${r.tintInFold}, line ${r.tintDesc})`);
    const wantSecs = [['Elevation', DEPTH_COPY.Elevation], ['Motion', DEPTH_COPY.Motion]];
    ok(JSON.stringify(r.secs) === JSON.stringify(wantSecs) && JSON.stringify(r.psecs) === JSON.stringify(wantSecs),
      `Q23: ${host}: the lever sections and the preview sections are Elevation then Motion, one heading and description each — levers ${JSON.stringify(r.secs)}, preview ${JSON.stringify(r.psecs)}`);
    ok(r.intro === DEPTH_COPY.intro && r.next === DEPTH_COPY.next, `${host}: the approved intro and Continue read "${r.intro}" and "${r.next}"`);
    ok(JSON.stringify(r.rows.map((x) => x.role)) === JSON.stringify(EASING_ROLES) && r.rows.every((x) => x.first === 'p3-fill-label' && x.label === `Easing for ${x.role}` && x.tok === `motion.easing-role.${x.role}`),
      `D10, QA-B2: ${host}: an easing row per role, "Easing for ‹role›" first, its motion.easing-role token under it — ${JSON.stringify(r.rows)}`);
    ok(r.title === 'Depth & motion' && r.view === 'depth', `V4: ${host}: one preview holds both, under the page's one home (title "${r.title}", view ${r.view})`);
    ok(JSON.stringify(r.slow) === JSON.stringify(DEPTH_COPY.slow), `D9: ${host}: Slow motion offers ${DEPTH_COPY.slow.join(', ')} (offers ${r.slow.join(', ')})`);
    for (const k of ['note', 'durations', 'spin', 'springs', 'blocks']) ok(r.notes.includes(DEPTH_COPY[k]), `D7: ${host}: the preview says the approved "${DEPTH_COPY[k]}"`);
    // The six curves in the picker (D10), each drawn.
    await hooks.click(page.locator('[data-p3="easing-pick"][data-role="exit"]'));
    await hooks.need(page, '[data-p3="value-picker"]');
    const pk = await page.evaluate(() => {
      const p = document.querySelector('[data-p3="value-picker"]');
      return { hint: p.querySelector('.p3-picker-hint')?.textContent ?? null, curves: [...p.querySelectorAll('[data-p3="value-picker-value"]')].map((b) => ({ c: b.querySelector('[data-curve]')?.dataset.curve ?? null, drawn: !!b.querySelector('svg path') })) };
    });
    ok(pk.hint === DEPTH_COPY.hint && JSON.stringify(pk.curves.map((x) => x.c)) === JSON.stringify(CURVES) && pk.curves.every((x) => x.drawn),
      `D10: ${host}: the easing picker lists the six curves, each drawn, under "${DEPTH_COPY.hint}" — ${JSON.stringify(pk)}`);
    await page.keyboard.press('Escape');
    // D16: plain words. Never "ramp", "ladder", "band", "rung", "face", "muted" or "column" in the page's visible copy
    // (levers and preview, the toggletips included, token pills aside); "Blur:offset dial" may stay where it is.
    const PLAIN = /\b(ramps?|ladders?|bands?|rungs?|faces?|muted|columns?)\b/i;
    const words = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const out = [];
      for (const root of [document.querySelector('[data-p3="levers-pane"]'), document.querySelector('[data-p3="preview-body"]')]) {
        const c = root.cloneNode(true);
        for (const t of c.querySelectorAll('[data-p3="token-pill"], .p3-fill-tok')) t.remove();
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (re.test(n.textContent)) out.push(n.textContent.trim().slice(0, 80));
        for (const e of c.querySelectorAll('[aria-label], [title], [placeholder]')) for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute(a); if (v && re.test(v)) out.push(`${a} "${v.slice(0, 80)}"`); }
      }
      return out;
    }, PLAIN.source);
    ok(words.length === 0, `D16 plain words: ${host}: no "ramp", "ladder", "band", "rung", "face", "muted" or "column" on Depth & motion${words.length ? ` — found ${words.slice(0, 4).map((x) => `"${x}"`).join(', ')}` : ''}`);
    await hooks.click(page.locator('[data-p3="depth-continue"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'layout', null, { timeout: 5000 }).catch(() => {});
    const place = await page.evaluate(() => document.querySelector('[data-p3="frame"]')?.dataset.place ?? null);
    ok(place === 'layout', `${host}: Continue to Layout opens the Layout tab (on ${place})`);
    ok(errors.length === 0, `${host} Depth & motion: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S9.2 represented ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// Q22 (the previewed mode) and Q59 (derived modes): web. Light writes the brand value; previewing Dark the same
// control writes modeLevers.dark.*, says "Auto: follows Light (‹value›)" until set and offers Return to Auto once it
// is; a slider landing on Light's value clears the override (the legacy bytes). A custom mode based on Dark names
// LIGHT's value under Auto (the engine resolves from the brand, not the base). HC light disables every control.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await openDepth(page);
    await openTint(page);
    const b0 = await persisted(page);
    // Light: the brand value.
    await slide(page, 'shadow-softness', 1.4);
    await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput')).input.shadow?.softness === 1.4; } catch { return false; } }, null, { timeout: 5000 }).catch(() => {});
    const b1 = await persisted(page);
    ok(b1?.shadow?.softness === 1.4 && !b1?.modeLevers?.light, `Q22: previewing Light, a softness edit writes shadow.softness (persisted ${JSON.stringify(b1?.shadow ?? null)})`);
    await slide(page, 'shadow-tint-hue', 200);
    const b1b = await persisted(page);
    ok(b1b?.shadow?.tint?.hue === 200 && JSON.stringify(b1b?.shadow?.tint) === JSON.stringify({ ...(b0?.shadow?.tint ?? {}), hue: 200 }),
      `Q22: previewing Light, a tint hue edit writes shadow.tint.hue alone (persisted ${JSON.stringify(b1b?.shadow?.tint ?? null)}, was ${JSON.stringify(b0?.shadow?.tint ?? null)})`);
    // Dark: the mode's override.
    await chooseMode(page, 'dark');
    await openTint(page);
    const autoOf = (hk) => page.evaluate((h) => { const a = document.querySelector(`[data-p3="${h}-auto"]`); const r = document.querySelector(`[data-p3="${h}-reset"]`); return { auto: a && !a.hidden ? a.textContent : null, reset: !!r && !r.hidden }; }, hk);
    const a0 = await autoOf('shadow-softness');
    ok(a0.auto === 'Auto: follows Light (1.4 · soft)' && !a0.reset, `Q22: previewing Dark, softness under Auto says "Auto: follows Light (1.4 · soft)", no Return to Auto (${JSON.stringify(a0)})`);
    await slide(page, 'shadow-softness', 2);
    const b2 = await persisted(page);
    ok(b2?.modeLevers?.dark?.shadow?.softness === 2 && b2?.shadow?.softness === 1.4,
      `Q22: previewing Dark, a softness edit writes modeLevers.dark.shadow.softness and not the brand value (dark ${JSON.stringify(b2?.modeLevers?.dark ?? null)}, brand ${JSON.stringify(b2?.shadow ?? null)})`);
    const a1 = await autoOf('shadow-softness');
    ok(a1.auto === null && a1.reset, `Q22: previewing Dark, a set softness offers Return to Auto in place of the Auto line (${JSON.stringify(a1)})`);
    await slide(page, 'shadow-softness', 1.4);
    const b3 = await persisted(page);
    ok(b3?.modeLevers?.dark?.shadow?.softness === undefined, `Q22: previewing Dark, a slider landing on Light's value clears the override (the legacy bytes; dark ${JSON.stringify(b3?.modeLevers?.dark ?? null)})`);
    await slide(page, 'shadow-tint-amount', 0.5);
    await hooks.click(page.locator('[data-p3="shadow-tint-amount-reset"]'));
    const b4 = await persisted(page);
    ok(b4?.modeLevers?.dark?.shadow === undefined && JSON.stringify(b4?.shadow) === JSON.stringify(b3?.shadow),
      `Q22: previewing Dark, Return to Auto clears the tint amount and leaves the brand value (dark ${JSON.stringify(b4?.modeLevers?.dark ?? null)})`);
    await hooks.click(page.locator('[data-p3="tempo-relaxed"]'));
    await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput')).input.modeLevers?.dark?.tempo === 'relaxed'; } catch { return false; } }, null, { timeout: 5000 }).catch(() => {});
    const b5 = await persisted(page);
    ok(b5?.modeLevers?.dark?.tempo === 'relaxed' && b5?.motionPersonality?.tempo === b4?.motionPersonality?.tempo,
      `Q22: previewing Dark, a tempo edit writes modeLevers.dark.tempo and not the brand value (dark ${JSON.stringify(b5?.modeLevers?.dark ?? null)})`);
    // A custom mode based on Dark: Auto names Light's value, never Dark's override (the engine resolves from the brand).
    await goPlace(page, 'brand');
    await hooks.click(page.locator('[data-p3="custom-mode-add"]'));
    await hooks.need(page, '[data-p3="custom-mode-base"]');
    await page.locator('[data-p3="custom-mode-base"]').selectOption('dark');
    await openDepth(page);
    await openTint(page);
    await chooseModeAny(page, 'custom-1');
    const t = await autoOf('tempo');
    const lightTempo = { snappy: 'Snappy', standard: 'Standard', relaxed: 'Relaxed' }[b5?.motionPersonality?.tempo ?? 'standard'];
    ok(t.auto === `Auto: follows Light (${lightTempo})`, `Q22: previewing custom-1 (based on Dark), Auto names Light's value, not its base's override — says ${JSON.stringify(t.auto)}, want "Auto: follows Light (${lightTempo})" (Dark is relaxed)`);
    // Q59: a derived mode draws the preview and disables every control.
    await chooseModeAny(page, 'hc-light');
    const d = await page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const ctl = [...pane.querySelectorAll('.p3-lsec :is(button, input, select)')].filter((n) => !n.classList.contains('p3-info') && n.dataset.p3 !== 'depth-tint-advanced');
      return { n: ctl.length, enabled: ctl.filter((n) => !n.disabled).map((n) => n.dataset.p3), line: !!document.querySelector('[data-p3="depth-derived"]'),
        preview: document.querySelectorAll('[data-p3="depth-style-guide"] .psec').length };
    });
    ok(d.n >= 10 && d.enabled.length === 0 && d.line && d.preview === 2,
      `Q59: previewing HC light, every control on Depth & motion is disabled under the derived line, and the preview is drawn — ${d.n} controls, enabled ${JSON.stringify(d.enabled)}, line ${d.line}, ${d.preview} preview sections`);
    ok(errors.length === 0, `Q22/Q59 Depth & motion: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S9.2 Q22/Q59: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// D9: when the traces play. Nothing plays at mount or after an Elevation edit; a Motion edit plays them once, at real
// speed (Off); Slow motion divides the playback and writes nothing to the brand (#574). Under reduced motion a Motion
// edit plays nothing, the section says so, and Play plays them once on request. Web.
for (const reduced of [false, true]) {
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDepth(page);
    const tag = reduced ? 'under reduced motion' : 'without reduced motion';
    const mount = await dotAnims(page);
    ok(mount.length === 4 && mount.every((a) => !a), `D9: ${tag}, the four traces are at rest when the page opens (${JSON.stringify(mount)})`);
    await slide(page, 'shadow-softness', 0.4);
    const elev = await dotAnims(page);
    ok(elev.every((a) => !a), `D9: ${tag}, an Elevation edit plays nothing (${JSON.stringify(elev)})`);
    const line = await page.evaluate(() => document.querySelector('[data-p3="motion-reduced"]')?.textContent ?? null);
    ok(reduced ? line === DEPTH_COPY.reduced : line === null, `D9: ${tag}, the reduced-motion line is ${reduced ? `"${DEPTH_COPY.reduced}"` : 'not drawn'} (${JSON.stringify(line)})`);
    await hooks.click(page.locator('[data-p3="tempo-relaxed"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="tempo-relaxed"]')?.getAttribute('aria-checked') === 'true', null, { timeout: 5000 }).catch(() => {});
    const after = await dotAnims(page);
    const label = await page.evaluate(() => document.querySelector('[data-p3="motion-play"]')?.textContent ?? null);
    if (reduced) ok(after.every((a) => !a) && label === 'Play', `D9: under reduced motion, a Motion edit plays nothing, and the button still says Play (${JSON.stringify(after)}, "${label}")`);
    else ok(after.length === 4 && after.every((a) => /mo-trace-y/.test(a) && /\d+ms cubic-bezier/.test(a)) && label === 'Replay', `D9: without reduced motion, a Motion edit plays the four traces once, and the button says Replay (${JSON.stringify(after)}, "${label}")`);
    // Real speed: the emphasized trace runs its relaxed duration (moderate 300 × 1.3 = 390ms) at Off.
    const brand0 = JSON.stringify(await persisted(page));
    await hooks.click(page.locator('[data-p3="motion-play"]'));
    const played = await dotAnims(page);
    ok(played.every((a) => /mo-trace-y/.test(a)) && played.some((a) => /\b390ms cubic-bezier\(0\.4, 0\.14/.test(a)), `D9: ${tag}, Play plays every trace once, at real speed (${JSON.stringify(played)})`);
    await page.locator('[data-p3="motion-slowmo"]').selectOption('4');
    await hooks.click(page.locator('[data-p3="motion-play"]'));
    const slow = await dotAnims(page);
    ok(slow.some((a) => /\b1560ms cubic-bezier\(0\.4, 0\.14/.test(a)), `D9: ${tag}, Slow motion 1/4 plays the same trace four times slower (${JSON.stringify(slow)})`);
    ok(JSON.stringify(await persisted(page)) === brand0, `#574: ${tag}, Play and Slow motion write nothing to the brand`);
    ok(errors.length === 0, `D9 ${tag}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S9.2 D9 reduced=${reduced}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// The chrome probe on Depth & motion: both hosts, both themes, 1280, 640 and 380, Shadow tint and a picker open.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    for (const { w, h } of WIDTHS) {
      const { ctx, page } = await open({ host, theme, w, h });
      try {
        await openDepth(page);
        await openTint(page);
        await hooks.click(page.locator('[data-p3="easing-pick"][data-role="default"]'));
        await hooks.need(page, '[data-p3="value-picker"]');
        const where = `${host} ${theme} ${w} / depth (tint and a picker open)`;
        const m = await measure(page, where, host, w);
        check(m, where, columnOf(host, w), PLACE_FLOOR);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s92-${host}-${theme}-${w}-depth.png`) });
      } catch (e) {
        ok(false, `S9.2 chrome ${host} ${theme} ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 25. S10: Layout — moved to the two panes. Specimens on the page color, its levers represented with no Show
//     advanced (FIRST_CLASS), the Q23 pairs, the approved copy, the first breakpoint fixed at 0, D13's re-keying and
//     its one line, the 2–7 limits, every control read-only in a derived mode (Q59), the preview ink on the tints
//     (D14), Continue to Components on either host (T8), and a column count off the list shown as it is (#2047).
//
//     Independence (docs/34): the lever keys are read from the committed `schema/lever-manifest.json` (group `layout`),
//     the page grounds from the committed emission (`EMITTED`), the copy and the expected writes are literals typed
//     here, and every write is read back from the brand the web host persists, never from the page.
//
//     Mutations this fails by name: the first breakpoint's field left editable → `Layout: the first breakpoint is fixed
//     at 0 …`; Continue routed by the legacy page key → `T8: web: Continue to Components lands on the Components tab …`;
//     a lever behind a Show advanced → `Layout: … renders its hook … once, with no Show advanced`.
// =============================================================================================
console.log(`\nLayout (S10)\n${'='.repeat(78)}`);
/** The manifest keys homed on Layout, from the committed manifest (its `layout` group), never from the page. */
const LAYOUT_MANIFEST = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/lever-manifest.json'), 'utf8')).levers.filter((l) => l.group === 'layout').map((l) => l.key);
ok(LAYOUT_MANIFEST.length === 4, `the committed manifest homes ${LAYOUT_MANIFEST.length} levers in its layout group (want 4: breakpoints, columns, the two containers) — ${LAYOUT_MANIFEST.join(', ')}`);
/** The preview's sections, by title, and the lever sections they pair with (Q23). Literal. */
const EXPECT_LAYOUT_SECTIONS = ['Breakpoints', 'Grid', 'Containers'];
/** The approved copy (owner, S10 scope), literal. */
const LAYOUT_APPROVED = {
  intro: 'Breakpoints, the grid and content widths.',
  Breakpoints: 'Where each layout starts. Names follow the count.',
  Grid: 'Columns, gutter and margin for each breakpoint. Auto follows the default steps.',
  Containers: 'Content stretches up to the maximum width. The content container is narrower, for long text.',
  first: 'Always 0px.', add: 'Add breakpoint', next: 'Continue to Components',
  hints: ['To scale. Each color is the range one layout covers.', 'Bars are columns; the gray is the margin.', 'To scale against the widest breakpoint, 1920px.'],
  labels: ['Grid columns', 'Maximum width', 'Content container'],
};
/** Words D16 retires from Layout's visible copy (and Q53's "face", "band", "rung", "muted"). Literal. */
const LAYOUT_BANNED = /\b(face|band|rung|muted|floors?|reading measure|reading-measure|content column|min-width)\b/i;
const layoutRead = (page) => page.evaluate(() => {
  const pane = document.querySelector('[data-p3="levers-pane"]');
  const body = document.querySelector('[data-p3="preview-body"]');
  const vis = (n) => !!n && n.offsetParent !== null;
  const secs = [...pane.querySelectorAll('[data-p3="lever-section"]')].map((x) => ({ title: x.querySelector('.p3-lsec-title')?.textContent, desc: x.querySelector('.p3-lsec-desc')?.textContent ?? '' }));
  const psecs = [...body.querySelectorAll('[data-p3="layout-style-guide"] .psec')].map((x) => ({ title: x.querySelector('[data-p3="section-title"]')?.textContent, desc: x.querySelector('[data-p3="section-description"]')?.textContent ?? '' }));
  const bpRows = [...pane.querySelectorAll('[data-p3="bp-row"]')].map((r) => ({ bp: r.dataset.bp, value: r.querySelector('input')?.value, disabled: r.querySelector('input')?.disabled,
    note: r.querySelector('[data-p3="bp-first-note"]')?.textContent ?? null, remove: r.querySelector('[data-p3="bp-remove"]')?.textContent ?? null }));
  return {
    intro: pane.querySelector('.p3-intro')?.textContent, secs, psecs, bpRows,
    adv: [...pane.querySelectorAll('button')].filter((b) => /advanced/i.test(b.textContent)).length,
    add: vis(pane.querySelector('[data-p3="bp-add"]')) ? pane.querySelector('[data-p3="bp-add"]').textContent : null,
    limit: pane.querySelector('[data-p3="bp-limit"]')?.textContent ?? null,
    dropped: pane.querySelector('[data-p3="bp-dropped"]')?.textContent ?? null,
    next: pane.querySelector('[data-p3="layout-continue"]')?.textContent,
    labels: [...pane.querySelectorAll('.p3-lever-name')].map((n) => n.textContent),
    hints: [...body.querySelectorAll('.lyv-hint')].map((n) => n.textContent),
    text: `${pane.innerText}\n${body.innerText}`,
  };
});
const layoutPersisted = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput'))?.input?.layout ?? null; } catch { return null; } });
// Specimen grounds: both hosts, both chrome themes, every mode.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'layout');
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await chooseMode(page, mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await groundsIn(page, 'layout-style-guide');
        const want = EMITTED[mode];
        for (const name of EXPECT_LAYOUT_SECTIONS) {
          const r = g.roots.find((x) => x.name === name);
          ok(!!r && r.root && r.ground === want, `specimen ground: layout ${where}: ${name} is a specimen root on background.primary ${want}${
            !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground}` : r.ground !== want ? ` — is ${r.ground}` : ''}`);
        }
        const unlisted = g.roots.filter((x) => !EXPECT_LAYOUT_SECTIONS.includes(x.name)).map((x) => x.name);
        ok(unlisted.length === 0, `specimen ground: layout ${where}: every section ground drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
        // D14: a label on a tint takes the ink that has the more contrast on that tint, so it reads in every mode.
        const inks = await page.evaluate(() => {
          const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); const p = m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : [0, 0, 0]; return p; };
          const lum = (p) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); };
          const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          return [...document.querySelectorAll('[data-p3="layout-range"]')].map((n) => { const cs = getComputedStyle(n); return { bp: n.dataset.bp, r: +ratio(parse(cs.color), parse(cs.backgroundColor)).toFixed(2) }; });
        });
        const low = inks.filter((x) => x.r < TEXT_MIN);
        ok(inks.length >= 5 && low.length === 0, `D14: layout ${where}: each range's name clears ${TEXT_MIN}:1 on its tint (${inks.map((x) => `${x.bp} ${x.r}`).join(', ')})${low.length ? ` — below: ${low.map((x) => x.bp).join(', ')}` : ''}`);
      }
    } catch (e) {
      ok(false, `S10 specimen grounds ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
// Represented, the copy, the pairs, the first breakpoint, and Continue: both hosts.
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'layout');
    await hooks.need(page, '[data-p3="layout-levers"]');
    for (const k of LAYOUT_MANIFEST) {
      const n = await page.locator(`[data-p3="levers-pane"] [data-p3="${kebabHook(k)}"]`).count();
      ok(n === 1, `Layout: ${host}: lever ${k} renders its hook ${kebabHook(k)} once, with no Show advanced (FIRST_CLASS) — rendered ${n}`);
    }
    const r = await layoutRead(page);
    ok(r.adv === 0, `Layout: ${host}: the levers draw no Show advanced (FIRST_CLASS, Q4) — ${r.adv} found`);
    ok(r.intro === LAYOUT_APPROVED.intro, `Layout: ${host}: the intro is the approved one — "${r.intro}"`);
    ok(JSON.stringify(r.secs.map((x) => x.title)) === JSON.stringify(EXPECT_LAYOUT_SECTIONS) && r.secs.every((x) => x.desc === LAYOUT_APPROVED[x.title]),
      `Layout: ${host}: the lever sections are ${EXPECT_LAYOUT_SECTIONS.join(', ')}, each with its approved description — ${JSON.stringify(r.secs)}`);
    ok(JSON.stringify(r.psecs) === JSON.stringify(r.secs), `Q23: Layout: ${host}: the preview's sections are the lever sections, one heading and description on both sides — preview ${JSON.stringify(r.psecs)}`);
    ok(JSON.stringify(r.hints) === JSON.stringify(LAYOUT_APPROVED.hints), `Layout: ${host}: the preview's hints are the approved ones — ${JSON.stringify(r.hints)}`);
    ok(LAYOUT_APPROVED.labels.every((l) => r.labels.includes(l)), `Layout: ${host}: the labels read ${LAYOUT_APPROVED.labels.join(', ')} (D17) — ${JSON.stringify(r.labels)}`);
    ok(!LAYOUT_BANNED.test(r.text), `D16: Layout: ${host}: no retired word in the visible copy${LAYOUT_BANNED.test(r.text) ? ` — "${r.text.match(LAYOUT_BANNED)[0]}"` : ''}`);
    const first = r.bpRows[0];
    ok(r.bpRows.length === 5 && first?.value === '0' && first.disabled === true && first.note === LAYOUT_APPROVED.first && first.remove === null,
      `Layout: the first breakpoint is fixed at 0 (${host}): its field reads 0, is disabled, says "${LAYOUT_APPROVED.first}" and has no Remove — ${JSON.stringify(first)}`);
    ok(r.bpRows.slice(1).every((x) => x.disabled === false && x.remove === `Remove ${x.bp}`) && r.add === LAYOUT_APPROVED.add && r.next === LAYOUT_APPROVED.next,
      `Layout: ${host}: every other breakpoint is editable with "Remove ‹name›", and the list ends on "${LAYOUT_APPROVED.add}"; Continue reads "${LAYOUT_APPROVED.next}" — ${JSON.stringify(r.bpRows.slice(1))}, add ${r.add}, next ${r.next}`);
    // T8: Continue opens the Components tab on this host, its own two panes since S8.2 on both hosts.
    await hooks.click(page.locator('[data-p3="layout-continue"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'components', null, { timeout: 5000 }).catch(() => {});
    const landed = await page.evaluate(() => ({ place: document.querySelector('[data-p3="frame"]')?.dataset.place, legacy: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage ?? null,
      selected: document.querySelector('[data-p3="tab-row"] [role="tab"][aria-selected="true"]')?.getAttribute('data-p3'), levers: !!document.querySelector('[data-p3="components-levers"]') }));
    ok(landed.place === 'components' && landed.legacy === null && landed.levers && landed.selected === 'tab-components',
      `T8: ${host}: Continue to Components lands on the Components tab's levers — landed ${JSON.stringify(landed)}`);
    ok(errors.length === 0, `Layout ${host}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S10 Layout ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// F1 A (owner, 2026-10-05), replacing #2120's dashed edge: the fixed first breakpoint field draws Prism3's own disabled
// text field skin, exactly, on both hosts and in both chrome themes, and no editable field takes it. Read as computed on
// the rendered fields; the oracle is the committed emission (`PRISM3_DISABLED`), never the studio's CSS or `spec.mjs`.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'layout');
      await hooks.need(page, '[data-p3="layout-levers"]');
      const d = await page.evaluate(() => ({
        scheme: getComputedStyle(document.documentElement).colorScheme,
        fields: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="bp-row"] input')].map((n) => {
          const cs = getComputedStyle(n);
          return { disabled: n.disabled, fill: cs.backgroundColor, ink: cs.color, edges: ['Top', 'Right', 'Bottom', 'Left'].map((x) => [cs[`border${x}Color`], cs[`border${x}Style`]]) };
        }),
      }));
      const want = PRISM3_DISABLED[theme];
      const skin = (f) => ({ fill: hexOfRgb(f.fill), edge: [...new Set(f.edges.map(([c]) => hexOfRgb(c)))].join(' '), style: [...new Set(f.edges.map(([, st]) => st))].join(' '), ink: hexOfRgb(f.ink) });
      const first = d.fields[0];
      const got = first ? skin(first) : null;
      ok(d.scheme === theme && first?.disabled === true && got.fill === want.fill && got.edge === want.edge && got.style === 'solid' && got.ink === want.ink,
        `F1 A: Layout: ${host} ${theme}: the fixed first breakpoint field draws Prism3's disabled text field: fill color.disabled.fill ${want.fill}, a solid edge color.disabled.border ${want.edge}, value color.disabled.on-fill ${want.ink} — drew ${JSON.stringify(got)} (disabled ${first?.disabled}, chrome ${d.scheme})`);
      const rest = d.fields.slice(1).map(skin);
      ok(d.fields.length === 5 && d.fields.slice(1).every((f) => !f.disabled) && rest.every((x) => x.fill !== want.fill && x.edge !== want.edge && x.ink !== want.ink),
        `F1 A: Layout: ${host} ${theme}: no editable breakpoint field takes the disabled skin — ${JSON.stringify(rest)}`);
      if (SHOTS) await page.locator('[data-p3="levers-pane"] [data-p3="bp-list"]').screenshot({ path: join(SHOTS, `f1-${host === 'web' ? 'web' : 'plugin'}-${theme}.png`) });
      ok(errors.length === 0, `F1 A Layout ${host} ${theme}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `F1 A Layout ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
// No hover on a disabled text field (owner, 2026-10-05, after #2120): a pointer over Layout's fixed first breakpoint
// field changes none of its colors. The same pointer over an editable field does change its edge, which proves the
// probe can see a hover. Both hosts, both chrome themes. Screenshots of the disabled field and of Continue focused
// by keyboard when a directory is given.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'layout');
      await hooks.need(page, '[data-p3="layout-levers"]');
      const field = (i) => page.locator('[data-p3="bp-row"] input').nth(i);
      const read = (i) => field(i).evaluate((n) => { const cs = getComputedStyle(n); return { disabled: n.disabled, backgroundColor: cs.backgroundColor, borderTopColor: cs.borderTopColor, color: cs.color }; });
      await page.mouse.move(1, 1);
      const rest = await read(0);
      await field(0).hover({ force: true });
      const hovered = await read(0);
      const moved = ['backgroundColor', 'borderTopColor', 'color'].filter((k) => hovered[k] !== rest[k]);
      await page.mouse.move(1, 1);
      const editRest = await read(1);
      await field(1).hover();
      const editHover = await read(1);
      await page.mouse.move(1, 1);
      ok(editRest.disabled === false && editHover.borderTopColor !== editRest.borderTopColor,
        `disabled field: ${host} ${theme}: control: a pointer over an editable breakpoint field changes its edge (${editRest.borderTopColor} → ${editHover.borderTopColor}), so the probe sees a hover`);
      ok(rest.disabled === true && moved.length === 0,
        `disabled field: ${host} ${theme}: a pointer over the disabled first breakpoint field changes nothing${moved.length ? ` — ${moved.map((k) => `${k} ${rest[k]} → ${hovered[k]}`).join(', ')}` : ''}`);
      if (SHOTS) {
        const tag = `${host === 'web' ? 'studio' : 'plugin'}-${theme}`;
        await page.locator('[data-p3="bp-row"]').first().screenshot({ path: join(SHOTS, `disabled-field-${tag}.png`) });
        const next = page.locator('[data-p3="layout-continue"]');
        await next.evaluate((n) => n.scrollIntoView({ block: 'center' }));
        await next.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const box = await next.boundingBox();
        if (box) await page.screenshot({ path: join(SHOTS, `continue-focus-${tag}.png`), clip: { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 16), width: box.width + 32, height: box.height + 32 } });
      }
      ok(errors.length === 0, `disabled field: ${host} ${theme}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `disabled field ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
// D13 (#2045), the limits, the pickers' writes, a slider, and the reveal (QA-B9): web, read back from the persisted brand.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'layout');
    await hooks.need(page, '[data-p3="layout-levers"]');
    // T10, QA-B9, first, on the default breakpoints (widest 1920px, so 1440 → 1400 is inside the track): the maximum
    // width slider moves its own bar, and the edit eases the preview to Containers.
    await page.evaluate(() => { document.querySelector('[data-p3="preview-body"]').scrollTop = 0; });
    const barW = () => page.evaluate(() => document.querySelector('[data-p3="layout-container"][data-token="container.max"] [data-p3="layout-container-bar"]')?.getBoundingClientRect().width ?? null);
    const w0 = await barW();
    await page.locator('[data-p3="container-max-range"]').focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('prism3:brandInput')).input.layout.containerMax === 1400; } catch { return false; } }, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    const w1 = await barW();
    const seen = await page.evaluate(() => { const b = document.querySelector('[data-p3="preview-body"]'); const sec = document.querySelector('[data-p3="layout-style-guide"] [data-sg-section="containers"]'); if (!b || !sec) return null; const R = b.getBoundingClientRect(), r = sec.getBoundingClientRect(); return { top: b.scrollTop, inView: r.top < R.bottom && r.bottom > R.top }; });
    ok((await layoutPersisted(page))?.containerMax === 1400 && w0 !== null && w1 !== null && w1 < w0,
      `T10: the Maximum width slider writes 1400 and moves its own bar, drawn against the widest breakpoint (${w0} → ${w1}px)`);
    ok(!!seen && seen.inView && seen.top > 0, `QA-B9: a Containers edit eases the preview to its Containers section — ${JSON.stringify(seen)}`);
    const pick = async (role, bp, value) => {
      await hooks.click(page.locator(`[data-p3="${role}"][data-bp="${bp}"]`));
      await hooks.click(page.locator(`[data-p3="value-picker-value"][data-value="${value}"]`));
      await page.waitForFunction(([r, b]) => document.querySelector(`[data-p3="${r}"][data-bp="${b}"]`)?.dataset.set === 'true', [role, bp], { timeout: 5000 }).catch(() => {});
      // The picker stays open after a pick (Type's, Q65); Close puts it away.
      await hooks.click(page.locator('[data-p3="value-picker-close"]'));
    };
    await pick('bp-cols-pick', 'md', '6');
    ok(JSON.stringify((await layoutPersisted(page))?.columnOverrides) === '{"md":6}', `Layout: md's columns set to 6 write columnOverrides {"md":6} — ${JSON.stringify(await layoutPersisted(page))}`);
    await hooks.click(page.locator('[data-p3="bp-add"]'));
    await page.waitForFunction(() => document.querySelectorAll('[data-p3="bp-row"]').length === 6, null, { timeout: 5000 }).catch(() => {});
    let L = await layoutPersisted(page);
    ok(JSON.stringify(L?.breakpoints) === '[0,768,1024,1440,1920,2176]' && JSON.stringify(L?.columnOverrides) === '{"sm":6}',
      `D13: adding a breakpoint keeps the 6 columns on the 768px breakpoint, renamed sm — ${JSON.stringify(L)}`);
    await hooks.click(page.locator('[data-p3="bp-add"]'));
    await page.waitForFunction(() => document.querySelectorAll('[data-p3="bp-row"]').length === 7, null, { timeout: 5000 }).catch(() => {});
    const at7 = await layoutRead(page);
    ok(at7.add === null && !!at7.limit, `Layout: at seven breakpoints Add breakpoint gives way to the limit line — add ${JSON.stringify(at7.add)}, limit ${JSON.stringify(at7.limit)}`);
    // Remove the 768px breakpoint (sm now): its setting goes, and one line says so.
    await hooks.click(page.locator('[data-p3="bp-remove"][data-bp="sm"]'));
    await page.waitForFunction(() => document.querySelectorAll('[data-p3="bp-row"]').length === 6, null, { timeout: 5000 }).catch(() => {});
    L = await layoutPersisted(page);
    const after = await layoutRead(page);
    ok(JSON.stringify(L?.breakpoints) === '[0,1024,1440,1920,2176,2432]' && L?.columnOverrides === undefined
      && after.dropped === 'Removed sm: its column, gutter and margin settings went with it.',
      `D13: removing it drops its setting (the map deleted, never {}) and says so in one line — ${JSON.stringify(L)}, "${after.dropped}"`);
    // Down to two: Remove gives way on both.
    for (let n = 6; n > 2; n--) {
      await hooks.click(page.locator('[data-p3="bp-remove"]').last());
      await page.waitForFunction((k) => document.querySelectorAll('[data-p3="bp-row"]').length === k, n - 1, { timeout: 5000 }).catch(() => {});
    }
    const at2 = await layoutRead(page);
    ok(at2.bpRows.length === 2 && at2.bpRows.every((x) => x.remove === null) && at2.add === LAYOUT_APPROVED.add,
      `Layout: at two breakpoints neither offers Remove, and Add breakpoint is back — ${JSON.stringify(at2.bpRows)}`);
    // D13's two to seven: at two, typing the first's 0 into the second would merge them into one. Refused: nothing is
    // written and the field keeps its width, as an emptied or non-number field does.
    {
      const before = await layoutPersisted(page);
      const second = page.locator('[data-p3="bp-row"]').nth(1).locator('[data-p3="bp-input"]');
      const was = await second.inputValue();
      await second.fill('0');
      await second.press('Enter');
      await page.waitForTimeout(300);
      const after2 = await layoutPersisted(page);
      const shown = await page.evaluate(() => [...document.querySelectorAll('[data-p3="bp-row"] [data-p3="bp-input"]')].map((n) => n.value));
      ok(JSON.stringify(after2?.breakpoints) === JSON.stringify(before?.breakpoints) && after2?.breakpoints?.length === 2 && shown.length === 2 && shown[1] === was,
        `Layout: at two breakpoints, typing 0 into the second is refused and the field keeps its width (two to seven) — persisted ${JSON.stringify(after2?.breakpoints)}, fields ${JSON.stringify(shown)}`);
    }
    // A gutter to a step and back to Auto: the emptied map is deleted.
    const bp0 = at2.bpRows[1].bp;
    await pick('bp-gutter-pick', bp0, '4');
    ok(JSON.stringify((await layoutPersisted(page))?.gutterOverrides) === `{"${bp0}":4}`, `Layout: ${bp0}'s gutter set to 4px writes gutterOverrides {"${bp0}":4} — ${JSON.stringify(await layoutPersisted(page))}`);
    await hooks.click(page.locator(`[data-p3="bp-gutter-pick"][data-bp="${bp0}"]`));
    await hooks.click(page.locator('[data-p3="value-picker-reset"]'));
    await page.waitForFunction((b) => document.querySelector(`[data-p3="bp-gutter-pick"][data-bp="${b}"]`)?.dataset.set !== 'true', bp0, { timeout: 5000 }).catch(() => {});
    await hooks.click(page.locator('[data-p3="value-picker-close"]'));
    L = await layoutPersisted(page);
    ok(!!L && !('gutterOverrides' in L), `Layout: Return to Auto on the last gutter deletes gutterOverrides, never {} — ${JSON.stringify(L)}`);
    ok(errors.length === 0, `Layout edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S10 Layout edits: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// #2047: a column count off the offered list (any whole number 4–24 is legal) is shown as it is, base and per breakpoint.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    /** The hand-written input (#2047's "done when"): 10 is legal (4–24) and on no offered list. */
    const INPUT_LAYOUT = { columns: 10, columnOverrides: { md: 10 } };
    await page.evaluate((lay) => {
      const blob = JSON.parse(localStorage.getItem('prism3:brandInput'));
      blob.input.layout = lay;
      localStorage.setItem('prism3:brandInput', JSON.stringify(blob));
    }, INPUT_LAYOUT);
    await page.reload({ waitUntil: 'networkidle' });
    await hooks.need(page, '[data-p3="frame"]');
    await goPlace(page, 'layout');
    await hooks.need(page, '[data-p3="layout-columns-pick"]');
    const cols = await page.evaluate(() => ({ base: document.querySelector('[data-p3="layout-columns-pick"]')?.textContent, md: document.querySelector('[data-p3="bp-cols-pick"][data-bp="md"]')?.textContent }));
    await hooks.click(page.locator('[data-p3="layout-columns-pick"]'));
    const listed = await page.evaluate(() => [...document.querySelectorAll('[data-p3="value-picker-value"]')].map((b) => ({ v: b.dataset.value, cur: b.getAttribute('aria-pressed') })));
    const want = String(INPUT_LAYOUT.columns), wantMd = String(INPUT_LAYOUT.columnOverrides.md);
    ok(cols.base === want && cols.md === wantMd && listed.some((x) => x.v === want && x.cur === 'true'),
      `#2047: a brand's ${want} grid columns (off the offered list) read ${want} on the base and ${wantMd} on md, as the input says, and the picker lists ${want} as current — ${JSON.stringify(cols)}, ${JSON.stringify(listed)}`);
    ok(errors.length === 0, `#2047: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `#2047: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Q59: previewing a derived mode, every control on Layout is disabled under the derived line; the preview still draws.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'layout');
    await hooks.need(page, '[data-p3="layout-levers"]');
    /** Five breakpoint fields and four Removes, Add, Grid columns, 15 per-breakpoint pickers, two sliders. */
    const LAYOUT_DERIVED_FLOOR = 27;
    for (const [mode, label] of [['hc-light', 'HC light'], ['hc-dark', 'HC dark']]) {
      await chooseAnyMode(page, mode);
      await page.waitForFunction((l) => document.querySelector('[data-p3="layout-derived"]')?.textContent?.startsWith(l), label, { timeout: 5000 }).catch(() => {});
      const d = await page.evaluate(() => {
        const pane = document.querySelector('[data-p3="levers-pane"]');
        const ctls = [...pane.querySelectorAll('[data-p3="lever-section"] :is(button, select, input)')].filter((n) => !n.matches('[data-p3="lever-info"]'));
        return { n: ctls.length, enabled: ctls.filter((n) => !n.disabled).map((n) => n.getAttribute('data-p3') ?? n.tagName), hooks: [...new Set(ctls.map((n) => n.getAttribute('data-p3')))],
          line: document.querySelector('[data-p3="layout-derived"]')?.textContent ?? null, sections: document.querySelectorAll('[data-p3="layout-style-guide"] .psec').length };
      });
      ok(d.line === `${label} is auto-derived — read-only. Edit Light or Dark and it follows.`, `Q59: previewing ${label}, the derived line shows on Layout ("${d.line}")`);
      ok(d.n >= LAYOUT_DERIVED_FLOOR && d.enabled.length === 0, `Q59: previewing ${label}, every control on Layout is disabled (${d.n - d.enabled.length}/${d.n}, floor ${LAYOUT_DERIVED_FLOOR})${d.enabled.length ? ` — enabled ${[...new Set(d.enabled)].join(', ')}` : ''}`);
      for (const hk of ['bp-input', 'bp-remove', 'bp-add', 'layout-columns-pick', 'bp-cols-pick', 'bp-gutter-pick', 'bp-margin-pick', 'container-max-range', 'container-narrow-range'])
        ok(d.hooks.includes(hk), `Q59: previewing ${label}, the ${hk} control on Layout is among those held disabled`);
      ok(d.sections === 3, `Q59: previewing ${label}, the Layout preview still draws its three sections (${d.sections})`);
    }
    await chooseAnyMode(page, 'light');
    const back = await page.evaluate(() => ({ line: !!document.querySelector('[data-p3="layout-derived"]'), add: document.querySelector('[data-p3="bp-add"]')?.disabled, pick: document.querySelector('[data-p3="layout-columns-pick"]')?.disabled }));
    ok(!back.line && back.add === false && back.pick === false, `Q59: back in Light, Layout's derived line is gone and its controls are editable (${JSON.stringify(back)})`);
    ok(errors.length === 0, `Layout derived: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S10 derived modes: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 24. Shape (S7): the two panes, Density, Radius and Base radius represented once each; the preview's Density, Radius,
//     Spacing and Building blocks on the brand's page color, drawn in the brand's own roles (D2); the approved copy and
//     the Q23 pairs; the previewed mode (Q22) with Auto following LIGHT, a custom mode included (scope finding 7);
//     brand-wide values from any mode (Q54); every control held in a derived mode with the preview still drawn (Q59);
//     D6's height labels; the retired hairline switch gone (#2053); the routes by tab; the plugin reaching the Button
//     options through the Pages menu (D4 B) under "Size & radius" (D5 B); and the chrome on Shape.
//
//     Independence (docs/34): the lever keys, the hooks, the copy, the pairs, the expected writes and the button sizes
//     are literals typed here from the owner's decisions and the legacy page's bytes; the page colors, the sample roles
//     and the heights come from the committed emission; every write is read back from the PERSISTED brand.
//
//     Mutations this fails by name: the base radius row dropped from `domains/shape.ts` → `Shape: every lever pages.ts
//     places renders once — missing lever-base-md …`; a Dark radius softness edit written to Light → `previewing Dark, a
//     radius softness edit writes modeLevers.dark.radius and not the brand value …`; Auto naming a custom mode's base →
//     `a custom mode based on Dark, on Auto, says it follows Light …`; the samples painted on the studio's gray →
//     `D2: … every radius sample is filled with the brand's foreground.secondary …`; D6's label dropped → `D6: … the
//     Medium button height reads "Medium button · 44px" …`; the hairline switch drawn back → `#2053: … no Hairline radius
//     switch …`.
// =============================================================================================
console.log(`\nShape (S7)\n${'='.repeat(78)}`);
/** The lever keys the owner's D1 A places on Shape, by hook (represented, not counted). `radiusHairline` is retired. */
const SHAPE_LEVERS = ['lever-density', 'lever-radius-scale', 'lever-control-shape', 'lever-base-md'];
/** The preview's sections, in order (D1 A). Literal. */
const EXPECT_SHAPE_SPECIMENS = ['Density', 'Radius', 'Spacing', 'Building blocks'];
/** Q23: each lever section, in order, and the preview section it pairs with (Base radius with Radius, D1 A). */
const SHAPE_PAIRS = [['Density', 'Density'], ['Radius', 'Radius'], ['Base radius', 'Radius']];
/** The approved copy (owner, 2026-10-04), verbatim. */
const SHAPE_COPY = {
  intro: 'Control heights and corners. Padding is set per component.',
  Density: 'How tall controls are. Each component sets its own padding.',
  Radius: 'How round corners are, and the shape of buttons and other pill-able controls.',
  densityMode: 'Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only.',
  spacing: 'The 8px rhythm is the same for every brand. Steps below 8px are for fine adjustments.',
  blocks: 'Fixed sizes every brand shares: border widths, icon sizes and the 4px grid.',
  usedByNone: 'No component uses this yet.',
  padding: 'Padding is set per component.', paddingLink: 'See Components',
  next: 'Continue to Depth & motion',
};
/** The Button definition's three sizes and the control heights they bind (D6). Literal. */
const BUTTON_HEIGHTS = [['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']];
/** A role's hex per mode, from the committed emission (the same reading as `EMITTED`, for any role). */
const EMITTED_ROLE = (() => {
  const out = join(REPO, 'packages/engine/out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const leafAt = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
  const trees = {};
  const withOverlay = (mode) => {
    if (mode === 'light') return base;
    if (trees[mode]) return trees[mode];
    const t = structuredClone(base);
    const ov = JSON.parse(readFileSync(join(out, `prism3.${mode}.overlay.tokens.json`), 'utf8'));
    const put = (src, dst) => { for (const [k, v] of Object.entries(src)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) dst[k] = v; else put(v, dst[k] ??= {}); } };
    put(ov, t);
    return (trees[mode] = t);
  };
  const resolve = (tree, path, seen = 0) => {
    const v = leafAt(tree, path)?.$value;
    if (typeof v !== 'string' || seen > 20) return null;
    const m = /^\{(.+)\}$/.exec(v);
    return m ? resolve(tree, m[1], seen + 1) : v.toLowerCase();
  };
  return (role, mode) => resolve(withOverlay(mode), `${root}.color.${role}`);
})();
const shapeRgb = (hx) => (hx ? `rgb(${parseInt(hx.slice(1, 3), 16)}, ${parseInt(hx.slice(3, 5), 16)}, ${parseInt(hx.slice(5, 7), 16)})` : null);
ok(['foreground.secondary', 'border.primary'].every((r) => /^#[0-9a-f]{6}$/.test(EMITTED_ROLE(r, 'light') ?? '') && /^#[0-9a-f]{6}$/.test(EMITTED_ROLE(r, 'dark') ?? '')),
  `the oracle resolves foreground.secondary and border.primary in Light and Dark from the emission (${['light', 'dark'].map((m) => `${EMITTED_ROLE('foreground.secondary', m)}/${EMITTED_ROLE('border.primary', m)}`).join(', ')})`);
/** The emission's control height for a size step, in px (Light; the default theme sets no per-mode density). */
const HEIGHT_PX = (step) => OUT[OUT_ROOT]?.size?.[step]?.height?.$extensions?.prism3?.px;
/** Open the page's Show advanced, so Base radius is drawn. */
const openShapeAdvanced = async (page) => {
  await hooks.need(page, '[data-p3="shape-advanced"]');
  if ((await page.locator('[data-p3="shape-advanced"]').getAttribute('aria-expanded')) !== 'true') await hooks.click(page.locator('[data-p3="shape-advanced"]'));
  await hooks.need(page, '[data-p3="lever-base-md"]');
};
// Specimen grounds, Q24's gray containers and D2's sample colors: both hosts, both themes, every mode.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'shape');
      await hooks.need(page, '[data-p3="shape-style-guide"]');
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await chooseMode(page, mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await sectionGrounds(page, 'shape-style-guide');
        const want = EMITTED[mode];
        for (const name of EXPECT_SHAPE_SPECIMENS) {
          const r = g.roots.find((x) => x.name === name);
          ok(!!r && r.root && r.ground === want, `specimen ground: shape ${where}: ${name} is a specimen root on background.primary ${want}${
            !r ? ' — not drawn' : !r.root ? ` — not a specimen root, on ${r.ground === g.card ? `the chrome card (${r.ground})` : r.ground}` : r.ground !== want ? ` — ${r.ground === g.card ? `is the chrome card (${r.ground})` : `is ${r.ground}`}` : ''}`);
        }
        const unlisted = g.roots.filter((x) => !EXPECT_SHAPE_SPECIMENS.includes(x.name)).map((x) => x.name);
        ok(unlisted.length === 0, `specimen ground: shape ${where}: every section ground drawn is a listed specimen${unlisted.length ? ` — unlisted ${unlisted.join(', ')}` : ''}`);
        const offGray = g.sections.filter((x) => x.bg !== LEVERS_GRAY).map((x) => `${x.name} on ${x.bg}`);
        ok(g.sections.length >= EXPECT_SHAPE_SPECIMENS.length && offGray.length === 0,
          `Q24 section containers: shape ${where}: every section container is the levers panel's gray ${LEVERS_GRAY} (${g.sections.length} read)${offGray.length ? ` — ${offGray.join(', ')}` : ''}`);
        // D2 A: every radius sample and control-shape sample is drawn in the brand's own roles for the mode.
        const fill = shapeRgb(EMITTED_ROLE('foreground.secondary', mode)), edge = shapeRgb(EMITTED_ROLE('border.primary', mode));
        const sw = await page.evaluate(() => [...document.querySelectorAll('[data-p3="shape-style-guide"] :is([data-p3="radius-row"] .shp-sw, [data-p3="control-shape"] .shp-bar)')]
          .map((n) => ({ bg: getComputedStyle(n).backgroundColor, edge: getComputedStyle(n).borderTopColor })));
        const off = sw.filter((x) => x.bg !== fill || x.edge !== edge);
        ok(sw.length >= 14 && off.length === 0, `D2: shape ${where}: every radius sample is filled with the brand's foreground.secondary (${fill}) and edged with border.primary (${edge}) for the mode (${sw.length} read)${off.length ? ` — ${JSON.stringify(off.slice(0, 2))}` : ''}`);
      }
    } catch (e) {
      ok(false, `S7 specimen grounds ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
// Represented, on both hosts: each lever once, the hairline switch gone, the copy and the pairs, D6's labels, the plain
// words, and the radius sizes drawn from the ladder (the container sizes and the 1px hairline included, #1881, #2053).
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'shape');
    await openShapeAdvanced(page);
    const r = await page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const pv = document.querySelector('[data-p3="shape-style-guide"]');
      return {
        levers: [...pane.querySelectorAll('[data-p3^="lever-"]')].map((n) => n.getAttribute('data-p3')).filter((k) => k !== 'lever-info' && k !== 'lever-section'),
        intro: pane.querySelector('.p3-intro')?.textContent ?? null,
        lsec: [...pane.querySelectorAll('[data-p3="lever-section"]')].map((x) => [x.querySelector('.p3-lsec-title')?.textContent ?? null, x.querySelector('.p3-lsec-desc')?.textContent ?? null]),
        psec: [...pv.querySelectorAll('.psec')].map((x) => [x.querySelector('.psec-t')?.textContent ?? null, x.querySelector('.psec-d')?.textContent ?? null]),
        hairline: { block: [...pane.querySelectorAll('[data-p3^="lever-"]')].filter((n) => /hairline/.test(n.getAttribute('data-p3'))).length, switches: pane.querySelectorAll('[role="switch"]').length, words: /hairline radius/i.test(pane.textContent) },
        radius: [...pv.querySelectorAll('[data-p3="radius-row"]')].map((x) => x.dataset.step),
        heights: Object.fromEntries([...pv.querySelectorAll('[data-p3="height-row"]')].map((x) => [x.dataset.step, x.querySelector('[data-p3="shape-row-label"]')?.textContent ?? null])),
        used: [...pv.querySelectorAll('[data-p3="radius-row"]')].map((x) => [x.dataset.step, x.querySelector('[data-p3="shape-row-used-by"]')?.textContent ?? null]),
        rlabels: [...pv.querySelectorAll('[data-p3="radius-row"]')].map((x) => [x.dataset.step, x.querySelector('[data-p3="shape-row-label"]')?.textContent ?? null]),
        shapes: [...pv.querySelectorAll('[data-p3="control-shape"]')].map((x) => [x.dataset.shape, x.getAttribute('aria-current')]),
        pad: [pane.querySelector('[data-p3="shape-padding"] .p3-sub')?.textContent ?? null, pane.querySelector('[data-p3="shape-see-components"]')?.textContent ?? null],
        next: pane.querySelector('[data-p3="shape-continue"]')?.textContent ?? null,
      };
    });
    const count = (k) => r.levers.filter((x) => x === k).length;
    const missing = SHAPE_LEVERS.filter((k) => count(k) !== 1).map((k) => `${k} ×${count(k)}`);
    const extra = [...new Set(r.levers.filter((k) => !SHAPE_LEVERS.includes(k)))];
    ok(missing.length === 0 && extra.length === 0, `Shape: every lever pages.ts places renders once (${SHAPE_LEVERS.length}, ${host})${missing.length ? ` — missing ${missing.join(', ')}` : ''}${extra.length ? ` — also drawn ${extra.join(', ')}` : ''}`);
    hooks.absent(ok, { seen: count('lever-control-shape') === 1, state: 'Shape\'s levers' }, r.hairline.block === 0 && r.hairline.switches === 0 && !r.hairline.words,
      `#2053: ${host}: Shape draws no Hairline radius switch (hairline lever blocks ${r.hairline.block}, switches ${r.hairline.switches}, words ${r.hairline.words})`);
    ok(r.intro === SHAPE_COPY.intro, `${host}: Shape's intro reads "${SHAPE_COPY.intro}" ("${r.intro}")`);
    ok(JSON.stringify(r.lsec.map(([t]) => t)) === JSON.stringify(SHAPE_PAIRS.map(([t]) => t)), `${host}: Shape's lever sections, in order: ${SHAPE_PAIRS.map(([t]) => t).join(', ')} — drew ${r.lsec.map(([t]) => t).join(', ')}`);
    ok(JSON.stringify(r.psec.map(([t]) => t)) === JSON.stringify(EXPECT_SHAPE_SPECIMENS), `${host}: Shape's preview sections, in order: ${EXPECT_SHAPE_SPECIMENS.join(', ')} — drew ${r.psec.map(([t]) => t).join(', ')}`);
    for (const [title, want] of SHAPE_PAIRS) {
      const lev = r.lsec.find(([t]) => t === title), pre = r.psec.find(([t]) => t === want);
      ok(!!lev && !!pre && (title !== want || lev[1] === pre[1]), `Q23: ${host}: the lever section "${title}" pairs with the preview's "${want}"${title === want ? ', one description on both sides' : ''} — levers ${JSON.stringify(lev)}, preview ${JSON.stringify(pre)}`);
      if (SHAPE_COPY[title]) ok(lev?.[1] === SHAPE_COPY[title], `${host}: "${title}" reads "${SHAPE_COPY[title]}" (${JSON.stringify(lev?.[1])})`);
    }
    ok(r.psec.find(([t]) => t === 'Spacing')?.[1] === SHAPE_COPY.spacing && r.psec.find(([t]) => t === 'Building blocks')?.[1] === SHAPE_COPY.blocks,
      `${host}: the read-only Spacing and Building blocks sections carry the approved descriptions (${JSON.stringify(r.psec.slice(2))})`);
    ok(JSON.stringify(r.pad) === JSON.stringify([SHAPE_COPY.padding, SHAPE_COPY.paddingLink]) && r.next === SHAPE_COPY.next,
      `${host}: the way to Components reads "${SHAPE_COPY.padding} ${SHAPE_COPY.paddingLink}" and Continue "${SHAPE_COPY.next}" (${JSON.stringify(r.pad)}, "${r.next}")`);
    // The radius sizes are the emission's, all of them, in its order (#1881's container sizes and #2053's hairline).
    const emitted = Object.keys(OUT[OUT_ROOT]?.radius ?? {}).filter((k) => !k.startsWith('$'));
    ok(emitted.length >= 10 && JSON.stringify(r.radius) === JSON.stringify(emitted),
      `${host}: the Radius section draws every radius size the emission carries, in order (${emitted.join(', ')}) — drew ${r.radius.join(', ')}`);
    // #2078 (owner, 2026-10-04, per #1177): the pill sizes read "Pill", not "‹n›px · pill" (oracle: their names, literal).
    const pillRows = r.rlabels.filter(([s]) => s === 'round' || s === 'capsule');
    ok(pillRows.length === 2 && pillRows.every(([, l]) => l === 'Pill') && r.rlabels.filter(([s]) => s !== 'round' && s !== 'capsule').every(([, l]) => /^\d+(\.\d+)?px$/.test(l ?? '')),
      `#2078: ${host}: Radius labels radius.round and radius.capsule "Pill", and every other size its px (${r.rlabels.map(([s, l]) => `${s} "${l}"`).join(', ')})`);
    for (const [step, size] of BUTTON_HEIGHTS) {
      const want = `${size} button · ${HEIGHT_PX(step)}px`;
      ok(r.heights[step] === want, `D6: ${host}: the ${size} button height reads "${want}" (${JSON.stringify(r.heights[step])})`);
    }
    ok(r.used.find(([s]) => s === 'md')?.[1]?.includes('Button') && r.used.find(([s]) => s === 'xl')?.[1] === SHAPE_COPY.usedByNone,
      `${host}: "used by" names Button on radius.md under the default Control shape, and the fallback "${SHAPE_COPY.usedByNone}" where nothing binds a size (${JSON.stringify(r.used.slice(2, 5))})`);
    ok(JSON.stringify(r.shapes) === JSON.stringify([['boxed', null], ['hairline', null], ['rounded', 'true'], ['pill', null]]), `${host}: the four control shapes, Rounded marked current (${JSON.stringify(r.shapes)})`);
    // D16 and E2's plain words: no "ramp", "ladder", "face", "band", "rung", "muted" or "column" in Shape's visible copy,
    // and "Radius" (not "Corners") in the headings. Token pills taken out.
    const PLAIN = /\b(ramps?|ladders?|faces?|bands?|rungs?|muted|columns?)\b/i;
    const words = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const out = [];
      for (const root of [document.querySelector('[data-p3="levers-pane"]'), document.querySelector('[data-p3="preview-body"]')]) {
        const c = root.cloneNode(true);
        for (const t of c.querySelectorAll('[data-p3="token-pill"], .p3-fill-tok')) t.remove();
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (re.test(n.textContent)) out.push(n.textContent.trim().slice(0, 80));
        for (const e of c.querySelectorAll('[aria-label], [title], [placeholder]')) for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute(a); if (v && re.test(v)) out.push(`${a} "${v.slice(0, 80)}"`); }
      }
      return out;
    }, PLAIN.source);
    ok(words.length === 0, `D16: ${host}: no "ramp", "ladder", "face", "band", "rung", "muted" or "column" in Shape's visible copy${words.length ? ` — found ${words.slice(0, 4).map((x) => `"${x}"`).join(', ')}` : ''}`);
    ok(!r.lsec.concat(r.psec).some(([t]) => /corner/i.test(t ?? '')), `E2: ${host}: no Shape heading says "corner" (${JSON.stringify(r.lsec.concat(r.psec).map(([t]) => t))})`);
    ok(errors.length === 0, `${host} Shape levers: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S7 represented ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Edits (Q22): Light writes the brand value, the default included; previewing Dark, Density and Radius softness write
// modeLevers.dark.* and leave the brand value alone, shown as "Auto: follows Light (…)" until set, with Return to Auto;
// a custom mode based on Dark follows LIGHT on Auto; Control shape and Base radius write the same bytes from Dark as
// from Light (Q54). Each write read back from the PERSISTED brand.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'shape');
    await openShapeAdvanced(page);
    const view0 = (await previewView(page)).view;
    const p0 = await persisted(page);
    const chip = async (hk, want) => {
      await hooks.click(page.locator(`[data-p3="${hk}"]`));
      await page.waitForFunction((h) => document.querySelector(`[data-p3="${h}"]`)?.getAttribute('aria-checked') === 'true', hk, { timeout: 5000 }).catch(() => {});
      return want;
    };
    // Light: density, the default written back.
    await chip('density-choice-compact');
    ok((await persisted(page))?.density === 'compact', `shape: in Light, Compact writes density: compact (${(await persisted(page))?.density})`);
    await chip('density-choice-comfortable');
    const pc = await persisted(page);
    ok(pc?.density === 'comfortable' && JSON.stringify(pc) === JSON.stringify({ ...p0, density: 'comfortable' }), `shape: back to Comfortable writes density: comfortable, not unset (the legacy bytes) (${pc?.density})`);
    // Light: radius softness, by the keyboard.
    await page.locator('[data-p3="radius-scale-slider"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[data-p3="radius-scale-slider"]')?.value === '1.5', null, { timeout: 5000 }).catch(() => {});
    ok((await persisted(page))?.radiusScale === 1.5, `shape: in Light, ArrowRight on radius softness writes radiusScale: 1.5 (${(await persisted(page))?.radiusScale})`);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('[data-p3="radius-scale-slider"]')?.value === '1', null, { timeout: 5000 }).catch(() => {});
    const focusKept = await page.evaluate(() => document.activeElement?.getAttribute('data-p3'));
    ok(focusKept === 'radius-scale-slider', `shape: the slider keeps its focus through its own edits (focus on ${focusKept})`);
    const pL = await persisted(page);
    // Light: Control shape, then Base radius through its picker; their bytes noted, then undone.
    await chip('control-shape-choice-pill');
    const pShape = await persisted(page);
    ok(pShape?.controlShape === 'pill', `shape: Pill writes controlShape: pill (${pShape?.controlShape})`);
    await chip('control-shape-choice-rounded');
    await hooks.click(page.locator('[data-p3="base-radius-pick"]'));
    await hooks.click(page.locator('[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="6"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="base-radius-pick"] .p3-btn-label')?.textContent === '6px', null, { timeout: 5000 }).catch(() => {});
    const pBase = await persisted(page);
    ok(pBase?.baseMd === 6, `shape: the Base radius picker's 6px writes baseMd: 6 (${pBase?.baseMd})`);
    const md6 = await page.evaluate(() => document.querySelector('[data-p3="shape-style-guide"] [data-p3="radius-row"][data-step="md"] [data-p3="shape-row-label"]')?.textContent);
    ok(md6 === `${6 * (p0?.radiusScale ?? 1)}px`, `shape: the preview's radius.md follows the base radius at once (${md6})`);
    await page.keyboard.press('Escape');
    // Dark.
    await chooseMode(page, 'dark');
    const auto = await page.evaluate(() => ({ d: document.querySelector('[data-p3="density-auto"]')?.textContent ?? null, r: document.querySelector('[data-p3="radius-scale-auto"]')?.textContent ?? null,
      line: document.querySelector('[data-p3="shape-density-mode"]')?.textContent ?? null }));
    ok(auto.d === 'Auto: follows Light (Comfortable)' && auto.r === 'Auto: follows Light (1.0 · standard)', `Q22: previewing Dark, Density and Radius softness read Auto, following Light (${JSON.stringify(auto)})`);
    ok(auto.line === SHAPE_COPY.densityMode, `previewing Dark, the Density lever keeps the decided sentence ("${auto.line}")`);
    await chip('density-choice-spacious');
    const p1 = await persisted(page);
    ok(p1?.modeLevers?.dark?.density === 'spacious' && p1?.density === pBase?.density,
      `previewing Dark, a density edit writes modeLevers.dark.density and not the brand value — wrote modeLevers ${JSON.stringify(p1?.modeLevers)}, density ${JSON.stringify(p1?.density)}`);
    const darkMd = await page.evaluate(() => document.querySelector('[data-p3="shape-style-guide"] [data-p3="height-row"][data-step="md"] [data-p3="shape-row-label"]')?.textContent);
    ok(darkMd === 'Medium button · 56px', `previewing Dark at Spacious, the preview's Medium button reads 56px (${darkMd})`);
    await page.locator('[data-p3="radius-scale-slider"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !!document.querySelector('[data-p3="radius-scale-reset"]'), null, { timeout: 5000 }).catch(() => {});
    const p2 = await persisted(page);
    ok(p2?.modeLevers?.dark?.radius === 1.5 && p2?.radiusScale === pBase?.radiusScale,
      `previewing Dark, a radius softness edit writes modeLevers.dark.radius and not the brand value — wrote modeLevers ${JSON.stringify(p2?.modeLevers)}, radiusScale ${JSON.stringify(p2?.radiusScale)}`);
    // Brand-wide from Dark (Q54): Control shape writes the same bytes as from Light.
    await chip('control-shape-choice-pill');
    ok((await persisted(page))?.controlShape === 'pill' && JSON.stringify((await persisted(page))?.modeLevers) === JSON.stringify(p2?.modeLevers), 'Q54: previewing Dark, Pill writes controlShape: pill and no per-mode value');
    await chip('control-shape-choice-rounded');
    await hooks.click(page.locator('[data-p3="density-reset"]'));
    await hooks.click(page.locator('[data-p3="radius-scale-reset"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="radius-scale-auto"]'), null, { timeout: 5000 }).catch(() => {});
    ok(JSON.stringify(await persisted(page)) === JSON.stringify({ ...pBase, controlShape: 'rounded' }), 'Q22: Return to Auto on both prunes modeLevers: the persisted brand is the one before Dark');
    // A custom mode based on Dark, with Dark's own density set: on Auto it follows LIGHT, not Dark (scope finding 7).
    await chip('density-choice-compact');
    await goPlace(page, 'brand');
    await hooks.click(page.locator('[data-p3="custom-mode-add"]'));
    await hooks.need(page, '[data-p3="custom-mode-base"]');
    await page.locator('[data-p3="custom-mode-base"]').last().selectOption('dark');
    const custom = await page.evaluate(() => [...document.querySelectorAll('[data-p3="custom-mode-name"]')].pop()?.value);
    await goPlace(page, 'shape');
    const cm = (await persisted(page))?.customModes?.at(-1)?.name ?? custom;
    await chooseAnyMode(page, cm);
    const ca = await page.evaluate(() => document.querySelector('[data-p3="density-auto"]')?.textContent ?? null);
    ok(ca === 'Auto: follows Light (Comfortable)', `a custom mode based on Dark, on Auto, says it follows Light, not Dark's Compact (${cm}: "${ca}")`);
    ok((await previewView(page)).view === view0, `V1 edit: Shape's edits never move the preview's home (${view0})`);
    ok(errors.length === 0, `shape edits: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S7 Shape edits: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Q59: in each derived mode every control on Shape is disabled, the advanced one included, under the derived line, and
// the preview is still drawn. Enumerated from the DOM: every button and input in a lever section but the info toggletips
// and the way to Components (it only navigates).
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'brand');
    await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="mode-option"][data-mode="wireframe"], [data-p3="mode-select"] option[value="wireframe"]'));
    await goPlace(page, 'shape');
    await openShapeAdvanced(page);
    for (const [mode, label] of [['hc-light', 'HC light'], ['hc-dark', 'HC dark'], ['wireframe', 'Wireframe']]) {
      await chooseAnyMode(page, mode);
      await page.waitForFunction((l) => document.querySelector('[data-p3="shape-derived"]')?.textContent?.startsWith(l), label, { timeout: 5000 }).catch(() => {});
      const d = await page.evaluate(() => {
        const pane = document.querySelector('[data-p3="levers-pane"]');
        const ctls = [...pane.querySelectorAll('[data-p3="lever-section"] :is(button, select, input)')].filter((n) => !n.matches('[data-p3="lever-info"], [data-p3="shape-see-components"]'));
        return { n: ctls.length, enabled: ctls.filter((n) => !n.disabled).map((n) => n.getAttribute('data-p3') ?? n.tagName), hooks: [...new Set(ctls.map((n) => n.getAttribute('data-p3')))],
          line: document.querySelector('[data-p3="shape-derived"]')?.textContent ?? null,
          preview: [...document.querySelectorAll('[data-p3="shape-style-guide"] .psec-t')].map((t) => t.textContent),
          radius: [...document.querySelectorAll('[data-p3="shape-style-guide"] [data-p3="radius-row"]')].map((r) => [r.dataset.step, r.querySelector('[data-p3="shape-row-label"]')?.textContent ?? null,
            r.querySelector('.shp-sw')?.style.borderRadius ?? null]) };
      });
      ok(d.line === `${label} is auto-derived — read-only. Edit Light or Dark and it follows.`, `Q59: previewing ${label}, the derived line shows on Shape ("${d.line}")`);
      ok(d.n >= 9 && d.enabled.length === 0, `Q59: previewing ${label}, every control on Shape is disabled, Base radius included (${d.n - d.enabled.length}/${d.n})${d.enabled.length ? ` — enabled ${[...new Set(d.enabled)].join(', ')}` : ''}`);
      for (const hk of ['density-choice-compact', 'radius-scale-slider', 'control-shape-choice-pill', 'base-radius-pick']) ok(d.hooks.includes(hk), `Q59: previewing ${label}, the ${hk} control on Shape is among those held disabled`);
      ok(JSON.stringify(d.preview) === JSON.stringify(EXPECT_SHAPE_SPECIMENS), `Q59: previewing ${label}, the Shape preview is still drawn (${d.preview.join(', ')})`);
      // Every size is drawn at 0px, as the emission draws wireframe; the two pill sizes still read "Pill" (#2078: the
      // label is which size it is, not its px).
      if (mode === 'wireframe') ok(d.radius.length >= 10 && d.radius.every(([step, label, br]) => br === '0px' && label === (['round', 'capsule'].includes(step) ? 'Pill' : '0px')),
        `previewing Wireframe, every radius size is drawn at 0px, as the emission draws wireframe, and reads 0px but for the two pill sizes, which read "Pill" (${d.radius.map(([s, l, b]) => `${s} "${l}" ${b}`).join(', ')})`);
    }
    ok(errors.length === 0, `shape derived: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S7 derived modes: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// The routes by tab, on both hosts: Continue lands on Depth & motion's page; See Components lands on the Components tab,
// its own two panes on both hosts since S8.2 (D4 B's Pages menu route to "Size & radius" retired with that page). Type's
// Continue lands on Shape's levers.
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'type');
    await hooks.click(page.locator('[data-p3="type-continue"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'shape', null, { timeout: 5000 }).catch(() => {});
    const t = await page.evaluate(() => ({ place: document.querySelector('[data-p3="frame"]')?.dataset.place, levers: !!document.querySelector('[data-p3="shape-levers"]') }));
    ok(t.place === 'shape' && t.levers, `${host}: Type's Continue opens Shape's levers (${JSON.stringify(t)})`);
    await hooks.click(page.locator('[data-p3="shape-continue"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'depth', null, { timeout: 5000 }).catch(() => {});
    // S9.2 moved Depth & motion into the two panes: the tab is its own page now, and no legacy page shows.
    const c = await page.evaluate(() => ({ place: document.querySelector('[data-p3="frame"]')?.dataset.place, shows: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage ?? null, levers: !!document.querySelector('[data-p3="depth-levers"]') }));
    ok(c.place === 'depth' && c.shows === null && c.levers, `${host}: "Continue to Depth & motion" opens the Depth & motion tab's levers (${JSON.stringify(c)})`);
    await goPlace(page, 'shape');
    await hooks.click(page.locator('[data-p3="shape-see-components"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="components-levers"]'), null, { timeout: 5000 }).catch(() => {});
    const s = await page.evaluate(() => ({ place: document.querySelector('[data-p3="frame"]')?.dataset.place, shows: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage ?? null,
      buttons: !!document.querySelector('[data-p3="components-levers"] [data-p3="lever-button-icons"]') }));
    ok(s.place === 'components' && s.shows === null && s.buttons, `${host}: See Components opens the Components tab, where the Button options are (${JSON.stringify(s)})`);
    if (host === 'figma') {
      // The plugin's Pages menu holds the Style guide alone: Size & radius (D4 B, D5 B) left with the Button options.
      await hooks.click(page.locator('[data-p3="pages-menu"]'));
      const rows = await page.evaluate(() => [...document.querySelectorAll('[data-p3^="rail-page-"]')].map((n) => n.getAttribute('data-p3')));
      await hooks.click(page.locator('[data-p3="pages-menu"]'));
      ok(JSON.stringify(rows) === '["rail-page-style-guide"]', `G19, S8.2: the plugin's Pages menu offers the Style guide alone (${JSON.stringify(rows)})`);
    }
    ok(errors.length === 0, `${host} Shape routes: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S7 routes ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// QA-B9: an edit on Shape eases the preview to the section its lever section pairs with (Q23): Density to Density,
// radius softness to Radius, and Base radius to Radius too (D1 A). From the preview's far end, so each reveal moves.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'shape');
    await openShapeAdvanced(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reveal = async (what, act, want) => {
      await page.evaluate(() => { const b = document.querySelector('[data-p3="preview-body"]'); b.scrollTop = b.scrollHeight; });
      await act();
      await page.waitForTimeout(120);
      const s = await page.evaluate((t) => {
        const body = document.querySelector('[data-p3="preview-body"]');
        const head = [...body.querySelectorAll('[data-p3="section-title"]')].find((n) => n.textContent === t);
        const b = body.getBoundingClientRect(), r = head?.closest('.psec')?.getBoundingClientRect();
        return { found: !!r, rel: r ? Math.round(r.top - b.top) : null, inView: !!r && r.top >= b.top - 1 && r.top < b.bottom - 40, place: document.querySelector('[data-p3="frame"]')?.dataset.place };
      }, want);
      ok(s.found && s.inView && s.place === 'shape', `QA-B9: editing ${what} on Shape brings the preview's ${want} section into view, on the same page (${JSON.stringify(s)})`);
    };
    await reveal('Density', () => hooks.click(page.locator('[data-p3="density-choice-compact"]')), 'Density');
    await reveal('radius softness', async () => { await page.locator('[data-p3="radius-scale-slider"]').focus(); await page.keyboard.press('ArrowRight'); }, 'Radius');
    await reveal('Base radius', async () => { await hooks.click(page.locator('[data-p3="base-radius-pick"]')); await hooks.click(page.locator('[data-p3="value-picker"] [data-p3="value-picker-value"][data-value="8"]')); }, 'Radius');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    ok(errors.length === 0, `shape reveal: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S7 reveal: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// The chrome on Shape: both hosts, both themes, 1280, 640 and 380 (the Settings pane, then the Preview pane when
// narrow). Continue is the filled primary button (QA-I12).
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors } = await open({ host, theme, w, h });
      try {
        await goPlace(page, 'shape');
        const where = `${host} ${theme} ${w} / shape`;
        const narrow = w <= 560;
        const m = await measure(page, where, host, w);
        check(m, where, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR);
        if (w === 1280) {
          const n = await page.evaluate(() => { const b = document.querySelector('[data-p3="shape-continue"]'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, ink: getComputedStyle(b.querySelector('span')).color }; });
          ok(n.bg === STYLE.fill[theme] && n.ink === STYLE.ink[theme], `QA-I12: ${where}: Continue is the filled primary button (${JSON.stringify(n)})`);
        }
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s7-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
        if (narrow) {
          await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
          const mp = await measure(page, `${where} / preview`, host, w);
          check(mp, `${where} / preview`, columnOf(host, w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: 'preview' });
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `S7 chrome ${host} ${theme} ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 26. Components (S8.2): moved to the two panes on both hosts. The Button options represented once each (G6 A), the way
//     to Shape › Density, the preview's Button specimen in the brand's action colors on its page (G7 A) and the
//     Component sets list (G5 A) on the brand's page; the copy and the Q23 pairs; Q59 in the derived modes; the edit's
//     reveal (QA-B9); the web drawing no build control and no Figma menu (G5 A), the plugin a Build button for the chosen
//     set (G2 A); Set up file nowhere on the page (G8 A); no "Internal" or "experimental" (G3 A); the web's Pages menu
//     gone (G19 A); and the chrome on Components.
//
//     Independence (docs/34): the lever keys, the hooks, the section titles, the copy and the expectations are literals
//     typed here; the page and action colors come from the committed emission; the set list is held to the committed
//     component docs (`packages/engine/out/components/*.md`, one per definition), never to the catalog the page reads.
//
//     Mutations this fails by name: the buttonMinWidthMultiplier row dropped from `domains/components.ts` →
//     `Components: every lever pages.ts places renders once — missing lever-button-min-width-multiplier ×0`; the web
//     drawing a Build button → `G5: web: the Components page draws no build control …`; "Build set…" left on the legacy
//     page key → section 10's `Figma menu …: Build set… opens the components tab and writes nothing — nothing opened`; Set
//     up file drawn on the page → `G8: … no Set up file control or words on the Components page …`.
// =============================================================================================
console.log(`\nComponents (S8.2)\n${'='.repeat(78)}`);
/** The lever keys pages.ts places on Components (G6 A), by hook. Literal. */
const COMPONENTS_LEVERS = ['lever-button-icons', 'lever-button-content-size', 'lever-button-label-weight', 'lever-button-min-width-multiplier'];
/** The lever sections and the preview sections they pair with (Q23), in order. Literal. */
const COMPONENTS_PAIRS = [['Button', 'Button'], ['Component sets', 'Component sets']];
/** The page's copy, approved by the owner (2026-10-05), verbatim. */
const COMPONENTS_COPY = {
  Button: 'How buttons place their icons, size their label and set their minimum width. Applies to buttons, not icon buttons.',
  'Component sets': 'Every component set the engine defines, with what each contains and its spacing at your density.',
  density: ['Density sets component heights and spacing.', 'Set it in Shape › Density'],
  web: 'Building sets needs the Figma plugin.',
  build: 'Build Button', busy: 'Building…',
  buildHint: "Builds any set it contains first, then switches Figma to the set's page.",
  orderHint: 'Apply Theme first, so the set can use your variables.',
};
/** The component definitions, by the committed per-definition docs (one `<id>.md` each). */
const DOC_SETS = readdirSync(join(REPO, 'packages/engine/out/components')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
ok(DOC_SETS.length >= 20 && DOC_SETS.includes('button'), `the oracle reads ${DOC_SETS.length} component definitions from the committed docs (floor 20)`);
// Specimen grounds, Q24's gray containers and G7's action colors: both hosts, both themes, every mode.
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await goPlace(page, 'components');
      await hooks.need(page, '[data-p3="components-style-guide"]');
      for (const [mode] of EXPECT_MODES) {
        if (host === 'figma' && mode.startsWith('hc')) continue;
        await chooseMode(page, mode);
        const where = `${host} ${theme} 1280, previewing ${mode}`;
        const g = await sectionGrounds(page, 'components-style-guide');
        const want = EMITTED[mode];
        for (const [, name] of COMPONENTS_PAIRS) {
          const r = g.roots.find((x) => x.name === name);
          ok(!!r && r.root && r.ground === want, `specimen ground: components ${where}: ${name} is a specimen root on background.primary ${want}${!r ? ' — not drawn' : !r.root ? ' — not a specimen root' : r.ground !== want ? ` — is ${r.ground}` : ''}`);
        }
        const offGray = g.sections.filter((x) => x.bg !== LEVERS_GRAY).map((x) => `${x.name} on ${x.bg}`);
        ok(g.sections.length >= 2 && offGray.length === 0, `Q24 section containers: components ${where}: every section container is the levers panel's gray ${LEVERS_GRAY}${offGray.length ? ` — ${offGray.join(', ')}` : ''}`);
        const fill = shapeRgb(EMITTED_ROLE('interactive.primary.fill.rest', mode)), ink = shapeRgb(EMITTED_ROLE('interactive.primary.on-fill', mode));
        const b = await page.evaluate(() => [...document.querySelectorAll('[data-p3="components-style-guide"] .btnl-btn')]
          .map((n) => ({ bg: getComputedStyle(n).backgroundColor, ink: getComputedStyle(n.querySelector('.btnl-label')).color })));
        const off = b.filter((x) => x.bg !== fill || x.ink !== ink);
        ok(b.length === 9 && off.length === 0, `G7: components ${where}: every button is filled with the brand's interactive.primary.fill.rest (${fill}) and labeled in interactive.primary.on-fill (${ink}) for the mode (${b.length} read)${off.length ? ` — ${JSON.stringify(off.slice(0, 2))}` : ''}`);
      }
    } catch (e) {
      ok(false, `S8.2 specimen grounds ${host} ${theme}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
// Represented, on both hosts: each lever once, the copy and the pairs, the set list against the committed docs, and the
// host's own build arm (G2, G5), Set up file nowhere (G8), no "Internal"/"experimental" (G3), the web's Pages menu gone.
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'components');
    await hooks.need(page, '[data-p3="components-levers"]');
    const r = await page.evaluate(() => {
      const pane = document.querySelector('[data-p3="levers-pane"]');
      const pv = document.querySelector('[data-p3="components-style-guide"]');
      const shown = (n) => !!n && n.getClientRects().length > 0;
      return {
        levers: [...pane.querySelectorAll('[data-p3^="lever-"]')].map((n) => n.getAttribute('data-p3')).filter((k) => k !== 'lever-info' && k !== 'lever-section'),
        intro: pane.querySelector('.p3-intro')?.textContent ?? null,
        lsec: [...pane.querySelectorAll('[data-p3="lever-section"]')].map((x) => [x.querySelector('.p3-lsec-title')?.textContent ?? null, x.querySelector('.p3-lsec-desc')?.textContent ?? null]),
        psec: [...pv.querySelectorAll('.psec')].map((x) => [x.querySelector('.psec-t')?.textContent ?? null, x.querySelector('.psec-d')?.textContent ?? null]),
        density: [pane.querySelector('[data-p3="components-density"] .p3-sub')?.textContent ?? null, pane.querySelector('[data-p3="components-density-link"]')?.textContent ?? null],
        sets: [...pv.querySelectorAll('[data-p3="component-set"]')].map((n) => n.dataset.set),
        offered: [...pv.querySelectorAll('[data-p3="component-set"]')].filter((n) => n.dataset.offered !== 'true').map((n) => n.dataset.set),
        build: [...document.querySelectorAll('[data-p3="components-build"]')].map((n) => [n.querySelector('[data-p3="label-idle"]')?.textContent ?? null, n.querySelector('[data-p3="label-busy"]')?.textContent ?? null]),
        radios: document.querySelectorAll('[data-p3="components-def-option"]').length,
        checked: document.querySelector('[data-p3="components-def-option"]:checked')?.value ?? null,
        webLines: [...document.querySelectorAll('[data-p3="components-web-line"], [data-p3="components-sets-web"]')].map((n) => n.textContent.trim()),
        hints: [document.querySelector('[data-p3="components-build-hint"]')?.textContent ?? null, document.querySelector('[data-p3="components-order-hint"]')?.textContent ?? null],
        figma: document.querySelectorAll('[data-p3^="figma-option-"], [data-p3="figma-open"]').length,
        pages: document.querySelectorAll('[data-p3="pages-menu"]').length,
        fileSetup: { controls: [pane, pv].flatMap((r) => [...r.querySelectorAll('button')]).filter((b) => /set up file/i.test(b.textContent ?? '')).length,
          words: /set up file/i.test(`${pane.textContent} ${pv.textContent}`) },
        internal: /\b(internal|experimental)\b/i.test(`${pane.textContent} ${pv.textContent}`),
        last: [...pv.querySelectorAll('[data-p3="component-set-last"]')].map((n) => n.textContent),
        shownSets: shown(pv.querySelector('[data-p3="component-sets"]')),
      };
    });
    const count = (k) => r.levers.filter((x) => x === k).length;
    const missing = COMPONENTS_LEVERS.filter((k) => count(k) !== 1).map((k) => `${k} ×${count(k)}`);
    const extra = [...new Set(r.levers.filter((k) => !COMPONENTS_LEVERS.includes(k)))];
    ok(missing.length === 0 && extra.length === 0, `Components: every lever pages.ts places renders once (${COMPONENTS_LEVERS.length}, ${host})${missing.length ? ` — missing ${missing.join(', ')}` : ''}${extra.length ? ` — also drawn ${extra.join(', ')}` : ''}`);
    ok(r.intro === `Button options, and the ${DOC_SETS.length} component sets the engine defines.`, `${host}: the intro counts the sets the engine defines (${DOC_SETS.length}, from the committed docs) — read "${r.intro}"`);
    ok(JSON.stringify(r.lsec.map(([t]) => t)) === JSON.stringify(COMPONENTS_PAIRS.map(([t]) => t)) && JSON.stringify(r.psec.map(([t]) => t)) === JSON.stringify(COMPONENTS_PAIRS.map(([, t]) => t)),
      `${host}: Components' lever sections and preview sections, in order: ${COMPONENTS_PAIRS.map(([t]) => t).join(', ')} — drew ${JSON.stringify(r.lsec.map(([t]) => t))} and ${JSON.stringify(r.psec.map(([t]) => t))}`);
    for (const [title, want] of COMPONENTS_PAIRS) {
      const lev = r.lsec.find(([t]) => t === title), pre = r.psec.find(([t]) => t === want);
      ok(!!lev && !!pre && lev[1] === pre[1] && lev[1] === COMPONENTS_COPY[title], `Q23: ${host}: "${title}" pairs with the preview's "${want}", one description on both sides, reading "${COMPONENTS_COPY[title]}" — levers ${JSON.stringify(lev)}, preview ${JSON.stringify(pre)}`);
    }
    ok(JSON.stringify(r.density) === JSON.stringify(COMPONENTS_COPY.density), `G6: ${host}: the way to Density reads "${COMPONENTS_COPY.density.join(' ')}" (${JSON.stringify(r.density)})`);
    ok(JSON.stringify([...r.sets].sort()) === JSON.stringify(DOC_SETS) && r.shownSets, `G5: ${host}: the Component sets list is every definition the engine documents (${DOC_SETS.length}) — listed ${r.sets.length}${JSON.stringify([...r.sets].sort()) === JSON.stringify(DOC_SETS) ? '' : `: ${r.sets.join(', ')}`}`);
    ok(r.offered.length === 0, `G4: ${host}: every set builds today, so none is listed as unavailable (${JSON.stringify(r.offered)}; the path is held on planted definitions in test-component-catalog.ts)`);
    if (host === 'web') {
      ok(r.build.length === 0 && r.radios === 0 && r.figma === 0, `G5: web: the Components page draws no build control — Build ${r.build.length}, set radios ${r.radios}, Figma menu items ${r.figma}`);
      ok(r.webLines.length === 2 && r.webLines.every((t) => t === COMPONENTS_COPY.web), `G5: web: the levers and the set list both say "${COMPONENTS_COPY.web}" (${JSON.stringify(r.webLines)})`);
      ok(r.last.length === 0, `G9: web: no set states a build result (${r.last.length})`);
      ok(r.pages === 0, `G19: web: the top bar draws no Pages menu, which has no page left to offer (${r.pages})`);
    } else {
      ok(r.build.length === 1 && r.build[0][0] === COMPONENTS_COPY.build && (r.build[0][1] ?? '').trim().endsWith(COMPONENTS_COPY.busy) && r.radios === DOC_SETS.length && r.checked === 'button',
        `G2: figma: the set list offers each set as a choice, Button chosen, and one Build button names it — ${JSON.stringify(r.build)}, ${r.radios} radios, checked ${r.checked}`);
      ok(JSON.stringify(r.hints) === JSON.stringify([COMPONENTS_COPY.buildHint, COMPONENTS_COPY.orderHint]), `G3: figma: the build's two plain facts read as approved (${JSON.stringify(r.hints)})`);
      ok(r.last.length === DOC_SETS.length && r.last.every((t) => t === 'Not built in this session'), `G9: figma: before any build, every set reads "Not built in this session" (${[...new Set(r.last)].join(', ')})`);
      ok(r.webLines.length === 0, `figma: no web line in the plugin (${JSON.stringify(r.webLines)})`);
      // Choosing another set renames the Build button, in place, keeping focus on the radio.
      await hooks.click(page.locator('[data-p3="components-def-option"][value="tag"]'));
      const ch = await page.evaluate(() => ({ label: document.querySelector('[data-p3="components-build"] [data-p3="label-idle"]')?.textContent, focus: document.activeElement?.getAttribute('data-p3'), value: document.activeElement?.value }));
      ok(ch.label === 'Build Tag' && ch.focus === 'components-def-option' && ch.value === 'tag', `G2: figma: choosing Tag renames the button "Build Tag", focus kept on the choice (${JSON.stringify(ch)})`);
    }
    ok(r.fileSetup.controls === 0 && !r.fileSetup.words, `G8: ${host}: no Set up file control or words on the Components page (controls ${r.fileSetup.controls}, words ${r.fileSetup.words})`);
    ok(!r.internal, `G3: ${host}: nothing on the Components page says "Internal" or "experimental"`);
    // D16's plain words: none of the retired terms in the visible copy, token pills taken out. "column" is for the grid.
    const PLAIN = /\b(faces?|bands?|rungs?|muted|columns?)\b/i;
    const words = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const out = [];
      for (const root of [document.querySelector('[data-p3="levers-pane"]'), document.querySelector('[data-p3="preview-body"]')]) {
        const c = root.cloneNode(true);
        for (const t of c.querySelectorAll('[data-p3="token-pill"], .p3-fill-tok')) t.remove();
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (re.test(n.textContent)) out.push(n.textContent.trim().slice(0, 80));
      }
      return out;
    }, PLAIN.source);
    ok(words.length === 0, `D16: ${host}: no "face", "band", "rung", "muted" or "column" in Components' visible copy${words.length ? ` — found ${words.slice(0, 4).map((x) => `"${x}"`).join(', ')}` : ''}`);
    ok(errors.length === 0, `${host} Components: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S8.2 represented ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// Q59: in each derived mode every control on Components is disabled but the info toggletips and the way to Shape (it only
// navigates), under the derived line; the preview is still drawn, the button specimen included.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'brand');
    await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));
    await page.waitForFunction(() => !!document.querySelector('[data-p3="mode-option"][data-mode="wireframe"], [data-p3="mode-select"] option[value="wireframe"]'));
    await goPlace(page, 'components');
    for (const [mode, label] of [['hc-light', 'HC light'], ['hc-dark', 'HC dark'], ['wireframe', 'Wireframe']]) {
      await chooseAnyMode(page, mode);
      await page.waitForFunction((l) => document.querySelector('[data-p3="components-derived"]')?.textContent?.startsWith(l), label, { timeout: 5000 }).catch(() => {});
      const d = await page.evaluate(() => {
        const pane = document.querySelector('[data-p3="levers-pane"]');
        const ctls = [...pane.querySelectorAll('[data-p3="lever-section"] :is(button, select, input)')].filter((n) => !n.matches('[data-p3="lever-info"], [data-p3="components-density-link"]'));
        return { n: ctls.length, enabled: ctls.filter((n) => !n.disabled).map((n) => n.getAttribute('data-p3') ?? n.tagName), hooks: [...new Set(ctls.map((n) => n.getAttribute('data-p3')))],
          link: !document.querySelector('[data-p3="components-density-link"]')?.disabled,
          line: document.querySelector('[data-p3="components-derived"]')?.textContent ?? null,
          preview: [...document.querySelectorAll('[data-p3="components-style-guide"] .psec-t')].map((t) => t.textContent),
          buttons: document.querySelectorAll('[data-p3="components-style-guide"] .btnl-btn').length };
      });
      ok(d.line === `${label} is auto-derived — read-only. Edit Light or Dark and it follows.`, `Q59: previewing ${label}, the derived line shows on Components ("${d.line}")`);
      ok(d.n >= 7 && d.enabled.length === 0 && d.link, `Q59: previewing ${label}, every control on Components is disabled (${d.n - d.enabled.length}/${d.n}), the way to Shape left live (${d.link})${d.enabled.length ? ` — enabled ${[...new Set(d.enabled)].join(', ')}` : ''}`);
      for (const hk of ['button-icons-choice-edges', 'button-content-size-choice-smaller', 'button-label-weight-choice-default', 'button-min-width-slider']) ok(d.hooks.includes(hk), `Q59: previewing ${label}, the ${hk} control on Components is among those held disabled`);
      ok(JSON.stringify(d.preview) === JSON.stringify(COMPONENTS_PAIRS.map(([, t]) => t)) && d.buttons === 9, `Q59: previewing ${label}, the Components preview is still drawn (${d.preview.join(', ')}; ${d.buttons} buttons)`);
      // #2096: the write itself is refused, not only the DOM's disabled flag. A scripted `input` on the disabled
      // minimum-width slider (which a disabled flag does not stop) leaves the persisted brand byte-identical. The value
      // is one the slider's range holds and the brand does not, so a write that got through would show.
      const before = await page.evaluate(() => localStorage.getItem('prism3:brandInput'));
      const slid = await page.evaluate(() => {
        const n = document.querySelector('[data-p3="button-min-width-slider"]');
        if (!n) return null;
        const v = Number(n.value) === 3.75 ? 3.5 : 3.75;
        n.value = String(v);
        n.dispatchEvent(new Event('input', { bubbles: true }));
        return v;
      });
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => localStorage.getItem('prism3:brandInput'));
      ok(slid !== null && before !== null && after === before,
        `#2096: previewing ${label}, a scripted input on the minimum-width slider writes nothing (prism3:brandInput byte-identical${slid === null ? ', slider not found' : after === before ? '' : `, buttonMinWidthMultiplier now ${JSON.parse(after ?? '{}')?.input?.buttonMinWidthMultiplier}`})`);
    }
    ok(errors.length === 0, `components derived: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S8.2 derived modes: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// QA-B9: an edit on Components eases the preview to the Button section, from the preview's far end. Brand-wide (Q54):
// previewing Dark, a chip writes the same key as from Light and no per-mode value.
{
  const { ctx, page, errors } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'components');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { const b = document.querySelector('[data-p3="preview-body"]'); b.scrollTop = b.scrollHeight; });
    await hooks.click(page.locator('[data-p3="button-icons-choice-edges"]'));
    await page.waitForTimeout(120);
    const s = await page.evaluate(() => {
      const body = document.querySelector('[data-p3="preview-body"]');
      const head = [...body.querySelectorAll('[data-p3="section-title"]')].find((n) => n.textContent === 'Button');
      const b = body.getBoundingClientRect(), r = head?.closest('.psec')?.getBoundingClientRect();
      return { found: !!r, inView: !!r && r.top >= b.top - 1 && r.top < b.bottom - 40, place: document.querySelector('[data-p3="frame"]')?.dataset.place };
    });
    ok(s.found && s.inView && s.place === 'components', `QA-B9: editing Button icons on Components brings the preview's Button section into view, on the same page (${JSON.stringify(s)})`);
    ok((await persisted(page))?.buttonIcons === 'edges', `components: Locked to edges writes buttonIcons: edges (${(await persisted(page))?.buttonIcons})`);
    await chooseMode(page, 'dark');
    await hooks.click(page.locator('[data-p3="button-label-weight-choice-default"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="button-label-weight-choice-default"]')?.getAttribute('aria-checked') === 'true', null, { timeout: 5000 }).catch(() => {});
    const pd = await persisted(page);
    ok(pd?.buttonLabelWeight === 'default' && !pd?.modeLevers, `Q54: previewing Dark, Default writes buttonLabelWeight: default and no per-mode value (${JSON.stringify({ w: pd?.buttonLabelWeight, modeLevers: pd?.modeLevers ?? null })})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    ok(errors.length === 0, `components reveal: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S8.2 reveal: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// C3 A (#2086): the build stamp moved from the foot of the Pages menu to the foot of the Inspect menu, in small text, on
// both hosts (the plugin showed it too). Oracle: the engine version read from `packages/engine/version.ts` here, as
// text, never the bundle's import; the stamp's words are #474's, unchanged.
//
// Mutations this fails by name: the stamp block removed from `inspectMenu` → `C3: <host>: the Inspect menu ends with
// the build stamp …`; the stamp left in the plugin's Pages menu as well → `C3: figma: the Pages menu no longer draws the
// build stamp …`.
const ENGINE_V = /export const ENGINE_VERSION = '([^']+)'/.exec(readFileSync(join(REPO, 'packages/engine/version.ts'), 'utf8'))?.[1] ?? null;
ok(ENGINE_V !== null, `C3: the oracle reads the engine version from packages/engine/version.ts (${ENGINE_V})`);
for (const host of ['web', 'figma']) {
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await goPlace(page, 'components');
    await hooks.click(page.locator('[data-p3="inspect-open"]'));
    await hooks.need(page, '[data-p3="inspect-menu"]');
    const s = await page.evaluate(() => {
      const menu = document.querySelector('[data-p3="inspect-menu"]');
      const st = menu?.querySelector('[data-p3="build-stamp"]');
      const item = menu?.querySelector('[data-p3^="inspect-option-"]');
      return {
        all: document.querySelectorAll('[data-p3="build-stamp"]').length,
        last: !!st && menu.lastElementChild === st,
        parts: st ? [...st.children].map((n) => n.textContent) : [],
        title: st?.title ?? '',
        small: st && item ? parseFloat(getComputedStyle(st).fontSize) < parseFloat(getComputedStyle(item).fontSize) : null,
        shown: !!st && st.getClientRects().length > 0,
      };
    });
    ok(s.all === 1 && s.last && s.shown && s.parts.length === 2 && s.parts[0] === `engine ${ENGINE_V}` && s.parts[1].trim().length > 0 && s.title.length > 0,
      `C3: ${host}: the Inspect menu ends with the build stamp, "engine ${ENGINE_V}" and the build chip, its title the full reading — ${JSON.stringify(s)}`);
    ok(s.small === true, `C3: ${host}: the stamp is smaller text than the menu's items (${s.small})`);
    await page.keyboard.press('Escape');
    if (host === 'figma') {
      await hooks.click(page.locator('[data-p3="pages-menu"]'));
      await hooks.need(page, '[data-p3="pages-menu-list"]');
      const inPages = await page.evaluate(() => document.querySelectorAll('[data-p3="pages-menu-list"] [data-p3="build-stamp"]').length);
      ok(inPages === 0, `C3: figma: the Pages menu no longer draws the build stamp (${inPages})`);
      await page.keyboard.press('Escape');
    }
    ok(errors.length === 0, `C3 ${host}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S8.2 C3 ${host}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// C4 A: in the plugin, the build bar ("Build ‹Name›" and its two hints) stays in view at the foot of the preview at any
// scroll position, and never covers the last set: at the end of the scroll the last set ends above it. Read at three
// scroll positions, wide and in the narrow Preview pane, by the browser's own hit test at the bar's center. Its focus
// order (the set's choice, then the Build button) and the Activity drawer over it still work.
//
// Mutations this fails by name: `position: sticky` dropped from `.p3-buildbar` → `C4: figma 1280 at the top: the build
// bar is in view …`.
for (const { w, h } of [{ w: 1280, h: 700 }, { w: 380, h: 700 }]) {
  const { ctx, page, errors } = await open({ host: 'figma', theme: 'light', w, h });
  try {
    await goPlace(page, 'components');
    if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
    await hooks.need(page, '[data-p3="components-row"]');
    const scrollable = await page.evaluate(() => { const b = document.querySelector('[data-p3="preview-body"]'); return b.scrollHeight - b.clientHeight; });
    ok(scrollable > 400, `C4: figma ${w}: the preview scrolls, so this check can mean something (${scrollable}px of scroll)`);
    for (const [at, f] of [['the top', 0], ['the middle', 0.5], ['the end', 1]]) {
      await page.evaluate((k) => { const b = document.querySelector('[data-p3="preview-body"]'); b.scrollTop = Math.round((b.scrollHeight - b.clientHeight) * k); }, f);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const g = await page.evaluate(() => {
        const body = document.querySelector('[data-p3="preview-body"]').getBoundingClientRect();
        const barN = document.querySelector('[data-p3="components-row"]');
        const bar = barN.getBoundingClientRect();
        const hit = document.elementFromPoint(bar.left + bar.width / 2, bar.top + bar.height / 2);
        const sets = document.querySelectorAll('[data-p3="component-set"]');
        const lastSet = sets[sets.length - 1].getBoundingClientRect();
        return { inView: bar.top >= body.top - 0.5 && bar.bottom <= body.bottom + 0.5 && bar.height > 0, onTop: !!hit && barN.contains(hit),
          bar: [Math.round(bar.top), Math.round(bar.bottom)], body: [Math.round(body.top), Math.round(body.bottom)], lastBottom: Math.round(lastSet.bottom),
          label: barN.querySelector('[data-p3="label-idle"]')?.textContent ?? null,
          hints: [...barN.querySelectorAll('[data-p3="components-build-hint"], [data-p3="components-order-hint"]')].length };
      });
      ok(g.inView && g.onTop && g.label === 'Build Button' && g.hints === 2,
        `C4: figma ${w} at ${at}: the build bar is in view at the foot of the preview and on top at its center, "Build Button" with its two hints — bar ${JSON.stringify(g.bar)} in ${JSON.stringify(g.body)}, on top ${g.onTop}, ${JSON.stringify(g.label)}, ${g.hints} hints`);
      if (f === 1) ok(g.lastBottom <= g.bar[0] + 0.5, `C4: figma ${w} at the end: the last set ends above the bar, not under it (set ends ${g.lastBottom}, bar starts ${g.bar[0]})`);
    }
    // Focus order: from the chosen set's radio, Tab reaches the Build button next.
    await page.locator('[data-p3="components-def-option"]:checked').focus();
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => document.activeElement?.getAttribute('data-p3') ?? null);
    ok(focus === 'components-build', `C4: figma ${w}: Tab from the chosen set reaches the Build button (on "${focus}")`);
    // The Activity drawer, opened, sits over the bar wherever the two meet.
    await hooks.click(page.locator('[data-p3="activity-open"]'));
    await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true', null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const d = await page.evaluate(() => {
      const dr = document.querySelector('[data-p3="activity-drawer"]');
      const a = dr.getBoundingClientRect(), b = document.querySelector('[data-p3="components-row"]').getBoundingClientRect();
      const x0 = Math.max(a.left, b.left), x1 = Math.min(a.right, b.right), y0 = Math.max(a.top, b.top), y1 = Math.min(a.bottom, b.bottom);
      if (x1 - x0 < 2 || y1 - y0 < 2) return { open: dr.dataset.open, overlap: false, onTop: true };
      const hit = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      return { open: dr.dataset.open, overlap: true, onTop: !!hit && dr.contains(hit) };
    });
    ok(d.open === 'true' && d.onTop, `C4: figma ${w}: the Activity drawer opens over the build bar, not under it (${JSON.stringify(d)})`);
    ok(errors.length === 0, `C4 figma ${w}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `S8.2 C4 figma ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}
// #2180 (owner QA, 2026-10-05): the build bar stands clear of the Activity drawer by the chrome's stacked-card gap,
// `space.300` (the `.p3-stack` gap), at 1280 and 380, the drawer closed (its strip, shown once an operation has run) and
// open, at the top, the middle and the end of the preview's scroll. THE ORACLE is `space.300` resolved here from the
// committed emission (`chrome/tokens.mjs`), never the page's `--p3-*` variable; the gap is read off the render, the
// drawer's top edge less the bar's bottom edge. At 380 the open drawer is the full-pane sheet (F2), which hides the
// panes: there the bar must not be drawn at all, so nothing can sit on the sheet.
//
// Mutation this fails by name: `.p3-buildbar`'s `bottom` back to 0 → `#2180: figma 1280, drawer closed, at the top:
// the build bar stands at least space.300 (24px) above the Activity drawer — gap 0 …`.
{
  const STACK_GAP = parseFloat(String(resolveToken(loadModes().light, P('space.300')).value));
  ok(STACK_GAP > 0, `#2180 oracle: space.300 resolves from the committed emission (${STACK_GAP}px)`);
  for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 700 }]) {
    for (const drawer of ['closed', 'open']) {
      const where = `#2180: figma ${w}, drawer ${drawer}`;
      const { ctx, page, errors } = await open({ host: 'figma', theme: 'light', w, h });
      try {
        const narrow = w <= 560;
        await goPlace(page, 'components');
        if (narrow) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        await hooks.need(page, '[data-p3="components-row"]');
        // An operation, so the closed drawer is its strip rather than hidden: the bar's own Build.
        await hooks.click(page.locator('[data-p3="components-build"]'));
        await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.ever === 'true', null, WAIT);
        const isOpen = () => page.evaluate(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true');
        if ((await isOpen()) !== (drawer === 'open')) await hooks.click(page.locator('[data-p3="activity-toggle"]'));
        await page.waitForFunction((want) => (document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true') === want, drawer === 'open', WAIT);
        if (narrow && drawer === 'closed' && await page.locator('[data-p3="pane-toggle-preview"]').isVisible()) {
          const onPreview = await page.evaluate(() => { const b = document.querySelector('[data-p3="components-row"]')?.getBoundingClientRect(); return !!b && b.height > 0; });
          if (!onPreview) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        }
        await settle(page);
        const GEOM = () => {
          const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let x = n; x && x.nodeType === 1; x = x.parentElement) if (getComputedStyle(x).display === 'none') return false; return true; };
          const bar = document.querySelector('[data-p3="components-row"]'), dr = document.querySelector('[data-p3="activity-drawer"]');
          return { barShown: vis(bar), drawerShown: vis(dr), barBottom: bar.getBoundingClientRect().bottom, drawerTop: dr.getBoundingClientRect().top };
        };
        if (narrow && drawer === 'open') {
          const g = await page.evaluate(GEOM);
          ok(g.drawerShown && !g.barShown, `${where}: the open drawer is the full-pane sheet and the build bar is not drawn on it (${JSON.stringify(g)})`);
        } else {
          for (const [at, f] of [['the top', 0], ['the middle', 0.5], ['the end', 1]]) {
            await page.evaluate((k) => { const b = document.querySelector('[data-p3="preview-body"]'); b.scrollTop = Math.round((b.scrollHeight - b.clientHeight) * k); }, f);
            await settle(page);
            const g = await page.evaluate(GEOM);
            const gap = g.drawerTop - g.barBottom;
            ok(g.barShown && g.drawerShown && gap >= STACK_GAP - ALIGN_TOLERANCE,
              `${where}, at ${at}: the build bar stands at least space.300 (${STACK_GAP}px) above the Activity drawer — gap ${gap.toFixed(1)} (bar shown ${g.barShown}, drawer shown ${g.drawerShown})`);
          }
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `${where}: the case stopped at a step that threw — ${stopped(e)}`);
      } finally { await ctx.close(); }
    }
  }
}
// The chrome on Components: both hosts, both themes, 1280, 640 and 380 (the Settings pane, then the Preview pane when
// narrow).
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors } = await open({ host, theme, w, h });
      try {
        await goPlace(page, 'components');
        const where = `${host} ${theme} ${w} / components`;
        const narrow = w <= 560;
        const m = await measure(page, where, host, w);
        check(m, where, columnOf(host, w), narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s82-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
        if (narrow) {
          await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
          const mp = await measure(page, `${where} / preview`, host, w);
          check(mp, `${where} / preview`, columnOf(host, w), { ...PLACE_FLOOR, controls: 6, text: 4, fonts: 4 }, { state: 'preview' });
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `S8.2 chrome ${host} ${theme} ${w}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 29. S13.1 (owner decisions G18 A, N-2 A): the top bar's last old-code pieces in the new chrome — the brand menu,
//     Export's dialog and the error strip — on both hosts, both themes, at 1280, 640 and 380. Each is measured as
//     rendered with the probe every other section uses (text 4.5:1, edges and glyphs 3:1, targets, the embedded
//     face, no shadows, no inline values), and three things are held directly:
//   · THE ERROR STRIP takes the theme: its ground is dark in dark and light in light (luminance, a literal line,
//     0.2 and 0.5: #1031's light card in a dark frame is the case it refuses), it is full width, and it sits right
//     under the top bar. The web's refused edit is the test edit hook (`?p3-test-hooks`, entry.ts), the plugin's a
//     restore the engine refuses (`test-build-verdict.mjs` §#1989's brand).
//   · THE NARROW TIER: at 380 the brand menu stays inside the window (it scrolls rather than run off it, #432) and
//     the export dialog lays out one column; wide, two.
//   The menu, the keyboard and the dialog run first, on the example the column opened; the strip last, since the
//   plugin's refused restore loads a brand of its own.
//   · KEYBOARD ACCESS to the brand menu: Enter on the switcher opens it with focus on the current example; Arrow
//     Down, End and Home move between its items; Escape closes it back to the switcher. Escape closes the export
//     dialog back to Export.
//   · THE BAR (the owner's "A · Menu bar" decision, 2026-10-05), as rendered, on both hosts, both themes, every width:
//     the DOM order per host; no divider (no separator element, no edge on a non-control, no thin filled bar); the
//     brand switcher, Pages and Figma as white buttons with ▾; Contrast, Theme, Activity and Export as borderless tiles,
//     (Agent too, on the plugin: T7 A) their label shown above the narrow tier and dropped at it, their names unchanged, their tooltip drawn on hover;
//     Apply Theme the only filled control (none on the web); the web at 640 on one row; the plugin at 380 on two rows,
//     the file's actions on the second; and, at 1280 and 380, the top row's last control at the page content's right
//     edge within 1px (on the web, Export). 29b holds Contrast's mark per verdict and the plugin's Theme choice.
// =============================================================================================
console.log('\n29. S13.1: the brand menu, Export and the error strip in the chrome');
const S131_REFUSED = { root: 'rf', modes: ['light'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true },
  id: 'refused-brand', overrides: { light: { 'background.secondary': { palette: 'neutral', step: '200' } } } };
const DARK_GROUND_MAX = 0.2;
const LIGHT_GROUND_MIN = 0.5;
const BRAND_MENU_HOOKS = ['[data-p3="brand-menu-example"]', '[data-p3="brand-menu-new"]', '[data-p3="brand-menu-import"]', '[data-p3="import-text"]', '[data-p3="import-load"]'];
const EXPORT_HOOKS = ['[data-p3="export-artifact"]', '[data-p3="dialog-close"]', '[data-p3="dialog-cancel"]', '[data-p3="dialog-confirm"]'];
/** The strip, read directly: its ground (composited), its text and glyph against it, and where it sits. */
/** One node's text against the ground composited under it, as the strip probe reads it: the ratio, floored to 2 places. */
const INK_PROBE = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return { r: 0, text: '', ink: null };
  // rgb()/rgba(), and the `color(srgb …)` form a computed `color-mix()` comes back in: an ink this cannot read is a
  // ratio of 0, so the check that reads it fails by name rather than throwing.
  const parse = (s) => {
    const t = (s ?? '').trim();
    let m = /^rgba?\(([^)]+)\)$/.exec(t);
    if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = /^color\(srgb\s+([^)]+)\)$/.exec(t);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  let g = null;
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { g = g ? over(g, c) : c; if (g.a >= 0.999) break; } }
  g = g ? { ...g, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  const raw = getComputedStyle(e).color, ink = parse(raw);
  if (!ink) return { r: 0, text: e.textContent ?? '', ink: raw };
  const x = lum(over(ink, g)), y = lum(g);
  return { r: Math.floor(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100, text: e.textContent ?? '', ink: raw };
};
const STRIP_PROBE = () => {
  const e = document.querySelector('[data-p3="error-bar"]');
  if (!e) return { mounted: false };
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.floor(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
  let g = null;
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { g = g ? over(g, c) : c; if (g.a >= 0.999) break; } }
  g = g ? { ...g, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  const text = e.querySelector('.p3-errstrip-text');
  const ink = parse(getComputedStyle(text).color), glyphInk = parse(getComputedStyle(e.querySelector('svg')).color);
  const r = e.getBoundingClientRect(), bar = document.querySelector('[data-p3="top-bar"]').getBoundingClientRect();
  const frame = document.querySelector('[data-p3="frame"]').getBoundingClientRect();
  return { mounted: true, shown: !e.hidden && getComputedStyle(e).display !== 'none', text: text.textContent, groundLum: Math.round(lum(g) * 1000) / 1000,
    textR: ink ? ratio(over(ink, g), g) : 0, glyphR: glyphInk ? ratio(over(glyphInk, g), g) : 0,
    fullWidth: Math.abs(r.left - frame.left) <= 1 && Math.abs(r.right - frame.right) <= 1, underBar: Math.abs(r.top - bar.bottom) <= 1,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right)], barBottom: Math.round(bar.bottom) };
};
/** A modal dialog's Tab order, walked (#2124 review): its keyboard stops, read independently of the trap's own list
 *  (every drawn control, any `tabindex` of 0 or more, and every scroll region with no focusable inside it, which
 *  Chromium makes a stop), in document order; then Tab from the first stop around to it again, and Shift+Tab the same,
 *  recording each. Returns both walks and the expected order, by hook (or tag when unhooked). */
const tabWalk = async (page, role) => {
  const stops = await page.evaluate((r) => {
    const d = document.querySelector(`[data-p3="${r}"]`);
    const drawn = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
    const ctl = 'button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]';
    const all = [...d.querySelectorAll('*')].filter((n) => {
      if (!drawn(n)) return false;
      if (n.matches(ctl)) return !(n.hasAttribute('tabindex') && n.tabIndex < 0);
      const cs = getComputedStyle(n);
      const scrolls = /(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1);
      return scrolls && !n.querySelector(ctl);
    });
    all.forEach((n, i) => { n.dataset.tabstop = String(i); });
    return all.map((n) => n.getAttribute('data-p3') ?? n.tagName.toLowerCase());
  }, role);
  const here = () => page.evaluate(() => { const a = document.activeElement; return a?.dataset.tabstop ?? `out:${a?.getAttribute('data-p3') ?? a?.tagName}`; });
  await page.evaluate(() => document.querySelector('[data-tabstop="0"]')?.focus());
  const fwd = ['0'];
  for (let i = 0; i < stops.length + 2; i++) { await page.keyboard.press('Tab'); const h = await here(); if (h === '0') break; fwd.push(h); }
  await page.evaluate(() => document.querySelector('[data-tabstop="0"]')?.focus());
  const back = ['0'];
  for (let i = 0; i < stops.length + 2; i++) { await page.keyboard.press('Shift+Tab'); const h = await here(); if (h === '0') break; back.push(h); }
  const want = stops.map((_, i) => String(i));
  const wantBack = ['0', ...want.slice(1).reverse()];
  const name = (k) => (/^\d+$/.test(k) ? stops[Number(k)] : k);
  return { ok: JSON.stringify(fwd) === JSON.stringify(want) && JSON.stringify(back) === JSON.stringify(wantBack),
    fwd: fwd.map(name), back: back.map(name), stops, confirm: fwd.map(name).includes('dialog-confirm') };
};
/** The bar, read as rendered (the owner's "A · Menu bar", 2026-10-05). Colors are compared by resolving the chrome's
 *  own variables on a probe node, removed before anything else is read. */
const BAR_PROBE = () => {
  const bar = document.querySelector('[data-p3="top-bar"]');
  const q = (s) => bar.querySelector(`[data-p3="${s}"]`);
  const probe = document.createElement('span');
  bar.append(probe);
  const resolve = (v) => { probe.style.backgroundColor = `var(${v})`; return getComputedStyle(probe).backgroundColor; };
  const page = resolve('--p3-bg-page');
  probe.remove();
  const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c ?? ''); if (!m) return 1; const p = m[1].split(/[,\s/]+/).filter(Boolean); return p.length > 3 ? Number(p[3]) : 1; };
  const shown = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden'; };
  const all = [...document.querySelectorAll('*')];
  const HOOKS = ['product-mark', 'brand-switcher', 'verdict', 'theme-toggle', 'agent-toggle', 'activity-open', 'export-open', 'pages-menu', 'figma-open', 'apply-to-figma'];
  const order = HOOKS.filter((k) => q(k)).sort((a, b) => all.indexOf(q(a)) - all.indexOf(q(b)));
  // Dividers: a separator element, an edge on anything that is not a control, or a thin filled bar.
  const inside = (n) => n.closest('button, select, [role="menu"], .p3-menu, [role="dialog"], .p3-bardlg-scrim, .p3-tile-tip, .p3-seg');
  const dividers = [];
  for (const n of bar.querySelectorAll('*')) {
    if (!shown(n)) continue;
    if (n.matches('hr, [role="separator"]')) { dividers.push(`${n.tagName.toLowerCase()} separator`); continue; }
    if (inside(n) || n.matches('svg *')) continue;
    const cs = getComputedStyle(n), r = n.getBoundingClientRect();
    for (const side of ['Left', 'Right', 'Top', 'Bottom']) {
      if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none' && alpha(cs[`border${side}Color`]) > 0) dividers.push(`${n.getAttribute('data-p3') ?? n.className} border-${side.toLowerCase()}`);
    }
    if (((r.width <= 2 && r.height >= 8) || (r.height <= 2 && r.width >= 8)) && alpha(cs.backgroundColor) > 0) dividers.push(`${n.getAttribute('data-p3') ?? n.className} a ${Math.round(r.width)}×${Math.round(r.height)} bar`);
  }
  const chev = (b) => { const g = [...b.querySelectorAll('svg.p3-ico')].filter(shown).at(-1); return !!g && /M4 6l4 4 4-4/.test(g.innerHTML); };
  const white = ['brand-switcher', 'pages-menu', 'figma-open'].filter((k) => q(k)).map((k) => {
    const b = q(k), cs = getComputedStyle(b);
    return { k, bg: cs.backgroundColor === page, edge: parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle === 'solid' && alpha(cs.borderTopColor) > 0, chev: chev(b) };
  });
  const tiles = ['verdict', 'theme-toggle', 'agent-toggle', 'activity-open', 'export-open'].filter((k) => q(k)).map((k) => {
    const b = q(k), cs = getComputedStyle(b), lab = b.querySelector('.p3-tile-label'), tip = b.querySelector('.p3-tile-tip'), g = b.querySelector('.p3-tile-mark svg.p3-ico');
    return { k, borderless: ['Top', 'Right', 'Bottom', 'Left'].every((sd) => parseFloat(cs[`border${sd}Width`]) === 0 || alpha(cs[`border${sd}Color`]) === 0), clear: alpha(cs.backgroundColor) === 0,
      glyph: shown(g) && g.getAttribute('aria-hidden') === 'true', label: shown(lab) ? lab.textContent : null, labelHidden: lab?.getAttribute('aria-hidden') === 'true',
      name: b.getAttribute('aria-label'), tip: tip?.textContent ?? null, tipHidden: tip?.getAttribute('aria-hidden') === 'true' };
  });
  const buttons = [...bar.querySelectorAll('button')].filter((b) => shown(b) && !inside(b.parentElement ?? b));
  const filled = buttons.filter((b) => { const c = getComputedStyle(b).backgroundColor; return alpha(c) > 0 && c !== page; }).map((b) => b.getAttribute('data-p3') ?? b.className);
  const ctl = (k) => (k === 'product-mark' ? q(k) : q(k)?.closest('button') ?? q(k));
  const rowsOf = HOOKS.filter((k) => shown(q(k))).map((k) => ({ k, top: Math.round(ctl(k).getBoundingClientRect().top), mid: Math.round((ctl(k).getBoundingClientRect().top + ctl(k).getBoundingClientRect().bottom) / 2) }));
  const firstMid = Math.min(...rowsOf.map((x) => x.mid));
  const row1 = rowsOf.filter((x) => x.mid < firstMid + 8).map((x) => x.k);
  const row2 = rowsOf.filter((x) => x.mid >= firstMid + 8).map((x) => x.k);
  const vis = buttons.filter((b) => !b.closest('[data-p3="pane-toggle"]'));
  const top = Math.min(...vis.map((n) => n.getBoundingClientRect().top));
  const last = vis.filter((n) => n.getBoundingClientRect().top < top + 8).sort((a, b) => a.getBoundingClientRect().right - b.getBoundingClientRect().right).at(-1);
  const narrow = document.querySelector('[data-p3="frame"]').dataset.w === 'narrow';
  const ref = narrow ? document.querySelector('[data-p3="tab-row"]') : document.querySelector('.p3-preview-head');
  const rr = ref.getBoundingClientRect();
  return { order, dividers, white, tiles, filled, row1, row2, last: last?.getAttribute('data-p3') ?? null, lastRight: Math.round((last?.getBoundingClientRect().right ?? -99) * 10) / 10,
    contentRight: Math.round((rr.right - parseFloat(getComputedStyle(ref).paddingRight)) * 10) / 10, contentFrom: narrow ? 'the tab row' : 'the preview header' };
};
const BAR_ORDER = {
  web: ['product-mark', 'brand-switcher', 'verdict', 'theme-toggle', 'activity-open', 'export-open'],
  figma: ['product-mark', 'brand-switcher', 'verdict', 'theme-toggle', 'agent-toggle', 'activity-open', 'export-open', 'pages-menu', 'figma-open', 'apply-to-figma'],
};
const TILE_LABEL = { verdict: 'Contrast', 'theme-toggle': 'Theme', 'agent-toggle': 'Agent', 'activity-open': 'Activity', 'export-open': 'Export' };
for (const { w, h } of WIDTHS) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const where = `S13.1 ${host} ${theme} ${w}`;
      const narrow = w <= 560;
      const column = columnOf(host, w);
      const { ctx, page, errors } = await open({ host, theme, w, h, query: '?p3-test-hooks' });
      try {
        // ── the bar (the owner's "A · Menu bar", 2026-10-05) ──
        const bp = await page.evaluate(BAR_PROBE);
        ok(JSON.stringify(bp.order) === JSON.stringify(BAR_ORDER[host]), `${where}: bar order: ${BAR_ORDER[host].join(', ')} (${bp.order.join(', ')})`);
        ok(bp.dividers.length === 0, `${where}: bar dividers: none between the bar's items (${bp.dividers.join(' | ') || 'none'})`);
        for (const x of bp.white) ok(x.bg && x.edge && x.chev, `${where}: bar menus: ${x.k} is a white button with an edge and ▾ (white ${x.bg}, edge ${x.edge}, ▾ ${x.chev})`);
        ok(bp.white.length === (host === 'web' ? 1 : 3), `${where}: bar menus: ${host === 'web' ? 'the brand switcher' : 'the brand switcher, Pages and Figma'} measured (${bp.white.map((x) => x.k).join(', ')})`);
        ok(bp.tiles.length === (host === 'web' ? 4 : 5), `${where}: bar tiles: Contrast, Theme, ${host === 'web' ? '' : 'Agent, '}Activity and Export all measured (${bp.tiles.map((x) => x.k).join(', ')})`);
        for (const t of bp.tiles) {
          const want = TILE_LABEL[t.k];
          const nameOk = t.k === 'export-open' ? t.name === 'Export' : t.k === 'activity-open' ? /^Activity(, |$)/.test(t.name ?? '') : t.k === 'theme-toggle' ? /^Theme: /.test(t.name ?? '') : t.k === 'agent-toggle' ? t.name === 'Agent' : /^Verdict: .+\. Open Inspect, Contrast$/.test(t.name ?? '');
          const tipOk = t.k === 'verdict' ? t.name === `Verdict: ${t.tip}. Open Inspect, Contrast` : t.tip === t.name;
          ok(t.borderless && t.clear && t.glyph && (narrow ? t.label === null : t.label === want) && t.labelHidden && nameOk && tipOk && t.tipHidden,
            `${where}: bar tiles: ${t.k} is borderless (${t.borderless && t.clear}) with its glyph (${t.glyph}), ${narrow ? 'its label dropped' : `labelled "${want}"`} ("${t.label}"), named "${t.name}", its tooltip "${t.tip}"`);
        }
        ok(JSON.stringify(bp.filled) === JSON.stringify(host === 'web' ? [] : ['apply-to-figma']), `${where}: bar fill: ${host === 'web' ? 'no control' : 'Apply Theme alone'} is filled (${bp.filled.join(', ') || 'none'})`);
        if (host === 'web' && w === 640) ok(bp.row2.length === 0, `${where}: bar rows: the web's bar is one row at 640 (second row: ${bp.row2.join(', ') || 'none'})`);
        if (host === 'figma' && narrow) {
          ok(JSON.stringify(bp.row1) === JSON.stringify(BAR_ORDER.figma.slice(0, 7)) && JSON.stringify(bp.row2) === JSON.stringify(['pages-menu', 'figma-open', 'apply-to-figma']),
            `${where}: bar rows: the plugin at 380 keeps the mark, the brand, Contrast, Theme, Agent, Activity and Export on the first row and Pages, Figma and Apply Theme on the second (${bp.row1.join(', ')} / ${bp.row2.join(', ')})`);
        }
        if (w !== 640) {
          ok(Math.abs(bp.lastRight - bp.contentRight) <= 1 && (host !== 'web' || bp.last === 'export-open'),
            `${where}: bar alignment: the bar's last control on its top row (${bp.last}) ends at the page content's right edge (${bp.lastRight} vs ${bp.contentRight}, ${bp.contentFrom})${host === 'web' ? ', and it is Export' : ''}`);
        }
        // The tooltip, on hover: drawn under its tile, inside the window.
        await page.locator('[data-p3="verdict"]').hover();
        const tp = await page.evaluate(() => { const t = document.querySelector('[data-p3="verdict-tip"]'); const r = t.getBoundingClientRect(); const b = document.querySelector('[data-p3="verdict"]').getBoundingClientRect();
          return { shown: getComputedStyle(t).display !== 'none' && r.width > 0, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right)], under: r.top >= b.bottom - 1, vw: innerWidth }; });
        ok(tp.shown && tp.under && tp.r[0] >= 0 && tp.r[2] <= tp.vw, `${where}: Contrast's tooltip shows on hover, under it and inside the window (${JSON.stringify(tp)})`);
        await page.mouse.move(0, h - 1);
        // ── the brand menu, the import box open ──
        await hooks.click(page.locator('[data-p3="brand-switcher"]'));
        await hooks.need(page, '[data-p3="brand-menu"]');
        await hooks.click(page.locator('[data-p3="brand-menu-import"]'));
        await hooks.need(page, '[data-p3="brand-menu"] [data-p3="import-text"]');
        await page.fill('[data-p3="import-text"]', 'a design.md');
        const mm = await measure(page, `${where} / brand menu`, host, w);
        check(mm, `${where} / brand menu`, column, narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: BRAND_MENU_HOOKS });
        ok(mm.fields.some((f) => /import-text/.test(f.el)), `${where} / brand menu: the import box's text area is measured as a field (${mm.fields.map((f) => f.el).join(', ')})`);
        const fit = await page.evaluate(() => { const r = document.querySelector('[data-p3="brand-menu"]').getBoundingClientRect(); return { r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: innerWidth, vh: innerHeight }; });
        ok(fit.r[0] >= 0 && fit.r[2] <= fit.vw && fit.r[3] <= fit.vh, `${where} / brand menu: the open menu stays inside the window (${JSON.stringify(fit.r)} in ${fit.vw} × ${fit.vh})`);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s131-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-brand-menu.png`) });
        // The import's error line (#2124 review, finding 3d): a refused paste, its line held to ${TEXT_MIN}:1 on the menu's
        // ground. Measured at 4.96:1 in dark by a one-off probe before it was held here.
        await hooks.click(page.locator('[data-p3="import-load"]'));
        await hooks.need(page, '[data-p3="import-error"]');
        const ie = await page.evaluate(INK_PROBE, '[data-p3="import-error"]');
        ok(ie.r >= TEXT_MIN, `${where} / brand menu: import error line contrast ${ie.r}:1, at least ${TEXT_MIN}:1 (ink ${ie.ink}, "${ie.text.slice(0, 40)}")`);

        // ── keyboard: Escape closes it to the switcher; Enter opens it on the current example; arrows, Home, End ──
        await page.keyboard.press('Escape');
        const k0 = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="brand-menu"]'), focus: document.activeElement?.getAttribute('data-p3') }));
        ok(!k0.open && k0.focus === 'brand-switcher', `${where}: keyboard: Escape closes the brand menu back to the switcher (open ${k0.open}, focus on "${k0.focus}")`);
        await page.keyboard.press('Enter');
        const k1 = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="brand-menu"]'), focus: document.activeElement?.getAttribute('data-p3'), current: document.activeElement?.getAttribute('aria-current') }));
        ok(k1.open && k1.focus === 'brand-menu-example' && k1.current === 'true', `${where}: keyboard: Enter on the brand switcher opens the menu with focus on the current example (open ${k1.open}, focus on "${k1.focus}", current ${k1.current})`);
        const at = () => page.evaluate(() => { const a = document.activeElement; const items = [...document.querySelectorAll('[data-p3="brand-menu"] .p3-menu-item')]; return { i: items.indexOf(a), n: items.length, hook: a?.getAttribute('data-p3') }; });
        const k2a = await at();
        await page.keyboard.press('ArrowDown');
        const k2 = await at();
        await page.keyboard.press('End');
        const k3 = await at();
        await page.keyboard.press('Home');
        const k4 = await at();
        ok(k2.i === (k2a.i + 1) % k2.n && k3.i === k3.n - 1 && k3.hook === 'brand-menu-import' && k4.i === 0,
          `${where}: keyboard: Arrow Down, End and Home move between the brand menu's items (from ${k2a.i} to ${k2.i}, End ${k3.i} "${k3.hook}" of ${k3.n}, Home ${k4.i})`);
        await page.keyboard.press('Escape');
        const k5 = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="brand-menu"]'), focus: document.activeElement?.getAttribute('data-p3') }));
        ok(!k5.open && k5.focus === 'brand-switcher', `${where}: keyboard: Escape from an item closes the menu back to the switcher (open ${k5.open}, focus on "${k5.focus}")`);

        // ── the export dialog ──
        await hooks.click(page.locator('[data-p3="export-open"]'));
        await hooks.need(page, '[data-p3="export-dialog"]');
        const md = await measure(page, `${where} / export dialog`, host, w);
        check(md, `${where} / export dialog`, column, narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: EXPORT_HOOKS });
        const cols = await page.evaluate(() => getComputedStyle(document.querySelector('[data-p3="export-dialog"] .p3-bardlg-body')).gridTemplateColumns.split(' ').length);
        ok(cols === (narrow ? 1 : 2), `${where} / export dialog: ${narrow ? 'one column at the narrow tier' : 'two columns, the settings beside the preview'} (${cols})`);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s131-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-export.png`) });
        await page.keyboard.press('Escape');
        const k6 = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="export-dialog"]'), focus: document.activeElement?.getAttribute('data-p3') }));
        ok(!k6.open && k6.focus === 'export-open', `${where}: keyboard: Escape closes the export dialog back to Export (open ${k6.open}, focus on "${k6.focus}")`);
        // #2124 review (findings 1, 2, 3a, 3c): every way out returns focus to Export; focus moves in as it opens and
        // Tab stays inside while it is open.
        const dlgAt = () => page.evaluate(() => ({ open: !!document.querySelector('[data-p3="export-dialog"]'), focus: document.activeElement?.getAttribute('data-p3') ?? document.activeElement?.tagName ?? null,
          inside: !!document.activeElement?.closest('[data-p3="export-dialog"]') }));
        for (const how of ['Close', 'Cancel', 'the scrim']) {
          await hooks.click(page.locator('[data-p3="export-open"]'));
          await hooks.need(page, '[data-p3="export-dialog"]');
          const in0 = await dlgAt();
          ok(in0.inside, `${where}: dialog focus: opening Export moves focus into the dialog (on "${in0.focus}")`);
          const modal = await page.evaluate(() => { const d = document.querySelector('[data-p3="export-dialog"]'); return [d?.getAttribute('role'), d?.getAttribute('aria-modal')]; });
          ok(modal[0] === 'dialog' && modal[1] === 'true', `${where}: dialog focus: the export dialog is a modal dialog (role "${modal[0]}", aria-modal "${modal[1]}")`);
          if (how === 'Close') {
            const walk = [];
            for (let i = 0; i < 24; i++) { await page.keyboard.press('Tab'); walk.push(await dlgAt()); }
            for (let i = 0; i < 4; i++) { await page.keyboard.press('Shift+Tab'); walk.push(await dlgAt()); }
            const out = walk.filter((x) => !x.inside).map((x) => x.focus);
            ok(out.length === 0, `${where}: dialog focus: Tab and Shift+Tab stay inside the export dialog (${walk.length} presses${out.length ? `, left it for ${out.join(', ')}` : ''})`);
            await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-close"]'));
          } else if (how === 'Cancel') await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-cancel"]'));
          else { await page.mouse.move(2, 2); await page.mouse.down(); await page.mouse.up(); }   // the scrim, outside the dialog
          const back = await dlgAt();
          ok(!back.open && back.focus === 'export-open', `${where}: dialog focus: ${how} closes the export dialog back to Export (open ${back.open}, focus on "${back.focus}")`);
        }
        if (w !== 640) {
          await hooks.click(page.locator('[data-p3="export-open"]'));
          await hooks.need(page, '[data-p3="export-dialog"]');
          const tw = await tabWalk(page, 'export-dialog');
          ok(tw.ok && tw.confirm, `${where}: dialog tab order: Tab from the export dialog's first control visits every stop, Download included, and Shift+Tab the reverse (stops ${tw.stops.join(', ')}; Tab ${tw.fwd.join(' → ')}; Shift+Tab ${tw.back.join(' → ')})`);
          // The preview is a Tab stop of its own (tabindex 0), reached by Tab, whatever the trap does: a scroll region must
          // stay keyboard-reachable.
          const pv = await page.evaluate(() => { const p = document.querySelector('[data-p3="export-dialog"] .p3-export-pre'); return { tabindex: p?.getAttribute('tabindex') ?? null }; });
          ok(pv.tabindex === '0' && tw.fwd.includes('pre'), `${where}: dialog tab order: the export preview is a Tab stop of its own (tabindex "${pv.tabindex}") and Tab reaches it (${tw.fwd.includes('pre')})`);
          // The trap defers to the browser for a focusable node its list does not name: a link planted in the footer, ahead
          // of Cancel, must be reached by Tab, and Tab from it must go on to Cancel (not wrap to the first control).
          await page.evaluate(() => { const a = document.createElement('a'); a.href = '#'; a.textContent = 'planted'; a.setAttribute('data-planted', ''); document.querySelector('[data-p3="export-dialog"] .p3-bardlg-foot').prepend(a); });
          const pw2 = await tabWalk(page, 'export-dialog');
          const ai = pw2.fwd.indexOf('a');
          ok(pw2.ok && ai > 0 && pw2.fwd[ai + 1] === 'dialog-cancel', `${where}: dialog tab order: Tab reaches a focusable control the trap's list does not name, and goes on from it to Cancel (Tab ${pw2.fwd.join(' → ')})`);
          await page.evaluate(() => document.querySelector('[data-planted]')?.remove());
          await page.keyboard.press('Escape');
        }
        // ── the overwrite confirm (web) and the prune review (plugin), measured as chrome (#2124 review, finding 3d) ──
        if (w === 1280 && host === 'web') {
          await page.evaluate(() => window.__prism3TestEdit('id', 'edited-brand'));
          await hooks.click(page.locator('[data-p3="brand-switcher"]'));
          await hooks.click(page.locator('[data-p3="brand-menu-example"]').filter({ hasText: 'aurora' }));
          await hooks.need(page, '[data-p3="overwrite-confirm"]');
          const mo = await measure(page, `${where} / overwrite confirm`, host, w);
          check(mo, `${where} / overwrite confirm`, column, PLACE_FLOOR, { extra: ['[data-p3="overwrite-replace"]', '[data-p3="overwrite-cancel"]'] });
          const oc = await page.evaluate(INK_PROBE, '[data-p3="overwrite-confirm"]');
          ok(oc.r >= TEXT_MIN, `${where} / overwrite confirm: its sentence's contrast ${oc.r}:1, at least ${TEXT_MIN}:1`);
          await hooks.click(page.locator('[data-p3="overwrite-cancel"]'));
          await page.keyboard.press('Escape');
        }
        if (w !== 640 && host === 'figma') {
          await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'prune-result', ok: true, applied: false, count: 2, summary: 'Would remove 2 items: 2 variables.' } }, '*'));
          await hooks.need(page, '[data-p3="prune-dialog"]');
          const pw = await tabWalk(page, 'prune-dialog');
          ok(pw.ok && pw.confirm, `${where}: dialog tab order: Tab from the prune review's first control visits every stop, its Delete included, and Shift+Tab the reverse (stops ${pw.stops.join(', ')}; Tab ${pw.fwd.join(' → ')}; Shift+Tab ${pw.back.join(' → ')})`);
          const pm = await page.evaluate(() => { const d = document.querySelector('[data-p3="prune-dialog"]'); return { role: d?.getAttribute('role'), modal: d?.getAttribute('aria-modal'), inside: !!document.activeElement?.closest('[data-p3="prune-dialog"]') }; });
          ok(pm.role === 'dialog' && pm.modal === 'true' && pm.inside, `${where}: dialog focus: the prune review is a modal dialog with focus inside it (${JSON.stringify(pm)})`);
          // Every way out but Cancel (held below, after the measure) returns focus to the Figma menu, its opener.
          for (const how of ['Close', 'the scrim', 'Escape']) {
            if (how === 'Close') await hooks.click(page.locator('[data-p3="prune-dialog"] [data-p3="dialog-close"]'));
            else if (how === 'Escape') await page.keyboard.press('Escape');
            else { await page.mouse.move(2, 2); await page.mouse.down(); await page.mouse.up(); }
            const pe = await page.evaluate(() => ({ open: !!document.querySelector('[data-p3="prune-dialog"]'), focus: document.activeElement?.getAttribute('data-p3') ?? null }));
            ok(!pe.open && pe.focus === 'figma-open', `${where}: dialog focus: ${how} closes the prune review back to the Figma menu (open ${pe.open}, focus on "${pe.focus}")`);
            await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'prune-result', ok: true, applied: false, count: 2, summary: 'Would remove 2 items: 2 variables.' } }, '*'));
            await hooks.need(page, '[data-p3="prune-dialog"]');
          }
          const mp = await measure(page, `${where} / prune review`, host, w);
          check(mp, `${where} / prune review`, column, narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR, { extra: ['[data-p3="dialog-confirm"]', '[data-p3="dialog-cancel"]'] });
          const pc = await page.evaluate(INK_PROBE, '[data-p3="prune-dialog"] .p3-bardlg-desc');
          ok(pc.r >= TEXT_MIN, `${where} / prune review: its sentence's contrast ${pc.r}:1, at least ${TEXT_MIN}:1`);
          await hooks.click(page.locator('[data-p3="prune-dialog"] [data-p3="dialog-cancel"]'));
          const pf = await page.evaluate(() => document.activeElement?.getAttribute('data-p3') ?? null);
          ok(pf === 'figma-open', `${where}: dialog focus: the prune review's Cancel returns focus to the Figma menu (on "${pf}")`);
        }
        // ── the error strip ──
        if (host === 'web') await page.evaluate(() => window.__prism3TestEdit('overrides', { light: { 'background.secondary': { palette: 'neutral', step: '200' } } }));
        else await page.evaluate((i) => window.postMessage({ pluginMessage: { type: 'restore-input', input: i } }, '*'), S131_REFUSED);
        await page.waitForFunction(() => { const e = document.querySelector('[data-p3="error-bar"]'); return !!e && !e.hidden; }, null, { timeout: 5000 }).catch(() => {});
        const st = await page.evaluate(STRIP_PROBE);
        ok(st.mounted && st.shown && /background\.secondary/.test(st.text ?? ''), `${where}: the error strip shows the refusal, naming the field ("${String(st.text).slice(0, 70)}")`);
        ok(theme === 'dark' ? st.groundLum < DARK_GROUND_MAX : st.groundLum > LIGHT_GROUND_MIN,
          `${where}: the error strip's ground follows the ${theme} theme (luminance ${st.groundLum}, ${theme === 'dark' ? `below ${DARK_GROUND_MAX}` : `above ${LIGHT_GROUND_MIN}`})`);
        ok(st.textR >= TEXT_MIN && st.glyphR >= NONTEXT_MIN, `${where}: the error strip's line clears ${TEXT_MIN}:1 (${st.textR}:1) and its glyph ${NONTEXT_MIN}:1 (${st.glyphR}:1)`);
        ok(st.fullWidth && st.underBar, `${where}: the error strip is full width and sits right under the top bar (strip ${JSON.stringify(st.rect)}, bar ends ${st.barBottom})`);
        // #2124 review, finding 4: the strip is role="alert", so the same error, re-shown after each rebuild, must leave its
        // text untouched (no mutation, the same text node), or a standing error is announced again on every edit.
        await page.evaluate(() => {
          const line = document.querySelector('[data-p3="error-bar"] .p3-errstrip-text');
          window.__stripNode = line.firstChild; window.__stripMuts = 0;
          new MutationObserver((ms) => { window.__stripMuts += ms.length; }).observe(line, { childList: true, characterData: true, subtree: true });
        });
        for (let i = 0; i < 2; i++) {
          if (host === 'web') await page.evaluate(() => window.__prism3TestEdit('overrides', { light: { 'background.secondary': { palette: 'neutral', step: '200' } } }));
          else await page.evaluate((x) => window.postMessage({ pluginMessage: { type: 'restore-input', input: x } }, '*'), S131_REFUSED);
          await page.waitForTimeout(150);
        }
        const same = await page.evaluate(() => { const line = document.querySelector('[data-p3="error-bar"] .p3-errstrip-text'); return { muts: window.__stripMuts, node: line.firstChild === window.__stripNode, text: line.textContent.slice(0, 40) }; });
        ok(same.muts === 0 && same.node, `${where}: error strip: the same error after 2 more rebuilds leaves its text untouched (${same.muts} mutations, same text node ${same.node}, "${same.text}")`);
        const ms = await measure(page, `${where} / error strip`, host, w);
        // The web's refusal is an edit on the opening page, so the whole column is held. The plugin's is a restore, which
        // loads a brand of its own (no second brand color, so Palettes draws fewer levers), and at 380 × 420 its long line
        // fills the levers pane (as the legacy card did, in the same row: #2105). So there the strip's own
        // nodes are held, to the same bars.
        if (host === 'web') check(ms, `${where} / error strip`, column, narrow ? INSPECT_NARROW_FLOOR : PLACE_FLOOR);
        else {
          const dim = ms.text.filter((t) => /error-bar|p3-errstrip/.test(t.el) || /That change|saved brand/.test(t.el)).filter((t) => t.r < TEXT_MIN);
          ok(ms.text.length > 0 && dim.length === 0 && ms.shadows.length === 0 && ms.inline.length === 0 && ms.unparsed.length === 0,
            `${where} / error strip: the chrome around the plugin's strip draws no dim strip text, no shadow and no inline value (${dim.map((t) => `${t.el} ${t.r}:1`).join(' | ') || 'clean'})`);
        }
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `s131-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}-strip.png`) });

        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 29b. The owner's "A · Menu bar" (2026-10-05), two behaviors held directly, both hosts, both themes:
//   · CONTRAST'S MARK FOLLOWS THE VERDICT: a check and no count while every pair passes; a warning glyph and the
//     count below floor once an edit puts pairs below it. The web's edit is test-verdict-count.ts's two-mode
//     fixture, whose count is derived by hand there: 2 of 884, 2 modes. The plugin's is a restore of a one-mode
//     brand with the same Light override; its count is read from its own line.
//   · THE PLUGIN'S THEME MENU: Match Figma, Light and Dark, in that order, Match Figma checked by default and the
//     chrome on Figma's theme; a choice applies, is posted to the main thread as `set-theme-pref`, and, after a
//     reload, comes back (the main thread's `theme-pref` reply, which `apps/plugin/test-theme-pref.ts` holds) as the
//     checked choice and the chrome's theme.
// =============================================================================================
console.log('\n29b. The menu bar: Contrast per verdict, the plugin Theme menu');
const LOW_FIXTURE = {
  light: { 'text.secondary': { palette: 'neutral', step: '100' }, 'icon.secondary': { palette: 'neutral', step: '550' } },
  dark: { 'text.secondary': { palette: 'neutral', step: '900' }, 'icon.secondary': { palette: 'neutral', step: '450' } },
};
const LOW_BRAND = { root: 'lo', modes: ['light'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true },
  id: 'low-brand', overrides: { light: LOW_FIXTURE.light } };
const CONTRAST_PROBE = () => {
  const b = document.querySelector('[data-p3="verdict"]');
  const g = b.querySelector('.p3-tile-mark svg.p3-ico');
  return { state: b.dataset.state, check: !!g && /M3 8\.5l3 3 7-7/.test(g.innerHTML) && g.classList.contains('p3-tile-ok'),
    warn: !!g && /M8 1\.8l6\.6 11\.7H1\.4z/.test(g.innerHTML) && g.classList.contains('p3-tile-bad'),
    count: b.querySelector('[data-p3="verdict-count"]')?.textContent ?? null, tip: b.querySelector('[data-p3="verdict-tip"]')?.textContent ?? null, name: b.getAttribute('aria-label') };
};
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    for (const { w, h } of [WIDTHS[0], WIDTHS[2]]) {
      const where = `29b ${host} ${theme} ${w}`;
      const { ctx, page, errors } = await open({ host, theme, w, h, query: '?p3-test-hooks' });
      try {
        const c0 = await page.evaluate(CONTRAST_PROBE);
        ok(c0.state === 'ok' && c0.check && !c0.warn && c0.count === null && /^All \d+ pairs at or above floor$/.test(c0.tip ?? ''),
          `${where}: Contrast: every pair passes, so its mark is the check with no count (${JSON.stringify(c0)})`);
        if (host === 'web') await page.evaluate((o) => window.__prism3TestEdit('overrides', o), LOW_FIXTURE);
        else await page.evaluate((i) => window.postMessage({ pluginMessage: { type: 'restore-input', input: i } }, '*'), LOW_BRAND);
        await page.waitForFunction(() => document.querySelector('[data-p3="verdict"]')?.dataset.state === 'fail', null, { timeout: 5000 }).catch(() => {});
        const c1 = await page.evaluate(CONTRAST_PROBE);
        const lead = /^(\d+) of \d+ below floor, \d+ modes?$/.exec(c1.tip ?? '');
        ok(c1.state === 'fail' && c1.warn && !c1.check && (host === 'web' ? c1.tip === '2 of 884 below floor, 2 modes' && c1.count === '2' : !!lead && c1.count === lead[1]),
          `${where}: Contrast: pairs below floor, so its mark is the warning glyph and the count below floor (${JSON.stringify(c1)})`);
        ok(c1.name === `Verdict: ${c1.tip}. Open Inspect, Contrast`, `${where}: Contrast keeps its name, the full line ("${c1.name}")`);

        if (host === 'figma' && w === WIDTHS[0].w) {
          const menuState = () => page.evaluate(() => ({
            items: [...document.querySelectorAll('[data-p3="theme-menu"] [role="menuitemradio"]')].map((i) => [i.querySelector('.p3-menu-label')?.textContent, i.getAttribute('aria-checked')]),
            data: document.documentElement.dataset.theme, name: document.querySelector('[data-p3="theme-toggle"]')?.getAttribute('aria-label') }));
          await hooks.click(page.locator('[data-p3="theme-toggle"]'));
          await hooks.need(page, '[data-p3="theme-menu"]');
          const m0 = await menuState();
          ok(JSON.stringify(m0.items) === JSON.stringify([['Match Figma', 'true'], ['Light', 'false'], ['Dark', 'false']]) && m0.data === theme && m0.name === 'Theme: Match Figma',
            `${where}: plugin Theme: Match Figma, Light and Dark, Match Figma checked by default and the chrome on Figma's ${theme} theme (${JSON.stringify(m0)})`);
          const other = theme === 'light' ? 'dark' : 'light';
          await page.evaluate(() => { window.__themePosts = []; window.addEventListener('message', (e) => { const m = e.data?.pluginMessage; if (m?.type === 'set-theme-pref') window.__themePosts.push(m.pref); }); });
          await hooks.click(page.locator(other === 'dark' ? '[data-p3="theme-option-dark"]' : '[data-p3="theme-option-light"]'));
          const posted = await page.evaluate(() => new Promise((r) => setTimeout(() => r(window.__themePosts.slice()), 50)));
          const m1 = await menuState();
          ok(m1.data === other && m1.name === `Theme: ${other === 'dark' ? 'Dark' : 'Light'}` && JSON.stringify(posted) === JSON.stringify([other]),
            `${where}: plugin Theme: choosing ${other} applies it and posts it to the main thread to keep (theme ${m1.data}, "${m1.name}", posted ${JSON.stringify(posted)})`);
          // A reload: the main thread answers ui-ready with what it kept (its half: apps/plugin/test-theme-pref.ts).
          await page.reload({ waitUntil: 'load' });
          await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
          await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }));
          await hooks.need(page, '[data-p3="theme-toggle"]');
          await page.evaluate((p) => window.postMessage({ pluginMessage: { type: 'theme-pref', pref: p } }, '*'), posted[0]);
          await page.waitForFunction((t) => document.documentElement.dataset.theme === t, other, { timeout: 3000 }).catch(() => {});
          await hooks.click(page.locator('[data-p3="theme-toggle"]'));
          const m2 = await menuState();
          ok(m2.data === other && m2.items.find((x) => x[1] === 'true')?.[0] === (other === 'dark' ? 'Dark' : 'Light'),
            `${where}: plugin Theme: after a reload the kept choice comes back, checked and applied (${JSON.stringify(m2)})`);
          await page.keyboard.press('Escape');
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
        // Last, after the console check: a link switched on opens the desktop bridge's socket, which no harness serves.
        if (host === 'figma' && w === WIDTHS[0].w) {
          // Activity's name and tooltip say "agent link on" while the link is on (approved copy, 2026-10-05).
          const actName = () => page.evaluate(() => { const b = document.querySelector('[data-p3="activity-open"]'); return [b?.getAttribute('aria-label'), b?.querySelector('[data-p3="activity-open-tip"]')?.textContent]; });
          const off = await actName();
          await page.evaluate((st) => window.postMessage({ pluginMessage: { type: 'agent-link-state', state: st } }, '*'), AGENT_ON);
          await page.waitForFunction(() => /agent link on/.test(document.querySelector('[data-p3="activity-open"]')?.getAttribute('aria-label') ?? ''), null, { timeout: 3000 }).catch(() => {});
          const on = await actName();
          ok(off[0] === 'Activity' && off[1] === 'Activity' && on[0] === 'Activity, agent link on' && on[1] === 'Activity, agent link on',
            `${where}: Activity's name and tooltip add "agent link on" while the link is on (off ${JSON.stringify(off)}, on ${JSON.stringify(on)})`);
          // The tile dots (the owner's QA, 2026-10-05): with the link on and a write running (Apply Theme posted, no main
          // thread to answer), both dots are drawn. Each sits at its glyph's top right at the same offset (within 1px), each
          // is filled, and each draws in the ok green. The web shows no tile dot in any state: it
          // has no agent link and runs no write.
          await hooks.click(page.locator('[data-p3="apply-to-figma"]'));
          await page.waitForFunction(() => document.querySelector('[data-p3="activity-open"] .p3-status-dot')?.dataset.state === 'run', null, { timeout: 3000 }).catch(() => {});
          const dots = await page.evaluate(() => {
            // The ok green, resolved by the chrome's own ok-dot class on a node read and removed at once.
            const g = document.createElement('div'); g.className = 'p3-dot p3-dot-ok'; document.body.append(g);
            const okColor = getComputedStyle(g).backgroundColor; g.remove();
            return ['agent-toggle', 'activity-open'].map((k) => {
              const b = document.querySelector(`[data-p3="${k}"]`), d = b?.querySelector('.p3-tile-mark > .p3-dot'), ic = b?.querySelector('.p3-tile-mark > svg.p3-ico');
              const dr = d?.getBoundingClientRect(), ir = ic?.getBoundingClientRect(), cs = d ? getComputedStyle(d) : null;
              return { k, shown: !!dr && dr.width > 0 && cs.display !== 'none', state: d?.dataset.state ?? (b?.dataset.on === 'true' ? 'on' : 'off'),
                dx: dr && ir ? Math.round((dr.right - ir.right) * 10) / 10 : null, dy: dr && ir ? Math.round((dr.top - ir.top) * 10) / 10 : null,
                color: cs ? cs.backgroundColor : null, okColor, name: b?.getAttribute('aria-label'), pressed: b?.getAttribute('aria-pressed'),
                // Filled, the same shape on every tile (owner, 2026-10-05): a solid fill and no visible ring.
                filled: !!cs && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && (parseFloat(cs.borderTopWidth) === 0 || cs.borderTopStyle === 'none' || cs.borderTopColor === cs.backgroundColor) };
            });
          });
          const [ag, ac] = dots;
          ok(ag.shown && ac.shown && ag.dx !== null && Math.abs(ag.dx - ac.dx) <= 1 && Math.abs(ag.dy - ac.dy) <= 1 && ag.dy <= 0 && ag.dx >= 0,
            `${where}: tile dots: Agent's and Activity's dots sit at their glyph's top right at one offset (Agent ${ag.dx},${ag.dy}; Activity ${ac.dx},${ac.dy}; ${JSON.stringify(dots.map((d) => [d.k, d.shown, d.state]))})`);
          ok(ag.filled && ac.filled, `${where}: tile dots: every dot is filled, Activity "${ac.state}" too (Agent filled ${ag.filled}, Activity filled ${ac.filled})`);
          ok(ag.color === ag.okColor && ac.color === ac.okColor,
            `${where}: tile dots: Agent "on" and Activity "${ac.state}" draw in the ok green ${ag.okColor} (Agent ${ag.color}, Activity ${ac.color})`);
          ok(ag.name === 'Agent' && ag.pressed === 'true' && /^Activity, agent link on, 1 running$/.test(ac.name ?? ''),
            `${where}: tile dots: the names still carry the state ("${ag.name}", "${ac.name}")`);
          // D-RED A: a failure's dot is red; a warning's (an attention state that is not a failure) is green.
          const actDot = () => page.evaluate(() => { const d = document.querySelector('[data-p3="activity-open"] .p3-tile-mark > .p3-status-dot');
            const g = document.createElement('div'); g.className = 'p3-dot p3-dot-ok'; document.body.append(g); const okc = getComputedStyle(g).backgroundColor; g.className = 'p3-dot p3-dot-bad'; const badc = getComputedStyle(g).backgroundColor; g.remove();
            const cs = getComputedStyle(d); return { state: d.dataset.state, shown: cs.display !== 'none', color: cs.backgroundColor, ok: okc, bad: badc, name: d.closest('button').getAttribute('aria-label') }; });
          await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'apply-result', ok: false, headline: '✗ write failed', summary: 'The write failed.' } }, '*'));
          await page.waitForFunction(() => document.querySelector('[data-p3="activity-open"] .p3-status-dot')?.dataset.state === 'bad', null, { timeout: 3000 }).catch(() => {});
          const fd = await actDot();
          ok(fd.state === 'bad' && fd.shown && fd.color === fd.bad && /needs attention/.test(fd.name ?? ''), `${where}: tile dots: a failure's dot is red (${JSON.stringify(fd)})`);
          await hooks.click(page.locator('[data-p3="apply-to-figma"]'));
          await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'apply-result', ok: false, headline: '⚠ 4 misses', summary: '4 roles were not written.' } }, '*'));
          await page.waitForFunction(() => document.querySelector('[data-p3="activity-open"] .p3-status-dot')?.dataset.state === 'warn', null, { timeout: 3000 }).catch(() => {});
          const wd = await actDot();
          ok(wd.state === 'warn' && wd.shown && wd.color === wd.ok && /needs attention/.test(wd.name ?? ''), `${where}: tile dots: a warning's dot is green, and its name still says it needs attention (${JSON.stringify(wd)})`);
          await page.evaluate((st) => window.postMessage({ pluginMessage: { type: 'agent-link-state', state: st } }, '*'), { ...AGENT_ON, on: false, since: null });
        }
      } catch (e) {
        ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// =============================================================================================
// 29c. The export dialog's rules reach no other dialog (the owner's demo, 2026-10-05). The S12 start window (#2142) and
//      its guard use `p3-dialog-*` and `p3-scrim`; the export dialog's own two-column body once turned the start window
//      into two columns. Its rules now carry their own `p3-bardlg-*` names. Held, both hosts, 1280: with the start window
//      open ("+ New brand") and the export dialog open under it, the start window's body lays its cards out in one column
//      (a single computed grid track); and an element carrying the start window's class names, placed beside the open
//      export dialog, is laid out by none of its rules.
//   Mutation: the export dialog's body rule unscoped (`.p3-bardlg-body, .p3-dialog-body { … }`) → `29c … dialog scope: …`.
// =============================================================================================
console.log('\n29c. The export dialog and the start window, in one page');
for (const host of ['web', 'figma']) {
  const where = `29c ${host} light 1280`;
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    // The start window first ("+ New brand" from the brand menu), then Export over the studio under it: the brand menu
    // closes an open export dialog, so this is the order in which both are open together. Export is reached by a
    // dispatched click, as the start window's scrim covers the bar.
    await hooks.click(page.locator('[data-p3="brand-switcher"]'));
    await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
    await hooks.need(page, '[data-p3="export-open"]');
    await page.locator('[data-p3="export-open"]').dispatchEvent('click');
    await hooks.need(page, '[data-p3="export-dialog"]');
    // An element with the start window's class names, placed in the page beside the open export dialog and read, then
    // removed: no rule of the export dialog may lay it out (its body would be two tracks).
    const probe = await page.evaluate(() => {
      const scrim = document.createElement('div'); scrim.className = 'p3-scrim';
      const dlg = document.createElement('section'); dlg.className = 'p3-dialog p3-start';
      const body = document.createElement('div'); body.className = 'p3-dialog-body';
      dlg.append(body); scrim.append(dlg); document.querySelector('[data-p3="frame"]').append(scrim);
      const cs = getComputedStyle(body), ss = getComputedStyle(scrim);
      const r = { bodyDisplay: cs.display, bodyTracks: cs.gridTemplateColumns, scrimPosition: ss.position, scrimZ: ss.zIndex };
      scrim.remove();
      return r;
    });
    const probeTracks = probe.bodyTracks === 'none' ? 0 : probe.bodyTracks.split(' ').filter(Boolean).length;
    ok(probeTracks <= 1 && probe.scrimZ !== '50',
      `${where}: dialog scope: no rule of the export dialog reaches an element named as the start window's (body ${probe.bodyDisplay}, ${probeTracks} tracks "${probe.bodyTracks}"; scrim ${probe.scrimPosition}, z ${probe.scrimZ})`);
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => {
      // The S12 start window only (a `p3-dialog` over the app view); the legacy start screen, which replaces the frame
      // and the export dialog with it, carries the same hook and is not the case.
      const col = document.querySelector('.p3-dialog [data-p3="start-column"]');
      const exp = document.querySelector('[data-p3="export-dialog"] .p3-bardlg-body');
      const tracks = (n) => (n ? getComputedStyle(n).gridTemplateColumns.split(' ').filter(Boolean).length : null);
      return { start: !!col, startTracks: tracks(col), exportOpen: !!exp, exportTracks: tracks(exp) };
    });
    if (!st.start) ok(false, `${where}: the start window opened over the export dialog ("+ New brand" drew no start window: ${JSON.stringify(st)})`);
    else {
      ok(st.exportOpen, `${where}: the export dialog is still open under the start window (${JSON.stringify(st)})`);
      ok(st.startTracks === 1, `${where}: dialog scope: the start window's body lays its cards out in one column with the export dialog open (${st.startTracks} tracks; ${JSON.stringify(st)})`);
    }
  } catch (e) {
    ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 27. #2144 (owner decision FR1 A, 2026-10-05): every chrome focus ring, on every place, both hosts, both themes, draws
//     in Prism3's `color.border.focus`, at least 2px wide, 2px outside the control, at 3:1 against what is outside it
// =============================================================================================
// Section 1 reads the rings Tab reaches from the top of the opening page and of Brand, 30 stops at most. This walks the
// whole tab order of every place, at 1280, until Tab comes back to where it started, skipping brand content and the lent
// legacy views (their rings are the brand's, or `styles.css`'s legacy ones). The expected color is `FOCUS_HEX`, read
// from the emission. The floors are literals, set under the counts measured when this landed (printed per run), so a
// sweep that reached less fails naming its count; the named controls must each be reached and measured.
//
// Mutations, each failing by name (#2144):
//   · Continue's ring back on the text color (`.p3-next:focus-visible { outline-color: var(--p3-text) }` in chrome.css)
//     → `#2144 … every focused chrome control draws its ring in color.border.focus … palettes-continue: color #0d0d0e …`.
//   · another chrome variable on a brand path (`ctl-edge` on `core.palette.primary.600`) → the build's
//     `[brand] chrome var --p3-ctl-edge (light) resolves through brand token pds3.core.palette.primary.600`.
//   · BRAND_ALLOW widened to a pattern → the build's `[brand] self-check: brandLeaks no longer refuses a sibling name …`.
console.log(`\n#2144 — every chrome focus ring on ${FOCUS_RING_TOKEN} (light ${FOCUS_HEX.light}, dark ${FOCUS_HEX.dark})\n${'='.repeat(78)}`);
/** The least number of chrome rings the whole sweep must read, per host (both themes). */
const FOCUS_SWEEP_FLOOR = { web: 820, figma: 870 };
/** The least each place must read, every host and theme (the fewest measured when this landed: 19, Shape and Components). */
const FOCUS_PLACE_FLOOR = 15;
/** The lent legacy views the sweep skips: all of INSPECT_LEGACY but Components' preview, whose one focusable control is
 *  the plugin's set radio. Its ring is drawn by `styles.css` (`.cset-radio`), on the chrome's variables since #2144, so
 *  it is read here; anything else that turns focusable in that view is read too, and must hold the same contract. */
const FOCUS_SWEEP_SKIP = INSPECT_LEGACY.filter((h) => h !== '[data-p3="components-style-guide"]');
/** Controls the sweep must reach and measure, by hook: Continue, a chip, a text field, a tab, and one of each other
 *  kind the issue names. The plugin adds its own bar control and the Components set radio (`styles.css`). */
const FOCUS_SWEEP_NEEDS = {
  web: ['[data-p3="palettes-continue"]', '[data-p3="density-choice-comfortable"]', '[data-p3="brand-name"]', '[data-p3="primary-hex"]',
    '[data-p3="tab-color"]', '[data-p3="color-sub-palettes"]', '[data-p3="neutral-chroma-slider"]', '[data-p3="export-open"]', '[data-p3="search-open"]',
    '[data-p3="mode-option"]', '[data-p3="inspect-open"]'],
  figma: ['[data-p3="palettes-continue"]', '[data-p3="density-choice-comfortable"]', '[data-p3="brand-name"]', '[data-p3="primary-hex"]',
    '[data-p3="tab-color"]', '[data-p3="color-sub-palettes"]', '[data-p3="neutral-chroma-slider"]', '[data-p3="export-open"]', '[data-p3="search-open"]',
    '[data-p3="mode-option"]', '[data-p3="inspect-open"]', '[data-p3="apply-to-figma"]', '[data-p3="components-def-option"]'],
};
/** The focused controls photographed for review when a screenshot directory is given: [hook, file name part]. */
const FOCUS_SHOTS = [['palettes-continue', 'continue'], ['density-choice-comfortable', 'chip'], ['brand-name', 'text-field'], ['tab-color', 'tab']];
/** The Build style guides page in the sweep (S11.2): a small file, typed here, with one table of each kind, so every
 *  option group draws; and the page's own controls the sweep must reach, its switch and its title box's fold. */
const SG_RING_CATALOG = {
  setUp: true,
  collections: [
    { id: 'C:core', name: 'core', modes: ['Default'], items: [{ name: 'pds3/core/palette/primary/100', table: 0, value: '#E0E0FF' }, { name: 'pds3/core/dimension/4', table: 1, value: '4px' }, { name: 'pds3/core/font/size/16', table: 2, value: '16px' }] },
    { id: 'text-styles', name: 'Text styles', modes: [], textStyles: true, items: [{ name: 'body/md', table: 3, value: '' }] },
  ],
  tables: [
    { key: 'color|C:core|pds3/core/palette/primary', title: 'Primary', kind: 'color', page: 'Primitive tokens', rows: 1 },
    { key: 'dimension|C:core|pds3/core/dimension', title: 'Dimension', kind: 'dimension', page: 'Primitive tokens', rows: 1 },
    { key: 'fontSize|C:core|pds3/core/font/size', title: 'Font size', kind: 'font', page: 'Primitive tokens', rows: 1 },
    { key: 'typography|text-styles|body', title: 'Text styles', kind: 'text', page: 'Semantic tokens', rows: 1 },
  ],
  notes: [],
};
const SG_RING_NEEDS = ['[data-p3="sg-opt-aliases"]', '[data-p3="sg-titles-summary"]', '[data-p3="sg-draw"]', '[data-p3="sg-close"]'];
let focusSwept = 0;
for (const host of ['web', 'figma']) {
  let hostTotal = 0;
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    const where = `#2144 ${host} ${theme} 1280`;
    try {
      const reached = new Set();
      const bad = [];
      const counts = [];
      const shot = new Set();
      for (const place of NEW_PAGES) {
        await goPlace(page, place);
        const rings = await focusRings(page, { all: true, max: 600, skipIn: FOCUS_SWEEP_SKIP, onRing: async (r) => {
          const name = FOCUS_SHOTS.find(([hk]) => hk === r.hook)?.[1];
          if (!SHOTS || !name || shot.has(name)) return;
          shot.add(name);
          const pad = 24;
          await page.screenshot({ path: join(SHOTS, `focus-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${name}.png`),
            clip: { x: Math.max(0, r.box.x - pad), y: Math.max(0, r.box.y - pad), width: r.box.w + 2 * pad, height: r.box.h + 2 * pad } });
        } });
        counts.push(`${place} ${rings.length}${rings.skipped ? ` (+${rings.skipped} skipped)` : ''}`);
        ok(rings.length >= FOCUS_PLACE_FLOOR, `${where} / ${place}: the sweep read ${rings.length} chrome focus rings (floor ${FOCUS_PLACE_FLOOR})`);
        for (const r of rings) {
          reached.add(r.hook);
          // A lent legacy view is pinned light whatever the chrome's theme (INSPECT_LEGACY), so a ring inside one is
          // the light ring.
          const miss = ringMisses(r, r.pinnedLight ? 'light' : theme);
          if (miss.length) bad.push({ r: { ...r, hook: `${place} ${r.hook}` }, miss });
          lows.focus = Math.min(lows.focus, r.r);
        }
        hostTotal += rings.length;
        focusSwept += rings.length;
      }
      // The plugin's Build style guides page (S11.2; review of #2171), which no tab shows: its switch, its title box's
      // fold and every other control on it, with a catalog posted so the tree and every option group are drawn.
      if (host === 'figma') {
        await openFigma(page);
        await hooks.click(page.locator('[data-p3="figma-option-style-guide"]'), WAIT);
        await hooks.need(page, '[data-p3="style-guides"]');
        await postMsg(page, { type: 'style-guide-catalog', catalog: SG_RING_CATALOG });
        await settle(page);
        const rings = await focusRings(page, { all: true, max: 600, skipIn: FOCUS_SWEEP_SKIP });
        counts.push(`build style guides ${rings.length}`);
        ok(rings.length >= FOCUS_PLACE_FLOOR, `${where} / build style guides: the sweep read ${rings.length} chrome focus rings (floor ${FOCUS_PLACE_FLOOR})`);
        for (const r of rings) {
          reached.add(r.hook);
          const miss = ringMisses(r, r.pinnedLight ? 'light' : theme);
          if (miss.length) bad.push({ r: { ...r, hook: `build style guides ${r.hook}` }, miss });
          lows.focus = Math.min(lows.focus, r.r);
        }
        hostTotal += rings.length;
        focusSwept += rings.length;
        for (const want of SG_RING_NEEDS) ok(reached.has(hooks.role(want)), `${where}: the sweep reaches ${want} on the Build style guides page and reads its ring`);
      }
      console.log(`  ${where}: ${counts.join(', ')}`);
      ok(bad.length === 0, `${where}: every focused chrome control draws its ring in ${FOCUS_RING_TOKEN} (${FOCUS_HEX[theme]}), at least ${FOCUS_WIDTH_MIN}px wide, ${FOCUS_OFFSET}px outside, at ${NONTEXT_MIN}:1${bad.length ? ` — ${bad.length} miss: ${ringReport(bad)}` : ''}`);
      for (const want of FOCUS_SWEEP_NEEDS[host]) ok(reached.has(hooks.role(want)), `${where}: the sweep reaches ${want} and reads its ring`);
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
  console.log(`  #2144 ${host}: ${hostTotal} rings read, light and dark`);
  ok(hostTotal >= FOCUS_SWEEP_FLOOR[host], `#2144 ${host}: the sweep read ${hostTotal} chrome focus rings across every place, light and dark (floor ${FOCUS_SWEEP_FLOOR[host]})`);
}

// =============================================================================================
// 28. The start window (UI redesign S12): today's four cards, restyled, in a window over the studio, on both hosts,
//     in both themes, at 1280 and 380. Every decision the owner made for it, each against a literal typed here.
// =============================================================================================
console.log(`\nThe start window (S12)\n${'='.repeat(78)}`);
/** The owner's decisions, as literals (S1, S3, S5, S6, S7, S8, S10, G13, G14, G15, G17). */
const START = {
  heading: { web: 'Start a brand', figma: 'Start a brand in this file' },                   // G17
  order: ['Start from your color', 'Explore an example', 'Import a design.md'],   // S8, then N1 A (Blank folded into the color card)
  colorDesc: 'Your primary brand color; everything else takes smart defaults you can tune. No color yet? Start blank with a neutral gray.',   // N1 A
  go: 'Start from this color',                                                                  // S1
  badHex: 'Enter a hex color as #rrggbb.',                                                      // S3
  emptyPaste: 'Paste a design.md brief or choose a file first.',                                // S2
  fileType: 'Choose a .md, .markdown or .txt file.',                                            // S6
  close: 'Close',                                                                                // S10
  importDesc: 'Already have a design.md? Paste it or upload it to load the full brand.',       // X1 (the owner's review of #2142)
};
/** A brief with a repeated key on line 3 (the opening --- is line 1), and one with no primary, which names no line. */
const DUP_KEY_BRIEF = '---\nid: dup\nid: again\n---\n';
const NO_LINE_BRIEF = '---\nid: x\nneutral: { hue: 1, chroma: 0.01 }\n---\n';
/** Prism3's destructive button at rest (S5): `color.interactive.destructive.fill.rest` and `.on-fill`, per theme, from the
 *  committed emission and its dark overlay, never from the chrome's variable map. */
const DESTRUCTIVE = (() => {
  const out = join(REPO, 'packages/engine/out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const root = Object.keys(base).find((k) => !k.startsWith('$'));
  const ov = JSON.parse(readFileSync(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8'));
  const at = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
  const res = (theme, path, depth = 0) => {
    const v = (theme === 'dark' ? at(ov, path)?.$value : undefined) ?? at(base, path)?.$value;
    if (typeof v !== 'string' || depth > 20) return null;
    const m = /^\{(.+)\}$/.exec(v);
    return m ? res(theme, m[1], depth + 1) : v.toLowerCase();
  };
  return Object.fromEntries(['light', 'dark'].map((t) => [t, {
    fill: res(t, `${root}.color.interactive.destructive.fill.rest`), on: res(t, `${root}.color.interactive.destructive.on-fill`) }]));
})();
ok(Object.values(DESTRUCTIVE).every((d) => /^#[0-9a-f]{6}$/.test(d.fill ?? '') && /^#[0-9a-f]{6}$/.test(d.on ?? '')),
  `S5: the oracle resolved Prism3's destructive fill and on-fill from the emission (${JSON.stringify(DESTRUCTIVE)})`);
const startRgb = (hx) => `rgb(${parseInt(hx.slice(1, 3), 16)}, ${parseInt(hx.slice(3, 5), 16)}, ${parseInt(hx.slice(5, 7), 16)})`;
const START_SIZES = [{ w: 1280, h: 900 }, { w: 380, h: 420 }];
/** A first run on `host`: the web with nothing saved, the plugin in a file with no brand. Waits for the frame's width
 *  tier to match the viewport before anything is read. */
const openFirstRun = async ({ host, theme, w, h }) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  if (host === 'web') await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  else {
    await page.goto(`${ORIGIN}/plugin?figma=${theme}`, { waitUntil: 'load' });
    await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
  }
  await hooks.need(page, '[data-p3="start-screen"]');
  await page.waitForFunction((tier) => document.querySelector('[data-p3="frame"]')?.dataset.w === tier, w <= 560 ? 'narrow' : 'wide');
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errors };
};
/** Everything a designer can read about the start, from the rendered DOM. */
const readStartWindow = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const dlg = q('[data-p3="start-screen"]');
  const guard = q('[data-p3="start-guard"]');
  const a = document.activeElement;
  return {
    open: !!dlg, role: dlg?.getAttribute('role'), modal: dlg?.getAttribute('aria-modal'),
    labelled: !!dlg && document.getElementById(dlg.getAttribute('aria-labelledby') ?? '')?.textContent === q('[data-p3="start-heading"]')?.textContent,
    heading: q('[data-p3="start-heading"]')?.textContent ?? null,
    close: q('[data-p3="start-close"]')?.textContent ?? null,
    order: [...document.querySelectorAll('[data-p3="start-path"]')].map((c) => c.querySelector('h3')?.textContent ?? ''),
    go: q('[data-p3="start-go"]')?.textContent ?? null,
    hex: q('[data-p3="start-hex"]')?.value ?? null,
    behindHex: q('[data-p3="primary-hex"]')?.value ?? null,
    colorErr: q('[data-p3="start-color-error"]')?.textContent ?? null,
    importErr: q('[data-p3="start-import-error"]')?.textContent ?? null,
    startInert: !!dlg?.closest('[inert]'),
    frameInert: !!q('[data-p3="frame-head"]')?.closest('[inert]'),
    guard: !!guard,
    guardTitle: q('[data-p3="start-guard-title"]')?.textContent ?? null,
    guardBody: q('[data-p3="start-guard-body"]')?.textContent ?? null,
    discard: q('[data-p3="start-guard-discard"]')?.textContent ?? null,
    guardOnTop: (() => {
      if (!guard) return false;
      const r = guard.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && guard.contains(hit);
    })(),
    discardStyle: (() => { const d = q('[data-p3="start-guard-discard"]'); if (!d) return null; const cs = getComputedStyle(d); return { bg: cs.backgroundColor, ink: cs.color, edge: cs.borderTopColor }; })(),
    focus: a?.getAttribute('data-p3') ?? a?.tagName ?? null,
    focusInStart: !!a && !!dlg?.contains(a),
    focusInGuard: !!a && !!guard?.contains(a),
    brand: q('[data-p3="brand-switcher"]')?.textContent ?? null,
    // The owner's review of #2142: every card's edge, the import card's heading row and description, and Import's state.
    cardEdges: [...document.querySelectorAll('[data-p3="start-path"]')].map((c) => { const cs = getComputedStyle(c); return `${cs.borderTopColor}|${cs.borderTopWidth}`; }),
    importHead: [...(q('[data-p3="start-import-head"]')?.children ?? [])].filter((n) => n.getClientRects().length)
      .map((n) => n.getAttribute('data-p3') ?? n.querySelector('h3')?.textContent ?? n.tagName),
    importDesc: q('[data-p3="start-import-head"] .p3-start-desc')?.textContent ?? null,
    importBelowPaste: (() => { const b = q('[data-p3="start-import"]'), t = q('[data-p3="start-paste"]'); if (!b || !t) return false;
      const rb = b.getBoundingClientRect(), rt = t.getBoundingClientRect(); return rb.top >= rt.bottom && Math.abs(rb.right - rt.right) < 1; })(),
    uploadAbovePaste: (() => { const u = q('[data-p3="start-upload"]'), t = q('[data-p3="start-paste"]'); return !!u && !!t && u.getBoundingClientRect().bottom <= t.getBoundingClientRect().top; })(),
    importDisabled: q('[data-p3="start-import"]')?.disabled ?? null,
    // N1 A: "Start blank" is the color card's secondary action, beside "Start from this color".
    colorDesc: document.querySelector('[data-p3="start-path"] .p3-start-desc')?.textContent ?? null,
    blankCard: (() => { const b = q('[data-p3="start-blank"]'); const cards = [...document.querySelectorAll('[data-p3="start-path"]')]; return b ? cards.indexOf(b.closest('[data-p3="start-path"]')) : -2; })(),
    blankFill: (() => { const b = q('[data-p3="start-blank"]'), g = q('[data-p3="start-go"]'); return b && g ? { blank: getComputedStyle(b).backgroundColor, go: getComputedStyle(g).backgroundColor, page: getComputedStyle(b.closest('[data-p3="start-path"]')).backgroundColor } : null; })(),
  };
});
/** The web's saved brand, the bytes a reload restores. Null in the plugin. */
const savedBrand = (page) => page.evaluate(() => { try { return localStorage.getItem('prism3:brandInput'); } catch { return null; } });

for (const { w, h } of START_SIZES) {
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      const where = `S12 ${host} ${theme} ${w}`;
      const { ctx, page, errors } = await openFirstRun({ host, theme, w, h });
      try {
        // ── the first run ────────────────────────────────────────────────────────────────────────
        let s = await readStartWindow(page);
        ok(s.open && s.role === 'dialog' && s.modal === 'true' && s.labelled, `${where}: the start is a modal window over the studio, named by its heading (G10 A)`);
        ok(s.heading === START.heading[host], `${where}: the heading reads "${START.heading[host]}" (G17) — reads "${s.heading}"`);
        ok(s.close === null, `${where}: the first run offers no Close (G15 A, S9) — found "${s.close}"`);
        ok(JSON.stringify(s.order) === JSON.stringify(START.order), `${where}: the cards run color (with Blank), examples, import (S8, N1 A) — ${JSON.stringify(s.order)}`);
        // The owner's review of #2142: one edge for all four cards; Upload on the import card's heading row; X1's words.
        ok(s.cardEdges.length === 3 && new Set(s.cardEdges).size === 1, `${where}: every card draws the same border — ${JSON.stringify(s.cardEdges)}`);
        ok(JSON.stringify(s.importHead) === JSON.stringify(['Import a design.md', 'start-upload']),
          `${where}: the import card's heading row holds its title and then "↑ Upload…" — holds ${JSON.stringify(s.importHead)}`);
        ok(s.uploadAbovePaste && s.importBelowPaste, `${where}: Upload sits above the paste box, Import below it at its right edge (upload above ${s.uploadAbovePaste}, import below ${s.importBelowPaste})`);
        ok(s.importDesc === START.importDesc, `${where}: the import card says "${START.importDesc}" (X1) — says "${s.importDesc}"`);
        ok(s.colorDesc === START.colorDesc, `${where}: the color card says "${START.colorDesc}" (N1 A) — says "${s.colorDesc}"`);
        ok(s.blankCard === 0, `${where}: "Start blank" sits inside the color card (N1 A) — in card ${s.blankCard}`);
        ok(!!s.blankFill && s.blankFill.blank === s.blankFill.page && s.blankFill.blank !== s.blankFill.go,
          `${where}: "Start blank" is the secondary action, on the card's own ground, not the primary fill — ${JSON.stringify(s.blankFill)}`);
        ok(s.go === START.go, `${where}: the color card's button reads "${START.go}" (S1) — reads "${s.go}"`);
        ok(!!s.hex && s.hex.toLowerCase() === (s.behindHex ?? '').toLowerCase(), `${where}: the color starts at the working brand's primary (G14): ${s.hex}, the primary behind is ${s.behindHex}`);
        ok(s.frameInert && s.focusInStart, `${where}: the studio behind is inert and focus is in the window (${s.focus})`);
        // The chrome probe, in this state: the window's text, edges, targets, fonts and inline values.
        const m = await measure(page, `${where} / start`, host, w);
        check(m, `${where} / start`, columnOf(host, w), w <= 560 ? INSPECT_NARROW_FLOOR : PLACE_FLOOR,
          { only: ['[data-p3="start-go"]', '[data-p3="start-hex"]', '[data-p3="start-example"]', '[data-p3="start-blank"]', '[data-p3="start-upload"]', '[data-p3="start-import"]'] });
        // X4 A: Import is disabled while the paste box is empty, in Prism3's disabled outline button, under the text
        // floor on purpose; this probe must exempt it. Then the button canary: a live copy of Import carrying every
        // computed style of the disabled one, which must fail its floor unexempted (#2174).
        ok(m.exempt.some((x) => x.hook === 'start-import'),
          `${where} / start: the contrast audit exempted the disabled Import button (floor 1) — exempted ${JSON.stringify(m.exempt.map((x) => x.el))}`);
        const bc = await exemptionCanary(page, '[data-p3="start-import"]:disabled');
        ok(canaryHolds(bc),
          `${where} / start: the exemption canary, a button with every computed style of the disabled Import (its class and hook too) that is not disabled, is not exempted and fails its floor — ${JSON.stringify(bc)}`);
        // Focus stays in the window, and every stop draws a ring.
        const rings = await focusRings(page);
        const ringHooks = new Set(rings.map((r) => r.hook));
        // Import is disabled while the box is empty, so Tab passes it here.
        for (const want of ['start-hex', 'start-go', 'start-example', 'start-blank', 'start-upload', 'start-paste']) ok(ringHooks.has(want), `${where}: Tab reaches ${want} inside the window`);
        // #2144 / FR1 A: every ring in the window, the paste box's included, is section 27's ring: Prism3's focus color,
        // 2px wide, outside the control, at 3:1 (`ringMisses`, against the emission's `FOCUS_HEX`).
        const offRings = rings.map((r) => ({ r, miss: ringMisses(r, theme) })).filter((x) => x.miss.length);
        ok(offRings.length === 0, `${where}: every stop in the start window draws its ring in ${FOCUS_RING_TOKEN} (${FOCUS_HEX[theme]}), 2px outside, at ${NONTEXT_MIN}:1 (FR1 A)${offRings.length ? ` — ${offRings.slice(0, 3).map(({ r, miss }) => `${r.hook}: ${miss.join(', ')}`).join(' | ')}` : ''}`);
        s = await readStartWindow(page);
        ok(s.focusInStart, `${where}: thirty Tabs later focus is still in the window (${s.focus})`);
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        ok((await readStartWindow(page)).open, `${where}: Escape does not close the first run`);

        // ── S3: a bad hex is refused, in words ─────────────────────────────────────────────────────
        const before = await savedBrand(page);
        await page.fill('[data-p3="start-hex"]', '#12345');
        await hooks.click(page.locator('[data-p3="start-go"]'));
        s = await readStartWindow(page);
        ok(s.open && s.colorErr === START.badHex, `${where}: a bad hex is refused with "${START.badHex}" (S3) — "${s.colorErr}", window ${s.open ? 'open' : 'closed'}`);
        ok(s.focus === 'start-hex' && (await savedBrand(page)) === before, `${where}: the refused hex loads nothing and focus goes to the field (${s.focus})`);

        // ── S7: import errors name their line; S2: an empty box asks for a brief; S6: the wrong file type ──────────
        // Import belongs to the paste box: disabled while it is empty or only spaces, enabled with text, named "Import" in
        // both states (read from the accessibility tree).
        const importNode = page.locator('[data-p3="start-import"]');
        const importState = async () => ({ disabled: (await readStartWindow(page)).importDisabled, aria: (await importNode.ariaSnapshot()).trim() });
        let st = await importState();
        ok(st.disabled === true && st.aria === '- button "Import" [disabled]', `${where}: with the box empty, Import is disabled and still named "Import" — ${JSON.stringify(st)}`);
        await page.fill('[data-p3="start-paste"]', '   \n ');
        st = await importState();
        ok(st.disabled === true, `${where}: with only spaces in the box, Import stays disabled — ${JSON.stringify(st)}`);
        await page.fill('[data-p3="start-paste"]', DUP_KEY_BRIEF);
        st = await importState();
        ok(st.disabled === false && st.aria === '- button "Import"', `${where}: with text in the box, Import is enabled, named "Import" — ${JSON.stringify(st)}`);
        await page.fill('[data-p3="start-paste"]', '');
        st = await importState();
        ok(st.disabled === true && (await readStartWindow(page)).importErr === '', `${where}: cleared again, Import is disabled again, and the empty-box sentence never shows on the start — ${JSON.stringify(st)}`);
        await page.fill('[data-p3="start-paste"]', DUP_KEY_BRIEF);
        await hooks.click(page.locator('[data-p3="start-import"]'));
        const dupErr = (await readStartWindow(page)).importErr ?? '';
        ok(dupErr.startsWith('Line 3: ') && /duplicate key 'id'/.test(dupErr) && !/at line/.test(dupErr), `${where}: a repeated key on line 3 says "Line 3: …" (S7) — "${dupErr}"`);
        await page.fill('[data-p3="start-paste"]', NO_LINE_BRIEF);
        await hooks.click(page.locator('[data-p3="start-import"]'));
        const noLine = (await readStartWindow(page)).importErr ?? '';
        ok(noLine.length > 0 && !/^Line \d+:/.test(noLine), `${where}: an error with no line drops the "Line ‹n›: " prefix (S7) — "${noLine}"`);
        await page.setInputFiles('[data-p3="start-file"]', { name: 'brief.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
        await page.waitForFunction(() => (document.querySelector('[data-p3="start-import-error"]')?.textContent ?? '').length > 0);
        const typeErr = (await readStartWindow(page)).importErr;
        ok(typeErr === START.fileType, `${where}: a file of another type says "${START.fileType}" (S6) — "${typeErr}"`);

        // ── a path out: the first example, with no guard (nothing to lose) ─────────────────────────────
        await page.fill('[data-p3="start-hex"]', '#336699');
        await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'harbor' }));
        s = await readStartWindow(page);
        ok(!s.open && !s.guard && (s.brand ?? '').includes('harbor'), `${where}: on the first run an example loads at once, no guard (brand "${s.brand}")`);

        // ── three edits, then "+ New brand" (G15, S9, S10) ──────────────────────────────────────────────
        await goPlace(page, 'brand');
        await page.fill('[data-p3="brand-name"]', 'harbor-edited');
        await hooks.click(page.locator('[data-p3="mode-on-wireframe"]'));   // harbor is light and dark: Wireframe on is one edit
        await goPlace(page, 'color-palettes');
        await page.fill('[data-p3="primary-hex"]', '#336699');
        await page.locator('[data-p3="primary-hex"]').press('Enter');
        const edited = await savedBrand(page);
        const reopen = async () => {
          await hooks.click(page.locator('[data-p3="brand-switcher"]'));
          await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
          await hooks.need(page, '[data-p3="start-screen"]');
        };
        await reopen();
        s = await readStartWindow(page);
        ok(s.close === START.close, `${where}: reopened, the start offers "${START.close}" (S9, S10) — "${s.close}"`);
        ok((s.hex ?? '').toLowerCase() === '#336699', `${where}: reopened, the color starts at the edited primary #336699 (G14) — ${s.hex}`);
        ok(s.heading === START.heading[host], `${where}: reopened, the heading is the same (G17)`);
        const mr = await measure(page, `${where} / reopened`, host, w);
        check(mr, `${where} / reopened`, columnOf(host, w), w <= 560 ? INSPECT_NARROW_FLOOR : PLACE_FLOOR,
          { only: ['[data-p3="start-close"]', '[data-p3="start-go"]', '[data-p3="start-hex"]', '[data-p3="start-example"]', '[data-p3="start-blank"]', '[data-p3="start-upload"]', '[data-p3="start-import"]'] });

        // The guard opens ON TOP of the start (S4), with focus on Cancel (S5).
        const aurora = page.locator('[data-p3="start-example"]').filter({ hasText: 'aurora' });
        await hooks.click(aurora);
        await page.waitForSelector('[data-p3="start-guard"]', { timeout: 3000 }).catch(() => {});
        s = await readStartWindow(page);
        ok(s.guard && s.discard === 'Discard 3 edits', `${where}: a start path over 3 unsaved edits asks first ("Discard 3 edits") — ${s.guard ? `"${s.discard}"` : `loaded without asking (brand "${s.brand}")`}`);
        if (!s.guard) throw new Error('no guard to measure');
        ok(s.guard && s.open && s.startInert && s.guardOnTop, `${where}: the guard opens on top of the start window, which stays open behind it (S4) — start ${s.open ? 'open' : 'closed'}, inert ${s.startInert}, on top ${s.guardOnTop}`);
        ok(s.focus === 'start-guard-cancel', `${where}: focus starts on Cancel (S5) — on ${s.focus}`);
        ok(s.guardTitle === 'Replace harbor-edited with the aurora example?', `${where}: the guard's title is "Replace ‹brand› with ‹choice›?" (S10) — "${s.guardTitle}"`);
        ok(s.guardBody === '3 edits to harbor-edited are not saved to a file. Export or apply first to keep them.', `${where}: the guard's body names the 3 edits (S10) — "${s.guardBody}"`);
        const want = DESTRUCTIVE[theme];
        ok(s.discardStyle?.bg === startRgb(want.fill) && s.discardStyle?.ink === startRgb(want.on) && s.discardStyle?.edge === startRgb(want.fill),
          `${where}: Discard wears Prism3's destructive button: fill ${want.fill}, label ${want.on} (S5) — ${JSON.stringify(s.discardStyle)}`);
        const guardRings = await focusRings(page);
        const offGuard = guardRings.map((r) => ({ r, miss: ringMisses(r, theme) })).filter((x) => x.miss.length);
        ok(guardRings.some((r) => r.hook === 'start-guard-discard') && offGuard.length === 0,
          `${where}: the guard's Cancel and Discard draw their rings in ${FOCUS_RING_TOKEN} (FR1 A)${offGuard.length ? ` — ${offGuard.slice(0, 3).map(({ r, miss }) => `${r.hook}: ${miss.join(', ')}`).join(' | ')}` : ''}`);
        await page.locator('[data-p3="start-guard-cancel"]').focus();
        const mg = await measure(page, `${where} / guard`, host, w);
        check(mg, `${where} / guard`, columnOf(host, w), w <= 560 ? INSPECT_NARROW_FLOOR : PLACE_FLOOR,
          { only: ['[data-p3="start-guard-cancel"]', '[data-p3="start-guard-discard"]', '[data-p3="start-close"]', '[data-p3="start-go"]'] });
        for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
        ok((await readStartWindow(page)).focusInGuard, `${where}: Tab stays in the guard`);
        // Cancel returns to the start, focus on the example that asked (S4).
        await hooks.click(page.locator('[data-p3="start-guard-cancel"]'));
        s = await readStartWindow(page);
        ok(!s.guard && s.open && !s.startInert && s.focus === 'start-example', `${where}: Cancel returns to the start window, focus on the example (S4) — guard ${s.guard}, start ${s.open ? 'open' : 'closed'}, focus ${s.focus}`);
        ok((s.brand ?? '').includes('harbor-edited') && (await savedBrand(page)) === edited, `${where}: Cancel loads nothing (brand "${s.brand}")`);
        // Escape in the guard is Cancel too.
        await hooks.click(aurora);
        await hooks.need(page, '[data-p3="start-guard"]');
        await page.keyboard.press('Escape');
        s = await readStartWindow(page);
        ok(!s.guard && s.open, `${where}: Escape in the guard returns to the start`);

        // Close returns to the brand you left, unchanged, focus on the brand switcher (G15, S9).
        await hooks.click(page.locator('[data-p3="start-close"]'));
        s = await readStartWindow(page);
        ok(!s.open && (s.brand ?? '').includes('harbor-edited') && s.focus === 'brand-switcher', `${where}: Close returns to the brand you left, focus on the brand switcher (brand "${s.brand}", focus ${s.focus})`);
        ok((await savedBrand(page)) === edited, `${where}: Close leaves the saved brand byte-identical`);
        // The origin came back with it: the brand menu's own guard still names the brand's edits.
        await hooks.click(page.locator('[data-p3="brand-switcher"]'));
        await hooks.click(page.locator('[data-p3="brand-menu-example"]').filter({ hasText: 'prism3' }));
        ok(await page.locator('[data-p3="overwrite-confirm"]').count() === 1, `${where}: after Close, the brand menu still asks before replacing the edited brand (the origin is kept)`);
        await hooks.click(page.locator('[data-p3="overwrite-cancel"]'));

        // The two pastes share one check: the brand menu shows the same words for the same briefs (S7, the S12 trap).
        await hooks.click(page.locator('[data-p3="brand-menu-import"]'));
        await page.fill('[data-p3="import-text"]', DUP_KEY_BRIEF);
        await hooks.click(page.locator('[data-p3="import-load"]'));
        ok((await page.locator('[data-p3="import-error"]').textContent()) === dupErr, `${where}: the brand menu's paste says what the start's says, "${dupErr}"`);
        await page.fill('[data-p3="import-text"]', '');
        await hooks.click(page.locator('[data-p3="import-load"]'));
        ok((await page.locator('[data-p3="import-error"]').textContent()) === START.emptyPaste, `${where}: the brand menu's empty paste says "${START.emptyPaste}"`);
        await page.setInputFiles('[data-p3="import-file"]', { name: 'brief.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
        await page.waitForFunction((t) => document.querySelector('[data-p3="import-error"]')?.textContent === t, START.fileType, { timeout: 3000 }).catch(() => {});
        ok((await page.locator('[data-p3="import-error"]').textContent()) === START.fileType, `${where}: the brand menu's upload says "${START.fileType}" for another type (S6)`);
        await hooks.click(page.locator('[data-p3="brand-switcher"]'));

        // Escape closes a reopened start; then Discard loads the choice.
        await reopen();
        await page.keyboard.press('Escape');
        ok(!(await readStartWindow(page)).open, `${where}: Escape closes a reopened start`);
        await reopen();
        await hooks.click(aurora);
        await hooks.click(page.locator('[data-p3="start-guard-discard"]'));
        s = await readStartWindow(page);
        ok(!s.open && !s.guard && (s.brand ?? '').includes('aurora'), `${where}: Discard loads the choice and closes both windows (brand "${s.brand}")`);
        // A clean brand: a start path loads at once.
        await reopen();
        await hooks.click(page.locator('[data-p3="start-blank"]'));
        s = await readStartWindow(page);
        ok(!s.open && !s.guard, `${where}: with nothing to lose, "Start blank" loads at once`);
        // N1 A moved the button, not what it starts: the web saves G13's neutral gray, byte for byte (a literal here).
        if (host === 'web') {
          const blankSaved = await savedBrand(page);
          ok(blankSaved === '{"v":2,"input":{"id":"untitled","root":"prism","modes":["light"],"primary":{"l":0.5,"c":0.03,"h":250},"neutral":{"hue":250,"chroma":0.004,"auto":true}}}',
            `${where}: "Start blank" from the color card saves G13's neutral gray — saved ${blankSaved}`);
        }
        ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      } catch (e) {
        ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
}

// ── Every start path goes through the guard (review of #2142: the color and paste paths could skip it unseen) ──────
// One edit to a loaded brand: each of the five paths must ask first ("Discard 1 edit"), and Cancel must leave the
// brand as it was. Nothing to lose: each path must load at once, no guard. Both hosts, both themes, at 1280.
const START_PATHS = (() => {
  const brief = readFileSync(join(REPO, 'packages/engine/examples/harbor.design.md'), 'utf8');
  return [
    ['color', async (page) => { await page.fill('[data-p3="start-hex"]', '#336699'); await hooks.click(page.locator('[data-p3="start-go"]')); }],
    ['Blank', async (page) => { await hooks.click(page.locator('[data-p3="start-blank"]')); }],
    ['an example', async (page) => { await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'aurora' })); }],
    ['paste', async (page) => { await page.fill('[data-p3="start-paste"]', brief); await hooks.click(page.locator('[data-p3="start-import"]')); }],
    ['upload', async (page) => { await page.setInputFiles('[data-p3="start-file"]', join(REPO, 'packages/engine/examples/harbor.design.md')); }],
  ];
})();
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const where = `S12 guard, every path, ${host} ${theme}`;
    const { ctx, page, errors } = await openFirstRun({ host, theme, w: 1280, h: 900 });
    try {
      const reopen = async () => {
        await hooks.click(page.locator('[data-p3="brand-switcher"]'));
        await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
        await hooks.need(page, '[data-p3="start-screen"]');
      };
      const outcome = async () => {
        await page.waitForFunction(() => !!document.querySelector('[data-p3="start-guard"]') || !document.querySelector('[data-p3="start-screen"]'), null, { timeout: 4000 }).catch(() => {});
        return readStartWindow(page);
      };
      // A fresh harbor (through the guard when there is one to clear), so each path starts from the same state.
      const loadHarbor = async () => {
        if (!(await readStartWindow(page)).open) await reopen();
        await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'harbor' }));
        if ((await outcome()).guard) await hooks.click(page.locator('[data-p3="start-guard-discard"]'));
      };
      // Before EACH path: harbor with exactly one edit (its name), so a path that skips the guard fails alone rather
      // than leaving the next path a clean brand.
      let edited = null;
      for (const [path, run] of START_PATHS) {
        await loadHarbor();
        await goPlace(page, 'brand');
        await page.fill('[data-p3="brand-name"]', 'harbor-one-edit');
        edited = await savedBrand(page);
        await reopen();
        await run(page);
        const s = await outcome();
        ok(s.guard && s.discard === 'Discard 1 edit', `${where}: the ${path} path over 1 unsaved edit asks first ("Discard 1 edit") — ${s.guard ? `"${s.discard}"` : `loaded without asking (brand "${s.brand}")`}`);
        if (!s.guard) continue;
        await hooks.click(page.locator('[data-p3="start-guard-cancel"]'));
        const back = await readStartWindow(page);
        ok(!back.guard && back.open && (back.brand ?? '').includes('harbor-one-edit') && (await savedBrand(page)) === edited,
          `${where}: Cancel on the ${path} path keeps the edited brand and the start open (brand "${back.brand}")`);
      }
      // Nothing to lose: every path loads at once, each from a freshly loaded harbor.
      for (const [path, run] of START_PATHS) {
        await loadHarbor();
        await reopen();
        await run(page);
        const s = await outcome();
        ok(!s.guard && !s.open, `${where}: with 0 edits, the ${path} path loads at once, no guard (guard ${s.guard}, start ${s.open ? 'open' : 'closed'})`);
        if (s.guard) await hooks.click(page.locator('[data-p3="start-guard-discard"]'));
      }
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}

// =============================================================================================
// X4 A (#2155) and Q28 a (#2154): a disabled button is Prism3's disabled button; no disabled control answers hover
// =============================================================================================
console.log(`\nX4 A, Q28 a — disabled buttons in Prism3's skin; no hover on a disabled control\n${'='.repeat(78)}`);
/** What a control draws, read off the page: its fill, four edges and ink, the ink of every label and glyph inside it,
 *  every dashed or dotted edge on it or inside it, and the colors and edges of it and everything inside it (so a hover
 *  that moves any of them shows). Runs in the page. */
const DISABLED_READ = (sel) => {
  const n = document.querySelector(sel);
  if (!n) return null;
  const cs = getComputedStyle(n);
  const inside = [n, ...n.querySelectorAll('*')];
  const drawn = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const side = ['Top', 'Right', 'Bottom', 'Left'];
  return {
    tag: n.tagName.toLowerCase(), cls: n.getAttribute('class') ?? '', hook: n.getAttribute('data-p3'),
    off: n.matches(':disabled') || n.getAttribute('aria-disabled') === 'true',
    fill: cs.backgroundColor, ink: cs.color, edges: side.map((x) => [cs[`border${x}Color`], cs[`border${x}Style`], parseFloat(cs[`border${x}Width`])]),
    labels: inside.filter((e) => drawn(e) && !e.closest('svg') && [...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())).map((e) => getComputedStyle(e).color),
    glyphs: [...n.querySelectorAll('svg.p3-ico')].filter(drawn).map((g) => getComputedStyle(g).color),
    // A dashed or dotted side that draws: some width, a color that is not fully transparent, on a drawn element.
    dashed: inside.flatMap((e) => { const c = getComputedStyle(e); return side.filter((x) => ['dashed', 'dotted'].includes(c[`border${x}Style`]) && parseFloat(c[`border${x}Width`]) > 0
      && !/^rgba\([^)]*,\s*0\)$|^transparent$/.test(c[`border${x}Color`]) && drawn(e)).map((x) => `${e.getAttribute('class') ?? e.tagName} ${x.toLowerCase()} ${c[`border${x}Style`]}`); }),
    look: JSON.stringify(inside.map((e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.color, ...side.map((x) => `${c[`border${x}Color`]} ${c[`border${x}Style`]}`), c.outlineStyle, c.boxShadow]; })),
  };
};
/** Turn a control off or on the way the chrome does for its kind: native `disabled`, `aria-disabled`, or (a color
 *  field, which is a group) every field inside it. Returns whether it was off before, so the caller can put it back. */
const SET_OFF = ([sel, form, on]) => {
  const n = document.querySelector(sel);
  if (!n) return null;
  const was = n.matches(':disabled') || n.getAttribute('aria-disabled') === 'true' || [...n.querySelectorAll('input')].some((x) => x.disabled);
  if (form === 'native') n.disabled = on;
  else if (form === 'aria') { if (on) n.setAttribute('aria-disabled', 'true'); else n.removeAttribute('aria-disabled'); }
  else for (const x of n.querySelectorAll('input')) x.disabled = on;
  return was;
};
const hoverLook = async (page, sel) => {
  await page.mouse.move(1, 1);
  const rest = await page.evaluate(DISABLED_READ, sel);
  await page.locator(sel).hover({ force: true, timeout: 3000 });
  const hovered = await page.evaluate(DISABLED_READ, sel);
  await page.mouse.move(1, 1);
  return { rest, hovered, moved: rest?.look !== hovered?.look };
};
/** One verdict line on a disabled button's skin against `DISABLED_SKIN`, read for the chrome theme drawn. */
const skinVerdict = (r, scheme) => {
  const appearance = DISABLED_APPEARANCE(r);
  const want = DISABLED_SKIN(appearance, scheme);
  const got = drawnSkin(r);
  const labels = [...new Set(r.labels.map(paintOf))], glyphs = [...new Set(r.glyphs.map(paintOf))];
  const pass = !!want && got.fill === want.fill && got.edge === want.edge && got.ink === want.ink && labels.every((c) => c === want.ink) && glyphs.every((c) => c === want.glyph);
  return { appearance, want, pass, drew: { ...got, labels, glyphs } };
};

// 1. Every appearance the chrome uses, on both hosts and in both chrome themes, read on a real control: Import (outline,
// disabled by the app while the paste box is empty), Start from this color (filled), Close (text) and the search
// glyph (text, an icon button), and the guard's Discard (destructive, filled). The others are switched off here the
// way the app switches a button off (`disabled`). Each must draw exactly its appearance's Prism3 disabled roles, no
// dashed edge, and nothing on hover; switched back on, the same control answers hover (the control arm). With a
// screenshot directory, each is saved as `2155-{web,plugin}-{light,dark}-{appearance}.png`.
const X4_SHOT = async (page, sel, name) => {
  if (!SHOTS) return;
  const box = await page.locator(sel).boundingBox();
  if (box) await page.screenshot({ path: join(SHOTS, `${name}.png`), clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 12), width: box.width + 24, height: box.height + 24 } });
};
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const where = `X4 A: ${host} ${theme}`;
    const tag = `2155-${host === 'web' ? 'web' : 'plugin'}-${theme}`;
    const { ctx, page, errors } = await openFirstRun({ host, theme, w: 1280, h: 900 });
    try {
      const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
      const seen = [];
      const one = async (label, sel, natural) => {
        await hooks.need(page, sel);
        await page.locator(sel).scrollIntoViewIfNeeded();
        const was = natural ? null : await page.evaluate(SET_OFF, [sel, 'native', true]);
        const off = await hoverLook(page, sel);
        const r = off.rest;
        const v = skinVerdict(r, scheme);
        seen.push(v.appearance);
        ok(r.off && (natural ? r.tag === 'button' : was === false),
          `${where}: ${label} (${r.hook}) is a ${natural ? 'button the app disabled' : 'button switched off here'} (off ${r.off}${natural ? '' : `, off before ${was}`})`);
        ok(v.pass, `${where}: the disabled ${label} (${r.hook}) draws Prism3's disabled ${v.appearance} button: ${v.want?.roles} (want fill ${v.want?.fill}, edge ${v.want?.edge}, ink ${v.want?.ink}, glyph ${v.want?.glyph}; drew ${JSON.stringify(v.drew)})`);
        ok(r.dashed.length === 0, `${where}: the disabled ${label} (${r.hook}) draws no dashed edge${r.dashed.length ? ` — ${r.dashed.join(', ')}` : ''}`);
        ok(!off.moved, `${where}: a pointer over the disabled ${label} (${r.hook}) changes nothing (Q28 a)`);
        await X4_SHOT(page, sel, `${tag}-${v.appearance === 'filled' && /danger/.test(r.cls) ? 'destructive' : v.appearance}${/search/.test(r.hook ?? '') ? '-icon' : ''}`);
        await page.evaluate(SET_OFF, [sel, 'native', false]);
        const on = await hoverLook(page, sel);
        ok(!on.rest.off && on.moved, `${where}: control: ${label} (${r.hook}) switched on answers hover, so the probe sees a hover`);
        if (natural) await page.evaluate(SET_OFF, [sel, 'native', true]);
      };
      await one('Import', '[data-p3="start-import"]', true);
      await one('Start from this color', '[data-p3="start-go"]', false);
      // Load the example, make one edit, and reopen the start: Close is drawn, and an example now asks first.
      await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }));
      await hooks.need(page, '[data-p3="palettes-levers"]');
      await goPlace(page, 'brand');
      await page.fill('[data-p3="brand-name"]', 'prism3-edited');
      await page.locator('[data-p3="brand-name"]').press('Enter');
      await one('search', '[data-p3="search-open"]', false);
      await hooks.click(page.locator('[data-p3="brand-switcher"]'));
      await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
      await hooks.need(page, '[data-p3="start-screen"]');
      await one('Close', '[data-p3="start-close"]', false);
      await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'aurora' }));
      await hooks.need(page, '[data-p3="start-guard-discard"]');
      await one('Discard', '[data-p3="start-guard-discard"]', false);
      ok(['outline', 'filled', 'text'].every((a) => seen.includes(a)) && seen.length === 5,
        `${where}: every appearance the chrome uses was read disabled: outline, filled (twice, Discard among them) and text — read ${JSON.stringify(seen)}`);
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}

// 2. Q28 a: one control of each kind the chrome draws, switched off the way the app switches that kind off, changes
// nothing under the pointer: no color, no edge, no fill, on itself or anything inside it, and it draws no dashed
// edge. Switched back on, the same control answers hover (the control arm, which proves the probe sees a hover). Both
// hosts, both chrome themes. The kinds are found on the page, the first one drawn and not chosen; a kind not found
// fails by name.
const HOVER_KINDS = [
  ['button', '.p3-btn.p3-btn-page:not(.p3-chip, .p3-check, .p3-switch, .p3-mcheck, .p3-next, .p3-btn-ghost, .p3-pick, .p3-addrow)', 'native'],
  ['picker button', '.p3-btn.p3-pick:not([aria-expanded="true"], [data-set="true"])', 'native'],
  ['filled button', '.p3-btn.p3-next', 'native'],
  ['ghost button', '.p3-btn.p3-btn-ghost:not(.p3-info, .p3-deplink)', 'native'],
  ['add row', '.p3-btn.p3-addrow', 'native'],
  ['chip', '.p3-btn.p3-chip:not([aria-pressed="true"])', 'native'],
  ['check', '.p3-btn.p3-check:not([aria-checked="true"])', 'aria'],
  ['matrix check', '.p3-btn.p3-mcheck:not([aria-checked="true"])', 'aria'],
  ['switch', '.p3-btn.p3-switch', 'native'],
  ['segmented tab', '[data-p3="levers-pane"] .p3-seg-tab:not([aria-selected="true"], [aria-pressed="true"], [aria-checked="true"])', 'native'],
  ['select', '[data-p3="levers-pane"] .p3-select', 'native'],
  ['color field', '.p3-colorfield', 'inner'],
  ['text field', '.p3-text-input:not(:disabled)', 'native'],
  ['picker step', '.p3-step:not([aria-pressed="true"])', 'native'],
  ['picker value', '.p3-vpick:not([aria-pressed="true"], [aria-disabled="true"])', 'aria'],
];
/** Mark the first drawn, enabled control matching `sel` with `data-chover`, and say whether one was found. */
const MARK_KIND = (sel) => {
  for (const n of document.querySelectorAll('[data-chover]')) n.removeAttribute('data-chover');
  const n = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length && !x.closest('[inert], [data-content]')
    && !x.matches(':disabled') && x.getAttribute('aria-disabled') !== 'true' && ![...x.querySelectorAll('input')].some((i) => i.disabled));
  if (!n) return false;
  n.setAttribute('data-chover', '');
  return true;
};
// Where each kind is drawn: the places, and a step that opens what a place hides (Type's advanced sections, a value
// picker on Layout, a step picker on Surfaces & fills).
const HOVER_TOUR = [
  ['brand', null],
  ['color-palettes', null],
  ['layout', async (page) => { await hooks.click(page.locator('[data-p3="levers-pane"] .p3-btn.p3-pick').first()); await hooks.need(page, '[data-p3="value-picker"]'); }],
  ['type', openTypeAdvanced],
  ['color-fills', async (page) => { await hooks.click(page.locator('[data-p3="levers-pane"] [data-p3="fill-pick"]').first()); await hooks.need(page, '[data-p3="levers-pane"] [data-p3="step-picker"]'); }],
];
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const where = `Q28 a: ${host} ${theme}`;
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    try {
      const done = new Set();
      for (const [place, reveal] of HOVER_TOUR) {
        await goPlace(page, place);
        if (reveal) await reveal(page).catch(() => {});
        for (const [kind, sel, form] of HOVER_KINDS) {
          if (done.has(kind) || !(await page.evaluate(MARK_KIND, sel))) continue;
          done.add(kind);
          const m = '[data-chover]';
          await page.locator(m).scrollIntoViewIfNeeded();
          const on = await hoverLook(page, m);
          await page.evaluate(SET_OFF, [m, form, true]);
          const off = await hoverLook(page, m);
          await page.evaluate(SET_OFF, [m, form, false]);
          ok(on.moved, `${where}: control: an enabled ${kind} (${on.rest?.hook ?? on.rest?.cls}, on ${place}) answers hover, so the probe sees a hover`);
          ok(off.rest?.off === true || form === 'inner', `${where}: the ${kind} (${off.rest?.hook ?? off.rest?.cls}) is off for the hover read (${form})`);
          ok(!off.moved, `${where}: a pointer over a disabled ${kind} (${off.rest?.hook ?? off.rest?.cls}, on ${place}) changes nothing (Q28 a)`);
          ok(off.rest?.dashed.length === 0, `${where}: a disabled ${kind} (${off.rest?.hook ?? off.rest?.cls}) draws no dashed edge${off.rest?.dashed.length ? ` — ${off.rest.dashed.join(', ')}` : ''}`);
          if (/\bp3-(btn|vpick)\b/.test(off.rest?.cls ?? '')) {
            const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
            const v = skinVerdict(off.rest, scheme);
            ok(v.pass, `${where}: a disabled ${kind} (${off.rest.hook ?? off.rest.cls}) draws Prism3's disabled ${v.appearance} button: ${v.want?.roles} (drew ${JSON.stringify(v.drew)})`);
          }
          await page.evaluate(() => { for (const n of document.querySelectorAll('[data-chover]')) n.removeAttribute('data-chover'); });
        }
      }
      const missing = HOVER_KINDS.map(([k]) => k).filter((k) => !done.has(k));
      ok(missing.length === 0, `${where}: every control kind was hovered off and on (${done.size} of ${HOVER_KINDS.length})${missing.length ? ` — not found: ${missing.join(', ')}` : ''}`);
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}

// 3. Every control a derived mode switches off, on every place, on both hosts and in both chrome themes: no dashed
// edge on any of them (#2155: no chrome control draws a dashed edge to mean disabled), and every disabled button draws
// its appearance's Prism3 disabled roles. Counted, with a floor, so a sweep that found no disabled button fails.
const DERIVED_OFF_FLOOR = 100;
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const where = `X4 A derived: ${host} ${theme}`;
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    try {
      await showMode(page, 'hc-light');
      const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
      let buttons = 0, controls = 0;
      const bad = [], dashed = [];
      for (const place of ['color-palettes', 'color-fills', 'color-interactive', 'type', 'shape', 'depth', 'layout', 'components']) {
        await goPlace(page, place);
        if (place === 'type') await openTypeAdvanced(page).catch(() => {});
        const n = await page.evaluate(() => {
          const offs = [...document.querySelectorAll('[data-p3="frame"] :is(button, select, input, textarea, [role="switch"], [role="checkbox"], [role="radio"])')]
            .filter((x) => x.getClientRects().length && (x.matches(':disabled') || x.getAttribute('aria-disabled') === 'true') && x.getAttribute('aria-busy') !== 'true' && !x.closest('[data-content]'));
          offs.forEach((x, i) => x.setAttribute('data-cderived', String(i)));
          return offs.length;
        });
        for (let i = 0; i < n; i++) {
          const r = await page.evaluate(DISABLED_READ, `[data-cderived="${i}"]`);
          if (!r) continue;
          controls++;
          if (r.dashed.length) dashed.push(`${place} ${r.hook ?? r.cls}: ${r.dashed.join(', ')}`);
          if (!/\bp3-(btn|vpick)\b/.test(r.cls)) continue;
          buttons++;
          const v = skinVerdict(r, scheme);
          if (!v.pass) bad.push(`${place} ${r.hook ?? r.cls} (${v.appearance}): ${JSON.stringify(v.drew)}`);
        }
        await page.evaluate(() => { for (const x of document.querySelectorAll('[data-cderived]')) x.removeAttribute('data-cderived'); });
      }
      // DB1 A (#2208): Brand › Modes' always-on Light row is a fixed fact, not a control, and it draws the same
      // "can't change" look: the sweep reads it too, and its box is held to Prism3's disabled check box below.
      await goPlace(page, 'brand');
      const LIGHT_ROW = '[data-p3="levers-pane"] [data-p3="mode-on-light"]';
      const fixed = await page.evaluate(DISABLED_READ, LIGHT_ROW);
      if (fixed) { controls++; if (fixed.dashed.length) dashed.push(`brand ${fixed.hook}: ${fixed.dashed.join(', ')}`); }
      console.log(`  ${where}: ${controls} disabled controls read, ${buttons} of them buttons`);
      ok(buttons >= DERIVED_OFF_FLOOR, `${where}: HC light switched off ${buttons} chrome buttons across the places (floor ${DERIVED_OFF_FLOOR})`);
      ok(bad.length === 0, `${where}: every disabled chrome button draws its appearance's Prism3 disabled roles (${buttons} read)${bad.length ? ` — ${bad.slice(0, 4).join(' | ')}` : ''}`);
      ok(!!fixed && dashed.length === 0, `${where}: no disabled chrome control, and not the fixed Light row (mode-on-light, read ${!!fixed}), draws a dashed edge (${controls} read)${dashed.length ? ` — ${dashed.slice(0, 4).join(' | ')}` : ''}`);
      // The fixed Light row's box against the emission's disabled check box roles (`PRISM3_DISABLED`, resolved from the
      // committed emission, never from the studio's CSS): fill `disabled.fill`, a solid `disabled.border` edge on all
      // four sides, the check mark drawn in `disabled.on-fill`. It stays a fixed fact with its words: a `div` that is
      // no control and takes no focus, its box hidden from assistive tech, its text the literal below.
      const box = await page.evaluate((sel) => {
        const r = document.querySelector(sel), b = r?.querySelector('.p3-check-box'), m = b?.querySelector('svg.p3-ico');
        if (!b) return null;
        const c = getComputedStyle(b), side = ['Top', 'Right', 'Bottom', 'Left'];
        return { fill: c.backgroundColor, edges: side.map((x) => [c[`border${x}Color`], c[`border${x}Style`], parseFloat(c[`border${x}Width`])]),
          mark: m && m.getClientRects().length ? getComputedStyle(m).color : null, tag: r.tagName.toLowerCase(), role: r.getAttribute('role'),
          tabindex: r.getAttribute('tabindex'), boxHidden: b.getAttribute('aria-hidden'), text: r.textContent };
      }, LIGHT_ROW);
      const want = PRISM3_DISABLED[scheme];
      const got = box && { ...drawnSkin({ fill: box.fill, edges: box.edges, ink: box.mark }) };
      ok(!!box && !!want && got.fill === want.fill && got.edge === want.edge && got.ink === want.ink,
        `${where}: DB1 A: the fixed Light row's box draws Prism3's disabled check box: fill color.disabled.fill ${want?.fill}, a solid edge color.disabled.border ${want?.edge}, the mark on color.disabled.on-fill ${want?.ink} — drew ${JSON.stringify(got)}`);
      ok(!!box && box.tag === 'div' && box.role === null && box.tabindex === null && box.boxHidden === 'true'
        && box.text === 'LightAlways generated: it\u2019s the base mode.',
        `${where}: DB1 A: the fixed Light row stays a fixed fact that says Light is always on (a div, no role, no tabindex, box aria-hidden, "Light" + "Always generated: it’s the base mode.") — read ${JSON.stringify(box && { tag: box.tag, role: box.role, tabindex: box.tabindex, boxHidden: box.boxHidden, text: box.text })}`);
      if (SHOTS) {
        const at = await page.locator(LIGHT_ROW).locator('xpath=..').boundingBox();
        if (at) await page.screenshot({ path: join(SHOTS, `2208-${host === 'web' ? 'web' : 'plugin'}-${theme}-modes.png`), clip: { x: Math.max(0, at.x - 16), y: Math.max(0, at.y - 48), width: at.width + 32, height: at.height + 64 } });
      }
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}

// =============================================================================================
// 29. #2175 (owner decision PN1 B, 2026-10-05): Pinned is the third neutral source on Color › Palettes
// =============================================================================================
// "Pinned" sits beside "Follow primary" and "Custom tint" in the Neutrals section; exactly one is selected, and Pinned is
// selected exactly when the brand carries `neutral.anchor`. Its color field appears under the choice only while Pinned
// is selected. Choosing Follow or Custom while pinned unpins and restores that source, the way the old switch off then
// that choice did. No "Pinned neutral" section, and no switch, is left behind Show advanced. At 380 the three
// segments fit without clipping on both hosts and both themes (one narrow-tier padding rule, PN1).
// THE ORACLES, independent of the panel: the PERSISTED brand (web: `prism3:brandInput`, read from storage) and the
// PREVIEW's neutral anchor pill (both hosts), a separate render path from the levers. The labels, the state line,
// the typed gray and the section titles are literals here, never read from the source.
console.log(`\n#2175 — Pinned, the third neutral source\n${'='.repeat(78)}`);
{
  const PN_LABELS = ['Follow primary', 'Custom tint', 'Pinned'];
  const PN_GRAY = '#5c6670';
  const PN_STATE = `A pinned neutral sets the ramp: ${PN_GRAY}. Hue and chroma are its readout.`;
  const pn = (page) => page.evaluate(() => {
    const radios = [...document.querySelectorAll('[data-p3="neutral-source"] [role="radio"]')].map((b) => ({ l: b.textContent, on: b.getAttribute('aria-checked') === 'true' }));
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('prism3:brandInput'))?.input?.neutral ?? null; } catch { stored = null; }
    const hue = document.querySelector('[data-p3="lever-neutral-hue"]');
    const blk = document.querySelector('[data-p3="lever-neutral-anchor"]');
    const levers = document.querySelector('[data-p3="palettes-levers"]');
    return {
      radios, stored, pill: !!document.querySelector('[data-p3="palette"][data-palette="neutral"] .p3-palh-anchor'),
      blocks: document.querySelectorAll('[data-p3="lever-neutral-anchor"]').length, field: !!document.querySelector('[data-p3="neutral-anchor-hex"]'),
      underChoice: blk ? blk.previousElementSibling === hue : null,
      state: hue?.querySelector('.p3-lever-state')?.textContent.trim() ?? '',
      switches: levers?.querySelectorAll('[role="switch"]').length ?? -1,
      titles: [...(levers?.querySelectorAll('.p3-lsec-title') ?? [])].map((t) => t.textContent.trim()),
      adv: document.querySelector('[data-p3="palettes-advanced"]')?.textContent ?? null,
    };
  });
  const fit = (page) => page.evaluate(() => {
    const g = document.querySelector('[data-p3="neutral-source"]');
    if (!g) return null;
    const ctl = g.closest('.p3-lever-ctl').getBoundingClientRect();
    const tabs = [...g.querySelectorAll('.p3-seg-tab')];
    const pane = document.querySelector('[data-p3="levers-pane"]');
    return { ctlRight: Math.round(ctl.right * 10) / 10, groupRight: Math.round(g.getBoundingClientRect().right * 10) / 10,
      lastRight: Math.round(tabs[tabs.length - 1].getBoundingClientRect().right * 10) / 10,
      clipped: tabs.filter((t) => t.scrollWidth > t.clientWidth).map((t) => t.textContent), paneOverflow: pane.scrollWidth - pane.clientWidth };
  });
  const fits = (f) => !!f && f.clipped.length === 0 && f.lastRight <= f.ctlRight + 0.5 && f.groupRight <= f.ctlRight + 0.5 && f.paneOverflow <= 0;
  const settle = (page, want) => page.waitForFunction((w) => [...document.querySelectorAll('[data-p3="neutral-source"] [role="radio"]')]
    .find((b) => b.getAttribute('aria-checked') === 'true')?.textContent === w, want, { timeout: 5000 }).catch(() => {}).then(() => page.waitForTimeout(150));
  for (const host of ['web', 'figma']) {
    for (const theme of ['light', 'dark']) {
      for (const w of [1280, 380]) {
        const where = `#2175 ${host} ${theme} ${w}`;
        const { ctx, page, errors } = await open({ host, theme, w, h: 900 });
        try {
          // The anchor's truth: the persisted brand on the web; the preview's anchor pill on both (and they must agree).
          const anchored = (x) => (host === 'web' ? !!x.stored?.anchor : x.pill);
          const selected = (x) => x.radios.filter((r) => r.on).map((r) => r.l);
          const shot = async (state) => {
            if (!SHOTS) return;
            await page.locator('[data-p3="lever-neutral-hue"]').scrollIntoViewIfNeeded();
            await page.screenshot({ path: join(SHOTS, `2175-${host === 'web' ? 'web' : 'plugin'}-${theme}-${w}-${state}.png`), fullPage: false });
          };
          // Unpinned, as prism3 boots.
          const s0 = await pn(page);
          ok(JSON.stringify(s0.radios.map((r) => r.l)) === JSON.stringify(PN_LABELS), `${where}: the neutral source offers ${PN_LABELS.join(', ')}, in that order (offers ${JSON.stringify(s0.radios.map((r) => r.l))})`);
          ok(selected(s0).length === 1 && selected(s0)[0] !== 'Pinned' && !anchored(s0), `${where}: unpinned, exactly one source is selected and it is not Pinned (${JSON.stringify(selected(s0))}, anchor ${anchored(s0)})`);
          if (host === 'web') ok(!!s0.stored?.anchor === s0.pill, `${where}: the persisted anchor and the preview's anchor pill agree, unpinned (${!!s0.stored?.anchor}, ${s0.pill})`);
          hooks.absent(ok, { seen: s0.radios.length === 3, state: 'the neutral source, unpinned' }, s0.blocks === 0 && !s0.field, `${where}: unpinned, no pinned color field is drawn (${s0.blocks} block(s), field ${s0.field})`);
          const f0 = await fit(page);
          ok(fits(f0), `${where}: unpinned, the three neutral sources fit their row with no clipping (${JSON.stringify(f0)})`);
          await shot('unpinned');
          // No Advanced pinned section remains, with Show advanced open.
          await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
          await hooks.need(page, '[data-p3="lever-status-info"]');
          const sa = await pn(page);
          ok(!sa.titles.includes('Pinned neutral') && sa.switches === 0 && sa.adv === 'Hide 4 advanced',
            `${where}: no "Pinned neutral" section and no switch remain behind Show advanced (sections ${JSON.stringify(sa.titles)}, ${sa.switches} switch(es), "${sa.adv}")`);
          await hooks.click(page.locator('[data-p3="palettes-advanced"]'));
          // Pinned.
          await hooks.click(page.locator('[data-p3="neutral-source-pinned"]'));
          await settle(page, 'Pinned');
          await hooks.need(page, '[data-p3="neutral-anchor-hex"]');
          const s1 = await pn(page);
          ok(JSON.stringify(selected(s1)) === '["Pinned"]' && anchored(s1), `${where}: choosing Pinned selects it alone and pins the neutral (${JSON.stringify(selected(s1))}, anchor ${anchored(s1)})`);
          if (host === 'web') ok(!!s1.stored?.anchor === s1.pill, `${where}: the persisted anchor and the preview's anchor pill agree, pinned (${!!s1.stored?.anchor}, ${s1.pill})`);
          ok(s1.blocks === 1 && s1.field && s1.underChoice === true, `${where}: pinned, the pinned color field appears once, directly under the source (${s1.blocks} block(s), field ${s1.field}, under ${s1.underChoice})`);
          const ancField = page.locator('[data-p3="neutral-anchor-hex"]');
          await ancField.fill(PN_GRAY);
          await ancField.press('Enter');
          await page.waitForFunction((t) => document.querySelector('[data-p3="lever-neutral-hue"] .p3-lever-state')?.textContent.trim() === t, PN_STATE, { timeout: 5000 }).catch(() => {});
          const s2 = await pn(page);
          ok(s2.state === PN_STATE, `${where}: pinned to ${PN_GRAY}, the state line reads "${PN_STATE}" (reads "${s2.state}")`);
          const f1 = await fit(page);
          ok(fits(f1), `${where}: pinned, the three neutral sources fit their row with no clipping (${JSON.stringify(f1)})`);
          await shot('pinned');
          // Follow primary while pinned: unpins, and Follow primary is the source.
          await hooks.click(page.locator('[data-p3="neutral-source-follow"]'));
          await settle(page, 'Follow primary');
          const s3 = await pn(page);
          ok(JSON.stringify(selected(s3)) === '["Follow primary"]' && !anchored(s3) && s3.blocks === 0 && s3.state === '',
            `${where}: choosing Follow primary while pinned unpins and follows primary (${JSON.stringify(selected(s3))}, anchor ${anchored(s3)}, ${s3.blocks} block(s), state "${s3.state}")`);
          if (host === 'web') ok(s3.stored?.auto === true && !('anchor' in (s3.stored ?? {})), `${where}: the saved neutral follows primary with no anchor (${JSON.stringify(s3.stored)})`);
          // Pin again, then Custom tint: unpins, and the custom tint is the source.
          await hooks.click(page.locator('[data-p3="neutral-source-pinned"]'));
          await settle(page, 'Pinned');
          const s4 = await pn(page);
          ok(JSON.stringify(selected(s4)) === '["Pinned"]' && anchored(s4), `${where}: Pinned again from Follow primary (${JSON.stringify(selected(s4))}, anchor ${anchored(s4)})`);
          if (host === 'web') ok(s4.stored?.auto === true && !!s4.stored?.anchor, `${where}: pinning keeps the saved Follow primary underneath (${JSON.stringify(s4.stored)})`);
          await hooks.click(page.locator('[data-p3="neutral-source-custom"]'));
          await settle(page, 'Custom tint');
          const s5 = await pn(page);
          ok(JSON.stringify(selected(s5)) === '["Custom tint"]' && !anchored(s5) && s5.blocks === 0,
            `${where}: choosing Custom tint while pinned unpins and takes the custom tint (${JSON.stringify(selected(s5))}, anchor ${anchored(s5)}, ${s5.blocks} block(s))`);
          if (host === 'web') ok(!('auto' in (s5.stored ?? {})) && !('anchor' in (s5.stored ?? {})) && typeof s5.stored?.hue === 'number', `${where}: the saved neutral is a custom tint with no anchor (${JSON.stringify(s5.stored)})`);
          ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
        } catch (e) {
          ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
        } finally { await ctx.close(); }
      }
    }
  }
}


// Search still finds the pinned neutral while unpinned (review of #2195). Unpinned, `neutral.anchor` draws no block of its
// own, so the "Neutral hue" block, which holds its Pinned choice, must answer a search for it, as main's Advanced block did.
for (const host of ['web', 'figma']) {
  for (const q of ['pin', 'anchor']) {
    const where = `#2175 search ${host} "${q}"`;
    const { ctx, page } = await open({ host, theme: 'light', w: 1280, h: 900 });
    try {
      await hooks.click(page.locator('[data-p3="search-open"]'));
      await hooks.need(page, '[data-p3="search-input"]');
      await page.keyboard.type(q, { delay: 20 });
      await page.waitForFunction(() => !!document.querySelector('[data-p3="search-status"]')?.textContent, null, { timeout: 5000 }).catch(() => {});
      const r = await page.evaluate(() => {
        const g = document.querySelector('[data-p3="levers-pane"] [data-p3="neutral-source"]');
        return { source: !!g && g.getBoundingClientRect().height > 0, anchorBlocks: document.querySelectorAll('[data-p3="lever-neutral-anchor"]').length,
          status: document.querySelector('[data-p3="search-status"]')?.textContent ?? '' };
      });
      ok(r.source && r.anchorBlocks === 0, `${where}: unpinned, searching "${q}" reaches the Neutral source group, where Pinned is chosen (${JSON.stringify(r)})`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}

// =============================================================================================
// 30. The heading rule (heading pass 1 of 2, TY2 A, approved 2026-10-06): three levels on every page, both hosts, both
//     themes, at 1280 and 380, each level's size, weight, line height and space after held to the chrome tokens' EMITTED values
// =============================================================================================
// L1 section title: fs-16 / fw-strong / lh-compact / ls-snug; its description space-050 under it, its content space-300
// after the head. L2 group heading (a lever's name, a row list's sub-heading, an Interactive group's title, a Grid
// breakpoint's name): fs-14 / fw-strong / lh-compact; its content space-150 after its row, or space-050 when what follows
// is the lever's own one-line description. L3 field label: fs-14 / fw-emphasis / lh-compact, in color.text.primary; its
// control space-050 after it. Table headers are not a level, and keep fs-12. The ⓘ is only ever a button: it keeps its
// hit-min target, sits space-050 after the heading text, centered on the line, and does not set the row's height; and no
// hint line draws a glyph (HP3).
//
// THE SWEEP (the review of #2210): the audit's list says what each page must show, and it cannot fail on a heading it does
// not name. So every element in the levers pane that is a heading by its tag or role (h1–h6, legend, [role="heading"]),
// and every text drawn at fw-strong or fs-16 and up outside a control, must be one of the levels (or a table header), or
// sit in HEADING_EXEMPT with its reason; and no heading tag skips a level after the one before it.
//
// INDEPENDENCE (docs/34). The elements are found by class or hook, each literal here, never by the CSS's own selectors.
// The expected values are the EMISSION's: each chrome token the rule names is mapped, by a literal in this file, to its
// emitted path in the committed `packages/engine/out/prism3.tokens.json` (and its dark overlay, for the ink), and resolved
// here by this file's own alias walk; not from `chrome.css`, not from `chrome/tokens.mjs`'s map, and not through its
// `resolve`. The headings each page must show are the audit's per-page list (scratch audit of 2026-10-05, prism3, every
// Show advanced opened), typed here; the counts are literal floors, so a sweep that finds fewer fails naming its count.
//
// Mutations, each failing by name (heading pass 1), measured on the built bundles:
//   · an L2 back at fw-default (`.p3-lever-name`'s weight on `--p3-fw-default`) →
//     `TY2 A web light 1280 / brand: L2 "Brand name" (lever name) fw 400, want fw-strong 600` (232 failures, every host and theme).
//   · the space after an L2 back to 4px (the head's `padding-block-end` turned into a `space-050` pull-up, the legend's to
//     `space-050`) → `TY2 A web light 1280 / brand: L2 "Brand name" (lever name) space after 4, want space-150 12` (232).
//   · one hint line's glyph put back (Components' web sets hint, `glyph('info')` prepended) →
//     `HP3 TY2 A web light 1280 / components (light): hint line components-sets-web draws a glyph — …` and
//     `… a non-button ⓘ glyph is drawn — components-sets-web: …` (8: the web host, both themes, Light and High contrast light).
//   · the ⓘ's overhang back on the button's own `1lh` (the narrow tier's ⓘ is ctl-h-xs tall) →
//     `TY2 A web light 380 / color-palettes: L2 "Primary brand color" (lever name) its row is 19 tall, its line 17.5: …`
//     (196, every one at 380, none at 1280).
//   · a stray `h4.p3-rogue` added to Components' Density →
//     `TY2 A web light 1280 / components: every heading in the levers pane is one of the three levels or a table header —
//     not covered: h4.p3-rogue "Density sets" (a heading element) | … (drawn 14px / 700)` (16, with the space after Density).
//   · a row list's sub-heading drawn as an h5 → `… / color-fills: no heading skips a level after the one before it —
//     h3.p3-lsec-title "Foreground" h3 then h5.p3-rows-sub "Inverse" h5 | …` (8).
//
// HEADING PASS 2 (#2220: BG1 A #2181, HP5 #2218, TY1 A and HP2 #2190, TS1 A #2216, #2217 with HP6; approved 2026-10-06), the
// structure, held in the same loop: no section draws its own title twice; each promoted lever's ⓘ sits in its section's title
// row (space-050 after the title, centered on its line, by the ⓘ check) and opens the help it opened before (PROMOTED, typed
// from the source before the pass or read from the lever manifest); Background fills' subgroups read exactly Default and
// Inverse; Gradients' switch is at the far end of the title row, on the title's line, and every title row and lever head is
// as tall as its line (pass 1's skip for a switch is gone); Type has its two sections, each by its lever hook, and no levers
// section draws the old "Font families" title or description; and the family and italic rows put the token on the label's
// line, flush right, wide, and under it at 380, while every other token (HP6: the library's rows) stays under its label.
// After the loop, the TS1 A case: inside Type scale, the control, the pinned count, the clash group with Release, then the
// missing-styles group, at the emitted space-050 / space-100 / space-150.
// Mutations (heading pass 2), each after a `wip:` commit, on rebuilt bundles, each failing by name:
//   · the promoted lever's head left drawn → `BG1 A TY2 A web light 1280 / color-fills: section "Background fills" draws its own
//     title again — span.p3-lever-name` (56); · "Default background fills" back → `… Background fills' subgroups read exactly
//     ["Default","Inverse"] — read ["Default background fills","Inverse"]` (8); · the ⓘ left in the hidden head → `… section
//     "Background fills": its ⓘ sits beside the title, in its row — read {…"info":null…}` (120);
//   · Gradients' switch left in the hidden head → `HP5 … Gradients' switch sits at the far end of the section's title row … "sw":null`
//     (8); · the switch's overhang dropped → `… L1 "Gradients" (section title) its row is 36 tall, its line 20: …` (8);
//   · the families folded back into the library section → `TY1 A … "Typeface library" is its own section, holding
//     lever-typography-typeface-library and not lever-typography-families — read [both]` (64); · the old description put back
//     on the library → `HP2 … no levers section draws the old "Font families" title or its description …` (8);
//   · the pinned count back in the state line → `TS1 A web light 1280: inside Type scale, the control, then the pinned count, …
//     — read ["type-scale","type-scale-clash","type-scale-unresolved"]` (40); · the missing-styles group in the state line →
//     `… outside ["type-unresolved"] …` (32); · the count's pull-up dropped → `… the pinned count sits space-050 4 under the
//     control — read 8` (8); · the between-groups space dropped → `… each warning group sits space-150 12 … "clash":8 …` (8);
//   · the family rows without `onLine` → `#2217 … family row "Display family" / font.family.display: the token sits on the
//     label's line, flush right — same line false …` (28); · the narrow tier's grid dropped → `#2217 TY2 A web light 380 / type:
//     … the token sits under its label, at its left edge — under false, 148 from the label's left` (56); · the library rows
//     given `onLine` → `HP6 … face row "Inter" / font.typeface.inter: the token sits under its label … under false …` (12).
console.log(`\nThe heading rule (TY2 A, heading pass 1)\n${'='.repeat(78)}`);
/** The chrome tokens the rule names, each to its emitted path (a literal map, typed from `chrome/tokens.mjs`'s rows on
 *  2026-10-06; deliberately not imported, so the build's map and this oracle stay two derivations). */
const HEADING_TOKEN_PATHS = {
  'fs-12': 'core.font.size.12', 'fs-14': 'core.font.size.14', 'fs-16': 'core.font.size.16',
  'fw-default': 'core.font.weight-role.default', 'fw-emphasis': 'core.font.weight-role.emphasis', 'fw-strong': 'core.font.weight-role.strong',
  'lh-compact': 'core.font.line-height-role.compact', 'ls-snug': 'core.font.letter-spacing-role.snug',
  'space-050': 'space.050', 'space-100': 'space.100', 'space-150': 'space.150', 'space-300': 'space.300', 'hit-min': 'core.dimension.24',
  text: 'color.text.primary', 'text-2': 'color.text.secondary',
};
/** The rem the emission's dimensions are written in: the browser's default root size, which the chrome does not change. */
const ROOT_PX = 16;
const HT = (() => {
  const out = join(REPO, 'packages', 'engine', 'out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const dark = JSON.parse(readFileSync(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8'));
  const root = base.$extensions?.prism3?.root;
  const at = (tree, path) => path.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree);
  const walk = (mode, path, hops = 0) => {
    const o = mode === 'dark' ? at(dark, path) : undefined;
    const v = (o?.$value !== undefined ? o : at(base, path))?.$value;
    const m = typeof v === 'string' && /^\{([^}]+)\}$/.exec(v);
    return m && hops < 16 ? walk(mode, m[1], hops + 1) : v;
  };
  const num = (name) => {
    const v = walk('light', `${root}.${HEADING_TOKEN_PATHS[name]}`);
    if (typeof v === 'number') return v;
    const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(String(v ?? ''));
    if (!m) throw new Error(`TY2 A: ${name} (${HEADING_TOKEN_PATHS[name]}) resolves to ${JSON.stringify(v)} in the emission, not a number`);
    if (m[2] === 'em') return { em: Number(m[1]) };
    return Number(m[1]) * (m[2] === 'rem' ? ROOT_PX : 1);
  };
  const t = Object.fromEntries(Object.keys(HEADING_TOKEN_PATHS).filter((k) => !k.startsWith('text')).map((k) => [k, num(k)]));
  const ink = (name, mode) => { const v = walk(mode, `${root}.${HEADING_TOKEN_PATHS[name]}`); return typeof v === 'string' ? v.toLowerCase() : null; };
  return { ...t, ink: { text: { light: ink('text', 'light'), dark: ink('text', 'dark') }, 'text-2': { light: ink('text-2', 'light'), dark: ink('text-2', 'dark') } } };
})();
ok(HT['fs-14'] === 14 && HT['fs-16'] === 16 && HT['fw-strong'] === 600 && HT['fw-emphasis'] === 500 && HT['fw-default'] === 400
  && HT['lh-compact'] === 1.25 && HT['space-150'] === 12 && HT['hit-min'] >= 24 && Object.values(HT.ink).every((m) => /^#[0-9a-f]{6}$/.test(m.light ?? '') && /^#[0-9a-f]{6}$/.test(m.dark ?? '') && m.light !== m.dark),
  `TY2 A: the oracle resolved the rule's chrome tokens from the emission (${JSON.stringify(HT)})`);
/** Each level's type, as chrome tokens. */
const LEVEL_TYPE = {
  L1: { fs: 'fs-16', fw: 'fw-strong', ls: 'ls-snug' },
  L2: { fs: 'fs-14', fw: 'fw-strong' },
  L3: { fs: 'fs-14', fw: 'fw-emphasis', ink: 'text' },
  TH: { fs: 'fs-12', fw: 'fw-emphasis', ink: 'text-2' },
};
/** The headings each page must show, by level (the audit's list, prism3, every Show advanced open). Text is matched
 *  from its start, so a value carried in a label ("Angle · 135°") does not tie the list to one brand's value. */
const EXPECT_HEADINGS = {
  brand: {
    L1: ['Identity', 'Personality', 'Modes'],
    L2: ['Brand name', 'Token namespace', 'Personality words', 'Modes on', 'Custom modes'],
  },
  'color-palettes': {
    // #2175 (PN1 B) folded the Pinned neutral section and its Pin a neutral lever into Neutrals' source choice.
    L1: ['Primary', 'Brand colors', 'Neutrals', 'Status colors'],
    L2: ['Primary brand color', 'Additional brand colors', 'Neutral hue', 'Neutral chroma', 'Success color', 'Warning color', 'Danger color', 'Info color'],
  },
  'color-fills': {
    L1: ['Background fills', 'Scrim', 'Foreground', 'Foreground fills', 'Text color', 'Border', 'Icon', 'Fields', 'Gradients'],
    // Heading pass 2 (BG1 A, #2181; HP5, #2218): the Background fills and Gradients levers say their names once, in their
    // section titles, and Background fills' subgroups are "Default" and "Inverse".
    L2: ['Icon contrast floor', 'Default', 'Inverse', 'Inverse', 'Inverse', 'Inverse', 'Inverse', 'Inverse'],
    L3: ['Inverse fill palette', 'Kind', 'Angle', 'Interpolation', 'Stops', 'Kind', 'Shape', 'Center X %', 'Center Y %', 'Interpolation', 'Stops'],
  },
  'color-interactive': {
    L1: ['Interactive', 'Disabled', 'Links'],
    L2: ['Action palette', 'Outline hover', 'Strict interactive contrast', 'Interactive palettes', 'Full contrast', 'Reduced contrast floor', 'Link palette', 'Link states', 'Primary', 'Neutral', 'Destructive'],
    // Held decision 7, approved: a lever inside a group (Neutral emphasis, inside Neutral) reads as a field.
    L3: ['Neutral emphasis', 'Hover', 'Pressed', 'Visited'],
  },
  type: {
    // Heading pass 2 (TY1 A and HP2, #2190): the library and the family for each text type are two sections, each titled by
    // its lever's name; "Font families" is gone from the levers.
    L1: ['Typeface library', 'Font family for each text type', 'Scale', 'Scale limits', 'Weights and styles', 'Line height and letter spacing'],
    L2: ['Type scale', 'Individual sizes', 'Headings scale between mobile and desktop', 'Largest display size',
      'Smallest title size', 'Smallest caption size', 'Smallest type size', 'Weights', 'Weights each text type ships', 'Italic styles', 'Pin a font style', 'Line height',
      'Letter spacing', 'One step looser or tighter'],
    L3: ['Set every text type to', 'Min viewport, px', 'Max viewport, px'],
    TH: ['Family', 'Text type', 'Text type', 'Line height', 'Letter spacing', 'Desktop', 'Mobile'],
  },
  shape: {
    L1: ['Density', 'Radius', 'Base radius'],
    L2: ['Radius softness', 'Control shape'],
  },
  depth: {
    L1: ['Elevation', 'Motion'],
    L2: ['Shadow softness', 'Shadow tint', 'Motion tempo', 'Easing per motion role'],
    L3: ['Tint hue', 'Tint amount'],
  },
  layout: {
    L1: ['Breakpoints', 'Grid', 'Containers'],
    L2: ['Grid columns', 'Maximum width', 'Content container', 'sm', 'md', 'lg', 'xl', '2xl'],
  },
  components: {
    L1: ['Button', 'Component sets'],
    L2: ['Density', 'Button icons', 'Button label & icon', 'Button label weight', 'Button minimum width'],
  },
};
/** Each page's Show advanced disclosures, opened before the sweep so the advanced levers' headings are measured too. */
const HEADING_ADVANCED = {
  'color-palettes': ['[data-p3="palettes-advanced"]'], type: ['[data-p3="scale-advanced"]', '[data-p3="type-sections-advanced"]'],
  shape: ['[data-p3="shape-advanced"]'], depth: ['[data-p3="depth-tint-advanced"]'],
};
/** Literal floors, under the counts measured when this landed (per host and theme, all nine pages): headings found, the
 *  ⓘ buttons measured, the token labels (`.p3-fill-label`) typed, and the hint lines read in Light and High contrast light. */
const HEADING_FLOOR = {
  // Heading pass 2: Type's split adds an L1; the seven promoted lever names leave L2 (and four of them were legends).
  1280: { L1: 35, L2: 65, L3: 20, TH: 21, info: 54, tokenLabels: 288, hints: 16, swept: 77 },
  380: { L1: 35, L2: 65, L3: 20, TH: 21, info: 54, tokenLabels: 288, hints: 16, swept: 77 },
};
/** Elements a sweep may find with a heading's tag or a heading's weight or size that are not one of the levels, each with
 *  the reason it is not (a selector, then the reason; the reason is held to 20 characters or more). Empty when this landed:
 *  every heading element and every heading-styled text in the levers pane was one of the three levels or a table header. */
const HEADING_EXEMPT = [];
ok(HEADING_EXEMPT.every(([sel, why]) => typeof sel === 'string' && sel && typeof why === 'string' && why.trim().length >= 20),
  `TY2 A: every heading exemption names a selector and a reason of 20 characters or more (${JSON.stringify(HEADING_EXEMPT)})`);
/** HEADING PASS 2 (BG1 A #2181, HP5 #2218, TY1 A and HP2 #2190, approved 2026-10-06): the sections whose lever was named
 *  as the section, per page, each with the help text its ⓘ opened BEFORE the pass, typed here from the source of 2026-10-06
 *  (or the lever manifest's description, where the page drew the manifest's): the promoted ⓘ must open the same words. */
const PROMOTED = {
  'color-fills': {
    'Background fills': 'The page, its tiers and the inverse fill for the mode the preview shows.',
    Gradients: manifest.levers.find((l) => l.key === 'gradients')?.description,
  },
  type: {
    'Typeface library': 'The font families this brand can use. A family is in the library while a text type uses it, or once you add it.',
    'Font family for each text type': 'Each text type’s font.family token names one family from the library. Swapping the family keeps every reference to the token.',
  },
  shape: {
    Density: 'Sets every control height, and moves each component’s padding and gaps one step on the spacing scale.',
    'Base radius': 'The medium radius at standard softness, from 2 to 12px. Every other radius size is a multiple of it.',
  },
  layout: { Breakpoints: manifest.levers.find((l) => l.key === 'layout.breakpoints')?.description },
};
ok(Object.values(PROMOTED).every((p) => Object.values(p).every((t) => typeof t === 'string' && t.length > 20)), `BG1 A: every promoted lever's help text is typed or read from the manifest (${JSON.stringify(PROMOTED)})`);
/** BG1 A's subgroup labels, the owner's approved words, exactly (not by their start). */
const BG1_SUBS = ['Default', 'Inverse'];
/** TY1 A: each Type section and the lever hook it must hold (and the one it must not); HP2: the old title and description,
 *  which no levers section may draw. */
const TY1_SECTIONS = [
  ['Typeface library', 'lever-typography-typeface-library', 'lever-typography-families'],
  ['Font family for each text type', 'lever-typography-families', 'lever-typography-typeface-library'],
];
const HP2_GONE = ['Font families', 'The font families in the brand, and the family each text type uses.'];
/** #2217: the rows whose label is stacked over its control put the token on the label's line (family, italic); HP6: the
 *  library's rows (face) keep it under the name, since their right edge holds a status. Literal floors, on Type. */
const TOKEN_LINE = new Set(['family', 'italic']);
const TOKEN_FLOOR = { type: { family: 7, italic: 7, face: 3 } };
/** The space after a heading, read in the page: from the bottom of the heading's row content (its padding and border
 *  excluded) to the top of the outermost box that starts below it and follows it in document order. Each level's row,
 *  by class: an L2 lever name's is its head, a group title's is its head row, a breakpoint name's is its legend. */
const HEADING_PROBE = ({ strong, big, exempt }) => {
  const pane = document.querySelector('[data-p3="levers-pane"]');
  const vis = (n) => { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = n.getBoundingClientRect(); return r.width >= 1 && r.height >= 1 && !n.closest('[hidden]'); };
  const r2 = (x) => Math.round(x * 100) / 100;
  const own = (n) => [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
  const LEAF = new Set(['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'CANVAS', 'IMG', 'svg']);
  const leaves = [...pane.querySelectorAll('*')].filter(vis).filter((n) => own(n) || LEAF.has(n.tagName) || n.classList.contains('p3-fill-sw') || n.classList.contains('p3-gbar'));
  const box = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: r.top + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth), bottom: r.bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth) }; };
  const next = (row) => {
    const b = box(row).bottom;
    for (const n of leaves) {
      if (row.contains(n) || n.contains(row) || !(row.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const r = n.getBoundingClientRect();
      if (r.top < b - 1) continue;
      let top = r.top, el = n;
      for (let a = n.parentElement; a && a !== pane && !a.contains(row); a = a.parentElement) { const ar = a.getBoundingClientRect(); if (ar.top >= b - 1 && ar.height > 0) { top = Math.min(top, ar.top); el = a; } else break; }
      return { gap: r2(top - b), el, leaf: n };
    }
    return null;
  };
  const TABLE_HEADS = '.p3-facehead, .p3-tsizes-head, .p3-wmatrix-head, .p3-tnudge-head';
  const found = [];
  const classified = new Set();
  const add = (level, n, kind, row) => {
    classified.add(n); classified.add(row);
    const cs = getComputedStyle(n);
    const nx = next(row);
    const desc = nx?.leaf.closest('.p3-sub');
    const ownDesc = !!(desc && desc.parentElement?.matches('.p3-lever-ctl') && desc.parentElement.firstElementChild === desc && desc.closest('.p3-lever') === n.closest('.p3-lever'));
    const rb = box(row);
    found.push({ level, kind, text: n.textContent.replace(/\s+/g, ' ').trim(), fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight), lh: parseFloat(cs.lineHeight),
      ls: parseFloat(cs.letterSpacing) || 0, color: cs.color, h: r2(n.getBoundingClientRect().height), rowH: r2(rb.bottom - rb.top),
      after: nx ? nx.gap : null, toDesc: !!nx?.leaf.closest('.p3-lsec-desc'), ownDesc,
      sec: n.closest('.p3-lsec')?.querySelector('.p3-lsec-title')?.textContent.replace(/\s+/g, ' ').trim() ?? null });
  };
  for (const n of pane.querySelectorAll('.p3-lsec-title')) if (vis(n)) add('L1', n, 'section title', n.closest('.p3-lsec-titlerow') ?? n);
  for (const n of pane.querySelectorAll('.p3-lever-name')) if (vis(n)) add(n.closest('.p3-icol') ? 'L3' : 'L2', n, n.closest('.p3-icol') ? 'lever name in a group' : 'lever name', n.closest('.p3-lever-head'));
  for (const n of pane.querySelectorAll('.p3-rows-sub')) if (vis(n)) add('L2', n, 'rows sub-heading', n);
  for (const n of pane.querySelectorAll('.p3-icol-title')) if (vis(n)) add('L2', n, 'group title', n.closest('.p3-icol-head'));
  for (const n of pane.querySelectorAll('.p3-lgrid-name > b')) if (vis(n)) add('L2', n, 'breakpoint name', n.parentElement);
  for (const n of pane.querySelectorAll('.p3-field-label')) if (vis(n)) { const th = !!n.closest(TABLE_HEADS); add(th ? 'TH' : 'L3', n, th ? 'table header' : 'field label', n.closest('.p3-slider-head') ?? n); }
  const heads = [...pane.querySelectorAll('.p3-lsec-head')].filter(vis).map((hd) => { const nx = next(hd); return { title: hd.querySelector('.p3-lsec-title')?.textContent.trim(), after: nx ? nx.gap : null }; });
  const tokenLabels = [...pane.querySelectorAll('.p3-fill-label')].filter(vis).map((n) => { const cs = getComputedStyle(n); return { text: n.textContent.trim(), fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight), lh: parseFloat(cs.lineHeight) }; });
  const infos = [...pane.querySelectorAll('.p3-info')].filter(vis).map((b) => {
    const r = b.getBoundingClientRect();
    // A lever's ⓘ in its head, or a promoted lever's beside its section title (BG1 A, heading pass 2).
    const head = b.closest('.p3-lever-head, .p3-lsec-titlerow');
    const name = head?.querySelector('.p3-lever-name, .p3-lsec-title');
    const nr = name?.getBoundingClientRect();
    return { label: b.getAttribute('aria-label'), w: r2(r.width), h: r2(r.height), inHead: !!name,
      dx: nr ? r2(r.left - nr.right) : null, dy: nr ? r2((r.top + r.bottom) / 2 - (nr.top + nr.bottom) / 2) : null };
  });
  // THE SWEEP: every element that is a heading by its tag or role, and every text drawn at a heading's weight or size,
  // must be one of the levels above (or exempted, with its reason). Controls draw their own labels and are not headings.
  const isExempt = (n) => exempt.some((sel) => n.matches(sel));
  const label = (n) => `${n.tagName.toLowerCase()}${[...n.classList].map((c) => `.${c}`).join('')} "${n.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
  const headingEls = [...pane.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, [role="heading"]')].filter(vis);
  const unclassified = headingEls.filter((n) => !classified.has(n) && !isExempt(n)).map((n) => `${label(n)} (a heading element)`);
  const CONTROLS = 'button, select, option, input, textarea, [role="radio"], [role="tab"], [role="switch"], [role="option"], [data-content]';
  for (const n of pane.querySelectorAll('*')) {
    if (!vis(n) || !own(n) || n.closest(CONTROLS) || classified.has(n) || isExempt(n)) continue;
    const cs = getComputedStyle(n);
    if (Number(cs.fontWeight) >= strong || parseFloat(cs.fontSize) >= big) unclassified.push(`${label(n)} (drawn ${cs.fontSize} / ${cs.fontWeight})`);
  }
  // The outline the tags draw: no heading skips a level after the one before it (h3 then h5 fails).
  const ranked = headingEls.map((n) => [n, /^H([1-6])$/.exec(n.tagName)?.[1] ?? (n.getAttribute('role') === 'heading' ? n.getAttribute('aria-level') : null)]).filter(([, l]) => l).map(([n, l]) => [n, Number(l)]);
  const skips = [];
  for (let i = 1; i < ranked.length; i++) if (ranked[i][1] > ranked[i - 1][1] + 1) skips.push(`${label(ranked[i - 1][0])} h${ranked[i - 1][1]} then ${label(ranked[i][0])} h${ranked[i][1]}`);
  // HEADING PASS 2. Each section, its title, the headings drawn inside it, and its title row (BG1 A, HP5); the subgroup
  // labels; and every token name's place against its label (#2217, HP6).
  const norm = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
  const sections = [...pane.querySelectorAll('.p3-lsec')].filter(vis).map((sec) => {
    const title = sec.querySelector(':scope > .p3-lsec-head .p3-lsec-title');
    const titleText = norm(title?.textContent);
    const inner = [...sec.querySelectorAll('.p3-lever-name, .p3-rows-sub, .p3-icol-title, .p3-field-label, .p3-lgrid-name > b, .p3-lsec-title')].filter((n) => n !== title && vis(n));
    const row = title?.closest('.p3-lsec-titlerow');
    const rr = row?.getBoundingClientRect(), tr = title?.getBoundingClientRect();
    const sw = row?.querySelector('[role="switch"]');
    const swr = sw?.getBoundingClientRect();
    const info = row?.querySelector(':scope > .p3-info');
    return {
      title: titleText, hooks: [...sec.querySelectorAll('.p3-lever')].map((n) => n.getAttribute('data-p3')),
      descs: [...sec.querySelectorAll(':scope > .p3-lsec-head > .p3-lsec-desc')].map((n) => norm(n.textContent)),
      repeats: inner.filter((n) => norm(n.textContent).toLowerCase() === titleText.toLowerCase()).map((n) => `${n.tagName.toLowerCase()}.${[...n.classList].join('.')}`),
      subs: [...sec.querySelectorAll('.p3-rows-sub')].filter(vis).map((n) => norm(n.textContent)),
      row: row ? { h: r2(rr.height), titleH: r2(tr.height), info: info ? { label: info.getAttribute('aria-label'), controls: info.getAttribute('aria-controls') } : null,
        sw: sw ? { name: sw.getAttribute('aria-label'), endGap: r2(rr.right - swr.right), dy: r2((swr.top + swr.bottom) / 2 - (tr.top + tr.bottom) / 2), inRow: row.contains(sw) } : null } : null,
    };
  });
  const tokenLines = [...pane.querySelectorAll('.p3-fill-name')].filter(vis).map((nm) => {
    const lab = nm.querySelector('.p3-fill-label'), tok = nm.querySelector('.p3-fill-tok');
    if (!lab || !tok || !vis(tok)) return null;
    const lr = lab.getBoundingClientRect(), kr = tok.getBoundingClientRect(), nr = nm.getBoundingClientRect();
    const where = nm.closest('[data-p3="family-row"]') ? 'family' : nm.closest('[data-p3="italic-row"]') ? 'italic' : nm.closest('[data-p3="face-row"]') ? 'face' : 'other';
    return { where, label: norm(lab.textContent), token: norm(tok.textContent), labelFirst: !!(lab.compareDocumentPosition(tok) & Node.DOCUMENT_POSITION_FOLLOWING),
      sameLine: kr.top < lr.bottom - 1 && kr.bottom > lr.top + 1, under: kr.top >= lr.bottom - 0.5, flushRight: r2(nr.right - kr.right), leftAligned: r2(kr.left - lr.left) };
  }).filter(Boolean);
  return { found, heads, tokenLabels, infos, swept: headingEls.length, unclassified, skips, sections, tokenLines };
};
/** The hint lines (`.p3-state-hint`) and every drawn ⓘ glyph outside a button, in the levers pane. The ⓘ glyph is known by
 *  its drawing, typed here: a ring of radius 6.2 and a dot of radius 0.9 (`glyph('info')`). */
const HINT_PROBE = () => {
  const pane = document.querySelector('[data-p3="levers-pane"]');
  const vis = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden' && !n.closest('[hidden]');
  const hints = [...pane.querySelectorAll('.p3-state-hint')].filter(vis).map((n) => ({ hook: n.getAttribute('data-p3'), text: n.textContent.trim().slice(0, 60), glyphs: n.querySelectorAll('svg').length }));
  const stray = [...pane.querySelectorAll('svg')].filter(vis).filter((s) => s.querySelector('circle[r="6.2"]') && s.querySelector('circle[r="0.9"]') && !s.closest('button'))
    .map((s) => `${s.parentElement?.getAttribute('data-p3') ?? s.parentElement?.className}: "${(s.parentElement?.textContent ?? '').trim().slice(0, 50)}"`);
  return { hints, stray };
};
const near = (a, b, tol = 0.5) => typeof a === 'number' && Math.abs(a - b) <= tol;
const headingCounts = {};
/** At the narrow tier the levers and the preview are one pane each, behind the pane toggle. */
const showLevers = async (page, w) => { if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-settings"]')); };
for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 420 }]) for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const where = `TY2 A ${host} ${theme} ${w}`;
    const { ctx, page, errors } = await open({ host, theme, w, h });
    const tally = { L1: 0, L2: 0, L3: 0, TH: 0, info: 0, tokenLabels: 0, hints: 0, swept: 0 };
    try {
      if (w <= 560) await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.w === 'narrow');
      for (const place of NEW_PAGES) {
        await goPlace(page, place);
        await showLevers(page, w);
        for (const sel of HEADING_ADVANCED[place] ?? []) {
          await hooks.need(page, sel);
          if ((await page.locator(sel).getAttribute('aria-expanded')) === 'false') await hooks.click(page.locator(sel));
        }
        await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(HEADING_PROBE, { strong: HT['fw-strong'], big: HT['fs-16'], exempt: HEADING_EXEMPT.map(([sel]) => sel) });
        const at = `${where} / ${place}`;
        tally.swept += m.swept;
        ok(m.unclassified.length === 0, `${at}: every heading in the levers pane is one of the three levels or a table header — not covered: ${m.unclassified.join(' | ')}`);
        ok(m.skips.length === 0, `${at}: no heading skips a level after the one before it — ${m.skips.join(' | ')}`);
        // Every heading the audit lists, at its level.
        for (const [level, want] of Object.entries(EXPECT_HEADINGS[place])) {
          const pool = m.found.filter((f) => f.level === level).map((f) => f.text);
          const missing = [];
          for (const w of want) { const i = pool.findIndex((t) => t.startsWith(w)); if (i < 0) missing.push(w); else pool.splice(i, 1); }
          ok(missing.length === 0, `${at}: every ${level} heading the audit lists is found at ${level} — missing ${JSON.stringify(missing)} (found ${JSON.stringify(m.found.filter((f) => f.level === level).map((f) => f.text))})`);
        }
        headingCounts[place] ??= {};
        for (const f of m.found) {
          tally[f.level]++;
          headingCounts[place][f.level] = (headingCounts[place][f.level] ?? 0) + (host === 'web' && theme === 'light' && w === 1280 ? 1 : 0);
          const ty = LEVEL_TYPE[f.level];
          const name = `${f.level} "${f.text.slice(0, 40)}" (${f.kind})`;
          const miss = [];
          if (f.fs !== HT[ty.fs]) miss.push(`fs ${f.fs}, want ${ty.fs} ${HT[ty.fs]}`);
          if (f.fw !== HT[ty.fw]) miss.push(`fw ${f.fw}, want ${ty.fw} ${HT[ty.fw]}`);
          if (f.level !== 'TH' && !near(f.lh, HT[ty.fs] * HT['lh-compact'], 0.05)) miss.push(`line height ${f.lh}, want lh-compact ${HT[ty.fs] * HT['lh-compact']}`);
          if (ty.ls && !near(f.ls, HT[ty.fs] * HT['ls-snug'].em, 0.05)) miss.push(`letter spacing ${f.ls}, want ls-snug ${HT[ty.fs] * HT['ls-snug'].em}`);
          if (ty.ink && f.color !== startRgb(HT.ink[ty.ink][theme])) miss.push(`ink ${f.color}, want ${HEADING_TOKEN_PATHS[ty.ink]} ${HT.ink[ty.ink][theme]}`);
          // The space after it.
          if (f.level === 'L1') {
            const want = f.toDesc ? 'space-050' : 'space-300';
            if (!near(f.after, HT[want])) miss.push(`space after ${f.after}, want ${want} ${HT[want]}`);
            // BG1 A, HP5: a title row (the title, its ⓘ, a switch at its end) is as tall as the title: they overhang it.
            if (!near(f.rowH, f.h)) miss.push(`its row is ${f.rowH} tall, its line ${f.h}: something in the title's row sets its height`);
          } else if (f.level === 'L2') {
            const want = f.ownDesc ? 'space-050' : 'space-150';
            if (!near(f.after, HT[want])) miss.push(`space after ${f.after}, want ${want} ${HT[want]}${f.ownDesc ? ' (its own description)' : ''}`);
            // The row is as tall as its line: the ⓘ overhangs it. (HP5, #2218, took Gradients' switch out of its lever head,
            // so no lever head is skipped any more.)
            if (f.kind === 'lever name' && !near(f.rowH, f.h)) miss.push(`its row is ${f.rowH} tall, its line ${f.h}: something in the row sets its height`);
          } else if (f.level === 'L3' && (f.kind === 'field label' || f.kind === 'lever name in a group')) {
            if (!near(f.after, HT['space-050'])) miss.push(`space after ${f.after}, want space-050 ${HT['space-050']}`);
          }
          ok(miss.length === 0, `${at}: ${name} ${miss.join('; ')}`);
        }
        for (const hd of m.heads) {
          ok(near(hd.after, HT['space-300']), `${at}: section "${hd.title}": its content starts ${hd.after} after its head, want space-300 ${HT['space-300']}`);
        }
        // ── heading pass 2 ──
        // BG1 A: no section draws its own title twice.
        for (const sec of m.sections) ok(sec.repeats.length === 0, `BG1 A ${at}: section "${sec.title}" draws its own title again — ${sec.repeats.join(', ')}`);
        // BG1 A: each promoted lever's ⓘ sits in its section's title row, named for the section (its place on the line is the ⓘ check below).
        for (const title of Object.keys(PROMOTED[place] ?? {})) {
          const sec = m.sections.find((x) => x.title === title);
          ok(sec?.row?.info?.label === `About ${title}`, `BG1 A ${at}: section "${title}": its ⓘ sits beside the title, in its row — read ${JSON.stringify(sec?.row ?? null)}`);
        }
        // BG1 A: Background fills' subgroups read exactly "Default" and "Inverse".
        if (place === 'color-fills') {
          const bg = m.sections.find((x) => x.title === 'Background fills');
          ok(JSON.stringify(bg?.subs) === JSON.stringify(BG1_SUBS), `BG1 A ${at}: Background fills' subgroups read exactly ${JSON.stringify(BG1_SUBS)} — read ${JSON.stringify(bg?.subs)}`);
          // HP5: Gradients' On switch is in the section's title row, at its far end, centered on the title's line.
          const gr = m.sections.find((x) => x.title === 'Gradients');
          const sw = gr?.row?.sw;
          ok(!!sw && sw.inRow && sw.name === 'Gradients' && near(sw.endGap, 0) && near(sw.dy, 0),
            `HP5 ${at}: Gradients' switch sits at the far end of the section's title row, on the title's line — read ${JSON.stringify(gr?.row ?? null)}`);
        }
        if (place === 'type') {
          // TY1 A: the library and the family for each text type are two sections, each holding its own lever.
          for (const [title, has, not] of TY1_SECTIONS) {
            const sec = m.sections.find((x) => x.title === title);
            ok(!!sec && sec.hooks.includes(has) && !sec.hooks.includes(not), `TY1 A ${at}: "${title}" is its own section, holding ${has} and not ${not} — read ${sec ? JSON.stringify(sec.hooks.filter((x) => x.startsWith('lever-'))) : 'no such section'}`);
          }
          // HP2: the old "Font families" title and its description are gone from the levers.
          const old = m.sections.filter((x) => x.title === HP2_GONE[0] || x.descs.includes(HP2_GONE[1]));
          ok(old.length === 0, `HP2 ${at}: no levers section draws the old "${HP2_GONE[0]}" title or its description — read ${JSON.stringify(old.map((x) => [x.title, x.descs]))}`);
        }
        // #2217: a stacked label's token on its line, flush right, wide; under it at the narrow tier. HP6: the library's
        // rows keep the token under the name. Every other token sits under its label, as before. Label first in the DOM.
        const tl = (k) => m.tokenLines.filter((t) => t.where === k);
        for (const [k, floor] of Object.entries(TOKEN_FLOOR[place] ?? {})) ok(tl(k).length >= floor, `#2217 ${at}: ${tl(k).length} ${k} rows with a token name (floor ${floor})`);
        for (const t of m.tokenLines) {
          const stackedRow = TOKEN_LINE.has(t.where);
          const name = `${t.where} row "${t.label}" / ${t.token}`;
          ok(t.labelFirst, `#2217 ${at}: ${name}: the label comes before its token in the DOM`);
          if (stackedRow && w > 560) ok(t.sameLine && near(t.flushRight, 0), `#2217 ${at}: ${name}: the token sits on the label's line, flush right — same line ${t.sameLine}, ${t.flushRight} from the right edge`);
          else ok(t.under && near(t.leftAligned, 0), `${stackedRow ? '#2217' : t.where === 'face' ? 'HP6' : '#2217'} ${at}: ${name}: the token sits under its label, at its left edge — under ${t.under}, ${t.leftAligned} from the label's left`);
        }
        // L3 token labels: the level's type (their token line sits under them, space-025, as before).
        for (const t of m.tokenLabels) {
          tally.tokenLabels++;
          ok(t.fs === HT['fs-14'] && t.fw === HT['fw-emphasis'] && near(t.lh, HT['fs-14'] * HT['lh-compact'], 0.05),
            `${at}: L3 token label "${t.text}" is fs-14 / fw-emphasis / lh-compact — ${t.fs} / ${t.fw} / ${t.lh}`);
        }
        // The ⓘ buttons: the hit-min target kept; in a lever's head, space-050 after the name and centered on its line.
        for (const i of m.infos) {
          tally.info++;
          const miss = [];
          if (!(i.w >= HT['hit-min'] && i.h >= HT['hit-min'])) miss.push(`target ${i.w} × ${i.h}, want hit-min ${HT['hit-min']} or more`);
          if (i.inHead && !near(i.dx, HT['space-050'])) miss.push(`${i.dx} after the heading text, want space-050 ${HT['space-050']}`);
          if (i.inHead && !near(i.dy, 0)) miss.push(`${i.dy} off the line's center`);
          ok(miss.length === 0, `${at}: ⓘ "${i.label}" ${miss.join('; ')}`);
        }
        // BG1 A: each promoted ⓘ opens the help text it opened before the pass, under its section's head.
        for (const [title, want] of Object.entries(PROMOTED[place] ?? {})) {
          const btn = page.locator(`[data-p3="levers-pane"] .p3-lsec-titlerow > .p3-info[aria-label="About ${title}"]`);
          if ((await btn.count()) !== 1) { ok(false, `BG1 A ${at}: section "${title}" has one ⓘ in its title row — found ${await btn.count()}`); continue; }
          await hooks.click(btn);
          const tip = await page.evaluate((t) => {
            const b = [...document.querySelectorAll('[data-p3="levers-pane"] .p3-lsec-titlerow > .p3-info')].find((x) => x.getAttribute('aria-label') === `About ${t}`);
            const tp = b && document.getElementById(b.getAttribute('aria-controls'));
            return { open: b?.getAttribute('aria-expanded'), shown: !!tp && !tp.hidden && tp.getClientRects().length > 0, text: tp?.textContent.trim() ?? null,
              inHead: !!tp && tp.parentElement === b.closest('.p3-lsec-head'), below: !!tp && tp.getBoundingClientRect().top >= b.closest('.p3-lsec-titlerow').getBoundingClientRect().bottom };
          }, title);
          ok(tip.open === 'true' && tip.shown && tip.text === want && tip.inHead && tip.below,
            `BG1 A ${at}: section "${title}": its ⓘ opens the help it opened before, under the section's head — read ${JSON.stringify(tip)}, want ${JSON.stringify(want)}`);
          await hooks.click(btn);
        }
        // HP3: no hint line draws a glyph, and no ⓘ glyph is drawn outside a button. Read in Light and again in High
        // contrast light, where the derived-mode line shows on most pages.
        for (const mode of ['light', 'hc-light']) {
          if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
          await showMode(page, mode);
          await showLevers(page, w);
          const hp = await page.evaluate(HINT_PROBE);
          tally.hints += hp.hints.length;
          for (const hl of hp.hints) ok(hl.glyphs === 0, `HP3 ${at} (${mode}): hint line ${hl.hook ?? '(no hook)'} draws a glyph — "${hl.text}"`);
          ok(hp.stray.length === 0, `HP3 ${at} (${mode}): a non-button ⓘ glyph is drawn — ${hp.stray.join(' | ')}`);
        }
        if (w <= 560) await hooks.click(page.locator('[data-p3="pane-toggle-preview"]'));
        await showMode(page, 'light');
        await showLevers(page, w);   // the narrow tab select is drawn only over the levers
      }
      console.log(`  ${where}: ${JSON.stringify(tally)}`);
      for (const [k, floor] of Object.entries(HEADING_FLOOR[w])) {
        ok(tally[k] >= floor, `${where}: the sweep measured ${tally[k]} ${k === 'info' ? 'ⓘ buttons' : k === 'hints' ? 'hint lines' : k === 'tokenLabels' ? 'token labels' : k === 'swept' ? 'heading elements' : `${k} headings`} across the nine pages (floor ${floor})`);
      }
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
    } finally { await ctx.close(); }
  }
}
console.log(`  headings per page (web light): ${Object.entries(headingCounts).map(([p, c]) => `${p} ${Object.entries(c).map(([l, n]) => `${l} ${n}`).join(' ')}`).join(' · ')}`);

// TS1 A (#2216, heading pass 2): inside the Type scale lever, top to bottom: the segmented control; the pinned count, a plain
// line space-050 under it; the clash warning grouped with Release pinned sizes; then the missing-styles warning in a group of
// its own, inside the lever (it was a sibling after it). space-100 inside a group, space-150 between groups. The state that
// shows all three is the prism3 example with title xs set to 18px (a real pinned-size clash: at the compact scale title sm
// resolves to 18px too, which the engine refuses) and strong declined in display and title (so the preview's
// display.lg.strong, title.lg.strong and title.md.strong are not made). THE ORACLE is the DOM's order and its measured gaps
// against the emitted space tokens.
const TS1_STATE = { typography: { sizes: { title: { xs: 18 } }, weights: { display: ['emphasis'], title: ['emphasis'] } } };
const TS1_ORDER = ['type-scale', 'type-sizes-count', 'type-scale-clash', 'type-scale-unresolved'];
const ts1Input = (() => {
  const doc = JSON.parse(JSON.stringify(BOOT_INPUT));
  const deep = (a, b) => { for (const [k, v] of Object.entries(b)) { if (v && typeof v === 'object' && !Array.isArray(v)) { a[k] ??= {}; deep(a[k], v); } else a[k] = v; } };
  deep(doc, TS1_STATE);
  return doc;
})();
const TS1_PROBE = () => {
  const vis = (n) => n.getClientRects().length > 0 && !n.closest('[hidden]');
  const lv = document.querySelector('[data-p3="levers-pane"] [data-p3="lever-typography-type-scale"]');
  const ctl = lv?.querySelector(':scope > .p3-lever-ctl');
  const kids = ctl ? [...ctl.children].filter(vis) : [];
  const hk = (n) => n?.getAttribute('data-p3') ?? null;
  const r = (n) => n?.getBoundingClientRect();
  const gap = (a, b) => (a && b ? Math.round((r(b).top - r(a).bottom) * 100) / 100 : null);
  const by = (k) => kids.find((n) => hk(n) === k);
  const clash = by('type-scale-clash'), un = by('type-scale-unresolved');
  const kidsOf = (g) => (g ? [...g.children].filter(vis).map((n) => hk(n) ?? (n.matches('.p3-state-warn') ? 'warning' : n.className)) : null);
  return {
    order: kids.map(hk), clash: kidsOf(clash), unresolved: kidsOf(un),
    countGlyphs: by('type-sizes-count')?.querySelectorAll('svg').length ?? null,
    outside: [...document.querySelectorAll('[data-p3="levers-pane"] [data-p3="type-unresolved"], [data-p3="levers-pane"] [data-p3="type-sizes-count"]')].filter((n) => !ctl?.contains(n)).map(hk),
    stateEmpty: !(lv?.querySelector(':scope > .p3-lever-state')?.textContent.trim()),
    gaps: { count: gap(by('type-scale'), by('type-sizes-count')), clash: gap(by('type-sizes-count'), clash), inClash: gap(clash?.firstElementChild, clash?.lastElementChild), unresolved: gap(clash, un) },
  };
};
for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 420 }]) for (const host of ['web', 'figma']) for (const theme of ['light', 'dark']) {
  const where = `TS1 A ${host} ${theme} ${w}`;
  const { ctx, page, errors } = await open({ host, theme, w, h });
  try {
    if (host === 'web') {
      await page.evaluate((s) => localStorage.setItem('prism3:brandInput', s), JSON.stringify({ v: 2, input: ts1Input }));
      await page.reload({ waitUntil: 'networkidle' });
    } else await postMsg(page, { type: 'restore-input', input: ts1Input });
    await hooks.need(page, '[data-p3="frame"]');
    if (w <= 560) await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.w === 'narrow');
    await goPlace(page, 'type');
    await showLevers(page, w);
    await hooks.need(page, '[data-p3="type-scale-unresolved"]');
    await page.evaluate(() => document.fonts.ready);
    const t = await page.evaluate(TS1_PROBE);
    ok(JSON.stringify(t.order) === JSON.stringify(TS1_ORDER), `${where}: inside Type scale, the control, then the pinned count, then the clash group, then the missing-styles group — read ${JSON.stringify(t.order)}`);
    ok(t.outside.length === 0 && t.stateEmpty, `${where}: the pinned count and the missing-styles warning are inside the Type scale control column, nothing after it — outside ${JSON.stringify(t.outside)}, state line empty ${t.stateEmpty}`);
    ok(JSON.stringify(t.clash) === JSON.stringify(['warning', 'type-scale-release']), `${where}: the clash warning's group holds it and its own action, Release pinned sizes — read ${JSON.stringify(t.clash)}`);
    ok(JSON.stringify(t.unresolved) === JSON.stringify(['type-unresolved']), `${where}: the missing-styles warning is a group of its own — read ${JSON.stringify(t.unresolved)}`);
    ok(t.countGlyphs === 0, `${where}: the pinned count is a plain line, no glyph — read ${t.countGlyphs}`);
    ok(near(t.gaps.count, HT['space-050']), `${where}: the pinned count sits space-050 ${HT['space-050']} under the control — read ${t.gaps.count}`);
    ok(near(t.gaps.inClash, HT['space-100']), `${where}: inside the clash group, Release pinned sizes sits space-100 ${HT['space-100']} under its warning — read ${t.gaps.inClash}`);
    ok(near(t.gaps.clash, HT['space-150']) && near(t.gaps.unresolved, HT['space-150']), `${where}: each warning group sits space-150 ${HT['space-150']} after the line or group before it — read ${JSON.stringify(t.gaps)}`);
    ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

// =============================================================================================
// 31. #2213 (owner decisions N1 A and AS1 A, 2026-10-06): the agent link's status in the Activity drawer. The closed
//     row's short status at its far right, beside the caret; the full status line as the open drawer's first line; and
//     every text run in the row on one baseline. Plugin, light and dark, 1280 and 380; the web's row for the baseline.
// =============================================================================================
console.log(`\nThe agent link's status in the Activity drawer (#2213)\n${'='.repeat(78)}`);
/** THE FULL LINE, from the plugin's own formatter, bundled for Node from its source and called here with each state
 *  below. Never read off the page. The SHORT STATUS is not bundled: its words are the owner's (AS1 A), typed below. */
const LINK_TEXT = await (async () => {
  const esbuild = await import('esbuild');
  const out = await esbuild.build({ entryPoints: [join(REPO, 'apps/plugin/src/agent-link-ui.ts')], bundle: true, platform: 'node', format: 'esm', write: false });
  return (await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`)).agentLinkStatusText;
})();
/** Published states, as the main thread posts them (`AgentLinkState`, `apps/plugin/src/agent-protocol.ts`). Literals. */
const LINK_STATES = {
  off: { ...AGENT_ON, on: false, since: null, transports: { mailbox: false, bridge: false } },
  listening: { ...AGENT_ON, lastCommand: { id: 'c1', cmd: 'status', ok: true, finishedAt: '2026-10-06T16:35:12.000Z', headline: '✓ done' } },
  notListening: { ...AGENT_ON, transports: { mailbox: false, bridge: false } },
  error: { ...AGENT_ON, inboxError: 'the inbox is not a JSON array' },
  offStale: { ...AGENT_ON, on: false, since: null, transports: { mailbox: false, bridge: false }, inboxError: 'the inbox is not a JSON array' },
};
/** What each state must draw, typed from the owner's AS1 A: the closed row's short status and its ink (the chrome
 *  tokens' roles, resolved below from the committed emission, never the stylesheet), or none; and whether the open
 *  drawer's first line shows the full line (while the link is on, or while it holds an inbox error). Literals. */
const LINK_WANT = {
  off: { short: null, full: false },
  listening: { short: 'Agent listening', ink: 'color.text.secondary', full: true },
  notListening: { short: 'Agent not listening', ink: 'color.text.danger', full: true },
  error: { short: 'Agent error', ink: 'color.text.danger', full: true },
  offStale: { short: null, full: true },
};
/** The emission's hex for a chrome role in a chrome theme: the base tree, the dark overlay over it in dark, aliases
 *  followed here (the same walk as `FOCUS_HEX`, written again so neither leans on the other or on `tokens.mjs`). */
const LINK_INK = (() => {
  const out = join(REPO, 'packages', 'engine', 'out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const dark = JSON.parse(readFileSync(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8'));
  const at = (tree, path) => path.split('.').reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree);
  const leaf = (mode, path) => { const o = mode === 'dark' ? at(dark, path) : undefined; return o?.$value !== undefined ? o : at(base, path); };
  const walk = (mode, path, hops = 0) => {
    const v = leaf(mode, path)?.$value;
    const m = typeof v === 'string' && /^\{([^}]+)\}$/.exec(v);
    if (m && hops < 16) return walk(mode, m[1], hops + 1);
    return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
  };
  const r = {};
  for (const mode of ['light', 'dark']) for (const role of ['color.text.secondary', 'color.text.danger']) r[`${mode} ${role}`] = walk(mode, `pds3.${role}`);
  return r;
})();
ok(Object.values(LINK_INK).every((x) => /^#[0-9a-f]{6}$/.test(x ?? '')) && LINK_INK['light color.text.danger'] !== LINK_INK['light color.text.secondary'] && LINK_INK['dark color.text.danger'] !== LINK_INK['dark color.text.secondary'],
  `#2213: the oracle resolved the quiet and the error ink, distinct, in light and dark from the emission (${JSON.stringify(LINK_INK)})`);
ok(typeof LINK_TEXT === 'function' && /^Listening/.test(LINK_TEXT(LINK_STATES.listening)) && LINK_TEXT(LINK_STATES.error).includes('⚠'),
  `#2213: the formatter, called here, words each state (${typeof LINK_TEXT === 'function' ? Object.keys(LINK_STATES).map((k) => `${k}: "${LINK_TEXT(LINK_STATES[k])}"`).join('; ') : 'not loaded'})`);
/** The gap from the short status's right edge to the caret: the row's own gap, at most. Literal. */
const LINK_CARET_GAP_MAX = 12;
/** Every text run in the bar row sits on one baseline, within this. Literal (the owner's review). */
const BASELINE_TOL = 0.5;
/** The boot read-back the plugin posts, so the drawer's bar row is drawn with a summary (the owner's screenshot:
 *  "● Read-back · Clean"). Shape from `apps/plugin/src/messages.ts`. */
const LINK_SEED = { type: 'seed-info', ok: true, present: true, summary: 'Contract holds: 412 variables checked.', failed: 0 };

/** The bar row, as drawn: the short status (or none), the summary, the time, the caret, the status's ink on its ground,
 *  and the baseline of every text run (a zero-size inline-block probe set after each text node, read, and removed:
 *  its bottom edge is the baseline of the line it sits on). Text inside the screen-reader-only spans is not drawn. */
const LINK_PROBE = () => {
  const row = document.querySelector('[data-p3="activity-toggle"]');
  const ln = row?.querySelector('[data-p3="activity-agent-link"]') ?? null;
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s ?? ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, g) => ({ r: f.r * f.a + g.r * (1 - f.a), g: f.g * f.a + g.g * (1 - f.a), b: f.b * f.a + g.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  const ground = (el) => { const stack = []; for (let x = el; x && x.nodeType === 1; x = x.parentElement) stack.push(parse(getComputedStyle(x).backgroundColor)); let g = { r: 255, g: 255, b: 255, a: 1 }; for (const c of stack.reverse()) if (c && c.a > 0) g = over(c, g); return g; };
  const icos = row ? [...row.children].filter((n) => n.tagName.toLowerCase() === 'svg') : [];
  const caret = icos[icos.length - 1] ?? null;
  const sum = row?.querySelector('.p3-drawer-last') ?? null;
  const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let x = n; x && x.nodeType === 1; x = x.parentElement) if (getComputedStyle(x).display === 'none') return false; return true; };
  const ownText = (n) => [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('');
  // The baselines.
  const runs = [];
  if (row) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if (t.textContent.trim() && !t.parentElement.closest('.p3-sr')) nodes.push(t);
    for (const t of nodes) {
      const pr = document.createElement('span');
      pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      t.after(pr);
      runs.push({ text: t.textContent.trim().slice(0, 24), y: Math.round(pr.getBoundingClientRect().bottom * 100) / 100 });
      pr.remove();
    }
  }
  let ink = null;
  if (ln) {
    const cs = getComputedStyle(ln);
    const g = ground(ln);
    const c = over(parse(cs.color), g);
    const x = lum(c), y = lum(g);
    ink = { hex: hex(c), ground: hex(g), ratio: Math.floor(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100,
      lineH: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6 };
  }
  return {
    rowShown: vis(row), row: box(row), sum: box(sum), sumText: sum?.textContent ?? null,
    sumWhole: !!sum && (() => { const rg = document.createRange(); rg.selectNodeContents(sum); return rg.getBoundingClientRect().width <= sum.getBoundingClientRect().width + 0.01; })(),
    when: box(row?.querySelector('.p3-op-when')), caret: box(caret), line: box(ln), lineShown: vis(ln),
    text: ln ? ownText(ln) : null, title: ln?.getAttribute('title') ?? null, cut: !!ln && ln.scrollWidth > ln.clientWidth + 1,
    lastBeforeCaret: !!ln && !ln.nextElementSibling && ln.parentElement?.nextElementSibling === caret, rects: ln ? ln.getClientRects().length : 0, ink, runs,
  };
};
/** The open drawer's body: its agent line (or none), whether it is the body's first drawn line above the run rows (the
 *  sheet's Close control aside), and its ink on its ground. */
const DETAIL_PROBE = () => {
  const body = document.querySelector('[data-p3="activity-body"]');
  const d = body?.querySelector('[data-p3="activity-agent-detail"]') ?? null;
  const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let x = n; x && x.nodeType === 1; x = x.parentElement) if (getComputedStyle(x).display === 'none') return false; return true; };
  const drawn = body ? [...body.children].filter((n) => vis(n) && n.getAttribute('data-p3') !== 'activity-close') : [];
  const rows = body?.querySelector('.p3-ops');
  const firstOp = rows?.querySelector('[data-p3="activity-op"]');
  return { bodyShown: vis(body), shown: vis(d), text: vis(d) ? d.textContent : null, first: drawn[0] === d,
    above: !!d && !!firstOp && d.getBoundingClientRect().bottom <= firstOp.getBoundingClientRect().top + 0.5, ops: rows?.children.length ?? 0 };
};
/** The short status's and the row's names as the browser computes them (CDP `Accessibility.getPartialAXTree`), never
 *  the DOM: the tree's entry for each text node inside the status, and the row's computed name. */
const linkAx = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    await cdp.send('Accessibility.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const q = async (sel) => (await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })).nodeId;
    const rowId = await q('[data-p3="activity-toggle"]');
    const lnId = await q('[data-p3="activity-agent-link"]');
    const rowAx = rowId ? (await cdp.send('Accessibility.getPartialAXTree', { nodeId: rowId, fetchRelatives: false })).nodes[0] : null;
    let line = null;
    if (lnId) {
      const { node } = await cdp.send('DOM.describeNode', { nodeId: lnId, depth: -1 });
      const textNodes = [];
      const visit = (n) => { if (n.nodeType === 3) textNodes.push(n); for (const c of n.children ?? []) visit(c); };
      visit(node);
      const texts = [];
      for (const t of textNodes) {
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: t.backendNodeId, fetchRelatives: false });
        if (!nodes[0]?.ignored) texts.push(nodes[0]?.name?.value ?? '');
      }
      line = texts.join(' ');
    }
    return { row: rowAx?.name?.value ?? null, line };
  } finally { await cdp.detach(); }
};
const baselineMiss = (runs) => { const ys = runs.map((r) => r.y); return ys.length ? Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100 : null; };

for (const theme of ['light', 'dark']) {
  for (const { w, h } of WIDTHS.filter((x) => x.w === 1280 || x.w === 380)) {
    const where = `#2213 figma ${theme} ${w}`;
    const { ctx, page, errors } = await open({ host: 'figma', theme, w, h });
    const shoot = (name, sel) => (SHOTS ? page.locator(sel).screenshot({ path: join(SHOTS, `v2-2213-plugin-${theme}-${w}-${name}.png`) }).catch(() => {}) : null);
    try {
      await postMsg(page, LINK_SEED);
      await page.waitForFunction(() => (document.querySelector('[data-p3="activity-toggle"]')?.textContent ?? '').includes('Read-back'), null, WAIT).catch(() => {});
      for (const [k, state] of Object.entries(LINK_STATES)) {
        await postMsg(page, { type: 'agent-link-state', state });
        await page.waitForFunction((on) => document.querySelector('[data-p3="agent-toggle"]')?.getAttribute('aria-pressed') === String(on), state.on, WAIT).catch(() => {});
        await settle(page);
        const s = await page.evaluate(LINK_PROBE);
        const want = LINK_WANT[k];
        const full = LINK_TEXT(state);
        if (k !== 'offStale') await shoot(`closed-${k}`, '[data-p3="activity-toggle"]');
        // One baseline, in every state.
        const spread = baselineMiss(s.runs);
        ok(s.runs.length >= 3 && spread !== null && spread <= BASELINE_TOL,
          `${where} ${k}: every text run in the drawer's bar row sits on one baseline, within ${BASELINE_TOL}px (${s.runs.length} runs, spread ${spread}px: ${s.runs.map((r) => `"${r.text}" ${r.y}`).join(', ')})`);
        // The closed row's short status.
        if (!want.short) {
          hooks.absent(ok, { seen: s.rowShown && s.sumText !== null, state: 'the drawer\'s bar row, drawn with its summary' }, s.line === null,
            `${where} ${k}: no agent status in the bar row while the link is off (read ${JSON.stringify(s.text)})`);
        } else {
          ok(s.lineShown && s.text === want.short, `${where} ${k}: the bar row's agent status reads "${want.short}" (read ${JSON.stringify(s.text)}, shown ${s.lineShown})`);
          if (s.line) {
            const leftEdge = Math.max(s.sum?.r ?? 0, s.when?.r ?? 0);
            const gap = s.caret ? s.caret.l - s.line.r : null;
            ok(s.line.l >= leftEdge - 0.5 && s.lastBeforeCaret && gap !== null && gap >= 0 && gap <= LINK_CARET_GAP_MAX,
              `${where} ${k}: the status sits right of the summary and its time, last before the caret, within ${LINK_CARET_GAP_MAX}px of it (status ${s.line.l.toFixed(1)}–${s.line.r.toFixed(1)}, summary and time end ${leftEdge.toFixed(1)}, caret at ${s.caret?.l.toFixed(1)}, last before the caret ${s.lastBeforeCaret})`);
            ok(s.caret && s.row && s.caret.l >= s.row.l && s.caret.r <= s.row.r + 0.5 && s.sum && s.sum.l >= s.row.l && s.sumWhole,
              `${where} ${k}: the caret and the whole summary stay on the row (row ${s.row?.l.toFixed(1)}–${s.row?.r.toFixed(1)}, caret ${s.caret?.l.toFixed(1)}–${s.caret?.r.toFixed(1)}, summary "${s.sumText}" whole ${s.sumWhole})`);
            ok(s.rects === 1 && s.ink && s.line.h <= s.ink.lineH * 1.5 && !s.cut, `${where} ${k}: the status keeps to one line, its words whole (${s.rects} box(es), ${s.line.h.toFixed(1)}px tall, cut ${s.cut})`);
            const inkHex = LINK_INK[`${theme} ${want.ink}`];
            ok(s.ink?.hex === inkHex, `${where} ${k}: "${want.short}" draws in ${want.ink === 'color.text.danger' ? 'the chrome\'s error ink' : 'the quiet ink'}, the emission's ${want.ink} ${inkHex} (read ${s.ink?.hex})`);
            ok(s.ink && s.ink.ratio >= TEXT_MIN, `${where} ${k}: the status holds ${TEXT_MIN}:1 on its ground (${s.ink?.hex} on ${s.ink?.ground}, ${s.ink?.ratio}:1)`);
            const ax = await linkAx(page);
            ok(s.title === full, `${where} ${k}: the status's tooltip is the full line, agentLinkStatusText(state) (want "${full}", read "${s.title}")`);
            ok((ax.line ?? '').includes(want.short) && (ax.line ?? '').includes(full) && (ax.row ?? '').includes(want.short) && (ax.row ?? '').includes(full),
              `${where} ${k}: the status's accessible name carries its words and the full line: computed "${ax.line}", the row's name "${ax.row}"`);
          }
        }
        // The open drawer's first line: the full line.
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        await settle(page);
        const d = await page.evaluate(DETAIL_PROBE);
        if (want.full) {
          ok(d.shown && d.text === full && d.first && d.above,
            `${where} ${k}: the open drawer's first line is the full line, agentLinkStatusText(state), above the runs (want "${full}", read ${JSON.stringify(d.text)}, first ${d.first}, above the runs ${d.above})`);
          if (k !== 'offStale') await shoot(`open-${k}`, '[data-p3="activity-drawer"]');
        } else {
          hooks.absent(ok, { seen: d.bodyShown && d.ops > 0, state: 'the open drawer, its runs drawn' }, !d.shown,
            `${where} ${k}: the open drawer shows no agent line while the link is off with no inbox error (read ${JSON.stringify(d.text)})`);
        }
        await hooks.click(page.locator('[data-p3="activity-toggle"]'), WAIT);
        await settle(page);
      }
      // The counts are a text run too: a write running puts "1 running" in the row, beside the agent status.
      await postMsg(page, { type: 'agent-link-state', state: LINK_STATES.listening });
      await hooks.click(page.locator('[data-p3="apply-to-figma"]'), WAIT);
      await page.waitForFunction(() => !!document.querySelector('[data-p3="activity-toggle"] .p3-drawer-count'), null, WAIT).catch(() => {});
      const r = await page.evaluate(LINK_PROBE);
      const spread = baselineMiss(r.runs);
      ok(r.runs.some((x) => /running/.test(x.text)) && r.runs.length >= 4 && spread !== null && spread <= BASELINE_TOL,
        `${where} a write running: every text run in the bar row, the count too, sits on one baseline, within ${BASELINE_TOL}px (${r.runs.length} runs, spread ${spread}px: ${r.runs.map((x) => `"${x.text}" ${x.y}`).join(', ')})`);
      const bad = errors.filter((e) => !/WebSocket/.test(e));
      ok(bad.length === 0, `${where}: 0 console errors (the agent link's bridge socket aside)${bad.length ? ` — ${bad.slice(0, 2).join(' | ')}` : ''}`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${stopped(e)}`);
    } finally { await ctx.close(); }
  }
}
// The web: no agent link (N1 A: plugin only), and its row, opened by hand, on one baseline too.
for (const theme of ['light', 'dark']) {
  for (const { w, h } of WIDTHS.filter((x) => x.w === 1280 || x.w === 380)) {
    const where = `#2213 web ${theme} ${w}`;
    const { ctx, page } = await open({ host: 'web', theme, w, h });
    try {
      await hooks.click(page.locator('[data-p3="activity-open"]'), WAIT);
      const s = await page.evaluate(LINK_PROBE);
      const d = await page.evaluate(DETAIL_PROBE);
      hooks.absent(ok, { seen: s.rowShown && d.bodyShown, state: 'the studio\'s drawer, opened' }, s.line === null && !d.shown,
        `${where}: the studio's drawer draws no agent status and no agent line (read ${JSON.stringify(s.text)}, ${JSON.stringify(d.text)})`);
      const spread = baselineMiss(s.runs);
      ok(s.runs.length >= 1 && spread !== null && spread <= BASELINE_TOL, `${where}: the drawer's bar row's text sits on one baseline (${s.runs.length} run(s), spread ${spread}px)`);
    } catch (e) {
      ok(false, `${where}: the case stopped at a step that threw — ${stopped(e)}`);
    } finally { await ctx.close(); }
  }
}

// =============================================================================================
// #2232: a click on blank space inside the S12 start window keeps focus in the window, and Tab and Shift+Tab then stay
//        inside it. Both hosts, 1280. The window traps Tab with a keydown listener on its scrim, so a focus that falls
//        to <body> (outside the scrim) is a focus the trap never hears: Shift+Tab then left the page. EXPECTED, read
//        from the DOM: after the click, `document.activeElement` is the window or a control in it; after each key, a
//        control in it. Blank space is the lede paragraph, which nothing makes focusable.
//   Mutation: the window not focusable (`tabindex` dropped in `windowShell`) → `#2232 … after a click on blank space,
//   focus stays in the start window` and `… Shift+Tab …` fail by name.
// =============================================================================================
console.log('\n#2232. The start window keeps focus after a click on blank space');
for (const host of ['web', 'figma']) {
  const where = `#2232 ${host} light 1280`;
  const { ctx, page, errors } = await open({ host, theme: 'light', w: 1280, h: 900 });
  try {
    await hooks.click(page.locator('[data-p3="brand-switcher"]'));
    await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
    await hooks.need(page, '[data-p3="start-screen"]');
    const where2 = () => page.evaluate(() => {
      const dlg = document.querySelector('[data-p3="start-screen"]');
      const a = document.activeElement;
      return { inWindow: !!dlg && !!a && dlg.contains(a), onWindow: a === dlg, tag: a ? `${a.tagName.toLowerCase()}${a.getAttribute('data-p3') ? `[${a.getAttribute('data-p3')}]` : ''}` : null };
    });
    const blank = page.locator('[data-p3="start-screen"] .p3-start-lede');
    await hooks.click(blank);
    const c1 = await where2();
    ok(c1.inWindow, `${where}: after a click on blank space, focus stays in the start window (focus is on ${c1.tag})`);
    await page.keyboard.press('Tab');
    const t1 = await where2();
    ok(t1.inWindow && !t1.onWindow, `${where}: then Tab moves focus to a control in the start window (focus is on ${t1.tag})`);
    await hooks.click(blank);
    await page.keyboard.press('Shift+Tab');
    const t2 = await where2();
    ok(t2.inWindow && !t2.onWindow, `${where}: after a click on blank space, Shift+Tab moves focus to a control in the start window (focus is on ${t2.tag})`);
    ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `${where}: the case stopped at a step that threw — ${String(e?.message ?? e).split('\n')[0]}`);
  } finally { await ctx.close(); }
}

hooks.report(ok);
// THE CONTRAST EXEMPTION, counted per run (F1 A): how many nodes the audit exempted, over how many probes, and where.
{
  const hit = EXEMPTIONS.filter(([, n]) => n > 0);
  const total = hit.reduce((a, [, n]) => a + n, 0);
  console.log(`\nContrast exemption (inactive controls, WCAG 2.2 SC 1.4.3 and 1.4.11; F1 A, X4 A): ${total} node(s) exempted in ${hit.length} of ${EXEMPTIONS.length} probes.`);
  for (const [where, n, what] of hit) console.log(`  ${where}: ${n} — ${what.join(', ')}`);
}
console.log(`\nLowest chrome text ${lows.text}:1, lowest edge or indicator ${lows.edge}:1, lowest focus ring ${lows.focus}:1, smallest target ${lows.target.toFixed(1)}px.`);
console.log(`${executed - failed}/${executed} chrome assertions passed.`);
await browser.close();
server.close();
if (failed) process.exit(1);
