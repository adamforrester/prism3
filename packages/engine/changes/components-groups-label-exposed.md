---
engine: minor
---
Group labels exposed (#2748, owner decision Q348 A on #2706). Checkbox group, Radio group and Segmented control nest
FieldLabel `nest-exposed`, exposing `emphasis` and `weight`, with `size` still followed: the shape Text field, Select,
Textarea and Password field already use. The starting coordinate stays secondary and bold, so no group looks
different; a designer now sets the heading's emphasis and weight, label text and required marker on the group
instead of inside the nested instance. Update marks an existing group's nested label exposed in place, keeping every
key and id. No executor code moves and no token is added or renamed, so EXECUTOR_REVISION and CONTRACT are unchanged.
