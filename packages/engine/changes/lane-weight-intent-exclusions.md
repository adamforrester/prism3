---
engine: minor
---
#1746: `validateComponentDef` refuses a `figmaProperties.excludeCoordinates` entry that names the def's
`weightIntent` axis. A brand that ships one weight for the group drops that axis (`applyWeightIntent`), and the
entry would then be ignored by the projector while `figmaVariantCount` still counted the rest of it, so #1355's
integrity check would fire on a def that validated. No def in the registry names it, so no emitted artifact
moves.
