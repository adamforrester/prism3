---
engine: patch
---
Update file no longer adds a second member to a set whose member lists its properties in another order (#2944). Figma
rewrites a member's segment order when an axis is renamed in its UI; the dry run matched that member by coordinate, but
the build's pass looked it up by its exact name, missed it, and built another member on the same coordinate, a variant
conflict. The update now renames such a member to the plan's order before the build's pass (not counted as a rename),
and the executor matches existing members by coordinate, so a Build skips it as present (`EXECUTOR_REVISION` 60, which
redraws no set). Plugin only; no committed artifact moves.
