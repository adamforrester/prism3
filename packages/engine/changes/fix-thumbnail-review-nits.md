---
engine: minor
---
The library cover's review follow-ups (#2893). A cover whose version text is gone is never drawn a second time beside
itself: Update writes nothing to it and says so, whatever its fingerprint reads. The `coverFrame` rule in
`figma-conventions.json` now reads "Every Update sets the version text while it is there".
