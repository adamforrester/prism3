---
engine: minor
---
Pagination and Pagination.Item (#2665, owner decision on the proposal: every call A). Pagination moves between the pages
of a long list or set of results: 9 members, `type` [numbered, compact, simple] × `size` [medium, small, large]. numbered
is a nested IconButton.Neutral (ghost, square, a left chevron), a native `items` slot of seven Pagination.Item instances
showing page 5 of 10 (1 … 4 [5] 6 … 10, at least one item), and a second IconButton.Neutral with a right chevron, 4px
apart (`space.050`). compact puts "Page 5 of 10" (`type.label.*.default`, `color.text.primary`) between the two buttons.
simple is two nested Button.Neutral, text, "Previous" with a leading left chevron and "Next" with a trailing right
chevron, at opposite ends of a row built at 428px. Pagination.Item (`_pagination-item`, a building block) is 21 members:
`type` [page, ellipsis] × `selection` [unselected, selected] × `size` [medium, small, large] × state [rest, hover,
pressed, focus-visible], the current page at rest and focus-visible only and the ellipsis at rest only. A cell on
`size.*.height`, at least as wide as it is tall, `radius.md`; a page reads `color.interactive.neutral.text.*` with the
neutral overlay wash at hover and pressed; the current page fills `color.interactive.primary.fill.selected` under
`color.interactive.primary.on-fill` in `type.label.*.emphasis`, its width held by a bold reserve; the ellipsis is
`color.text.secondary`. Sizes lead with medium in both, Figma's first member being the code default. Two new `type`
value sets. Engine: `figmaProperties.excludeCoordinates` may name the state axis, so a set can drop a state from some
members only; the validator, the projector, the member count and the lint walkers read the state as one more dimension
of the grid. The plugin's slot pass writes a nested instance's overrides once per run (it visited slot items twice, so
an override inside a slot was applied and reported twice); EXECUTOR_REVISION 28. No new tokens; CONTRACT is unchanged.
