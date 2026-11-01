## (2026-11-01) — Update re-lays a provider-logo block still on the old 48px grid (#3145)

#3142 measured the single-component grid's pitch, so a fresh provider-logo build no longer overlaps. A file built
before it kept its overlaps through every Update: the in-place path restamps and keeps positions, and the measured
pitch only placed components the plan gained. The owner approved the fix on 2026-11-01; the re-lay rule is a technical
call within the hand-edit rules.

- **What moves.** `relayOldGrid` in `apps/plugin/src/write-components.ts`, called at the top of the emit branch on an
  update, before new components are placed. It takes the components Prism3 built (stamp and record, `builtByPrism3`, as
  the page move reads them) and acts only while two of them overlap, so the icons, which the 48px pitch fits, are never
  touched. Each mark keeps its row and column off the old grid, at the measured pitch, from the block's top-left corner.
- **Hand edits.** The as-built record leaves x and y out (`member-baseline.ts`), so no record says where Prism3 put a
  component. The old grid is the evidence instead: the pre-#3142 executor placed every component at the block's corner
  plus whole 48px steps, and a page move carries a block whole, so Prism3's placements share one offset modulo 48. The
  largest group sharing an offset is the grid. A mark off it was moved by hand and stays, as does any component Prism3
  did not build. A designer who rearranged marks within the grid keeps the arrangement; only the spacing changes.
- **When something is in the way.** If a new spot meets anything else on the page (a hand-moved mark, another block, a
  note, each widened by the 24px gap new components keep), nothing moves and the outcome carries a miss naming the mark (`… .position -> NOT RE-LAID`). Nothing is pushed
  aside to make room.
- **Reaching old files.** `EXECUTOR_REVISION` 45 → 46, and entry 46 names `provider-logo`, so a block drawn under an
  earlier revision is due, and its Update runs the re-lay.
- **Trap for re-verifiers.** A designer who drags a mark to another spot exactly on the old grid, in both axes, is read
  as Prism3's placement and re-laid with the rest, keeping that new row and column. The block's own header (#3172) is not
  resized: it is a fixed-width instance a designer may have edited, and the block grows right and down, clear of it.
- **Tests.** `test-update-apply.ts`, `relay marks/…`: the provider logos at the old pitch, stamped at revision 45 (so
  only reach entry 46 makes them due, and the dry run must read all 86 due), a designer's own mark on the grid's offset
  clear of the block, then Updated; and an icon block at the old pitch beside a wider hand-made icon, which measures the
  pitch past 48. Mutations, each failing by name: the writes dropped → `relay marks/no overlap`, `relay marks/spacing`;
  every Prism3 mark taken as on the grid → `relay marks/hand moved`; the obstacle check dropped → `relay marks/blocked`;
  the obstacles not widened by the gap → `relay marks/gap`; the ownership filter dropped → `relay marks/theirs`; entry
  46 emptied → `relay marks/due`; the overlap guard dropped → `relay marks/icons kept`.
