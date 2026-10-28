---
engine: patch
---
Plugin open no longer loads every page before the panel is ready (#3110). At `ui-ready` the main thread answers
`file-sets` from the as-built ledger alone, one root read with no page loaded, marked `partial`, and the badge counts
from it. The full read follows: it loads the pages one at a time and hands the thread back between them
(`loadPagesYielding`), so the file keeps answering, then replaces the ledger's answer. Every other place in `main.ts`
that needs every page loads them the same way, Build style guides and its cleanup included. The agent link's component
payloads (`mcp-steps.ts`, off by default) are not changed. Both reads after open carry `atOpen`: the panel never lets one replace
an answer it asked for, so a checklist opened mid-read keeps its own answer. The panel reads a set the ledger
does not name as Checking until then, and Update file's checklist waits for the full read. `PRISM3_OPEN_TIMINGS`, when
set to an array on the global, collects each stage's time. No emitted artifact, token or projected component surface
moves, and the executor is unchanged.
