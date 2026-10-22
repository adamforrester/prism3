## (2026-10-21) — `_Doc-block` fills its block, and a file already set up is repaired in place (#2902)

**STATUS: branch `fix/doc-block-fill`.** Plugin only (`apps/plugin/src/doc-block.ts`, `apps/plugin/src/doc-panel.ts`, `apps/plugin/test-doc-panel.ts`). No artifact moves; a patch change note.

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

**Two usage-panel defects from the same file, fixed here after the independent review (owner decisions Q541).**
- Do and Don't items were never written: every panel reported `_Doc-block has no item text layer`. The panel looked for a layer named `text`, which is List.Item's text *property*; the layer is the part, `label`. The panel now reads the part from List.Item's def (`figmaProperties.texts.children.part`). The shim had copied the same wrong name into its fixture, so nothing caught it (docs/34). The fixture now takes the layer from List.Item's projected plan, and `panel/do-dont` checks every planned item is written (303 across the defs).
- A set's own tagged furniture no longer blocks its panel. `blockersAt` (shared by the draw and the dry run) skips nodes whose furniture tag names this set. An untagged `inverse-bg` still blocks (Q172.5), and so does another set's furniture. Prism3's backdrop is instanced as `_inverse-backdrop` and reaches only `BACKDROP_PAD` past the set, short of the panel's `PANEL_GAP`, so the `inverse-bg` the real file reported is most likely a hand-placed rectangle; that question is on the PR.
- The review's should-fix: `template/repair leaves hand edits` (a fill and vertical sizing on each repaired layer survive) and `template/repair stays out of nested instances` (decoy `row` / `columns` inside List.Item).

Mutations, each failing by name: the literal `'text'` restored → `panel/do-dont`; the own-furniture skip dropped → `overlap/own backdrop`; the skip widened to all tagged furniture → `overlap/other backdrop`; the repair clearing fills → `template/repair leaves hand edits`; the repair recursing → `template/repair stays out of nested instances`.

**Not covered.** Other layers still set `layoutAlign = 'STRETCH'` before their append: the block's texts, Do-Dont's `rule` and items, the Specimen `stage` and the Divider instance. The file showed none of them wrong, so they are left as they are. A shim can't verify how the block actually renders.
