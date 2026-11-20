## (2026-11-19) — TokenPress: a team-library alias exports as a reference, marked external (#4166)

TokenPress built its alias map from `getLocalVariablesAsync()` alone. A local variable aliasing a variable from an enabled team library pointed at an id the export had no record of: the DTCG exporter wrote `{VariableID:…}`, validation reported it as a broken alias (an error, so the export was blocked), and the raw-figma format named the target `Unknown`. That matters to Prism3 because `prism3-rebind` covers files that consume Prism3 as a published library: every rebound token hit this.

The owner chose C on #4166: a reference, plus an `$extensions` marker.

### What changed (inside TokenPress's own patterns; nothing aligned with the engine)
- **Scanner.** `TokenScanner.resolveExternalAliasTargets` resolves each alias target missing from the local set with `figma.variables.getVariableByIdAsync`. It looks each id up once, follows a remote alias chain up to 10 hops, and reads each target collection's name with `getVariableCollectionByIdAsync`. An id the API can't resolve is left out, so it stays a broken alias.
- **Exporter.** `exportToZip` records the targets. The file's variable map includes them, so the alias emits `{brand.primary}` and type and scope inheritance follow the remote source like a local one. The token gets `$extensions.figma.externalAlias: { variableId, variableKey, collection }` whether or not the Figma-metadata option is on, because it qualifies the `$value`.
- **Validator.** `validateAll` takes `externalVariables`, so a resolved library target is not broken. `code.ts` resolves them before validating.
- **Raw-figma.** `getRawFigmaData` uses the same map, so the alias names its target.
- **Tests.** `tests/unit/external-library-alias.test.ts`, 8 tests in the `ADDED` census, all failing against main. Three drive the production call sites: `exportToZip` through a stand-in `figma`, `getRawFigmaData`, and a two-hop library chain through the scanner (review follow-up).

### Not settled here
The decision says the marker names "the library". The Plugin API gives a library's name only through `figma.teamLibrary`, which needs the `teamlibrary` manifest permission. This PR records the target's collection name and variable key instead, and asks the owner on the PR whether to add the permission.

Text-style and gradient bindings to a library variable are not covered. Those maps still hold local variables only. Filed as #4366.
