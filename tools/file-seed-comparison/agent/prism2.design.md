---
id: file-b
# primary: Brand Theme (default mode light) roles pds/color/action/primary/{surface,border,text,icon}/rest,
# surface/brand/primary, text/brand/primary and border/brand/primary all alias pds/color/brand/primary/650 = #1e1eff.
primary: { l: 0.4709, c: 0.3001, h: 266.7463 }
# accent: roles named brand/secondary (surface, text, icon, border) alias pds/color/brand/secondary/650 = #6502e6,
# a second brand hue (violet, h~289 vs the primary's ~267). The action/accent/* roles use the same ramp (rest at 750),
# but the main action roles point at brand/primary, so actionPalette is left unset (action follows primary).
brandColors:
  - name: accent
    oklch: { l: 0.4763, c: 0.2705, h: 288.8816 }
# neutral: text/primary, text/secondary, icon/*, border/{primary,secondary,tertiary,input} and action/neutral/* all alias
# the pds/color/neutral-cool ramp (hue ~271-273, chroma ~0.013-0.029). Pinned at text/secondary/default =
# neutral-cool/550 #656a7a. (Some surfaces use the pure-gray pds/color/neutral ramp: background/secondary #f8f8f8.)
neutral: { hue: 271.7462, chroma: 0.0259, anchor: { l: 0.5257, c: 0.0259, h: 271.7462 } }
# typography.families: pds/font/family/display and /title -> Poppins; /body and /detail (captions, fine print) -> Inter.
# No label or code family role exists; label takes the body family. Roboto is a primitive no role aliases, so unused.
typography:
  families:
    display: Poppins
    title: Poppins
    body: Inter
    label: Inter
    caption: Inter
# density: pds/size/component/height-md = 44 (sm 36, lg 56) -> comfortable.
density: comfortable
# radiusScale: pds/border/radius/button = 4px (radius/sm = 4, md = 8) -> 4 / 4 = 1.
radiusScale: 1
# gradients: the file defines one brand gradient, pds/color/gradient/brand/primary: linear, angle 90,
# stops brand/primary/600 (#283fff) at 0 -> brand/primary/350 (#729bfe) at 1. Same stops as the engine default,
# written out to keep the file's 90-degree angle (the default is 135).
gradients:
  - name: brand
    kind: linear
    angle: 90
    stops:
      - { palette: primary, step: 600, position: 0 }
      - { palette: primary, step: 350, position: 1 }
---

# file-b

A blue-hero product system: an electric blue primary (#1e1eff) drives every main action and the brand
roles, with a violet secondary (#6502e6) carried as an accent ramp for a separate "accent" action variant
and secondary brand marks. Grays are cool (blue-violet cast), Poppins sets display and titles, Inter sets
everything else, controls sit at a 44px medium height with small 4px button corners.

**Picks the report left open (reviewer: check these):**

- **Neutral split.** The file ships three gray ramps. Text, icons, borders and neutral actions use the
  cool ramp, which the seed pins; but `background/secondary`, `surface/primary` and `surface/neutral/*`
  use a pure (chroma 0) gray. The engine derives one neutral ramp, so those surfaces will pick up the
  cool cast. The third ramp (`neutral-coolest`, a strongly blue gray) is not aliased by any role read here.
- **Accent anchor step.** The brand-named secondary roles use step 650 (#6502e6), the accent action rest
  uses 750 (#4a03aa). The seed pins 650; whether the accent action should rest darker is open.
- **Status colors.** The file has its own feedback ramps (strawberry #d80000 / #c10000, lime #157c0f,
  pumpkin #b95d0e, blueberry #1656ce). They are not pinned; the engine synthesizes status hues. Pin
  `status` if the brand's exact reds/greens matter.
- **Field corners and label family.** No field-specific radius or label/code family role exists; field
  corners follow `radiusScale`, labels take Inter, code takes the engine default.
- **Modes.** The file's modes are light, dark and wireframe; the wireframe mode has no Prism3 counterpart.
  Motion durations (normal 200ms) and type sizes were not translated into levers (defaults kept).
- **Gradient stop mapping.** The engine pins the primary at its step 600, while the file's ramp has it at
  650; the gradient keeps the file's step names (600 -> 350), so its first stop lands on the hero itself
  rather than the file's slightly lighter #283fff.
- **Usage.** The report carries no layer usage (0 pages scanned), so every pick comes from variable names
  and alias chains, not from what the canvas actually paints.
