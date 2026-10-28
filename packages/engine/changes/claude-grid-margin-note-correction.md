---
engine: patch
---
Correction to the claude-grid-margin-lever note (#3065, #3070). That note gives the reference brand's md margin of 44 as
"whole-pixel 41px columns at 1440 with 24 columns and 16px gutters". The 41px figure is the brand's desktop spec in
its own two-mode layout, where md (768+) carries the 24-column, 16px-gutter desktop grid. It is not true of the
engine's 5-breakpoint grid, where md is 8 columns and a 44 margin gives 71px columns at 768. The margin, its link to
`core/dimension/44` and every emitted value are as that note says. Prose only: no committed artifact moves.
