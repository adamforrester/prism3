---
engine: minor
---
{{ENGINE_VERSION}}: `controlShape: hairline` puts fields and the checkbox on the 1px corner too (#2361,
owner 2026-10-08, "1px corners everywhere", consistency first). `applyControlShape` now also repoints, under
`hairline` only, text-field, select and textarea's field corner (`radius.sm`) and checkbox-control's per-rung
clamped corner (`control.size.<rung>.radius`) to `radius.hairline`. The defs are named by id in
`HAIRLINE_CORNER_REFS`, never selected by ref, because Badge's status corner also binds `radius.sm`. The
checkbox clamp still holds: 1px is below `snap2(edge / 8)` on every control edge of 8px or more, and the
smallest is 12px. Radio and switch keep `radius.round`. Boxed, Rounded and Pill reach only buttons and icon
buttons, as before. No token name or value moves, so CONTRACT is unchanged; the change is which existing rung
four defs bind at build time, which a Hairline brand's in-place component update shows as named differences
on those members.
