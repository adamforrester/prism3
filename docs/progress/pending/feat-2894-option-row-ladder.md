## (2026-10-22) — Option rows land on the control-height ladder (#2894, Q539)

Owner decision Q539 on #2894 (A on every question of the wireframe): Radio.Row, Checkbox.Row and Switch.Row now measure 36/44/56 at comfortable in both projections, where they measured 45/48/51 in Figma (Switch.Row 21/24) and floored only in code.

- **The floor sets the height, not the padding.** Symmetric padding cannot land on the ladder from the space ladder (the exact pads are 7.5/10/14.5), so the row binds `size.{size}.min-height` as its Figma `minHeight` (the Select and Accordion mechanism) and the pad becomes a per-size minimum (`space.075`/`100`/`150`) that only shows once a label wraps. No new token; CONTRACT unchanged.
- **Centering without breaking the first-line rule.** The row centers one inner box, `content` (Q?3 A), which keeps the control and label top-aligned: Accordion's Q276 A construction. `test.ts` #1201 now reads the alignment on the control cell's parent rather than on the root, and #1009 half-1 still catches a centered `content` by name.
- **Density.** `pad-y` joins `densitySpacing`, so compact rows compact (29/36/44; small is 1px over its 28 floor because 4 + 21 + 4 = 29).
- **Update cost accepted (Q?6 A).** Files that already hold these rows need an Update, which reparents the label and the nested control under `content`. A per-instance override on the nested control may not carry over; a dry run on a copy of a shipped file comes before any master update.
