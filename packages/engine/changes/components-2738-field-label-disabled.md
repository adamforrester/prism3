---
engine: minor
---
Text field, Password field, Select and Textarea dim their nested FieldLabel on their disabled members in Figma, as they
already do in code (#2738, #1339). Each field's `label` part maps its `disabled` state onto FieldLabel's `state=disabled`
(`atState`), and leaves the label at `state=rest` on every other member, read-only included. The `codeOnly` entry that
recorded the rest-only label as a projection limit is retired on all four. The projected component surface moves on the
12 disabled members of each field (their stamp and nested coordinate); Update swaps each existing label instance in place.
No token moves, so CONTRACT is unchanged.
