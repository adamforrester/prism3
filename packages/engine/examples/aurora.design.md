---
# Aurora — brand brief (frontmatter compiles 1:1 to BrandInput; see docs/07 §6).
# This file is the SINGLE SOURCE OF TRUTH for the aurora example: emit-dtcg.ts
# reads it, so out/aurora.tokens.json is generated from it. The frontmatter
# deliberately exercises the complementary corner of the input space to Harbor —
# an accent-decoupled action, a tinted page, soft/compact form factor, a variable
# display face, softer shadows, and both gradient kinds.
id: aurora

# Hero brand: an indigo/violet anchor (deliberately NOT red).
primary: { l: 0.5, c: 0.18, h: 285 }
neutral: { hue: 285, chroma: 0.008 }

# Extra brand colours (open-ended set) + action DECOUPLED from the hero: aurora's
# violet is its identity, but interactive UI uses the azure accent.
brandColors:
  - name: accent
    oklch: { l: 0.55, c: 0.15, h: 235 }
actionPalette: accent

# Primary light surface is PURE WHITE — the most common real-world starting point, and what the
# example a new user opens first should look like (aurora is the boot default). The contrast floor
# follows the base surface down to neutral.050, so actions are validated there.
#
# Harbor deliberately keeps `base: 50`, so the TINTED-surface path (floor at neutral.100, a warm
# off-white canvas that is that brand's actual identity) is still covered by the corpus. Both need to
# exist: white-page and tinted-page brands gate their roles against different floors, and a corpus
# where every member starts white would stop proving the tinted case resolves.
surfaces:
  light: { base: white }

# Soft corners (radius scale 2) + compact density — exercise the dimension levers.
radiusScale: 2
density: compact

# Icons use the WCAG 1.4.11 non-text floor (3:1), so secondary/semantic icons run
# lighter than the matching text.
iconContrast: "3:1"

# A snappy tempo compresses the duration ramp vs NB's standard.
motionPersonality: { tempo: snappy }

# A distinct variable display face on the heading categories, a remapped emphasis weight (500, not
# the default 600), the expressive type scale, a hero cap at the display.xl rung, a 16px brand-font
# title (overlaps body.md), labels on the workhorse face, and a wider clamp window.
# Families are stated per CATEGORY (#415): there is no display/text/mono role tier to route through,
# so a brand names the face each category draws from directly — the same way Prism2's brand-theme
# binds font/family/{display,title,body,detail}.
typography:
  families: { display: Clash Display, title: Clash Display, eyebrow: Clash Display, body: Inter, caption: Inter, label: Inter, code: JetBrains Mono, variable: { display: true, title: true, eyebrow: true, body: true, caption: true, label: true } }
  weightRoles: { subtle: 300, default: 400, emphasis: 500, strong: 700 }
  typeScale: expressive
  displayCeiling: xl
  titleFloor: 16
  responsive: { fluid: true, minViewport: 360, maxViewport: 1440 }

# Softer (marketing) shadows, tinted toward the violet brand hue.
shadow: { softness: 1.3, tint: { hue: 285, amount: 0.5 } }

# A 6th small-phone breakpoint (480) + a tighter content cap.
layout: { breakpoints: [0, 480, 768, 1024, 1440, 1920], containerMax: 1280 }

# Opt-in gradients: a cross-palette linear brand gradient (violet → azure accent)
# + a radial accent glow — both OKLCH-interpolated.
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
      - { palette: accent, step: 700, position: 1 }
---

# Aurora — brand brief

Energetic, premium, confident. Hero moments should feel expansive and cinematic;
the working UI should feel calm and precise. The violet is the identity — reserve
it for brand-level surfaces and hero gradients, not for every button. Interactive
UI runs on the azure **accent**, which is why `action` is decoupled from the hero
palette above.

The page is a soft, tinted off-white rather than a stark white — the product
should feel considered, not clinical. Corners are generous and the UI is dense:
this is a tool people live in, so more fits on screen without feeling cramped.
Motion is quick and responsive (snappy), never showy in the working surfaces;
save expression for the hero moments.

*(This prose is latitude an agent reads to make the judgment calls the frontmatter
can't encode — "energetic" → snappy tempo; "premium restraint" → tighter tracking
and a reserved hero colour. The MVP CLI consumes the frontmatter only; the prose
is authoring intent, not yet parsed.)*
