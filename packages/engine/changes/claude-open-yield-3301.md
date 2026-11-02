---
engine: patch
---
Plugin: opening the plugin on a full library no longer holds Figma's main thread for long stretches (#3301). The status strip reads "Reading this file…" from the first moment, before anything else runs. A set's plans are projected and printed a member at a time, with the thread handed back about every 50 ms (`figmaAnatomyMembers`, `checkAnatomySet` and the plugin's `printSteps`; `figmaAnatomySet` and every print are unchanged). The background hand-edit pass no longer projects a set's plans to find it, and reading a set's members hands back about every 50 ms as well as every 24 members. No emitted artifact, token or projected component surface moves.
