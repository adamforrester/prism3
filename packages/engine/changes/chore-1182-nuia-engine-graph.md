---
engine: patch
---
`modes.ts` and `ramp.ts` typecheck clean under `noUncheckedIndexedAccess` (#1182). Fixes a solid-tint wash that reads past the top of the opacity ladder: when a brand's fill is invisible against its ground at every step, hover climbs to opacity.100, and pressed and selected used to get `alpha: NaN` and "opacity.undefined". They now stay on the top step. No committed artifact changes.
