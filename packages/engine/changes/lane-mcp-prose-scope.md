---
engine: patch
---
The MCP server's `theme_from_brief` `brief` argument description no longer uses an RFC 2119 `MUST`
(#1806): "It must open with a --- YAML frontmatter fence on the first line." The voice standard permits
those levels in the payload channel only, and an MCP description is not that channel. Found by the
voice gate's new MCP scope: `lint-us-english.ts` and `lint-voice.ts` now scan `tools/list` as the
server returns it over stdio (`mcp-served.ts`), with the six tool names asserted present. No committed
artifact moves.
