## (2026-11-13) — CodeInput.Cell: the one-value style axis (#3554 Q193)

**Status:** CodeInput.Cell def, axis register, test arms. ENGINE minor (change note). CONTRACT unchanged: no token path
moves. No executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q193 A (2026-11-13, on #3554):** CodeInput.Cell declares `style: ['outline']` (authoring), the axis
  Select took under Q-CC3 A (#3644), and the register's `style` row in `lint-axis-values.ts` lists it. The Field style
  setting already reached the cell through `FIELD_FRAME_PARTS`; now its code surface says so, like every other field.
- The cell's existing `brand-setting` codeOnly entry ("style — the cell's edge is the brand's Field style setting…") is
  folded into the `style — not projected` line (class `not-projected`), in the same words, so the cell carries one style
  entry, not two. The #2711 arm's admission list gains `code-input-cell:style`.

### Diagnosis

`style` is a code axis only: `figmaProperties.variantAxes` stays `size, status`, so the cell still projects 48 members.
As with Select, the component-surface hash moves because every member's plan carries the def's codeOnly list, and the
paint census moves only the cell's grid hash, because the grid walks the code coordinates and each now carries
`style=outline`. Every count holds. No def, axis, value or property left the projection, so no rename record
(`lint-component-renames` passes unchanged). The parent CodeInput declares no `style` axis; Q193 names the cell only.

### Verification

A `test.ts` arm, `Q193 code-input-cell`, with literals typed from the decision: the axis, its kind, the unchanged Figma
axes, 48 members, and exactly one `style` codeOnly entry, of class `not-projected`. Dropping `style` from the cell (the
committed `wip:` mutation) fails `Q193 code-input-cell`, both `#2711 codeOnly admissions` arms and `lint-axis-values`
by name.
