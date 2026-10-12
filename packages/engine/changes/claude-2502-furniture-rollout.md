---
engine: minor
---
Canvas furniture on every component def that builds a set (#2502, owner decision Q212 A). The switch, renamed
`CANVAS_FURNITURE` from `CANVAS_FURNITURE_PILOT`, now lists all 27 such defs; Icon and Spinner build single components
and stay off. For the five newly covered defs with a `surface` row axis (Button destructive, Button neutral and the
three icon buttons), `planSetLayout` now groups `surface` outermost, so their inverse rows form one block, as Button's
have since #2471. Layout only: no member is added, removed or renamed, no token moves, so CONTRACT is unchanged, and an
existing file sees the regrouped members as moves on its next Update. The paste payload places a new set 400px right of
its neighbors, not 160, matching the plugin's widened `SET_GAP`, so a later set's row labels fit between the two.
