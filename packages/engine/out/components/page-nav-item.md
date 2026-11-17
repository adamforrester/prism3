# PageNav.Item

> One link in a page navigation: another page, plain until hover, or the current page, with its bar.

- **ID:** `page-nav-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** page-nav-link

## Overview

One link in a PageNav row. A link to another page is plain at rest and shows its underline at hover and keyboard focus. The link to the page the user is on is the current page: plain text with a 2px bar under it, and at hover only its color changes, so it never reads as one more link. The bar's width is the brand's Current page indicator: the title's width, or half of it centered. Both are real links with their own address. Items live inside PageNav and are never placed on their own.

- **Purpose:** Show one link in a row of sibling pages: another page, plain until hover, or the current page, marked with a bar and aria-current="page".
- **Use when:** Only as a child of PageNav. Generate PageNav, which places one item per sibling page and marks the current one.
- **Avoid when:** Anywhere outside PageNav: a link on its own is Link, and a tab that shows a panel in place is Tab.Item inside Tabs.

## Anatomy

Shown on the default member: selection `unselected`, size `medium`.

1. **Container** — The item: a row that hugs its link, with no padding and no fill.
2. **Link** — The link at the item's size. Another page is plain until hover, pressed or focus shows its underline; the current page is plain, with the 2px bar under it. Its state is set on the item.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime | — |
| `size` | `medium`, `small` | once, when authored | The body type size, 14 or 16px. Set by the PageNav it sits in. |

## Usage guidelines

Items make up a PageNav row and are set inside it: one current page and links to its sibling pages. Change which item is current in the row; never place an item on its own.

### Do

- Make the page the user is on the current item
- Use the page's own title as each label

### Don't

- Place an item outside PageNav
- Make more than one item in a row current
- Remove the current page's link; it stays a link

## Accessibility

- **Keyboard:** Tab reaches the link; Enter follows it. The current page is a link too.
- **Focus:** The nested link's own focus ring.
- **Screen readers:** listitem, holding a link

  aria-current="page" on the current page's link. The link text is translated with the page title.

### WCAG

- 1.3.1 Info and Relationships (each page is a list item)
- 1.4.1 Use of Color (the current page carries a bar, not only a color)
- 1.4.3 Contrast (targets 4.5:1 for the link text against the page)
- 1.4.11 Non-text Contrast (targets 3:1 for the current-page bar against the page)
- 2.4.4 Link Purpose (the link text is the page's name)
- 2.4.7 Focus Visible (the link's own focus ring)
- 2.5.8 Target Size (targets 24px through the link's code-side hit area)
- 4.1.2 Name, Role, Value

### Motion

- **Enter:** None. The link's color changes on motion.duration.fast at hover and focus.
- **Exit:** None.
- **Reduced motion:** The color changes on motion.duration-reduced.fast.

## Content guidelines

Page titles, sentence case, as each page titles itself.

- **Labels:** The page's own title, short and in sentence case, matching the page heading: "Log in", "Orders". No trailing punctuation.

## Related components

- **Built from:** `link`
- **Often used with:** `page-nav`
- **Replaces:**
  - a tab with role="tab" that changes the page

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The page's name, as the page titles itself. It is the link text. |
| `href` | string | — | yes | The page's address. The current page keeps its href, so it stays a link. |
| `current` | boolean | `false` | no | Marks the page the user is on: the 2px bar in place of the underline, and aria-current="page". One item in a row is current. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The body type size, 14 or 16px. Set by the PageNav it sits in. |

## Specs

Generated from the plan that builds the design-file component: 4 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/link` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | — |

### Color

Keyed by `selection`.

### Nesting and properties

- `container/link` nests `link` at `style=standalone, weight=default, size=medium, surface=default, selection=unselected, state=rest`; `selection=selected` takes `selection=selected`; follows `size`; exposes `state`

---

Generated from the `page-nav-item` component definition.
