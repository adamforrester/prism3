---
engine: minor
---
surfaces.<mode>.base and inverseBase refuse unknown keywords and steps that are not on the palette's ramp
(#1985, owner 2026-10-03, option A): a typo must never silently pick a color. 'grey' used to resolve to
neutral.025 and 333 to neutral.350; both now throw, naming the key and, for an off-ramp number, the nearest
real step. This is the check the four tier inputs got in #1972, now one check over all six surface anchors,
and the tier messages name the nearest step too. Minor, not major: ENGINE major is refused below 1.0, what is
refused was already resolving to an unintended color, and no corpus brand, fixture, gate case or Studio
control relied on snapping (1,688 resolutions measured, 0 off the ramp). No token path moves, so
CONTRACT_VERSION does not.
