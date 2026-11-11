---
engine: minor
---
The icon buttons state their press scale and name their state-change timing (#3554, owner decision Q-CC29a A; #3555 Q-MD4 A). Their `motion.reduceMotion` resolved "scale/translate to none" under reduced motion without ever stating a scale; it now names Button's subtle press, scale 0.98. The "~100–150ms" state transition becomes `motion.duration.fast` with `motion.easing-role.default`, and under reduced motion the color change runs on `motion.duration-reduced.fast` in place of "instantaneous". Prose only: no binding, member or token moves.
