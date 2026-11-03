# PageNav

> A row of links between sibling pages, with the current page marked. Size applies to the items you haven't edited. After editing an item, select the items and set their size.

- **ID:** `page-nav`
- **Category:** navigation
- **Status:** draft
- **Also known as:** page-navigation, sibling-page-links, local-navigation

## Overview

A navigation between two to six related pages, such as Log in and Create account, or the pages of an account. Each item is a link to its own address; the link to the page the user is on carries a 2px bar and is marked as the current page for assistive technology. The other links are underlined. Tab moves from link to link, and the browser's back button and bookmarks work as they do for any link. Use Tabs instead when the content switches in place on one page.

- **Purpose:** Move between sibling pages: a navigation of links, each to its own address, with the current page marked by a bar and aria-current="page".
- **Use when:** Two to about six sibling pages of one area, such as Log in and Create account, or an account's Overview, Orders and Profile, where each page has its own address and the current one is marked.
- **Avoid when:** The content switches in place without changing the address (use Tabs), the links are the site's main navigation, the path is a hierarchy (use Breadcrumbs), or the pages are a required sequence (a stepper, not built yet).

## Anatomy

Shown on the default member: size `medium`.

1. **Container** — The navigation: a row that hugs its items, with no padding, no fill and no baseline.
2. **Items** — The pages: a native slot holding PageNav.Item instances in a row, three by default, the first the current page.
3. **Item1** — The current page: plain, with the 2px bar under it.
4. **Item2** — A sibling page: an underlined link.
5. **Item3** — A sibling page: an underlined link.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small` | once, when authored | The body type size, 14 or 16px, passed to every item, with the gap between items sized to it. |

## Usage guidelines

Use page navigation to move between two to six sibling pages that share a heading area, such as Log in and Create account, or an account's Overview, Orders and Profile pages. Each item is a link to its own page, so the browser's back button and bookmarks work. Use Tabs when the content switches in place on one page, and Breadcrumbs to show where a page sits in a hierarchy.

### Do

- Mark the page the user is on as the current item
- Use each page's own title as its label
- Name the landmark for the area, such as Account
- Keep the row the same on every page it links

### Don't

- Use page navigation to switch panels in place; use Tabs
- Use page navigation as the site's main navigation
- Make more than one item current
- Put more than six pages in one row

## Accessibility

- **Keyboard:** Tab moves from link to link; Enter follows a link. There are no arrow-key moves: each item is a link, not a tab.
- **Focus:** Each link shows its own focus ring.
- **Screen readers:** navigation landmark named by its label, holding a list of links

  A \<nav> with an aria-label, translated. aria-current="page" on the current page's link. No tab roles and no selected state: a screen reader announces each item as a link, and the current one as the current page.

### WCAG

- 1.3.1 Info and Relationships (a list of links inside a named navigation landmark)
- 1.4.1 Use of Color (the other pages are underlined, the current page carries a bar)
- 1.4.3 Contrast (targets 4.5:1 for the links against the page)
- 1.4.11 Non-text Contrast (targets 3:1 for the current-page bar against the page)
- 2.4.4 Link Purpose (each link is its page's name)
- 2.4.7 Focus Visible (each link's own focus ring)
- 2.4.8 Location (the current page is marked)
- 2.5.8 Target Size (targets 24px for each link through a code-side hit area)
- 4.1.2 Name, Role, Value

### Motion

- **Enter:** None. Following a link loads its page.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Content guidelines

Page titles in sentence case, matching each page heading.

- **Labels:** Each item is its page's own title, short and in sentence case: "Log in", "Create account", "Orders". The landmark's label names the area, such as "Account".

## Related components

- **Built from:** `page-nav-item`
- **Instead, consider:** `tabs`, `breadcrumbs`
- **Often used with:** `link`, `breadcrumbs`
- **Replaces:**
  - a tab list whose tabs change the page or the address
  - links styled as tabs with a selected state
  - a row of links with the current page told apart by color alone

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `items` | slot of `page-nav-item`, 2 to 6 | — | yes | The pages, each a PageNav.Item with a label and an href, in order. One is current. At least two, six at most. |
| `label` | string | — | yes | The accessible name of the navigation landmark, such as "Account", translated. Assistive technology adds "navigation" itself. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The body type size, 14 or 16px, passed to every item, with the gap between items sized to it. |
| `renderLink` | function | — | no | Renders each item through a router's link, so one anchor renders and the component depends on no router. The plain anchor by default. |

## Specs

Generated from the plan that builds the design-file component: 2 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/items` | slot | every member |
| `container/items/item1` | instance | every member |
| `container/items/item2` | instance | every member |
| `container/items/item3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/items` | — | `space.300` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/items` | — | `space.200` | — | — | — | — |

### Color

Keyed by nothing: one row covers every member.

### Nesting and properties

- `container/items` is a slot, preferring `page-nav-item`
- `container/items/item1` nests `page-nav-item` at `selection=selected, size=medium`; follows `size`
- `container/items/item2` nests `page-nav-item` at `selection=unselected, size=medium`; follows `size`
- `container/items/item3` nests `page-nav-item` at `selection=unselected, size=medium`; follows `size`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `page-nav` component definition.
