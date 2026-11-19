---
engine: patch
---
Update file marks every member it will configure as in progress before the set's first write (#3797, #3594). The set's
own writes (layer renames, property removals and retypes) land before the executor reaches a member, so a close or a
stop after them left the unreached members differing from their records and unmarked: the next check read the update's
own writes as hand edits, and Keep held them on every later run. Marked first, they read as to update, and the marker
comes off only in the executor's finish. A stopped set's count now reads "marker off, planned stamp", so it counts a
member the pass finished whose stamp did not move (drawn damage, a nested-instance fault, reactions). Plugin only; no
executor file changes and no committed artifact moves.
