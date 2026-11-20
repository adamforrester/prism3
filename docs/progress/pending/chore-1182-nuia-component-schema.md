## (2026-11-17) — noUncheckedIndexedAccess, stage 1: component-schema.ts clean (#1182)

First PR of the #1182 lane. It fixes every error `component-schema.ts` reports under the flag, and does not turn the flag on yet: the engine tsconfig's import graph still reports about 180 more, which later stages fix before one flips the flag. Until then a clean-list arm in `typecheck-components.ts` holds each cleaned file (below).

### Measured first

The issue's 402 (on `0e4e338`, studio tsconfig only) has grown. On `bb10c73`, summed across the four tsconfigs and deduplicated by file and position, there are **1,718** errors: 1,064 in `packages/engine`, 379 in `apps/plugin/src`, 275 in `apps/studio/src`. `component-schema.ts` alone is 604 of them.

### Why 604 errors is a small diff

559 of the 604 came from six loops of one shape, `for (const n of names) { const p = parts[n]; … }`, where `names = Object.keys(parts)`. The compiler cannot know that a key from `Object.keys` indexes its own object, so every use of `p` in each long loop body was an error. Rewriting the header as `for (const [n, p] of Object.entries(parts))` clears all of them with no assertion. The order and the values are the same, because `Object.entries` walks the same own keys in the same order. The other 45 were fixed one by one: more `Object.entries` rewrites, `?.` on lookups the code already treated as present, a `segmentsOf` return type corrected to `string | undefined` (both callers already tested for `undefined`), and five commented `!` where the invariant is local and visible (a mandatory regex group, a matched template, a non-empty guarded list, an entry 0 inside its own `forEach`).

### Proof that nothing moved

`regen --check` is clean. A scratch plan diff called every exported single-argument function of `component-schema.ts`, `anatomy-figma.ts`, `tree.ts` and `modes.ts` with every registered def on `origin/main` and on the branch. All 3,038 digests matched.

### What holds it until the flag is on

Review found that nothing stopped this work being undone: with the flag off in the tsconfig, an unguarded index put back into `component-schema.ts` passed every gate. `typecheck-components.ts` now runs tsc a second time over the same tsconfig with `--noUncheckedIndexedAccess`, and fails on any error in a file on its `NUIA_CLEAN` list, which starts as `[component-schema.ts]`. Errors in other files are the rollout's remaining work and don't fail it. The arm also fails if tsc's own resolved config doesn't show the flag on, if a diagnostic names no file, or if a listed file isn't one tsc read. Each later stage appends the files it cleans (stage 2 adds `modes.ts` and `ramp.ts`); the stage that turns the flag on deletes the list and the arm. No new gate id, so `ci.yml` and the gate lists don't move.
