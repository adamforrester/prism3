---
engine: patch
---
Each entry in the usage panel's anatomy parts list now draws the same disc as its specimen marker (#2927, owner
decision Q2927-R1 A): a filled #9747FF disc with its numeral, the one drawing #3773's markers use, before the entry's
label. The label no longer carries the number as text ("Caret", not "3  Caret"), so the number has one source. A run
of repeated parts keeps its one entry and one disc ("Tabs 2–3"). `PANEL_FORMAT` is 9, so every drawn panel is due once
on the next Update. Plugin only; no committed artifact moves.
