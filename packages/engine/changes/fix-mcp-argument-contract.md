---
engine: minor
---
Every MCP tool now refuses an argument its input schema doesn't declare, and an `include` value outside its enum, by name (`unknown argument(s): foo. Valid: …`, `unknown include section(s): tokenz. Valid: …`), instead of ignoring it. An `include` that isn't an array, such as `include: "tokens"`, is refused too (`include must be an array (got string)`); `export_theme` used to throw on one. `theme_brand` and `validate_brand` still accept a bare BrandInput (#4120). This change is #4122. `theme_brand` and `theme_from_brief` also declare the `outputSchema` their `structuredContent` already met, so the agent reference stops saying they return none (#4151).
