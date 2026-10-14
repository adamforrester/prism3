---
engine: minor
---
#2602 (owner decisions, 2026-10-13 and Q292 A, 2026-10-14): every variable in the Figma `core` collection
is emitted with `hiddenFromPublishing: true`, and every one but the font family and weight rows with
`scopes: []`. That covers the palette, `dimension/*` and every `core/font/*` row: family, size, weight,
weight-role and the style cuts. Empty scopes hide a variable from every local picker in the file that
defines it, and hidden-from-publishing hides it from library consumers, so designers no longer de-scope
primitives by hand after each Apply. `font/family/*` keeps `FONT_FAMILY` and `font/weight/*` and
`font/weight-role/*` keep `FONT_WEIGHT`, because TokenPress types a font variable's DTCG `$type` from its
scope; fully unscoping them is #2616. The weight-role and cut rows were not hidden before; they are now,
with the rest of `core`, and the size and cut rows lose their font scope. Text Styles still bind the size
and cut variables through the Plugin API, which scopes do not limit. `layout`'s `grid/columns` drops
`ALL_SCOPES` for `[]`: no `VariableScope` member covers a layout-grid count, and nothing in Prism3 binds
it. Both write paths, the plugin's Apply and the paste payloads, read these values off the same emission.
Semantic scopes, names and values are unchanged, so CONTRACT is unchanged. The PRIMITIVE comment in
`emit-figma-color.ts` said `scopes: []` behaves as ALL_SCOPES and nothing can hide a variable locally.
That claim was wrong and has been rewritten.
