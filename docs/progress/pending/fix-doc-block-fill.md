## (2026-10-21) — `_Doc-block` fills its block, and a file already set up is repaired in place (#2902)

**STATUS: branch `fix/doc-block-fill`.** Plugin only (`apps/plugin/src/doc-block.ts`, `apps/plugin/test-doc-panel.ts`). No artifact moves; a patch change note.

**The defect, seen in a real library file.** Set up file's `_Doc-block` came out with its stretched layers hugging: Do-Dont's `columns` at 100px inside the 512px block (the `do` / `dont` columns collapsed to ~42px, items overflowing), Field's `row` hugging, Chips' wrapping `chips` at ~986px so it never wrapped, and the `top-padding` / `bottom-padding` spacers FIXED 512. Field's `label` was resized to (120, 1), which leaves `textAutoResize` NONE: clipped at 1px.

**Diagnosis.** Each of those set `layoutAlign = 'STRETCH'` before the node was appended to its auto-layout parent. For a horizontal auto-layout frame its own primary-axis HUG then wins. The owner checked the fix by hand in the file before this PR: FILL after the append, and `HEIGHT` on the label after its width is fixed.

**The change.**
- Build: `layoutSizingHorizontal = 'FILL'` on those five layers right after each append; the label takes `textAutoResize = 'HEIGHT'` once the row is placed.
- Repair: `ensureDocBlock` used to return `present` for a set already there, so a file set up earlier kept the broken block. It now runs `repairDocBlock` on that set: those layers by name, each member's own (never inside a nested instance), brought to FILL / HEIGHT in place. Nothing is deleted or rebuilt, because usage-panel instances point at the set. This is the `stretchSwatches` pattern (#2268). It is idempotent and returns how many layers it changed. No stamp is needed: the repair reads the properties themselves.
- The repair is silent in Set up file's line, as `stretchSwatches` is. The count is in the run's `docBlock` result.

**The gate.** `test-doc-panel.ts` `template/fill` and `template/repair`. The template shim now throws on FILL outside an auto-layout parent, as the host does, so FILL set before the append fails the run naming the layer.

Mutations, each failing by name:
- `fill(chips)` dropped → `template/fill`.
- `chips` dropped from the repair's list → `template/repair`.
- The label's `HEIGHT` dropped → `template/fill`.
- FILL moved before the append → `columns: FILL outside an auto-layout parent`.

**Not covered.** Other layers still set `layoutAlign = 'STRETCH'` before their append: the block's texts, Do-Dont's `rule` and items, the Specimen `stage` and the Divider instance. The file showed none of them wrong, so they are left as they are. A shim can't verify how the block actually renders.
