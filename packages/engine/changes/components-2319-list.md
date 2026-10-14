---
engine: minor
---
List and List.Item (#2319, owner decisions Q273): a read list of short text items. `List.Item` is 9 members (`type`
[unordered, ordered, icon] × `size` [small, medium, large]): a marker in a fixed-width column one body line tall
(`control.size.*.line-box`), then text in `type.body.{sm,md,lg}.default` that wraps under itself. The bullet is a round
`control.size.*.dot` in `color.icon.primary`, the number is text in the item's own type in `color.text.primary`, and the
icon is a swap slot starting at `check` in `color.icon.primary`. `List` is 9 members, a column of nested items following
its type and size, three shown and five more behind Figma-only booleans, with a density-following item gap. No states,
no new tokens. A slot can now name its own default icon (`PartDef.swapDefault`): its swap property starts at
`icon/<glyph>` instead of the file's nominated default. The Divider lists List as a partner, no longer as planned.
