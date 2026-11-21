---
engine: minor
---
MCP results cost less to read (#4150, #4147). A structured tool result's text copy is now compact JSON, so `theme_brand` with tokens and aiMetadata comes to about 2.0 MB instead of 2.7 MB. `list_levers` takes `summary: true` and returns the compact catalog, about 7,000 characters instead of 31,500: each lever's key, group, control, range or option values and default, plus the non-lever fields and the required fields by name. The tool descriptions, the withheld-sections hint and the engine README now state one size for each section (tokens about 440,000 characters, aiMetadata about 560,000), and `mcp-test.ts` holds each to within 15% of the measured size.
