---
engine: patch
---
Plugin open no longer loads every page before the panel is ready (#3110). At `ui-ready` the main thread answers
`file-sets` from the as-built ledger alone, one root read with no page loaded, marked `partial`, and the badge counts
from it. The full read follows: it loads the pages one at a time and hands the thread back between them
(`loadPagesYielding`), so the file keeps answering, then replaces the ledger's answer. The panel reads a set the ledger
does not name as Checking until then, and Update file's checklist waits for the full read. `PRISM3_OPEN_TIMINGS`, when
set to an array on the global, collects each stage's time. No emitted artifact, token or projected component surface
moves, and the executor is unchanged.
