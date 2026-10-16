---
engine: minor
---
The DTCG font hint agrees with Figma (#2736). `$extensions.prism3.figma.scope` is gone from the `core.font.size.*` and
numeric `core.font.weight.*` leaves, whose Figma rows carry no scope (size since #2602, the numeric weights since #2616).
The family leaves keep FONT_FAMILY, which their rows still carry, and the fluid type sizes keep FONT_SIZE. An absent
`figma.scope` now means the row is unscoped. Every emitted `*.tokens.json` moves; no token path or value changes.
