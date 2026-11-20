---
engine: minor
---
A brand's weight roles must be whole numbers in [1, 1000] (#3871). A fractional weight such as 450.5 used to emit an alias that resolved nowhere, because a DTCG alias reads the `.` as a path separator, and a weight outside DTCG's fontWeight range of 1–1000 shipped a value the spec rejects. `brandTheme` now refuses both by role name, and the schema types each `typography.weightRoles` value as an integer in [1, 1000]. Per-mode weights (`modeLevers.<mode>.weights`) keep their [100, 900] range and must also be whole. Every committed brand's emission is unchanged.
