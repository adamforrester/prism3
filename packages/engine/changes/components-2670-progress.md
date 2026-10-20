---
engine: minor
---
Progress (#2670, the approved proposal, every call A): the progress bar and ring. 10 members: `shape` [linear, circular]
× `type` [determinate, indeterminate] × `status` [active, complete, error] × `size` [medium, small], with the ring
determinate only, sized only as a ring (40px and 24px on the icon ladder), and no end state on an indeterminate bar
(`excludeCoordinates`). A linear bar is built at 360 and fills its container: a header (the label in
`type.label.md.emphasis`, the value end-aligned in `type.body.sm.default` on `color.text.secondary`), then a 4px track in
`color.background.tertiary` whose fill takes `color.icon.brand`, `color.icon.success` or `color.icon.danger` by status and
ends in a 4px stop dot of the same color. The still members split the track by layout (the fill and the rest each grow):
50% at active and error, the whole track at complete, and a centered third for the indeterminate frame. A ring is two
glyphs on one square, the track (2px wide at 24px, 4px at 40px, in the track's color) and the value arc over it, from
twelve o'clock with round caps, and its value beside it. Complete and error nest a FieldMessage (success, error) for the glyph and the
caption. Booleans `label`, `value` and `message`; texts `label text`, `value text` ("50%", at active and error) and
`complete value text` ("100%", at complete, its own text parts), so each member shows its own value: one TEXT property
holds one default for every member it is bound in. Engine: a TEXT property may be `figmaOnly` (no code prop, a stated
`figmaName`), as a boolean already may; `complete value text` is one, since code renders both values from `valueText`. Three new component-owned glyphs
(`progress-arc-*`, `progress-ring-*`, `progress-stop`). Engine: a `vector` part may name its paint slot
(`paintSlot`), and may be drawn centered over its parent's in-flow child (`stackCentered`, projected as the overlay's
existing `absoluteCenter`, so neither executor changes). New motion pair, fixed at every tempo: `motion.duration.sweep`
(1600ms, one pass of the indeterminate segment) and `motion.duration-reduced.sweep` (2600ms), with the primitive
`motion.duration-ms.1600`; CONTRACT 14.7.0 → 14.8.0. Spinner names Progress as its alternative.
