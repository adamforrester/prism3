## (2026-11-07) — Layout: Grid above Breakpoints (#683, Q111 A)

The owner decided (Q111 A) that on the Layout page, Grid comes before Breakpoints. The Breakpoints list's column
ladder reads the base grid columns that Grid sets, so the control now sits above the list that shows its effect.

- `shell/pages.ts` reorders the page's sections to Grid, Breakpoints, Containers. The levers pane draws them in that
  order (`domains/layout.ts` maps each section by title, so nothing else moved).
- `preview/layout.ts` draws its sections in the same order. Q23 pairs each preview section with its lever section, and
  `test:chrome` holds the two lists equal, so the preview has to follow.
- `test:chrome` and `test:smoke` each keep a literal expected order; both now read Grid first, and the approved hints
  list follows the preview's order.
- The public guide `theme-a-brand.md` lists the Layout page's sections in the new order, as its other rows do
  (review finding).

### Held for the owner

- The page intro, "Breakpoints, the grid and content widths.", still names Breakpoints first. It is approved copy, so
  it is left as it is and flagged in the PR rather than reworded here.
- Grid's per-breakpoint rows (columns, gutter, margin for each breakpoint) now sit above the list where breakpoints
  are added and removed. Adding one still adds its row in Grid on the next draw; the order is flagged in the PR in case
  the owner wants the per-breakpoint rows split from the base columns.
