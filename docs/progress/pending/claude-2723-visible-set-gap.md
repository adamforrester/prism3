## (2026-10-15) — The gap between component sets is 160px of white space, measured from their labels (#2723, Q335 A)

**What changed.** `SET_GAP` in `apps/plugin/src/write-components.ts` is now 160, and it is a *visible* gap: from the
outer edge of one set's canvas furniture (row labels, brackets, the inverse backdrop or scrims) to the outer edge of the
next set's. A set with no furniture is its frame. It replaces #2502's 400px frame-to-frame gap, which let Button's four
bracket columns fill ~320px of the gap and left short-labelled sets reading far apart. All three places follow it:

- **Placement.** `placeNewSet` takes the new set's `reach` (how far its own furniture hangs past its frame, left and
  right). Other sets' labels are page nodes already, so they push the set like any node. The executor places with no
  reach (it draws no labels), then `main.ts` draws the labels and calls `seatNewSet` (`canvas-furniture.ts`): the set's
  own labels are measured, the set is placed again by the same rule, and the set and its labels move together by `x`.
  Only for a set the run created (`ComponentApplyResult.placed`).
- **Update's re-spacing.** `respaceSets` reads a set and its furniture as one visible box (`RespaceBox.of` ties a
  furniture node to its set; `pageSetMoves` maps the tag's set id to it). A set moves when its labels sit closer than 160
  to its neighbor's, **or** when its frame sits exactly 400 from its neighbor's original frame (`OLD_SET_GAP`), the spot
  the #2502 rule built it at. Any other wider spacing is still the designer's and stays (Q248 A).
- **The paste payload** (`anatomy-figma.ts`) writes 160. It draws no labels, so its new set's edge is its frame.

**Diagnosis that made it small.** The furniture is already top-level page nodes, so placement needed no merged boxes:
it only had to learn the new set's own reach. The one thing the executor cannot know is a label's width (it is the
text's, measured by the host once drawn), which is why the build places twice rather than predicting.

**Verification.** `test-canvas-furniture.ts` `clearance/<page>` now asserts the literal 160 between visible boxes on all
ten shared pages (was "≥ 40 from the set to the left"). New `respace/Buttons` and `respace/Checkbox`: one file laid out
under the 400 rule with labels drawn, dry run + apply + label redraw as `main.ts` does, then exactly 160 everywhere,
every id kept, the next dry run moving nothing. Buttons exercises "too close" (83px between labels under the old rule),
Checkbox the old-rule spot (400px between labels, room enough, still moved). `test-update-apply.ts` gains pure arms for
the furniture reach and the old-rule recognition; its re-spacing literals are re-measured for 160.

**Traps for whoever re-verifies.** Each def's shim numbers node ids from 1, so in tests two sets on one page can share an
id; `seatNewSet` matches furniture by set id *and* def, the pair `drawFurniture` tags with. A set whose labels change
width under an Update (#2705 changes label widths) is moved by the old labels' reach and redrawn after. Labels that
shrink leave a gap wider than 160 that Update keeps (#2734). A set rebuilt under a header still puts its frame, not its labels, on the header's left edge (#2735, unchanged here).

**One Update settles the page (owner decision Q358 A, after review).** Stacked on #2717, the first Update on the Radio
page widened radio-control by ~300px and left 2 label overlaps until a second Update re-spaced. Under the old 400 frame
gap that growth fit; under 160 it does not. Now `applyUpdate` (`update-apply.ts`) takes the furniture redraw as a hook
(`opts.furnish`, `main.ts`'s `furnishSet`) and, after it, runs the re-spacing once more from the labels as drawn
(`settle`). A set moves with its own tagged furniture by the same `dx`, so nothing is redrawn twice. It only makes
room (Q248 A). When nothing else in the Update wrote, as on Radio, where every set read up to date, the settling moves
are the first write, so they save the named version first (Q7); refused, they don't move, and the next dry run lists
them. `columns/shared page` asserts 0 overlaps, 160 between each set, and a clean next dry run after a **single**
Update. The tests drive the hook with `drawFurniture`, so the loop that used to live in `main.ts` is now under test;
`main.ts` keeps only the `hasFurniture` filter and the outcome list.

The review's other points: `EXECUTOR_REVISION` is 29 (main 27, #2717 lands at 28 first), and the `respaceSets` no-op
guard has a pure arm (`respace/old rule at 160`). A pasted set that is adopted and then updated draws its labels for the
first time in that Update. The same settle pass covers it, but no test builds that file.

**Delta round on `c1a1a2d1`: settle's two guards get tests.** The Radio arm reaches `settle` only through the "all up
to date" early return, where no version exists yet, so deleting `if (res.version) return true;` survived every test:
on a normal Update (a set rewritten, its labels widened, the next set settled) the settle pass would save a second
named version. A new arm stamps one radio-control member stale, so the main path saves the version and then settles;
it asserts one version, saved before the member's rewrite and before any move. The version's title names only the
rewritten set: the settle moves are not known until after the redraw, and the version is saved before any write. A
second arm stops the run in radio-control (its stamp write refused once) and asserts that no set settles. Each guard,
deleted, fails its arm by name. The trap: an early-return arm and a main-path arm reach the same helper with different
state, so one arm over a helper does not cover a guard on state the other path sets.
