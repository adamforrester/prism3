## (2026-10-14) — Dialog: one panel, centered, as a bottom sheet or full screen, its backdrop drawn as canvas furniture (#2609, Q303)

Built to the proposal on #2609 as the owner decided it in Q303: one `Dialog` with a `placement` axis, `center | bottom |
full`, and **no side or drawer placement**. 15 members: center at three sizes (`medium | small | large`, 560 / 400 /
720px) × three footers (`inline | stacked | none`), and bottom and full at the default size only. No state axis.
Category `overlay`, aliases `modal`, `sheet`, `bottom-sheet`, `full-screen-dialog`, on its own `↳ Dialog` page. Cites
the knowledge base's `components/dialog.md` (category Overlay), read for this build.

### Measured first: can a set miss coordinates?

Yes. `figmaProperties.excludeCoordinates` (Badge's, then Button's flush) already removes coordinates from the cross
product, and it refuses only a removal that takes the set's default member or a whole axis value. Removing
`{ placement: [bottom, full], size: [small, large] }` leaves 15 members, and every count gate (`figmaVariantCount`'s
inclusion–exclusion) agrees. A bottom or full member's name still carries `size=medium`, the code default, so an
instance switched from center keeps a valid coordinate.

### What the construction is

- **The panel** is the root: `color.foreground.primary`, the `shadow.xl` effect style, padding top and bottom only
  (`space.300` centered, `space.200` on the two small-screen placements), a 16px gap. The header, body and footer pad
  their own sides, so the two dividers run edge to edge.
- **The size per placement** is a new root field, `PartDef.builtSize`: at each placement the root is built at that
  width (400 / 560 / 720 per size at center, 360 at bottom and full), and at full also at a height (640) with the body
  growing down the column so the footer sits at the bottom. The height needs a plan field the executors did not have,
  `placementHeight`, written in the same resize as `placementWidth` by both executors and read back. That is why
  `EXECUTOR_REVISION` moves, 20 → 21.
- **Corners per placement** bind top and bottom apart through `PartDef.radiusEdges`: center `radius.2xl` all round,
  bottom its top two, full none. The executors already bind each corner by name, so this is projector-only.
- **The shadow** is `PartDef.elevation`, a binding key resolved to an effect style name (`shadow.xl` → `shadow/xl`). The
  plan field and both executors' effect-style writes existed with nothing projecting them; this is their first user.
- **The header** is the accordion's title row: the title (wraps) and the description (off) in a column that grows
  beside the close button, top-aligned. The close is a nested IconButton.Neutral, ghost, medium, square, at rest.
- **The body** is a native slot, as the accordion's panel is, with a placeholder paragraph.
- **The footers** are two parts gated on `footer`, because node order is fixed per set: inline is Cancel (outline) then
  Save (filled) 12px apart at the end edge; stacked is Save over Cancel, full width, 8px apart.
- **One `dividers` toggle drives two rules.** The validator refused a boolean whose parts build in the same member, as
  "two affordances wearing one switch". The two rules are one affordance, so a boolean entry can now say `together`,
  which lifts that one refusal for that entry only; one part with the flag is refused.

### The backdrop is canvas furniture

The scrim is never a node of the set (Q303.2 A, Q303.3 A). File setup now builds a third template, `_scrim-backdrop`,
a square component whose fill binds `color/scrim/default` (black at 40% until a theme is applied). After a Dialog set
lands, the plugin places one instance behind each center and bottom member: 12px all round a centered panel, 12px
above a bottom sheet and flush on its other sides, none behind full (it has no visible backdrop, Q303.8). 12 is half
the grid's 24px gap, so no scrim reaches a neighboring member. A file without the template draws none and the run says
so once, in the existing missing-template line.

### Technical calls, and why

- **The title is `type.label.lg.emphasis`, not the drafted `type.title.sm.strong`.** The nb-redesign example emits
  titles at one weight (`subtle`) only, so `title.sm.strong` missed at build time (`test.ts` #1601). The accordion's
  title met the same gap the same way. Held for the owner.
- **Size order is medium, small, large in Figma** (the proposal's table, default first), with the code enum on the
  ladder, the fields' split. Dialog joins the Q221 B exception list and `lint-rung-names` DEFAULT_FIRST.
- **`lint-rung-names` gains `SIZE_BY_BUILT_WIDTH`.** Dialog's size binds no token (the widths are def-level literals by
  Q303.5 A), so the gate checks what the size does reach: a per-size width map naming exactly the three sizes, rising.
- **Hit target:** Dialog is excluded with its reason. The panel is not a pointer target; its close and footer buttons
  are IconButton.Neutral and Button, measured under their own names.

### Not done, and filed

- **The nested close shows the file's default icon, and the nested buttons read "Button".** Showing `close` and
  "Cancel" / "Save" needs a per-instance override on a nested instance (a swap and a text), which no def can ask for
  and neither executor writes. The List's ordered numbers need the same thing. Filed as #2645.

### Traps

- A def file the gates read from git (`lint-axis-values`, `typecheck-components`) is invisible to them until it is
  staged, as the List lane found.
- `title.sm.strong` resolves in four corpus brands and misses in the fifth; only `test.ts` #1601 sees it.

**After merging the slot-constraints work (#2646).** `test-slot-constraints.ts` requires a constraints decision for every native slot, and Dialog's body is the second one. Its row is `{}`: open, no limit and no preferred component, the same as the accordion's panel and the same as the def as built. Like every row there, it is a draft owner item. The footer's actions stay fixed nested Buttons (Q311), so they have no row until the items-slot follow-up.
