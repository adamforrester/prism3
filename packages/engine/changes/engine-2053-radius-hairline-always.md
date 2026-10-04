---
engine: minor
---
radius.hairline (1px, aliasing core.dimension.1) is always emitted (#2053, owner 2026-10-04). It was
opt-in through radiusHairline (#1362), or implied by controlShape: 'hairline' (#1371); radiusScale now
pushes it for every brand, the NB fixture included, so a 1px corner is always reachable and the Studio
switch could read Off while a control shape used it. radiusHairline is still ACCEPTED in brand input, so
existing brand files load, but it changes nothing: a note says so, the lever manifest marks it
deprecated, and the schema marks it deprecated. controlShape: 'hairline' still binds radius.hairline.
Every emitted brand gains one radius token and one Figma variable. CONTRACT 14.1.0 to 14.2.0 (MINOR):
radius.hairline joins the guaranteed surface.
