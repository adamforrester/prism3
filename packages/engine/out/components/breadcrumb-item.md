# BreadcrumbItem

> One step in a breadcrumb trail: a link, the current page, or the collapsed steps.

One step in a Breadcrumbs trail. An ancestor is an underlined link to a page above the current one, followed by a chevron or a slash. The current page is plain text in the primary text color, last in the trail and not a link. The overflow step stands for the steps a long trail hides: a small icon-only button that shows them in place when pressed. Items live inside Breadcrumbs and are never placed on their own.

- **ID:** `breadcrumb-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** crumb, breadcrumb-step

## Usage

Items make up a Breadcrumbs trail and are set inside it: ancestors first, the current page last, and an overflow item where a long trail collapses. Change an item's kind in the trail; never place an item on its own.

### Do

- Make the last item the current page
- Use the page's own title as each label
- Use one overflow item in place of the hidden steps

### Don't

- Place an item outside Breadcrumbs
- Make the current page a link
- Truncate an ancestor's label; collapse whole steps instead

### Content guidelines

Page titles, sentence case, as each page titles itself.

### Copy patterns

- **Labels:** Each page's own title, short and in sentence case, matching the page heading. No "Back to" and no trailing punctuation.

## Choosing it

- **Purpose:** One step of a Breadcrumbs trail: an ancestor link, the current page, or the overflow button for collapsed steps.
- **Use when:** Inside Breadcrumbs only, as each step of the trail.
- **Avoid when:** You need a trail of links (use Breadcrumbs, which holds the items), a link on its own (use Link) or a back link in history (use Link).
- **Often used with:** `breadcrumbs`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `kind` | enum: 'ancestor' \| 'current' \| 'overflow' | `ancestor` | no | ancestor: a link to a page above this one. current: the page you are on, as text. overflow: the button that stands for the hidden steps of a long trail. Breadcrumbs sets it from the item's place in the trail. |
| `label` | string | — | yes | The page name, as the page titles itself. On an ancestor it is the link text; on the current page, the text. |
| `href` | string | — | no | The ancestor page's address. Ignored on the current page, which is not a link. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The body type size, 14 or 16px, with the gap to the separator sized to it. Set by the Breadcrumbs it sits in. |
| `separator` | enum: 'chevron' \| 'slash' | `chevron` | no | The mark after the step: a chevron or a slash. Set by the Breadcrumbs it sits in, the same for every step. Unused on the current page. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `kind` | `ancestor`, `current`, `overflow` | once, when authored |
| `separator` | `chevron`, `slash` | once, when authored |
| `size` | `medium`, `small` | once, when authored |

## Accessibility

- **Role:** listitem, holding a link, the current page's text, or a button
- **WCAG:**
  - 1.3.1 Info and Relationships (each step is a list item)
  - 1.4.1 Use of Color (an ancestor link is underlined at every state)
  - 1.4.3 Contrast (targets 4.5:1 for the link and the current page against the page)
  - 2.4.4 Link Purpose (the link text is the ancestor page's name)
  - 2.4.7 Focus Visible (the nested link's and button's own focus rings)
  - 2.5.8 Target Size (targets 24px for a link and 44px for the overflow button, through code-side hit areas)
  - 4.1.2 Name, Role, Value
- **Keyboard:** Tab reaches an ancestor link or the overflow button; Enter follows the link; Enter or Space presses the button. The current page takes no focus.
- **Focus:** The nested link's and button's own focus rings. The current page is not focusable.
- **ARIA:** aria-current="page" on the current page's text. The overflow button is named "Show full path" (DRAFT), translated, and its glyph is aria-hidden. The separator is never exposed. In right-to-left text the separator mirrors.

## Motion

- **Enter:** None. Steps revealed from the overflow appear at once in its place.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Composition

- **Composes with:** `_breadcrumb-separator`, `link`, `flush-icon-button-neutral`
- **Replaces:**
  - a separator typed as text between links
  - the current page rendered as a link to itself

---

Generated from the `breadcrumb-item` component definition.
