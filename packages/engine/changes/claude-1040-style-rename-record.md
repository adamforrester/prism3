---
engine: patch
---
Text, effect and gradient styles have a rename record (#1040). `STYLE_RENAMES` and `STYLE_DELETIONS` in
`materialization-renames.ts` record a style name that moved or left the emission. `planStyleRenames` plans which
existing style takes which new name. The plugin's Apply Theme and paste steps rename the existing style in place
before the writer runs, so layers and library consumers follow it. The register ships empty, so no file changes
until a style is renamed. `lint-materialization-renames.ts` now also fails a style name that left the emission with
no rule or deletion claiming it.
