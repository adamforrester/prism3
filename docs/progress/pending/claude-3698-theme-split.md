## (2026-11-14) — `theme.ts` is split per axis behind the same exports (#3698 F4, R5 item 2)

**STATUS: PR open, not merged.** ENGINE stands (no engine output moves, so no change note), CONTRACT stands. Refactor 2 of the four R5 refactors, on top of the facade (#3776). Files: `packages/engine/theme.ts` (now a barrel), ten **NEW** modules `packages/engine/theme-{types,color,dims,motion,type,shadow,layout,gradient,brand,nb}.ts`, `packages/engine/lint-theme-split.ts` (**NEW** gate, registered in `ci.yml`, `verify.ts`, `CONTRIBUTING.md` §3, the PR template and `CLAUDE.md`), six readers that parsed `theme.ts` as text (`lint-voice.ts`, `emit-figma-conventions.ts`, `lint-ecosystem.ts`, and `apps/studio/`'s `test-shell-imports.ts`, `test-name-refs.ts` and `test-smoke.mjs`), `docs/public/reference/figma-conventions.json` (one provenance pointer), and three doc pointers (`packages/engine/README.md`, `docs/07-e2e-journey.md`, `skills/prism3-motion/SKILL.md`).

**What moved.** `theme.ts` held every axis in 3,733 lines. Each top-level declaration moved, text unchanged, to one module by line range, with the module's imports worked out from what its declarations reference (a TypeScript AST walk, not by hand). Every original line from 22 on appears exactly once across the ten modules. The edits beyond the move: the import lines, a short header per module, and `export` on 16 helpers another module now calls (`buildMotion`, `buildTypography`, `buildShadow`, `buildLayout`, `buildGradient`, `STATUS_DEFAULTS`, `statusRamp`, `hueDist`, `n2`, `n4` and six more). `theme.ts` names its re-exports, so the 16 are not new names on `./theme`: it exports exactly the 125 names it exported before (the two name lists compared equal).

**Why flat `theme-*.ts`, not a `theme/` directory.** It matches the engine's existing family layout (`emit-figma.ts` with `emit-figma-color.ts`, `-dims`, `-font`, `-styles`), and the gates that scan `packages/engine/*.ts` (`lint-voice`'s note sites, `lint-locale-order`, the facade's INWARD arm) keep every moved line in scope without learning a subdirectory. A `theme/` directory beside `theme.ts` would also make `./theme` resolve by file-before-directory precedence, which reads as a trap.

**The shared types.** `theme-types.ts` holds `Theme`, `BrandInput`, `ModeLevers`, `Dims`, the palette and surface types, and the input enumerations and validators those types are built from. It imports the axis types (`Typography`, `MotionAxis`, `ShadowAxis`, …) as types only, so the cycles between it and the axes are erased before anything runs. The value imports form a tree with `theme-brand.ts` at the top. `n2` and `n4` (note-prose number formatting) moved into it because both `brandTheme` and the layout axis's grid notes use them; left in `theme-brand.ts`, layout would have imported a value from brand, and brand imports layout.

**A comment the split repaired.** The typography axis's header comment was cut mid-sentence ("The role" / "set is data-driven") by the disabled-floor constants someone had inserted inside it. Those constants went to `theme-color.ts`, so the comment now reads through in `theme-type.ts` with no text edit.

**The readers that parsed `theme.ts` as text.** Six oracles read a declaration out of the file by path. Each one that ran failed loudly at the barrel, which is the right failure:
- `lint-voice.ts` `NOTE_PUSH_SITES`: all 51 `notes.push(` sites are in `brandTheme`, now keyed `theme-brand.ts: 51`.
- `emit-figma-conventions.ts`: the root-default anchor `const root = input.root ??` lives in `theme-brand.ts`. Its `source` in `figma-conventions.json` is the **one artifact line that changes**: a provenance pointer, no token or rule text.
- `lint-ecosystem.ts` `TOOL_MODULE.theme_brand`: the module that defines `brandTheme` is `theme-brand.ts`. Its `takes` walk still finds the MCP server and both lanes through the barrel and the entry.
- `test-shell-imports.ts`: `ModeLevers` is read from `theme-types.ts`.
- `test-name-refs.ts`: it reads `BrandInput`, `SurfaceMode` and nested input types (one of them `GradientInput`), so it reads every `theme-*.ts` module.
- `test-smoke.mjs`: `OUTLINE_WASH_DEFAULTS` from `theme-types.ts`, `DURATION_BASE` and `TEMPO_FACTOR` from `theme-motion.ts`.

**Proof.** `regen --check` is in sync: 230 artifacts, none changed except that pointer. Bundles were built on `main` (f86f1730) and on this head, then split at esbuild's `// <path>` module markers: web `main.js`, plugin `main.js` and `ui.html` in the dev, release and offline builds. Every non-theme module is present in both and byte-identical, except the build-stamp lines. The theme code is `main`'s `theme.ts` line for line in the dev builds (multiset of lines). In the release builds it matches declaration for declaration (327/327 in `main.js`, 331/331 in `ui.html`), where only the minifier's statement joins at the new module boundaries differ. `theme-nb.ts` reaches no bundle, as `nbThemeFrom` reached none before. The extra bytes (+338 to +402 per bundle) are the eight new module-marker comments. No executor file changed, so `lint-executor-revision` asks for no `EXECUTOR_REVISION` bump.

**The gate.** `lint-theme-split.ts`, four arms plus a self-check. Each arm failed by name under a mutation from a `wip:` commit:
- BARREL: `export const LEAK = 1;` appended to `theme.ts`.
- CYCLE: `theme-shadow.ts` importing `ALL_MODES` from `./theme`.
- ACYCLIC: `theme-types.ts` importing `brandTheme` as a value → `theme-brand.ts → theme-types.ts → theme-brand.ts`. The control, an `import type` the same way, stays clean.
- REPRESENTED: the barrel dropping `theme-nb`'s line (orphan), and `theme-dims.ts` removed (9 modules, under the floor of 10).
- SELF-CHECK: `importsOf` counting an all-inline-`type` import as a value.

The module list is read from the directory, never from the barrel.

**Not changed.** Engine-internal importers stay on `./theme`. The facade entries are unchanged. No declaration was renamed, reordered within its module, or edited.
