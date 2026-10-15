---
engine: minor
---
Dialog (#2609, owner decisions Q303): a panel over the page for a short task or a decision. 15 members: `placement`
[center, bottom, full] × `size` [medium, small, large] × `footer` [inline, stacked, none], with size only on the
centered panel (`excludeCoordinates` removes bottom and full at small and large). No state axis. The panel is
`color.foreground.primary` with `shadow.xl` as an effect style, `radius.2xl` on all four corners when centered, the top
two as a bottom sheet and none full screen; its padding is `space.300` centered and `space.200` on the two small-screen
placements. A header (the title in `type.label.lg.emphasis`, an optional description in `type.body.md.default` on
`color.text.secondary`, and a nested IconButton.Neutral, ghost, medium, as the close button), a nested Divider above and
below the body behind one `dividers` toggle, the body as a native slot, and a footer of nested Buttons. The backdrop is
not in the component: the plugin draws an `_scrim-backdrop` instance, bound to `color.scrim.default`, behind each centered
and bottom member as canvas furniture. Two new axis names, `placement` and `footer`. Engine: a root's built size per
coordinate (`PartDef.builtSize`, which also builds a root at a literal height through the new plan field
`placementHeight`), a box's shadow as its effect style (`PartDef.elevation`), its top and bottom corners bound apart
(`PartDef.radiusEdges`), and a boolean over several parts shown together (`together`). No new tokens; CONTRACT is
unchanged.
