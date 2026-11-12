---
engine: minor
---
Badge's motion follows the prism3-motion rules (#3554, owner decision Q-CC28 A; #3555 Q-MD4 A). The pulse "only for a critical alert" is dropped: no tone, prop or state carried it, and it had no stop. A count or dot now fades in and scales up from a little under full size on `motion.transition.enter`, not from zero, and fades and scales down on `motion.transition.exit`; a changed count's number changes on `motion.transition.default`. Under reduced motion a count or dot fades with no scale on `motion.duration-reduced.normal` both ways, in place of "every change is instant". Prose only; no member, binding or token moves.
