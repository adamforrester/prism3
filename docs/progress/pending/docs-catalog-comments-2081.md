## (2026-10-04) — four comments point at the component catalog, not the retired COMPONENT_CATALOGUE (#2081)

**Status:** comments only, in four files: `packages/engine/button-spacing.ts`,
`packages/engine/lint-standalone-floor.ts`, `apps/plugin/mcp-paste.ts`, `apps/studio/gen-used-by.ts`. No code,
emitted or bundle change; no ENGINE bump.

### What changed

S8.1 replaced `main.ts`'s `COMPONENT_CATALOGUE` with `catalogOf` and `providedCatalog` in
`apps/studio/src/state/component-catalog.ts`, which the plugin's iframe entry
(`apps/plugin/src/ui/component-catalog.ts`) supplies. Four comments outside that PR still named the old one.
Each now points at the current names. The rule each describes is unchanged: not `notStandalone`, and the
projector doesn't throw.

`button-spacing.ts` is also sharpened, as the issue asked. It used to say an ungated reference to the
definitions pulls their prose into the web bundle. S8.1 measured that a reference **gated** on
`PRISM3_HOST === 'figma'` did too: Button, IconButton and Icon survived it. That's why the catalog is computed
outside the web bundle, and why `vercel-ignore-check.mjs` now fails by name when a definition module adds
bytes to it. `gen-used-by.ts` gets the same correction ("one reference, gated or not").

### Left alone, on purpose

- `apps/studio/src/state/component-catalog.ts:10` records that its reasoning "moved here from `main.ts`'s
  `COMPONENT_CATALOGUE`". That's history, and it's correct.
- `docs/00-progress.md` keeps its two historical mentions; it's the log, and is never edited here.
