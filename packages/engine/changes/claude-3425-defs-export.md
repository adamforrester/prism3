---
engine: minor
---
The component-defs export (#3425, owner decision Q45 A). TypeScript stays the only hand-edited form of a component
definition; component-defs-export.ts publishes it as generated JSON. out/components/component-defs.json is every def's
shipped fields (its components.ai.json entry) beside its spec model (its specs.json entry), with a format id, the
engine and contract versions, and a per-component digest, validated against the authored
schema/component-defs.schema.json. out/components/component-defs.specs.json is the same export as a Specs components
set, valid against the published @directededges/specs-schema 0.39.0 (packages/tokens/check-specs.mjs, stock Ajv). A
brand's own export resolves its component settings and adds each geometry token's px: cli.ts --component-specs, MCP
export_theme include ["componentSpecs"] (opt-in), and the Studio's Export > Component specs in the Figma plugin.
projectDef moves to project-def.ts, re-exported from emit-component-docs.ts. The drift gate's artifact count rises by
two. No token path moves, so CONTRACT is unchanged; no executor code moves.
