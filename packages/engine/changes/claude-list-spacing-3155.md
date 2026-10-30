---
engine: minor
---
List and List.Item spacing (#3155, owner decisions 2026-10-29). The List's item gap is one step wider at every size,
12 / 16 / 20px (`space.150` / `200` / `250`), revising Q280.2 A's 8 / 12 / 16; it still follows density. List.Item's
bullet is 6 / 8 / 8px (`space.075` / `100` / `100`; medium 8 the owner's, small and large Q3155.1 A), bound through a
new component key `size.{size}.bullet` on the space ladder instead of the radio dot (`control.size.{size}.dot`), so it
no longer follows density or the radio dot setting. The icon marker column is one step wider, 32 / 40 / 48px
(`space.400` / `500` / `600`; medium 40 the owner's, small and large Q3155.2 A), revising Q280.1 A's 24 / 32 / 40, so the
icon sits 12 / 16 / 16px from the text. The bullet and number column keeps Q340 A's 20 / 24 / 32. The radio dot
setting's description no longer says list bullets follow it. An Update corrects an existing file in place: 6 List.Item
members (bullet and icon) and all 9 List members are rewritten, every key and id kept. No token name moves, so CONTRACT
is unchanged.
