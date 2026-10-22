## (2026-10-22) — Radio: the checked ring takes the checked Checkbox's box color (#2939)

**Status:** Radio.Control def + one projector branch + tests. ENGINE minor (change note). CONTRACT unchanged: no token
path moves.

### What changed

- **Owner decision Q574 A (2026-10-22, #2939):** a checked radio's ring binds what the checked checkbox's box binds,
  state for state: rest and focus-visible `color.interactive.primary.fill.selected`, hover `fill.hover`, pressed
  `fill.pressed`, disabled `color.disabled.fill`. Before, it bound `color.interactive.primary.border.*` (#1423), a
  mid gray at rest around a near-black dot.
- `radio-control`'s `checked.border*` keys are read from `checkboxControl.tokens` (`checked.fill*`, `disabled.fill`),
  so a later rebind of the checked box moves the ring with it. `password-field` ← `text-field` is the precedent for a
  def importing another.
- **The disabled branch learns one thing.** The projector's disabled branch read only `disabled.<slot>`, which is
  blind to selection, so a disabled checked ring and a disabled unchecked ring could not differ. It now first walks
  the def's own `{state}`-carrying templates at `state=disabled`, so `checked.border.disabled` wins where it is keyed.
  No def keyed a `….disabled` paint before (they would have been unreachable), so every other plan is byte-identical;
  `lint-component-surface` moved for `radio-control` only.
- **The disabled checked ring ignores status**, as the checkbox's disabled box does: `checked.border.disabled` also
  reaches `status=error, selection=checked, state=disabled` (3 members, `disabled/border` → `disabled/fill`). Holding
  that member at `disabled/border` with an `error.checked.border.disabled` key was tried and refused by `lint-paint`'s
  provenance arm: an error-status key must bind a status-colored role. The danger rings at the other four states
  are unchanged.

### Diagnosis

The checked checkbox has no stroke: its `control` declares `fill` and `border`, and at `checked` only the fill
resolves, so its edge is its fill. "The ring binds what the box binds" therefore means the ring's stroke takes the
box's fill variables, which is what the def now does.

### Verification

`test.ts` `#2939 radio-control's CHECKED ring binds the checked checkbox's box color per-state` (literal names, not
read off `checkbox-control`) and `#2939 a checked radio ring binds no border/* variable — <member>` over every
projected checked member at the default status or disabled (18), plus `#2939 radio ring outside checked/default is
unchanged — <member>` over the other 42. The existing 3:1 ring sweep now measures the three fill rungs and clears across every brand×mode.
Mutation: `checked.border.disabled` removed → the disabled checked members fall back to `color/disabled/border` and
`#2939 a checked radio ring binds no border/* variable` fails by name.
