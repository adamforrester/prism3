---
engine: minor
---
The MCP tool `theme_from_brief` reads a standard design.md (a flat `colors:` hex map, `typography:` tokens, an optional `x-prism3:` block) the way `cli.ts` does, instead of refusing it as a malformed BrandInput (#4118). For a standard brief the payload gains `dialect: "standard"`, `classification` (how each color was read), `xApplied` and `xWarnings` (the `x-prism3:` keys and the typography faces it skipped, the same list the CLI prints).
