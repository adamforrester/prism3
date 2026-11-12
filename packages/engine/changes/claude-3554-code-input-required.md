---
engine: minor
---
CodeInput gains the field family's `required` prop (owner decision Q-CC8 A, #3554): a boolean, off by default, that
sets required and aria-required and turns on the nested FieldLabel's required marker, in TextField's words. Its
documented ARIA now names aria-required. The Figma set does not change: the marker was already exposed on the label.
