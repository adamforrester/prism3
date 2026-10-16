# BreadcrumbSeparator

> The mark between two breadcrumb steps: a chevron or a slash, in the secondary icon color.

The mark between two steps of a Breadcrumbs trail, after every step but the current page. A chevron that points toward the current page, or a slash. Breadcrumbs chooses one for the whole trail. It is 16px at both breadcrumb sizes, in the secondary icon color, and decorative: it is never read aloud or focused.

- **ID:** `_breadcrumb-separator`
- **Category:** navigation
- **Status:** draft
- **Also known as:** breadcrumb-divider, crumb-separator

## Usage

Part of a BreadcrumbItem. Choose chevron or slash once, on Breadcrumbs; every step shows the same mark.

### Do

- Choose the look once, on Breadcrumbs

### Don't

- Place a separator on its own, or type one as text between links
- Mix chevrons and slashes in one trail

### Content guidelines

The separator holds no copy.

### Copy patterns

- **Labels:** The mark carries no text.

## Choosing it

- **Purpose:** The mark between two steps of a Breadcrumbs trail, a chevron or a slash.
- **Use when:** Only as a child of BreadcrumbItem. Generate Breadcrumbs instead.
- **Avoid when:** Always on its own. Use Breadcrumbs; for a plain icon, use an Icon.
- **Often used with:** `breadcrumb-item`, `breadcrumbs`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `type` | enum: 'chevron' \| 'slash' | `chevron` | no | chevron: a chevron pointing toward the current page. slash: a forward slash. Set by the Breadcrumbs it sits in, for every step at once. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `chevron`, `slash` | once, when authored |

## Accessibility

- **Role:** none: decorative, drawn by CSS and never in the accessibility tree
- **WCAG:**
  - 1.3.1 Info and Relationships (the trail's order is the list's, not the separator's)
- **Focus:** None. The mark takes no focus.
- **ARIA:** None. The mark is CSS generated content, never announced.

## Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Composition

- **Replaces:**
  - a "/" or ">" typed as text between breadcrumb links

---

Generated from the `_breadcrumb-separator` component definition.
