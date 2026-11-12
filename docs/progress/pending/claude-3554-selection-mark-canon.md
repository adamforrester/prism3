## (2026-11-11) — The selection-mark canon names its scope, its exception and the weight rule's members (#3554 Q-CC12 A, Q-CC13 A, Q-CC14 A)

Owner decisions Q-CC12 A (the canon half), Q-CC13 A and Q-CC14 A, all in `prism3-build-component` §5.

- **Q-CC13 A.** "A selection mark binds `indicator.*`" did not say whether a switch's on thumb or a radio's dot
  counts. The sentence now covers a mark on the page; a mark on a fill takes the fill's side: the on thumb binds
  `interactive.<c>.on-fill` and the radio's dot is fill-colored (`interactive.<c>.fill.selected`), which is what
  `switch-control.ts` and `radio-control.ts` already bind. The indicator roles' generated `when_to_use`
  (`ai-metadata.ts`) said "a switch's thumb" too, so it now says the off thumb and adds the on-fill line; that moves
  every brand's `.ai.json`, hence the change note.
- **Q-CC12 A.** Pagination.Item's underline joins the list (its rebind is its own PR), and Link's current-page bar,
  which PageNav.Item inherits, is recorded as the named exception on `icon.link.*`: link roles have no indicator
  twin, and the edge setting does not reach them.
- **Q-CC14 A.** The bold-weight exception names Pagination.Item's current page (Q381) beside Tab and the segment,
  and records PageNav.Item as constant weight by Q8 A, because its current page is a Link.
