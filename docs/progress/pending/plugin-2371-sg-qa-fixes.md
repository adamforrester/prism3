## (2026-10-08) — Style guides, owner QA of a real brand file: no overlap on a mixed re-run, no type-sets font-size table, font weight split, no fill on the outer frame, family specimens in a face they have (#2371)

Five items from the owner's full run on a real brand file, after #2330 and #2336. One PR, plugin only
(`apps/plugin/src/style-guide.ts`); no engine file moves.

### 1. A new table drawn over an existing one on a mixed re-run

**The diagnosis.** A filtered run (the Build style guides page sends a `tables` filter whenever not every
table is picked) does not re-flow. Instead it moves each table by how much the tables before it in its row
changed, counted from their size *before* the run. A new table, though, was placed at the end of its row as
the row stood *when it was created*. Any table updated earlier in the same run was already at its new size,
so its change was counted twice: once in where the new table went, and again when the re-flow moved it.
Widening only left an extra gap. Narrowing pulled the new table back over the tables before it. A row
above that got shorter pulled a new category's row up into it. #2336 removed every table's 2px gaps, so
on the owner's first run after it every existing table was narrower. The same shape applies vertically.

**The fix.** A new table's place is measured from each existing table's size before the run, which is
the baseline the re-flow's deltas assume (`sizeBefore` in `runStyleGuide`). Tables created earlier in the
same run count at their size, since the re-flow gives them no delta. An unfiltered run re-flows every row
anyway and was never affected.

**Reproduced first.** The shim gave `Dimension 0,0 381 wide × Density 320,0`: Density was moved 221px
left over the narrowed Dimension. After the fix it sits at 541, 160px after it.

**Not fixed, raised on #2371 instead:** an unfiltered run re-flows the generator's tables and leaves a
table a designer moved where it is. So a re-flowed row can land on that moved table (in the shim:
Dimension nudged 10px, then Density and Font family laid over it). Where tables should go around a
designer's table is a layout decision.

### 2. No "Font size (type-sets)" table (Q133 A)

The planner drops the font-size table of the text styles' **responsive collection**. That is the
multi-mode collection holding most of their bound sizes, the one the Text styles table already takes
its modes from (`responsiveCollection`, factored out of `planTextStyles`). The drop happens before titles
are made unique, so the primitives' table reads "Font size" again, not "Font size (core)". An earlier
run's type-sets table is superseded and deleted when unedited. The Build style guides page lists the 21
sizes under Text styles, not as "Later phase".

### 3. Font weight split (Q133 A)

A font-weight table that holds both literals and aliases now splits. The raw weights go to Primitive
tokens, in the font row beside family and size; the roles stay on Semantic tokens. The split is for font
weight only, as decided. Other font kinds and dimensions keep the one-table rule. The roles' title,
"Font weight roles", is a **draft** for the owner: the two tables need different titles, and the
title-uniqueness rule only appends a collection, which is the same here.

### 4. No fill on the outer frame

The wrap (title, description, rule) is `fills = []` on every run. The table frame and every cell keep
#FFFFFF and the #E0E0E0 grid. The shim's `createFrame` now returns a white frame, as Figma's does.
Without that, deleting the line passed in the shim while leaving a white wrap live.

### 5. Family specimens in a face the family has

A family specimen was bound in the text cell's own style, Regular, so a family whose only face is
Light Condensed failed: "Regular unavailable", unbound. It now first takes a face that loads, in this
order: the face of a text style bound to that family variable (the role's own face), any text style's
face in the family, the cell's style, then the first style `listAvailableFontsAsync` gives for the
family. It then sets the text to that face and binds the family variable. A face tried and not loaded
is not a miss. The brand input's `typography.faces` is not reachable from the style-guide run, and the
owner's file has no saved brand, so the file's own text styles stand in for it.

**Visible side effect:** prism3's display and title family specimens now show Playfair Display Medium
Italic, their roles' face, and label and eyebrow show Inter Medium. A family that has Regular but whose
text styles use another face shows that face.

### Trap for whoever re-verifies

The suite's section 33 holds all five. Its mutations ran on a committed head, each restored from a saved
copy (never `git checkout -- <path>`).
