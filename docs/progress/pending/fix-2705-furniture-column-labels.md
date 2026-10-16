## (2026-10-15) — Canvas furniture: column labels read in full on narrow sets, the columns widening to the widest (#2705)

The owner's QA found the state labels above radio-control clipped at Small: "Rest · Hove · esse · ıs vis · sabl". `drawFurniture` fixed each `Text=Top` label to its column's width, and the `_Label` root clips. radio-control's columns are 32px wide at most, on a 56px pitch.

### The shape, and why

The issue allowed two shapes: the label hugs its text centered on its column, or the column spacing grows to the widest label. Hugging alone fails the issue's third requirement on the very set it names. "Focus visible" is about 75px in Inter Medium 12, so centered on a 56px pitch it covers "Pressed" and "Disabled". Only wider columns keep every label whole and clear of the next. That also keeps the `clearance/…` checks meaningful: a label never reaches past its own column, so it never reaches past its set's edge into the 400px between sets.

So the **columns grow**, uniformly, to the widest label's own width. A column narrower than that is widened, and its members sit centered in the extra, so a label centered on the column is centered over them. A column already as wide (Tag's 150px columns) does not move. Each label is as wide as its column, or as its text where that is wider. The second case is only reached when widening was refused (below), so the text still reads in full there.

### Measured, and recorded on the set

The width is **measured**, not estimated. Each label is written and read at its hug width before anything is placed, so a client who restyles `_Label` to a larger face gets wider columns. A characters-times-constant estimate was considered and discarded. It is pure and needs no storage, but it would clip again on the first restyle.

Only `drawFurniture` can measure, and three readers must agree on the grid. So the width is **recorded on the set** (`prism3`/`labelColumn`, `label-columns.ts`). The executor's LAY OUT pass reads it, and so does the dry run's `gridMoves` (through `HostSetView.labelColumn`). That way the next update re-lays the widened grid, and the next dry run reads it as up to date rather than as 30 members to move back. The rule itself, `labelColumns`, is one pure function that all three call. `widenColumns` only re-lays when the recorded width changes. Otherwise the executor has already laid it.

### The guards

- **Nothing moves on a set that is not on the executor's grid.** If any member Prism3 built sits off the grid at the previously recorded width, no member moves. That covers a set laid out by hand, or by an earlier plugin. The record still changes, so the update that the dry run already lists for it lays the widened grid.
- **A member Prism3 didn't build never moves** (#2325, #2464), through the same `builtByPrism3` the executor reads. It still counts toward its column's width.
- **Only `x` moves.** The set grows to the right. Rows, the set's position and the row labels stay.

### Update corrects existing files in place

The update flow already redraws the furniture for every set it enters, including one it calls up to date, so a set built before the fix is widened by the next Update with every id kept (`columns/in place`). On a page with sets side by side (Radio), the widened set ends up closer than `SET_GAP` to the next one. The next dry run lists those sets to move (`respaceSets`, unchanged), and that Update moves them. Measured in the shim: no label meets another set or its labels even between the two Updates. The dry run cannot know the measured width before the first Update draws it, so a shared page takes two Updates to settle.

### Mutations (each failing by name)

Each was run from a committed state and restored before the next. The failing lines are recorded on the PR.

- The label fixed to its column again (`width = c.width`) fails `columns/full text`, with "Focus visible 32/91" among its widths, and `columns/hand laid`.
- The columns not widened (`widenColumns` returns at once) fails `columns/clear` (gaps 22.5, 14, -14, -17.5), `columns/grid`, `columns/apply keeps` and `columns/shared page`.
- `gridMoves` blind to the record fails `columns/converges` ("30 members. 30 to move.") and `columns/shared page`.
- The executor blind to the record fails `columns/apply keeps` (members back at 24, 80, 136, 192, 248; set 304 wide).
- The off-grid guard dropped fails `columns/hand laid`.

**A trap met on the way.** The first `columns/apply keeps` ran the update over a set with nothing to write. Such an update never runs the layout pass, so the executor mutation passed it. The arm now stamps one member with an earlier executor revision, so the update writes that member and re-lays the set, and the arm asserts that the write happened.
