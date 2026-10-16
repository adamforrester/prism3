---
engine: patch
---
Plugin only (#2705). A column label above a narrow set now reads in full. Each label is measured as its text hugs it,
and the set's columns widen to the widest label, with the members centered in the extra room. A label is as wide as
its column, or as its own text where that is wider, centered on the column. Before, every label was fixed to its
column's width, so radio-control's 32px columns clipped "Hover" to "Hove". The width is recorded on the set, so an
update's layout pass and its dry run keep the wider grid. An update corrects a set built before this change in place
and keeps every id. A set laid out by hand keeps its members where they are. `EXECUTOR_REVISION` 26. No emitted
artifact, token or projected component surface moves.
