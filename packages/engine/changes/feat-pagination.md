---
engine: minor
---
Pagination and Pagination.Item (#2665, owner decision on the proposal: every call A). Pagination moves between the pages
of a long list or set of results: 12 members, `type` [numbered, compact, simple] × `style` [border, underline] × `size`
[medium, small, large], the style on numbered only. numbered
is a nested IconButton.Neutral (ghost, square, a left chevron), a native `items` slot of seven Pagination.Item instances
showing page 5 of 10 (1 … 4 [5] 6 … 10, at least one item), and a second IconButton.Neutral with a right chevron, 4px
apart (`space.050`). compact puts "Page 5 of 10" (`type.label.*.default`, `color.text.primary`) between the two buttons.
simple is two nested Button.Neutral, text, "Previous" with a leading left chevron and "Next" with a trailing right
chevron, at opposite ends of a row built at 428px. Pagination.Item (`_pagination-item`, a building block) is 27 members:
`type` [page, ellipsis] × `selection` [unselected, selected] × `style` [border, underline] × `size` [medium, small,
large] × state [rest, hover, pressed, focus-visible], the current page at rest and focus-visible only in each style, the
ellipsis at rest only, and the style on the current page only. A cell on `size.*.height`, at least as wide as it is
tall, `radius.md`; a page reads `color.interactive.neutral.text.*` with the neutral overlay wash at hover and pressed;
the current page (owner decision Q381) has no fill: a `border-width.hairline` border, or a `border-width.thick` bar
under its number, in `color.border.tertiary` (the lightest neutral border role at 3:1 against the page in every
brand and mode), its number `color.interactive.neutral.text.rest` in `type.label.*.emphasis`, its width held by a bold
reserve. The ellipsis "…" is its own text part (`mark`) with its own TEXT property ("ellipsis", prop `mark`) in
`color.text.secondary`: one property cannot show "1" on a page and "…" on the ellipsis, since a set-level TEXT property
holds one default every member displays. Sizes lead with medium in both, Figma's first member being the code default.
A new `type` value set and a new `style` value set. Engine: `figmaProperties.excludeCoordinates` may name the state axis, so a set can drop a state from some
members only; the validator, the projector, the member count and the lint walkers read the state as one more dimension
of the grid. No executor code moves: the once-per-run override guard inside a native slot this def needs landed with
#2660. No new tokens; CONTRACT is unchanged.
