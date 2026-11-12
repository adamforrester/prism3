---
engine: minor
---
The field label is nested and hidden alike across the field hosts (owner decisions Q-CC5 A and Q-CC7 A, #3554).
Slider nests FieldLabel as the fields do: emphasis and weight are exposed on the slider and start primary and regular
(it was fixed at medium, bold), and the label follows the slider's size. Hiding a label is one code prop, `hideLabel`
(visually hidden, still announced), on SearchField, Counter and Slider: Counter's `showLabel` becomes `hideLabel` with
the default kept (hidden, so `hideLabel` defaults to true), and Slider gains `hideLabel` (default false), so code can
hide what Figma's `label` switch hides. Each Figma `label` switch is Figma-only. Slider's 30 members move (same count);
no token path moves, so CONTRACT is unchanged.
