## (2026-11-19) — theme_from_brief reads the standard design.md dialect (#4118)

`theme_from_brief` ran only `parseDesignMd`, so a standard design.md — the shape an extraction exports, and the
one `skills/prism3-theme` tells an author to keep — was read as a BrandInput and refused with errors that sent the
agent the wrong way (`missing required 'id'`, `colors: unknown property`). The CLI has detected the dialect since
#556. The tool now runs the same detection (`parseStandardDesignMd` → `isStandardDesignMd` → `standardToBrandInput`)
and reports `dialect`, the classification log, `xApplied` and `xWarnings` beside `derivedBrandInput`. This
supersedes #4200 Q2 (the owner chose accepting both dialects over a description-only fix).

- **Test:** `mcp-test.ts` journey ⑦ sends the issue's standard brief over real stdio (6 `#4118` arms). On `main`:
  6 failed. With the fix: 91 passed.
- **Mutation:** the standard branch removed (always the engine-native parser) fails the `#4118` arms by name.
- **Left for others:** the parse error for a file with no fence still says "standard design.md must open with…"
  for either dialect, as the CLI's does (#4200 E, #4029). The tool's description still says "plus prose", which
  #4200 D holds for the owner.
