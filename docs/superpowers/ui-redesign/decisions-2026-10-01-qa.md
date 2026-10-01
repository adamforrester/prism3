# UI redesign: owner QA notes on concept v6 (2026-10-01)

The owner's QA notes on the v6 mockup, sent during S1.2 of the implementation plan. This file extends `decisions-2026-09-30-v6-review.md`, and wins wherever the two differ. S1.2 applies Q1 to Q3 (`docs/progress/pending/ui-s1-2-frame.md`); Q4 is deferred.

| # | Topic | Decision |
|---|---|---|
| Q1 | Color sub-nav placement | On the Color tab, the **Palettes · Surfaces & fills · Interactive** segments go **below the tab row's divider**, not above it. The tab row and its hairline come first; the sub-nav sits under the line, at the top of the levers panel. |
| Q2 | Divider alignment | The levers tab row and the preview title row **share one height**, so their bottom dividers sit at the same y across the split. In v6 the two lines are visibly offset. Both rows take one shared header-height value. `test:chrome` checks it: the tab row's bottom border and the preview header's bottom border at the same y, within 0.5px, at 1280, in light and dark, on a page with the sub-nav and one without. At 380 there is one pane, so the check is skipped there. |
| Q3 | Search | The always-visible "Search settings" field is out of place. Whether to keep search at all is **open**: the owner wants to see it working first (v6's search typed characters backwards). Search goes **behind an icon button in the levers header**: a magnifier, a target of 24px or more, named "Search settings". It opens a field in place; Escape closes it and returns focus to the icon. The caret holds and nothing is rebuilt per keystroke (the P2 subscriber model; the field itself is never re-rendered). A test types "radius" and reads "radius" back, with the radius lever among the results. Flagged in the PR **for the owner's review: keep or remove**. |
| Q4 | Preview follows the lever | **Deferred.** The owner is open to a later trial: the preview scrolls to show the part that matches the lever being edited. It is tried on one section first, in one slice (likely S2, Palettes), and the owner then decides whether it applies everywhere. Not built in S1.2. |

Other notes from the owner, for the overnight lanes: a design call that neither v6 nor these notes cover takes the option closest to v6 and is flagged in the PR. Nothing brand-facing is decided in a lane.
