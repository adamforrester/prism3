## (2026-10-23) — Usage panels QA round 1: titles, Do/Don't spacing, Related as linked lists (#2970)

The decided items of the owner's first QA round on usage panels (items 2, 3 and 5 of #2970). Items 1 (wide specimens)
and 4 (a family documented as one component) are wireframed on the issue and held for the owner's answers.

- **Titles (item 5).** The panel title is 18px and each section title 16px, written over the `_Doc-block` Heading's
  text style, whose face and `title/…/strong` weight stay. Letter-spacing matches the studio: its 20px page titles use
  `--p3-ls-tightest` (−4%) and its 16px section titles `--p3-ls-tighter` (−3%), both from the default theme's
  `LETTER_SPACINGS`. So the panel title takes −4% and section titles −3%.
- **Do and Don't (item 2).** The block's own `Top padding` toggle is turned on: 16px over the section's 8px gap. Using
  the template's toggle means files whose `_Doc-block` already exists get the space without a template rebuild.
- **Related (item 3).** Each list is one Field block: the label, then one line per name as an `UNORDERED` text list.
  A name whose component has a set in the file is a `NODE` hyperlink to it, underlined; the set is found the way the
  executor finds it, by its exact name, and a name with none (or with two) stays plain. Replaces entries are plain.
- **Links stay current.** The plan holds def ids, not node ids, so a link target can change with no plan change. The
  panel records the sets it linked (`docPanelLinks`) and `docPanelDue` compares them, so a related set built later
  makes the panel due on the next update, which then links it.
- `PANEL_FORMAT` goes to 3, so every drawn panel redraws once with the new layout.

Built on `main` while #2969 (legacy panel prints) is still open; both touch `doc-panel.ts`, so the second to merge
takes a merge.
