## (2026-10-22) — Correction to 2026-10-22 "Option rows land on the control-height ladder (#2894, Q539)": the update moves, it does not rebuild (#2933)

The #2894 entry, the three row defs' headers and the PR recorded the accepted update cost (Q?6 A) as "a per-instance override on the nested control may not carry over". That was the risk while #2595 was open. Since #2595 (landed as #2691), an Update on a file built before #2894 **moves** the label and the control cell, nested control included, into the new `content` box and keeps every node's id, as it does for Accordion's `titleRow`. The independent review of #2917 measured this in the shim.

- **Pinned now.** `apps/plugin/test-update-apply.ts` gains an "option rows" section, modeled on Accordion's #2594 one. It rebuilds Radio.Row, Checkbox.Row and Switch.Row as they stood before #2894 (top-aligned, no floor, the control cell and label directly under the row, the constant 12px pad, none on Switch.Row) from today's defs. It then asserts:
  - the dry run lists both children as "moves into content, kept", with nothing removed;
  - every member and every moved node keeps its id;
  - each row centers `content`, which holds its children top-aligned;
  - the next dry run reads current.
- **The headers now say what the Update does.** The file needs the variables the new plans bind (`size/*/height`, `space/075`), which a token sync before the Update provides. Without them the update is refused by name, as for any set.
- **Still a host question.** Whether a placed instance's override survives the move is something the shim cannot answer, so the dry run on a copy of a shipped file stays a condition before any master update.
