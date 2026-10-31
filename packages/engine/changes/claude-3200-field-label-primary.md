---
engine: minor
---
Every field host nests FieldLabel at emphasis=primary, and FieldLabel's own default is primary (#3200, owner decision
Q-PH1 A). The hosts: Text field and the three built on it (Password field, Search field, Card number field), Textarea,
Select, Code input, Counter, Checkbox group, Radio group, Segmented control and Slider. The label now leads in
color.text.primary and the placeholder keeps color.text.secondary, so the two no longer read as the same gray.
FieldLabel's emphasis axis is ordered [primary, secondary] so its first member carries the new default; secondary
stays selectable. An Update swaps each placed label instance to the primary member in place, keeping every id and
hand edit. No token name moves, so CONTRACT is unchanged.
