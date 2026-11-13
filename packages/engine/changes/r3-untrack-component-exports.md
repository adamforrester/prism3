---
engine: minor
---
The three whole-catalog component exports, `out/components/component-defs.json`, `component-defs.specs.json` and
`specs.json`, are no longer committed (#3698 R3). `regen` still writes them with the same bytes, and every reader in
the repo generates them first, so a clone of the repository no longer carries them until `regen` runs (or
`npx tsx packages/engine/emit-component-docs.ts --uncommitted --out <dir>`). The MCP and the CLI build a brand's
export live, as before.
