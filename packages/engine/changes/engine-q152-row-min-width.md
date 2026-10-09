---
engine: minor
---
Checkbox-row and radio-row shrink with their column, as the fields do (owner decision Q152.3: Q99 B reaches the
rows). The row's root is built at 320 (`placementWidth`, the fields' #2292 mechanism) and fills its column when a
host places it, down to the fields' 120 floor (Q152.2). Before, the root hugged above a `minWidth: 320` floor, so a
row in a column narrower than 320 held at 320 and overflowed it. An unplaced row still reads at 320, and the label
still fills the row and wraps. Both values are literal projection defaults, so no token name or value moves and
CONTRACT is unchanged. Checkbox-group and radio-group keep their own 320 container floor.
