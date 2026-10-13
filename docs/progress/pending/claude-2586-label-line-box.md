## (2026-10-13) — Label line-box tokens: a glyph on a title's first line, derived from the type (#2586)

**Status:** engine tokens, the Figma `control` collection, two `test.ts` arms and the control field pin. ENGINE
minor (change note). CONTRACT 14.6.0 → 14.7.0, MINOR: `control.size.{sm,md,lg}.label-line-box` added, nothing
removed or retyped (`--accept` run after the raise). Accordion is unchanged. #2534 had not merged, so moving its
`title-offset` onto these tokens is a follow-up.

### What changed

`tree.ts` bakes one line of `type.label.{rung}` (font size × line height, rounded) beside the body `line-box` of
#1201, with the same agreement throw as #1220. The two maps are kept separate so the error names the right token.
In all five brands today: 14/16/21px at sm/md/lg, against the exact 13.8/16.1/20.7.

### Why the line box alone, and no offset token

The issue left open whether the baked first-line offset per (glyph, rung) is needed too, since Figma cannot
subtract either. It is not, and the line box is the smaller surface that builds:

- **The construction:** the glyph sits in a box `label-line-box` tall and centers in it, on a top-aligned row. This
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

- `#2586 … label-line-box is one line of the emitted type.label.{rung} type`: the expected px is read from the
  emitted label composites through their own aliases (font size → px, line-height role → ratio), never from the
  token or `theme.typography`. It runs over nb, the contract corpus and a synthetic row: aurora with only its label
  composites re-pointed at the 1.5 step.
- `#2586 a label line-height change moves the token`: md must be about 21px in that row, and differ from the corpus.
- `#2586 a glyph centered in the label line box sits on the title's first line within 0.5px`, against the unrounded line.
- `#2586 a label composite that disagrees …`: the #1220 shape, for the new throw.
- The control field pin now reads nine fields, and fired on the first run, as it should.

### Trap for whoever builds on this

A title row should bind `label-line-box` as the glyph box's HEIGHT and center the glyph in it, with the row
top-aligned. Padding the title by a constant (Accordion's `space.025`) is what this replaces. Its error grows with
the label line height.
