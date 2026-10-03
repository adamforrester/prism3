## (2026-10-03) — UI redesign S4f: Color › Surfaces & fills — the owner's QA rebuild (Background rows, Scrim, Fields preview, white grounds, the lock, gradients, marks)

**STATUS: branch `ui/s4f-surfaces-rebuild`, cut from `origin/main` at `c8825795` (S4e, #2001), with `main` merged in at `af875310` (S5.3 #2019, #2031).** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. Builds the owner's QA decisions of 2026-10-02 for Color › Surfaces & fills (QA-B1, B3, B6, B7, B10, B12 to B16, QA-I10's Surfaces half, QA-I2 extended), #2016 (Q80) and #1971 (Q81).

### What the user sees on Color › Surfaces & fills

**Levers.**

- **Background fills (QA-B1, B3, B7).** The controls are rows in the Foreground rows' pattern: a swatch, the name with its token under it, then the step picker. Two sub-sections at the rows' sub-heading size: **"Default background fills"** (Primary, the old "Page", which is `background.primary`; Secondary; Tertiary; the Contrast floor as a row) and **"Inverse background fills"** (the inverse fill's palette select first, then Inverse primary, Inverse secondary, Inverse tertiary). Every pick writes exactly what the control it replaces wrote (Proof).
- **Contrast floor (QA-B1, B6).** A row with its own info button: "The background most text, icon and fill colors are checked against for contrast. Auto uses background.secondary." Its control is now the step picker on the neutral ramp (it was a select). Its button reads S4e's Auto label unchanged ("Auto · follows background.secondary (‹step›)" or "Auto · ‹step›"), or the step set. The row is wide: that label is too long to share a line with the name, so the button takes the line under it.
- **Scrim (QA-B10).** Its own read-only section, after Background fills: "The overlay that dims the page behind a modal. It isn't editable." Background fills' description loses its scrim clause and is the owner's Q26 intro again: "The base page planes and their inverse counterparts." The jump links go from 8 to 9.
- **Icon (QA-I10, QA-B12).** The pairing note and button sit in the icon contrast lever's own block, as Color › Interactive drew that lever: its manifest name ("Icon contrast floor"), an info button whose text is Interactive's approved Icons description (`ICONS_DESC`), then the note and the button. The button carries a padlock that follows the state: shut while icons are paired, open while unpaired. The glyph is inline SVG in `currentColor`, aria-hidden, the same mechanism as every other chrome glyph (`lock` and `unlock` in `shell/dom.ts`); the button keeps its words as its name. The Q52/Q60/Q61 strings and dialog are unchanged.
- **Gradients (QA-B13 to B16).** The on/off switch sits at the top right of the block's header. The levers draw no gradient bar (the preview shows each gradient). Each gradient editor has 24px (`space-300`) on both sides of its divider, and Add gradient has a divider of its own with 32px (`space-400`) above the button.

**Preview.**

- **Scrim (QA-B10)** and **Fields (#2016, Q80)** are new sections, each its own shared module with its own marker (`sections/scrim.ts`, `sections/fields.ts`). Fields: "Form field fills, borders and text, in every state." It draws a field at rest, hovered (each with its placeholder) and filled (entered text in the ground's primary ink), on the page and then on the inverse fill, each field its border role around its fill role, with the token chips and their badges. The default fill is `core.palette.transparent`, which the engine resolves with black's hex and no alpha, so the section reads the role's path and paints `transparent`. The levers' Fields edit now reveals it (QA-B9), with no `PREVIEW_HEADING` row: the headings match.
- **#1971 (Q81).** Background and Foreground sit in white containers (`#ffffff`, `whiteGround` in `sections/kit.ts`) with no ratio badges: they are drawn with a `badges: false` context. Every other section stays on the page color with its badges. The Style guide (Brand) is unchanged: its Background keeps the scrim and the page ground.
- **Badge marks (QA-I2, extended), one rule for both previews.** A pass mark takes the chrome's success icon color and a miss its danger icon color. Each mark is stamped with the chrome theme whose color contrasts more with the composited ground it is actually drawn on. Where neither theme reaches 3:1, the mark keeps the badge's ink. `preview/badge-marks.ts` holds the rule: the same algorithm as #2019's `markColors`, line for line, written as a module so the two can share it. #2019 merged while this was in progress, so the merge commit unifies them: `preview/interactive.ts` calls `themeBadgeMarks` (its own copy of the rule, `markColors` and `groundUnder`, is gone), its card carries `p3-marks`, and the two `.p3-ipv` mark rules in `chrome.css` are dropped for the shared `.p3-marks` rule. #2019's own QA-I2 arms in `test:chrome` hold Interactive's marks after the change.

### The decisions inside this, and why

- **The Primary row is the same picker with a new label.** It keeps its hook, id and write (`setSurfaceBase`). The tiers and the band step keep theirs. Only the floor changes control, and the driver below holds its writes.
- **The floor uses the step picker, not the select.** The owner's row pattern ends in the step picker, as Q45 already did for Page and the band step. The key → `Number` write gives the same number the select's value gave.
- **The lever block "Background fills" (name and info) stays above the two sub-headings.** It carries the approved info text and the lever's hook. QA-B7 asked not to repeat "Background fills". The sub-sections no longer do, but the lever name still sits under the section title. Removing that name line is held for the owner.
- **The icon contrast block on Surfaces & fills uses the manifest key's hook (`lever-icon-contrast`).** #2019 homed `iconContrast` on this section's row in `pages.ts`, so the block is now its home's control.
- **Only Background and Foreground are white.** That is Q81's literal. Scrim is not a contrast check, but it stays on the page like every other non-ground section.

- **The icon rows' locks read `lockedTo()`, as before.** The rebuild moved only the pairing control; every icon row is still drawn by the shared `row()`, whose lock and "Follows text.X" come from `lockedTo()` in `state/fills-input.ts`, never a list here. So #2031's wider `ALWAYS_FOLLOWS` (19 locked, 12 editable while unpaired) reaches these rows with no change. The padlock follows `iconsPaired()`, the state its button toggles.
- **Folded-in nit (orchestrator, from #2001):** `test-fills-input.ts`'s floor-label case labelled prism3 Dark as "Page Black (as loaded)", but the engine resolves that page to `neutral.950` (the committed emission's `background.primary` in dark). The case's name now says so; its expected values are unchanged and still computed independently.

### Proof

- **Equivalence (scratch driver, not committed):** every kept control, in Light then Dark, on prism3, aurora and harbor, was driven in lockstep on `c8825795`'s built studio and on this branch's (before the merge of `main`). The persisted brand (`prism3:brandInput`, raw bytes) was compared after each edit: **1,200 of 1,200 byte-identical**, with 0 page errors. The edits: Primary 24 (a mid step, Black, White, a light step), Secondary and Tertiary 36 (two steps, then Auto), the floor 18 (the select on `main`, the picker here, the same number, then Auto), the inverse palette 16, the inverse tiers 68 (each palette's step, tier steps on two palettes, Auto), every enabled row picker 948 (a step, and Auto on every other row), Unpair, Pair with Cancel and with the dialog 17, and gradients 73 (switch off and on, add, kind, a stop's step and palette, interpolation, add stop, position, angle, rename, remove). 1,188 of the 1,200 edits moved the persisted brand; the other 12 re-wrote a value already set, alike on both sides.
- **`test:chrome`** 13,112 → 13,269 (against `main` at `af875310`). The S4f block covers: Background fills' seven rows by role and order, each a swatch, name, token and picker; the two APPROVED sub-headings; the floor and icon info texts; Scrim in its own section and not in Background fills; Q23 pairs (Background fills↔Background, Scrim, Fields); #1971 grounds (white for Background and Foreground, page for the rest) and no badges on the two grounds; the lock's shackle path per state, aria-hidden, the name its words; the gradients switch in the header at the top right; no element in the levers paints a gradient of two or more colors; the 24px and 32px room around the dividers; the Fields edit-reveal; and a Page sweep. The sweep covers 44 Page states (White, every neutral step, Black; Light and Dark). Each themed mark reads 3:1 or more in its theme's color on its composited ground, and no worse than the other theme. An unthemed mark is in the badge's ink, and only where neither theme reaches 3:1. Q59 (every control disabled in HC and wireframe) still holds, the header switch and the floor picker included.
- **`test:smoke`** 4,091 → 4,283 (against `af875310`). Per corpus brand and mode: the Scrim and Fields roots and markers; Background without the scrim; Fields' chips (literal); white grounds with no badges for Background and Foreground; Fields paints every opaque field role, page and inverse, each held to the emission's hex; Q23 descriptions read off both panes for the seven pairs. The S4c and S4e arms drive the floor through its picker.
- **`test-shell-imports`** 160 → 181. Surfaces & fills draws each shared section through its renderer by name, and none itself. `scrim.ts` and `fields.ts` stamp their own markers, and the new files are scanned.
- **`audit:modes`** passes; other unit suites unchanged (`test-fills-input` 1,011, `test-pages` 76).

### Mutations (each after a `wip:` commit, restored with `git checkout -- <file>`; the studio rebuilt, the plugin bundle not, so the web host's line is the named one)

| Mutation | Failure |
|---|---|
| (a) the Primary row writes `surfaces.<mode>.secondary` instead of `base` | smoke: `✗ S4c prism3: previewing dark, the base control writes surfaces.dark.base = 100 and leaves surfaces.light as it was — wrote surfaces {"light":{"base":"white"},"dark":{"secondary":100}}`, per brand and mode |
| (b) the scrim row also drawn inside Background fills | chrome: `✗ web: QA-B10: the scrim is in its own Scrim section, not in Background fills — in "Background fills", and still drawn inside Background fills`, `✗ web: Surfaces & fills renders the scrim.default row once — rendered 2` |
| (c) the padlock stays shut when unpaired | chrome: `✗ web QA-B12: unpaired, the pairing button draws the open padlock, decorative, beside its words — read {…"shackle":"M5.4 7.2V5.2a2.6 2.6 0 0 1 5.2 0v2"…}` |
| (d) the Fields preview section not drawn | chrome: `✗ specimen ground: surfaces & fills web light 1280, previewing light: Fields is a specimen root on background.primary #ffffff — not drawn`, per theme and mode |
| (e) the ground sections drawn with badges | chrome: `✗ #1971 surfaces & fills web light 1280, previewing light: the Foreground section shows no contrast badge (Q81) — 16 drawn`, per theme and mode. **Background has no graded role** (every `background.*` is measured against itself), so a badge context draws none there; (e2) holds Background's half by its ground: Background on the page → `✗ specimen ground: surfaces & fills web light 1280, previewing dark: Background is a specimen root on white #ffffff (#1971) — is #0d0d0e` |
| (f) the marks pick from the light theme only | chrome: `✗ QA-I2 sweep: every badge mark on Surfaces & fills reads at 3:1 or more in the better chrome theme's status icon color, or keeps the badge's ink where neither theme reaches 3:1 — light Page white: a ok mark left unthemed where a theme reaches 5.03:1 … (1404 in all)` |
| (g) a gradient bar drawn in the levers again | chrome: `✗ web QA-B14: the levers draw no gradient (the preview shows them) — drawn by gradient-bar, gradient-bar` |

The section-18 and section-21 mutations ran against a scratch slice of `test-chrome.mjs` (its setup plus those sections, generated, not committed). Its only other failures were the hook guard's "used but never rendered" lines for the sections it left out.

### Traps

- **The scrim's levers swatch is a CSS gradient:** one wash laid over the page as `linear-gradient(wash, wash), page`. A "no gradient in the levers" check that matches `gradient(` alone flags it, so the check counts a gradient as two distinct colors or more.
- **`chooseAnyMode` is declared in section 19,** after section 18 runs, so a section-18 case that calls it dies in the temporal dead zone. Use `showMode`.
- **The transparent field fill has black's hex.** The engine's candidate for `core.palette.transparent` is `BLACK` with no alpha on the resolved role, so `paint()` returns `#000000`. Read the path.
- **A badge mark's theme is read from the render.** `themeBadgeMarks` runs after the card is in the document, every paint.

### Copy

**APPROVED, as built:** "Default background fills", "Inverse background fills", "Primary", the floor tooltip, "Scrim" and its description, "Fields" and its description, `ICONS_DESC`, the Q52/Q60/Q61 strings.

**DRAFT (new visible strings, pending the owner):**

- "Inverse fill palette" (the palette select's visible label; it was the select's accessible name already)
- "Inverse primary" (the brief's name for the `inverse.background.primary` row, which was "Inverse fill")
- "Contrast floor" as a row label (unchanged words, now a row)
- The Fields preview's state names "Rest", "Hover", "Filled", its sample texts "Placeholder" and "Entered text", and its sub-headings "Base" and "Inverse" (the Background section's own words)
- The accessible names "Primary, ‹mode›: … Pick a step" and "Inverse primary, ‹mode›: … Pick a step" (was "Page, …" and "Inverse fill step, …")

### Design calls, for owner review

- The floor row's control is the step picker (the row pattern), and the row is wide: its button sits under the name.
- The "Background fills" lever name line stays above the two new sub-headings, because it carries the approved info text.
- The icon contrast block's info text is `ICONS_DESC`, and its name is the manifest's "Icon contrast floor"; the note and button follow, unchanged.
- The Fields preview's states: Rest, Hover (each with the placeholder) and Filled (the ground's primary ink). There is no focus state, because the focus ring has its own section.
- Scrim sits on the page color, not white (Q81 names only Background and Foreground).

### Out of scope, found here (not fixed)

- The plugin at 800px clips the levers pane's right edge on Surfaces & fills (on `main` too).
- `test-shell-imports.ts` carries the "one Style guide, two pages" block twice, word for word (both copies updated here).
- `.p3-gbar` and the `gbar-h` chrome token are now unused.
