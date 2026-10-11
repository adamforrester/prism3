---
engine: minor
---
Divider (#2455): a new component, a 1px rule that separates groups of content, after the KB brief
(`components/divider.md`, category foundations). Two axes, `orientation` (horizontal | vertical, a new name in
VARIANT_AXES) and `inset` (none | inset | middle-inset, a disjoint value set under the existing name), five
members (a vertical rule takes no start-only inset), no states. A padded root paints nothing; its one child,
the rule, fills it: thickness `border-width.hairline`, color `color.border.secondary`, a nominal standalone
length a host stretches, and the inset as the root's padding (`space.200`; `space.100` for a vertical middle
inset). A `decorative` code prop, default true (`aria-hidden`); with `decorative=false` it is an `<hr>` or a
`role="separator"`. No Figma property for it, since it changes no pixel. No token name moves, so
CONTRACT_VERSION does not.
