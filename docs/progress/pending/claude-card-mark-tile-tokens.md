## (2026-10-26) — Card marks: full-bleed tiles, corners and edge drawn from tokens (#2343, Q720 A)

**Status:** `brand-mark` def, a schema field, the four card files, two gate arms. ENGINE minor (change note). CONTRACT
unchanged: only existing token roles are bound. No executor change, so `EXECUTOR_REVISION` stays. Lands before PR 3 (the
provider artwork), so the owner's files drop in full-bleed.

### What changed

- **Owner decision Q720 A (2026-10-26, on #2343):** card tile files are full-bleed (square corners, no border, the
  tile's ground kept, since a colored ground is part of the provider's mark), and the card-mark host draws the corner
  radius and the border from tokens, so every tile gets the same edge at every size and mode.
- **The four `card/*` placeholders are re-exported full-bleed.** The rounded ground path (radius 3) became the
  artboard rectangle `M0 0H32V20H0Z`; the colors did not move, so `provenance.json`'s `colors` hold. Each record's
  `source` and a new `_note` line record the re-export. Followed the "replacing a placeholder" steps: regen, `--accept`
  on `lint-component-surface.ts` alone (19 members, same count; `component-axes.json` does not move), change note.
- **Where the edge lives: the glyph's own frame.** A mark is built from its SVG by `createNodeFromSvg`, which returns
  a FRAME at the artboard. That frame is the node a host instances and resizes, so it is the host. A new `PartDef`
  field, `tileEdge: { when, radius, strokeWidth }`, on a `vector` drawn inline, makes the projector bind that frame's
  four corner radii and its `strokeWeight`, stroke it with the def's `border` paint, and set `clipsContent`, at the
  coordinates `when` names. `brand-mark` names its card members, read from the vocabulary by kind (`CARD_MARKS`), so a
  network added to the set is a tile the day it lands. Square and wallet plans are byte-identical.
- **Tokens:** `tile.radius` → `radius.sm`, `tile.border-width` → `border-width.hairline`, `tile.border` →
  `color.border.primary` (through `paintKeys: ['tile.{slot}']`; the artwork still takes no ink, by def id). **Owner
  decision Q-T1 A, Q-T2 A, Q-T3 A (2026-10-27, on #3047):** `radius.sm`, `color.border.primary`, and the 1px hairline
  on every tile, as built.
- **Both executors already carry it**, which is why there is no executor diff: each applies a node's `bound` and
  `paints.strokes` on any node type, and each `claimDefaults` reads `clipsContent` from the plan on every FRAME and
  leaves a bound corner alone. The GLYPH's artboard is a FRAME. Shown by mutation, below.

### Gates

- `lint-mark-colors.ts` arm (e), CARD TILE EDGE: on every `card/*` member the mark's frame binds all four corner radii
  to a `radius/*` variable and `strokeWeight` to a `border-width/*` variable, strokes in a `color/border/*` variable
  and clips; on every other member it clips nothing. Card-ness is typed in the gate (`card/` prefix), not read from
  `BRAND_MARK_KINDS`. Arm (c) admits exactly those properties on exactly that node, so the mark is still never retinted.
  "Every size": the plan has no size coordinate; a host binds the height (20, 24, 32) on its instance, and a bound
  radius and weight hold their value at each, where a baked edge scales with the artwork.
- `lint-glyph-geometry.ts` mark arm, read from the SOURCE file: CARD TILE BAKED (the first path is not the full
  artboard as one shape with straight edges) and CARD BORDER BAKED (a later path spans the whole artboard).

- Executor tests, one per executor: `test-write-components.ts` (plugin shim) and `test.ts` (paste payload) build the marks
  and read the frame back: four corners, the weight (scalar or all four per-side keys, #1332), the stroke paint and the
  clip, against names typed from the decision, and no edge on a square or wallet mark.
- Fallout: Studio's committed `used-by` index (`apps/studio/gen-used-by.ts --write`) lists brand-mark under `radius.sm`.

| Mutation (each on a committed tree) | Fails, by name |
|---|---|
| `card/visa.svg` ground back to the rounded tile | `lint-glyph-geometry` — CARD TILE BAKED |
| `card/visa.svg` gains a full-artboard ring path over the ground | `lint-glyph-geometry` — CARD BORDER BAKED |
| `tileEdge.radius` dropped from the projector (the frame's radius unbound) | `lint-mark-colors` — CARD TILE EDGE |
| the edge's stroke paint dropped | `lint-mark-colors` — CARD TILE EDGE |
| plugin `claimDefaults` writes `clipsContent: false` on the mark's frame | `test-write-components` — #2343 Q720 A plugin executor; `test:roundtrip` |
| paste payload's `claimDefaults` writes `clipsContent: false` | `test.ts` — #2343 Q720 A paste executor |

### Traps for whoever re-verifies

- The frame's stroke is drawn INSIDE and over the artwork, by design: the edge sits on the tile, not around it, so the
  mark's footprint does not grow.
- `component-specs.ts` keeps radius and stroke width out of `specs.json` for every def (its header), so the spec shows
  the edge's color only; the radius and width reach code through the token-usage report and the def's tokens.
