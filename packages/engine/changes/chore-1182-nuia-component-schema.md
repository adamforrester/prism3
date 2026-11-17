---
engine: patch
---
`component-schema.ts` now typechecks clean under `noUncheckedIndexedAccess` (#1182, first of a staged rollout). No behavior change: the validator returns the same results for every registered def, and every emitted artifact is unchanged.
