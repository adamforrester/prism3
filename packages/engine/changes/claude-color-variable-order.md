---
engine: minor
---
One canonical colour-variable order (#2860, #2836). The emitted `color` tree and the Figma create order now run the
families as background, foreground, text, interactive, border, icon, disabled, scrim, veil, field, inverse, and the roles
inside each in the order a designer reaches for them: primary, secondary, tertiary, the statuses in the engine's
SEMANTICS order (brand, success, warning, danger, info), their subtle tints, the on- inks, then link states; interactive
runs fill, on-fill, text, icon, border, overlay, subtle-fill with states rest, hover, pressed, focused, selected.
`foreground` lists danger with the other statuses instead of after the subtle tints. Every inverse group takes its
default group's order, and every group is one run. The order lives in color-order.ts, which tree.ts now calls; a role
it does not name throws rather than being appended. Key order only: no token name or value moves, so CONTRACT is
unchanged. The plugin's Update check lists colour variables that are out of this order in an existing file. It cannot
move them: the Plugin API has no call for it.
