---
engine: minor
---
Slider gains a `required` prop (owner decisions Q-FL2 A, #3554, and Q-FL2.1 A, #3699): a boolean, off by default, that
turns on the nested FieldLabel's required marker and adds "required" to each thumb's accessible name, such as "Price
range, required". It sets no aria-required, which ARIA 1.2 does not support on the slider role, so its wording departs
from the field family's "Sets required / aria-required". The Figma set does not change: the marker was already exposed
on the label.
