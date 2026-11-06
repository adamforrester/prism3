## (2026-11-06) — An override row's step picker offers the palette the override names (#3406)

On Theme › Color › Interactive, an override row's step picker offered only the row's own ramp. When the stored override named another palette (a brand color `brand-neutral`, as #3391's case does), the picker opened on the row's family with no step current. The designer couldn't see the held step or move within its palette. A re-pick moved the override onto the row's family. The owner chose option A in the lane brief: the picker must show that palette's steps.

### Fix

- `interactive-input.ts` gains `pickerPalettesOf(mode, row)`: the row's own ramp, then the inverse fill's neutral ramp (#1384), then the palette the held override names when it's none of those. A held palette the theme no longer builds (removed, #3391) isn't offered, because it has no steps. `color-interactive.ts` builds the picker's palettes from it. The picker already opens on `current.palette` when that palette is offered, so it opens on the held step.
- A pick in the held palette writes that palette. `writeInteractiveRow` takes `‹palette›::‹step›` on an override row as it already did on the inverse fill. The row's call site sends that form when the picked palette isn't the row's own, and a bare step still writes the row's family.
- Section 3b of `test-interactive-input.ts` uses literal palette lists: `['primary', 'brand-neutral']`, the inverse fill's `['primary', 'neutral', 'brand-neutral']`, and the own ramp alone with no override, a neutral hold, or a removed palette. The move is checked through the engine's own resolved path (`pds3.core.palette.brand-neutral.400`). Section 3391 of `test-chrome.mjs` had pinned the old behavior ("marks no step current"). It now checks that the picker opens on `brand-neutral 350` with the options `[own, brand-neutral]`, and that a pick of `brand-neutral 400` persists there, under the primary family and with the action palette on neutral.
- Mutations, each failing by name: drop the offer (`#3406 offer` in 3b, and `#3406 … opens on brand-neutral` in chrome); ignore `::` in the override write (`#3406 move`); send a bare step from the call site again (`#3406 … a pick of brand-neutral 400 persists`, chrome only, since the unit arm can't see the call site).

### Trap

`stepPicker` reads `current.palette` to choose the palette it opens on, and falls back to the first offered palette without a word. A held palette that isn't offered doesn't raise an error. The picker opens on the row's family with nothing marked, which is exactly the bug.
