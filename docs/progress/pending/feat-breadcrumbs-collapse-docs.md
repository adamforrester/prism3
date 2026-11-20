## (2026-11-18) — Breadcrumbs: the collapse, decided and written down (#2922)

The owner approved the wireframe's recommendation on every call (Q1–Q5 A, 2026-11-18). The build keeps the model #2666 shipped and makes its contract say what was decided. No member, axis or token moves; the docs pages and the plans' `codeOnly` move, so the change note declares `engine: minor`.

- **Q1 A, Q2 A:** collapse by count now; a width collapse arrives with the menu, hiding middle steps from the root side down to the root, overflow, parent and current. Expand in place now; `collapse: 'menu'` joins and becomes the default once Menu ships. `collapse` still offers `expand` alone.
- **Q3 A:** "Show full path" in both modes; expand mode has no `aria-expanded`, because the button is removed once pressed.
- **Q4 A:** the parent path below 480px; the collapse runs only at 480px and wider.
- **Q5 A:** the built Figma model (a middle item at `kind=overflow`), one line in the description ("To show a collapsed trail, set a middle item to overflow."), and the collapsed and expanded trails written out in the usage docs and a do item.
- **Tests:** `#2922 breadcrumbs/collapse …` arms in `packages/engine/test.ts`, one per call, against literals from the wireframe.
- **Held for the owner:** two choices the wireframe left open. (1) The Figma set description is the summary, capped at 100 characters, and the collapse line does not fit beside the existing sentence, so it went into `description`. (2) The engine has no mechanism to draw example instances with edited slot content on a component page, so the collapsed and expanded examples are written in the docs rather than drawn. Both flagged on the PR.
