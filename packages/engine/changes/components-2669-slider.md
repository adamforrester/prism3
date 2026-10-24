---
engine: minor
---
Slider (#2669, the owner's approval with every call A, then owner decision Q550): choose a value, or a range, by moving
a thumb along a track. One `Slider` with a `size` axis [medium, small, large] × a `type` axis [single, range] × five
states = 30 members; range comes from a two-value `value` in code. A header row holds a nested FieldLabel and the value
text (`type.body.sm.default`, `color.text.primary`), with no gap above the control row, which is `size.md.min-height`
tall at every size and holds the track: one thickness per size (`border-width.thick`, `heavy`, `x-heavy`: 2, 4, 6px) in
`color.field.border.rest`, the selected part at the same thickness in `color.interactive.neutral.border.rest`, and the
thumbs, drawn as growing segments around them. Optional labeled milestones (`type.body.xs.default`,
`color.text.secondary`), paired number inputs (nested TextFields) and a FieldMessage, all off by default; `label` and
`value` on. Each thumb nests a new Slider.Thumb (`_slider-thumb`, 3 sizes × 5 states = 15 members): a disc in
`color.interactive.neutral.border` rest, hover and pressed, `control.size.sm/md/lg.thumb` (18, 24, 30px), sitting on
the track with no ring; a `color.border.primary` halo, 4px at hover and 8px pressed; the shared focus ring; and
`color.disabled.icon` when disabled, with the selected part. In a range member the state shows on the maximum thumb; the
minimum one stays at rest. New token `border-width.x-heavy` (6px): CONTRACT 14.9.0 → 14.10.0. Its own page under
Components.
