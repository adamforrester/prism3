---
engine: patch
---
Hygiene, no emitted file changes (#4145, #4214). `mcp.ts` no longer exports `PROTOCOL_VERSION`, an alias of
`LATEST_PROTOCOL_VERSION` that no handshake read. `lint-code-only-classes.ts` prints each disposition's meaning
(`DISPOSITION_MEANINGS`) under its counts. `SPECS_SCHEMA_VERSION` is held equal to the Specs schema pin in
`packages/tokens/package.json` by `test.ts`. The action and link anchor steps in `theme-brand.ts` call
`interactiveStepFor` instead of repeating its three cases; every brand resolves to the same steps.
