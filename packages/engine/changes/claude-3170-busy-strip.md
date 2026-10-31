---
engine: patch
---
The plugin's busy states (#3170 part 2, Q3170.1–6 A): a status strip at the panel's foot for the read after open (page n
of N) and Update file's run (the set or stage, n of N, a bar by sets, the elapsed time, "Still working on <set>" after
3 s of silence), the checklist's Updating and Updated rows, every writing control off with "Update is running", "Stop
after <set>" at a set boundary, and the verdict line. The in-place update and Apply Theme post `run-progress` and hand
the thread back at every set or stage boundary, after about 50 ms inside a set, and every 200 color variables. Plugin
and panel only: no committed artifact, emission or component surface moves, and the executor is unchanged.
