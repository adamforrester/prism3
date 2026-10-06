---
engine: minor
---
#2184 (owner decision, 2026-10-06): with shadow.tint.hue unset, the shadow tint now follows the hue that
actually builds the neutral ramp. That is the primary's hue under Follow primary (neutral.auto), the custom
tint hue under Custom tint, and the pinned gray's hue under Pinned (neutral.anchor), the pin winning over
Follow primary as it does for the ramp. Before this the tint took the stored neutral.hue in all three, which
under Follow primary and Pinned is a hue the ramp ignores and the studio does not show. An explicit
shadow.tint.hue still wins. The baseline and every per-mode shadow ramp change together. No committed
artifact moves: every corpus brand either uses a custom tint, sets an explicit tint, or pins a gray whose hue
equals its stored hue, and NB ships pure-black shadows. A brand outside the corpus under Follow primary or a
pinned gray gets a new shadow color (a 130° to 185° hue move measured ΔE00 2.15 to 2.51 on the base color).
The token names do not move, so the token contract stands.
