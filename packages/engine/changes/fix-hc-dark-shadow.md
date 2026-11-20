---
engine: minor
---
hc-dark now takes the reduced dark shadows (#4131, owner decision A). It is a dark-appearance mode, but only `dark` and
dark-based custom modes were seeded (in every brand, the regression brand nb included), so `<brand>.hc-dark.overlay.tokens.json` carried no shadow and a consumer reading
base + hc-dark got the light shadows on a near-black surface. Every hc-dark overlay now carries `shadow.*` (xs–2xl and
inset) equal to dark's, and each brand's Figma shadow styles gain the `shadow-hc-dark/*` set beside `shadow-dark/*`.
No name in the token contract moves.
