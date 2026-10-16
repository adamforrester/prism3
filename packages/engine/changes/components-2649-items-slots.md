---
engine: minor
---
Checkbox group, Radio group, Tabs, List and Segmented control hold their repeating children in a native Figma slot
named `items` (#2649, owner decision Q307 A), in place of the fixed rows behind Figma-only booleans that #2344 gave
them. Each slot holds three items by default (Tabs and Segmented control with the first selected); the row booleans
are gone (Option 2-8, Tab 4-6, Item 4-8, Segment 3-5), and the header, label and Segmented control's Label toggle stay
outside the slot. Every other axis and token is unchanged. In code each takes `items`, a slot prop in Nathan Curtis's
spec shape: `type: slot`, `anyOf` the item def, `minItems` 1, and `maxItems` 6 for Tabs and 5 for Segmented control.
The Figma slots carry the same limits through #2646's `slotSettings` and `preferred`: at least one item, the same
ceilings, and only the item def, preferred-only.
Two names a consumer may reference go away, a breaking change for code or files that name them: List's `children`
prop is renamed `items`, and the row booleans listed above are removed from each Figma set.
The component-renames ledger gains a `slot` entry kind recording each def's removed booleans and old row layers, the
axes baseline records each set's component properties, and the component-surface baseline names them. An in-place
update of a set built the old way carries every placed instance across: its visible rows become slot items in order,
each with its own variant, label and checked state, a hidden row is left out, and anything that cannot carry over is a
named line in the dry run.
With #2645's per-instance overrides, List's three default items read "1." to "3.": the second and third override
List.Item's number. The plugin executor writes a nested instance's overrides and texts once per instance in a run, as
the paste payload does. Before, making a native slot rebuilt its items a second time and reported every override miss
twice.
