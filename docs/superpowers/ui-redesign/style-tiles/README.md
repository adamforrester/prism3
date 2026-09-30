# Chrome style tiles (UI redesign, F3 and F4)

Three small, clickable directions for the chrome of the studio and the Figma plugin, each in light
and dark, for the owner to pick one (`decisions-2026-09-30-v4-review.md` F3 and F4). v5 applies the
chosen direction together with F1 and F2. Every direction holds the same content, so they compare on
treatment alone.

Open `style-tiles.html` in a browser. It works offline and loads no fonts or scripts. The bar at
the top switches the **direction** (A, B, C), the **theme** (Light, Dark, System) and the **width**
(1280 or 380). The state is kept in the URL hash, for example `#dir=b&theme=dark&w=narrow`.

## Build and check

```sh
node docs/superpowers/ui-redesign/style-tiles/build-tiles.mjs            # writes style-tiles.html
node docs/superpowers/ui-redesign/style-tiles/build-tiles.mjs --tokens   # also prints the token table

PLAYWRIGHT_MODULE=<cache>/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=<browsers> \
  node docs/superpowers/ui-redesign/style-tiles/audit-tiles.mjs [screenshot dir]
```

`build-tiles.mjs` reads `packages/engine/out/prism3.tokens.json` (root `pds3`) and
`prism3.dark.overlay.tokens.json`. It merges them per mode the way the engine emits them: an overlay
leaf replaces the base leaf at the same path, and aliases resolve against the merged tree. It emits
`--p3-*` properties for `[data-theme="light"]` and `[data-theme="dark"]`, and for
`[data-theme="system"]` under each color scheme. One role mapping serves both themes; only the mode
differs. The build fails when:

1. the tile CSS or an inline `style` carries a raw hex, color function, length or duration;
2. the source uses a `--p3-*` variable the generated block does not define, or the map defines one
   the source never uses (so the token table below stays exact);
3. a chrome color resolves through the `primary` or `accent` palette, or through a brand, link or
   focus role. Only the `--p3-sample-*` preview content may;
4. a declared chrome pair measures under its floor in either theme.

Each arm was mutated and fails by name: `#fafafa`, `12px` and `200ms` in the tile CSS; `rgb()` in an
inline style; an undefined `--p3-nope`; `ctl-edge` mapped to `color.border.focus`; `text-2` mapped to
`color.text.tertiary`.

`audit-tiles.mjs` renders the built page in Chromium for all 12 states (3 directions × 2 themes ×
2 widths) and measures what is on screen: every visible text node and field value against its
composited background (4.5:1); every marked edge, fill, glyph and selected indicator against what
is outside it (3:1); the focus ring of every stop in the Tab order (3:1); and every control's hit
target (24 × 24). It also checks that System follows the color scheme and that reduced motion
slows the spinner to its token. Mutated by pointing the field edge at the decorative hairline role
in the tile CSS (the build's declared pairs do not see that), it fails naming each field, for
example `edge select.field "Brand" 1.14 < 3`.

## The directions

**A · Quiet panels.** White panels with 12px corners and a hairline sit on a soft gray ground.
Rows are spaced 20px apart, labels sit above the fields, and the domain tabs are a segmented
control. It suits most users and reads calmest next to a brand preview. The cost is the ground and
the gutters, 36px of width at 1280. At 380 the panel goes full-bleed and the gray only shows
around the top row, so it scales well. In dark the panel (`background.primary`, neutral 950) sits a
step darker than the ground (neutral 900). That is the token set's order, not a choice (gaps, 3).

**B · Flat and dense.** One surface. Sections are split by space and small uppercase headings,
labels sit in a 128px column on the left, and controls are 28px tall. Tabs are an underline. It
suits expert, heavy daily use: at 1280 the whole levers panel fits with room to spare. The costs:
labels are 12px secondary text, field text drops to 12px so the "Auto: follows light" option fits
the control column, and the page has less rhythm to scan by. At 380 the label column folds above
the field, and it becomes the most compact of the three.

**C · Inset fields.** Fields are tinted (`foreground.primary`) with no side borders at rest, a 2px
bottom edge that clears 3:1, and a full edge on hover. Labels are 14px medium, section heads 18px,
and controls 44px tall. The canvas is a sunken gray with white cards, and the tabs are filled pills.
It suits touch and first-run users, and it is the softest look. The cost is height: the levers panel
is the longest of the three. At 380 it needs the most scrolling. Chips and the switch keep a full
hairline edge, because a 3:1 boundary from fill alone is not reachable with a soft tint (gaps, 5).

All three share the same behavior:

- Chips are a native radio group in a `fieldset` with a `legend`. The selected chip is filled
  inverse and carries a check, so selection is not shown by color alone.
- Focus is a 2px ring with a 2px offset in `interactive.neutral.border.rest`. It never changes a
  fill, so it stays distinct from selected.
- The "i" buttons are 24 × 24 and open a toggletip.
- The Namespace field sits in Brand › Identity with the **proposed flag, for the owner to confirm**:
  `prism` and `pds3` show "‹name› is reserved for the shipped catalog (or: is the default theme's
  placeholder). Set your brand's namespace before you export." Any other value shows the path it
  produces.
- The Activity drawer shows the verdict and time when collapsed, and a running Build with progress
  and one grouped error with a fix when open. The Activity button and the bar both toggle it. At 380
  it is a strip that holds the verdict and time.
- At 380 there is one pane with a Settings/Preview toggle, the domain tabs become a select, and the
  role table scrolls with its role column pinned.
- The domain tabs are visual in the tiles: they select, but the panel content does not change.

## Contrast, measured

Rendered in Chromium, every state. Each column gives the number of checks, then the lowest measured
value in parentheses.

| Direction | Theme | Width | Text nodes (min, floor 4.5:1) | Edges, fills, glyphs, indicators (min, floor 3:1) | Focus stops (min ring, floor 3:1) | Targets (min px, floor 24) | Fails |
|---|---|---|---|---|---|---|---|
| A · Quiet panels | light | 1280 | 105 (4.54:1) | 27 (3.17:1) | 23 (16.00:1) | 30 (24) | 0 |
| A · Quiet panels | light | 380 | 49 (4.54:1) | 20 (3.17:1) | 19 (16.00:1) | 22 (24) | 0 |
| A · Quiet panels | dark | 1280 | 105 (4.64:1) | 27 (3.25:1) | 23 (16.72:1) | 30 (24) | 0 |
| A · Quiet panels | dark | 380 | 49 (4.64:1) | 20 (3.25:1) | 19 (16.72:1) | 22 (24) | 0 |
| B · Flat and dense | light | 1280 | 105 (4.54:1) | 27 (3.85:1) | 23 (19.42:1) | 30 (24) | 0 |
| B · Flat and dense | light | 380 | 49 (4.54:1) | 20 (3.85:1) | 19 (19.42:1) | 22 (24) | 0 |
| B · Flat and dense | dark | 1280 | 105 (4.64:1) | 27 (3.52:1) | 23 (18.13:1) | 30 (24) | 0 |
| B · Flat and dense | dark | 380 | 49 (4.64:1) | 20 (3.52:1) | 19 (18.13:1) | 22 (24) | 0 |
| C · Inset fields | light | 1280 | 105 (4.54:1) | 27 (3.85:1) | 23 (16.00:1) | 30 (24) | 0 |
| C · Inset fields | light | 380 | 49 (4.54:1) | 20 (3.85:1) | 19 (16.00:1) | 22 (24) | 0 |
| C · Inset fields | dark | 1280 | 105 (4.64:1) | 27 (3.52:1) | 23 (16.72:1) | 30 (24) | 0 |
| C · Inset fields | dark | 380 | 49 (4.64:1) | 20 (3.52:1) | 19 (16.72:1) | 22 (24) | 0 |

The lowest text pair in every state is `text.secondary` on a `background.secondary` or
`foreground.primary` surface (the harness's unselected options): 4.54:1 in light, 4.64:1 in dark. The
lowest 3:1 check is a field edge: A's brand select on the gray ground at 3.17:1 (light) and 3.25:1
(dark), and B's and C's at 3.85:1 and 3.52:1. The slider thumb's ring is on a pseudo-element the
audit cannot read. Its color and ground are the declared "focus ring on panel" pair below.

Declared chrome pairs, resolved from the tokens at build time. The build fails on any miss.

| Pair | Floor | Light | Dark |
|---|---|---|---|
| body text on panel (`text` on `bg-page`) | 4.5:1 | 19.42:1 | 18.13:1 |
| body text on ground (`text` on `bg-ground`) | 4.5:1 | 16.00:1 | 16.72:1 |
| secondary text on panel (`text-2` on `bg-page`) | 4.5:1 | 5.51:1 | 5.03:1 |
| secondary text on ground (`text-2` on `bg-ground`) | 4.5:1 | 4.54:1 | 4.64:1 |
| secondary text on tinted track/field (`text-2` on `fill-1`) | 4.5:1 | 4.54:1 | 4.64:1 |
| text on tinted field (`text` on `fill-1`) | 4.5:1 | 16.00:1 | 16.72:1 |
| primary action / selected chip (`inv-text` on `inv-bg`) | 4.5:1 | 18.13:1 | 18.13:1 |
| primary action hover (`inv-text` on `inv-bg-2`) | 4.5:1 | 16.72:1 | 16.00:1 |
| danger text (`bad-text` on `bg-page`) | 4.5:1 | 6.78:1 | 4.96:1 |
| danger text on ground (`bad-text` on `bg-ground`) | 4.5:1 | 5.58:1 | 4.58:1 |
| field edge on panel (`field-edge` on `bg-page`) | 3:1 | 3.85:1 | 3.52:1 |
| selected segment edge on track (`field-edge` on `fill-1`) | 3:1 | 3.17:1 | 3.25:1 |
| field edge, hover (`field-edge-hover` on `bg-page`) | 3:1 | 5.51:1 | 5.03:1 |
| track edge / slider rail (`line-2` on `bg-page`) | 3:1 | 3.27:1 | 4.26:1 |
| focus ring on panel (`ctl-edge` on `bg-page`) | 3:1 | 19.42:1 | 18.13:1 |
| focus ring on ground (`ctl-edge` on `bg-ground`) | 3:1 | 16.00:1 | 16.72:1 |
| selected chip fill vs panel (`inv-bg` on `bg-page`) | 3:1 | 19.42:1 | 18.13:1 |
| info glyph (`icon-2` on `bg-page`) | 3:1 | 5.51:1 | 5.03:1 |
| info glyph on ground (`icon-2` on `bg-ground`) | 3:1 | 4.54:1 | 4.64:1 |
| verdict dot (`ok-icon` on `bg-page`) | 3:1 | 6.70:1 | 5.03:1 |
| failure dot (`bad-icon` on `bg-page`) | 3:1 | 6.78:1 | 4.96:1 |
| warning glyph (`warn-icon` on `bg-page`) | 3:1 | 6.71:1 | 5.01:1 |
| error rule (`bad-edge` on `bg-page`) | 3:1 | 5.54:1 | 4.96:1 |
| progress fill on track (`text` on `fill-2`) | 3:1 | 14.04:1 | 15.00:1 |

## Tokens used, by role

Generated by `build-tiles.mjs --tokens`. The path is below `pds3.`; the light and dark columns are
the resolved values. The chrome uses neutral, inverse and status roles only. The ramp and the role
samples in the preview are content, emitted separately as `--p3-sample-*` from `core.palette.primary`
and the light roles.

| Variable | Token (below `pds3.`) | Light | Dark |
|---|---|---|---|
| `--p3-bg-page` | `color.background.primary` | `#ffffff` | `#0d0d0e` |
| `--p3-bg-ground` | `color.background.secondary` | `#e9e9e9` | `#171718` |
| `--p3-bg-tertiary` | `color.background.tertiary` | `#dbdbdc` | `#212123` |
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
| `--p3-field-placeholder` | `color.field.placeholder` | `#67696b` | `#808284` |
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
| `--p3-bad-edge` | `color.border.danger` | `#bd3838` | `#e34b49` |
| `--p3-space-025` | `space.025` | `2px` | same |
| `--p3-space-050` | `space.050` | `4px` | same |
| `--p3-space-075` | `space.075` | `6px` | same |
| `--p3-space-100` | `space.100` | `8px` | same |
| `--p3-space-150` | `space.150` | `12px` | same |
| `--p3-space-200` | `space.200` | `16px` | same |
| `--p3-space-250` | `space.250` | `20px` | same |
| `--p3-space-300` | `space.300` | `24px` | same |
| `--p3-space-400` | `space.400` | `32px` | same |
| `--p3-radius-md` | `radius.md` | `4px` | same |
| `--p3-radius-lg` | `radius.lg` | `6px` | same |
| `--p3-radius-8` | `core.dimension.8` | `8px` | same |
| `--p3-radius-12` | `core.dimension.12` | `12px` | same |
| `--p3-radius-pill` | `radius.capsule` | `999px` | same |
| `--p3-bw-hairline` | `border-width.hairline` | `1px` | same |
| `--p3-bw-thick` | `border-width.thick` | `2px` | same |
| `--p3-focus-width` | `focus.ring.width` | `2px` | same |
| `--p3-focus-offset` | `focus.ring.offset` | `2px` | same |
| `--p3-focus-offset-field` | `focus.ring.offset-field` | `0px` | same |
| `--p3-ctl-h-xs` | `size.xs.height` | `28px` | same |
| `--p3-ctl-h-sm` | `size.sm.height` | `36px` | same |
| `--p3-ctl-h-md` | `size.md.height` | `44px` | same |
| `--p3-track-h` | `control.size.sm.track` | `24px` | same |
| `--p3-track-w` | `control.size.sm.width` | `48px` | same |
| `--p3-thumb` | `control.size.sm.thumb` | `18px` | same |
| `--p3-thumb-inset` | `control.size.sm.inset` | `3px` | same |
| `--p3-dot` | `control.size.sm.dot` | `8px` | same |
| `--p3-icon-xs` | `icon.size.xs` | `16px` | same |
| `--p3-hit-min` | `core.dimension.24` | `24px` | same |
| `--p3-swatch-h` | `core.dimension.40` | `40px` | same |
| `--p3-label-col` | `core.dimension.128` | `128px` | same |
| `--p3-font-body` | `core.font.family.body` | `"Inter", system-ui, -apple…` | same |
| `--p3-font-code` | `core.font.family.code` | `"JetBrains Mono", ui-monos…` | same |
| `--p3-fs-11` | `core.font.size.11` | `0.6875rem` | same |
| `--p3-fs-12` | `core.font.size.12` | `0.75rem` | same |
| `--p3-fs-14` | `core.font.size.14` | `0.875rem` | same |
| `--p3-fs-16` | `core.font.size.16` | `1rem` | same |
| `--p3-fs-18` | `core.font.size.18` | `1.125rem` | same |
| `--p3-fw-default` | `core.font.weight-role.default` | `400` | same |
| `--p3-fw-emphasis` | `core.font.weight-role.emphasis` | `500` | same |
| `--p3-fw-strong` | `core.font.weight-role.strong` | `600` | same |
| `--p3-lh-snug` | `core.font.line-height-role.snug` | `1.15` | same |
| `--p3-lh-compact` | `core.font.line-height-role.compact` | `1.25` | same |
| `--p3-lh-cozy` | `core.font.line-height-role.cozy` | `1.4` | same |
| `--p3-lh-normal` | `core.font.line-height-role.normal` | `1.5` | same |
| `--p3-ls-normal` | `core.font.letter-spacing-role.normal` | `0em` | same |
| `--p3-ls-wider` | `core.font.letter-spacing-role.wider` | `0.05em` | same |
| `--p3-shadow-xs` | `shadow.xs` | `0px 1px 2px 0px #0a12281a,…` | `0px 1px 2px 0px #0a122808,…` |
| `--p3-shadow-md` | `shadow.md` | `0px 2px 4px -2px #0a12281f…` | `0px 2px 4px -2px #0a12280f…` |
| `--p3-dur-fast` | `motion.duration.fast` | `100ms` | same |
| `--p3-dur-normal` | `motion.duration.normal` | `200ms` | same |
| `--p3-dur-spin` | `motion.duration.spin` | `800ms` | same |
| `--p3-dur-fast-reduced` | `motion.duration-reduced.fast` | `100ms` | same |
| `--p3-dur-normal-reduced` | `motion.duration-reduced.normal` | `50ms` | same |
| `--p3-dur-spin-reduced` | `motion.duration-reduced.spin` | `2600ms` | same |
| `--p3-ease` | `motion.easing-role.default` | `cubic-bezier(0.2, 0, 0, 1)` | same |

Not from tokens, and marked so in the generated block: the harness geometry `--p3-h-frame-wide`
(1280px), `--p3-h-frame-narrow` (380px), `--p3-h-frame-tall` (1000px),
`--p3-h-frame-narrow-tall` (720px) and `--p3-h-panel` (440px, the levers panel width).

**Fonts.** The chrome uses `core.font.family.body` (Inter) and `.code` (JetBrains Mono) with each
token's own fallback stack. The page loads no web fonts. Inter and JetBrains Mono are not installed
where the screenshots were made, so they render in `system-ui` (DejaVu Sans) and `ui-monospace`
(DejaVu Sans Mono). The title family (Playfair Display, italic) is brand content, so the chrome
never uses it.

## What the token set lacked

Listed, not invented. Each is a question for the engine, not a value these tiles made up.

1. **No neutral focus role.** `color.border.focus` resolves to `primary.600`, the brand. The tiles
   use `interactive.neutral.border.rest` (neutral 950 or 025), which clears 16:1 on every chrome
   surface.
2. **Radius roles stop at `radius.lg` = 6px.** The 8px control and 12px panel corners come from the
   `core.dimension.8` and `.12` primitives. A container or panel radius role would replace them.
3. **No raised surface role that lifts in dark.** `background.primary` is the lightest surface in
   light and the darkest in dark, so a panel on `background.secondary` reads as raised in light and
   inset in dark. A `surface.raised` role (white in light, a step above the ground in dark) would
   let A keep its look in both themes. Shadows alone cannot carry it: the dark shadow tokens are
   reduced by design (`surface lift carries dark elevation`).
4. **No neutral selected fill.** `interactive.neutral.fill.selected` equals `fill.rest` in both
   modes (neutral 150, neutral 850). Selected chips and pills use the inverse roles instead.
5. **A fill cannot be both soft and the 3:1 boundary.** Against white, the lightest neutral that
   clears 3:1 is `neutral.400` (#8d8e90, 3.28:1); `neutral.350` is 2.82:1. So C keeps a bottom
   edge on fields and a hairline on chips. There is also no tinted field-fill role:
   `color.field.fill` is transparent, and C borrows `foreground.primary`.
6. **Thin text margin on the gray ground.** `text.secondary` clears 4.5:1 on `background.secondary`
   by 0.04 in light (4.54:1). A ground one step darker would fail. `text.tertiary` is below 4.5:1 on
   every surface (3.86:1 on white, 3.52:1 in dark), so the chrome never uses it for text.
7. **No layout tokens for a side panel or a frame.** The levers panel width (440px) and the frame
   sizes are harness constants (listed above).
8. **Shadows carry the default theme's tint** (`#0a1228` at low alpha), set by the shadow tint lever
   and not the neutral palette. It is barely visible at these alphas, but a chrome built on it
   inherits whatever tint a theme sets.

## Screenshots

Not committed. `audit-tiles.mjs <dir>` writes, per direction and theme: `‹dir›-‹theme›-1280.png`,
`‹dir›-‹theme›-380.png` (the fixed 380 × 720 frame), `‹dir›-‹theme›-380-full.png` (the whole levers
panel, unclipped) and `‹dir›-‹theme›-380-preview.png` (the Preview pane with the activity sheet open).
