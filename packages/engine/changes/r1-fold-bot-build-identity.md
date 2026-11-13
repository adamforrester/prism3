---
engine: minor
---
A build identity, `<ENGINE_VERSION>+pending.<n>` (n = change notes pending since the last fold; the plain version when
none are), in the output the engine writes live (#3698 R1). The MCP server reports it as `serverInfo.version`. A token
tree the MCP or the CLI writes for a brand carries it as `$extensions.generator.build`. A brand's component-defs export
carries it as `build`, which is new in format `prism3-component-defs/1.3`. The committed corpus carries none: `cli.ts
--committed`, which regen passes, writes the plain version. `generator.version` and `engineVersion` are unchanged.
