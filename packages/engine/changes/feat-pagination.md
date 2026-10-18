---
engine: minor
---
Pagination and Pagination.Item (#2665, owner decision on the proposal: every call A). Pagination moves between the pages
of a long list or set of results: 12 members, `type` [numbered, compact, simple] × `style` [border, underline] × `size`
[medium, small, large], the style on numbered only. Pagination
draws its own previous and next (owner decision Q414 A), so it requires no Neutral button family (Q386): numbered is a
previous cell (a Pagination.Item, a left chevron), a native `items` slot of seven Pagination.Item instances showing page
5 of 10 (1 … 4 [5] 6 … 10, at least one item), and a next cell with a right chevron, 4px apart (`space.050`). compact
puts "Page 5 of 10" (`type.label.*.default`, `color.text.primary`) between the two cells. simple is the two cells
labeled, "Previous" after its chevron and "Next" before its own, at opposite ends of a row built at 428px. Previous and
next are `nest-exposed` on `state`, so a designer sets them to disabled at an end. Pagination.Item (`pagination-item`,
the `items` slot's preferred item, preferred-only, owner decision Q394 A) is 87 members: `type` [page, ellipsis,
previous, next] × `selection` [unselected, selected] × `style` [border, underline] × `labeled` [false, true] × `size`
[medium, small, large] × state [rest, hover, pressed, focus-visible, disabled], the current page at rest and
focus-visible only in each style, the ellipsis at rest only, the style on the current page only, and `labeled` and
disabled on previous and next only. Previous and next are the page cell with `chevron-left` or `chevron-right` at
`icon.size.*` in `color.interactive.neutral.icon.*`, a labeled one's word in `type.label.*.default` and
`color.interactive.neutral.text.*` on its own TEXT property ("previous label", "next label"), the neutral wash at hover
and pressed, and `color.disabled.icon` / `color.disabled.text` at disabled. A new variant axis name, `labeled`. A cell on `size.*.height`, at least as wide as it is
tall, `radius.md`; a page reads `color.interactive.neutral.text.*` with the neutral overlay wash at hover and pressed;
the current page (owner decision Q381) has no fill: a `border-width.hairline` border, or a `border-width.thick` bar
under its number, in `color.border.tertiary` (the lightest neutral border role at 3:1 against the page in every
brand and mode), its number `color.interactive.neutral.text.rest` in `type.label.*.emphasis`, its width held by a bold
reserve. The ellipsis is the decorative `more-horizontal-filled` icon (owner decision Q404 A), `aria-hidden` and not
interactive, at `icon.size.*` in `color.icon.secondary`: it has no text and no TEXT property, so each of the item's
TEXT properties holds one caption. Sizes lead with medium in both, Figma's first member being the code default.
A new `type` value set and a new `style` value set. Engine: `figmaProperties.excludeCoordinates` may name the state axis, so a set can drop a state from some
members only; the validator, the projector, the member count and the lint walkers read the state as one more dimension
of the grid. No executor code moves: the once-per-run override guard inside a native slot this def needs landed with
#2660. No new tokens; CONTRACT is unchanged.
