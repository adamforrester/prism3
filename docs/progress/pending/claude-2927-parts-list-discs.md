## (2026-11-18) — The anatomy parts list draws its marker's disc (#2927, owner decision Q2927-R1 A)

**What.** Each entry in the usage panel's anatomy parts list is now a row: the same filled #9747FF disc as its
specimen marker, then the entry's Field block. The label no longer starts with the number ("Caret", not "3  Caret"), so
the list and the specimen read their number from one drawing. This is what was left of #2927's P2 once #3773 B
replaced the Badge markers with discs. `PANEL_FORMAT` 8 → 9, so each drawn panel is due once on the next Update.

**One disc, not two.** `drawMarkers`' disc and its numeral face (`markFace`) moved up to `drawDocPanel`'s scope, and
both the markers and the parts list call it. There is no second disc drawing to drift. The plan carries the number as
`n` on the anatomy's `Field` blocks, so the label and the disc come from the same mark.

**Repeats.** A run (`Tabs 2–3`, `Cells 1–6`, #3265 / #3292) is one mark, one marker on the specimen and one entry, so it
draws one disc. The range stays in the label: it counts instances, the disc counts entries.

**Old panels.** `writtenTexts` still knows each entry's numbered form (`3  Caret`), so a panel printed before
`printView` and drawn before this change still reads as Prism3's own text. The legacy test now swaps the drawn
unnumbered labels for their pre-#3265 forms.

**Tests.** `parts list/…` in `test-doc-panel.ts`: over every lead, each entry is a row led by a disc, no label starts
with a number, each entry's disc looks exactly like its specimen marker, and the typed look is #9747FF, 20 across, a
white numeral at the entry's place. Tabs' and Code input's repeats are typed by hand. The test helpers that read the
list (`listedNumbers`, the markers oracle's `labelOf`) now read the disc's numeral, not the label.

**Held for the owner.** The 8px gap between disc and label (`ENTRY_GAP`) and the disc's top alignment with the label are
placeholders, to be looked at in the copy-file QA (#3928 part 2). The spec panel's anatomy still writes `3  Name` labels.
It is a separate surface and was not part of Q2927-R1.
