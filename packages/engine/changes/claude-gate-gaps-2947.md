---
engine: patch
---
`lint-hit-target.ts` measures the underline Tag (#2947). Every arm read Tag as authored, which is the pill, so the box
`tagStyle: underline` builds (20 / 26 / 32px, owner Q585 A) and its glyph-wide × slot went unmeasured. A new arm
materializes the tag through `applyTagStyle`, walks each member's plan to the height it draws at every density, and holds
each size, body and × slot apart, to WCAG 2.5.8's 24px as drawn or to a size `UNDERLINE_CODE_SIDE` names as code-side,
in both directions, with each named size stated in `codeOnly`. The 24px floor and the named sizes are literals. Gate
only: no emitted artifact, token or projected component surface moves.
