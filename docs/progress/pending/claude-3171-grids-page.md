## (2026-10-30) — Grids & layouts page: the Grid styles table, and the Container table moved there (#3171)

**Status:** plugin feature, built as proposed on #3171 and decided there (Q3171.1–7, all A). ENGINE patch (change note):
the style-guide group table gains a `layout` tier; no committed artifact, emission or component surface moves.
`CONTRACT_VERSION` is unchanged (no token name moves). The executor is unchanged, so `EXECUTOR_REVISION` stays:
`style-guide.ts`, `page-moves.ts`, `file-taxonomy.ts`, `update-plan.ts` and `update-apply.ts` are all outside its closure,
and `lint-executor-revision.ts` passes.

### What changed

- **The Grid styles table**, on `↳ Grids & layouts` in the Grids group: one row per breakpoint (the layout collection's
  modes, each matched to its grid style), Token · Specimen · Min width · Columns · Gutter · Margin · Column · Max width ·
  Description. The values are always the variables'; the style lays out the 1:8 specimen and the Column width.
- **Chips.** A gutter or margin carries its link: the space step, else the aliased core dimension marked "off space
  scale", else "⚠ unlinked px". A column where the grid style disagrees with the variable carries "⚠ style N, variable M"
  (DRAFT wording: the wireframe's not-equal sign is not in the chrome's Inter subset), whatever the Aliases toggle says: the plugin-side twin of the engine's G1 gate.
- **The Container table** is drawn on the same page, in Containers, with its key unchanged. `container/*` is a kind of
  its own, drawn as a dimension, decided after a radius, a border width and a spacing, so Prism 2's
  `pds/border/radius/container/*` corners stay radii, in Borders. Breakpoint and grid variables leave the later-phase note.
- **The move.** `FORMER_TABLE_PAGES` (beside `FORMER_PAGES`) and `relocateTables`. Update file lists the move in its dry
  run on the set moves' line and makes it after its version; the style-guide run makes it once its version is saved,
  before it draws. Only a table Prism3 drew, on Primitive tokens or in a Prism3 group there, keyed `…/container` with
  every row a container width, moves; the grid it leaves closes up; no page is deleted.

### Where it lives, and why there

`relocateTables` lives in `style-guide.ts` and `page-moves.ts` re-exports it. The proposal put it in `page-moves.ts`,
but the style-guide run calls it too, and `page-moves.ts` already reaches `style-guide.ts` through `doc-panel.ts`: a
`style-guide.ts` import of `page-moves.ts` would close a cycle. The table's own plugin-data keys live in `style-guide.ts`
anyway. The set-move wording moved to `movesClause` in `file-taxonomy.ts` so both lines share one template.

### Gates

`test-style-guide.ts` section 43 (both fixtures, the reference brand's and the corpus brand's committed emission): one
row per mode; each link class read from the variable catalog, never the plan; the off-scale arm exercised where the
emission has one; the mismatch chip; the Container table's page and group; the drawn specimens and Column widths; and
the move with a per-page key census. `test-update-apply.ts` "table moves": the dry run lists it, the apply moves it
once, a second Update does nothing. Mutations, each failing by name: gutter read from the style → `43f`; group close-up
skipped → `43h: no other guide moved`; every alias called a space step → `43b`; the container page dropped → `43d`; the
dry run's read dropped → `tables/dry run`; the apply's move dropped → `tables/apply`.
Review fixes: `container` decided before the radius check again → `43k` (both arms); `tableKindOf` reading the key
alone → `43k: a primitive pds/border/radius/container table…`; `NO_GRID_STYLE` never emitted → `43l`.
