---
engine: minor
---
Navigation names line up (#3554 and #3555, owner decisions 2026-11-11). Pagination.Item's current-page prop is `current`, as on Link and PageNav.Item (Q-CC15 A), and its summary says the current page is marked, which holds for both styles (Q-CC18 A). The breadcrumb children are named Breadcrumbs.Item and Breadcrumbs.Separator, dotted like every other child (Q-CC16 A, Q-MD7 A). Breadcrumbs.Item's current-page text layer is `label`, renamed in place through `COMPONENT_RENAMES`, so a placed current page keeps its text (Q-CC17 A).
