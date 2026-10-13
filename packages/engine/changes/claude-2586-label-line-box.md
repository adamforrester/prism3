---
engine: minor
---
Label line-box tokens (#2586, owner Q266 A and Q267 A, 2026-10-13): every control rung gains a `label-line-box`
leaf, one line of the `type.label.{rung}` type (font size times line height, rounded to a px). It is baked as
`line-box` is for body (#1201), because Figma variables cannot multiply, and is carried into the Figma `control`
collection as `control/size/{rung}/label-line-box`. A glyph beside a wrapping title centers in a box this tall and
sits on the title's first line at any label line height. `buildTree` throws when two label composites at one rung
disagree, naming both (as #1220). In every corpus brand the values are 14, 16 and 21px at sm, md and lg. CONTRACT
14.6.0 to 14.7.0 (three paths added). No component binds it yet.
