## (2026-11-03) — FieldMessage: the status glyph centers on the message's first line (#3360)

**Owner decisions Q-FM1 A and Q-FM1.1 B.** The field message's status glyph centers on the caption's FIRST line. A
one-line message reads exactly centered, and a wrapping one keeps the glyph beside its first line. Option B, centering
the glyph on the whole block, floats the glyph between the lines of a two-line message. Q-FM1.1 B: no new tokens just
for the field message, so the offset is computed in the component, not baked into `type.caption.*`.

**The diagnosis.** The row was `align: 'start'`, so the glyph's top met the caption's top. That is centered only when the
caption's line is exactly the glyph's height. Every corpus caption.md line is shorter than the 16px glyph: 15.4px
(11 × 1.4) in four brands and 14px (10 × 1.4) on the reference brand. So the glyph sat 0.3px, or 1px, above the
first line's middle.

**The fix.** The glyph sits in `glyphCell` and the caption in `captionCell`. The row's new `PartDef.firstLine` names the
two cells, the caption and the glyph's size key. At paste, both executors read the caption node's own line height and
the glyph variable's value, and pad the shorter cell down by half the difference. This is the `minLines` division of
labor (textarea's rows): the plan carries names and stays brand-invariant, and the number is frozen per file because
Figma's padding binds one variable and takes no max or half of two. Code computes the same live from `1lh`. The line is
the unrounded one, as the text renders it, so the two middles agree exactly. The row stays top-aligned, as #1009 half 1
requires, and its glyph-height floor (2026-09-25, option (a)) is unchanged. `EXECUTOR_REVISION` 49 redraws
`field-message` only, measured by `lint-executor-reach`.

**The gates.** `test.ts` `#3360 field-message glyph on the first line` runs the paste executor per corpus brand, with the
stub's text metrics set to that brand's caption composite and the glyph variable to its `icon.size.xs`. It then places
the glyph and the first line from the built nodes' own layout and paddings, for a one- and a two-line message, at
caption.md and caption.lg, and does the same from the def as code reads it. Tolerance 0.01px. `#3360 built` in
`test-write-components.ts` measures the plugin executor in the shim's layout model. The readback (`anatomy-readback.ts`
`firstLine`) re-derives the agreement from the host's text metrics, glyph height and paddings, and the round-trip
caught a shim that answered the glyph variable and the glyph's box from different tables. Mutations, each failing by
name: main's def, `firstLine` dropped, the row centered, and the line taken off `Math.round` in either executor.

**Trap for whoever re-verifies.** The shim's `resolveForConsumer` and a bound value come from different tables, so a
test building field-message must resolve `icon/size/xs` to the size it binds (`varOverrides`), or the inset is computed
for another glyph. A built Figma file was not measured; the def's `notes.unverified` records the first-line assumption.
