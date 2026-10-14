## (2026-10-14) — Canvas furniture: a set moved to another page or into a frame takes its labels and backdrop with it on the next Build or Update (#2485, build half)

**What was wrong.** Furniture (`_Label` instances and the `_inverse-backdrop`) is drawn on the set's parent and
tagged with its def and set id. Before drawing, `drawFurniture` cleared the def's furniture on that parent only. When
a designer moved a set to another page, the next Build or Update drew it fresh on the new page and left the old copy
on the old one, with no set beside it.

**The fix.** `clearMovedFurniture` (`canvas-furniture.ts`) runs inside `drawFurniture` beside `clearFurniture`. It
finds every tagged instance file-wide by the tag (`findAllWithCriteria` with `sharedPluginData`, the same root search
the template lookup already makes, so the pages are already loaded), and removes those carrying **this set's id** on
any parent but the one being drawn on. Matching is by set id, never def: a second set of the same def keeps its
furniture, and an untagged node (a hand-placed `inverse-bg`, Q172.5) never matches. The build and the Update both
reach it through `furnishSet`, which already passes `figma`, so `main.ts` doesn't change.

**Held: the prune half.** The issue also asks prune to treat furniture off its set's parent as stale. Prune's
sentence reads "left from a set no longer in this file", which is wrong for a set that moved, so it needs new
wording, and that's the owner's call. The owner picked one sentence for both causes (Q294, option A); that lands as its own PR, and this one leaves prune as is.

**A trap for re-verifying.** A mutation that drops the `c.parent === parent` skip passes every arm. That's not a gap:
`clearFurniture` runs first and has already removed the set's furniture on its own parent, so the skip only saves a
second look at removed nodes.

**Tests.** `test-canvas-furniture.ts` `moved/…`: Button is furnished on one page, moved to a second, then into a frame,
and redrawn each time. Mutations are in the PR.

**The frame arm tested no frame (review).** Its fixture was `{ ...makePage('frame'), type: 'FRAME' }`. The spread
copies `appendChild`, which closes over the inner page, so `frame.appendChild(set)` parented the set to a third
PAGE-typed object, and the arm passed because the set had simply moved page again. A clear that skipped frames
(`if (parent.type !== 'PAGE') return 0`) passed every arm. The frame now has its own closures, and the arm also
asserts the set's parent is the frame. Mutations: that skip → `✗ moved/into a frame: … (in the frame: true; ↳ B 42,
frame 42, cleared 0)`; the spread fixture restored → `✗ moved/into a frame: … (in the frame: false; …)`.
