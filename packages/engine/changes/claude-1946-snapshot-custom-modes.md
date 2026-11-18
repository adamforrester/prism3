---
engine: minor
---
A custom mode is a snapshot of the mode it started from (#1946, owner decision 2026-11-18 A). Its `base` no longer has to be a mode the brand generates, so turning Dark off while a custom mode started from Dark is taken instead of refused. A custom mode reads only its own `surfaces.<name>` (the schema now accepts `surfaces` keyed by a custom mode), never its base's: before, a dark-based custom mode followed `surfaces.dark` live. Since the schema takes any `surfaces` key, `brandTheme` refuses one that is neither `light`, `dark` nor a declared custom mode, naming it. `base` stays as the record of where the mode started and the appearance it derives with. No emitted token name moves.
