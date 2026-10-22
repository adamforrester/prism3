---
engine: minor
---
Option rows land on the control-height ladder (#2894, owner decision Q539: A on every question). Radio.Row,
Checkbox.Row and Switch.Row bind their floor `size.{size}.min-height` (36/44/56 at comfortable) as the row's
Figma `minHeight` as well as in code, and center one new inner box, `content`, in it; `content` keeps the control
and label top-aligned, so a wrapped label still holds the control on its first line (Accordion's Q276 A
construction). The constant 12px block padding becomes a per-size minimum, `size.{size}.pad-y` →
`space.075`/`100`/`150`, and joins `densitySpacing`. Every brand's rows move: 45/48/51 → 36/44/56 in Figma at
comfortable, Switch.Row 21/24 → 36/44. Token names do not move, so CONTRACT is unchanged. Files that already hold
these rows need an Update, which reparents the label and nested control under `content`.
