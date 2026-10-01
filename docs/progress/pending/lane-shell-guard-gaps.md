## (2026-10-01) — The repaint guard resolves `.js` specifiers, follows modules outside `src/`, skips type-only imports, and scans `src/state/` (#1928)

**STATUS: PR open from `lane/shell-guard-gaps`, labeled DO NOT MERGE.** Test only, in `apps/studio/test-shell-imports.ts`: no ENGINE bump, no CONTRACT bump, no change note. No emitted artifact moves, and nothing under `apps/studio/src/` changes.

**What was wrong.** The repaint guard's import arm had three gaps (#1928, from the orchestrator's delta check of #1922). Each was reproduced on `main`'s guard (`588d92dc`) by planting in a scratch copy of `apps/studio`:
- `import * as M from '../main.js'` in `src/shell/frame.ts`, followed by `(M as any)[k]()`, passed 29/29. `resolveSpec` tried the base path, `.ts`, `.tsx` and `index.ts`, so it never mapped `main.js` to `main.ts`, although `moduleResolution: bundler` does.
- `apps/studio/bridge3.ts` holding `export { build as b3 } from './src/main'`, imported by `frame.ts`, passed 29/29, because the graph walked only `src/`.
- `import type { X } from '../main'` in `frame.ts` failed (`imports "../main", which reaches src/main.ts`), although the compiler erases it.

The S3 review (#1939) added a fourth: `src/state/` was not scanned, so `(globalThis as any)['renderWorkspace']?.()` in `src/state/brand-input.ts` passed 29/29.

**What changed.**
- **`.js`, `.jsx`, `.mjs` and `.cjs` specifiers resolve to their TS source first.** The guard tries every TS extension (`.ts`, `.tsx`, `.mts`, `.cts`) for every JS one. That is wider than `tsc`, which maps `.mjs` only to `.mts`. (Measured with `ts.resolveModuleName` and the studio's options: `../main.mjs` resolves to nothing, so it would not build either.) The brief asked for `.mjs`, and over-resolving fails loudly where under-resolving passes.
- **The graph follows every relative import to wherever it resolves.** It starts from all of `src/` plus the scanned files and walks outward, so a bridge beside `src/` is read and tainted like a module inside it. A stylesheet or JSON target resolves but is not parsed. On today's tree the walk reads 29 modules, 0 of them outside `src/`. The one relative import that leaves `src/` (`write-adapter.ts` → `../../plugin/src/messages`) is type-only, so it is now no edge at all.
- **Type-only imports are no edge.** These are `import type`, `export type`, and a named list whose every specifier carries `type`. A default, namespace, bare or empty-`{}` import keeps its edge. The header records one fact for whoever turns on `verbatimModuleSyntax`: `import { type X }` then keeps a bare `import '…'` at run time. That runs a module and hands nothing over, so skipping it stays sound.
- **`src/state` joins `NEW_DIRS`**, and its four files on `main` join `MUST_SCAN`. Nothing in `src/state` on `main`, or on `origin/ui/s3-brand`, names a tier as an identifier or a literal key. The hits a text grep finds are string-literal types (`'apply'`, `'build'`) and comments. S3 does not add `src/state` itself.

**How it is proven.** The import arm is now one function over a `Tree` (disk for the real run, a `Map` for fixtures), so each gap has an in-memory fixture whose expected offender is written out in full. Gaps 1 and 2 fail by name. Gap 3 passes directly, through a module, and as `export type`. A type-only import beside a value import of `main.ts` still fails, on the value line only. The real tree stays green at **44/44** (was 29/29). The import arm reports 2 modules reaching `main.ts` and 16 files scanned (was 12).

Mutations (wip-committed first, each diff asserted non-empty, each restored and re-run green):

| Mutation | Result |
|---|---|
| M1: drop the JS→TS stem candidates | 41/44. `a ".js" specifier`, `a ".mjs" specifier` and `a ".js" specifier through a module` fail by name (`got: nothing`). |
| M2: the walk stops at `src/` | 43/44. `a bridge module outside src/` fails by name. |
| M3: type-only imports kept as edges | 39/44. The four `… passes` fixtures fail, plus `the "import type" line beside a value import is not itself reported`. |
| M4: `src/state` out of `NEW_DIRS` | 40/44. `the scan read src/state/{store,verdict,palette-input,host-session}.ts` fail. |

These were planted in a scratch copy of `apps/studio`, run under the new guard, and run again under `main`'s guard:

| Plant | Old guard | New guard |
|---|---|---|
| R1: `../main.js` in `frame.ts` | 29/29 green | `src/shell/frame.ts:649: imports "../main.js", which reaches src/main.ts` |
| R2: `bridge3.ts` beside `src/` | 29/29 green | `src/shell/frame.ts:649: imports "../../bridge3", which reaches src/main.ts` |
| R3: `import type` in `frame.ts` | fails | 44/44 green |
| R5: `globalThis` key in `src/state/brand-input.ts` | 29/29 green | `src/state/brand-input.ts:1: references the legacy repaint tier "renderWorkspace"` |

The header's existing claim about `export { apply } from '../main'` in `verdict.ts` changed, because `verdict.ts` is now scanned. It now also fails on the verdict line itself, and that run (R4) is what the header now states.

**Left open, filed as #1944.** A bare specifier is still read as a package. `@prism3/studio/src/main` resolves through the workspace symlink to `src/main.ts` (checked with `ts.resolveModuleName`), so it evades the arm. A computed `import(k)` in a module the graph reaches but does not scan also drops out of the graph. Both are in the guard's header under "What still gets past".

**Conflict with S3 (#1939).** `origin/ui/s3-brand` has not yet merged `main`, and it already conflicts with `main` in this file (S2's lines, since S3 forked before S2 landed). Once S3 merges `main`, its only change of its own here is the `MUST_SCAN` tail (`src/domains/brand.ts`, `src/preview/brand.ts`). This PR leaves that tail alone, and inserts its `src/state` entries above the S2 block. Measured two ways. Raw `git merge-tree --write-tree origin/ui/s3-brand HEAD` lists the same 13 conflicted files as `origin/ui/s3-brand` against `main`, with none new. And a three-way `git merge-file` of this file, with S3's tail applied to `main`, merges with 0 conflicts.
