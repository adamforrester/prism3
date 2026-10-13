---
engine: minor
---
Label line-box tokens (#2586, owner Q266 A, Q267 A, Q275 and Q282 A, 2026-10-13): each label rung gains
`type.label.{sm,md,lg}.line-box`, one line of the `type.label.{rung}` type (font size times line height, rounded to a
px). It is baked as `control.size.*.line-box` is for body (#1201), because Figma variables cannot multiply, and is
carried into the single-mode Figma `control` collection as `type/label/{rung}/line-box`. A glyph beside a wrapping
title centers in a box this tall and sits on the title's first line at any label line height. `buildTree` throws when
two label composites at one rung disagree, naming both (as #1220). In every corpus brand the values are 14, 16 and 21px
at sm, md and lg. It is the first non-composite leaf under `type.*`: `tokens.html` draws type specimens for
typography leaves only, and the AI sidecar gives the leaf a role in its layout tier (beside `control.size.*.line-box`) instead of the primitive tier; the sidecar schema's layout pattern admits the path. CONTRACT
14.6.0 to 14.7.0 (three paths added). No component binds it yet.
