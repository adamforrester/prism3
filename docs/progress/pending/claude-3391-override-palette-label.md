## (2026-11-03) — Studio labels an override by the palette it names (#3391)

On the reference brand's master, after the action palette moved to Neutral, Theme › Color › Interactive labeled overrides "Override · neutral 350". The file, and the ratio Studio showed (3.03:1), were `brand-neutral 350`. The label was wrong, and a designer couldn't see that the overrides still pointed at a palette they were about to remove.

### Diagnosis

An override is stored as `{ palette, step }`, and the engine resolves the palette it names. For a plain override row, `color-interactive.ts` built the label from the row's *own* family (`interactivePaletteOf(row)`, which follows the action palette) and the stored step. So it dropped the stored palette. The inverse fill's rows already read the stored palette. The same wrong `current` also reached the step picker, which marked the row family's step 350 as current.

### Fix

- `interactive-input.ts` gains `overrideHeldOf(mode, row)`, the palette and step the override names, and `overrideLabel(held)`. Both kinds of override row use them for the label and for the picker's current step. The picker offers the row's own ramp only, so when the override names another palette it now marks no step as current.
- The brand-color remove confirm (`removalEffects`) lists the roles still overridden to the color, in one line: "N roles are still overridden to it: … — the brand won't build until each is re-picked." Overrides are **not** cascaded on removal. That stays the owner's call (Q-block on the PR). The claim is the engine's own answer: the modes refuse to resolve with "unknown palette".
- Section 9 of `test-interactive-input.ts` uses a fixture brand color named `brand-neutral`, with an override on the primary border that points at it. The engine's resolution is the oracle for the palette. The label must read `Override · brand-neutral 350`, including after the action palette moves to neutral. Mutations: strip the family from `overrideLabel`, or label by the row's family again; both fail `#3391 label` by name.
- Section 3391 of `test-chrome.mjs` (review S1) reads the label on screen. It seeds the same override into the stored input, under the primary family and with the action palette on neutral. The button must read `Override · brand-neutral 350`, and the picker must mark no step current. The oracle is the override the page persisted. Section 9 tests the helpers, so it could not see the original bug put back at the button's own site in `color-interactive.ts`; this section fails by name on it, all four checks. Section 9 also covers the inverse fill's rest row now.

### Trap

`brandTheme` alone accepts a brand whose override names a missing palette. The refusal comes in `resolveAllModes`. A check that stops at `brandTheme` reports the dangling override as fine.
