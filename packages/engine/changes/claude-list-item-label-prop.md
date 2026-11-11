---
engine: minor
---
List.Item's Figma text property is `label`, the name of the layer it sets (#3554, owner decision Q-CC19 A); it was `text`.
The code prop, `children`, is unchanged. `COMPONENT_RENAMES` records the change as a `property-rename`, so Update file
renames the set's property in place: it keeps its id, and every placed item keeps the text a designer typed into it.
