---
engine: minor
---
Divider (#2455): a new component, a 1px rule that separates groups of content. One `orientation` axis
(horizontal | vertical, a new name in VARIANT_AXES), two members, no states. The rule is one filled box:
thickness `border-width.hairline`, color `color.border.secondary`, and a nominal standalone length a host
stretches (`container.narrow` across, `size.md.height` tall). In code it is an `<hr>` or a
`role="separator"`, hidden with `aria-hidden` when decorative. Its own Figma page under Components. Every
visible choice is DRAFT, pending owner review. No token name moves, so CONTRACT_VERSION does not.
