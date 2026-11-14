## (2026-11-14) — the surfaces import the engine through four public entries (#3698 F4, R5 item 3)

**STATUS: PR open, not merged.** ENGINE stands (no engine output moves, so no change note), CONTRACT stands. Refactor 1 of the four R5 refactors; the `theme.ts` split, the PartDef union and style-as-data rebase on it. Files: `packages/engine/index.ts`, `index-components.ts`, `index-figma.ts`, `index-harness.ts` (**NEW**, re-exports only), `packages/engine/package.json` (four `exports` entries, `sideEffects: false`), `packages/engine/lint-engine-facade.ts` (**NEW** gate, registered in `ci.yml`, `verify.ts`, `CONTRIBUTING.md` §3, the PR template and `CLAUDE.md`), `packages/engine/lint-ecosystem.ts` (its resolver follows the bare `@prism3/engine`), every surface file that imported the engine (196 under `apps/studio` and `apps/plugin`), `apps/plugin/src/executor-revision.ts` and `executor-reach.json` (58, no sets), `packages/engine/README.md` (a short "Import it from a surface" section), and 59 citations across 9 guides in `docs/public/guides/` (line numbers only: the merged imports and the README section moved the cited blocks).

**What was wrong.** The studio and the plugin imported 42 deep engine paths, plus one relative path from bundled plugin source (`file-facts-figma.ts` → `../../../packages/engine/file-facts`) and three esbuild entry points in `test-chrome.mjs`. A file move or split inside the engine broke both bundles, which is why the `theme.ts` split waits on this.

**The entries.** Four, split along lines the repo already enforces, so no existing gate had to learn a new rule:
- `@prism3/engine` — the token core, plus the component rename record. No module here defines a component or imports the projector, so the web studio imports it freely.
- `@prism3/engine/components` — definitions, schema, the Figma projector and its readback. `test-shell-imports.ts` already refuses the `@prism3/engine/components` prefix in the web studio's run-time files, and `vercel-ignore-check.mjs` measures that no definition reaches the web bundle; both hold unchanged.
- `@prism3/engine/figma` — the plugin's writers. All on the Vercel skip list.
- `@prism3/engine/harness` — node-only helpers for tests and gates: `emit-brandinput`, `nb-fixture`, `materialise-to-figma`, `nb-measured.json`, `mcp`'s server info, `comparison-base`. The gate refuses it in a bundled root.

**Where the component rename record goes.** `component-renames.ts` (pure data, no imports) went to `/components` first, and two readers refused it there:
- The plugin's MCP paste steps (`mcp-paste.ts`) serve `anatomy-figma` as one lifted function, `figmaVarName`, so a step that reached `component-specs` or `component-defs-export` through the entry did not build. `reactions.ts` brings the record into the step graph.
- Moved to `/figma`, the record broke the studio's typecheck, which reaches `apps/plugin/src/executor-reach.ts`. Through the entry it then checked `emit-figma-font.ts` and `file-facts.ts`, which hold three unused declarations that the studio's `noUnusedLocals` refuses.

In the core entry, beside `version.ts`'s `DEPRECATIONS`, neither reader sees anything new.

Each entry names what a surface uses, no `export *`. The two JSON fixtures are re-exported as `EXAMPLE_BRANDS_JSON` and `NB_MEASURED_JSON`. The deep subpaths stay in `exports`: `tools/`, the engine's own lints, and `lint-executor-reach.ts` (which draws main's executor, still on deep paths, against this tree's engine) resolve through them.

**The trap: `sideEffects: false`.** Without it, the plugin's `main.js` grew 14 KB and `ui.html` 11 KB. `preview.ts` and `component-renames.ts` build top-level data with `.map(...)`, which esbuild cannot prove pure, so it kept them once an entry re-exported them, even unused. No engine module is imported for its side effects, so the declaration is true. With it, every bundle has the same module set as `main` (web `main.js`; the plugin's `main.js` and `ui.html` in the dev, release and offline builds; each of the 18 MCP paste steps, compared unminified), and the non-engine modules keep their order. Every module body is identical except for esbuild's collision suffixes (`keyOf3` → `keyOf4`) and the build stamp. Beyond those, the plugin's `main.js` differs only where `EXECUTOR_REVISION` is inlined (57 → 58). Sizes: web `main.js` +2 bytes, plugin `main.js` +21, `ui.html` +2. The 18 MCP steps: 7 byte-identical, the rest within 4 bytes of minifier renames.

**The executor bump.** Moving import lines changed `write-components.ts`, `reactions.ts` and `write-styles.ts` as printed code, so `lint-executor-revision` required 57 → 58. The entry names no sets, because `lint-executor-reach` drew all 62 sets × 10 arms with main's executor and this tree's and found 0 redrawn. That is the plugin's behavioral proof.

**The gate.** `lint-engine-facade.ts`, five arms that can fail plus a self-check, each fails by name under a mutation from a `wip:` commit:
- DEEP IMPORT: `import { ENGINE_VERSION } from '@prism3/engine/version'` in `apps/plugin/src/main.ts` → `DEEP IMPORT: apps/plugin/src/main.ts:22 imports '@prism3/engine/version', a deep path…`. A relative path to an entry's file also fails.
- BUNDLED: the harness imported from `apps/plugin/src/page-moves.ts`.
- DECLARED: `export * from "./theme"` appended to `index.ts`.
- INWARD: `tree.ts` importing `./index`.
- REPRESENTED: each surface and each bundled root that uses the engine imports an entry, over a floor of 300 scanned files.

The entry names are typed in the gate, never read from `exports`, which also lists the deep paths.

**A chrome flake, not this change.** One run of section 13b ("Status seed") timed out on a `locator.fill` of `status-danger-hex` after its first two cases passed. The rerun passed 7,076/7,076. The oracle this PR moved onto the entry had already resolved by then. Filed as #3775.

**Not changed.** Pruning the deep subpaths from `exports` waits until `tools/` and the engine's own scripts move, and until no open branch's executor still imports a deep path.
