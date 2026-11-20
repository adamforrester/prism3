## (2026-11-19) — theme_from_brief reads the standard design.md dialect (#4118)

`theme_from_brief` ran only `parseDesignMd`, so a standard design.md — the shape an extraction exports, and the
one `skills/prism3-theme` tells an author to keep — was read as a BrandInput and refused with errors that sent the
agent the wrong way (`missing required 'id'`, `colors: unknown property`). The CLI has detected the dialect since
#556. The tool now runs the same detection (`parseStandardDesignMd` → `isStandardDesignMd` → `standardToBrandInput`)
and reports `dialect: "standard"`, the classification log, `xApplied` and `xWarnings` beside `derivedBrandInput`. An engine-native brief returns the same keys as before, so `theme_from_brief` and `theme_brand` still return the same sections (#1868). This
follows #4118's suggested fix, which makes #4200 Q2 moot (the lane's call, recorded on #4200).

- **Test:** `mcp-test.ts` journey ⑦ sends the issue's standard brief over real stdio (6 `#4118` arms). On `main`:
  the 5 standard-brief arms fail (the sixth, an engine-native brief stays off the converter, holds on both). With the fix: 91 passed.
- **Mutation:** the standard branch removed (always the engine-native parser) fails the `#4118` arms by name.
- **After #4265:** `xWarnings` also names the typography faces the converter does not read (#4137), so the tool
  description's clause now names both kinds, and a 7th `#4118` arm holds that clause to the warning prefixes the
  payload actually carries (a new kind with no description edit fails it by name).
- **Left for others:** the parse error for a file with no fence still says "standard design.md must open with…"
  for either dialect, as the CLI's does (#4200 E, #4029). The tool's description still says "plus prose", which
  #4200 D holds for the owner.
