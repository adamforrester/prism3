## (2026-11-11) — The usage panel says each thing once (#3552 Q-UG3, Q-UG4, Q-UG5)

The 2026-11-11 usage-guide scan (#3552) found three places where a panel says the same thing twice. The owner took option A for each.

**Q-UG3, a component in two Related lists.** Each component now appears once, in the first list that names it: Built from, then Instead, consider, then Often used with, then Supersedes, then Superseded by. There are two layers to it, and each needed its own fix:
- **The engine's section model** (`component-doc-sections.ts`) dropped only a partner the def is built from. It now carries one `seen` set across all five lists, so a def that names one id twice (Tag's Badge, Checkbox.Group and Radio.Group, as alternatives and as partners) shows it in the first list. Eleven Markdown pages lose a repeated name. Radio row's Superseded by line goes, because Select is already under Instead, consider. That follows the owner's order as written, and it is the one case where the dropped line was a status rather than a suggestion.
- **The panel's family collapse** (`doc-panel.ts`) worked per list, and that is invisible to the model. Dialog is built from Button.Group and names Button, Button.Neutral and Button.Destructive as partners, all distinct ids, all of them "Buttons" on the panel. The collapse now keeps one set across the lists. Before: 16 repeated pairs on 12 lead panels. After: none.

**Q-UG4, the lede twice.** In "In this family", the lead's line is its name alone, because the panel's lede is already its summary. The other members keep their summaries.

**Q-UG5, a slot and its run read alike.** A part (not the root) that holds a numbered nested part is labeled for what it holds, "Item slot", generated from its first such child's key. So Breadcrumbs reads `2 Item slot` above `3 Items 1–2`, and Code input reads `3 Cell slot`. There are nine such slots, all named `items` today. The label wording is DRAFT under Q10.

**Gates.** `lint-component-docs.ts` holds the page to the once-rule with its own order (`RELATED_ORDER`), placing each id on its first list's line, plus a new `RELATED TWICE` arm. `test-doc-panel.ts` adds `related/dialog`, `related/tag` and `related/every lead`, and `legend/slot` over every def (each slot reads "<run name> slot", and no label reads like a run after it). `present/<lead> family` now requires the lead's line to be its name alone. The legends typed in `legend/…` move from "Items" to "<run name> slot". Mutations, each failing by name:
- the model's `seen` dropped → `lint-component-docs` fails `RELATED TWICE` and `EXTRA VALUE (page)` (174 problems);
- the panel's set reset per list → `related/dialog` and `related/every lead`;
- the lead's summary back on its line → all 15 `present/<lead> family`;
- the slot label dropped → `legend/slot` and the four typed legends.

The plan hash moves, so each lead's panel is due once on the next Update. `doc-panel.ts` is outside `lint-executor-revision`.
