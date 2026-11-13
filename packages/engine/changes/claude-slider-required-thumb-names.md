---
engine: minor
---
The descriptions of a slider thumb's name carry the ", required" rule (owner decisions D3699.1 B, D3699.2 and D3699.3,
#3699 follow-up to Q-FL2.1 A). `_slider-thumb`'s `aria-label` and Slider's `thumbLabels` now end "with ", required"
added when the slider is required", which applies to custom thumb labels too. FieldLabel's `required` prop,
`accessibility.aria` and guidance now say the field carries required / aria-required, or for a slider, "required" in
the thumb's accessible name, so the state is not marker-only. Docs and `.ai.json` move; the Figma set does not.
