---
engine: minor
---
The canvas-furniture pilot (#2406 Q171, #2188 Q172 and Q173 A, 2026-10-09): `CANVAS_FURNITURE_PILOT` in
`anatomy-figma.ts` switches it on per def, for Button, Tag and Text field. For a piloted def with a `surface` row axis,
`planSetLayout` moves `surface` to the outermost row grouping, so every `surface=inverse` row sits in one contiguous
block (Button: rows 48 to 95). Layout only: member names, coordinates, keys and the plan order the members are built and
combined in are unchanged, so the properties panel's value order holds (#2386). Both executors lay a piloted set out
the same way, since both call `planSetLayout`. No emitted artifact, token or projected component surface moves, so
CONTRACT is unchanged. The plugin reads the same switch to place `_Label` instances and an `_inverse-backdrop` around
the set.
