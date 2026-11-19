---
engine: patch
---
Update file puts a set's members in plan order (#2386). A member an Update adds was appended after the members the set
already held, and a variant property lists its values in the order members first use them, so a value an axis gained read
last in the property's list on an updated file and in its plan place on a fresh build. After its member pass the Update
now moves each planned member, keeping its id, into the slots planned members hold, in plan order. A member off the plan
(kept and marked deprecated, or a designer's own) keeps its slot. Plugin only; no committed artifact moves.
