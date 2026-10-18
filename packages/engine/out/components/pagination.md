# Pagination

> Moves between pages of a long list or set of results, and shows which page is open.

Moves between the pages of a long, ordered list or set of results, and shows which page is open. numbered shows the first and last page, the current page and one page on each side of it, with an ellipsis for each gap, between a previous and a next cell; the row always holds seven slots, so it keeps its width as the user pages. compact replaces the numbers with "Page 5 of 10", for a narrow container. simple is a Previous and a Next cell at opposite ends, for an article or a short sequence where the count adds nothing. At the first and last page, the previous or next cell stays in place and does nothing. Not tabs (a few fixed views), not a carousel indicator, and not a load more button.

- **ID:** `pagination`
- **Category:** navigation
- **Status:** draft
- **Also known as:** pager, pagination-nav, page-controls

## Usage

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

### Content guidelines

"Previous" and "Next", sentence case. "Page 5 of 10" for the compact text and the announcement. Numbers in the locale's numerals.

### Copy patterns

- **Labels:** Previous and next are named "Previous page" and "Next page"; simple shows "Previous" and "Next", never "Prev", "Back" or "Forward". The compact text is "Page 5 of 10". Pages are numbers only.

## Choosing it

- **Purpose:** Move between the pages of a long, ordered set of results and show which page is open.
- **Use when:** Search results, a catalog or a table split into pages, where the user benefits from the count and from jumping to a page; or previous and next through an article.
- **Avoid when:** A feed with no useful end (a load more Button), a few fixed views (tabs or a segmented control), the slides of a carousel, or rows per page and a "Go to page" field (the table pager, not yet built).
- **Often used with:** `pagination-item`, `list`

## Props

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

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `numbered`, `compact`, `simple` | once, when authored |
| `style` | `border`, `underline` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** navigation: a \<nav> landmark named "Pagination", holding a list of links or buttons
- **WCAG:**
  - 1.3.1 Info and Relationships (a labeled navigation landmark around a list; the current page carries aria-current="page")
  - 1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)
  - 1.4.3 Contrast (Minimum) (every number and the compact text at 4.5:1)
  - 1.4.10 Reflow (a numbered row switches to compact in a narrow container)
  - 1.4.11 Non-text Contrast (the current page's border or underline at 3:1 against the page)
  - 2.1.1 Keyboard (every control is reachable with Tab)
  - 2.4.3 Focus Order (after an in-place page change focus moves to the results, and inactive controls at an end keep focus in place)
  - 2.4.4 Link Purpose (In Context) (previous, next and every page have a full name)
  - 2.4.7 Focus Visible (the shared focus ring on every control)
  - 2.5.3 Label in Name (the visible "Previous" and "Next" start each accessible name)
  - 2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)
  - 4.1.2 Name, Role, Value (the landmark, the list and aria-current)
  - 4.1.3 Status Messages (a polite "Page 5 of 10" after an in-place change)
- **Keyboard:** Tab moves through previous, each page and next; every control is its own Tab stop. Enter opens a page, and Space also does when it is a button. Arrow keys do not move between pages.
- **Focus:** Stays in the normal Tab order. After a page changes in place, focus moves to the top of the results. At an end, the inactive previous or next cell keeps focus.
- **ARIA:** aria-label="Pagination" on the \<nav>; give two on one page the same name or a name each. aria-current="page" on the current page. aria-hidden="true" on each ellipsis. aria-disabled="true" on previous at the first page and next at the last. Accessible names "Previous page", "Next page" and "Page 4". A polite live region says "Page 5 of 10" after an in-place change. Names are translated.

## Motion

- **Enter:** None. The page changes at once.
- **Exit:** None.
- **Reduced motion:** Nothing moves.

## Composition

- **Composes with:** `pagination-item`
- **Alternative to:** `tabs`
- **Planned:** `table`, `carousel`, `breadcrumbs`
- **Replaces:**
  - page links built from \<a href="#"> and click handlers
  - a disabled next button that drops focus at the last page
  - infinite scroll on a page with a footer

---

Generated from the `pagination` component definition.
