---
engine: minor
---
Numeric font weights are unscoped in Figma (#2616, owner decision Q334 A, 2026-10-15). `core/font/weight/*` is written
with `scopes: []` like every other `core` primitive, so the font-weight picker offers only the weight roles
(`core/font/weight-role/*`, still FONT_WEIGHT). `core/font/family/*` keeps FONT_FAMILY. TokenPress types an unscoped font
row by its path, so the numeric weights still export as `fontWeight`. A file that already holds them takes the new
scopes on its next Update.
