---
engine: minor
---
Slider (#2669, the owner's approval with every call A): choose a value, or a range, by moving a thumb along a track.
One `Slider` with a `type` axis [single, range] × five states = 10 members; range comes from a two-value `value` in
code. One size. A header row holds a nested FieldLabel and the value text (`type.body.sm.default`,
`color.text.primary`); the control row is `size.md.min-height` tall and holds the track: a 2px rail
(`border-width.thick`, `color.field.border.rest`) with a 4px selected bar (`border-width.heavy`,
`color.interactive.primary.fill.rest`) and the thumbs, drawn as growing segments around them. Optional end labels
(`type.body.xs.default`, `color.text.secondary`), paired number inputs (nested TextFields) and a FieldMessage, all off
by default; `label` and `value` on. Each thumb nests a new Slider.Thumb (`_slider-thumb`, 5 members, a state-only set):
a `control.size.md.thumb` thumb whose outer disc is `color.background.primary`, padded `space.025` around an inner disc
in the primary fill stepping rest, hover and pressed (`color.disabled.fill` when disabled), and the shared focus ring. In a range member the state shows on the
maximum thumb; the minimum one stays at rest. The schema now admits a set with no variant axis when the def has no
variants and a state axis. Its own page under Components. No token moves, so CONTRACT is unchanged.
