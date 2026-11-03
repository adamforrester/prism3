---
engine: minor
---
Page navigation (#3345, owner decisions 2026-11-03: Q1 A, Q2 A, Q3 A amended, Q4 A): two new components and a new
optional brand input. `page-nav` (PageNav) is a navigation of links between two to six sibling pages, the current one
marked: a row holding a native items slot of `page-nav-item` (PageNav.Item), 2 members (`size` medium, small). The item
nests Link: another page is Link's inline look (underlined at every state), the current page is Link's standalone look at
`selection=selected` (plain, with Link's 2px current-page bar), 4 members (`selection` × `size`). In code it is a `<nav>`
with a `<ul>` of `<a href>`, the current one `aria-current="page"`, and no tab roles. Tabs and Tab now point page
changes at PageNav, so their docs and `components.ai.json` entries move; Link lists PageNav among its partners.
`currentIndicator: full | partial` (Form, default `full`) is the width of Link's current-page bar, which every current
link draws, a PageNav item's included: Full is the title's width, as before; Partial is round(0.5 × the title's width),
centered. A new part field, `footShare`, carries the share; both component executors draw such a bar at that share,
centered, constrained SCALE across. `applyCurrentIndicator` materializes it into Link before projection; it is the identity
at Full, so every default plan is byte-identical. No token is added or renamed, so CONTRACT is unchanged and every
committed token emission is byte-identical. Two component pages join `out/components/` (227 committed artifacts). The
setting's key, label and Studio home (Components › Page navigation) are a DRAFT for the owner.
