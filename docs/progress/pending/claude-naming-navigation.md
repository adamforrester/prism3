## (2026-11-11) — Navigation names line up: Pagination.Item `current`, Breadcrumbs.Item and Breadcrumbs.Separator, the `label` part (#3554 Q-CC15–18, #3555 Q-MD7 b)

**STATUS: built, owner decisions 2026-11-11 (every Q-CC and Q-MD at A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

- **Q-CC15 A.** Pagination.Item's `selected` prop is `current`, as on Link and PageNav.Item. The cell
  marks a "you are here" page, not a selection. The Figma `selection` axis keeps its name, as Link's does,
  so no member moves.
- **Q-CC16 A and Q-MD7 (b) A.** The display names are Breadcrumbs.Item and Breadcrumbs.Separator, dotted
  like Pagination.Item and the other children. The two issues spelled the parent differently (Q-CC16:
  `Breadcrumbs.Item`; Q-MD7's example: `Breadcrumb.Item`). This follows Q-CC16 and the lane brief, and the
  dotted rule itself: the parent is named Breadcrumbs. The set ids (`breadcrumb-item`,
  `_breadcrumb-separator`) and so the Figma set names are unchanged.
- **Q-CC17 A.** The current page's text part is `label`, the main-text name (Q350), not `current`. It is
  renamed in place through a `part` entry in `COMPONENT_RENAMES`, so a placed current page keeps its
  text. #3054 (the item's `label` driving an ancestor's nested Link) is not built here: a host property
  cannot yet reach a nested instance's text (#2781), which is executor work, not naming.
- **Q-CC18 A.** Pagination.Item's summary, also its Figma description, ends "The current page is marked."

History lines (`notes.evolution`, merged change notes) keep the old names.
