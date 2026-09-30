---
engine: minor
---
Two container radius rungs, `radius.xl` and `radius.2xl` (#1852). The ladder stopped at `radius.lg` (6px
at the default scale), so a card, panel, sheet or dialog wanting an 8-16px corner bound a
`core.dimension.*` primitive, which `radiusScale` never moves. `xl` is `baseMd x 2` and `2xl` is
`baseMd x 4`, scaled by `radiusScale` and snapped to the 2px sub-grid like the rungs below them: 8px and
16px at the default, 16px and 32px on aurora (`radiusScale` 2), 0 at `radiusScale` 0. They reach every
emission the ladder already reaches: DTCG, the per-mode overrides (`modeLevers.radius`, wireframe), the
Figma `radius` collection, `.ai.json`, and the reports. No component binds them yet. The Figma dimension
sort now treats a key as a number only when the whole key is one, so `2xl` lists after `xl` rather than
before `none` (`parseFloat('2xl')` is 2). CONTRACT 14.0.0 to 14.1.0 (two guaranteed paths added).
