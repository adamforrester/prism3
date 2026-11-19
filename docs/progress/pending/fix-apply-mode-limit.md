## (2026-11-19) — Apply Theme checks the file's mode limit before any write (#4157)

`VariableCollection.addMode` is capped by the file's Figma plan. Past the cap it throws "in addMode: Limited to N modes only". Every executor reaches its modes through `reconcileModes`, which called `addMode` with no check first. So on a plan that allows fewer modes than the brand writes, the run passed the pre-flight, saved its named version, wrote the float stage, threw at the first `addMode`, and left the file half written, with the host's raw message as the verdict. The owner chose A (2026-11-19): refuse the whole run with one plain line.

### What changed

- `preflight.ts`: `PreflightPlan.modes` carries the modes each executor reconciles, by collection. `modesNeeded` works out what each collection will hold once the apply has run, for each one the apply adds a mode to: the modes it has, plus each planned mode `claimModes` can't claim, less the one a fresh collection renames. A collection several executors write (`core`) is planned as their union. `guardApply` runs `modeLimitOf` after a clean collision pre-flight, so a limit refuses before `beforeWrite` (the named version) and before the first write.
- `theme-ports.ts`: `modeCapOf` is the probe. Figma has no read for the cap, so it makes a scratch collection (`Prism3 mode check`), adds modes up to the need, reads N off the host's message, and removes the collection. Any other failure, such as a read-only file or a host with no such message, reads as "can't say", and the run meets it where it did before. A file the apply already wrote adds no mode, so it is never probed.
- `main.ts`: the refusal is `apply-result`, `ok: false`, headline `✗ not applied`, with one line: "This file's Figma plan allows N mode(s) per collection; Prism3 needs M. Move the file to a team on a plan with more modes." The agent gets `modeLimit: { allowed, needed }` as data. Both strings are DRAFT.
- `apply-a-theme.md` lists the refusal under "What makes it refuse". Lines added to `main.ts` and `preflight.ts` moved 22 guide citations, and they're re-pointed.

### Tests

- `test-agent-link.ts`, "mode limit": an empty file whose `addMode` throws the issue's message. The panel's verdict is the line. The only writes are the probe's three (create, `addMode`, remove): no named version, variable, style or persisted brand. The agent's result carries the data. On `main` all three arms fail, and the first write recorded is `saveVersionHistoryAsync`.
- `test-write-preflight.ts`: `modesNeeded` for a fresh file (color needs 4), a file the apply already wrote (needs nothing, probe never asked), and a color collection holding 2 of its 4 modes (needs 4, and a cap of 1 is a limit).

### A test that only passed by coincidence

`test-mcp-paste.ts` compares the plugin's apply with the paste runtime's by value, with every id replaced by a name. Its variable values went through `val`, which renames only a top-level alias, so a wash's nested `{ color, opacity }` aliases were compared as raw ids. They matched only because both shims happened to allocate the same ids. The probe's scratch collection takes ids the paste run doesn't, and the comparison broke. It now uses `deep`, which the same function already applies to styles, so nested aliases are compared by name as well.

### Not covered

The MCP paste runtime (`mcp-steps.ts`) calls `preflightApply`, the read-only half, not `guardApply`, so a paste-driven apply still meets the cap at `addMode`. That runtime is a parity harness and doesn't save a named version first.
