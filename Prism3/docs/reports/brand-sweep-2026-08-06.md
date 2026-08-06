# Combinatorial brand sweep — 2026-08-06

> `test.ts` runs five extreme white-label brands end-to-end. This sweep widens that to the input
> space: **2,033 synthetic brands, 882,656 contract evaluations**, every one asserted against the
> engine's own declared floors. The harness was calibrated before any result was trusted: it
> reproduces the known wendys `interactive.primary.on-inverse.border` margin (**3.30 against the
> 3.0 floor, +0.30**) to the hundredth. Report only — no code changed, no gate added.

## Sweep dimensions

| dimension | inputs | brands | contracts | fails |
|---|---|---|---|---|
| LCH grid, derived neutral | L 0.10→0.95 step 0.05 (18) × C 0→0.30 step 0.05 (7) × H every 30° (12) | 1,512 | 671,328 | **89** |
| Pinned neutral anchor | L {0.15…0.95} × C {0.05,0.15,0.25} × 12 hues, `neutral.anchor` OKLCH gray | 180 | 79,920 | **8** |
| Mode sets | 1 through 5 modes (`light` → `+wireframe`), 12 hues × 3 lightnesses | 180 | 59,940 | 0 |
| Sparsest input | `{ id, primary, neutral }` only | 1 | 444 | 0 |
| Enum levers | every enum lever at every value, read mechanically from `theme-schema.json` (160 variants: disabledStrategy, iconContrast, outlineInteraction, neutralEmphasis, named neutral hue/chroma, tempo, all 24 easingRoles, typeScale, displayCeiling, titleFloor, all modeLevers.dark enums incl. 42 lineHeight and 30 letterSpacing re-points) | 160 | 71,024 | 0 |

Per brand: `brandTheme` must build (zero threw), `resolveAllModes` contracts (every role with a
declared floor), the L-01 state-distinctness assertion (zero collapses), and — for the enum-lever,
five-mode, and sparsest variants — full `buildTree` alias resolution (zero unresolved).

## The one distinct failure mode

All **97 failures collapse to a single mechanism**. Every failing role is a **state variant** —
`fill.hover/focused/pressed/selected`, `text.hover`, `link.hover` — never a `rest` role, and every
failing brand sits at **high chroma (C ≥ 0.25)** at mid lightness, concentrated at hues 30/180/210.

**The mechanism, reproduced** (`l0.55 c0.30 h180`, light mode):

```
fill.rest    → primary.450  #009280  Y=0.2212   3.18:1  ✓ (placed, floor-gated)
fill.hover   → primary.500  #009f78  Y=0.2615   2.77:1  ✗ (walked +1 "toward more contrast")
fill.pressed → primary.550  #007667  Y=0.1394   4.56:1  ✓
```

The state walk assumes the ramp is monotonic in contrast — step darker, gain contrast. At high
chroma it is not: **step 500 is the pinned brand anchor**, which keeps its full chroma while the
generated neighbors carry lower ramp-curve chroma, and for hues where chroma raises luminance
(green/cyan/orange), the anchor step's WCAG luminance **rises above its lighter neighbor**
(Y 0.2212 → 0.2615). The walk steps from a verified 3.18 into an unverified 2.77 — under the floor
`rest` was placed to clear. Exact-anchor preservation (engine invariant #2) colliding with the
walk's monotonicity assumption; nothing re-verifies the walked step.

The same walk drives the text/link hover states (`modes.ts` walks ±1/2 from the placed rest step),
which is why `text.link.hover`, `icon.link.hover`, `interactive.*.text.hover`, and the `on-inverse`
twins fail in the same input region — including against the 7:1 HC floors, where the deficit is
the same shape one band over. Worst observed: **2.215 against a 3.0 floor** (fill.hover, light).

Filed as one issue (not 38): the failure is one mechanism with one fix shape — either re-verify the
walked step against the state's floor and keep walking (the L-01 reflect logic already handles
running out of ramp), or make the walk luminance-aware rather than step-aware.

## What came back clean, stated plainly

- Zero `brandTheme` rejections or throws across the space — including L 0.10 and 0.95 at C 0.30,
  far outside any real brand.
- Zero state-distinctness collapses (the L-01 reflect logic held everywhere).
- Zero unresolved aliases in any generated tree checked (341 trees: all enum-lever, five-mode, and
  sparsest variants).
- Mode sets 1→5 all green, including wireframe; every enum lever at every value all green — the
  #531-renamed easing enums, both legacy disabledStrategy aliases, and every re-point included.

## Reading the margin tables

The global top-ten is dominated by **floor-placed values landing at floor + epsilon** — the
placement walks target the floor and stop, so across 2,033 brands the extreme is always ~+0.0002.
That is the placement working, not risk. The actionable margin signal is **per real brand**: the
corpus table below is the one to review — those are pinned or structurally-derived values (the
wendys border case from this sweep's brief is exactly this class) where a small brand change spends
the margin invisibly.

## Every failing (brand, mode, role, ratio, floor) tuple — 97 rows, 38 brands

| brand | mode | role | ratio | floor |
|---|---|---|---|---|
| `anchor l0.35 c0.25 h180` | hc-light | `icon.link.hover` | 6.793 | 7 |
| `grid l0.35 c0.25 h180` | hc-light | `icon.link.hover` | 6.806 | 7 |
| `grid l0.35 c0.3 h180` | hc-light | `icon.link.hover` | 6.448 | 7 |
| `grid l0.35 c0.3 h210` | hc-light | `icon.link.hover` | 6.960 | 7 |
| `grid l0.35 c0.3 h30` | hc-light | `icon.link.hover` | 6.772 | 7 |
| `grid l0.45 c0.25 h180` | light | `icon.link.hover` | 4.442 | 4.5 |
| `grid l0.45 c0.3 h180` | light | `icon.link.hover` | 4.171 | 4.5 |
| `grid l0.45 c0.3 h210` | light | `icon.link.hover` | 4.394 | 4.5 |
| `grid l0.65 c0.25 h180` | hc-dark | `icon.link.hover` | 6.828 | 7 |
| `grid l0.65 c0.3 h180` | hc-dark | `icon.link.hover` | 6.828 | 7 |
| `grid l0.65 c0.3 h210` | hc-dark | `icon.link.hover` | 6.744 | 7 |
| `grid l0.9 c0.3 h30` | hc-dark | `icon.link.hover` | 6.590 | 7 |
| `grid l0.35 c0.3 h30` | hc-light | `interactive.destructive.fill.focused` | 6.772 | 7 |
| `grid l0.35 c0.3 h30` | hc-light | `interactive.destructive.fill.hover` | 6.772 | 7 |
| `grid l0.8 c0.25 h30` | hc-dark | `interactive.destructive.fill.pressed` | 6.330 | 7 |
| `grid l0.8 c0.3 h30` | hc-dark | `interactive.destructive.fill.pressed` | 5.173 | 7 |
| `grid l0.8 c0.25 h30` | hc-dark | `interactive.destructive.fill.selected` | 6.330 | 7 |
| `grid l0.8 c0.3 h30` | hc-dark | `interactive.destructive.fill.selected` | 5.173 | 7 |
| `anchor l0.75 c0.25 h30` | hc-light | `interactive.destructive.on-inverse.text.hover` | 6.657 | 7 |
| `grid l0.75 c0.25 h30` | hc-light | `interactive.destructive.on-inverse.text.hover` | 6.657 | 7 |
| `grid l0.75 c0.3 h30` | hc-light | `interactive.destructive.on-inverse.text.hover` | 5.449 | 7 |
| `anchor l0.75 c0.25 h30` | hc-dark | `interactive.destructive.text.hover` | 6.657 | 7 |
| `grid l0.55 c0.3 h30` | light | `interactive.destructive.text.hover` | 4.463 | 4.5 |
| `grid l0.75 c0.25 h30` | hc-dark | `interactive.destructive.text.hover` | 6.657 | 7 |
| `grid l0.75 c0.3 h30` | hc-dark | `interactive.destructive.text.hover` | 5.449 | 7 |
| `anchor l0.35 c0.25 h180` | hc-light | `interactive.primary.fill.focused` | 6.793 | 7 |
| `anchor l0.55 c0.25 h180` | light | `interactive.primary.fill.focused` | 2.959 | 3 |
| `grid l0.35 c0.25 h180` | hc-light | `interactive.primary.fill.focused` | 6.806 | 7 |
| `grid l0.35 c0.3 h180` | hc-light | `interactive.primary.fill.focused` | 6.448 | 7 |
| `grid l0.35 c0.3 h210` | hc-light | `interactive.primary.fill.focused` | 6.960 | 7 |
| `grid l0.35 c0.3 h30` | hc-light | `interactive.primary.fill.focused` | 6.772 | 7 |
| `grid l0.45 c0.3 h30` | dark | `interactive.primary.fill.focused` | 2.916 | 3 |
| `grid l0.55 c0.25 h180` | light | `interactive.primary.fill.focused` | 2.965 | 3 |
| `grid l0.55 c0.3 h180` | light | `interactive.primary.fill.focused` | 2.771 | 3 |
| `grid l0.55 c0.3 h210` | light | `interactive.primary.fill.focused` | 2.896 | 3 |
| `grid l0.65 c0.25 h180` | hc-dark | `interactive.primary.fill.focused` | 6.828 | 7 |
| `grid l0.65 c0.3 h180` | hc-dark | `interactive.primary.fill.focused` | 6.828 | 7 |
| `grid l0.65 c0.3 h210` | hc-dark | `interactive.primary.fill.focused` | 6.744 | 7 |
| `grid l0.7 c0.3 h0` | light | `interactive.primary.fill.focused` | 2.739 | 3 |
| `grid l0.7 c0.3 h30` | light | `interactive.primary.fill.focused` | 2.692 | 3 |
| `grid l0.75 c0.3 h30` | light | `interactive.primary.fill.focused` | 2.215 | 3 |
| `grid l0.9 c0.3 h30` | hc-dark | `interactive.primary.fill.focused` | 6.590 | 7 |
| `anchor l0.35 c0.25 h180` | hc-light | `interactive.primary.fill.hover` | 6.793 | 7 |
| `anchor l0.55 c0.25 h180` | light | `interactive.primary.fill.hover` | 2.959 | 3 |
| `grid l0.35 c0.25 h180` | hc-light | `interactive.primary.fill.hover` | 6.806 | 7 |
| `grid l0.35 c0.3 h180` | hc-light | `interactive.primary.fill.hover` | 6.448 | 7 |
| `grid l0.35 c0.3 h210` | hc-light | `interactive.primary.fill.hover` | 6.960 | 7 |
| `grid l0.35 c0.3 h30` | hc-light | `interactive.primary.fill.hover` | 6.772 | 7 |
| `grid l0.45 c0.3 h30` | dark | `interactive.primary.fill.hover` | 2.916 | 3 |
| `grid l0.55 c0.25 h180` | light | `interactive.primary.fill.hover` | 2.965 | 3 |
| `grid l0.55 c0.3 h180` | light | `interactive.primary.fill.hover` | 2.771 | 3 |
| `grid l0.55 c0.3 h210` | light | `interactive.primary.fill.hover` | 2.896 | 3 |
| `grid l0.65 c0.25 h180` | hc-dark | `interactive.primary.fill.hover` | 6.828 | 7 |
| `grid l0.65 c0.3 h180` | hc-dark | `interactive.primary.fill.hover` | 6.828 | 7 |
| `grid l0.65 c0.3 h210` | hc-dark | `interactive.primary.fill.hover` | 6.744 | 7 |
| `grid l0.7 c0.3 h0` | light | `interactive.primary.fill.hover` | 2.739 | 3 |
| `grid l0.7 c0.3 h30` | light | `interactive.primary.fill.hover` | 2.692 | 3 |
| `grid l0.75 c0.3 h30` | light | `interactive.primary.fill.hover` | 2.215 | 3 |
| `grid l0.9 c0.3 h30` | hc-dark | `interactive.primary.fill.hover` | 6.590 | 7 |
| `grid l0.75 c0.3 h30` | light | `interactive.primary.fill.pressed` | 2.532 | 3 |
| `grid l0.75 c0.3 h30` | light | `interactive.primary.fill.selected` | 2.532 | 3 |
| `grid l0.4 c0.25 h180` | hc-dark | `interactive.primary.on-inverse.text.hover` | 6.714 | 7 |
| `grid l0.4 c0.25 h210` | hc-dark | `interactive.primary.on-inverse.text.hover` | 6.991 | 7 |
| `grid l0.4 c0.3 h150` | hc-dark | `interactive.primary.on-inverse.text.hover` | 6.952 | 7 |
| `grid l0.4 c0.3 h180` | hc-dark | `interactive.primary.on-inverse.text.hover` | 6.287 | 7 |
| `grid l0.4 c0.3 h210` | hc-dark | `interactive.primary.on-inverse.text.hover` | 6.708 | 7 |
| `grid l0.5 c0.3 h180` | light | `interactive.primary.on-inverse.text.hover` | 4.249 | 4.5 |
| `grid l0.6 c0.25 h180` | hc-light | `interactive.primary.on-inverse.text.hover` | 6.636 | 7 |
| `grid l0.6 c0.3 h180` | hc-light | `interactive.primary.on-inverse.text.hover` | 6.636 | 7 |
| `grid l0.6 c0.3 h210` | hc-light | `interactive.primary.on-inverse.text.hover` | 6.534 | 7 |
| `grid l0.6 c0.3 h270` | dark | `interactive.primary.on-inverse.text.hover` | 4.293 | 4.5 |
| `grid l0.6 c0.3 h300` | dark | `interactive.primary.on-inverse.text.hover` | 4.288 | 4.5 |
| `grid l0.4 c0.25 h180` | hc-light | `interactive.primary.text.hover` | 6.714 | 7 |
| `grid l0.4 c0.25 h210` | hc-light | `interactive.primary.text.hover` | 6.991 | 7 |
| `grid l0.4 c0.3 h150` | hc-light | `interactive.primary.text.hover` | 6.952 | 7 |
| `grid l0.4 c0.3 h180` | hc-light | `interactive.primary.text.hover` | 6.287 | 7 |
| `grid l0.4 c0.3 h210` | hc-light | `interactive.primary.text.hover` | 6.708 | 7 |
| `grid l0.5 c0.25 h180` | light | `interactive.primary.text.hover` | 4.391 | 4.5 |
| `grid l0.5 c0.3 h180` | light | `interactive.primary.text.hover` | 4.136 | 4.5 |
| `grid l0.5 c0.3 h180` | dark | `interactive.primary.text.hover` | 4.249 | 4.5 |
| `grid l0.5 c0.3 h210` | light | `interactive.primary.text.hover` | 4.339 | 4.5 |
| `grid l0.55 c0.3 h30` | light | `interactive.primary.text.hover` | 4.463 | 4.5 |
| `grid l0.6 c0.25 h180` | hc-dark | `interactive.primary.text.hover` | 6.636 | 7 |
| `grid l0.6 c0.3 h180` | hc-dark | `interactive.primary.text.hover` | 6.636 | 7 |
| `grid l0.6 c0.3 h210` | hc-dark | `interactive.primary.text.hover` | 6.534 | 7 |
| `anchor l0.35 c0.25 h180` | hc-light | `text.link.hover` | 6.793 | 7 |
| `grid l0.35 c0.25 h180` | hc-light | `text.link.hover` | 6.806 | 7 |
| `grid l0.35 c0.3 h180` | hc-light | `text.link.hover` | 6.448 | 7 |
| `grid l0.35 c0.3 h210` | hc-light | `text.link.hover` | 6.960 | 7 |
| `grid l0.35 c0.3 h30` | hc-light | `text.link.hover` | 6.772 | 7 |
| `grid l0.45 c0.25 h180` | light | `text.link.hover` | 4.442 | 4.5 |
| `grid l0.45 c0.3 h180` | light | `text.link.hover` | 4.171 | 4.5 |
| `grid l0.45 c0.3 h210` | light | `text.link.hover` | 4.394 | 4.5 |
| `grid l0.65 c0.25 h180` | hc-dark | `text.link.hover` | 6.828 | 7 |
| `grid l0.65 c0.3 h180` | hc-dark | `text.link.hover` | 6.828 | 7 |
| `grid l0.65 c0.3 h210` | hc-dark | `text.link.hover` | 6.744 | 7 |
| `grid l0.9 c0.3 h30` | hc-dark | `text.link.hover` | 6.590 | 7 |

## The ten tightest passing contracts (global)

| brand | mode | role | ratio | floor | margin |
|---|---|---|---|---|---|
| `grid l0.5 c0.2 h210` | dark | `interactive.primary.on-fill` | 4.5002 | 4.5 | +0.0002 |
| `grid l0.5 c0.2 h210` | dark | `interactive.primary.on-inverse.text.rest` | 4.5002 | 4.5 | +0.0002 |
| `grid l0.5 c0.2 h210` | dark | `text.on-brand` | 4.5002 | 4.5 | +0.0002 |
| `grid l0.5 c0.2 h210` | dark | `icon.on-brand` | 4.5002 | 4.5 | +0.0002 |
| `grid l0.6 c0.2 h300` | hc-light | `interactive.primary.on-inverse.text.rest` | 7.0007 | 7 | +0.0007 |
| `grid l0.6 c0.2 h300` | hc-dark | `interactive.primary.text.rest` | 7.0007 | 7 | +0.0007 |
| `anchor l0.55 c0.25 h270` | light | `interactive.primary.on-inverse.text.rest` | 4.5008 | 4.5 | +0.0008 |
| `anchor l0.55 c0.25 h270` | dark | `interactive.primary.text.rest` | 4.5008 | 4.5 | +0.0008 |
| `anchor l0.55 c0.05 h60` | hc-light | `foreground.brand` | 7.0008 | 7 | +0.0008 |
| `anchor l0.55 c0.05 h60` | hc-light | `interactive.primary.fill.rest` | 7.0008 | 7 | +0.0008 |

## Corpus brands — ten tightest passing contracts each

| brand | mode | role | ratio | floor | margin |
|---|---|---|---|---|---|
| aurora | hc-light | `disabled.on-fill` | 4.530 | 4.5 | +0.030 |
| aurora | hc-light | `interactive.neutral.border` | 4.537 | 4.5 | +0.037 |
| aurora | hc-light | `field.border.rest` | 4.537 | 4.5 | +0.037 |
| aurora | hc-dark | `interactive.neutral.on-inverse.border` | 4.537 | 4.5 | +0.037 |
| aurora | hc-light | `foreground.success` | 7.041 | 7 | +0.041 |
| aurora | hc-light | `text.success` | 7.041 | 7 | +0.041 |
| aurora | dark | `disabled.on-fill` | 3.044 | 3 | +0.044 |
| aurora | dark | `interactive.neutral.on-inverse.border` | 3.046 | 3 | +0.046 |
| aurora | light | `text.on-info` | 4.559 | 4.5 | +0.059 |
| aurora | light | `icon.on-info` | 4.559 | 4.5 | +0.059 |
| harbor | hc-light | `disabled.on-fill` | 4.538 | 4.5 | +0.038 |
| harbor | dark | `disabled.on-fill` | 3.051 | 3 | +0.051 |
| harbor | dark | `text.danger` | 4.558 | 4.5 | +0.058 |
| harbor | dark | `icon.danger` | 4.558 | 4.5 | +0.058 |
| harbor | light | `text.on-info` | 4.559 | 4.5 | +0.059 |
| harbor | light | `icon.on-info` | 4.559 | 4.5 | +0.059 |
| harbor | hc-light | `border.info` | 4.559 | 4.5 | +0.059 |
| harbor | hc-dark | `border.warning` | 4.562 | 4.5 | +0.062 |
| harbor | hc-dark | `border.success` | 4.564 | 4.5 | +0.064 |
| harbor | light | `interactive.destructive.on-fill` | 4.568 | 4.5 | +0.068 |
| wendys | light | `text.success` | 4.537 | 4.5 | +0.037 |
| wendys | light | `icon.success` | 4.537 | 4.5 | +0.037 |
| wendys | dark | `disabled.on-fill` | 3.043 | 3 | +0.043 |
| wendys | dark | `foreground.brand` | 3.045 | 3 | +0.045 |
| wendys | dark | `interactive.primary.fill.rest` | 3.045 | 3 | +0.045 |
| wendys | light | `field.placeholder` | 4.545 | 4.5 | +0.045 |
| wendys | light | `text.secondary` | 4.545 | 4.5 | +0.045 |
| wendys | light | `icon.secondary` | 4.545 | 4.5 | +0.045 |
| wendys | hc-light | `disabled.text` | 4.545 | 4.5 | +0.045 |
| wendys | hc-light | `disabled.icon` | 4.545 | 4.5 | +0.045 |
| nb | light | `text.on-warning` | 4.501 | 4.5 | +0.001 |
| nb | light | `icon.on-warning` | 4.501 | 4.5 | +0.001 |
| nb | hc-light | `border.warning` | 4.501 | 4.5 | +0.001 |
| nb | hc-light | `disabled.on-fill` | 4.506 | 4.5 | +0.006 |
| nb | light | `field.placeholder` | 4.520 | 4.5 | +0.020 |
| nb | light | `text.secondary` | 4.520 | 4.5 | +0.020 |
| nb | light | `icon.secondary` | 4.520 | 4.5 | +0.020 |
| nb | hc-light | `disabled.text` | 4.520 | 4.5 | +0.020 |
| nb | hc-light | `disabled.icon` | 4.520 | 4.5 | +0.020 |
| nb | hc-light | `text.tertiary` | 4.520 | 4.5 | +0.020 |
