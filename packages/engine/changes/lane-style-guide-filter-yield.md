---
engine: minor
---
#1778 + #259 (claimed as 0.199.0 on its own branch, and as 0.204.0, 0.209.0, 0.215.0 and 0.217.0 on #1788's, before #1807) (owner decisions, 2026-09-29): the style-guide generator runs ONE TABLE AT A TIME.
A `tables` option (panel Customize field, agent-link arg) draws only the tables named, by title or key; an
unknown name is reported; a filtered run supersedes nothing and re-stacks only its own pages. The executor
yields to the host after every table and every ~28 cells (the component writer's `realYield`), and reports
"table 7 of 22" to the pill and to an agent as progress phase `table`. The header FILLs its table instead of
keeping the component's page width, and the grid follows the owner's examples: HUG tracks, FILL cells, text
on one line (the FIXED columns and wrapped descriptions of 0.197.0 are gone). A plugin behavior change
(principle 5) → ENGINE bump; no engine emission or projected surface moves, so `out/**` + `schema/*` are a
stamp-only regen. CONTRACT STANDS at 14.0.0. Design record: `docs/45-style-guide-generator.md`. In the same
release (review round, owner decisions 12/13): a 2px track gap, the swatch FIXED at its component's size in its
cell, a filtered run that moves only the tables below the ones it redrew, and one style-guide run at a time
across the panel and the agent link (#1785). Owner decision 13, clarified: the specimen by role, with a ground
only where it must sit on something — a palette row's swatch sits in its cell with no ground.
