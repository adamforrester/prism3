---
id: file-d
# Every variable in the report is named ads/... (736 variables, 15 local collections), so the brand keeps the `ads` namespace.
root: ads
# core/palette/primary/550 #5e4bc3, described "Brand (primary) 550 — the brand color, exact"; color/foreground/brand, text/brand and icon/brand (light) alias it.
primary: { l: 0.5008, c: 0.1794, h: 285.1394 }
# A second brand ramp, core/palette/accent ("Brand (accent)"), hue ~235–242. Pinned at accent/500 #007cbb, the step interactive/primary/fill/rest and fill/focused alias in light mode.
brandColors:
  - name: accent
    oklch: { l: 0.5614, c: 0.1326, h: 241.7355 }
# Every color/interactive/primary/* role (fill, border, text, icon, indicator) and every text/link/* role aliases core/palette/accent, not primary.
actionPalette: accent
# The neutral ramp (neutral/025–950) measures hue ~275–286 at peak chroma ~0.008 (neutral/550 #68686d: 0.0078 @ 286; neutral/600 #5c5c61: 0.0079 @ 286); it tracks the primary hue.
neutral: { hue: 285, chroma: 0.008 }
# core/font/family/*: display, title and eyebrow are "Clash Display"; body, label and caption are "Inter"; code is "JetBrains Mono". The 51 text styles agree (title 7, display 4, eyebrow 3 in Clash Display; body 16, label 12, caption 8 in Inter; code 1 in JetBrains Mono).
# core/font/weight-role/emphasis -> 500 (the other roles read 300/400/700/900); label/emphasis and eyebrow/emphasis font styles are "Medium".
typography:
  families:
    display: Clash Display
    title: Clash Display
    eyebrow: Clash Display
    body: Inter
    label: Inter
    caption: Inter
    code: JetBrains Mono
  weightRoles: { emphasis: 500 }
# color/icon/secondary aliases neutral/450 while text/secondary aliases neutral/550, and icon/danger|success|warning|info alias the 500 steps while their text roles alias 600: icons run a step lighter than text.
iconContrast: "3:1"
# size/md/height = 44px (size/sm 36, size/lg 56; size/md/min-height 44).
density: comfortable
# No button or field corner variable exists; the radius collection reads sm 4 · md 8 · lg 12 · xl 16 · 2xl 24 · 3xl 32, so md 8px / 4px = 2.
radiusScale: round
# motion/duration/* reads 40 · 80 · 160 · 240 · 400 · 640ms (instant to slower), 0.8x a 50/100/200/300/500/800 ramp.
motionPersonality: { tempo: snappy }
# breakpoint/xs 0 · sm 480 · md 768 · lg 1024 · xl 1440 · 2xl 1920 (six modes in the layout collection); container/max 1280.
layout:
  breakpoints: [0, 480, 768, 1024, 1440, 1920]
  containerMax: 1280
---

# file-d

A violet brand (`#5e4bc3`) whose interactive UI runs on a separate blue accent: buttons,
links and the focus ring all draw from the accent ramp, while the violet carries brand
text, icons and borders. The page is pure white, with a near-neutral gray cast faintly
toward the violet. Headings set in Clash Display over an Inter body. Controls sit at the
44px comfortable height with soft 8px corners and quick motion.

What the report left open, for a reviewer to check:

- **Accent anchor.** The accent ramp shows no "exact" step. I pinned `accent/500`
  (`#007cbb`) because the action fill rests on it, and it ships exactly. The file's other
  accent steps sit near hue 235 with more chroma in the tints (for example 450 is `#0088be`
  and this build gives `#3488c0`), so the original accent was likely a more saturated,
  out-of-gamut blue that was clamped to `#007cbb`. The interactive and link rest steps
  match by step but differ by a few hex units. Confirm the brand's real accent value.
- **Radius.** No control-corner variable exists, and the file has no layers (coverage
  0), so `radiusScale` comes from the `radius` ladder (md 8px), not from a button or field.
- **Density.** This comes from `size/md/height` alone. No instances were scanned to
  confirm what the file's controls use.
- **Status hues.** Success, warning, info and danger ramps exist, but nothing names them
  as brand-specified, so they are left to the engine. The compiled roles match the file.
- **Primary ramp.** It reproduces the file within 1 hex unit on four steps (450, 600, 650,
  750), from rounding the anchor to 4 decimals.
- Not carried over: `interactive/primary/subtle-fill/selected` aliases the opaque
  `fill/rest` in the file, but this build emits a translucent fill. No brief lever sets this.
