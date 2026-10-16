---
engine: minor
---
Three defs used only inside their parent take the `_` prefix (#2759, owner decisions Q349, Q353, Q355):
`segmented-control-segment` is `_segmented-control-segment`, `tab` is `_tab-item` (display name `Tab.Item`), and
`list-item` is `_list-item`. The Figma set name is the def id, so Figma reads each as a building block and leaves it
out of a published library; Tabs, Segmented control and List nest them as before. `COMPONENT_RENAMES` gains a `def`
kind. An in-place update finds a set under its earlier id, renames it, and keeps the set's and every member's id,
so placed instances keep pointing at them. Its dry run says "Renamed from <old id>." The renames lint follows a def
rename when it compares the merge base with the tree. `_accordion-indicator` already had the prefix.
