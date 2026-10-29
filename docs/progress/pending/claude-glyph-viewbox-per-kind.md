## (2026-10-28) — Brand mark build: no false artboard misses on logos drawn at their own width (#3127)

**Status:** plugin executor and the paste executor. ENGINE patch (change note). CONTRACT unchanged.
`EXECUTOR_REVISION` 40 → 41: `write-components.ts`'s code moved, so `lint-executor-revision.ts` requires it.

### Diagnosis

The issue suspected the read-back assumed a square artboard. It does not: each glyph's expected box is the plan's own
`glyphViewBox`, which is already right per kind (square for icons, `social/` and `provider/`; the mark's own width ×
24 for `logo/`; 32 × 20 for `payment/`). The defect was precision. Figma stores a node's width and height as 32-bit
floats, and the read-back compared them with `!==` against the plan's double. A logo whose width float32 cannot hold
exactly comes back a hair off: 34.97 reads 34.970001220703125, the number in the owner's report.

All 7 misses are `logo/` marks, and exactly the 7 whose widths are not exact in binary: amex (34.97), apple-pay
(25.51), discover (53.85), paypal (10.17), paypal-wordmark (49.49), shop-pay (27.27) and visa (27.4). The other 7
logos are integers or exact binary fractions (32.5, 34, 18.75, 25.5, 36, 39.75, 24) and passed. Every `payment/`
tile is 32 × 20 and passed. Measured from the plans with `Math.fround`, and reproduced in the shim: the exact compare
reports these 7 and only these.

### What changed

- **The artboard read-back compares at Figma's precision** (`atArtboard`, `ARTBOARD_TOLERANCE` = 0.001,
  `write-components.ts`), on both the fresh build and the in-place import, and in the paste executor's twin
  (`anatomy-figma.ts`). float32's error at these sizes is under 1e-5; a glyph sized to its ink misses by whole
  pixels.
- **The miss names its kind's box.** A square glyph keeps "every host binding a square would distort it"; any other
  says "a host binding its 27.4x24 box would distort it". Before, a logo's miss blamed a square it never had.
- **The shim's importer can store float32.** Neither shim modeled it, which is why no gate saw this. The arms wrap
  the importer to store the artboard at float32 instead of changing the shared shims: rounding every `resize` in them
  would move geometry many other gates read.

### Gates and mutations

Each mutation was made on a committed tree and failed by name:

| Mutation | Fails |
|---|---|
| `atArtboard` back to the exact compare | `test-write-components.ts`: "#3127 at its own width: every brand mark imported at float32 reads back at its artboard …" (7 misses, the 7 logos above) |
| `atArtboard` passes anything | `test-write-components.ts`: "#3127 sized to its ink: a square-kind mark (provider/apple) … fails, named" and "… a logo whose frame is sized to its ink still fails, named for its own box" |
| The paste executor's compare back to `!==` | `test.ts`: "#3127 paste at its own width: a 34.97 × 24 logo imported at float32 …" |
| The paste executor's read-back dropped | `test.ts`: "#3127 paste ink: a square-kind mark and a logo whose frames are sized to their ink each still miss …" |

### Gaps

- Nothing was run in Figma. The float32 reading is the host's documented storage and the owner's numbers match it
  digit for digit; a fresh BrandMark build in Figma should now report no artboard miss.
- The `EXECUTOR_REVISION` raise makes every recorded set due for the executor on the next open (Q811.1, Q820 A),
  although only the read-back moved and no member's output did. #3101 would narrow that.
