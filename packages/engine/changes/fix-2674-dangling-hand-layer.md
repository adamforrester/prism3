---
engine: patch
---
Update file's check and its apply agree on a member whose prototype reactions dangle and that has a layer added, removed
or renamed by hand (#2674). The check read such a member "to update", and the apply left it as it was, as it does any
member with a layer edited by hand. The check now counts it with the members edited by hand, as it does one that draws
wrong (#2413), and the apply's skip says its prototype reactions point at a member no longer in the set. Plugin only; no
committed artifact moves.
