## (2026-11-01) — Usage panels: the anatomy legend numbers each instance, and a run covers neighbors alike on the specimen (#3265)

**Status:** plugin, built as the owner decided (Q3265.1 A, Q3265.2 A). The wording is DRAFT under Q10. ENGINE patch
(change note): no committed artifact, emission or component surface moves. `doc-panel.ts` is outside the component
executor's reach, so `EXECUTOR_REVISION` stays (`lint-executor-revision` agrees).

### What it does

- **Numbered instances.** `anatomyMarks` (`apps/plugin/src/doc-panel.ts`) used to merge numbered sibling parts by their
  whole `nesting`, wherever they stood, and label the group "Item ×4" with its first member's caption. Now each
  instance keeps its number, and only NEIGHBORS that look the same on the specimen make one entry, a run. "The same on
  the specimen" is the variant each nest resolves to on the default member (the fixed variant, then `variantWhen`,
  `variantWhere` and `follow`, as `anatomy-figma.ts` resolves it), never its `variantWhen` for other members.
- **Labels and captions** (`anatomyEntry`): one instance reads "Cell 4" and keeps its own note; a run reads "Cells 1–6"
  (en dash) and takes its parts' shared note, or else the nested component's summary, so a caption is true of every part
  it covers. The name is the def's part key through `partName`, never a layer's name.
- What the template's usage guides read after the next Update: Code input "Cells 1–6" (one entry; its cells differ only
  at the focus states, and the specimen rests); Pagination Item 1 to Item 7, each with its own note, so Item 4 says
  "Page 5, the current page"; Tabs "Tab 1" then "Tabs 2–3"; Breadcrumbs "Items 1–2" then "Item 3"; Segmented control
  "Segment 1" then "Segments 2–3". Pagination's legend grows from 12 entries to 16.
- The marker draw is unchanged: an entry's marker stands on its first part. A panel printed before `printView` still
  reads as Prism3's own text: `writtenTexts` keeps the labels of the merge before this change (`labelsBefore3265`).

### Verification

- `test-doc-panel.ts`: `legend/code-input`, `legend/pagination`, `legend/tabs` and `legend/breadcrumbs` hold each
  legend, label and caption, against lines typed by hand from the defs. `legend/every def` holds, over every def, that
  no label is a word glued to its number or carries "×", and that each repeat's entries cover its numbered parts once,
  in order. The `marks/` pins move to the new runs, and the markers oracle reads "Cells a–b" and "Cell n" back to the
  def's parts by their part names. `anatomy/captions` accepts a run's part captioned by the run.
- Mutations, each after a `wip:` commit, each failing by name: the merge before this change restored → the legend and
  marks arms; `variantWhen` back in the run key → `legend/code-input`; a run keeping its first part's note →
  `legend/tabs`.
- Re-scan the template's usage guides after the next template Update.
