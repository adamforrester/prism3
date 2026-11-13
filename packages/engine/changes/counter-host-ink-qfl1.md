---
engine: minor
---
A disabled outline Counter now inks its minus and plus glyphs in `color.disabled.on-fill`, the same ink its value
already takes on the disabled fill (#3554, owner decisions Q-FL1 A and Q-FL1.1 A). The Counter pushes the ink into each
nested FlushIconButton through a new part field, `hostInk`, which the projector writes as `descendantFills` on the
nested instance. A disabled ghost Counter draws no fill, so its glyphs keep `color.disabled.icon`. The six outline
disabled members gain the two glyph inks; `specs.json`, `component-defs.json` and the Counter's docs page list them.
No token name moves.
