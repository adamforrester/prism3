---
engine: minor
---
#2292: text-field, select and textarea fill their column when placed FILL. Each field's root is now built at
320 (`placementWidth`, the #1757 mechanism field-label and field-message already use), and `fillsAxis` treats a
root built at its placement width as bounded across, so the bordered control (textarea's through `body`) FILLS
the root, FIXED along its row with the column's STRETCH, keeping its `minWidth: 320` floor. An unplaced field
still reads at 320; an instance set to fill a 505px column now has its input box at 505, where it stayed at 320.
Projected component surfaces move (the three field sets' roots and controls); no token name moves, so
CONTRACT_VERSION stands. No size, floor value or visual changes.
