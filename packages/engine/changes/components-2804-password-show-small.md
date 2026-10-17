---
engine: minor
---
Password field: the Show/Hide button is a small text Button at every field size, and the label row is one label line
tall (#2804, owner decision Q380 A). The nested Button no longer follows the field's size: it nests `size=small` on all
84 members, and it stretches to the label row (`STRETCH`), so the row hugs the label alone. The row measures 18 / 21 /
24px at small / medium / large instead of the button's 36 / 44 / 56, and the label sits 8px above the box at every size
(the root gap, where TextField's label sits) instead of 17 / 19.5 / 24px. In code the button in the row sets
`block-size: auto` and `padding-block: 0`. Its code-side hit area stays 44×44 at medium and large, anchored to the
row's bottom edge so it never reaches into the input box, and 24×24 at small. No token moves, so CONTRACT is
unchanged.
