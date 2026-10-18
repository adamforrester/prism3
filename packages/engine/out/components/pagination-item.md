# Pagination.Item

> A pagination cell: a page, the gap marker, previous or next. The current page is outlined.

One cell in a pagination row: a page number, the gap marker, three dots, that stands for two or more hidden pages, or the previous or next cell, a chevron that opens the page before or after. A cell is as tall as an icon button and at least as wide as it is tall, so a row of pages between previous and next lines up as equal squares; a page number past two digits, or the word "Previous" or "Next" beside a chevron, widens it. The current page is marked, not filled: a border, or a 2px underline under its number, in a gray that stands out from the page at 3:1, with its number in the emphasis weight. It keeps its width, so the row does not move. At hover and press, another page, previous and next show a light neutral wash. At the first or last page, previous or next stays in place and does nothing, drawn in the disabled ink. The gap marker is decorative: it does not respond to the pointer, takes no focus and is hidden from assistive technology. Pagination places the cells and decides which page is current.

- **ID:** `pagination-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** page-item, pagination-page

## Usage

Use inside Pagination only. Pagination works out which pages to show, marks the current one, places the ellipses, and sets previous and next inactive at an end.

### Do

- Let Pagination set the current page and the ellipses
- Keep every page cell the same size as the previous and next cells beside it

### Don't

- Place a page cell outside a pagination row
- Make the ellipsis a control

### Content guidelines

Numbers only on a page. The accessible name adds "Page". Previous and next read "Previous" and "Next", sentence case.

### Copy patterns

- **Labels:** The page number, in the locale's numerals. Nothing else is shown in a page cell; the ellipsis shows the three-dot icon and no text. A labeled previous or next shows "Previous" or "Next", never "Prev", "Back" or "Forward".

## Choosing it

- **Purpose:** One page number, the ellipsis, or previous or next, inside a pagination row.
- **Use when:** Only as an item in Pagination: a page or the ellipsis in the numbered row, previous and next in every type.
- **Avoid when:** Anywhere outside Pagination: a single action is a Button, and a choice between a few views is a segmented control or tabs.
- **Often used with:** `pagination`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The page number as shown, such as "4". Pagination sets it, through the locale's number format. |
| `page` | number | — | no | The page this cell opens. Absent on an ellipsis. |
| `href` | string | — | no | The address of the page. Present, the cell is a link; absent, it is a button that changes the page in place. |
| `selected` | boolean | `false` | no | Whether this is the current page. Set by Pagination; do not set it on a cell inside a pagination row. |
| `type` | enum: 'page' \| 'ellipsis' \| 'previous' \| 'next' | `page` | no | page: a page number the user can open. ellipsis: the three-dot icon that stands for two or more pages not shown. previous and next: the cell with a left or right chevron that opens the page before or after the current one. |
| `labeled` | boolean | `false` | no | On previous and next only: true shows the word beside the chevron, as Pagination's simple type does. Passed down by Pagination. |
| `previousLabel` | string | `Previous` | no | The word a labeled previous cell shows, "Previous" by default. Pass the translated word. |
| `nextLabel` | string | `Next` | no | The word a labeled next cell shows, "Next" by default. Pass the translated word. |
| `isInactive` | boolean | `false` | no | On previous and next only: true at the first or last page. The cell stays in place and in the Tab order with aria-disabled="true", and does nothing when activated. Set by Pagination. |
| `style` | enum: 'border' \| 'underline' | `border` | no | How the current page is marked: a border around the cell, or a 2px line under the number. Passed down by Pagination. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The cell height and label type, matching the icon buttons beside it. Passed down by Pagination. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `page`, `ellipsis`, `previous`, `next` | once, when authored |
| `selection` | `unselected`, `selected` | at runtime |
| `style` | `border`, `underline` | once, when authored |
| `labeled` | `false`, `true` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** a link (\<a href>) when the page has an address, or a button for a page changed in place, for a page, previous and next; the ellipsis is a decorative icon hidden from assistive technology
- **WCAG:**
  - 1.3.1 Info and Relationships (each cell is a list item; the current page carries aria-current="page")
  - 1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)
  - 1.4.3 Contrast (Minimum) (every number on the page at 4.5:1)
  - 1.4.11 Non-text Contrast (the current page's border or underline at 3:1 against the page; the decorative gap icon is exempt)
  - 2.4.4 Link Purpose (In Context) (each page is named "Page N"; previous and next "Previous page" and "Next page")
  - 2.5.3 Label in Name (a labeled cell's visible "Previous" or "Next" starts its accessible name)
  - 2.4.7 Focus Visible (the shared focus ring)
  - 2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)
- **Keyboard:** Each page, previous and next is its own Tab stop; Enter opens it, and Space also does when it is a button. An inactive previous or next keeps its Tab stop and does nothing. Arrow keys do not move between pages. The ellipsis is skipped.
- **Focus:** A focus ring around the cell on :focus-visible, the current page included.
- **ARIA:** aria-current="page" on the current page. A visually hidden "Page " before each number, so it reads "Page 4". aria-hidden="true" on the ellipsis icon and on the chevrons. Previous and next named "Previous page" and "Next page", and aria-disabled="true" at an end.

## Motion

- **Enter:** None. The hover wash and the current page's border change at once or over a short color fade.
- **Exit:** None.
- **Reduced motion:** The color change happens at once.

## Composition

- **Composes with:** `focus-ring`
- **Replaces:**
  - a page number link with href="#" and a click handler
  - an ellipsis read aloud as "dot dot dot"

---

Generated from the `pagination-item` component definition.
