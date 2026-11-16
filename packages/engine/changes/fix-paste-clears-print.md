---
engine: patch
---
The agent paste clears the emission print in every write step and stamps it again in its last (#3742, the paste's half of
#3697 M3). A paste that stops part-way (an agent session ending, a step that throws, the file closed between steps) no
longer leaves the old print beside the half-written variables, so the recount reads the file as due rather than as
matching the brand it held before, and Theme opens ticked. Plugin only; no committed artifact moves.
