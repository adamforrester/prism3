---
engine: patch
---
Two or more plain components under the exact name a component nests or swaps in are reported by name, and neither is
used (#1796). Both component executors used to keep whichever one the file search returned last, so the build nested or
swapped in one of them and reported success. Now the nest is not built, the swap slot is the placeholder frame, and its
swap property is not created, each with the miss "found more than one COMPONENT of that name; neither is used. Rename or
remove one, then rebuild", as #1781 already does for two component sets under one name. Plugin and paste alike; no
committed artifact moves.
