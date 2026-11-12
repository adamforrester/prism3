## (2026-11-12) — lint-decisions-index: the scope floor is a stated list, not read off the baseline it guards (#1162)

**What moved.** Gate only; no engine change. Arm C's floor, `KNOWN_DECISION_DOCS`, was computed from `decisions-index.json`, the baseline the gate guards (docs/34 shape 1). A new `REQUIRED_DECISION_DOCS` constant now states the 11 docs that carry a `Decided (...)` heading, and it is checked in both directions. A listed doc must be cited in the baseline (`REQUIRED DOC NOT INDEXED`) and found carrying a heading (`SCOPE NOT REPRESENTED`). A doc the baseline cites, or that the scan finds a heading in, must be listed (`DECISION DOC NOT LISTED`).

**The red, measured first.** The issue's exact mutation, deleting every baseline row for one doc, was already caught: arm B fails on the doc's heading as `UNINDEXED DECISION`. The silent case is rows and headings gone together, or the regex going blind in one doc while its rows are dropped. Deleting docs/46's row and retitling its heading `## Agreed (` reported `✓ clean`, exit 0, on `main`.

**Mutations, each committed against first.**
- The same docs/46 mutation now exits 1 with `SCOPE NOT REPRESENTED: docs/46-never-detach.md …` and `REQUIRED DOC NOT INDEXED: docs/46-never-detach.md …`.
- Dropping `docs/41-internal-and-ejected.md` from the list exits 1 with `DECISION DOC NOT LISTED: docs/41-internal-and-ejected.md …`.

**Cost, deliberate.** A PR that adds the first decision to a new doc now adds that doc to the list too, and the failure message says where. This is the issue's option 1. Option 2, a corpus-derived check, is already arm B in effect, so the stated list is the floor under it.
