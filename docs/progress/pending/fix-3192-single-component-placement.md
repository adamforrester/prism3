## (2026-10-31) — Single-component blocks are placed clear of the page, and Update extends them in place (#3192)

**Status:** `apps/plugin/src/write-components.ts` (the `emitAsComponents` branch of `applyComponentPlan`),
`EXECUTOR_REVISION` 43 → 44 with its `executor-reach.json` entry, two test arms. Patch change note; no emission,
token or contract change.

### The fault

The emit branch placed a fresh build's grid at `x = (i % cols) * pitchX`, `y = floor(i / cols) * pitchY`, from the
page origin, and an Update that added a member scanned that same origin-anchored grid with a column count taken from
the fresh members alone (one, in an Update that adds one). Neither read the rest of the page. Since #3148 put `icon`
and `provider-logo` on one page, a second block landed on the first, and in the reference brand's master the added
`provider-logo/provider/facebook-blue` sat at 0,0 on `icon/arrow-down` while its siblings were at y=144, x=2128.

### The rule chosen

Taken from how each case already lays out, with no new layout:

- **Fresh block** (the def has no component on the page): the same square grid at the measured pitch (#3134), its
  origin from the rule `relocateSets` (`page-moves.ts`) already uses to put a single-component block on a shared page:
  `SET_GAP` right of everything on the page, header included, level with the top set or component. Empty page: the
  origin, as before. `placeNewSet` was tried first and dropped: under a header it scans the row below the header,
  so a block can land under a wide page header, and the block header #3172 then draws above it would sit on the
  page's own.
- **Existing block**: it stays. A new component goes one pitch right of the last component in the row holding its
  kind's last member; if that spot is taken, or the def's names carry no kind (`icon/arrow-down`), it takes the first
  free slot of the block's own grid, anchored at the block's top-left with the block's own column count. Free means the
  component widened by the 24px gap meets no page node.

The page is read after the build loop with this run's components left out.

### Reach

The reach gate measured ten sets beyond the two named in the issue: banner, breadcrumb-item, breadcrumbs,
card-number-field, code-input, counter, dialog, pagination, slider, toast. Each one's fresh arm prebuilds its
dependencies (icon, spinner, and the rest) onto the one shim page. Their blocks no longer overlap, so the set
the build then places beside them moves right. Only the top-level `x` differs (diffed per set), and the update arms read
the same. The gate requires them, so entry 44 names all twelve. The cost is one re-apply with no field difference.

| Mutation | Fails as |
|---|---|
| fresh block's placement dropped (`fromPage` false) | `#3192 fresh build` (33 overlaps) |
| `write-components.ts` as on main | `#3192 fresh build` and `#3192 update add` (at 0,0, over icon/arrow-down) |
| kind step off, block grid read from the page origin | `#3192 update add` (outside its block) |
