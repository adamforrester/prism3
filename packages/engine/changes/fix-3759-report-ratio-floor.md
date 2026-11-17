---
engine: minor
---
The contrast column of `modes-report.md` and the ratios in the regression report now print floored to two places, the
same way every studio and plugin surface prints a ratio (#3759, #3697 L3). A pair measuring 4.496 against a 4.5 floor
reads 4.49 beside its failing mark, not 4.50. Report text only: no token value, pass or fail result moves.
