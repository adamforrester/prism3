# Breadcrumbs

> The path to the current page as links, with the current page last and not a link.

Shows where the current page sits in the site's hierarchy: a row of links to the pages above it, root first, ending in the current page as plain text. Each link is underlined and followed by a chevron. A long trail keeps its first step and its last two and collapses the middle behind one button that shows them in place. On a small screen the trail becomes one link up to the parent page. Breadcrumbs follow the site's structure, not the pages a person visited, and supplement the main navigation rather than replace it.

- **ID:** `breadcrumbs`
- **Category:** navigation
- **Status:** draft
- **Also known as:** breadcrumb, breadcrumb-trail, breadcrumb-list

## Usage

Use breadcrumbs on a site three or more levels deep, to show where a page sits and to climb back up. They follow the site's structure, not the visitor's history, and supplement the main navigation. For a one or two level site, use a single link back, or nothing. To go back in history, use the browser's Back or a Link. To switch between peers at one level, use Tabs.

### Do

- Start at the root and end at the current page
- Use each page's own title as its label
- Place breadcrumbs above the page heading
- Let a long trail collapse its middle rather than wrap

### Don't

- Show the visitor's click history
- Make the current page a link
- Truncate an ancestor's label
- Use breadcrumbs as the only navigation

### Content guidelines

Page titles in sentence case, matching each page heading. "Home" for the root.

### Copy patterns

- **Labels:** Each step is its page's own title, short and in sentence case. The root is "Home". No "You are here" prefix and no separators typed as text.

## Choosing it

- **Purpose:** Show the current page's place in the site hierarchy as links to its ancestors, ending in the current page.
- **Use when:** A page three or more levels deep in a stable hierarchy (a catalog, documentation, settings), where people need to see where they are and climb back up.
- **Avoid when:** The site is one or two levels deep (use a single Link back), the path is the visitor's history (use the browser's Back or a Link), the choice is between peers at one level (use Tabs), or the steps are a required sequence (a stepper, not built yet).
- **Often used with:** `breadcrumb-item`, `link`, `tabs`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `items` | slot | — | yes | The steps, root first, each with a label and an href. The last is rendered as the current page: text with aria-current="page", its href ignored. Three by default in Figma; at least two. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The body type size, 14 or 16px, passed to every item. Medium suits a trail beside 16px body copy; small, a quieter line above a page title. |
| `maxItems` | number | `5` | no | Above this many items, the middle collapses behind one overflow button. |
| `itemsBeforeCollapse` | number | `1` | no | How many items stay before the overflow button when the trail collapses. |
| `itemsAfterCollapse` | number | `2` | no | How many items stay after the overflow button: the parent and the current page by default. |
| `collapse` | enum: 'expand' | `expand` | no | What the overflow button does: expand shows the hidden steps in place and moves focus to the first of them. |
| `responsive` | boolean | `true` | no | Below 480px, show one link up to the parent page in place of the trail. Turn it off where the full trail fits. |
| `label` | string | `Breadcrumb` | no | The accessible name of the navigation landmark, translated. Assistive technology adds "navigation" itself. |
| `renderLink` | function | — | no | Renders each ancestor through a router's link, so one anchor renders and the component depends on no router. The plain anchor by default. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `layout` | `trail`, `parent` | once, when authored |
| `size` | `medium`, `small` | once, when authored |

## Accessibility

- **Role:** navigation landmark named "Breadcrumb", holding an ordered list of steps
- **WCAG:**
  - 1.3.1 Info and Relationships (an ordered list inside a named navigation landmark)
  - 2.4.8 Location (shows where the page sits in the site)
  - 2.4.5 Multiple Ways (one of the ways to reach a page)
  - 1.4.1 Use of Color (links are underlined at every state)
  - 1.4.3 Contrast (targets 4.5:1 for the links and the current page against the page)
  - 1.4.10 Reflow (targets one link up to the parent below 480px)
  - 2.4.4 Link Purpose
  - 2.4.7 Focus Visible
  - 2.5.8 Target Size (targets 24px for each link through a code-side hit area)
  - 4.1.2 Name, Role, Value
- **Keyboard:** Tab moves through the ancestor links and the overflow button; Enter follows a link; Enter or Space presses the overflow button. The current page takes no focus.
- **Focus:** Each link and the overflow button shows its own focus ring. After the overflow button is pressed, focus moves to the first revealed link.
- **ARIA:** A \<nav> with aria-label="Breadcrumb", translated. aria-current="page" on the current page, never aria-current="location". The separators are CSS, never in the accessibility tree. The overflow button is named "Show full path" (DRAFT). On a small screen the back chevron is aria-hidden. In right-to-left text the row and the chevrons mirror.

## Motion

- **Enter:** None. Steps revealed from the overflow button appear at once.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Composition

- **Composes with:** `breadcrumb-item`, `link`
- **Alternative to:** `link`, `tabs`
- **Planned:** `menu`
- **Replaces:**
  - links separated by typed ">" or "/" characters
  - a history trail of visited pages
  - a breadcrumb whose last item links to the page itself

---

Generated from the `breadcrumbs` component definition.
