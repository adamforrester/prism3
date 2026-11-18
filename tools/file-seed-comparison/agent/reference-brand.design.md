---
id: file-a
# Primary: red #cf0a2c (core red/550), the only chromatic hue on a non-status brand role: text/promo/default,
# plus focus/ring/color/default, every */focused border and link/focused. It is also feedback negative/bold,
# but no other chromatic hue carries a brand role. No role is named brand/primary/action with a chromatic value.
primary: { l: 0.5418, c: 0.2151, h: 22.9649 }
# Accent: amber #9a3902 (core amber/600), the target of text/accent/default (inverse: amber/300).
# The same step is also feedback text/icon warning/default, so this accent doubles as the warning hue.
brandColors:
  - name: accent
    oklch: { l: 0.4756, c: 0.1411, h: 42.4633 }
# Action: every action role resolves to near-black neutral/950 (#151415): button/foreground/primary/default,
# button/border/primary/default, interactive/text/default, link/default, text/link/default. None points at red,
# so actions run on the neutral ramp, not the primary.
actionPalette: neutral
# Neutral: core neutral/* ramp is a cool gray, OKLCH hue 237-253 across 300-700 (neutral/500 #737b82 = h 244.4,
# peak chroma 0.0144); the ends (050, 950) are near-achromatic, matching a tapered cast.
neutral: { hue: 244, chroma: 0.014 }
# Families: font/family/display and font/family/heading alias ITC Garamond Std; font/family/body and
# font/family/label alias Proxima Nova. Caption has no variable, so it takes the body family. No code/mono family.
typography:
  families:
    display: ITC Garamond Std
    title: ITC Garamond Std
    body: Proxima Nova
    label: Proxima Nova
    caption: Proxima Nova
# Density: size/component/height-md = 40px, exactly between compact (36) and comfortable (44); the ladder
# 24/32/40/48/56 gives no tiebreak, so this keeps the default.
density: comfortable
# Radius: radius/md = 4px (sm 2, lg 6, round 128); 4 / 4 = 1. No button- or field-specific corner variable exists.
radiusScale: 1
---

# file-a

A restrained, editorial system: a serif display and heading face (ITC Garamond Std, light and book condensed
weights) over a humanist sans for body and labels (Proxima Nova), a cool gray neutral ramp, and near-black
actions. The brand red appears only as an accent signal (promo text and the focus ring), so it is pinned as the
primary anchor while interactive UI is decoupled onto the neutral palette.

**Picks the report left open — check these:**

- **Primary.** No role named brand, primary or action holds a chromatic color; the red was chosen because it is the
  only chromatic hue on a non-status role (promo text) and the focus ring. It is also the danger color, so the
  engine's synthesized danger may sit close to it. If the brand's hero is the near-black, the primary pick is wrong.
- **Accent.** Amber is named accent by `text/accent`, but it is the same step as the warning text and icon. It may be
  a status color reused, not a second brand hue.
- **Density.** The medium control height (40px) is a tie between compact and comfortable; the default was kept.
- **Radius.** Read from the generic `radius/md`, not from a button or field corner; the file has no components or
  usage to confirm what controls actually use.
- **Links.** Links follow the neutral action palette (link/default is neutral/950), which is not color-distinct
  from body text; the file shows no underline setting.
- **Not carried over:** the file's status hues (green, amber, red ramps) are left to the engine to synthesize; the
  label letter spacing (+4%), display tightening (-2%), the 1024/1920 breakpoint ladder, and the light/book
  condensed weight names are not mapped. The file has no layers, styles or usage, so every pick rests on variables alone.
