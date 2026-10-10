## (2026-10-10) — Tabs: a centered alignment beside start (#2518, owner decision Q222 A)

**Status:** engine (schema, projector, the tabs def) plus a test-only shim extension. ENGINE minor (change note): Tabs goes from 3 members to 6. CONTRACT unchanged.

**What it does:** `tabs` gains `alignment: start | center`. At `center` the list keeps each tab hugging its label and sits centered in a bar that spans its placement, with the baseline full width; the Figma member is built 480 wide (DRAFT: six large tabs measured at about 420 on the NB copy). `start` is the approved list, byte for byte.

**The diagnosis that kept it small:** in a hugging bar, centered and start tabs sit in the same place, so the axis needed a bar wider than its tabs. #1757's root build width (`placementWidth`, a fill root built at a literal width) already does that, and both executors already resize to it. So the new `PartDef.center` is a per-coordinate transform at the projector's entry (`centeredAt`): at `alignment=center` the root reads as `align: 'center'`, `sizing.x: 'fill'` and the build width, and every existing path (sizing modes, the bounded fill for the baseline, each executor's resize) does the rest. No executor change.

**Held as owner items:** `alignment` joining the closed `VARIANT_AXES` list (the 22nd name, with its argument against `inset`, `width`, `direction` and `offset`); the `center` schema field; the 480 build width; the new prop wording.

**Tests:** `test.ts` `#2518 tabs` (the centered plan, typed from the decision, and start byte-identical to the def with the axis removed); `test-write-components.ts` `centered tabs (#2518)` and `start tabs (#2518)`, read off a built set on the layout-model shim. The shim gained a column's cross-axis placement under `layoutModel` only, so no existing assertion moves.

**A trap worth knowing:** the shim's `x` modelled horizontal flow only; in a column it summed sibling widths. Centered geometry can't be read without the cross-axis model, which is why it is gated behind `layoutModel`.
