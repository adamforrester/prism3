---
engine: minor
---
A new emitted artifact, the spec supplement (#2996, owner decision Q2996.1, the hybrid A; first slice Q2996.4, Button
only). Spectacular is the base spec for every component. `out/specs/button.supplement.yaml` adds what the design file
cannot hold, keyed to Spectacular's own element and prop names for the same Button: accessibility (role, keyboard, focus,
ARIA, WCAG, and the hit target per size), the code-only props, states and axes, motion, each element's RTL rule, and the
shipped token names for each element, keyed by the exact Figma path Spectacular prints as `$token`. Everything Prism3
adds sits under `$extensions["com.prism3"]`. It is written by a new regen step, `emit-spec-supplement.ts`, and held to a
trimmed copy of Spectacular's real output for Button by a new gate, `lint-spec-supplement.ts`. Field names, the file
path and the namespace are DRAFT, for the owner.
