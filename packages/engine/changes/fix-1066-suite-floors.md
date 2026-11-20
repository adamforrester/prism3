---
engine: patch
---
The Studio and plugin unit-test chains now fail a suite that runs fewer assertions than its written floor, or prints no
count (#1066). Both apps' `test` scripts run through `run-suites.ts`, which reads each app's `suites.json`. The
export-settings mutation battery now drives the shipped predicates instead of local copies of them. Tests only; no
committed artifact moves.
