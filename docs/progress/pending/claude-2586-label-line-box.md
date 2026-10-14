## (2026-10-13) — Label line-box tokens: a glyph on a title's first line, derived from the type (#2586)

**Status:** engine tokens, the Figma `control` collection, two readers of `type.*` (`visualize.ts`,
`ai-metadata.ts`) and `test.ts` arms. ENGINE minor (change note). CONTRACT 14.6.0 → 14.7.0, MINOR:
`type.label.{sm,md,lg}.line-box` added, nothing removed or retyped (baseline rebuilt from main's 14.6.0, `--accept`
run after the raise). Accordion is unchanged: moving its `title-offset` onto these tokens is a follow-up.

**The name (owner Q275.1 B, Q282 A).** The draft was `control.size.{rung}.label-line-box`. The owner moved it to
`type.label.{rung}.line-box`: it sits with the type it measures, and "label" no longer means two things on one rung
(`control.size.*.line-box` is a checkbox label's line, set in body type). The Figma variable `type/label/{rung}/line-box`
lives in the single-mode `control` collection, not the viewport-moded `type-sets`, since it is one baked px per rung.

### What changed

`tree.ts` bakes one line of `type.label.{rung}` (font size × line height, rounded) the way #1201 bakes the body
`line-box`, with the same agreement throw as #1220, and emits it beside the label composites. The two maps are kept separate so the error names the right token.
In all five brands today: 14/16/21px at sm/md/lg, against the exact 13.8/16.1/20.7.

### Why the line box alone, and no offset token

The issue left open whether the baked first-line offset per (glyph, rung) is needed too, since Figma cannot
subtract either. It is not, and the line box is the smaller surface that builds:

- **The construction:** the glyph sits in a box `type.label.{rung}.line-box` tall and centers in it, on a top-aligned row. This
  is the selection controls' `controlBox` construction (#1201) with the label's line in place of the body's. The
  glyph's center is the box's center whatever its size, so it lands within 0.15px of line one at every rung (only
  the px rounding is left over).
- **An offset can go negative.** `(glyph − line) ÷ 2` is 1.1/1.95/1.65px today but −0.5px at md with a 1.5 label
  line height, which is exactly the lever #2586 must land ahead of (Q160). A negative padding does not exist in
  Figma auto layout. An offset token would need a second construction (pad the glyph instead of the title) chosen
  by sign, and nine tokens (3 glyphs × 3 rungs) rather than three.
- **The cost:** when the glyph is taller than the line (every glyph Accordion uses today), it overflows its box
  equally above and below, by 1/2/1.5px at sm/md/lg, into the row's block padding (8px or more on Accordion).
  Centering does that on its own, in Figma and in CSS flex. The row's height comes from the title, not the glyph.

### The gate

- `#2586 type.label.{sm,md,lg}.line-box is one line of the emitted type.label.{rung} composites`: the expected px is
  read from the emitted label composites (filtered to `$type: typography`, so the line box is not read as one) through their own aliases (font size → px, line-height role → ratio), never from the
  token or `theme.typography`. It runs over nb, the contract corpus and a synthetic row: aurora with only its label
  composites re-pointed at the 1.5 step.
- `#2586 a label line-height change moves the token`: md must be about 21px in that row, and differ from the corpus.
- `#2586 a glyph centered in the label line box sits on the title's first line within 0.25px`, against the unrounded
  line. It restates the construction rather than checking it independently (review nit): rounding bounds the two
  centers at 0.25px apart whenever the value arm passes, so it cannot fail alone. It is kept, commented, at that bound.
- `#2586 a label composite that disagrees …`: the #1220 shape, for the new throw.
- `#2586 tokens.html draws no type specimen for a non-typography leaf under type.*` and `#2586 ai.json gives no type.*
  leaf the "Private primitive" consume line`: the guard for the standing cost below.
- The control field pin is unchanged at eight fields, so an old-path leaf emitted beside the new one fails it by name.

### Trap for whoever builds on this

**`type.*` is no longer composites only.** Before this, every leaf under it was a typography composite, and two
readers assumed so without saying: `visualize.ts` `walkType` drew the line box as a 0px specimen, and `ai-metadata.ts`
let it fall through to the primitive tier as "Private primitive — prefer a semantic token", the opposite of what it is
for. Neither failed a gate; both were found by hand. The sidecar role sits in the `layout` tier, beside its body twin
`control.size.*.line-box`, not in `typography`: that tier's schema entry requires an `avoid_when` and a composite or
alias value, and the line box is a literal box height. The schema's layout pattern was extended to admit
`type.*.*.line-box`; a field was not added, so its `$id` is unchanged. Any new walker of `type.*` must filter on `$type`. The guard arms
cover these two readers, not a reader not yet written.

A title row should bind `type.label.{rung}.line-box` as the glyph box's HEIGHT and center the glyph in it, with the row
top-aligned. Padding the title by a constant (Accordion's `space.025`) is what this replaces. Its error grows with
the label line height.
