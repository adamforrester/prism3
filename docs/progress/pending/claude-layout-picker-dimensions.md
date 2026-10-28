## (2026-10-27) — Layout gutter and margin picker: the spacing steps, then the dimension steps (#3092)

**Status:** studio chrome only (Theme › Layout, both hosts: the plugin imports the studio's UI). ENGINE patch (change
note): no token, emitted tree or component surface moves, so CONTRACT is unchanged.

### What changed

- #3065 (Q785 A) made a grid gutter or margin link to a `space/*` step, else the brand's `core/dimension/*` step, else
  a plain px flagged off-scale. The picker still offered only the spacing steps, so the reference brand's 44px md margin
  could only be written by hand. It now lists the engine's order: the spacing steps under "Spacing steps", then every
  `core/dimension/*` step no spacing step has, under "Dimension steps", each read as `44px · core.dimension.44`. The two
  lists come from `theme.dims.space` and `theme.dims.grid`, the same two `gridGapLink` reads, so a value the picker puts
  in the dimension group is one the engine links to the dimension grid.
- `ui/value-picker.ts` gains an optional `group` per value: each run of values in one group is a `role="group"` named by
  its heading. The arrow keys still walk the whole list in order, across groups. No other picker sets a group, so every
  other picker draws as before.
- The hint is reworded, DRAFT: "Spacing steps come first, so the value stays a spacing token. Dimension steps cover
  widths the spacing scale lacks." The two group names are DRAFT too.
- The width sample caps at 128px (the top of the dimension grid's 4px run) rather than 96px (the widest spacing step).

### No custom px entry (Q3092.1, built as the recommendation)

Measured: every gutter and margin in both legacy reference fixtures (16, 24, 32, 48) is a spacing step, and the
reference brand's 44 is a dimension step. The dimension grid holds every 4px step to 128 plus 1, 2, 3, 5, 6, 10, 18 and
30. A custom entry would add a field, its validation and an off-scale value the person has to be told about, for no
value seen so far. Held in the PR as a Q-block; a brand set off both lists by hand still shows its px on the button.

### Gates

`test-chrome.mjs` section 25, `#3092`: on the web studio, md's margin picker lists the two named groups in order, 44 is
in the dimension group and in no other, its entry reads `44px · core.dimension.44`; picking it stores
`layout.marginOverrides` `{"md":44}`, read back from the persisted brand; and the downloaded `prism3.base.tokens.json`
links `grid.md.margin` to `{pds3.core.dimension.44}`. Every expected value is typed in the test. Each arm was mutated
from a `wip:` commit and failed by name (table in the PR).
