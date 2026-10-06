---
engine: minor
---
#2242: the decisions-log notes print no long decimals. They are shipped prose (every brand's
$extensions.prism3.decisions, and the reports), and they interpolated input numbers raw, so a value carrying full
converter precision printed as "tinted to hue 89.87556274151122". The shadow note now prints its tint hue in whole
degrees, as the studio shows hue. The other numbers the notes print (the primary's hue and chroma, a brand color's
and a status color's hue, a pinned gray's lightness, an out-of-gamut anchor's OKLCH, the shadow's softness and
amount) print at the precision the corpus already used: hue and lightness to 2 places, chroma to 4. Committed
artifacts move only where a shadow tint hue was not whole: prism3's decisions now read "tinted to hue 267"
(was 266.75) and wendys's "tinted to hue 249" (was 249.14). No token name or value moves, so the token contract stands.
