## (2026-10-03) — Type: emptying italics, or returning links to the default, removes the key (#2006)

**STATUS: branch `ui/2006-empty-italics-links`.** UI write change; the emission does not move. No ENGINE bump,
`CONTRACT_VERSION` unchanged, `regen` moves no committed artifact. The engine gains one `export` keyword
(`TYPE_LINK_DEFAULT` in `theme.ts`, so the Studio reads the default rather than restating it). **Fixes #2006.**

### What changed

`setItalic` (and the italic chips, which compose it) now UNSETS `typography.italics` when the list empties, the
way `italicDefault`, a category's `weights` and a zero nudge already did. `setLink` UNSETS `typography.links`
when the list equals the engine's default (body and caption, compared as a set), and still writes `[]` when it
empties. Ticking a type then unticking it now leaves the brand byte-identical to the one loaded, for both keys.

### The diagnosis that changed the fix

The issue read the two lists as the same shape. They are not. The engine reads an absent `italics` as `[]`
(`t.italics ?? []`), but an absent `links` as its default (`t.links ?? TYPE_LINK_DEFAULT`, body and caption).
So `[]` is the only way to say "no underlined links". Deleting it on empty would have brought 10 to 16 link
composites back on every example brand. Measured with `brandTheme` + `buildTree` on prism3, aurora and harbor:

| brand | `italics: []` vs absent | `links: []` vs absent | `links` = default vs absent |
|---|---|---|---|
| prism3 | identical | DIFFERENT (0 vs 16 link composites) | identical |
| aurora | identical | DIFFERENT (0 vs 10) | identical |
| harbor | identical | DIFFERENT (0 vs 10) | identical |

The owner's coordinator decided the rule (2026-10-03): keep `[]` for none, unset at the default. Both rules
are emission-identical by measurement. Also, a brand that never set `links` is drawn with {body, caption}, so
"tick then untick" there writes the default list, not `[]`. Unsetting only on empty would not have fixed it.

### Equivalence against `origin/main`

A throwaway driver (not committed) ran every `setItalic`, `setLink` and `setItalicStyle` call, over every
category, every caller set (all 128 subsets) and both directions, on all three example brands, through the
`origin/main` module and the new one. 40,476 writes were byte-identical. 228 differed, all of them an emptied
`italics` or a `links` list equal to the default, which is exactly the change. None differed anywhere else.

### Tests

`test-type-input.ts`. Three existing arms changed because the bytes did: setItalic(body, off) on the last
italic category (`italics` now unset, not `[]`), the matching setItalicStyle(body, only) arm, and the section
title. The `links: []` arm keeps its bytes, and its label now says "none". New, on aurora (which sets neither key): italics tick
then untick, the Upright + italic then Upright chips, links tick a third category then untick, each against a
deep clone of the brand as loaded; and unticking every link writes `[]` with zero link composites. The default
is typed in the test as a literal (body, caption), not imported (docs/34).

### Trap for whoever re-verifies

`setPath(…, undefined)` leaves an own `undefined` property, which `JSON.stringify` drops. Byte identity here
is on the serialized brand, which is what persists, so `'italics' in brandState.typography` can still be true.
This is how the existing `italicDefault` and `weights` unsets work too.
