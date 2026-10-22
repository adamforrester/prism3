# BreadcrumbSeparator

> The mark between two breadcrumb steps: a chevron or a slash, in the secondary icon color.

- **ID:** `_breadcrumb-separator`
- **Category:** navigation
- **Status:** draft
- **Also known as:** breadcrumb-divider, crumb-separator

## Overview

The mark between two steps of a Breadcrumbs trail, after every step but the current page. A chevron that points toward the current page, or a slash. Breadcrumbs chooses one for the whole trail. It is 16px at both breadcrumb sizes, in the secondary icon color, and decorative: it is never read aloud or focused.

- **Purpose:** The mark between two steps of a Breadcrumbs trail, a chevron or a slash.
- **Use when:** Only as a child of BreadcrumbItem. Generate BreadcrumbItem, which shows the separator in the look its Breadcrumbs sets.
- **Avoid when:** Always on its own. Use Breadcrumbs; for a plain icon, use an Icon.

## Anatomy

Shown on the default member: type `chevron`.

1. **Frame** — The mark's box, one 16px icon square. Exactly one glyph shows in it.
2. **Chevron glyph** — A chevron pointing toward the current page.
3. **Slash glyph** — A forward slash.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `chevron`, `slash` | once, when authored | chevron: a chevron pointing toward the current page. slash: a forward slash. Set by the Breadcrumbs it sits in, for every step at once. |

## Usage guidelines

Part of a BreadcrumbItem. Choose chevron or slash once, on Breadcrumbs; every step shows the same mark.

### Do

- Choose the look once, on Breadcrumbs

### Don't

- Place a separator on its own, or type one as text between links
- Mix chevrons and slashes in one trail

## Accessibility

- **Focus:** None. The mark takes no focus.
- **Screen readers:** none: decorative, drawn by CSS and never in the accessibility tree

  None. The mark is CSS generated content, never announced.

### WCAG

- 1.3.1 Info and Relationships (the trail's order is the list's, not the separator's)

### Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Content guidelines

The separator holds no copy.

- **Labels:** The mark carries no text.

## Related components

- **Often used with:** `breadcrumb-item`, `breadcrumbs`
- **Replaces:**
  - a "/" or ">" typed as text between breadcrumb links

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `type` | enum: 'chevron' \| 'slash' | `chevron` | no | chevron: a chevron pointing toward the current page. slash: a forward slash. Set by the Breadcrumbs it sits in, for every step at once. |

## Specs

Generated from the plan that builds the design-file component: 2 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `frame` | frame | every member |
| `frame/chevronGlyph` | instance | type=chevron |
| `frame/slashGlyph` | instance | type=slash |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/chevronGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/slashGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

### Color

Keyed by `type`.

**type=chevron**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/chevronGlyph` | — | — | — | `color.icon.secondary` |

**type=slash**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/slashGlyph` | — | — | — | `color.icon.secondary` |

### Nesting and properties

- `frame/chevronGlyph` nests `icon/chevron-right`
- `frame/slashGlyph` nests `icon/slash`

---

Generated from the `_breadcrumb-separator` component definition.
