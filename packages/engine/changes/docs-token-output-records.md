---
engine: minor
---
Two prose changes in every brand's emission, both DRAFT copy from the 2026-11-19 audit decisions. The `.ai.json` `note`
names the primitive families (`core.palette` … `opacity`, `motion.duration-ms`, `motion.easing` …) and says a family
outside `core.*` is still a primitive (#4163, owner decision A: no rename). `radius.round` and `radius.capsule` each say
which pill a control binds: `round` for small fixed-size parts such as a switch track, `capsule` for a button under
`controlShape: pill` (#4161, owner decision A). No value or name moves.
