---
engine: minor
---
Glass (#2869, owner Q464 A; the open choices drafted on Q2869.1–5 A): a background-blur treatment for text over the
bottom of a photograph, emitted for every brand. `blur.glass` is a 32px DTCG dimension, so a stock Style Dictionary
build carries it to CSS as `--<root>-blur-glass` for `backdrop-filter: blur(...)`. In Figma it is a FLOAT variable,
`blur/glass`, in a new `blur` collection scoped to effect radii. `color.glass.surface` is the fill, with its alpha in
the value: white at 70% on the light family, black at 70% on the dark, 90% in high contrast. It varies by mode like
the scrim, because Figma forces a variable-bound paint to opacity 1. A new `glass` Effect Style holds one
BACKGROUND_BLUR whose radius binds `blur/glass` in the plugin and the paste path (setBoundVariableForEffect). A file
without the variable reports a miss and keeps the literal radius.
