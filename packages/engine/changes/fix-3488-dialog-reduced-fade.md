---
engine: minor
---
Dialog keeps a fade under reduced motion (#3488, owner decision Q-M5 A on #3413, amending Q491 A). Under
prefers-reduced-motion every placement and the backdrop now fade only, with no slide and no scale, on
`motion.duration-reduced.normal` to open and to close, where the def said they opened and closed at once with no
fade. A fade is not vestibular motion, and it keeps the cue that a layer opened. The `motion.reduceMotion` field and the
code-only motion description move, with `components.ai.json`, `component-defs.json`, the Dialog docs page and the
maintainer schema; the `prism3-motion` skill drops its note that the def still dropped the fade. No token moves, so
CONTRACT is unchanged.
