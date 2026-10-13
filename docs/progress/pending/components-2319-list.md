## (2026-10-13) — List and List.Item: a read list on a fixed marker column one line tall (#2319, Q273)

Built to the owner's decisions Q273 on #2319: `List.Item` (9 members, `type` [unordered, ordered, icon] × `size` [small,
medium, large]) and `List` (9 members, three nested items shown and five behind Figma-only booleans, off). No states, no
new tokens, no contract change. Category `data`, aliases `unordered-list`, `ordered-list`, `bullet-list`, on its own
`↳ List` page with List.Item beside it.

### Verified first (Q273.10)

The native Figma list fields, read from `@figma/plugin-typings` 1.131.0 and posted on #2319: `paragraphSpacing` and
`paragraphIndent` bind variables (on a node, a range and a text style); `listSpacing`, `indentation`, `hangingList` and
`listOptions` do not. The marker has no field of its own (no glyph, size, color or start number), so its ink can only
come from the text's fill, which does bind. The proposal's "can't bind" was right for size, partly wrong for the indent,
and wrong for ink as stated. What Dev Mode shows for a native list stays UNVERIFIED: this lane cannot open it.

### What the construction is

- **The marker column** is a box with a bound width (`space.300/400/500`, DRAFT 24/32/40) and a bound height
  (`control.size.*.line-box`), both FIXED, in a top-aligned row: checkbox-row's #1201 construction, so a wrapping item
  keeps its marker on line one. The text fills the rest of the row and wraps under itself (the hanging indent).
- **One marker per type**, each a `presentWhen`-gated part: a round `control.size.*.dot` box on `color.icon.primary`, a
  number text in the item's own body style on `color.text.primary`, or an icon swap slot.
- **The icon starts at `check`** through a new `PartDef.swapDefault`: a slot naming an icon-set glyph builds and
  defaults its swap property to `icon/<glyph>` instead of the file's nominated default. Projector-only (the executor
  already reads `swapTarget`), so `EXECUTOR_REVISION` does not move. A name outside the icon set throws at projection.

### Technical calls, and why

- **Ordered numbers stay designer-typed in Figma.** A nested item showing "2." needs a per-instance TEXT override on a
  `nest-fixed` part: a new plan field, an executor write (finding the nested component's suffixed TEXT property key),
  the file shim, the in-place update and the read-back. That is executor work with its own revision bump, not a small
  engine change, so every nested item shows "1." until typed. Code counts itself (CSS counters).
- **Sizes run small, medium, large**, not the medium-first order in the build brief: `test.ts` #2501 (Q213, Q221) holds
  every sized def smallest first, as Tabs is. Figma's default member is then `small`, the same as every other sized set.
- **The icon marker is 16/20/24** (`icon.size.sm/md/lg`), not the proposal's 16/16/20: a medium default off the `md`
  rung is an `ICON_OFFSET_DEFS` exception, which `lint-rung-names` reserves for the owner.
- **The native-list rule** (Q273.9) is in `ai.avoidWhen` and `docs.usage` in the decision's words. The Figma
  description is `summary`, at most 100 characters, so it carries a short form ("For running text, use a native text
  list.") rather than the full test.

### Traps

- A `type` axis with an `icon` value collides with the `icon` paint slot in `lint-paint`'s provenance rule, which reads a
  key's lead as an axis value. Admitted per key (`list-item|icon`) with the reason, rather than renaming the slot.
- `lint-axis-values` and `typecheck-components` read git-TRACKED def files, so a new def file is invisible to them (and
  `typecheck-components` fails on it) until it is staged.
- The Divider listed `list` in `composition.planned`; `component-refs` fails once a planned id is registered, so it
  moved to `ai.commonPartners`, which moves `divider.md`.
