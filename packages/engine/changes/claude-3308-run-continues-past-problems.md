---
engine: minor
---
Update file's run goes on past a To add step whose sets were all built, some with problems (#3308). Until now a set
built with problems made the step's verdict not ok, and the run stopped there: the owner's first run read "Stopped at
To add" with "1 failed", and never reached the style guides. A set that failed to build, or a stop that left sets
unbuilt, still ends the run. The run's verdict line then reads "File updated" as a warning, naming the step's own
words, and a multi-set build with problems is marked "⚠", so Activity counts it as a warning, not a failure.
