---
engine: patch
---
`noUncheckedIndexedAccess` is on in `packages/engine/tsconfig.json` (#1182). `rtl-mirror.ts`, the one file of that graph with an error left, typechecks clean under it. No behavior change: the "In RTL" note reads the same for every def.
