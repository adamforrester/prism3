---
engine: patch
---
The component API gets its own two versions, apart from the token contract (#1325, owner decision Q-CC1 A).
`COMPONENT_CONTRACT_VERSION` (2.0.0) covers the component contract: each component's name and status, its props (type,
required, default, values), states, variant axes and values, and slots. `COMPONENT_SCHEMA_VERSION` (1.6.0) covers the
component schema, the shape of one published entry, and its MAJOR.MINOR is the export's `format`. A new gate,
`component-contract.ts --check`, fails when either surface moves without its bump: a removed or renamed name is MAJOR,
an added one MINOR, a moved default PATCH. The baseline, `schema/component-contract.json`, is written only by
`--accept`. No emitted file changes.
