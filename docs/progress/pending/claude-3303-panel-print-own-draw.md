## (2026-11-02) — Update redraws a usage panel nobody touched in place, the components it nests rebuilt (#3303)

**What was wrong.** A print was already recorded at draw time (`docPanelPrint`, the second form, #2927). Update did
not compare a panel against what the new engine would draw: it compared the panel against that recorded print. But the
print read every layer inside the panel's instances, including the `_Doc-block` blocks, the List.Item rows, the Badge
chips and the markers. Each of those layers takes its fills, padding, fonts, names, structure and default text from its
**main component**, and Update rebuilds those components. So once one of them changed, an untouched panel printed
differently, and Update kept it as "… (edited)" below a fresh panel. That is the 23 sets in the template on 2026-11-02.
The test hosts didn't catch it because their instances were copies, and nothing inherited from a main.

**The fix (`apps/plugin/src/doc-panel.ts`).** The print has a third form. Every frame and text that belongs to the panel
itself is read as before (`printView`). An instance is read only through what it sets itself, Figma's
`InstanceNode.overrides`: each layer that overrides something, flat and in order, with the names of the fields it
overrides and only those fields' values. Prism3's draw writes text, properties, visibility and sizing, and those are
overrides, so they are stable. A designer's later change is an override too, so it moves the print. Inherited values,
a layer the main adds or drops, and a property left at its default stay out. Size and placement fields stay out, as
`printView` leaves them out of a frame. A Specimen swap reads by type only, since its value is a member's id, which is
the set's. A host that reports no `overrides` on an instance has it read whole, which is the safe direction.
`printMatches` compares a print in the form it was recorded in, and spec panels use it too (`spec-panel.ts`).

**The safe rule for panels drawn before this change** (second-form prints). A panel is compared in its own form. It is
replaced while it still matches, and kept, as before, once a component it nests changes. The second form can't tell a
rebuild from a hand edit, so this rule never draws over a designer's change. It costs one more round of "(edited)"
copies for any such panel whose nested components change before its next redraw. After that redraw, a panel carries
the third form. A looser rule, read by text and by overrides the way #2968 reads first-form prints, would remove that
round. It is lossy, though, for edits to the panel's own frames, so it's left to the owner (flagged on #3303).

**Tests (`apps/plugin/test-doc-panel.ts`, `own draw/…`).** The suite's host now models instances as Figma does, for
these arms. Each layer of a block holds an inherited value and an override, writes are overrides, and `overrides` lists
them. `mainMoves` changes the inherited values (fills, padding, radius, font size, template text), adds a layer to each
block's main and repoints the swap. Tag is built by the executor, its panel is drawn, then engine N+1 makes it due and
rebuilds what it nests. One Update, run as `main.ts` runs it on a host and root whose methods are fixed
(`fixHostMethods`, #3295 not yet merged), gives:
- `untouched`: one panel, in place, with no "(edited)" copy;
- `text edit`, `fill edit`, `hidden layer`: kept aside;
- `v2 unchanged`: replaced;
- `v2 rebuilt`: kept, per the safe rule.

**Mutations,** each committed `wip:` first:
- the print read whole again (`printView` in `panelPrint`) → `own draw/untouched` fails with the template's symptom,
  "Tag usage (edited) | Tag usage";
- overrides ignored → `own draw/text edit`, `fill edit` and `hidden layer` fail;
- a second-form print read in the third form → `own draw/v2 unchanged` fails.

**Not done.** The template's 23 spurious copies are the owner's to clean up. Nothing in any Figma file was touched.
Real-host confirmation that `overrides` reports what this reads is owed: the agent link's `inspect` can read it on a
drawn panel.
