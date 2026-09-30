---
engine: minor
---
#1809: the MCP paste script (the chunked `planSetChunks` payload) gets the two find-or-create
fixes the plugin got in #1780 and #1750. A paste over a component set whose variant AXES differ from the plan's
(an axis gained, lost or renamed) is refused on every chunk with the plugin's own `set -> AXES CHANGED` miss, and
nothing is appended into the old set. A new set pasted onto a page that already has content is placed
top-aligned with the sets there and 160px right of everything in its row, instead of at the origin over the
set before it. Chunk 1 places it; later chunks append and do not move it. The chunk shell grows 1,176 bytes, so
icon-button's set packs into 16 chunks, from 14.
