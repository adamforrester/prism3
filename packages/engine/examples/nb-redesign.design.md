---
# New Balance — REDESIGN SEED BRIEF (frontmatter compiles 1:1 to BrandInput; see docs/07 §6).
#
# ⚠️ THIS IS A STARTING POINT, NOT THE FINISHED THEME. It captures the New Balance
# redesign as a first-pass BrandInput that the owner imports into the plugin and then
# FINISHES BY HAND (1px hairline corners, and any manual tuning the engine's levers
# can't yet express). Once NB is finished manually, THIS committed
# file is updated to the finished version. Until then, treat it as the authoritative
# SEED — enough to compile cleanly and stand up a plausible NB — not the authoritative
# final brand. It is HELD for the owner's review, never auto-merged.
#
# Every value below carries a short comment saying where it came from (measured anchor,
# brand spec, or engine default left in place). Line heights use the engine's prism defaults
# per the owner's decision — no NB-specific override in this seed.
id: nb-redesign
# The display name (#2859, #2915), which the library file's cover shows. Unset, it would show the id made readable.
name: New Balance

# ROOT NAMESPACE (#1283) — this is a redesign OF New Balance, so it emits under NB's own
# `nbds.*` namespace, the same <brand>ds convention the hand-built `nb` theme already uses.
# Declared rather than defaulted (`prism`/`pds3` are reserved for a future canonical default).
root: nbds

# Light only — the redesign ships a single light appearance for now (owner scope).
modes: [light]

# ── COLOR ───────────────────────────────────────────────────────────────────────────
# Hero brand red — PANTONE 186 C / #CF0A2C, measured to OKLCH. This is NB's flame red.
primary: { l: 0.5418, c: 0.2151, h: 23.0 }

# Neutral ramp PINNED to NB's near-black #151415 (a barely-warm off-black, hue ~325.7,
# almost no chroma). The `anchor` is the exact grey pinned verbatim at its lightness step;
# hue/chroma are the derived readout of that same anchor. Verbatim from the brand spec.
neutral: { hue: 325.7, chroma: 0.0025, anchor: { l: 0.1928, c: 0.0025, h: 325.7 } }

# ACTIONS ARE BLACK, NOT RED (brand decision). The interactive/action color is DECOUPLED
# from the hero red onto the neutral palette, and pinned at step 900 so the button fill
# lands on #151415 (the near-black anchor above). The engine FLAGS a decoupled action in
# notes so it stays a confirmed choice.
actionPalette: neutral
actionAnchorStep: 900

# Strong neutral interactive emphasis — a bold near-black neutral fill (matches "actions
# are black"), not the light-grey default. Brand decision.
neutralEmphasis: strong

# The brand red carries DANGER/ERROR — re-base the `danger` role onto the primary palette
# rather than letting the engine carve a separate red (docs/21). NB's red IS its error red.
# (Hue matches, so no mismatch flag; the engine still re-derives + re-gates danger on the ramp.)
roleColors: { danger: primary }

# Dialogs sit on WHITE, not on the card surface (#3049, owner Q3049.4): the brand's own designs draw the end drawer
# and the full-screen panel as #FFFFFF over the scrim. Light only, as this seed is; a dark mode would keep the card.
raisedSurface: white

# The backdrop behind a dialog is the STRONG scrim (#3050, owner Q825 B): the brand's own designs put a heavy black
# backdrop behind the end drawer and the full-screen panel. 80% in light, the nearest existing alpha step.
scrimStrength: strong

# Card glass (#3073, owner Q807 A, 70% per the owner's correction of 2026-10-27): a glass band set on a card takes the
# card ground's color (`foreground.primary`'s palette color) at 70%, so it reads as the card and only the blurred photo
# shows through. `color.glass.surface`, the white glass, is unchanged.
glassRoles: { card: { role: foreground.primary, alpha: 70 } }

# Outline and text hover (#3071, owner Q824 A): an opaque light gray, `neutral.050` on hover and the next step,
# `neutral.100`, on press. Not 025, which is the card ground: on a card the hover would disappear. The inverse band
# takes the default rule. Tags, segmented controls and pagination keep the neutral wash.
outlineInteraction: opaque-fill
outlineHoverFill: { light: { hover: neutral.050 } }

# The checked radio's dot is 70% of the radio, not half (#3086, owner Q816 A): 14px at medium, as the brand's master
# draws it. Snapped to the 2px sub-grid at every size, so small is 12 and large 16. 14 is off the dimension grid, so
# medium's dot is a plain 14px rather than a link to a dimension step; no token is added.
radioDot: 70

# Secondary text is fitted on the PAGE, not the floor (#3219, owner Q3212.4 A; the mechanism is Q-TXT1 A): the
# redesign's designs run secondary copy and placeholders lighter, so `text.secondary` is the lightest neutral step
# that clears 4.5:1 on `background.primary` (white). It no longer clears 4.5:1 on `background.secondary` or the card.
# Light only, as this seed is, so the high-contrast carve-out (Q3212.3 B) has nothing to act on here.
secondaryTextGround: page

# ── GEOMETRY ─────────────────────────────────────────────────────────────────────────
# Sharp corners — radius scale 0 collapses the soft rungs (only the pill survives).
radiusScale: 0
# Rounded (not pill) control shape — the pill-able controls stay rectangular-with-radius.
controlShape: rounded
#
# NB uses 1px corners in places. The engine's scaled radius ramp rides an even 2px sub-grid,
# so 1px is UNREACHABLE from radiusScale/baseMd — the opt-in `radiusHairline: true` lever
# (merged #1362) adds a fixed, unscaled `radius.hairline` = 1px sentinel and is the intended
# path to that near-sharp 1px corner. It is DELIBERATELY LEFT OFF in this seed: the 1px
# corners are part of the owner's manual finishing pass. Flag for the owner: flip
# `radiusHairline: true` here if the finished NB wants the 1px rung engine-side.

# ── LAYOUT ───────────────────────────────────────────────────────────────────────────
# The brand's md grid margin is 44px (brand spec, #3052). The 41px figure is the brand's
# desktop spec in its own two-mode layout, where md carries the 24-column, 16px-gutter grid:
# (1440 − 2×44 − 23×16) / 24 = 41px whole-pixel columns. It is not a property of the
# engine's 5-breakpoint grid, where md is 8 columns and a 44 margin gives 71px columns at
# 768 (#3070). 44 is no spacing step, so `grid/margin` md links to `core/dimension/44`
# (Q785 A). sm keeps the engine's 16.
layout: { marginOverrides: { md: 44 } }

# ── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────
typography:
  # Families per CATEGORY (#415). Display/title on ITC Garamond Std (NB's editorial serif);
  # body/label/caption/eyebrow on Suisse Int'l (NB's workhorse grotesque). A lone name is
  # auto-padded with a system fallback stack. From the brand type spec.
  families: { display: ITC Garamond Std, title: ITC Garamond Std, body: "Suisse Int'l", label: "Suisse Int'l", caption: "Suisse Int'l", eyebrow: "Suisse Int'l" }
  # Sizes, in line with the brand's stored typography (#3077): display 64/72/80/96/128 up to
  # 2xl; title 24/32/36/40/48/56, each one ladder step smaller on mobile; caption xs 8 (sizeFloor 8).
  # title.2xs is 20px (16px titleFloor adds the rung; owner request), 18px on mobile (Q802 A).
  # caption.md is 10px (caption A, owner decision 2026-10-27): a brand-level size, the same in every mode.
  displayCeiling: 2xl
  titleFloor: 16
  sizeFloor: 8
  sizes:
    display: { sm: 64, md: 72 }
    title: { 2xs: 20, xs: 24, sm: 32, md: 36, lg: 40, xl: 48, 2xl: 56 }
    caption: { md: 10 }
  sizeOverrides:
    title: { 2xs: { mobile: 18 }, sm: { mobile: 24 }, md: { mobile: 28 }, lg: { mobile: 32 }, xl: { mobile: 36 }, 2xl: { mobile: 40 } }
  # Letter spacing (#3077, tracking A; Q803 B): display, title, body, caption and label are pinned to
  # `open` (+1%) at every size; eyebrow keeps its nudge, one step in from `wider`, so `wide` (+2%).
  tracking: { display: open, title: open, body: open, caption: open, label: open }
  trackingShift: { eyebrow: -1 }
  # Per-role weight sets. Display/title run on the LIGHT (`subtle`, 300) Garamond cut; body,
  # caption and label ship default + emphasis. From the brand's stored typography (Q821 A).
  weights: { display: [subtle], title: [subtle], body: [default, emphasis], caption: [default, emphasis], label: [default, emphasis] }
  # NB's Medium is 500, not the engine's default 600 — remap the `emphasis` weight-role numeric.
  weightRoles: { emphasis: 500 }
  # CONDENSED FACE (#1368) — NB's display/title headings are set in ITC Garamond Std *Light
  # Condensed* (PostScript `ITCGaramondStd-LtCond`), a WIDTH cut the numeric weight axis can't
  # reach. A verbatim FACE PIN binds the exact Figma face for the `subtle` (Light) slot each
  # category ships, OVERRIDING the numeric-weight → style derivation. `family` is the SAME face
  # the category already binds ("ITC Garamond Std"); only the STYLE ("Light Condensed") differs.
  # The numeric weight the slot binds stays 300, so the CSS weight remains truthful. This closes
  # the "set condensed by hand in the plugin" gap for these two slots.
  faces:
    display: { subtle: { family: ITC Garamond Std, style: Light Condensed } }
    title: { subtle: { family: ITC Garamond Std, style: Light Condensed } }
  # Leading from the brand's stored typography (owner decision Q821 A, 2026-10-27, replacing the
  # earlier prism-default decision): the compact rung at 1.25 and snug at 1.20, and display, title
  # and body one rung more open than their size-derived leading.
  lineHeights: { compact: 1.25, snug: 1.2 }
  leadingShift: { display: 1, title: 1, body: 1 }
  # Fluid heading sizes on, clamped between the 375 and 1440 viewports (the stored input's).
  responsive: { fluid: true, minViewport: 375, maxViewport: 1440 }
  # Link underline (#2942): 5% of the font size thick, 25% below the baseline, on every -link style.
  underline: { thickness: 0.05, offset: 0.25 }
---

# New Balance — redesign seed brief

**This is a STARTING POINT the owner finishes by hand, not the final NB theme.** It compiles
cleanly and stands up a plausible New Balance: flame-red hero (PANTONE 186 C), a near-black
neutral pinned to #151415, black (not red) actions, sharp corners, and an ITC Garamond /
Suisse Int'l type pairing. Import it into the plugin, finish NB manually, then update this
committed file to the finished version.

New Balance reads as confident and editorial: the red is the flame, used as accent and for
danger/error, while the working UI runs on near-black — buttons are black, not red. Corners
are sharp. Headlines are set in a light, condensed Garamond; the running UI is a clean Suisse
grotesque.

## Owner finishing checklist (what this seed deliberately leaves for the manual pass)

1. **Heading leading.** Now the stored leading from the finished file (`lineHeights`,
   `leadingShift`; owner decision Q821 A), replacing the earlier prism-default decision.
2. **1px hairline corners.** NB uses 1px corners in places. The engine reaches 1px only via
   the opt-in `radiusHairline: true` lever (#1362), left OFF here on purpose. Flip it on if
   the finished NB wants the 1px rung engine-side.
3. **Condensed display face — now bound (#1368).** The display/title condensed cut
   (`ITCGaramondStd-LtCond`) is pinned engine-side via a verbatim FACE PIN on the `subtle`
   slot each category ships (`typography.faces`), so headings emit ITC Garamond Std *Light
   Condensed* directly — no longer a manual plugin step. (A brand needing a fuller condensed
   weight ramp would pin more slots; NB ships the single Light cut.)

*(Prose is authoring latitude — the MVP CLI consumes the frontmatter only.)*
