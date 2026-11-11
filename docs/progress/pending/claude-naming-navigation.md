## (2026-11-11) — Pagination.Item `current`, BreadcrumbItem's `label` part (#3554 Q-CC15, Q-CC17, Q-CC18)

**STATUS: built, owner decisions 2026-11-11 (every Q-CC at A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

- **Q-CC15 A.** Pagination.Item's `selected` prop is `current`, as on Link and PageNav.Item. The cell
  marks a "you are here" page, not a selection. The Figma `selection` axis keeps its name, as Link's does,
  so no member moves; the size-order bridge in `test.ts` reads the axis from `current`.
- **Q-CC17 A.** The current page's text part is `label`, the main-text name (Q350), not `current`. It is
  renamed in place through a `part` entry in `COMPONENT_RENAMES`, so a placed current page keeps its
  text. #3054 (the item's `label` driving an ancestor's nested Link) is not built here: a host property
  cannot yet reach a nested instance's text (#2781), which is executor work, not naming.
- **Q-CC18 A.** Pagination.Item's summary, also its Figma description, ends "The current page is marked."

### Held: Q-CC16 and Q-MD7 (b), the breadcrumb children's dotted names

Built first and taken out. The two owner answers name the parent differently (Q-CC16 A:
`Breadcrumbs.Item`; Q-MD7 A: `Breadcrumb.Item`), and `test.ts`'s name-to-id rule (#1623) makes the
choice carry an id: `Breadcrumbs.Item` fails it against `breadcrumb-item`, so that spelling also renames
the set ids (and so the Figma set names, through a `def` entry). That is a new naming call, asked on #3554.
