---
engine: patch
---
Update file keeps a slot carry's capture on the set until it is filled (#3761, #3762; #3697 H1's second fix). Before a set
is written, the placed instances read for the rows-into-a-slot carry (#2649) and the slot-text carry (#3225) go into the
set's shared plugin data; the next run's capture reads them back for every instance its own read no longer finds, and the
entry is narrowed after each fill and removed once empty. A Banner set that stops inside its member pass, or any carrying
set the plugin is closed in, no longer loses the content of the instances it reached: the next run carries it. A set whose
only work left is a kept carry (closed after its write, before its fill) reads as not up to date, and its fills run with no
member written. Plugin only; no committed artifact moves.
