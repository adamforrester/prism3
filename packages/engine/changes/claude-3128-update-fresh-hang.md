---
engine: patch
---
Plugin: Update file on a fresh file no longer stops for good at its second set (#3128). A build releases the run guard as soon as its verdict posts. Until now it held the guard through the settle probe that follows, which is telemetry and writes nothing. The panel posts its next set, or Update file's update step, the moment that verdict lands, so the post was refused and the panel waited for a verdict that had already been sent. The panel now also ends a build run when the host refuses a set the run posted: that set reads as failed, with the host's words, the sets after it as not built, and the run no longer reads as running. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
