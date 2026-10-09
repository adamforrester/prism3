---
engine: minor
---
`controlShape: boxed` puts fields and the checkbox on the 0px corner too, the same way Hairline does (#2361,
owner decision Q139, 2026-10-08). `applyControlShape` now repoints, under `boxed` as well as `hairline`,
text-field, select and textarea's field corner (`radius.sm`) and checkbox-control's per-rung clamped corner
(`control.size.<rung>.radius`), to the shape's rung (`radius.none` under Boxed). The map is renamed from
`HAIRLINE_CORNER_REFS` to `FIELD_CORNER_REFS`, and the shapes that reach it are named in `FIELD_CORNER_SHAPES`.
The defs are still named by id, never selected by ref, so Badge's status corner (also `radius.sm`) stays put.
The checkbox clamp still holds: 0px is below `snap2(edge / 8)` on every edge. Radio and switch keep
`radius.round`. Pill and Rounded reach only buttons and icon buttons, as before. No token name or value moves,
so CONTRACT is unchanged; a Boxed brand's in-place component update shows the four defs' corners as named
differences.
