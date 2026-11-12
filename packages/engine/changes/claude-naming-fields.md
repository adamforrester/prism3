---
engine: minor
---
Field names line up across the family (#3554, owner decisions 2026-11-11). Code input's fourth size is `x-large`, hyphenated like `x-small` (Q-CC2 A). Slider's message toggle is `message` in Figma and `showMessage` in code, as on every other field (Q-CC6 A). Counter's help text prop is `helpText`, and Counter's and Slider's `label` (and their help text) take `string | node`, as the fields do (Q-CC9 A). `COMPONENT_RENAMES` carries the Figma renames, so an update renames members and properties in place and placed instances keep them.
