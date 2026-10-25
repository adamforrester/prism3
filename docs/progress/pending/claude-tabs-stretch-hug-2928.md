## (2026-10-25) — No fill under a hug: Tab.Item's bar and Tabs' baseline pinned across the foot, CodeInput's rows unstretched, `lint-fill-under-hug` (#2928)

**Engine {{ENGINE_VERSION}}.** Owner go on #2928, the shape Q537 found in Pagination (#2796): the host does not let a
frame hug a child that fills it, and writing the stretch turns the frame's width fixed at what it measures then.

### What changed
- **Tab.Item**: `indicator` is a foot pin (`PartDef.foot`, #2872's Link bar), not a stretched box. The container takes
  a bottom inset of `indicator-height`, so the label row keeps its height and place. Out of the flow and constrained
  `STRETCH`, the bar follows the tab when an instance's label is longer than the build's.
- **Tabs**: `baseline` is a foot pin, the container's bottom inset is `baseline-height`. A fourth tab added to the
  slot now has a baseline under it; before, the list froze at the three default tabs.
- **CodeInput**: found by the new gate, not by the issue. `label` was the column's first child and was stretched, so
  the field froze at the label's built 320 and six cells (328 at medium, 448 at xlarge) ran past it. Label and
  message no longer stretch; the field hugs the widest of the three. Held for the owner as a Q-block on #2928: they
  keep their 320 instead of spanning the cells.
- **Gate** `lint-fill-under-hug.ts`: every projected member's plan, two arms (stretch across a hugging column, grow
  along a hugging row), floors on every subject. Mutations: the stretch put back on Tab.Item's indicator fails
  `stretch-under-hugging-column: tab-item: container > indicator`; Segment's track set to hug fails
  `grow-under-hugging-row: segmented-control-segment: container > indicator`.
- **Shim**: a horizontal `STRETCH` constraint on an absolute frame is recorded and read back in `width`, as `MAX`
  already was (#2266). `test:roundtrip` builds the three sets with `fillFreezesHug` on and measures after the content
  grows: on main's defs Tab.Item reads "the tab is 58 wide around a 196 label row".

### Not done here
- The height twins: Accordion's indicators and PasswordField's toggle stretch across a row that hugs its height.
  Whether the host freezes a height the same way is unmeasured; filed as #3014, not gated.
- The issue's live-file check (read `counterAxisSizingMode` after a build on a real file) is still the owner's: the
  fix holds either way, since no stretch under a hug is left to freeze.
