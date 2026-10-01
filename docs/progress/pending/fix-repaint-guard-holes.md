## (2026-10-01) — The repaint guard follows the workspace's own links, and refuses a computed import() wherever the graph reads one (#1944)

**STATUS: PR open from `fix/repaint-guard-holes`.** Test only, in `apps/studio/test-shell-imports.ts`: no ENGINE bump, no CONTRACT bump, no change note. No emitted artifact moves, and nothing under `apps/studio/src/` changes.

**What was wrong.** The import arm had two holes, filed from #1928. Both were reproduced on `main`'s guard (`3fdffa28`) by planting each on disk, and each passed 47/47:
- `import * as M3 from '@prism3/studio/src/main'` in `src/shell/frame.ts`, followed by `(M3 as any)[k]()`. `resolveSpec` read any specifier without a leading `.` as a package and did not follow it. But `node_modules/@prism3/studio` links to this app, and `@prism3/studio` has no `exports` map, so the compiler and esbuild both resolve the specifier to `src/main.ts`.
- `export const load = (p: string) => import(p)` in `src/persist-local.ts`, which `src/shell/theme.ts` imports. A computed `import()` was refused only in a scanned file. In a module the graph followed but did not scan, the edge was dropped, so the module was never tainted.

**What changed.**
- **A bare specifier is resolved as the compiler resolves it.** The guard calls `ts.resolveModuleName` with the studio tsconfig's own options. The result is followed when it lands outside `node_modules` once links are followed, and is a package when it lands inside. So `@prism3/studio/…` is followed into this app, and `@prism3/engine/…` into the engine's source. A third party (`typescript`) is not followed. On today's tree the walk reads 80 modules, 48 of them outside `src/` (was 32 and 0). Engine's only computed `import()`s are in its gate scripts, which no studio module imports, so following the engine flags nothing.
- **Every resolved path is made real, and so is the guard's root.** This closes a third spelling of the first hole: a relative path through `node_modules` (`../../node_modules/@prism3/studio/src/main`) used to resolve to a path string that was not `main.ts`'s, so it was never tainted. Making `ROOT` real keeps the comparison even on macOS, where `/tmp` is a link to `/private/tmp`.
- **A computed `import()` in a followed module ends the path at that module.** That module, and every module with a path to it, is refused under its own message: `imports "…", which reaches a dynamic import() with a computed specifier`. This is a separate message from "reaches src/main.ts", because the guard cannot know where such an import goes, only that it cannot follow it. A literal `import('./other')` in a followed module is still followed and passes.
- **An on-disk check of the resolver itself.** `"@prism3/studio/src/main"` must resolve, from `frame.ts`, to this checkout's `src/main.ts`. In a worktree whose `node_modules` links to another checkout (which `CLAUDE.md` forbids), the link would land on the other checkout's `main.ts` and the bare-specifier arm would be blind there. So that case fails loudly rather than passing on nothing.

**How it is proven.** Seven new in-memory fixtures in the `fxFails`/`fxPasses` style. The fixture tree now models the `npm ci` link (`node_modules/@prism3/studio` → the app) and a `package.json`. Coverage: the workspace link directly, through a module, and as a relative path through `node_modules`; a third-party package whose `index.js` re-exports `main` (not followed); a computed `import()` one module and two modules away (the second through a bridge outside `src/`); and a literal `import()` that passes. The real tree stays green at **56/56** (was 47/47).

Mutations (wip-committed first, each restored with `git checkout --` and the tree confirmed clean):

| Mutation | Fails by name |
|---|---|
| M1: a bare specifier read as a package again | `the workspace link "@prism3/studio/src/main" → …`, `the workspace link through a module → …`, `"@prism3/studio/src/main" resolves to this checkout's src/main.ts (got nothing)` |
| M2: a relative result not made real | `a relative path through node_modules → …` |
| M3: the `node_modules` rule dropped (follow every package) | `a third-party package passes (got: … imports "some-pkg", which reaches src/main.ts)`, `a third-party package ("typescript") is not followed` |
| M4: a computed `import()` dropped from the graph again | `a computed import() in a followed module → …`, `a computed import() two modules away → …` |
| M5: on disk, `import * as M3 from '@prism3/studio/src/main'` in `src/shell/frame.ts` | `src/shell/frame.ts:656: imports "@prism3/studio/src/main", which reaches src/main.ts` |
| M6: on disk, `export const load = (p: string) => import(p)` in `src/persist-local.ts` | `src/shell/theme.ts:13: imports "../persist-local", which reaches a dynamic import() with a computed specifier`, `src/shell/frame.ts:49: imports "./theme", …` |

M5 and M6 are the two plants that passed 47/47 under `main`'s guard.

**Merge with the UI lane.** The UI lane's PRs add `MUST_SCAN` lines to this file. This PR does not touch `MUST_SCAN` or `NEW_DIRS`, so those merges should be trivial.

**Still gets past, unchanged.** A run-time key (`m[k]`) on a global the page itself put there. Also a callback `main.ts` lends the shell, which is reviewed where it is written (header, "What a static scan of the shell cannot see").
