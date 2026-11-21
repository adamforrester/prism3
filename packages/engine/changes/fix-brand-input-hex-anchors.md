---
engine: minor
---
A brand anchor takes a hex color (#4133, owner decision A, 2026-11-19). primary, neutral.anchor and brandColors[].oklch
accept "#rrggbb", "#rgb", "#rrggbbaa" or "#rgba" beside the OKLCH object (an alpha is dropped, as the standard dialect
drops it: owner decision B, 2026-11-20); brandTheme converts it first, through the conversion the
standard-dialect classifier uses, and the notes record the converted value ("primary: the hex #2f6b4f, converted to
OKLCH { l: 0.4794, c: 0.078, h: 161.08 }.", DRAFT wording). A hex brand builds the same tree as the same brand written
in the converted OKLCH. New: packages/engine/oklch.ts '<hex>' prints the anchor for a design.md (#4176, owner decision
b), and prism3-theme names it. The input schema's messages now say what a field takes, in the voice standard's "X is
…; it takes …" pattern (#4133, #4200 A): "primary is \"blue\"; it takes an OKLCH object { l, c, h } … or a hex color",
"primary.l is 2; it takes a number from 0 to 1", the enum or the named stops for a oneOf, a readable rule for id and
root instead of their regex, and "did you mean density?" for a near-miss key (DRAFT wording). No committed brand uses
a hex anchor, so no emission moves; CONTRACT is unchanged.
