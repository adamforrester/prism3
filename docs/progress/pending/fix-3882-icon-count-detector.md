## (2026-11-18) — lint-icon-count reads a count with words between the number and its noun (#3882)

Found in quality scan #3868. `lint-icon-count.ts` keeps the icon def's shipped prose from stating a glyph count that
disagrees with `ICON_NAMES.length`, and the provider-logo def's prose from stating any count of marks. Its detector
read a number only when its noun sat directly beside it (`99 glyphs`, `99-glyph`) or after `set of`. Any word in
between broke the match, and so did a spelled-out number. With the icon summary changed to "One of 99 named glyphs
from the icon set" and `regen.ts` run, the gate exited 0 and reported 0 claims.

The icon and mark detectors now share one builder, `countRes`:
- up to two words between the number and the noun, each letters only and after a separator, so "16px glyph" (px
  glued to the number) is still not a claim;
- a number, then up to two words, then `set|vocabulary|library of` and the noun ("a 99-strong set of glyphs");
- `set|vocabulary|library of N`, as before;
- a number is digits or a spelled-out English number from two to ninety-nine. `one` is left out: "one glyph"
  describes a single glyph, never the set.

The widening found one false positive in the real provider-logo prose, "a payment tile stays 8 by 5 and a logo keeps
its width", where "and a" bridged a size to the noun. A joining word (`JOINERS`: and, or, by, per, to and similar)
now ends the phrase, and that sentence is a planted clean case beside the other real prose. Each form the issue
listed is planted in the self-check, and three in the mark check.

Mutations:
- the scan's (icon summary "One of 99 named glyphs …", then `regen.ts`): main exit 0 with 0 claims; the fix exits 1 on
  `icon.summary: "99 named glyphs" — the set has 46 glyphs`;
- the fix's gap narrowed back to zero words: the self-check fails on five named `#3882:` lines.
