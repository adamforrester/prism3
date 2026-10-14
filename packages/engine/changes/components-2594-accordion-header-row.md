---
engine: minor
---
Accordion's header centers a new `titleRow` frame holding the indicator and the title (#2594, owner decision Q276 A).
The header was top-aligned so the glyph could sit beside a wrapped title's first line (Q262 A), and that put all of
the 44px floor's slack below a single line: 6px high at small. The row keeps its items top-aligned, so a wrapped title
still keeps the glyph on line one, and the header centers the row, so one line is centered at every size, type and
density. The gap moves from the header onto the row; padding, the focus ring and the Divider are unchanged. Every
binding is an existing role, so CONTRACT is unchanged. A set built before this updates in place, every member kept.
