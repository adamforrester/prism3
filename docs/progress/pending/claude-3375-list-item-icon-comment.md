## (2026-11-18) — Correction to 2026-10-14 List and List.Item: a read list on a fixed marker column one line tall (#2319, Q273): the icon marker is 20/24/32 (#3375)

That entry says "**The icon marker is 16/20/24** (`icon.size.sm/md/lg`)", and its Q280 block notes "icon markers
16/20/24" as stated. The two halves of that sentence disagree: `icon.size.sm/md/lg` resolve to 20/24/32px, and that is
what List.Item has drawn since it shipped. The def's header comment repeated the 16/20/24. The owner decided #3375 A
(2026-11-18): the bindings stay, so small, medium and large draw a 20, 24 and 32px icon, inside the 21/24/27 line box.
Large's 32px icon is taller than its 27px line, as built. The original entry stays as written, per CONTRIBUTING §2.

**What changed.** Only the comment in `components/list-item.ts`, which now states 20/24/32 and cites #3375. No binding
moved and every committed artifact regenerates unchanged, so there is no change note.

**Measured.** `test.ts` #3375 reads the first `N/N/N` in the ICON MARKER comment and compares it with the px the def's
`size.{small,medium,large}.icon` bindings resolve to through `ICON_SIZES`: on main it fails (comment 16/20/24, drawn
20/24/32); with the fix it passes. Mutations that fail by name: the comment back to 16/20/24 fails "#3375 List.Item's
ICON MARKER comment states the sizes its bindings draw"; `size.large.icon` rebound to `icon.size.md` fails "#3375
List.Item binds its small, medium and large icon marker at 20/24/32" (and the comment arm).
