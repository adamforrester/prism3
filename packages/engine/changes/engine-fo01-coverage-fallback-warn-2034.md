---
engine: minor
---
An override whose ground is neither a role in its mode nor a ramp step is now warned. The override pass still re-rates the pick on the page base, as before, but it adds an `OverrideWarning` with `unresolved: true` that names the role and the ground it could not find. It is no longer silent (#2034). No input reaches this today: every ground the engine writes is a role or a step, and 5,726 override cases across the corpus produced none. So no emitted artifact moves.
