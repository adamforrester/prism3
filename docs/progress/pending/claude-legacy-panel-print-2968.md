## (2026-10-23) — Usage panels drawn before phase 1 are replaced, not kept as "(edited)" (#2968)

**The bug.** On the owner's copy of the library file, the first Update after panels phase 1 (#2932) kept 42 older
panels aside as "… usage (edited)", each below a fresh one, though nobody had touched them. On Buttons, the members'
old panels stayed in place.

**The cause.** #2932 moved the panel's print to `printView`, which leaves out a specimen's content and every size, so a
rebuilt set no longer reads as a hand edit. A print recorded before that change was still compared whole. That print
covered the specimens, so after any rebuild it could never match, and every such panel read as edited.

**The fix.** A hash cannot say what moved, so an old print that no longer matches is set aside. The panel is read by
its text instead (`legacyUnedited` in `doc-panel.ts`). It is unedited when every text it shows outside its specimens
is one Prism3 writes there (`writtenTexts`): the def's plan in today's wording, the wording before #2932 (each
part's own anatomy line and caption, the def's own Do and Don't items and their count line), a chip row's "+n more",
the family line, a further specimen's "Shown on …" caption, a marker's number, or a text the file's `_Doc-block`
template holds. An unedited panel is replaced in place, and a family member's old panel is removed. A line a
designer typed or rewrote still keeps the panel aside.

**Checked against the old code.** In a scratch run (not committed), the pre-#2932 `drawDocPanel` drew a panel for each
of the 50 defs that build a set. Each panel got an old-form print, then its specimens were rebuilt. Every one reads
unedited. Before the old per-part captions were added, 7 did not (Checkbox.Group, Radio.Group, Tabs, List,
Segmented control, Breadcrumbs, Code input). The same run took the Buttons page through `previewUpdate` and
`applyUpdate`: the lead's panel is drawn, and 4 old panels are replaced, 0 kept.

**The test** (`test-doc-panel.ts`, `legacy/…`): Tag's old-print panel under a rebuilt set is replaced (1 replaced, 0
kept, 1 panel). With a line rewritten it is kept as "Tag usage (edited)". On Buttons, the lead's old panel and the
three members' are replaced (4 replaced, 0 kept, one "Button usage" panel). With Button.Neutral's lede rewritten,
3 are replaced and 1 is kept as "Button.Neutral usage (edited)". `family/kept` now edits its synthetic group panel's
text, because an old print alone no longer reads as an edit. The shim's `_Doc-block` variants now hold their layers,
as a file's do.

**What the text check cannot see.** On an old-print panel, a changed fill, a hidden layer or a deleted one is not
read, because the old print cannot tell those from the rebuild. A def whose docs changed since its panel was drawn
reads as edited, which is the safe direction. Panels drawn since #2932 carry the new print and are unaffected.
