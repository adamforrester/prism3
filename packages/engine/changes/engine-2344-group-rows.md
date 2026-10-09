---
engine: minor
---
Checkbox-group and radio-group carry up to eight rows (#2344, owner decision Q156 A), Prism 2's mechanism at eight
rows where it had six. Each group nests eight rows: row 1 is always shown, and rows 2 to 8 each sit behind a
node-visibility boolean, "Option 2" to "Option 8", with rows 1 to 3 shown by default, so a group reads as the three
rows it always did. Booleans don't multiply the set: each group stays at 3 members. The booleans are a new
FIGMA-ONLY form (`figmaProperties.booleans.<key>.figmaOnly: true`): it drives no code prop, because in code the
row count is `children`. A Figma-only key must not be a declared prop, and must carry a `figmaName`. No token name
or value moves, so CONTRACT is unchanged.
