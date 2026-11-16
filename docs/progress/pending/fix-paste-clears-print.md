## (2026-11-15) — The agent paste clears the emission print before it writes, as Apply Theme does (#3742)

**What.** #3738 made the plugin's Apply Theme clear the emission print before its first write and stamp it after its last
(#3697 M3). The agent paste (`mcp-steps.ts`) still stamped only in `runPersist`, its last script, so a paste that stopped
part-way left the old print beside new variables and `themeDue` read the file as matching the old brand. Now
`writeStep` clears the print at the start of every write step except `persist`.

**Every step, not the first.** The paste is a list of separate scripts that an agent runs, and the plan can be cut at any
ceiling (`slicing`), so "the first write step" is not one fixed script. Clearing is idempotent and costs one shared
plugin-data write per script. A host that refuses shared plugin data holds no print, so a refusal there is ignored
rather than failing the step.

**Measured.** `test-mcp-paste.ts` `interrupted`: brand A pasted whole, then brand B stopped after its first write
script and again before `persist`. Three arms fail on main (`interrupted/first step`, `interrupted/A not matching`,
`interrupted/no print`); all pass with the fix, and dropping the clear fails the same three by name.
