## (2026-10-11) — Update: the grid's moves are read on both axes and for every def, and the apply counts every one (#2519)

Found reviewing #2509 (one axis value order in every def). #2471's `gridMoves` read rows only, and only for the canvas-furniture pilot defs. A set laid out in another axis order therefore read "up to date" in the dry run while its members sat elsewhere:
- button: 288 members at another x;
- icon-button: 108 at another x;
- select and textarea: 56 each at another y.

The next update made for another reason re-laid them with no move counted.

- **Both axes, every def.** `gridMoves` (`update-plan.ts`) lays the grid out as the executor's LAY OUT pass does, for every def, since that pass uses `planSetLayout` for every set. The grid starts 24 in, rows and columns sit 24 apart, a row is as tall as its tallest member, and a column is as wide as its widest. A member is a move when its x or its y is not its cell's. Members Prism3 didn't build stay out of the moves, and still count toward sizes. The pilot import is gone from `update-plan.ts`.
- **The apply counts every member whose place changed** (`update-apply.ts`), not only when the dry run listed moves. An update that resizes members re-lays the grid by their new sizes, which the dry run, reading the file as it is, can't predict. Those moves are now counted in the verdict ("N moved", #2471's wording), never silent.
- **Tests (`test-update-apply.ts`, `grid/…`).** Each set is built in #2509's order, made by sorting a copy of the def's own value lists by #2509's ladders, against the plans as they are. For button, icon-button, select and textarea:
  - `… moves`: the dry run lists exactly 288, 108, 56 and 56 moves, and nothing else;
  - `… converges`: the apply reads `✓ moved N`, keeps every id, and the next dry run reads up to date;
  - `… unrelated`: an update for another reason (a root gap) moves exactly the members the dry run listed, and counts them.

  `grid/resized`: a padding change on `tag` widens members from 110 to 118, and the apply counts the 36 it moves, though the dry run listed none.

### Mutations, each failing by name

- **`gridMoves` reading rows only:** `grid/button moves`, `converges` and `unrelated`, and the same three for icon-button.
- **`gridMoves` reading the pilot defs only:** `grid/icon-button …`, `grid/select …` and `grid/textarea …`.
- **The apply counting moves only when the dry run listed some:** `grid/resized`.

### Traps for whoever re-verifies

- Reordering the plans LIST is not the same as reordering a def's value lists. Sorting the plans moved 480 of Button's rows that #2509 never touched. The test reorders the def's `stateAxis`, `variants.size` and `states`, as #2509 does.
- Button's own count is 288 at another x. 108 is icon-button's.
