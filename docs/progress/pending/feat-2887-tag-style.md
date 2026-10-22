## (2026-10-22) — Tag style lever: Pill or Underline (#2887)

**What.** A Form lever, `tagStyle` ("Tag style", Pill / Underline, default Pill), after Field style, built to the build
plan in #2887's second wireframe with the owner's Q513 (1–8) and Q540 (Q8 A copy as revised, Q9 A inset
`space.050 / 075 / 100`, Q10 A the inset does not follow density). `applyTagStyle` runs after `applyFieldStyle` in all
three restated chains (`materializeForBrand`, `lint-lever-sweep.ts`, `specMaterialize`). Studio: a Tag style row after
Field style on the Shape page. Plugin: `tag-style-note.ts` states a style change in Apply's summary and points at Update.
**Its copy is a DRAFT for the owner.**

**How the tighter gap is built.** The wireframe's "content row held at the icon's height" lands on the label row
(`labelCheck`), not on the content row: a frame's `minHeight` includes its padding, so a floor on the padded content
row would let the label move by (glyph − line box) ÷ 2 when the check appears. The content row takes the block-end inset
and the unpadded label row takes the floor, which gives the arm's geometry exactly: label line box bottom = inset +
(glyph − line box) ÷ 2 above the frame's bottom, in all five example brands at every size.

**Trap for whoever re-verifies.** `applyMinWidthRatio` multiplied `p.height`; under Underline the container has a
`minHeight` instead, so the ratio now reads `height ?? minHeight`, and the schema admits `minWidthRatio` beside either.

**Mutations, each failing by name:** the unselected hover weight bound to `hairline` → `tag underline: hover and pressed
are 2px`; `applyTagStyle` changing the def under `pill` → `#2887 identity`; the focus-visible line thickened → `tag
underline: focus-visible keeps the line weight`; the container back to `align: center` → `#2887 underline label sits on
its inset`; `minHeight` dropped → the same arm; `applyTagStyle` dropped from the plugin chain → the plugin read-back and
`test-roundtrip`'s chain agreement.
