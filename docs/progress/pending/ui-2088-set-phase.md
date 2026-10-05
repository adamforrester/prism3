## (2026-10-05) — Activity: a set build's first phase line names the set, or none (#2088)

**STATUS: branch `ui/2088-set-phase`.** UI and tests only. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. Fixes #2088.

**The owner's decision (2026-10-05).** Until a build's first chunk boundary reports, the Activity drawer's phase line for Build set said "Building the Button set…" whatever set was building, a string left from when Button was the only set (#718). A build the panel started now names its set: "Building the ‹Set› set…", with the set's display name from the component catalog (the same `name` the Components page shows), looked up by the id the panel posted (`HostSession.componentDef`). A build an agent started names none, because the panel was not told which set it is: the line reads exactly "Building the set…", the owner's wording.

**One function, both readers.** `firstPhase()` in `apps/studio/src/main.ts` answers for the drawer's `componentPhase` and for `componentPendingText`, whose comment says the two read the same words. The pending-pill reader has no live caller for the component build since S8.2 retired the page's pill; it moved with the drawer rather than keep the stale string.

**The check (`test:verdict`, `#2088`).** Both arms read the phase line BEFORE any `component-progress` is posted, the only window the line exists in. A panel build of Tag must read exactly "Building the Tag set…" and must have posted `tag`; an agent's `build-components` with no progress must read exactly "Building the set…". The expected strings are literals, never read from the catalog the code reads.

**Mutations, after a `wip:` commit, restored with `git checkout -- <file>`:**
- `firstPhase` back to the literal "Building the Button set…": both arms fail by name, `✗ #2088 a panel build of Tag reads exactly "Building the Tag set…" before its first boundary — posted ["tag"], read ["Building the Button set…"]` and `✗ #2088 an agent's build reads exactly "Building the set…" before its first boundary — read ["Building the Button set…"]`.
- `firstPhase` ignoring `componentDef`: `✗ #2088 a panel build of Tag reads exactly "Building the Tag set…" before its first boundary — posted ["tag"], read ["Building the set…"]`.
