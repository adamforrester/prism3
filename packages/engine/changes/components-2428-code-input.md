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

The cell's character is optically centered (owner QA 2026-10-16, option A on #2789): a new text-part field,
`verticalTrim: 'cap-height'`, trims the text box to the cap height and the baseline (Figma's `leadingTrim: CAP_HEIGHT`,
code's `text-box: trim-both cap alphabetic`). The centered box is then the figure itself, whatever the brand font's
metrics. Figma keeps the trim inside the text style, so both executors write the plan's trim in `claimDefaults` and do
not re-apply the style over it. The trimmed character keeps the style's variable binds and shows no style name. Only
Code input's cell declares it, and every other plan is byte-identical.
