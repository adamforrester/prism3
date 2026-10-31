## (2026-10-30) — Option rows: the control-to-label gap is 8 / 12 / 12 (#3173)

**Status:** owner decision Q3173 A, built. The gap between the control and the label on Checkbox.Row, Radio.Row and Switch.Row is 8 / 12 / 12px (small / medium / large) at comfortable density; medium moved from `space.100` to `space.150`. Switch.Row has no large, so it is 8 / 12, and the three rows stay in step. The gap stays in `densitySpacing`, so compact is 6 / 8 / 8 and spacious 12 / 16 / 16. ENGINE minor (change note). CONTRACT unchanged: component keys are not in the token-name contract. No executor code moved, so `EXECUTOR_REVISION` stays at main's number.

**The description indent needed no change of its own.** Since #3153 the description is the second child of the text column (`textStack`), which sits beside the control cell inside `content`, so it starts wherever the label starts: one gap past the control. The new gate measures that edge in px instead of trusting the structure.

**Gates:**
- `test.ts` `#3173 gap`: the gap typed as px literals per density (6/8/8, 8/12/12, 12/16/16), read off the Figma plan's `itemSpacing` on the part that holds the control cell (found by what it holds, not its name) and resolved through every corpus brand's emitted tree. All three rows.
- `test.ts` `#3173 description start`: the label and the description start one gap past the control, by a layout walk over the plan, at comfortable on both option rows.
- `test.ts` `spacing model`: the rows' literal table moves with it (medium 6/8, 8/12, 12/16).
- `apps/plugin/test-update-apply.ts` `rows3173/…`: each row built with the old medium gap takes one Update in place. Only the medium members read update, the gap binds `space/100` / `space/150` / `space/150` by size, every key and id is kept, and the next dry run reads all current.

**Regenerated:** component docs pages, `specs.json`, the token-usage reports, the component surface baseline (`lint-component-surface.ts --accept`, under the change note) and Studio's component catalog (`gen-component-catalog.ts --write`, whose density readout now shows the 12px medium gap).

**Mutations, each failing by name:** medium back on `space.100` on Checkbox.Row → `#3173 gap`, `#3173 description start`; the same on Switch.Row → `#3173 gap`; Radio.Row's gap taken out of `densitySpacing` → `#3173 gap`; Radio.Row's description moved out of the text column → `#3173 description start` (and the #3153 arms); the plugin executor skipping an in-place rebind of an existing `itemSpacing` binding → `rows3173/verdict`, `rows3173/gap`.
