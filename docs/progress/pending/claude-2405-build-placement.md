## (2026-10-09) — A rebuilt set lands under the page's section header, not beside it (#2405)

Owner report: after the sets on a component page were deleted and rebuilt, every rebuilt set landed far right of
the page's `_section-header` instance instead of under it, and had to be moved back by hand.

**The diagnosis.** `placeNewSet` (#1750) measured every top-level node on the page as content. On a page whose
only remaining node was the header, there was no COMPONENT_SET to top-align with, so the set took the header's
`y` and went `SET_GAP` right of it; its siblings then top-aligned with that first set, so the whole family
moved out beside the header. A first build never hit this because the header is placed after the run's builds
(#1750), so the header was never on the page when the first set was placed.

**The fix, in `write-components.ts` only.** `pageBoxes` marks the header (an INSTANCE or detached FRAME named
`_section-header`, any case: an instance of a variant carries its set's name). `placeNewSet` leaves the header
out of the content it measures, and when the header is all the page holds it places the set on the header's
left edge, 80px below the header's bottom: where `page-header.ts` puts a header relative to the content, read
in reverse. Siblings then follow the existing rule. An existing set is never passed to `placeNewSet`, so its
position is untouched, as before.

**A deliberate duplication.** The header's name and the 80px gap are restated in `write-components.ts` rather
than imported from `page-header.ts`: a value import would pull `page-header.ts` (and `file-taxonomy.ts`,
`file-components.ts`) into the executor's import walk, and every later edit to those would then need an
`EXECUTOR_REVISION` bump. `test-page-header.ts` 2c holds the two copies equal. The executor itself changed,
so `EXECUTOR_REVISION` goes 4 → 5: the in-place update's dry run will report members as needing a re-apply
once, with no field difference.

**Verified.** `test-write-components.ts` (f) and (g): a page holding only a header at 100,-300 (1000x220)
gets the rebuilt set at 100,0 and its sibling at 1040,0; a page with a header and a set the designer moved to
300,500 keeps it there and puts the new one at 1240,500. All literals. With main's `placeNewSet` restored,
(f) fails by name: "got 1260,-300", the live report's shape.

**Not covered.** The header is found by name. A designer who renames the header instance makes it ordinary
content again, and the old beside-it placement returns for that page. Matching by main component would need
an async read per top-level node; not done until a renamed header is seen. Live verification on a scratch
file is still owed before use on a client file.
