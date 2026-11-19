---
engine: minor
---
The MCP tool `theme_from_brief` reads a standard design.md (a flat `colors:` hex map, `typography:` tokens, an optional `x-prism3:` block) the way `cli.ts` does, instead of refusing it as a malformed BrandInput (#4118). The payload gains `dialect` (`standard` or `engine-native`), and for a standard brief `classification` (how each color was read), `xApplied` and `xWarnings` (the `x-prism3:` keys it skipped).
