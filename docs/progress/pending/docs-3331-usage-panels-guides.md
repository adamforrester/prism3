## (2026-11-18) — Update a Figma file describes the Usage panels group and Clean up's panels (#3331)

The Update guide's checklist table said it listed every item in order, but it had no row for the
**Components › Usage panels** group #3137 added, and Clean up never mentioned the panels it can
remove. Following the owner's 2026-11-18 decision (A), the lane drafted both, and they are marked DRAFT for
the owner to approve before merge. The agent-link row #3331 also asked for (`panels-clean`) was
already on main, so this PR leaves `agent-link.md` alone.

- **The row** sits after Due, where the checklist draws it. It cites the copy for its claims and
  `panelSetsOf` for why a queued or due set is left out of the list, because that set's own run
  draws its panel.
- **Clean up › panels** follows the style-guide tables paragraph. It quotes the card's two lines
  and cites `panel-census.ts` for the claim that only unedited panels are removed and counted.
- **Not changed:** the badge-name sentence near the top still lists only ", theme" among the extra
  parts. #3137 also adds ", usage panels" there. That is filed as #4022, not fixed here.

`lint-guide-claims` passes. Mutating the quoted Clean up count line ("had panels on" to "had them on") fails it by name under CITE. A mutation of the row's disclosure quote does not fail, because the row's bold labels still anchor its claim. That is the gate's documented one-anchor rule, not a gap this PR opens.
