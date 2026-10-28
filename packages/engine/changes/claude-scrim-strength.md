---
engine: minor
---
The scrim's strength (#3050, owner Q825 B, replacing Q825 A): a new optional brand input, `scrimStrength: standard |
strong` (Color, a value setting, default `standard`). It picks which existing `black-alpha` step `color.scrim.default`,
the backdrop behind a dialog or sheet, aliases in each mode. `standard` keeps the steps before the input: 40 light,
60 dark, 60 hc-light, 70 hc-dark. `strong` is 80 light and dark and 90 hc-light and hc-dark, so high contrast stays at
least one step heavier where the ramp allows. No alpha step is added and no token name moves; every brand that leaves
the input unset emits byte-identical artifacts. The reference brand's legacy fixture and its redesign seed set
`strong`, so its scrim moves to 80 / 80 / 90 / 90. CONTRACT unchanged.
