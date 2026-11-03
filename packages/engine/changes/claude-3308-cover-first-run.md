---
engine: minor
---
A first Update file run draws the cover and About this library (#3308, Q3308.4 A). A run that includes Set up file and
Theme now ends with one more step, which runs the in-place update over no sets: its finish draws the cover, bound to the
theme the run just wrote, and About this library. Until now Set up file, the run's first step, had no brand to draw the
cover with, and nothing later in the run drew either, so a fresh file waited for a second Update file. The plugin is
unchanged. No token, emitted tree or projected component surface moves, so CONTRACT is unchanged.
