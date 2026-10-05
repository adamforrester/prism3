## (2026-10-05) — Studio: `size-labels.ts` and its test are removed, the last of S6.3's dead code (#2038)

**Status:** studio only (`apps/studio/src/size-labels.ts` and `apps/studio/test-size-labels.ts` deleted, one
entry out of the studio `test` script, two comments). No ENGINE bump (no emitted artifact moves). CONTRACT
unchanged. No visible change.

### What changed

#2038 named two pieces of dead code left after S6.3 retired the legacy Type page:

- **`sizeColumnHeader`** in `apps/studio/src/size-labels.ts`. Only its own unit test called it. With it
  gone, the module's two other exports, `SIZE_BASE_LABEL` and `SIZE_BASE_TITLE`, had no reader but that
  same test, so the whole module goes, with `test-size-labels.ts` and its entry in the studio `test` script.
  Two comments that cited `size-labels.ts` as precedent for a pure, tsx-testable module now cite
  `provenance.ts` alone.
- **`renderRepointTable`'s line height and letter spacing branch** in `main.ts`. Already gone: S9.2 (#2063)
  removed `renderRepointTable` whole. `setRepoint` stays, because `domains/type.ts` calls it.

### How "dead" was established, not assumed

A search over `apps/`, `packages/`, `tools/`, `skills/` and the root scripts, tests included, finds no
reference to `sizeColumnHeader`, `SizeColumnHeader`, `SIZE_BASE_LABEL`, `SIZE_BASE_TITLE` or
`size-labels` after the change. Before it, the only references were the module, its test, the `test`
script, and the two comments. The bundles agree from the other side: `apps/studio/dist/main.js` and
`apps/plugin/dist/{main.js,ui.html}` carried the tooltip copy ("One base size —") zero times even BEFORE the
change, because esbuild had already tree-shaken a module nothing bundled imports.

### What the test guarded, and why losing it is safe

`test-size-labels.ts` held #1586's rule: a type-size table's base column must not read "Light". The legacy
size table it guarded is gone, and nothing renders `SIZE_BASE_LABEL` or `SIZE_BASE_TITLE`, so the test was
checking a module no screen draws.
