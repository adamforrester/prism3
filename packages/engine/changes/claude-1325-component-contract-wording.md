---
engine: minor
---
The component-defs export is published as component contracts (#1325, owner decision Q-CC1 A). Every writer of
`component-defs.json` now also writes `component-contracts.json`, with the same bytes: regen under `out/components/`,
`cli.ts --component-specs` and MCP `export_theme` (`<id>.component-contracts.json` beside `<id>.component-defs.json`),
and the plugin's Export. `component-defs.json` stays as a compatibility copy for one release; its Specs projection keeps
its name. The Studio's Export says "Component contracts" (DRAFT wording). The `ComponentDef` type is unchanged.
