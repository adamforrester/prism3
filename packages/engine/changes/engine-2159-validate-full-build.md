---
engine: minor
---
MCP `validate_brand` runs the same build path as `theme_brand` (#2159): `brandTheme`, then `buildTree`.
Since #2158 it ran `brandTheme` alone, so a refusal that fires only once the modes resolve, such as an
override naming an unknown palette or step, still passed `validate_brand` and then failed `theme_brand`.
Those refusals are now reported in the engine's own words. The guard is unchanged: a schema-invalid input
never reaches the build. No token, name or value moves.
