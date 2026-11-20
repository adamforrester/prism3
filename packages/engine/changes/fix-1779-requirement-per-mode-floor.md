---
engine: minor
---
A `.ai.json` contrast `requirement` now states the floor each mode holds where the modes differ (#1779). For example,
`border.brand` now asks for 3:1 against `background.primary` in light and dark modes, and 4.5:1 in hc-light and
hc-dark modes. It used to say "3:1 … in every mode", so an agent checked high-contrast pairs against the light floor. A
floor that holds in every mode still says "in every mode". Only `requirement` strings change, in every brand's
sidecar: no token, `min` or `ratio` moves. The sidecar schema's descriptions of `min` and `requirement` say the same.
