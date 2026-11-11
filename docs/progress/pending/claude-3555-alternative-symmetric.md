## (2026-11-11) — Component alternatives are symmetric, and gated (#3555 Q-MD10)

Part of #3555 (the 2026-11-11 metadata audit), owner decision Q-MD10 A: make `composition.alternativeTo` symmetric, and
gate it.

The audit counted about 40 one-way pairs, and the registry had 39. Two examples: Link named Button as its alternative,
but Button did not name Link, even though Button's `avoidWhen` names Link first; and Toast named Dialog, which did not
name Toast back. Each missing reverse entry is appended to the end of the named def's list, so the first entry, which the
action families pin to their own family's alternative (#1697, #2457), is unchanged:

- Button gains `tag` and `link`, for the primary sibling only. Tag and Link name `button`, not its siblings.
- Each IconButton gains the FlushIconButton of its own color.
- Switch.Row gains the three Buttons, `text-field`, `checkbox-group`, `radio-group` and `slider`.
- Select, SegmentedControl, TextField, Tabs, RadioGroup, CheckboxGroup, CheckboxRow, Dialog, Accordion, Breadcrumbs and
  Link gain the components that already named them.
- Icon gains `provider-logo`, and FieldMessage gains `toast` and `banner`. Both lists were empty, so the maintainer
  record's two "empty alternativeTo" doc gaps close.

### Gate

`component-refs` gains arm (a1): every `alternativeTo` entry is answered by the other def's own list, over more than 50
entries (129 today). The oracle for each entry is the other def. Mutation: Icon's `provider-logo` was dropped, and the arm
failed by name with "one-way: provider-logo → icon".

### Where it shows

The plugin's Figma doc panel draws its "Instead, consider" list from `alternativeTo`, so its Related section grows too:
Checkbox gains TextField, and Buttons gain Tag and Link. `apps/plugin/test-doc-panel.ts` holds those two lists as literals
from the #2970 wireframe, and they are updated to match. That test failed by name on the change before the update.

### Not decided here

Symmetry says nothing about order. Each reverse entry sits at the end of its list, and no consumer reads the order beyond
the first entry.
