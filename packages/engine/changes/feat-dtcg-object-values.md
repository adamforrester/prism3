---
engine: minor
---
The conforming projection (`<brand>.base.tokens.json` and each `<brand>.<mode>.overlay.tokens.json`) writes DTCG
2025.10 value forms (#4123, owner decision A). A literal color is `{ colorSpace: "srgb", components, alpha, hex }`, a
dimension is `{ value, unit }`, and so are a shadow layer's color and lengths. A type style's `letterSpacing` is
resolved to px, the role's multiplier times the style's font size, as a dimension (#4128, owner decision A, its
letter-spacing half). Durations stay strings, because stock Style Dictionary 5.5 writes a duration object as
`[object Object]`. The canonical `<brand>.tokens.json`, the Figma emission and every name are unchanged. The shipped CSS
is unchanged except that a shadow layer's color prints in CSS Color 4 `rgb()` syntax.
