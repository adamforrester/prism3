---
engine: minor
---
Tabs: the selected tab's 2px indicator overlaps the list's 1px baseline, bottom edges aligned, and paints over it (owner
decision on #3344). Until now the list kept a 1px inset under its tabs, so the indicator sat on the baseline as a second
line. The list's bottom inset is gone, so the tabs reach the list's bottom edge and the list is 1px shorter, and the
baseline comes before the row of tabs, so it draws under them. The baseline is still one part of the list, pinned across
its foot. No color, weight or size moves, and the executors are unchanged. The Tabs plan, its docs page and specs, and
the token-usage report move; CONTRACT is unchanged.
