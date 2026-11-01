---
engine: patch
---
Plugin: Update's apply verify now notices a nested instance left on the wrong member (#3206). After the write it reads each nested instance's main component off the file and compares its coordinate, axis by axis, with the one the plan names. A mismatch that is not a hand edit the run kept is listed with the other fields that still differ, so a partial Update no longer reports as verified. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
