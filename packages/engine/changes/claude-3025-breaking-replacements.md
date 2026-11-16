---
engine: patch
---
Update file's "Files that use this library" list counts a replaced layer only on members the update changes (#3025). A
member the update skips (a layer added or removed by hand) or refuses (the member itself would need replacing) no longer
has its layer replacements listed as breaking, and the list is no longer cut at 500 on a large set. Plugin only; no
committed artifact moves.
