## (2026-10-21) — Colour family order follows the master: `interactive` after `icon` (#2900)

The owner's variables panel reads background, foreground, text, border, icon, interactive, disabled, scrim, veil, field, inverse. `COLOR_FAMILY_ORDER` had `interactive` before `border` and `icon`. Moved it; the emission and the Figma create order follow, inverse groups included. Within-family orders are untouched.

- **#2860's recorded "text → interactive → border → icon" was wrong.** The owner's panel is the source of truth, not that comment.
- **Gate:** the `#1150` block's `EXPECTED_FAMILY_ORDER` is the owner's list as a literal. Mutation (old order restored in `color-order.ts`, regenerated): 4 failures by name: `#1150 dtcg: the colour families are written in the owner's order`, and `#1150 figma(nb|aurora|wendys): the collection is CREATED in the owner's order`.
- **Downstream literals** in `apps/plugin/test-style-guide.ts` (table order and columns, inverse list) moved the same way.
- **Key order only:** 41 emitted files move; no token name or value changes.
- #2900 stays open for the reorder approach.
