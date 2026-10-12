## (2026-10-11) — Update: the sets Prism3 built on a page are re-spaced as a new build spaces them (#2542, owner decision Q245.2 A)

**Status:** plugin only (the update's dry run and apply, and a pure placement rule in the executor). `EXECUTOR_REVISION` 12 → 14: #2529 took 12 after this branched, and #2545 is landing at 13. No engine file moves, so no engine bump is owed.

**Why:** #2502 (#2538) widened the gap between side-by-side sets to 400 so a set's new row labels clear its neighbour, but `placeNewSet` places only new sets. In a file built before it, later sets stay 160 apart and their row brackets land on the set to their left. An Update now re-spaces them, so the owner's single Update leaves each page clean.

**The rule (`respaceSets`, beside `placeNewSet`; owner decision Q248 A, "the re-spacing only makes room"):** a set moves only when it sits closer to its left neighbour (the nearest Prism3 set to its left in the same row, as already moved) than a fresh build's `SET_GAP`, and then to exactly `SET_GAP` clear of it. A set spaced wider stays; a set with no Prism3 set to its left in its row (the first of a row, a second row) stays, so a second row is never lifted and `y` never changes. If the spot a moving set needs overlaps something that stays put, it is pushed just past it. A set Prism3 didn't build (no stamped member), the page header and every other node never move. The canvas furniture follows the move, since it is redrawn after the update from where each set sits.

**Approaches tried and discarded:** first, replaying `placeNewSet` for each set. It reproduces a fresh build only on a page with nothing else in the row: `placeNewSet` puts a NEW set right of everything in its band, so a designer's note far to the right, or a set they built, would pull every later set past it. Re-spacing an existing page keeps the order and moves as little as it takes. Then, laying every set out `SET_GAP` after the one before (the first review round): that also closed up a designer's wider spacing and would lift a second row, which Q248 A rules out: the re-spacing only makes room.

**Scope and safety:** a page takes part only when every Prism3 set on it is a target of this update and none is blocked, so an update scoped to one def never moves a set it wasn't asked about. A set's move is in the preview hash, so a set moved between the check and the confirm refuses the apply. The apply recomputes the moves from the live sets after their members land (new sizes), writes only `x` and `y`, and keeps every set and member id.

**A trap:** the pass maps a move back to its set by the node, never by id. In the shim every set built into one shim is `SET:1`, and mapping by id sent all three sets' moves to one name.

**Tests** (`test-update-apply.ts`, `page/…`), the button family on one page squeezed to the old 160:
- `set moves`: the dry run moves the 2 later sets ("Would change 2 of 3");
- `converges`: the apply puts each where a fresh build did, keeps every id, and the next dry run is up to date ("✓ 2 sets moved");
- `untouched`: a frame Prism3 didn't build stays put;
- `in order`: a note far right in the row pulls no set past it;
- `around`: a set Prism3 didn't build stays put, and the set that would overlap it goes just past it;
- `scoped`: an update reading one set of the page moves none, in the dry run or the apply;
- `blocked`: a page holding a set the update can't touch (two members on one coordinate) moves no set, in the dry run or the apply;
- `wider`: sets spaced 600 apart stay;
- `second row`: a set below the first row stays, while the too-close set in the first row still moves;
- `just enough`: a set 300 from its neighbour moves to exactly 400 clear, and the one beyond, already clear, stays.

`around` and `scoped` also check the apply, and the test page carries a section header, which stays put.

Mutations, each failing by name: the set-move pass removed (`set moves`, `converges`, `in order`, `around`, `second row`, `just enough`); the push past an obstacle removed (`around`); every set treated as Prism3's (`around`); the scope rule removed (`scoped`); the blocked check removed (`blocked`, and the blocked set itself was moved); the "only when too close" check removed (`wider`, `just enough`, `converges`); the left neighbour from any row (`second row`); a fixed step instead of `SET_GAP` clear (`just enough`, `in order`, `second row`, `converges`).
