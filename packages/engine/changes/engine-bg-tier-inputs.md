---
engine: minor
---
The background tiers are inputs (#1972). `surfaces.<light|dark>` takes four optional keys:
`secondary` and `tertiary` (the page's second and third tiers, neutral-only like `base`) and
`inverseSecondary` and `inverseTertiary` (the inverse band's, the same forms as `inverseBase`). Each is
read during derivation, so every role measured against the tier re-derives against it. A declared
`secondary` carries the contrast floor with it unless `floorStep` is set, so the 46 floor-gated roles
per mode re-measure too; high-contrast modes follow the standard floor, as they already do for `base`.
An `overrides` entry on any of the four is now refused, naming the input. Unset, every tier is the
ladder's own step and every artifact is byte-identical. The keys are checked in `brandTheme` (white,
black, or a step on the palette's ramp), because the schema validator skips `allOf`/`oneOf`. Token
paths are unchanged, so CONTRACT_VERSION does not move.
