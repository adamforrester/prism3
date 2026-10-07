---
engine: minor
---
#2241: a pure gray has no hue. Below a chroma of 1e-4 (ACHROMATIC_C, color.ts) the OKLCH converter used to
return an atan2 of rounding noise, about 89.88 degrees for every gray, and code downstream treated it as a
real hue. rgbToOklch now returns a measured color whose hue is null there (CSS Color 4's "powerless" hue), so
every caller must decide what a missing hue means. At the brand-input boundary (the hex import, the studio's
start from a color and its color picks) a hue-less color is stored with hue 0, CSS Color 4's convention for a
missing hue, so brand files keep the schema's numeric hue (a technical decision, recorded on #2280: it holds
because every reader checks chroma first). Nothing reads a hue below the threshold: the shadow tint's no-hue
rule (#2184, owner Q58 B and Q73 A) reads the same ACHROMATIC_C, starting from a pure gray now gives a gray
neutral rather than one leaning to a noise hue, and so does a gray primary under Follow primary or a design.md
import with no neutral swatches (owner Q87 A), whose notes now say it has no hue. No corpus color is a pure
gray, so no committed artifact moves.
