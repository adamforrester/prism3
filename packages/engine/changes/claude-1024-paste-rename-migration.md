---
engine: minor
---
The CLI paste path (materialise-to-figma.ts) migrates renamed variables, as the plugin executor has since #1013
(#1024). A new first pass, `migrate`, ships the source of the rename pass and runs it in the file: collections
first, atomically, then each axis's variables against the names that axis is about to write. A renamed variable
keeps its id, and so every binding, instead of being orphaned beside a fresh one. The apply half of the pass
(openMigration, renameCollections, renameVariables) moved from apps/plugin/src/write-figma.ts into rename-map.ts,
so both paths run one definition; rename-runtime.ts assembles its source for the payload. No token, emitted tree or
projected component surface moves, so CONTRACT is unchanged.
