---
engine: minor
---
#1868: the MCP tool theme_from_brief returned no decisions log unless the caller named sections,
because its include default was an empty list, while its description promised the same payload as
theme_brand, whose default is the decisions log. Both tools now share DEFAULT_THEME_SECTIONS, and
theme_from_brief's include description says it replaces the default. A behavior change to a shipped
tool's default output, so an ENGINE bump. CONTRACT STANDS (no token name moves).
