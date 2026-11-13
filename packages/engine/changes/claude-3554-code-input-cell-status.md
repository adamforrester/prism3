---
engine: minor
---
CodeInput.Cell's error moves from a state to the fields' `status` axis, `[default, error]` (owner decision Q-CC1 A,
#3554, under Q354). The cell projects size × status × six states, 48 members where it had 28, and draws the danger
border at every state of status=error but disabled, so an empty, hovered or active cell in error can now be drawn. The
old `state=error` member, a character in the danger border, is renamed in place to `status=error, state=filled`
through a `move` entry in `COMPONENT_RENAMES`, so a placed error cell keeps showing it. The cell's `isInvalid` prop is
replaced by the fields' `validation` prop. CodeInput follows its `status` into its default cells by name, so an error
member opens on error cells; a placed field's cells stay the designer's (Q329). No token path moves, so CONTRACT is
unchanged.
