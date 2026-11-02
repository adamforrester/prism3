---
engine: minor
---
A build of several sets (Components' action bar, and Update file's To add) builds each set after the queued sets it
nests (#3308). A set's build already builds every set it nests that the file lacks, so a queued set that another queued
set nests was built twice: once by the first set's build, then again from the queue, where every member read "ALREADY
PRESENT" and the set was counted as built with problems. The owner's first run built Checkbox.Row that way. The queue
otherwise keeps the list's order, and a set listed twice runs once. The plugin and the wire are unchanged.
