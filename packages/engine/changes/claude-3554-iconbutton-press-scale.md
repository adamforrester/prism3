---
engine: minor
---
The icon buttons state their press scale (#3554, owner decision Q-CC29a A). Their `motion.reduceMotion` resolved "scale/translate to none" under reduced motion without ever stating a scale; it now names Button's subtle press, scale 0.98, so the reduced-motion clause removes a scale the component has. Prose only: no binding, member or token moves.
