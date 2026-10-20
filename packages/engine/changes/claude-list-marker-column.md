---
engine: minor
---
List.Item: the bullet and number marker column is one step tighter, 20 / 24 / 32px at small / medium / large (#2727,
owner decision Q340 A). The column is now fixed per type rather than in every type: `markerBox` binds
`size.{size}.{type}.marker-column`, `space.250` / `300` / `400` for unordered and ordered, and `space.300` / `400` / `500`
(24 / 32 / 40px, unchanged) for icon, so an icon item's text edge sits further in than a bullet or number item's. The
column stays fixed: it does not follow density. The List's code note now says a nested list sits in its item's text
column, indented by that item's marker column. An Update corrects an existing file in place: the 6 bullet and number
List.Item members are rewritten, the 3 icon members read current, and the List set takes the new note, keeping every
key and id. No new token, so CONTRACT is unchanged.
