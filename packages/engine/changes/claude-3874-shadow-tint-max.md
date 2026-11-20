---
engine: minor
---
The global shadow tint amount must be in [0, 1] (#3874). The tint's lightness and chroma both scale with the amount, so `shadow.tint.amount: 50` used to compile cleanly into white shadows, invisible on a white page, and anything above 1 pushed the tint's chroma out of gamut. `brandTheme` now refuses an amount outside [0, 1] by name, as it already did for the per-mode tint, and the schema gains the same maximum. Every committed brand's emission is unchanged.
