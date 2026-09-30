---
engine: minor
---
Three container radius rungs, `radius.xl`, `radius.2xl` and `radius.3xl` (#1852). The ladder stopped at
`radius.lg` (6px at the default scale), so a card, panel, sheet or dialog wanting an 8-16px corner bound a
`core.dimension.*` primitive, which `radiusScale` never moves. The new rungs are `baseMd` x 2, x 3 and x 4,
scaled by `radiusScale` and snapped to the 2px sub-grid like the rungs below them: 8, 12 and 16px at the
default (owner decision, 2026-09-30, reproducing Prism 2's container ramp), 16, 24 and 32px on aurora
(`radiusScale` 2), 0 at `radiusScale` 0. They reach every emission the ladder already reaches: DTCG, the
per-mode overrides (`modeLevers.radius`, wireframe), the Figma `radius` collection, `.ai.json`, and the
reports. No component binds them yet. The Figma dimension sort now treats a key as a number only when the
whole key is one, so `2xl` and `3xl` list after `xl` rather than before `none` (`parseFloat('2xl')` is 2).
CONTRACT 14.0.0 to 14.1.0 (three guaranteed paths added).
