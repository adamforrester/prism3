---
engine: minor
---
Tab is renamed Tab item (#2759, owner decisions Q353, Q365, Q394): the id `tab` is `tab-item`, display name `Tab.Item`.
It stays unprefixed because it is Tabs' slot item, which a file using a published library inserts (Q394 A); List item
and the segmented-control segment keep their ids for the same reason. `COMPONENT_RENAMES` gains a `def` kind. An
in-place update finds a set under its earlier id, renames it, and keeps the set's and every member's id, so placed
instances keep pointing at them. Its dry run says "Renamed from <old id>." The renames lint follows a def rename when
it compares the merge base with the tree.
