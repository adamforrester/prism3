# Pagination.Item

> One page number in a pagination row, or the ellipsis between them. The current page is filled.

One cell in a pagination row: a page number, or the ellipsis that stands for two or more hidden pages. A page cell is as tall as an icon button and at least as wide as it is tall, so a row of pages and the previous and next buttons beside them line up as equal squares; a page number past two digits widens it. The current page is filled with the primary color and its number set in the emphasis weight, and it keeps its width, so the row does not move. At hover and press, another page shows a light neutral wash. The ellipsis does not respond to the pointer and takes no focus. Pagination places the cells and decides which page is current.

- **ID:** `_pagination-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** page-item, pagination-page

## Usage

Use inside Pagination only. Pagination works out which pages to show, marks the current one and places the ellipses.

### Do

- Let Pagination set the current page and the ellipses
- Keep every page cell the same size as the previous and next buttons beside it

### Don't

- Place a page cell outside a pagination row
- Make the ellipsis a control

### Content guidelines

Numbers only. The accessible name adds "Page".

### Copy patterns

- **Labels:** The page number, in the locale's numerals. Nothing else is shown in the cell.

## Choosing it

- **Purpose:** One page number, or the ellipsis, inside a pagination row.
- **Use when:** Only as an item in Pagination's numbered row.
- **Avoid when:** Anywhere outside Pagination: a single action is a Button, and a choice between a few views is a segmented control or tabs.
- **Often used with:** `pagination`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The page number as shown, such as "4". Pagination sets it, through the locale's number format. |
| `page` | number | — | no | The page this cell opens. Absent on an ellipsis. |
| `href` | string | — | no | The address of the page. Present, the cell is a link; absent, it is a button that changes the page in place. |
| `selected` | boolean | `false` | no | Whether this is the current page. Set by Pagination; do not set it on a cell inside a pagination row. |
| `type` | enum: 'page' \| 'ellipsis' | `page` | no | page: a page number the user can open. ellipsis: the mark that stands for two or more pages not shown. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The cell height and label type, matching the icon buttons beside it. Passed down by Pagination. |

## States

`rest`, `hover`, `pressed`, `focus-visible`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `page`, `ellipsis` | once, when authored |
| `selection` | `unselected`, `selected` | at runtime |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** a link (\<a href>) when the page has an address, or a button for a page changed in place; the ellipsis is hidden from assistive technology
- **WCAG:**
  - 1.3.1 Info and Relationships (each cell is a list item; the current page carries aria-current="page")
  - 1.4.1 Use of Color (the current page changes weight as well as color)
  - 1.4.3 Contrast (Minimum) (the current page's number on its fill, and every other number on the page, at 4.5:1)
  - 1.4.11 Non-text Contrast (targets 3:1 for the current page's fill against the page)
  - 2.4.4 Link Purpose (In Context) (each cell is named "Page N")
  - 2.4.7 Focus Visible (the shared focus ring)
  - 2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)
- **Keyboard:** Each page is its own Tab stop; Enter opens it, and Space also does when it is a button. Arrow keys do not move between pages. The ellipsis is skipped.
- **Focus:** A focus ring around the cell on :focus-visible, the current page included.
- **ARIA:** aria-current="page" on the current page. A visually hidden "Page " before each number, so it reads "Page 4". aria-hidden="true" on the ellipsis.

## Motion

- **Enter:** None. The hover wash and the current page's fill change at once or over a short color fade.
- **Exit:** None.
- **Reduced motion:** The color change happens at once.

## Composition

- **Composes with:** `focus-ring`
- **Replaces:**
  - a page number link with href="#" and a click handler
  - an ellipsis read aloud as "dot dot dot"

---

Generated from the `_pagination-item` component definition.
