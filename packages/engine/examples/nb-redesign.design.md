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

# ── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────
typography:
  # Families per CATEGORY (#415). Display/title on ITC Garamond Std (NB's editorial serif);
  # body/label/caption/eyebrow on Suisse Int'l (NB's workhorse grotesque). A lone name is
  # auto-padded with a system fallback stack. From the brand type spec.
  families: { display: ITC Garamond Std, title: ITC Garamond Std, body: "Suisse Int'l", label: "Suisse Int'l", caption: "Suisse Int'l", eyebrow: "Suisse Int'l" }
  # Pinned sizes from the NB redesign spec: title tops out at 36 (xl), display hero at 56 (md).
  sizes: { title: { xl: 36 }, display: { md: 56 } }
  # Per-role weight sets. Display/title run on the LIGHT (`subtle`, 300) Garamond cut; body and
  # caption ship default + emphasis. From the brand type spec.
  weights: { display: [subtle], title: [subtle], body: [default, emphasis], caption: [default, emphasis] }
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
  # Line heights: PRISM DEFAULTS (owner decision 2026-09-09 — "stay with prism line heights").
  # The pasted source truncated this line; rather than reconstruct an NB-specific ramp, this seed
  # OMITS `lineHeights` entirely so the engine's curated default leading applies. Adjust in the
  # plugin during the manual pass if the finished NB needs a bespoke heading leading.
  # Fluid heading sizes on, clamped between NB's mobile (402) and desktop (1440) viewports.
  responsive: { fluid: true, minViewport: 402, maxViewport: 1440 }
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

1. **Heading leading.** Uses the engine's default (prism) line heights — owner decision, no
   NB-specific override. Set a bespoke heading leading in the plugin if the finished NB wants one.
2. **1px hairline corners.** NB uses 1px corners in places. The engine reaches 1px only via
   the opt-in `radiusHairline: true` lever (#1362), left OFF here on purpose. Flip it on if
   the finished NB wants the 1px rung engine-side.
3. **Condensed display face — now bound (#1368).** The display/title condensed cut
   (`ITCGaramondStd-LtCond`) is pinned engine-side via a verbatim FACE PIN on the `subtle`
   slot each category ships (`typography.faces`), so headings emit ITC Garamond Std *Light
   Condensed* directly — no longer a manual plugin step. (A brand needing a fuller condensed
   weight ramp would pin more slots; NB ships the single Light cut.)

*(Prose is authoring latitude — the MVP CLI consumes the frontmatter only.)*
