---
engine: minor
---
#1762 (owner-decided 2026-09-30, option 3; decision record `docs/28` §5.5, which changes #1757's
decision 2): field-label's name HUGS its text and wraps at a MAX WIDTH instead of filling the row, so the
required marker sits right after the name in Figma rather than at the row's trailing edge ("Label ··· *" at
320). New `PartDef.wrap: 'hug'` projects `maxWidth` on the text node (no `layoutGrow`, auto width); the max
width is DERIVED — the root's `placementWidth` less one row gap per sibling, in px on the fixed space scale
(`spacePx`) — so field-label's is 320 − 4 = 316 at every member. The marker's own width is not subtracted (a
brand-font advance the engine does not hold), so a long required name overruns 320 by it, and a field
stretched wider in Figma keeps the 316 wrap point: both accepted. Both executors write the max width after the
append (the paste twin splices its line in only where a plan carries one) and read it back. Every host of
field-label (select, text-field, textarea, checkbox-group, radio-group) nests the changed main component.
The projected component surface moves → ENGINE bump. CONTRACT STANDS (no token name moves).
