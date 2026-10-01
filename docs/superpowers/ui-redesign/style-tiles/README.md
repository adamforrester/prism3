# Chrome style tile (UI redesign, F3, F4, T1, T5)

One clickable direction for the chrome of the studio and the Figma plugin, in light and dark. The
owner picked **A · Quiet panels** from the first round (`decisions-2026-09-30-v4-review.md` T1) and
rejected its craft (T5). This is the second pass on A, and v5 applies it together with F1 and F2.
Directions B and C are gone from the source, the harness, the build and the audit. They are in this
folder's git history if they are needed.

Open `style-tiles.html` in a browser. It works offline: it makes no network request, and both fonts
are embedded. The bar at the top switches the **theme** (Light, Dark, System) and the **width** (1280
or 380). The state is kept in the URL hash, for example `#theme=dark&w=narrow`. Three more hash keys
set up a state for screenshots: `pane=preview`, `drawer=open` or `drawer=closed`, and `full=1` (the
whole 380 levers panel, unclipped).

## What the owner rejected, and what changed

The first pass read as "significantly worse than current state". It had system type (DejaVu Sans,
because Inter was not installed where it rendered), dense rows, an outlined segmented control with
bold text, a heavy black selected chip, shadows, and a gray ground around every panel. The current
studio (`apps/studio`) is the floor. This pass changes:

- **Type.** Inter for all chrome text, and JetBrains Mono only for values (hex, token paths, step
  numbers, contrast ratios). Both are embedded (see Fonts). Body and control text is 14px/400,
  labels 14px/500 in `text.primary`, helpers 12px/400 in `text.secondary`, and section headings
  16px/600 at `letter-spacing-role.snug` (-0.01em). Nothing is heavier than 600, and values use
  tabular numbers. The token set has 12, 14 and 16px and nothing between, so labels are 14px, not
  13px.
- **Space.** 8px from a label to its control, 24px between rows, and 40px, a hairline, then 40px
  between sections. The levers panel has 24px sides. The top bar and the tab row are 56px. Fields
  and chips are 40px, and fields and selects have 16px of inner padding (12px before) and a custom
  chevron.
- **No shadows.** There are none in the tile, and the build now fails on any `box-shadow`,
  `text-shadow` or `drop-shadow`. The shadow tokens are out of the map.
- **Radius.** `radius.lg` (6px) for controls, fields, chips, the frame and the drawer's inset card. A
  segment inside its track uses `radius.md` (4px), so the corners are concentric (6 = 4 + the 2px
  inset). Pills stay for the verdict, badges, dots, the switch and the slider thumb. The
  `core.dimension.8` and `.12` corners are gone.
- **Domain tabs** are text tabs on one hairline. The selected tab has a 2px underline in
  `text.primary` and weight 500; the rest are `text.secondary` at 400. This follows the owner's
  settings-panel reference.
- **Segmented controls** (the harness, the 380 Settings/Preview toggle) have a `foreground.primary`
  track with no outline. The selected segment lifts to `background.primary`, with a 1px
  `field.border.rest` edge that clears 3:1 against the track, at weight 500.
- **Chips.** Selected keeps the rest fill (`background.primary`), as the owner asked. The edge goes
  from 1px `field.border.rest` to 2px `interactive.neutral.border.rest`, the label goes to 500, and
  a check appears, so selection is never shown by the edge alone. The padding gives back the extra
  1px, and at 1280 the three chips share equal columns, so nothing moves. At 380, equal columns
  would crush the checked label, so the columns size to their content and share the spare width.
  Focus is a separate ring, 2px out.
- **Buttons.** "Apply Theme" is the only inverse-filled element. Export, Figma and the drawer's fix
  are secondary: `background.primary`, a 1px field edge, weight 500. Activity is a ghost button,
  with its status dot on the icon.
- **Slider and switch.** The slider is a 4px rail (`border.secondary`) with the filled part in
  `icon.primary` and a page-colored thumb with a `field.border.hover` edge. The switch is an
  outlined track with a gray knob when off, and the inverse track when on.
- **Info buttons** are a 16px glyph in a 24px hit area, in `icon.secondary`.
- **Swatches** fill their cells with no gaps, and the ramp spans the preview's width.

## Elevation: the mapping, and why

The owner asked to try the existing `background.*` and `foreground.*` roles for elevation, with no
shadows. The mapping chosen: **one page surface, split by hairlines, with inset groups on
`foreground.primary`.**

| Surface | Role | Light | Dark |
|---|---|---|---|
| Top bar, levers panel, preview, drawer bar | `color.background.primary` | white | neutral 950 |
| Region and section splits (decorative, never a control boundary) | `color.border.primary` | neutral 100 | neutral 750 |
| Inset groups: segment tracks, tips, the per-mode body, the drawer's error card, badges | `color.foreground.primary` | neutral 050 | neutral 900 |
| The harness page around the frame | `color.background.secondary` | neutral 050 | neutral 900 |

Two mappings were rendered in both themes and compared:

- **A gray preview stage with page-colored cards on it** (the first pass's look). In light it reads
  as white cards raised off a gray ground. In dark it inverts: `background.primary` is the darkest
  surface there, so the same cards read as wells cut into the stage. The mapping means one thing in
  light and the opposite in dark. It also brings back a large gray area into a UI the owner wants
  light.
- **One page surface with a tinted inset** (chosen). `foreground.primary` is a step darker than the
  page in light and a step lighter in dark. An inset group reads as set into the page in light and
  lifted a little in dark. Either reading is correct for a tip or a track, so the hierarchy is the
  same in both themes. The preview shares the levers' surface, and the vertical hairline is enough
  to split them.

The drawer's running build sits on the page with no container. Only the error, which needs action,
is an inset card. With both in cards, the drawer was the heaviest gray on the screen.

The cost: `foreground.primary` on `background.primary` is about 1.2:1, so no tinted surface can be a
control boundary on its own. Every control keeps its 3:1 edge. This is also why the field edges are
darker than in the owner's reference images, which use edges near 1.3:1. Those would fail WCAG
1.4.11 here.

## Fonts

The chrome's families are **a chrome constant in the build (`CHROME_FONTS`), not a token.** The
default theme's `core.font.family.body` is a brand lever that happens to be Inter today. If a theme
moved it, the product's own chrome should not move with it.

Both faces are committed under `apps/studio/chrome/fonts/` (moved there from `fonts/` beside this
file in S1.1 of the UI redesign, when the product started embedding them). They are the latin subsets of the variable fonts from
Fontsource, with a weight axis from 100 to 900: `@fontsource-variable/inter` 5.3.0 (Google Fonts
revision v20) and `@fontsource-variable/jetbrains-mono` 5.3.0 (revision v24). Both are under the SIL
Open Font License 1.1, and the license texts are next to them (`OFL-Inter.txt`,
`OFL-JetBrains-Mono.txt`). The build base64-encodes them into `@font-face` rules inside the
generated block, so the page stays one offline file of about 180KB.

They were fetched with `npm pack` into a scratch directory, not installed into `node_modules`:

```sh
npm pack @fontsource-variable/inter @fontsource-variable/jetbrains-mono
# then take files/inter-latin-wght-normal.woff2, files/jetbrains-mono-latin-wght-normal.woff2
# and each package's LICENSE
```

**The trap.** `document.fonts.check('14px Inter')` returns true when Inter is not available at all.
It reports that nothing is waiting to load, not that Inter drew the text. The first pass's
screenshots rendered in DejaVu Sans, and nothing in the code showed it. The audit now asks Chromium
which face it actually drew each node with (`CSS.getPlatformFontsForNode` over CDP).

## Build and check

```sh
node docs/superpowers/ui-redesign/style-tiles/build-tiles.mjs            # writes style-tiles.html
node docs/superpowers/ui-redesign/style-tiles/build-tiles.mjs --tokens   # also prints the token table

PLAYWRIGHT_MODULE=<repo>/node_modules/playwright/index.mjs \
  node docs/superpowers/ui-redesign/style-tiles/audit-tiles.mjs [screenshot dir]
```

`PLAYWRIGHT_BROWSERS_PATH` is needed only when Chromium is not in Playwright's default cache.

`build-tiles.mjs` reads `packages/engine/out/prism3.tokens.json` (root `pds3`) and
`prism3.dark.overlay.tokens.json`. It merges them per mode the way the engine emits them: an overlay
leaf replaces the base leaf at the same path, and aliases resolve against the merged tree. It emits
`--p3-*` properties for `[data-theme="light"]` and `[data-theme="dark"]`, and for
`[data-theme="system"]` under each color scheme. One role mapping serves both themes; only the mode
differs. The build fails when:

1. the tile CSS or an inline `style` carries a raw hex, color function, length or duration, or any
   shadow;
2. the source uses a `--p3-*` variable the generated block does not define, or the map defines one
   (token, font or harness) that the source never uses, so the token table below stays exact;
3. a chrome color resolves through the `primary` or `accent` palette, or through a brand, link or
   focus role. Only the `--p3-sample-*` preview content may;
4. a declared chrome pair measures under its floor in either theme. A pair is scored as drawn: an
   8-digit hex foreground is composited over its background. A translucent background, or any value
   that is not a 6- or 8-digit hex, is refused by name rather than scored, because a `NaN` ratio
   compares false against every floor and would pass silently.

`audit-tiles.mjs` renders the built page in Chromium for all 4 states (2 themes × 2 widths) and
measures what is on screen:

- every visible text node and field value against its composited background (4.5:1);
- every marked edge, fill, glyph and selected indicator against what is outside it (3:1);
- the focus ring of every stop in the Tab order (3:1);
- every control's hit target (24 × 24).

The checks are **represented, not counted** (`docs/34`). Every visible focusable control outside the
harness carries a `data-a` marker: on itself, an ancestor within two levels, a child, or a sibling it
sits beside. A control identified by its text alone (a ghost button, a link, a summary) is marked
`text`. The range input, whose boundary is drawn on pseudo-elements the page can't read, is marked
`pseudo` and covered by the declared pairs. An unmarked control or an unknown marker fails by name.
Each column also has a literal minimum per width (`MIN_CHECKS`: at 1280, 80 text, 20 checks, 18 rings
and 20 targets; at 380, 35, 15, 15 and 15), set below today's counts and not derived from the page, so
an empty column can't report a minimum of Infinity as a pass.

It also checks that System follows the color scheme, and that reduced motion slows the spinner to
its token. This pass adds four checks:

- Chromium drew the chrome in Inter and the values in JetBrains Mono;
- no text node is heavier than 600;
- no element or pseudo-element has a computed shadow;
- the page made no network request.

**Each arm was mutated and fails by name.** Each mutation ran on a clean commit and was restored
with `git checkout`.

| Mutation | Caught by | Failure |
|---|---|---|
| `--p3-field-edge` mapped to `color.border.primary` | build, declared pairs | `pair field-edge on bg-page (field, chip, button edge on page) is 1.38:1 in light, floor 3:1`, and the same for dark and for the segment edge on its track |
| the rest chip edge pointed at `--p3-line-1` in the tile CSS (the declared pairs cannot see it; the build passes) | audit, rendered edges | `edge label.chip "Compact" 1.38 < 3` and `"Spacious"`, in all 4 states. The selected chip's 2px edge still passes |
| `box-shadow: var(--p3-shadow-xs)` on `.card` | build, raw scan | `tile CSS: shadow (T5: no shadows) "box-shadow:"` |
| the embedded face renamed, so it is not what `Inter` loads | audit, CDP fonts | `font (want Inter, drew DejaVu Sans) .lab label[for="f-name"]`, and `want JetBrains Mono, drew DejaVu Sans Mono` for the values |
| `.lab { font-weight: bold }` | audit, weights | `weight above 600 label "Brand name" 700 > 600`, one per label |
| every `data-a` marker removed from the source | audit, representation and floors | `unmarked control button.info "About primary color" <button>`, one per control, and `too few checks (0 < 15) checks column`, in all 4 states |
| a declared pair with a translucent foreground (`overlay-hover` on `bg-page`) | build, declared pairs | `pair overlay-hover on bg-page (…) is 1.26:1 in light, floor 3:1`; before the fix the alpha was dropped and it scored 21:1 |
| a declared pair on a non-color value (`radius-lg`) | build, declared pairs | `pair radius-lg on bg-page (…) in light: refused, not a 6- or 8-digit hex (6px)`; before the fix it scored `NaN` and passed |
| a declared pair on a translucent background (`text` on `overlay-hover`) | build, declared pairs | `pair text on overlay-hover (…) in light: refused, translucent background (#0000001a)` |

## Behavior (unchanged from the first pass)

- Chips are a native radio group in a `fieldset` with a `legend`.
- Focus is a 2px ring with a 2px offset in `interactive.neutral.border.rest` (0px on fields). It
  never changes a fill, so it stays distinct from selected.
- The "i" buttons open a toggletip.
- The Namespace field sits in Brand › Identity with the flag the owner kept (T2). `prism` and `pds3`
  show "‹name› is reserved for the shipped catalog (or: is the default theme's placeholder). Set
  your brand's namespace before you export." Any other value shows the path it produces.
- The Activity drawer shows the verdict and time when collapsed. Open, it shows a running Build with
  progress, and one grouped error with a fix. The Activity button and the bar both toggle it. At 380
  it is a strip that holds the verdict and time.
- At 380 there is one pane. The Settings/Preview toggle has its own full-width row under the top bar,
  the domain tabs become a select, and the role table scrolls with its role column pinned.
- The domain tabs are visual only: they select, but the panel content does not change.

## Contrast, measured

Output of `audit-tiles.mjs`, every state. Each column gives the number of checks, then the lowest
measured value in parentheses.

| Theme | Width | Text nodes (min, floor 4.5:1) | Edges, fills, glyphs, indicators (min, floor 3:1) | Focus stops (min ring, floor 3:1) | Targets (min px, floor 24) | Fails |
|---|---|---|---|---|---|---|
| light | 1280 | 101 (4.54:1) | 26 (3.17:1) | 23 (16.00:1) | 30 (24) | 0 |
| light | 380 | 45 (4.54:1) | 20 (3.17:1) | 19 (16.00:1) | 22 (24) | 0 |
| dark | 1280 | 101 (4.58:1) | 26 (3.25:1) | 23 (16.72:1) | 30 (24) | 0 |
| dark | 380 | 45 (4.64:1) | 20 (3.25:1) | 19 (16.72:1) | 22 (24) | 0 |

The lowest text pair is `text.secondary` on `foreground.primary` (an unselected harness segment) at
4.54:1 in light, and the danger heading on the inset error card at 4.58:1 in dark. The lowest 3:1
check is `field.border.rest` on `foreground.primary`: the selected segment's edge on its track, and
the fix button's edge on the error card. It measures 3.17:1 in light and 3.25:1 in dark. The slider
thumb's focus ring is on a pseudo-element the audit cannot read; its color and ground are the
declared "focus ring on page" pair below.

Declared chrome pairs, resolved from the tokens at build time. The build fails on any miss.

| Pair | Floor | Light | Dark |
|---|---|---|---|
| body text on page (`text` on `bg-page`) | 4.5:1 | 19.42:1 | 18.13:1 |
| text on inset (tips, per mode, drawer cards) (`text` on `fill-1`) | 4.5:1 | 16.00:1 | 16.72:1 |
| secondary text on page (`text-2` on `bg-page`) | 4.5:1 | 5.51:1 | 5.03:1 |
| secondary text on inset (unselected segment, badge) (`text-2` on `fill-1`) | 4.5:1 | 4.54:1 | 4.64:1 |
| primary action (`inv-text` on `inv-bg`) | 4.5:1 | 18.13:1 | 18.13:1 |
| primary action hover (`inv-text` on `inv-bg-2`) | 4.5:1 | 16.72:1 | 16.00:1 |
| danger text on page (`bad-text` on `bg-page`) | 4.5:1 | 6.78:1 | 4.96:1 |
| danger text on inset (`bad-text` on `fill-1`) | 4.5:1 | 5.58:1 | 4.58:1 |
| field, chip, button edge on page (`field-edge` on `bg-page`) | 3:1 | 3.85:1 | 3.52:1 |
| selected segment edge on track; button edge on inset (`field-edge` on `fill-1`) | 3:1 | 3.17:1 | 3.25:1 |
| edge on hover; slider thumb edge (`field-edge-hover` on `bg-page`) | 3:1 | 5.51:1 | 5.03:1 |
| selected chip edge; focus ring on page (`ctl-edge` on `bg-page`) | 3:1 | 19.42:1 | 18.13:1 |
| focus ring on inset (`ctl-edge` on `fill-1`) | 3:1 | 16.00:1 | 16.72:1 |
| selected tab underline (`text` on `bg-page`) | 3:1 | 19.42:1 | 18.13:1 |
| slider rail (`line-2` on `bg-page`) | 3:1 | 3.27:1 | 4.26:1 |
| slider fill (`icon` on `bg-page`) | 3:1 | 19.42:1 | 18.13:1 |
| switch on track (`inv-bg` on `bg-page`) | 3:1 | 19.42:1 | 18.13:1 |
| info glyph, chevrons, switch off knob (`icon-2` on `bg-page`) | 3:1 | 5.51:1 | 5.03:1 |
| glyph on inset (`icon-2` on `fill-1`) | 3:1 | 4.54:1 | 4.64:1 |
| verdict dot (`ok-icon` on `bg-page`) | 3:1 | 6.70:1 | 5.03:1 |
| badge check on inset (`ok-icon` on `fill-1`) | 3:1 | 5.51:1 | 4.64:1 |
| failure dot (`bad-icon` on `bg-page`) | 3:1 | 6.78:1 | 4.96:1 |
| error glyph on inset (`bad-icon` on `fill-1`) | 3:1 | 5.58:1 | 4.58:1 |
| warning glyph (`warn-icon` on `bg-page`) | 3:1 | 6.71:1 | 5.01:1 |
| progress fill on track (`text` on `fill-2`) | 3:1 | 14.04:1 | 15.00:1 |
| spinner arc on its track (`icon` on `fill-2`) | 3:1 | 14.04:1 | 15.00:1 |

## Tokens used, by role

Generated by `build-tiles.mjs --tokens`. The path is below `pds3.`; the light and dark columns are the
resolved values. The chrome uses neutral, inverse and status roles only. The ramp and the role
samples in the preview are content, emitted separately as `--p3-sample-*` from `core.palette.primary`
and the light roles.

| Variable | Token (below `pds3.`) | Light | Dark |
|---|---|---|---|
| `--p3-bg-page` | `color.background.primary` | `#ffffff` | `#0d0d0e` |
| `--p3-bg-2` | `color.background.secondary` | `#e9e9e9` | `#171718` |
| `--p3-fill-1` | `color.foreground.primary` | `#e9e9e9` | `#171718` |
| `--p3-fill-2` | `color.foreground.secondary` | `#dbdbdc` | `#212123` |
| `--p3-text` | `color.text.primary` | `#0d0d0e` | `#f7f7f7` |
| `--p3-text-2` | `color.text.secondary` | `#67696b` | `#808284` |
| `--p3-icon` | `color.icon.primary` | `#0d0d0e` | `#f7f7f7` |
| `--p3-icon-2` | `color.icon.secondary` | `#67696b` | `#808284` |
| `--p3-line-1` | `color.border.primary` | `#dbdbdc` | `#37383a` |
| `--p3-line-2` | `color.border.secondary` | `#8d8e90` | `#747678` |
| `--p3-field-edge` | `color.field.border.rest` | `#808284` | `#67696b` |
| `--p3-field-edge-hover` | `color.field.border.hover` | `#67696b` | `#808284` |
| `--p3-ctl-edge` | `color.interactive.neutral.border.rest` | `#0d0d0e` | `#f7f7f7` |
| `--p3-overlay-hover` | `color.interactive.neutral.overlay.hover` | `#0000001a` | `#ffffff1a` |
| `--p3-overlay-pressed` | `color.interactive.neutral.overlay.pressed` | `#00000033` | `#ffffff33` |
| `--p3-inv-bg` | `color.inverse.background.primary` | `#0d0d0e` | `#f7f7f7` |
| `--p3-inv-bg-2` | `color.inverse.background.secondary` | `#171718` | `#e9e9e9` |
| `--p3-inv-text` | `color.inverse.text.primary` | `#f7f7f7` | `#0d0d0e` |
| `--p3-ok-icon` | `color.icon.success` | `#19693f` | `#38925e` |
| `--p3-warn-icon` | `color.icon.warning` | `#825100` | `#b57300` |
| `--p3-bad-text` | `color.text.danger` | `#a82e2e` | `#e34b49` |
| `--p3-bad-icon` | `color.icon.danger` | `#a82e2e` | `#e34b49` |
| `--p3-space-025` | `space.025` | `2px` | same |
| `--p3-space-050` | `space.050` | `4px` | same |
| `--p3-space-075` | `space.075` | `6px` | same |
| `--p3-space-100` | `space.100` | `8px` | same |
| `--p3-space-150` | `space.150` | `12px` | same |
| `--p3-space-200` | `space.200` | `16px` | same |
| `--p3-space-250` | `space.250` | `20px` | same |
| `--p3-space-300` | `space.300` | `24px` | same |
| `--p3-space-400` | `space.400` | `32px` | same |
| `--p3-space-500` | `space.500` | `40px` | same |
| `--p3-radius-md` | `radius.md` | `4px` | same |
| `--p3-radius-lg` | `radius.lg` | `6px` | same |
| `--p3-radius-pill` | `radius.capsule` | `999px` | same |
| `--p3-bw-hairline` | `border-width.hairline` | `1px` | same |
| `--p3-bw-thick` | `border-width.thick` | `2px` | same |
| `--p3-focus-width` | `focus.ring.width` | `2px` | same |
| `--p3-focus-offset` | `focus.ring.offset` | `2px` | same |
| `--p3-focus-offset-field` | `focus.ring.offset-field` | `0px` | same |
| `--p3-ctl-h` | `core.dimension.40` | `40px` | same |
| `--p3-ctl-h-sm` | `size.sm.height` | `36px` | same |
| `--p3-ctl-h-xs` | `size.xs.height` | `28px` | same |
| `--p3-bar-h` | `size.lg.height` | `56px` | same |
| `--p3-ctl-h-md` | `size.md.height` | `44px` | same |
| `--p3-track-h` | `control.size.sm.track` | `24px` | same |
| `--p3-track-w` | `control.size.sm.width` | `48px` | same |
| `--p3-thumb` | `control.size.sm.thumb` | `18px` | same |
| `--p3-thumb-inset` | `control.size.sm.inset` | `3px` | same |
| `--p3-dot` | `control.size.sm.dot` | `8px` | same |
| `--p3-icon-xs` | `icon.size.xs` | `16px` | same |
| `--p3-hit-min` | `core.dimension.24` | `24px` | same |
| `--p3-swatch-h` | `core.dimension.40` | `40px` | same |
| `--p3-fs-12` | `core.font.size.12` | `0.75rem` | same |
| `--p3-fs-14` | `core.font.size.14` | `0.875rem` | same |
| `--p3-fs-16` | `core.font.size.16` | `1rem` | same |
| `--p3-fw-default` | `core.font.weight-role.default` | `400` | same |
| `--p3-fw-emphasis` | `core.font.weight-role.emphasis` | `500` | same |
| `--p3-fw-strong` | `core.font.weight-role.strong` | `600` | same |
| `--p3-lh-compact` | `core.font.line-height-role.compact` | `1.25` | same |
| `--p3-lh-cozy` | `core.font.line-height-role.cozy` | `1.4` | same |
| `--p3-lh-normal` | `core.font.line-height-role.normal` | `1.5` | same |
| `--p3-ls-snug` | `core.font.letter-spacing-role.snug` | `-0.01em` | same |
| `--p3-dur-fast` | `motion.duration.fast` | `100ms` | same |
| `--p3-dur-spin` | `motion.duration.spin` | `800ms` | same |
| `--p3-dur-fast-reduced` | `motion.duration-reduced.fast` | `100ms` | same |
| `--p3-dur-spin-reduced` | `motion.duration-reduced.spin` | `2600ms` | same |
| `--p3-ease` | `motion.easing-role.default` | `cubic-bezier(0.2, 0, 0, 1)` | same |

Not from tokens, and marked so in the generated block:

- the chrome fonts `--p3-font-ui` (`"Inter", system-ui, sans-serif`) and `--p3-font-mono`
  (`"JetBrains Mono", ui-monospace, monospace`), explained under Fonts;
- the harness geometry: `--p3-h-frame-wide` (1280px), `--p3-h-frame-narrow` (380px),
  `--p3-h-frame-tall` (1080px, so the levers panel fits at the new spacing),
  `--p3-h-frame-narrow-tall` (720px) and `--p3-h-panel` (440px, the levers panel width).

Two dimensions come from primitives because no role has the value. Fields and chips are 40px
(`core.dimension.40`; `size.*` has 36 and 44), and the hit minimum is `core.dimension.24`.

## Where the token set still falls short

Only radius was filed (#1852). The rest are notes for the engine, not requests:

1. **No 13px or 15px type.** `core.font.size` goes 12, 14, 16. A 13px label would sit between the
   12px helper and the 14px value; labels are 14px/500 instead.
2. **No 40px control height role.** `size.sm` is 36px and `size.md` is 44px.
3. **`background.secondary` equals `foreground.primary`** in both modes (neutral 050, neutral 900), so
   there is one tint step, not two. It was enough here.
4. **`text.secondary` on `foreground.primary` clears 4.5:1 by 0.04 in light** (4.54:1). A deeper inset
   tint would fail it.

## Screenshots

Not committed. `audit-tiles.mjs <dir>` writes, per theme: `a2-‹theme›-1280.png`, `a2-‹theme›-380.png`
(the fixed 380 × 720 frame), `a2-‹theme›-380-full.png` (the whole levers panel, unclipped) and
`a2-‹theme›-380-preview.png` (the Preview pane with the activity sheet open).
