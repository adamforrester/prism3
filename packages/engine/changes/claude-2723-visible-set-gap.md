---
engine: minor
---
The gap between component sets on a page is the white space a designer sees (#2723, owner decision Q335 A): 160px from
the outer edge of one set's canvas furniture (labels, brackets, backdrop) to the next set's, on every page, Button
included. It replaces the 400px frame-to-frame gap of #2502. The plugin places a new set again once its labels are
drawn, so the gap is measured from them; Update moves a set whose labels sit closer than 160 to its neighbor's, or
whose frame sits exactly 400 from its neighbor's, where the earlier rule put it, and leaves any other spacing a designer
chose. The paste payload's copy of the rule writes 160 (it draws no labels, so its new set's edge is its frame).
When an Update redraws a set's labels wider, the same Update then moves the sets to its right clear (Q358 A), so one
Update settles the page and no labels overlap in between. EXECUTOR_REVISION 29. No token or emitted artifact moves; CONTRACT is unchanged.
