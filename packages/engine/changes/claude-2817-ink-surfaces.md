---
engine: minor
---
The primary text ink (`interactive.primary.text.*`, with the icon and border that follow it) and the link ink (`text.link.*`,
with `icon.link.*`) clear 4.5:1 on every surface a component places them on: the three page tiers, the three raised
surfaces (`foreground.*`) and the five status tints (`foreground.<status>-subtle`), in every mode (#2817, Q415 A). Each pick
keeps its anchor step where it already clears them all, and otherwise takes the nearest step on the same ramp that does:
darker in a light mode, lighter in a dark one. The page keeps the mode's own bar (7:1 in high contrast). Values move in the
light and dark modes of every example brand; no token is renamed or added, so CONTRACT is unchanged.
