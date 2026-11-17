---
engine: minor
---
The contrast column of `modes-report.md` and the ratios in the regression report now print floored to two places, the
same way every studio and plugin surface prints a ratio (#3759, #3697 L3). A pair measuring 4.496 against a 4.5 floor
reads 4.49 beside its failing mark, not 4.50. Every ratio the engine stores for someone to read is floored too, through
the new `floorRatio`: `.ai.json`'s `contrast_with[].ratio` (588 of 1,263 entries drop by 0.01, none crosses its floor),
a gradient's worst-case ratio and its `avoid_when` sentence (Prism3 `glow`, 1.88 to 1.87), and an eval failure's
`ratio` over MCP. The resolved preview now stores each contract's raw ratio, so Studio's contrast-contracts table no
longer prints a rounded-up 4.50 beside a failing dot. No token value, pass or fail result moves.
