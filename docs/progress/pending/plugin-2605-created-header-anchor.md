## (2026-10-14) — File setup: a created section header lands at the end of the previous section's span, never inside Sandbox (#2605)

**What was wrong.** When file setup or a build *creates* a missing section header, `file-setup.ts` anchored it after
`lastExistingPageOfSection` of the previous section: the furthest of that section's pages in document order, wherever
it sat. On the #2597 file, `↳ Grids & layouts` (a Foundations leaf) lives under Sandbox, so with the `Components`
header deleted, a created `Components` went after it, inside Sandbox. #2600 (Q290: file setup never moves existing
pages) left this path alone, since it concerns where a *created* page goes.

**The fix.** `sectionEndAnchor` reads the previous section's **span**, the pages from its header to the next divider,
the same span `reorderPages` reads. The anchor is the divider that closes the span, so a created header reuses it and
lands where a deleted one stood, ahead of any of its own pages still there. When the span runs to the end of the file,
the anchor is its last page. A section with no header has no span and keeps the old anchor, its furthest page; that is
the issue's scope and nothing better is known for that case. Both callers use it: `scaffoldSkeleton`'s walk and the
build's `ensureSectionHeader`.

**The second half, found while writing the arm.** Reusing the closing divider leaves the created header straight above
the next section's header when the whole section was gone (divider and pages too). File setup's walk already puts a
divider before every header it reaches; the build path didn't, so `ensureSectionHeader` now creates one between them.
It's a created divider, never a moved page, so Q290 holds.

**Tradeoff considered and discarded.** Anchoring at the span's last page instead of its closing divider, the issue's
literal wording, puts a new divider before the header and leaves the old one after it. With the section's pages still
in the file, that orphans them behind a second divider, out of the header's span, where `reorderPages` and the
alphabetical anchor for new pages can't see them. The mutation table in the PR covers that variant by name.

**Tests.** `test-file-setup.ts` `created header/…`, on the #2597 fixture under both host readings, via the build and
file setup: (1) the header deleted, its divider and pages kept; (2) the whole section gone. Every expected list is a
literal.
