---
engine: minor
---
Unified errors (#2751, owner decision Q354, from the #2706 audit): every control that can be invalid takes the fields'
`status` axis. Checkbox control and Switch control lose their `error` state for `status` default | error, orthogonal to
rest, hover, pressed, focus-visible and disabled (Checkbox control 54 → 90 members, Switch control 24 → 40). Radio control
gains it (30 → 60), set by the Radio group, never by one radio alone. Checkbox row, Switch row and Radio row gain `status`
and follow it into their control (6, 4 and 6 members). Checkbox group and Radio group gain it (6 members each), follow it
into every row, and nest a FieldMessage under the options, present only at `error`. Fields are unchanged. The error look
is each control's existing one: the danger border on the box, track or ring, bound per selection and per non-disabled
state, so an errored control still hovers and focuses. Each def carries the fields' `validation` prop over default |
error; the groups also carry `validationMessage`.

Engine: `COMPONENT_RENAMES` gains a `move` kind, a value that leaves its axis for a coordinate on others. Checkbox control
and Switch control each declare `state=error` → `state=rest, status=error`, so Update renames the error members in place,
keeping their ids, and a placed error instance keeps showing error. `lint-axis-values` records the choice controls'
`status` as a subset of the fields'. No new token, so CONTRACT is unchanged.
