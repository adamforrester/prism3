---
engine: patch
---
`anatomy-figma.ts` and `anatomy-readback.ts` typecheck clean under `noUncheckedIndexedAccess` (#1182). No behavior change: every plan, every def object and the source shipped to both executors are identical. A missing anatomy part, plan entry or token now fails with a named error instead of a bare TypeError.
