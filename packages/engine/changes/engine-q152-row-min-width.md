---
engine: minor
---
Checkbox-row, radio-row, checkbox-group and radio-group shrink with their column, as the fields do (owner decision Q152.3: Q99 B reaches the
rows). The row's root is built at 320 (`placementWidth`, the fields' #2292 mechanism) and fills its column when a
host places it, down to the fields' 120 floor (Q152.2). Before, the root hugged above a `minWidth: 320` floor, so a
row in a column narrower than 320 held at 320 and overflowed it. An unplaced row still reads at 320, and the label
still fills the row and wraps. Both values are literal projection defaults, so no token name or value moves and
CONTRACT is unchanged. Checkbox-group and radio-group follow their rows (owner decision Q155 A): their container, which floored at 320,
is now built at 320 and fills its column down to the same 120 floor.
