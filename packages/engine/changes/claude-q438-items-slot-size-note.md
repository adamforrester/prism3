---
engine: minor
---
Tabs, Checkbox.Group, Radio.Group, List and SegmentedControl say how their size reaches their items (Q438 A, #2829): the
summary, which is the Figma description and the first line of the docs page, now ends with "Size applies to the items you
haven't edited. After editing an item, select the items and set their size." The summary cap grows by that sentence for a
def with an items slot and a size. lint-component-docs.ts arm F holds the sentence on the def, the JSON and the page.
Emitted component docs change; no token, name or projected component surface moves, so CONTRACT is unchanged.
