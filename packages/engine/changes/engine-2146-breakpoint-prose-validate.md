---
engine: minor
---
The breakpoint prose says the first is always 0, and `validate_brand` reports the engine's own refusals
(#2146). The `layout.breakpoints` lever description changes "Studio keeps the first at 0px." to "The first
is always 0px.", and the schema's `breakpoints` description gains "The first must be 0." (owner decision
2026-10-05, Q26 a). The lever text moves `schema/lever-manifest.json`. MCP `validate_brand` checked the
schema only, so it called a brand valid that `theme_brand` then refused: a first breakpoint that isn't 0
(#2132) or an empty or reversed viewport range (#2068). It now also runs `brandTheme` on a schema-valid
input and reports what it refuses, in the engine's own words. No token, name or value moves.
