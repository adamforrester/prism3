---
engine: patch
---
`tree.ts`, `design-md.ts` and `emit-figma-color.ts` typecheck clean under `noUncheckedIndexedAccess` (#1182). No behavior change. Every emitted artifact is unchanged, and the design.md parser reads the same lines the same way.
