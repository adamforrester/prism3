---
engine: patch
---
The paste executor's glyph artboard read-back compares at Figma's float32 precision, so a brand logo drawn at a width
float32 cannot hold exactly (34.97 × 24 reads back 34.970001220703125 × 24) no longer reports a false "sized to its
ink" miss (#3127). A miss on a non-square glyph now names its own box rather than a square. No committed artifact moves.
