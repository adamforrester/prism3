## (2026-11-02) — FieldMessage: the status glyph centers on the message's first line (#3360)

**Owner decision Q-FM1 A.** The field message's status glyph centers on the caption's FIRST line. A one-line message
reads exactly centered, and a wrapping one keeps the glyph beside its first line. Option B, centering the glyph on
the whole block, was the simpler answer and floats the glyph between the lines of a two-line message.

**The diagnosis.** The row was `align: 'start'`, so the glyph's top met the caption's top. That is centered only when the
caption's line is exactly the glyph's height. Every corpus caption.md line is shorter than the 16px glyph: 15.4px
(11 × 1.4) in four brands and 14px (10 × 1.4) on the reference brand. So the glyph sat 0.3px, or 1px, above the
first line's middle. The def's own note had flagged this as unmeasured against a wrapping message (#1009).

**The fix reuses #3153's option-row construction** on the caption type, rather than a new mechanism. The glyph sits in
`glyphCell`, whose floor is one caption line and which hugs the glyph, so it is max(glyph, line) and centers the glyph.
The caption sits in `captionCell`, set down by `glyph-inset`, which is half the glyph less the line and 0 where the line
is the taller. The row stays top-aligned, as #1009 half 1 requires. The caption cell is present in every status, so
the caption starts at one height whatever the status and a validation result moves no text. The row's glyph-height
floor (2026-09-25, option (a)) is unchanged.

**Two baked token families, CONTRACT 14.14.0.** `type.caption.{md,lg}.line-box` is the caption twin of the label and
body line boxes. `type.caption.{md,lg}.glyph-inset` is the caption's inset beside `icon.size.xs`. Both are baked
because Figma cannot take a max or a half of two variables. The inset is taken off the UNROUNDED line (0.3px, not the
0.5px the rounded 15px box would give), so on every shipped caption the two middles agree exactly. Where the line is
the taller (caption.lg, 16.8px), the rounded box leaves the glyph up to 0.25px off, which is #2586's tolerance.

**The gate.** `test.ts` `#3360 field-message glyph on the first line` places the glyph and the caption's first line for a
one- and a two-line message. It runs the placement twice, from the Figma plan and from the def's own keys as code
reads them, through every corpus brand's emitted tokens. It also runs at caption.lg, by rebinding the def's keys, so
the branch where the line is the taller is exercised. The line is computed from the composite's font size × line
height, never read off the two new tokens. Mutations, each failing that assertion by name: main's def (glyphs straight
in the `start` row), 0.30px off; the inset dropped, 0.30px off; and the row centered, which is option B, 7.55px off on
two lines. `#3360 field-message caption holds still` checks the caption's top in every status.

**Trap for whoever re-verifies.** The gate models Figma's text node as setting its first line in the top line box of
its height, the same assumption #3153's option rows make. A built file was not measured. It is recorded in the def's
`notes.unverified`.
