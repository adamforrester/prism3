## (2026-11-07) — Badge inline labels take the contained sizes (#3475 part 1, Q93 B)

The owner decided (Q93 B) that an inline Badge is a standalone status label like the others, only quieter, and not
text set in running copy. So its label now takes the contained label's rung at each size, at the regular weight:
`label.sm.default` (12px) at medium and `caption.md.default` (the corpus's 11px, 10px on the reference brand) at small,
replacing #3199's `body.md` / `body.sm` (16px / 14px). The dot cell follows the label's line box.

### What the change needed beyond the token swap

- **A caption line box.** No `type.caption.*.line-box` existed, only label and body. `tree.ts` now bakes the caption
  twin from the same loop as the label one (`lineBoxOf`), and `emit-figma-dims.ts` emits `type/caption/{rung}/line-box`
  beside the other two. Two added contract paths (`caption.md`, `caption.lg`), so CONTRACT 14.15.0.
- **`typeWeight.keys`.** Badge's `typeWeight` (#2983) repointed *every* `type.caption.*` ref to the bold caption, which
  would have turned the inline small label bold and rewritten `caption.md.line-box` to `caption.md.strong`. `keys`
  scopes it to `size.small.contained.type`; the schema checks each key is a bound `type.<group>.*` ref.

### Trap for whoever re-verifies

- **Small is taller than medium inline.** Caption's cozy leading makes `caption.md`'s line 15px against `label.sm`'s
  14px (both 14px on the reference brand). The contained sizes hide this behind padding; the inline ones show it. It is
  a consequence of the type ramp, not of this change, and is flagged to the owner in the PR.
- The `test.ts` arm "badge inline and contained share a text size at each size" compares each brand's emitted
  composite font size and line height through the projected plan's text style, not the def's keys, so it fails by size
  and brand if either style is rebound.

The description, docs and usage prose that described the inline label as matching the surrounding copy is rewritten
as a draft flagged for owner sign-off in the PR.
