## (2026-10-09) — Text field: the end caret's position is measured on the shim, not only its order (#2439)

Found in Lane D's review of #2414 (#2318, owner Q166 C). The end caret (`caretEnd`, the `caret-end` slot) on text-field's
`focus-visible-filled` members was held by its ORDER (the node right after `value`), its ink, width and one-line height.
Nothing read WHERE it is drawn, so a layout change could leave it after the value in node order but visibly apart from
the text.

**The new arm,** `field end caret position` in `apps/plugin/test-write-components.ts`, reads on the shim's layout model,
on every text-field member at the new state (12):
- the bar's `x` is the value's right edge (`value.x + value.width`), with no gap;
- the value hugs its text, at the shim's own text metric (6px a character, no style advance in this build, typed in the
  test as the shim's figure, not read from the def);
- the bar's right edge is inside `content`'s clip.
It is a separate arm from the order/ink/size one, so each fails by its own name.

**Mutations,** through the #2272 harness against `npm run -w @prism3/plugin test`, each failing only this arm:
- M1, a gap on the entry row: `end caret x 88, want the value's right edge …`.
- M2, a default value too long for the field: `end caret's right edge 854 is past content's clip …`.
- M3, the entry row set to fill and the value to wrap, so the value stretches: `the value is 256px wide around 72px of
  text …`. The first M3 tried (the value wrapping alone) changed nothing: a wrapping text inside a hugging row does not
  stretch, so that mutation was a no-op, not a blind spot, and the arm needed the row to fill before the value could
  move.

No engine or projection change, so no change note.
