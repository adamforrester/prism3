## (2026-10-11) — Canvas furniture on every component, 400px between side-by-side sets (#2502)

Owner decision Q212 A (recorded on #2471): after the pilot on Button, Tag and Text field, the furniture goes on every
component, and the gap between side-by-side sets widens so the row labels fit (#2471 item 10, a layout call).

**The switch.** `CANVAS_FURNITURE_PILOT` is now `CANVAS_FURNITURE` (`anatomy-figma.ts`), listing all 27 defs that build
a set. Icon and Spinner (`emitAsComponents`) build single components, so there is no grid to label and they stay off.
Kept as a list of ids, not "every def": the tests plan an earlier layout by renaming a def's component, and
`rollout/switch` holds the list to `componentDefs`, so a new def that is not added fails by name.

**What moves.** Only defs with a `surface` row axis regroup: Button destructive and Button neutral (360 moves each, the
same shape as Button) and the three icon buttons (180 each). The 180 is worked out by hand in the test: 36 rows, and a
row keeps its place only where 12a + 6s + 3u = 18u + 6a + 3s, which holds for six rows. Every other def's layout is the
one it had, so its dry run on an existing file reads up to date straight away. All 27 converge on the shim: earlier
layout → dry run reports the moves and nothing else → apply → next dry run up to date (`rollout/<def> …`).

**Focus ring needed a fix, found by the per-def arm.** Its `surface` is the grid axis: default and inverse are two
columns. The pilot's check (draw only when the inverse members form one row block) read that as not grouped, and
refused with "Run Update to move them", which an Update never fixes. The check now applies only when `surface` is a row
axis. Focus ring gets the "Default" and "Inverse" column labels and no backdrop; whether its inverse column should get
one is held for the owner.

**The gap.** `SET_GAP` goes from 160 to 400, in the plugin and in the paste payload's copy of the rule. Measured with
the shim's label model (7px a character plus the 22px bracket), Button's four bracket columns reach 317px left of the
set and Icon button's 324px, so 160 put them on the neighboring set. At 400, the later sets' labels sit 83px (Buttons)
and 76px (Icon button) clear of the set to their left. The test asks for 40, 2.5 × the 16px label gap, so labels sit
nearer their own set than the neighbor. Pages whose later sets have only column labels (Checkbox, Radio, Switch,
Tabs) clear by 424. `clearance/…` builds each shared page in page order with the real executor and draws the furniture
after each set lands, as a build does. The templates on `↳ File Components` keep 160: they carry no labels.

**Existing files keep their placement.** `placeNewSet` never moves a set that exists (the "designer's placement wins"
rule), so a page built at 160 keeps 160, and on `↳ Buttons` and `↳ Icon button` the later sets' row labels will sit
on the set to their left after the Update. That is held for the owner, not fixed here.

**`EXECUTOR_REVISION` 10 → 11.** `SET_GAP` lives in `write-components.ts`, inside the executor's import walk, so the
lint asks for the bump even though no member's output moves. The cost is the one the revision file names: the next dry
run reports every member as needing a re-apply, on the same Update that does the moves.

**Mutations,** each committed first and restored with `git reset --hard`:
- `SET_GAP` back to 160 → `clearance/Buttons` (-157px) and `clearance/Icon button` (-164px);
- `icon-button` dropped from the switch → `rollout/switch`, `rollout/icon-button dry run` (up to date, not 180 to
  move), `… apply`, `… drawn`, `… backdrop`;
- the contiguity check made unconditional again → `rollout/focus-ring drawn`.
