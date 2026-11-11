## (2026-11-11) — CodeInput.Cell: error is the status axis, not a state (#3554 Q-CC1)

**Status:** CodeInput and CodeInput.Cell defs, `COMPONENT_RENAMES`, the axis register, `lint-paint` provenance, test
arms. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor change, so `EXECUTOR_REVISION`
stays.

### What changed

- **Owner decision Q-CC1 A (2026-11-11, on #3554; the audit also lists it as Q-MD8):** the cell takes
  `status: [default, error]`, the code input's own two values, and drops `error` from its states. Its member count goes
  from 28 (4 sizes × 7 states) to 48 (4 × 2 × 6).
- **Paint.** The single `border.error` key becomes Text field's status-led grammar, `{status}.{slot}.{state}` first.
  The danger border binds at rest, hover, filled, focus-visible and focus-visible-filled. Disabled keeps the disabled
  skin in either status, as on every field. The five keys each take a named `lint-paint` provenance exception (error
  maps to the danger role), as Text field's do.
- **The cost Q-CC1 named is gone.** An active cell in error (focus-visible plus error) can now be drawn: its 2px focus
  edge is drawn in the danger color, as Text field's is. The character shows on filled and active filled in either
  status, so an empty cell in error is drawable too. The "empty cell in error" unverified note is removed.
- **Rename.** `COMPONENT_RENAMES` gains `{ def: 'code-input-cell', kind: 'move', axis: 'state', from: 'error', to:
  { state: 'filled', status: 'error' } }`. The old error member showed a character in the danger border, which is
  filled in error, not rest. Every other member gains `status=default`, the first value.
- **Props.** `isInvalid` is replaced by the fields' `validation` (`'default' | 'error'`), as on the choice controls.
- **The field passes it down.** CodeInput's six default cells now `follow: ['size', 'status']` and start at
  `status: default`, the canon's "a set's group sets it, and passes it down". So an error member opens on error cells.
  A placed field's cells are still the designer's (Q329). The field's notes and the cell's docs say so.
- The axis register's `status` subset row lists `code-input-cell`.

### Diagnosis

The cell was built (#2789) after Q354 and kept the state, and its notes never cited Q354. Moving the value is
mechanical: the paint grammar, the rename shape and the register row are the ones Q354 already used for the checkbox and
switch controls.

### Verification

The `#2428 code-input` arms in `test.ts` now read the cell by coordinate, with each literal typed from the decisions:

- 48 cell members, and status `[default, error]` on the Figma axes.
- The character shows on filled and active filled in either status.
- The paint per state at both statuses: the danger border everywhere but disabled.
- The focus edge on both active states in either status.
- The default cells take the field's status by name.

Baselines accepted: component surface, paint census, component axes.
