---
engine: minor
---
An authored interactive anchor must name a step on its column's ramp (#3873). `actionAnchorStep`, `destructiveAnchorStep`, `interactivePalettes[].anchorStep` and each `modeAnchors` step are now refused off the ramp, naming the nearest real step, as surface steps already are. Each is applied exactly, and an off-ramp step used to fall back to 500 without a word, so a typo shipped a step nobody chose, uncorrected, and the build blamed contrast. A `modeAnchors` column other than primary, destructive or a declared interactive column is refused instead of ignored. The resolver also refuses an exact anchor off the ramp rather than falling back. Every committed brand's emission is unchanged.
