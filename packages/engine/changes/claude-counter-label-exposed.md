---
engine: minor
---
Counter label exposed (owner decision Q399 A on #2693). The Counter nests FieldLabel `nest-exposed`, exposing `emphasis`
and `weight`, with `size` still followed: the shape the fields and, with #2756, the groups use. The starting coordinate
stays secondary and regular, so the Counter looks as it did; a designer now sets the label's emphasis and weight, label
text and required marker on the Counter instead of inside the nested instance. No executor code moves and no token is
added or renamed, so EXECUTOR_REVISION and CONTRACT are unchanged.
