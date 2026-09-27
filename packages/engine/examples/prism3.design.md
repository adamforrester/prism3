---
# Prism3 — the CANONICAL DEFAULT THEME (#1296). Frontmatter compiles 1:1 to BrandInput (docs/07 §6).
# This file is the SINGLE SOURCE OF TRUTH for the prism3 example: emit-dtcg.ts reads it, so
# out/prism3.tokens.json is generated from it. It is the theme the studio and the plugin open with.
# Every lever below is stated rather than defaulted, so the default theme reads as a set of decisions
# a designer can see and change, not as whatever the engine happened to fall back to.
id: prism3

# ROOT NAMESPACE — `pds3`, "Prism3 Design System". This is the brand the #1283 reservation was held
# for: `test.ts` admits it by name as the one shipped brand at a reserved root. `prism` stays the
# engine's fallback for an undeclared root and is not used here.
root: pds3

# Hero brand: Prism 2's bright blue, #1E1EFF (`reference/Prism2` nbds.pds.color.brand.primary.650,
# rgb(30, 30, 255)), measured to OKLCH at four decimals. This round-trips to #1e1eff exactly.
primary: { l: 0.4709, c: 0.3001, h: 266.75 }

# Cool neutrals tinted a little toward the blue, at a low chroma, so the grays read as one system
# with the brand without turning lavender.
neutral: { hue: 266.75, chroma: 0.005 }

# action = primary (the default, no actionPalette): the bright blue IS the interactive color, as it is
# on Prism 2's checkbox, radio and toggle.
#
# One extra brand color: a violet ACCENT, #7A3CFF, measured to OKLCH the same way as the primary
# (l 0.557316, c 0.263468, h 289.323). Chroma rounds DOWN to 0.2634: 0.2635 sits past the sRGB
# boundary and would ship clamped. The stated value round-trips to #7a3cff exactly. It is a brand
# color, not the action color: it carries the gradients below, and the blue keeps every control.
brandColors:
  - name: accent
    oklch: { l: 0.5573, c: 0.2634, h: 289.32 }

# Pure white page: the clean product-tool starting point.
surfaces:
  light: { base: white }

# Status colors, chosen as a set to sit beside the blue and the violet rather than left to the engine
# defaults. Each seeds its own accessible ramp from hue + chroma (the engine places the lightness), so
# `l` is not pinned. Success is a cool emerald and info a cyan-leaning sky, 37° off the primary, so info
# never reads as the brand blue. Warning is an amber and danger a clean red, both kept clear of the violet.
status:
  success: { l: 0.55, c: 0.15, h: 155, chroma: 0.15 }
  warning: { l: 0.55, c: 0.16, h: 70, chroma: 0.16 }
  danger: { l: 0.55, c: 0.19, h: 25, chroma: 0.19 }
  info: { l: 0.55, c: 0.13, h: 230, chroma: 0.13 }

# Default geometry and density, stated: comfortable (a 44px medium control) and the default corner.
density: comfortable
radiusScale: 1

# Icons keep text parity (4.5:1), the stricter of the two options.
iconContrast: text

# Standard tempo: neither snappy (aurora) nor relaxed (harbor).
motionPersonality: { tempo: standard }

# Shadows tinted toward the primary hue, stronger than the engine's default 0.15 so the tint reads as
# the blue, and still at the default softness, so the shadows stay crisp.
shadow: { tint: { hue: 266.75, amount: 0.35 } }

# ── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────
# Display and title on Playfair Display, everything else on Inter, code on JetBrains Mono. All three
# are Google fonts.
#
# ITALIC IS THE DEFAULT HEADING CUT, set with the italics lever family (#1296): `italicDefault` makes
# display and title italic by default. Their styles keep their ordinary names (`type.title.lg.emphasis`),
# emit `fontStyle: italic`, and take the weight's italic Figma style. No upright heading ships.
#
# Weights. `emphasis` is 500, so display and title emphasis set in Playfair Display Medium Italic.
# `strong` is 600, and both heading categories ship it beside emphasis (SemiBold Italic) for the
# heavier heading. Display ships it too because the preview spec binds `type.display.lg.strong` and
# `type.title.*.strong` by name, and the theme a studio opens with should emit every name its own
# preview reads. Body and caption keep their default `strong`, so Inter sets 600 as Semi Bold. The same
# weight role therefore lands on two spellings of one weight in one file: Playfair spells 600
# "SemiBold", Inter spells it "Semi Bold" — the plugin writes each family's own spelling.
# Label and eyebrow ship `emphasis`, so their Inter text sets at 500 (Medium).
#
# The two italic methods, side by side. Headings use `italicDefault`: italic IS their cut. Body uses
# `italics`: it stays upright and gains paired `-italic` variants (`type.body.md.default-italic`) for
# emphasis in running copy. A category may be in only one of the two, and body is not a heading.
typography:
  families: { display: Playfair Display, title: Playfair Display, body: Inter, label: Inter, caption: Inter, eyebrow: Inter, code: JetBrains Mono }
  weights: { display: [emphasis, strong], title: [emphasis, strong] }
  weightRoles: { emphasis: 500, strong: 600 }
  italicDefault: [display, title]
  italics: [body]
  responsive: { fluid: true }

# Gradients: a linear brand sweep from the blue to the violet, and a radial glow from the violet out
# into the deep blue. Every stop names a palette step, so both follow any change to either color.
gradients:
  - name: brand
    kind: linear
    angle: 135
    stops:
      - { palette: primary, step: 600, position: 0 }
      - { palette: accent, step: 500, position: 1 }
  - name: glow
    kind: radial
    center: [0.5, 0.4]
    shape: circle
    stops:
      - { palette: accent, step: 400, position: 0 }
      - { palette: primary, step: 700, position: 1 }
---

# Prism3 — the default theme

Clean, precise, confident. Prism3 is a product tool, so the working UI stays quiet: white pages, cool
near-neutral grays, comfortable controls, default corners and shadows with a trace of the blue in them.
Two things carry the identity. The bright Prism 2 blue is the one interactive color: buttons, links,
selection and focus all run on it. And every heading is set in Playfair Display italic, Medium for most
headings and SemiBold for the heaviest, against an Inter UI whose body copy has its own italics for
emphasis.

The violet is for brand moments, not controls: it meets the blue in the two gradients, a linear sweep
and a radial glow.

This is the theme the studio opens with, so every lever is stated rather than left to a default. Change
any of them and the rest of the system re-derives and re-checks its contrast.

*(Prose is authoring latitude — the MVP CLI consumes the frontmatter only.)*
