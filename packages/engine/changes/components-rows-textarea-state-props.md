---
engine: minor
---
Row and Textarea state props (owner decision Q351 A on #2706, and #2708). Checkbox.Row, Radio.Row and Switch.Row
each gain their own `disabled` prop, and Radio.Row also gains `readOnly`, so a consumer disables or locks the labeled
row rather than its nested control. Textarea restates the field props its declared states and label need: `label`,
`onChange`, `helpText`, `required`, `disabled`, `readOnly`, `isPending`, `id` and `name`, in Text field's shapes.
Every new boolean defaults to a real `false`. `components.ai.json` and the four docs pages move. The props are code
API: no Figma member moves, so the projected component surface, EXECUTOR_REVISION and CONTRACT are unchanged.
