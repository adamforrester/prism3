## (2026-11-11) — Pagination's current-page underline binds the selection mark (#3554 Q-CC12 A)

Owner decision Q-CC12 A, the Pagination half (the canon half, Link as the named exception, travels with the
skill's §5 edit). Pagination.Item's underline style marks the current page with a 2px bar on `border.tertiary`
(Q381), and the underline is that style's only cue, held at 3:1 by Q427 A. #3346 PR 2's outline-edge setting
quiets `border.*`, so it would thin the bar below 3:1. The bar now binds `color.interactive.neutral.indicator.rest`,
the neutral selection mark, which matches the number's ink; its value moves from mid gray to the label ink. The
border style's outline stays an edge on `border.secondary` (Q427 A).

- `test.ts`: the Q381 arm now asserts the indicator role; the per-member expectations follow; the Q427 A arm keeps
  its ladder oracle but anchors it on `border.tertiary` instead of the underline's role, since the underline is no
  longer on the border ladder, and still requires the border to read lighter than the underline in every cell. The
  3:1 contrast pair for the underline measures the new role, unchanged in floor.
- The paint census and component-surface baselines were re-accepted for `pagination-item` (same member count).
- The description, the underline part's note and an evolution entry say the bar is in the number's ink.
