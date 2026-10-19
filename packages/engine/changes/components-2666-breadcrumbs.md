---
engine: minor
---
Breadcrumbs, BreadcrumbItem and BreadcrumbSeparator (#2666, the approved wireframe, every numbered call A, and owner
decision Q382 A after QA). Breadcrumbs is a `path` (full, parent) × `separator` (chevron, slash) × `size` (medium,
small) set of 6 members, the parent path without a slash member: the trail holds a native `items` slot of
BreadcrumbItem, two ancestors and the current page by default, at least two, the ancestors following the trail's
separator; the parent path is one Link up a level beside a `chevron-left` glyph. BreadcrumbItem is a `kind`
(ancestor, current, overflow) × `separator` × `size` set of 10 members, the current page without a slash member: an
ancestor nests Link (inline, default weight, underlined at every state), the current page is `text.primary` body text,
and the overflow step nests FlushIconButton.Neutral (flush, small, `more-horizontal-filled`); every step but the current
one ends in a nested `_breadcrumb-separator` in its separator's look. `_breadcrumb-separator` (BreadcrumbSeparator) is a
`type` (chevron, slash) set of 2 members: a 16px (`icon.size.xs`) `chevron-right` or `slash` in `color.icon.secondary`.
The icon set gains `slash`, drawn for this project (Remix has no plain slash): a 2px stroke on the 24px grid. Three new
variant axis names, `kind`, `path` and `separator`. All three sets lead with their code default (Q347 A, Q359 B).
Three new component pages under `out/components/`. No new token, so CONTRACT is unchanged.
