---
engine: minor
---
Code input (#2428, owner decisions Q321, Q329, Q330, and the as-built wireframe approved 2026-10-16): two new component
defs. `code-input` is a field for a one-time code, one input drawn as a row of cells, `size` [medium, small, large,
xlarge] × `status` [default, error] × six states = 48 members, nesting FieldLabel, a native `items` slot of six cells
(four to eight, the cell preferred) and FieldMessage. `code-input-cell` is the cell, `size` × seven states = 28
members, at the owner's literal sizes (44×44, 48×56, 56×64, 68×72) with Text field's field chrome and the prototype
reactions Q344 sets (While pressing goes to the active cell). Two engine additions carry them:
`figmaProperties.pressState` names where While pressing goes on a set with no pressed look, and `typeWeight` names a
fixed weight intent for a type group, resolved per brand as `weightIntent` is, so the cell's title-step characters
resolve on every brand. FieldLabel's agent partners name Code input. No token is added: CONTRACT is unchanged.

The cell's character carries its size's text style in Figma (owner QA Q534 on #2789): `type.title.sm.strong` at
medium, `type.body.md.default` at small, `type.title.md.strong` at large and `type.title.2xl.strong` at xlarge, with the
title steps in the brand's bold title weight. Its line box is centered in the cell; code trims the box to the cap height
and the baseline (`text-box: trim-both cap alphabetic`) so the figure itself is centered. Figma keeps vertical trim
inside the text style, so a trimmed layer cannot keep its style; the owner kept the style (Q560 A on #2789), and the
Figma character is untrimmed.

Code input joins the Field style lever (#2719, owner decisions Q332 A and Q12 A on #2695): under `underline` each cell
draws one bottom line, 2px with the ring at the 2px offset on the active cells and `border.danger` in error, square,
with no hover wash and no disabled plate. `applyFieldStyle` squares a per-size corner key. Every paste payload also
drops its leading indentation (about 1 KB per chunk), so the indivisible paste unit stays under #1798's ceiling.
