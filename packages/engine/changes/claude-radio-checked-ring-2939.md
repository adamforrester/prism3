---
engine: minor
---
A checked Radio's ring takes the checked Checkbox's box color, state for state (owner decision Q574 A, #2939): rest and
focus-visible bind `color.interactive.primary.fill.selected`, hover `fill.hover`, pressed `fill.pressed`, disabled
`color.disabled.fill`, read from `checkbox-control` rather than copied. It bound `color.interactive.primary.border.*`
before. Unchecked rings, the danger rings and the dot are unchanged; a disabled checked ring takes `disabled.fill` at
both statuses, as the disabled checkbox does. To key the disabled checked ring apart from the
disabled unchecked one, the Figma projector's disabled branch now reaches a def's own state-qualified
`….<slot>.disabled` key ahead of the cross-cutting `disabled.<slot>`; no other def keys one, so no other plan moves.
Radio.Control's projected plan moves (60 members, same count); no token path moves, so CONTRACT is unchanged.
