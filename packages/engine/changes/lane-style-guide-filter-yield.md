---
engine: minor
---
#1778 + #259 (owner decisions, 2026-09-29): the style-guide generator runs ONE TABLE AT A TIME.
A `tables` option (panel Customize field, agent-link arg) draws only the tables named, by title or key; an
unknown name is reported; a filtered run supersedes nothing and moves only the tables below the ones it
redrew. The executor yields to the host after every table and every ~28 cells (the component writer's
`realYield`), and reports "table 7 of 22" to the pending pill and to an agent as progress phase `table`.
The header FILLs its table instead of keeping the component's page width, and the grid follows the owner's
examples: HUG tracks 2px apart, FILL cells, text on one line, a fixed-size specimen chosen by role that sits
on a ground only where it must (none on a palette row). One style-guide run at a time across the panel and
the agent link (#1785), through the plugin's run guard (#1957). A plugin behavior change (principle 5), so
an ENGINE bump; no engine emission or projected surface moves. CONTRACT stands. Design record:
`docs/45-style-guide-generator.md`.
