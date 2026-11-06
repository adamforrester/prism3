---
engine: minor
---
Page navigation (#3345, owner decisions 2026-11-03: Q1 A, Q2 A, Q3 A amended, Q4 A, Q7 B, Q10 B): two new components and a new
optional brand input. `page-nav` (PageNav) is a navigation of links between two to six sibling pages, the current one
marked: a row holding a native items slot of `page-nav-item` (PageNav.Item), 2 members (`size` medium, small). The item
nests Link at its standalone look: another page at `selection=unselected` (plain at rest, underlined at hover), the
current page at `selection=selected` (plain, with Link's 2px current-page bar), 4 members (`selection` × `size`). In code it is a `<nav>`
with a `<ul>` of `<a href>`, the current one `aria-current="page"`, and no tab roles. Tabs and Tab now point page
changes at PageNav, so their docs and `components.ai.json` entries move; Link lists PageNav among its partners.
`currentIndicator: full | partial` (Form, default `partial`) is the width of Link's current-page bar, which every current
link draws, a PageNav item's included: Partial is round(0.5 × the title's width), centered; Full is the title's width,
as before. A new part field, `footShare`, carries the share; both component executors draw such a bar at that share,
centered, constrained SCALE across. `applyCurrentIndicator` materializes it into Link before projection; it is the identity
at Full. Because Partial is the default, a brand that sets nothing now draws every current Link's bar at half the title's
width, so Link's selected members are due on Update. No token is added or renamed, so CONTRACT is unchanged and every
committed token emission is byte-identical. Two component pages join `out/components/` (229 committed artifacts). The component-defs export carries the setting: `currentIndicator` joins its brand `settings` and its lever chain, and its format moves `prism3-component-defs/1.0` → `1.1` (a field added: minor). Link's,
PageNav's and PageNav.Item's docs say the bar's width is the brand's Current page indicator.
