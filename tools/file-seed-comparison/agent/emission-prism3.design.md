---
id: file-c
# primary: core/palette/primary/600 #1e1eff, described "the brand color, exact"; color/interactive/primary/fill/rest, foreground/brand, border/focus and text/link/default (light mode) all alias it.
primary: { l: 0.4709, c: 0.3001, h: 266.7463 }
# accent: a full core/palette/accent ramp described "Brand (accent)"; its chroma peaks at step 500 #7a3cff, so that step is taken as the anchor. No semantic role aliases it, so actionPalette stays unset.
brandColors:
  - name: accent
    oklch: { l: 0.5573, c: 0.2635, h: 289.3229 }
# neutral: core/palette/neutral grays measure hue 248-286 (most ~271-286) at chroma 0.001-0.005 (500 #747678 c 0.0039, 600 #5b5c5f c 0.0050), a faint cool cast toward the primary.
neutral: { hue: 275, chroma: 0.005 }
# typography: core/font/family/display and /title = Playfair Display; body, label, caption (and eyebrow) = Inter; code = JetBrains Mono.
typography:
  families:
    display: Playfair Display
    title: Playfair Display
    body: Inter
    label: Inter
    caption: Inter
    code: JetBrains Mono
# density: size/md/height = 44px (sm 36, lg 56) - the comfortable medium control height.
density: comfortable
# radiusScale: radius/md = 4px, the corner rounded controls follow; 4px / 4px = 1.
radiusScale: 1
---

# file-c

A vivid, saturated electric blue (#1e1eff) is the hero and drives every action, link,
focus and brand role in the file, so action stays coupled to the primary. A violet accent
ramp (#7a3cff at its peak) ships beside it but nothing in the semantic layer points at it
yet; it is carried as a brand color for expressive use only. Headings set in Playfair
Display over an Inter body give an editorial contrast; the grays are near-pure with a faint
cool cast.

Left open by the report, for a reviewer to check:

- **Accent anchor.** The accent palette has no step marked as exact, so the anchor is the
  chroma-peak step (500). The brand's real accent may sit elsewhere on that ramp, or the
  accent may be unused and droppable.
- **Radius.** No button or field corner is bound in the report (there is no layer usage at
  all, only variables), so `radiusScale` is read from `radius/md` (4px) on the assumption
  that rounded controls follow it.
- **Neutral hue.** The grays' hues spread from 248 to 286 at chroma near the noise floor;
  275 is a midpoint, not a measured anchor.
- **No usage data.** The report has zero pages and layers, so nothing about which colors,
  fonts or corners are actually used in designs could be confirmed. Status hues, surfaces,
  motion, layout and type scale were left at engine defaults.
- **Namespace.** Every variable in the file sits under `pds3/`; `root` is left at its
  default because the report doesn't say whether that prefix is the brand's own or the
  tool's.
