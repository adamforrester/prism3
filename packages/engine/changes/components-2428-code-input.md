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
