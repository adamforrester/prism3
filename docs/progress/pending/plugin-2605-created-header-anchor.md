## (2026-10-14) — File setup: a created section header lands at the end of the previous section's span, never inside Sandbox (#2605)

**What was wrong.** When file setup or a build *creates* a missing section header, `file-setup.ts` anchored it after
`lastExistingPageOfSection` of the previous section: the furthest of that section's pages in document order, wherever
it sat. On the #2597 file, `↳ Grids & layouts` (a Foundations leaf) lives under Sandbox, so with the `Components`
header deleted, a created `Components` went after it, inside Sandbox. #2600 (Q290: file setup never moves existing
pages) left this path alone, since it concerns where a *created* page goes.

**The fix.** `sectionEndAnchor` reads the previous section's **span**, the pages from its header to the next divider,
the same span `reorderPages` reads. When a divider closes the span and the page after it is one of the created
section's own leaves, the anchor is that divider: the header reuses it and lands where a deleted one stood, ahead of
its own pages. Otherwise the anchor is the span's last page, so the header gets a new divider and the old one stays
with whatever follows it. A section with no header has no span and keeps the old anchor, its furthest page; that is
the issue's scope and nothing better is known for that case. Both callers use it: `scaffoldSkeleton`'s walk (passing
the next section) and the build's `ensureSectionHeader` (passing the section it creates).

**Why the divider is conditional (found in review).** The first cut always anchored on the closing divider. That is
right when the created section's own pages follow it, and wrong when a designer's page or section does: with
`Components` gone and `--- | Notes | --- | Subcomponents` after Foundations, the created header landed on the divider
and took `Notes` into its span with no divider between. No page moved, so Q290 held, but the span `reorderPages` and
the alphabetical anchor read was wrong for those pages. The issue's literal wording (the span's last page) and the
first cut are each right in one case; the check on the page after the divider picks between them. The same shape
with the Foundations header gone too still puts a created `Foundations` straight after Cover, ahead of its own leaves'
divider: that is the walk's first-section path, older than #2605, not changed here and filed as
#2634.

**A block dropped.** The first cut also had the build path create a divider between a created header and the next
section's header, because reusing the closing divider could leave the two adjacent. With the divider reused only when
an own page follows it, that case no longer arises: a mutation removing the block fails nothing, and the only way to
reach it is a file where a section header already sits with no divider before it. It is removed rather than kept
untested.

**Tests.** `test-file-setup.ts` `created header/…`, on the #2597 fixture under both host readings, via the build and
file setup: (1) the header deleted, its divider and pages kept; (2) the whole section gone; (3) a designer's page
(`Notes`) and (4) a designer's section (`Archive | ↳ old stuff`) after the divider that closed Foundations. Every
expected list is a literal.
