# BreadcrumbItem

> One step in a breadcrumb trail: a link, the current page, or the collapsed steps.

- **ID:** `breadcrumb-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** crumb, breadcrumb-step

## Overview

One step in a Breadcrumbs trail. An ancestor is an underlined link to a page above the current one, followed by a chevron or a slash. The current page is plain text in the primary text color, last in the trail and not a link. The overflow step stands for the steps a long trail hides: a small icon-only button that shows them in place when pressed. Items live inside Breadcrumbs and are never placed on their own.

- **Purpose:** One step of a Breadcrumbs trail: an ancestor link, the current page, or the overflow button for collapsed steps.
- **Use when:** Only as a child of Breadcrumbs. Generate Breadcrumbs, which places each step and sets the separator and size for all of them.
- **Avoid when:** You need a trail of links (use Breadcrumbs, which holds the items), a link on its own (use Link) or a back link in history (use Link).

## Anatomy

Shown on the default member: kind `ancestor`, separator `chevron`, size `medium`.

1. **Container** — The item: a row that hugs its link, text or button and the separator after it, with no padding and no fill.
2. **Crumb** — An ancestor: a Link, inline and default weight, underlined at every state, at the item's size. Its state is set on the item.
3. **Current** — The current page: plain text in the primary text color, not a link.
4. **Overflow** — The collapsed steps: a FlushIconButton.Neutral, flush and small, showing three dots. Its state is set on the item.
5. **Separator** — The separator, chevron look: a 16px chevron pointing toward the current page, in the secondary icon color. Absent after the current page.
6. **Separator slash** — The separator, slash look: a 16px slash in the secondary icon color. Absent after the current page.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `kind` | `ancestor`, `current`, `overflow` | once, when authored | ancestor: a link to a page above this one. current: the page you are on, as text. overflow: the button that stands for the hidden steps of a long trail. Breadcrumbs sets it from the item's place in the trail. |
| `separator` | `chevron`, `slash` | once, when authored | The mark after the step: a chevron or a slash. Set by the Breadcrumbs it sits in, the same for every step. Unused on the current page. |
| `size` | `medium`, `small` | once, when authored | The body type size, 14 or 16px, with the gap to the separator sized to it. Set by the Breadcrumbs it sits in. |

## Usage guidelines

Items make up a Breadcrumbs trail and are set inside it: ancestors first, the current page last, and an overflow item where a long trail collapses. Change an item's kind in the trail; never place an item on its own.

### Do

- Make the last item the current page
- Use the page's own title as each label
- Use one overflow item in place of the hidden steps

### Don't

- Place an item outside Breadcrumbs
- Make the current page a link
- Truncate an ancestor's label; collapse whole steps instead

## Accessibility

- **Keyboard:** Tab reaches an ancestor link or the overflow button; Enter follows the link; Enter or Space presses the button. The current page takes no focus.
- **Focus:** The nested link's and button's own focus rings. The current page is not focusable.
- **Screen readers:** listitem, holding a link, the current page's text, or a button

  aria-current="page" on the current page's text. The overflow button is named "Show full path", translated, and its glyph is aria-hidden. The separator is never exposed. In right-to-left text the separator mirrors.

### WCAG

- 1.3.1 Info and Relationships (each step is a list item)
- 1.4.1 Use of Color (an ancestor link is underlined at every state)
- 1.4.3 Contrast (targets 4.5:1 for the link and the current page against the page)
- 2.4.4 Link Purpose (the link text is the ancestor page's name)
- 2.4.7 Focus Visible (the nested link's and button's own focus rings)
- 2.5.8 Target Size (targets 24px for a link and 44px for the overflow button, through code-side hit areas)
- 4.1.2 Name, Role, Value

### Motion

- **Enter:** None. Steps revealed from the overflow appear at once in its place.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Content guidelines

Page titles, sentence case, as each page titles itself.

- **Labels:** Each page's own title, short and in sentence case, matching the page heading. No "Back to" and no trailing punctuation.

## Related components

- **Built from:** `_breadcrumb-separator`, `link`, `flush-icon-button-neutral`
- **Often used with:** `breadcrumbs`
- **Replaces:**
  - a separator typed as text between links
  - the current page rendered as a link to itself

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `kind` | enum: 'ancestor' \| 'current' \| 'overflow' | `ancestor` | no | ancestor: a link to a page above this one. current: the page you are on, as text. overflow: the button that stands for the hidden steps of a long trail. Breadcrumbs sets it from the item's place in the trail. |
| `label` | string | — | yes | The page name, as the page titles itself. On an ancestor it is the link text; on the current page, the text. |
| `href` | string | — | no | The ancestor page's address. Ignored on the current page, which is not a link. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The body type size, 14 or 16px, with the gap to the separator sized to it. Set by the Breadcrumbs it sits in. |
| `separator` | enum: 'chevron' \| 'slash' | `chevron` | no | The mark after the step: a chevron or a slash. Set by the Breadcrumbs it sits in, the same for every step. Unused on the current page. |

## Specs

Generated from the plan that builds the design-file component: 10 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/crumb` | instance | kind=ancestor |
| `container/separator` | instance | 4 of 10 members |
| `container/separatorSlash` | instance | separator=slash |
| `container/current` | text | kind=current |
| `container/overflow` | instance | kind=overflow |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.050` | — | — | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/current` | `type.body.md.default` |
| size=small | `container/current` | `type.body.sm.default` |

### Color

Keyed by `kind`, `separator`.

**kind=current, separator=chevron**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/current` | — | — | `color.text.primary` | — |

### Nesting and properties

- `container/crumb` nests `link` at `style=inline, weight=default, size=medium, surface=default, selection=unselected, state=rest`; follows `size`; exposes `state`
- `container/separator` nests `_breadcrumb-separator` at `type=chevron`
- `container/separatorSlash` nests `_breadcrumb-separator` at `type=slash`
- `container/overflow` nests `flush-icon-button-neutral` at `shape=flush, size=small, surface=default, state=rest`; exposes `state`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Current page` |

---

Generated from the `breadcrumb-item` component definition.
