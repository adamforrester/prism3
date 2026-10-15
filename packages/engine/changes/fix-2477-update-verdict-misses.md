---
engine: patch
---
In the plugin, the update's verdict now reads the misses from the build's own pass (#2477). A set with any miss is
"not verified", so the headline is never a ✓ while one is left. A member whose as-built record the host refused is
named as not finished and leaves the "updated in place" count, since the next dry run reads it out of date. Any other
miss is quoted with its own reason. No emitted artifact, token or projected component surface moves.
