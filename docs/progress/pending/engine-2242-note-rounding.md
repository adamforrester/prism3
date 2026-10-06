## (2026-10-07) — Engine: the decisions-log notes print no long decimals (#2242)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor`, change note `engine-2242-note-rounding.md`). CONTRACT
unchanged. Built on #2240, whose untinted branch of the shadow note this also covers; opened after #2240 merged.

### What changed

The notes are shipped prose: every brand's tokens carry them as `$extensions.prism3.decisions`, and the reports
print them. They interpolated input numbers raw, so an input carrying full converter precision (a pin from a hex, a
color picked in the studio) printed as `tinted to hue 89.87556274151122`.

- **The shadow note's tint hue prints in whole degrees,** matching how the studio shows hue (the issue's fix).
- **Every other number the notes print** is compacted to the precision the corpus already used: hue and lightness
  to 2 places, chroma to 4, with no trailing zeros. That covers the primary's hue and chroma, a brand color's and a
  status color's hue, a pinned gray's lightness, an out-of-gamut anchor's OKLCH, and the shadow's softness and
  amount. Two module-level helpers (`n2`, `n4`) do the formatting, so a new note has one obvious way to print a number.

**Committed artifacts move only on the shadow line**, and only where a tint hue wasn't whole: prism3 266.75 → 267
and wendys 249.14 → 249, in their tokens and in the reports that print the notes. No other corpus note
changed, because none carried more precision than these helpers keep. Hence `minor`.

### Test and mutations

`test.ts` builds three brands whose every note-interpolated field carries seven decimal places, between them
reaching each numeric note:
- **A:** Follow primary, plus a long brand color and long status hues.
- **B:** a pin from a hex through the real converter, plus an out-of-gamut primary, which fires the gamut note.
- **C:** a long red primary, reused for danger.

Two assertions:
- **No note prints a number with more than 4 decimal places.** It scans every note of every case, not just the lines
  this fix touched, so a note added later with a raw number fails here.
- **The shadow note's hue is whole.** The expected value is rounded from the *input's* hue, never read back from
  the note.

Both failed by name on the unfixed code (12 offending notes). Each mutation ran from a `wip:` commit, asserted it
applied, and was restored with `git checkout --`:

| Arm | Failures | ✗ line |
|---|---|---|
| (h) the shadow hue back to raw | 2 | `#2242 the shadow note prints the tint hue in whole degrees (expected "tinted to hue 262 at", rounded from the input's 262.1234567; got "… tinted to hue 262.1234567 at 0.15 …")` and the scan (2 offending) |
| (i) the primary's hue back to raw, a note the shadow fix never touched | 1 | `#2242 no decisions-log note prints a number with more than 4 decimal places (3 offending: … "primary: the brand color is pinned at step 500 (hue 262.1234567) …")` |
