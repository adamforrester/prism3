---
engine: minor
---
Canvas placement in the plugin, consolidated (owner decision Q432 A; supersedes #2737, #2717, #2770 and #2760).
The gap between component sets on a page is now the white space a designer sees: 160px from the outer edge of one
set's canvas furniture (labels, brackets, backdrop) to the next set's, on every page (#2723, Q335 A). It replaces the
400px frame-to-frame gap of #2502. The plugin places a new set again once its labels are drawn. Update moves a set
whose labels sit closer than 160 to its neighbor's, or whose frame sits exactly 400 from its neighbor's, where the
earlier rule put it. After the furniture redraw, the same Update re-spaces once more from the labels as drawn (Q358 A),
and a set that sat exactly 160 away before the redraw goes back to 160 (#2734). Column labels on narrow sets read in
full, because the set's columns widen to the widest label (#2705). Under a page header, a set's labels go on the
header's left edge, not its frame, both for a rebuilt set and for one Update lifts below the header (#2735). The paste
payload writes 160. EXECUTOR_REVISION 34. No token or emitted artifact moves, and CONTRACT is unchanged.
