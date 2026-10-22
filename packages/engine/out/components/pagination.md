# Pagination

> Moves between pages of a long list or set of results, and shows which page is open.

- **ID:** `pagination`
- **Category:** navigation
- **Status:** draft
- **Also known as:** pager, pagination-nav, page-controls

## Overview

Moves between the pages of a long, ordered list or set of results, and shows which page is open. numbered shows the first and last page, the current page and one page on each side of it, with an ellipsis for each gap, between a previous and a next cell; the row always holds seven slots, so it keeps its width as the user pages. compact replaces the numbers with "Page 5 of 10", for a narrow container. simple is a Previous and a Next cell at opposite ends, for an article or a short sequence where the count adds nothing. At the first and last page, the previous or next cell stays in place and does nothing. Not tabs (a few fixed views), not a carousel indicator, and not a load more button.

- **Purpose:** Move between the pages of a long, ordered set of results and show which page is open.
- **Use when:** Search results, a catalog or a table split into pages, where the user benefits from the count and from jumping to a page; or previous and next through an article.
- **Avoid when:** A feed with no useful end (a load more Button), a few fixed views (tabs or a segmented control), the slides of a carousel, or rows per page and a "Go to page" field (the table pager, not yet built).

## Anatomy

Shown on the default member: type `numbered`, style `border`, size `medium`.

1. **Container** — The navigation landmark: one row of controls. It hugs its row; a simple pagination is built wider so its two cells sit at opposite ends.
2. **Row** — The previous cell, the pages or the "Page 5 of 10" text, and the next cell, 4px apart.
3. **Previous** — The previous cell: a Pagination.Item with a left chevron, the same square as the page cells (Q414 A). On the first page it stays in place and does nothing.
4. **Items** — The pages: a slot of page cells, 4px apart, showing page 5 of 10 by default: 1, an ellipsis, 4, 5 (current), 6, an ellipsis, 10.
5. **Item1** — The first page, 1.
6. **Item2** — An ellipsis for pages 2 and 3.
7. **Item3** — Page 4, before the current page.
8. **Item4** — Page 5, the current page.
9. **Item5** — Page 6, after the current page.
10. **Item6** — An ellipsis for pages 7 to 9.
11. **Item7** — The last page, 10.
12. **Status** — The position, "Page 5 of 10", between the previous and next buttons.
13. **Next** — The next cell: a Pagination.Item with a right chevron (Q414 A). On the last page it stays in place and does nothing.
14. **Simple row** — The simple row: Previous at the start and Next at the end.
15. **Previous button** — Previous: a Pagination.Item, a left chevron and the word "Previous" (Q414 A).
16. **Next button** — Next: a Pagination.Item, the word "Next" and a right chevron (Q414 A).

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `numbered`, `compact`, `simple` | once, when authored | numbered: page numbers between previous and next. compact: "Page 5 of 10" between previous and next. simple: Previous and Next only. A numbered row switches to compact when its container is narrower than the row. |
| `style` | `border`, `underline` | once, when authored | How the current page is marked in a numbered row: a border around it, or a 2px line under its number. |
| `size` | `medium`, `small`, `large` | once, when authored | The size of every cell and button, matching the icon button sizes. Medium is 44px on comfortable and spacious density. |

## Usage guidelines

Use Pagination below a long list, a grid of results or a table, to move between pages and show which one is open. numbered when the user benefits from seeing the count and jumping to a page; compact in a narrow container, and numbered switches to it there on its own; simple for previous and next through an article or a short sequence. Center it under a list or a grid; end-align it under a table. Give every page an address whenever the page has one.

### Do

- Place it below the content it pages
- Give pages an address, so they can be bookmarked and shared
- Leave previous and next in place at an end
- Move focus to the top of the results after an in-place change
- Leave it out when there is only one page

### Don't

- Use it for a feed with no useful end. Use a load more Button.
- Use it to switch between a few views. Use tabs or a segmented control.
- Use it for the slides of a carousel
- Hide previous or next at an end; the row would change width
- Make an ellipsis a control

## Accessibility

- **Keyboard:** Tab moves through previous, each page and next; every control is its own Tab stop. Enter opens a page, and Space also does when it is a button. Arrow keys do not move between pages.
- **Focus:** Stays in the normal Tab order. After a page changes in place, focus moves to the top of the results. At an end, the inactive previous or next cell keeps focus.
- **Screen readers:** navigation: a \<nav> landmark named "Pagination", holding a list of links or buttons

  aria-label="Pagination" on the \<nav>; give two on one page the same name or a name each. aria-current="page" on the current page. aria-hidden="true" on each ellipsis. aria-disabled="true" on previous at the first page and next at the last. Accessible names "Previous page", "Next page" and "Page 4". A polite live region says "Page 5 of 10" after an in-place change. Names are translated.

### WCAG

- 1.3.1 Info and Relationships (a labeled navigation landmark around a list; the current page carries aria-current="page")
- 1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)
- 1.4.3 Contrast (Minimum) (every number and the compact text at 4.5:1)
- 1.4.10 Reflow (a numbered row switches to compact in a narrow container)
- 1.4.11 Non-text Contrast (the current page's underline at 3:1 against the page; its border, in the border style, is a second cue beside the emphasis weight, so it may be lighter)
- 2.1.1 Keyboard (every control is reachable with Tab)
- 2.4.3 Focus Order (after an in-place page change focus moves to the results, and inactive controls at an end keep focus in place)
- 2.4.4 Link Purpose (In Context) (previous, next and every page have a full name)
- 2.4.7 Focus Visible (the shared focus ring on every control)
- 2.5.3 Label in Name (the visible "Previous" and "Next" start each accessible name)
- 2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)
- 4.1.2 Name, Role, Value (the landmark, the list and aria-current)
- 4.1.3 Status Messages (a polite "Page 5 of 10" after an in-place change)

### Motion

- **Enter:** None. The page changes at once.
- **Exit:** None.
- **Reduced motion:** Nothing moves.

## Content guidelines

"Previous" and "Next", sentence case. "Page 5 of 10" for the compact text and the announcement. Numbers in the locale's numerals.

- **Labels:** Previous and next are named "Previous page" and "Next page"; simple shows "Previous" and "Next", never "Prev", "Back" or "Forward". The compact text is "Page 5 of 10". Pages are numbers only.

## Related components

- **Built from:** `pagination-item`
- **Instead, consider:** `tabs`
- **Often used with:** `list`
- **Replaces:**
  - page links built from \<a href="#"> and click handlers
  - a disabled next button that drops focus at the last page
  - infinite scroll on a page with a footer

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `count` | number | — | yes | The total number of pages. Pagination is not shown when it is 1. |
| `page` | number | — | no | The current page, counted from 1. Controlled; pair it with onPageChange. |
| `defaultPage` | number | `1` | no | The page shown first, when Pagination manages its own state. |
| `onPageChange` | function | — | no | Called with the new page number when the user opens a page. |
| `getHref` | function | — | no | Returns the address of a page. Present, every page is a link the user can bookmark, share or open in a new tab; absent, every page is a button that changes the content in place. Pass it whenever the page has an address. |
| `renderItem` | slot | — | no | Renders a page as your router's link, keeping its address and aria-current. |
| `type` | enum: 'numbered' \| 'compact' \| 'simple' | `numbered` | no | numbered: page numbers between previous and next. compact: "Page 5 of 10" between previous and next. simple: Previous and Next only. A numbered row switches to compact when its container is narrower than the row. |
| `style` | enum: 'border' \| 'underline' | `border` | no | How the current page is marked in a numbered row: a border around it, or a 2px line under its number. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The size of every cell and button, matching the icon button sizes. Medium is 44px on comfortable and spacious density. |
| `siblingCount` | number | `1` | no | How many pages show on each side of the current page. |
| `boundaryCount` | number | `1` | no | How many pages show at each end. |
| `label` | string | `Pagination` | no | The accessible name of the navigation landmark. Give two pagination rows on one page the same name, or a name each ("Pagination, top"). |
| `getStatusText` | function | — | no | Returns the compact text and the page-change announcement, "Page 5 of 10" by default. Pass a translated string with the page and the count in the order the language needs. |

## Specs

Generated from the plan that builds the design-file component: 12 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/row` | frame | type=numbered or compact |
| `container/row/previous` | instance | type=numbered or compact |
| `container/row/items` | slot | type=numbered |
| `container/row/items/item1` | instance | type=numbered |
| `container/row/items/item2` | instance | type=numbered |
| `container/row/items/item3` | instance | type=numbered |
| `container/row/items/item4` | instance | type=numbered |
| `container/row/items/item5` | instance | type=numbered |
| `container/row/items/item6` | instance | type=numbered |
| `container/row/items/item7` | instance | type=numbered |
| `container/row/next` | instance | type=numbered or compact |
| `container/row/status` | text | type=compact |
| `container/simpleRow` | frame | type=simple |
| `container/simpleRow/previousButton` | instance | type=simple |
| `container/simpleRow/nextButton` | instance | type=simple |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `type`.

**size=medium, type=numbered**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/row` | — | `space.050` | — | — | — | — |
| `container/row/items` | — | `space.050` | — | — | — | — |

**size=small, type=numbered**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/row` | — | `space.050` | — | — | — | — |
| `container/row/items` | — | `space.050` | — | — | — | — |

**size=large, type=numbered**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/row` | — | `space.050` | — | — | — | — |
| `container/row/items` | — | `space.050` | — | — | — | — |

**size=medium, type=compact**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/row` | — | `space.050` | — | — | — | — |

**size=small, type=compact**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/row` | — | `space.050` | — | — | — | — |

**size=large, type=compact**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/row` | — | `space.050` | — | — | — | — |

**size=medium, type=simple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 428px (literal) |
| `container/simpleRow` | — | `space.050` | — | — | — | — |

**size=small, type=simple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 428px (literal) |
| `container/simpleRow` | — | `space.050` | — | — | — | — |

**size=large, type=simple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 428px (literal) |
| `container/simpleRow` | — | `space.050` | — | — | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/row/status` | `type.label.md.default` |
| size=small | `container/row/status` | `type.label.sm.default` |
| size=large | `container/row/status` | `type.label.lg.default` |

### Color

Keyed by `type`, `style`.

**type=compact, style=border**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/row/status` | — | — | `color.text.primary` | — |

### Nesting and properties

- `container/row/previous` nests `pagination-item` at `type=previous, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`; exposes `state`
- `container/row/items` is a slot, preferring `pagination-item`
- `container/row/items/item1` nests `pagination-item` at `type=page, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`
- `container/row/items/item2` nests `pagination-item` at `type=ellipsis, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`
- `container/row/items/item3` nests `pagination-item` at `type=page, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`
- `container/row/items/item4` nests `pagination-item` at `type=page, selection=selected, style=border, labeled=false, size=medium, state=rest`; follows `style`, `size`
- `container/row/items/item5` nests `pagination-item` at `type=page, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`
- `container/row/items/item6` nests `pagination-item` at `type=ellipsis, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`
- `container/row/items/item7` nests `pagination-item` at `type=page, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`
- `container/row/next` nests `pagination-item` at `type=next, selection=unselected, style=border, labeled=false, size=medium, state=rest`; follows `size`; exposes `state`
- `container/simpleRow/previousButton` nests `pagination-item` at `type=previous, selection=unselected, style=border, labeled=true, size=medium, state=rest`; follows `size`; exposes `state`
- `container/simpleRow/nextButton` nests `pagination-item` at `type=next, selection=unselected, style=border, labeled=true, size=medium, state=rest`; follows `size`; exposes `state`

| Property | Type | Default |
| --- | --- | --- |
| `status text` | text | `Page 5 of 10` |
| `items` | slot | — |

---

Generated from the `pagination` component definition.
