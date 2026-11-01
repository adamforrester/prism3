---
engine: patch
---
Plugin: Update's dry run now notices a nested instance on the wrong member (#3242). A member whose stamp and as-built record read current, but whose nested instance is another member of its set than the plan's coordinate, reads "to update", and the field is listed as a `nestVariant` change on that part. The check is the one the apply's verify has run since #3206, now shared by both. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
