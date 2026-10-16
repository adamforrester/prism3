---
engine: minor
---
Breadcrumbs and BreadcrumbItem (#2666, the approved wireframe, every numbered call A). Breadcrumbs is a `layout`
(trail, parent) × `size` (medium, small) set of 4 members: the trail holds a native `items` slot of BreadcrumbItem,
two ancestors and the current page by default, at least two; the parent layout is one Link up a level beside a
`chevron-left` glyph. BreadcrumbItem is a `kind` (ancestor, current, overflow) × `size` set of 6 members: an ancestor
nests Link (inline, default weight, underlined at every state), the current page is `text.primary` body text, and the
overflow step nests FlushIconButton.Neutral (flush, small, `more-horizontal-filled`); a 16px `chevron-right` separator
in `icon.secondary` follows every step but the current one. Two new variant axis names, `kind` and `layout`. Both
sets lead with medium, the code default (Q347 A, Q359 B). Two new component pages under `out/components/`. No new
token, so CONTRACT is unchanged.
