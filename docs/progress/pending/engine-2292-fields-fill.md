## (2026-10-07) — Fields: text-field, select and textarea fill their column when placed FILL (#2292)

**Status:** engine + plugin shim + tests. ENGINE minor (change note `engine-2292-fields-fill.md`), CONTRACT unchanged
(no token name moves). The three field sets' projected surfaces move (`component-surface.json` accepted). No size, no
floor value and no visual change: an unplaced field reads at 320 exactly as before.

### The defect

A design-rebuild test placed attached `text-field`, `select` and `textarea` instances in a 505px form column and set
them to fill it. The label and message spanned 505; the bordered input box stopped at 320. This was deliberate in
`fillsAxis`: the control held the field's 320 floor (`minWidth`, #1343/#1518) and its parent column hugged, so filling
it from that column would be circular. It kept hugging, and nothing a host did to the instance reached it.

### The diagnosis that made the fix small

The #1757 `placementWidth` mechanism already solves the circularity for field-label and field-message: the root is
BUILT at a width (FIXED across) until a host's stretch overrides it. The validator's `boundsX` already counted such a
root as bounded; the projector's `fillsAxis` did not, because no root with a placement width had a floored child.
So the fix is two lines of substance:

- `fillsAxis` treats a root built at its `placementWidth` as bounded on x (parity with `boundsX`);
- each field's root declares `placementWidth: 320`.

The control then fills: FIXED along its row, with the column's STRETCH as the supplier (textarea's through `body`,
which stretches too). It keeps `minWidth: 320`, so the floor holds; Figma keeps a min width under a fill. All three
executors (the plugin writer, the paste twin, and `mcp-steps`, which runs the paste payloads) already write
`placementWidth`, FIXED modes and `layoutAlign` generically, so none changed. The readback already checks the root's
measured width against `placementWidth`.

### Tradeoff, deliberate

The 320 floor stays on the control. Moving it to the root (or dropping it, which is Prism 2's geometry: root 320,
inner containers FILL, no floor) would let a field shrink below 320 in a narrow column. That is a design decision,
held for the owner, and it is #1345's remaining item, so this PR does not close #1345.

### The shim, and two things it now models

- **A filled node keeps its floor** (`component-shim.ts` `fillWidth`): until now no floored part filled, so a fill
  that ignored the floor could not be seen. Measured: in a 280px column the box stays 320.
- **A FIXED frame keeps its floor** (`naturalWidth`): the control is FIXED from its own layout write and is built
  before its parent stretches it. Textarea's corner grip is placed off that width, and read 89 (100 − 11, the
  `createFrame` default) instead of 309 until the shim honored the floor the host honors.

The engine `figmaStub` models no fill (it reads sizing modes, not stretched geometry), so the measured stretch lives in
`test:roundtrip`. The engine side pins the plan and both executors' modes (the #1751 parity floors).

### Tests

- `test:roundtrip` `#2292 <field> fills its column`: an instance of every member is appended to a 505px auto-layout
  column and set to fill it (STRETCH plus the instance's FIXED width). The input box, label and message (textarea:
  message row) read 505. The unplaced member reads 320 (root and box), and in a 280px column the box keeps 320.
- `test.ts` `#2292 <field>`: on every member the root is built at 320 and the control FILLS it, keeping its floor.
- The #1751 parity floors now name each field's control (and textarea's `body`) FIXED with STRETCH, and each root
  w:320, on both executors.
- Rewritten because the old shape is gone: `#1345 select control FLEXES` (was AUTO; now FILLS a root built at 320),
  `#1757 select's wrapping value` (the control is now bounded twice, by its floor and the root's build width, so only
  removing both refuses), and textarea's `'grow' under a row` refusal (the mutation now hugs the row as well).
- `#1757`/`#1762` nested-wrap arms widened the field by raising the control's floor. The control now fills a FIXED
  root, so they widen the root (a designer's resize) instead.

### Mutations (after a `wip:` commit each, restored with `git checkout -- <file>`)

1. Restore the control's hugging (drop the root-`placementWidth` clause from `fillsAxis`):
   `✗ #2292 text-field fills its column: … (24 members, 24 off — status=default, state=rest: unplaced root/control 320/320; in a 505 column instance/control/label/message 505/320/505/505; in 280, control 320)`,
   the same for select and textarea, plus `❌ #2292 <field>: … control primary AUTO, layoutAlign undefined` and the
   three parity floors in `test.ts`.
2. Break `placementWidth` (the projection stops carrying it to the plan):
   `✗ #2292 text-field fills its column: … unplaced root/control 100/320; …`, the same for select and textarea, plus
   `❌ #2292 <field>: … root placementWidth undefined`.

### A trap for whoever re-verifies this

The first run of mutation 2 left text-field and select green. The `#1757` widening arms restored each member to a
literal 320 after widening it, so they rebuilt the very width the mutation removed, for every block after them. They
now restore the width they measured.

### Still open

- **Live host:** a nested-instance stretch on a real Figma host (a field set to FILL inside a column, the box at the
  column's width), and textarea's corner grip following the box via its MAX constraints.
- **Sequencing (#2265):** this changes component sets, so the client file's field sets should not be rebuilt until
  its baseline is captured.
- `fillsAxis`'s sibling-carrier arm (a part filling a hugging parent's cross axis because a sibling holds the floor)
  now has no consumer among the shipped defs, so deleting it fails no gate: filed as #2294.
