---
engine: minor
---
Tag, under Tag style Underline (#2945, owner Q589, Q590 A, Q592 A and the parity wireframe's A calls): the unselected line takes `interactive.primary.border`, the selected line's color, stepping to `.hover` and `.pressed`, where it took `interactive.neutral.border`. The weights are unchanged: 1px at rest, 2px on hover, pressed and selected. The tag has no side padding and no minimum width, and the × slot is only as wide as its glyph (16, 20 and 24px), so the line spans exactly icon + label + ×. A dismissible tag's label row drops its 4px leading inset, and the label sits 6, 8 and 8px from both the icon and the ×. The pill does not change. `PartDef.minWidthBase`, which only the underline's floor used, is removed.

"Button label weight" is now "Control label weight" (#2945, owner Q591 A): Default also sets tag labels in `type.label.{rung}.default`, in both tag styles. Badges keep Emphasis. The key stays `buttonLabelWeight`, so no brand file changes. No example brand sets Default, so no committed output moves.
