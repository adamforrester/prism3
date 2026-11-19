---
engine: minor
---
A per-text-type line height pin (#3079, owner decision 2026-11-18 A, Q3079.4 A), the twin of #3077's letter spacing pin.
`typography.leading` pins every style in a text type to one named line height role, any of the seven, in place of the
size-derived role and its `leadingShift` nudge, for the pinned text types only. That is what lets title read one line
height across its sizes, which no nudge can do. The role still resolves through `lineHeights` and each mode's
re-points, and the notes name each pin. Unset, it changes nothing, so every brand that does not set it is
byte-identical. Values move, not names, so CONTRACT is unchanged.
