---
engine: minor
---
Accordion.Indicator carries a `motion` field, from the prism3-motion accordion recipe (#3554, owner decision Q-CC20): a chevron turns to its open position and back on `motion.transition.default`, a plus and minus swap glyphs, and under reduced motion the indicator swaps without turning. Its code-only turn note now names `motion.transition.default`, the recipe's token, in place of the enter and exit transitions. Prose only; no member, binding or token moves.
