## (2026-09-30) — UI redesign: chrome style tiles from Prism3's own tokens, three directions in light and dark (F3, F4)

**STATUS: second pass on direction A, on `ui/style-tiles`, for the owner to review.** No engine change, no emitted artifact moves, so no engine bump and no change note. `CONTRACT_VERSION` unchanged. Everything is in `docs/superpowers/ui-redesign/style-tiles/`: `build-tiles.mjs`, `tiles.src.html`, the built `style-tiles.html`, `audit-tiles.mjs`, the embedded fonts under `fonts/` with their licenses, and a `README.md` with the rationale, the measured tables and what the token set still lacks.

**First pass.** The owner's v4 review (F3, F4) asked for two or three small directions for the studio and plugin chrome, each in light and dark, before v5. The tiles held the same content in every direction: the top bar, the levers panel (domain tabs, the Namespace field in Brand › Identity with the proposed reserved-name flag, a color field, Density chips, an "Auto: follows light" select, a slider with named stops, a switch, a "Per mode" disclosure), a 20-step ramp whose swatches fill their cells, a role row with a contrast badge, and the Activity drawer collapsed and open. A was **Quiet panels**, B **Flat and dense** and C **Inset fields**. The owner picked A (T1), kept the namespace flag (T2), filed only radius as a token gap (#1852, T3), and then rejected A's craft (T5).

**What the owner rejected, and why.** The tiles looked "significantly worse than current state", and the current studio is the floor. The type was not Inter, the labels had no room before their controls, fields were tight, everything was dense, the segmented control looked like 1990s system UI (an outlined box with bold text), and the selected chip was a heavy black fill. The owner also ruled out shadows, set 6px as the starting radius, and asked to try elevation with the existing `background.*` and `foreground.*` roles. The owner also asked for the selected chip to keep the unselected fill and change only the edge.

**Second pass: A reworked, and B and C removed** from the source, the harness, the build and the audit.
- Inter for all chrome text and JetBrains Mono only for values. Body 14px/400, labels 14px/500, helpers 12px/400, headings 16px/600 at -0.01em. Nothing is above 600.
- 8px from a label to its control, 24px between rows, and 40px, a hairline, then 40px between sections. Fields and chips are 40px, and fields have 16px of inner padding.
- Underline domain tabs, and a segmented control with a tinted track and no outline.
- Chips that keep their fill and go from a 1px field edge to a 2px neutral edge, plus a check.
- `radius.lg` everywhere, concentric inside tracks, and no shadows. The build now fails on any shadow.
- **Elevation:** one page surface (`background.primary`) split by `border.primary` hairlines, with inset groups on `foreground.primary`. A gray preview stage with page-colored cards was rendered and rejected: `background.primary` is the lightest surface in light and the darkest in dark, so those cards read as raised in light and as wells in dark. The tint reads as a group in both themes, and it keeps the UI light.

**Font family is a chrome constant, not a token.** `CHROME_FONTS` in the build names Inter and JetBrains Mono and embeds their Fontsource latin variable woff2 files (SIL OFL 1.1, licenses committed alongside) as data URIs, so the page stays offline. The default theme's `core.font.family.body` is a brand lever, and the product's chrome should not move with it.

**The trap that made the first pass look dated.** Inter was not installed in the container, so the chrome rendered in DejaVu Sans. `document.fonts.check('14px Inter')` still returns true in that case: it reports that nothing is waiting to load, not which face drew the text. The audit now asks Chromium which face it drew each node with (`CSS.getPlatformFontsForNode` over CDP). Mutated by renaming the embedded face, it fails with `font (want Inter, drew DejaVu Sans)`.

**Gates.** The audit renders the 4 states (2 themes × 2 widths). It checks text at 4.5:1; edges, fills, glyphs and indicators at 3:1; focus rings at 3:1; and targets at 24px. Its new checks are the drawn font, no weight above 600, no computed shadow, and zero network requests. All 4 states pass. The tightest numbers are `text.secondary` on `foreground.primary` at 4.54:1 in light, and `field.border.rest` on `foreground.primary` (the selected segment's edge on its track) at 3.17:1 in light. Each arm was mutated on a clean commit and failed by name:
- a declared pair (`field-edge` mapped to `border.primary`): the build fails;
- a CSS edge the pairs cannot see (the chip edge on the hairline role): the audit fails per chip;
- a `box-shadow`: the build fails;
- the font rename: the audit fails;
- a bold label: the audit fails.

**Also fixed.** The harness rewrote the URL hash to theme and width only. So `pane`, `drawer` and `full` were lost whenever a screenshot state loaded on a fresh page followed by a reload, and the "unclipped" 380 capture could come out clipped. It now keeps the other keys.

**Still short, and why.** The field edges are darker than in the owner's reference images. Those use edges near 1.3:1, and a control boundary here must clear 3:1 (WCAG 1.4.11), so `field.border.rest` (3.85:1 on white) is the lightest edge available. The token set has no 13px type and no 40px control height, so labels are 14px and fields use `core.dimension.40`. There is one tint step (`background.secondary` equals `foreground.primary`), and `text.secondary` clears 4.5:1 on it by only 0.04 in light.
