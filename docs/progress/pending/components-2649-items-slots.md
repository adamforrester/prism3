## (2026-10-14) — Repeating items as a native items slot: Checkbox group, Radio group, Tabs, List, Segmented control (#2649, Q307 A)

The five components that held their repeating children as a fixed stack behind Figma-only visibility booleans (#2344,
the "hidden nested instances" pattern Nathan Curtis names) now hold them in a native Figma slot, `items` (#2417's
`contentSlot`). Three items by default; Tabs and Segmented control with the first selected, as before. The row
booleans are gone. Header, label, description and message stay outside the slot, and Segmented control keeps its
`Label` toggle. Every other axis and token is unchanged, held by the rewritten literal arms in `test.ts`.

### The shape per component

- **Checkbox group, Radio group, List:** a new `items` box under the root (a column, `crossAxisFill`), holding the rows.
  The groups' gap is 0 and List's item gap moved onto the slot; the root keeps its own gap binding, so no token moved.
- **Tabs:** the `list` frame became the `items` slot (same layout, renamed).
- **Segmented control:** the `track` stays (it carries the border, radius and padding), and an `items` slot grows
  inside it, so the segments still grow along a bounded main axis and share the track equally (Q269.6). The segments
  were `nest-exposed` (`selection`, `state`); in the slot they are `nest-fixed`. Figma refuses a property reference on
  a slot sublayer (measured for text in #2417), and a designer now sets a segment's selection on the segment itself.
  Not measured for exposure on a real host: an owner item.

### In code: Curtis's spec shape

`PropDef` gained `anyOf`, `minItems` and `maxItems` for a `type: 'slot'` prop that is a children array. Each of the
five carries `items` (`anyOf` the item def, `minItems` 1, `maxItems` 6 for Tabs per Q179 and 5 for Segmented control
per its two-to-five rule). List's `children` prop became `items`; `children` stays the name for open content
(Accordion's panel). Button's `leadingVisual` was already `type: 'slot'` (a single instance swap), so the validator
asks for `anyOf` and `minItems` only once a slot prop declares any of the three. Emitted in `components.ai.json` and
the docs pages' Props table ("slot of `tab`, 1 to 6").

### The update carries placed instances across (`apps/plugin/src/slot-migration.ts`)

Figma carries nothing from the old rows to the new slot: the rows' layers are removed from the member, every override
on them goes with them, and each placed instance would fall back to three default items. So the update does it:

- **Capture, before the set is touched.** Every instance of a member (`getInstancesAsync`), its VISIBLE rows in the
  ledger's order, each row's variant, its own property values (the label) and its exposed instances' values (the
  checked state). Hidden rows are listed and left out: never resurrected.
- **Fill, after.** The slot's default items removed, one new instance per captured row made from the row's own
  variant, `setProperties` for its values, the default items' layout copied (stretch, grow). Read back: count, order,
  variant, every value; `limitViolations` named.
- **Never silent.** An override no component property carries (read off `InstanceNode.overrides` against each layer's
  `componentPropertyReferences`), an override on a layer the plan drops (Tabs' `list`), an instance inside another
  instance (it follows its holder), and a host that does not list overrides are each a named line, in the dry run and
  in the verdict. The capture is in the set's `previewHash`, so an instance edited between the check and the confirm
  refuses the apply.
- **What drives it is the ledger.** `COMPONENT_RENAMES` gained a `slot` entry kind: the slot, the layer that held the
  rows, the row layers in order and the removed booleans. `lint-component-renames.ts` now records every set's
  component properties in `component-axes.json` and demands a claim (a slot entry or a `property` drop) for any that
  leaves. Its base predates the field, so this PR's own removals are a BOOTSTRAP for that arm; `test.ts` drives it on
  hand-built baselines (the slot entry claims its booleans; without it each is named), and holds the five real entries
  as literals. `lint-component-surface.ts` now names each def's properties in its baseline, so a removed boolean or an
  added slot shows in the baseline's own diff.

### Verified on the shim, and what is not measured

`test-slot-migration.ts` builds each set the OLD way from a legacy fixture (today's def with the slot taken back out,
the booleans typed from #2344 and Q179), places designers' instances, and runs `previewUpdate` then `applyUpdate`
exactly as `main.ts` does. A Checkbox group with five visible rows (row 3 hidden by hand) becomes five items in order,
each with its label and checked state; Tabs keeps four tabs with the third selected; List carries all eight; Segmented
control carries four options, the second selected. The PLACED INSTANCES are a model the test supplies (a live view of
the member, as Figma propagates a main's change), the one thing the shim did not have. `test-native-slots.ts` builds
Tab and Tabs into one file and checks each slot item points at the right Tab member, which carries its own hover and
press reactions (#2466), with none written on the item.

**Not measured on a real host:** children written into a SLOT layer of an INSTANCE through the plugin API, and
`setProperties` on the fresh instances. The first update of the master file is that probe; a refusal there is a miss
by name, never a silent pass. Nor the exposure question above.

### Deliberate choices

- **`EXECUTOR_REVISION` is not raised.** The component executor's code (`write-components.ts` and what it reaches) is
  unchanged; the migration lives in the update. The members re-apply through their plan stamps anyway. A raise would
  mark every member of every set in every file as built by an earlier plugin, with no field difference.
- **Built on #2646.** Its branch appeared while this was in progress, so this branch sits on it (not yet merged) and
  uses its `slotSettings` and `preferred` rather than duplicating them: every `items` slot takes `minChildren` 1,
  `maxChildren` 6 on Tabs and 5 on Segmented control, `preferred` the item def and `allowPreferredValuesOnly`.
  `test-slot-constraints.ts`'s corpus table gained the five rows, and #2646's DRAFT note on List ("no slot to sit
  on") is gone, since List now has one. A carried item that is not the preferred def, or an instance left with no
  visible row, reads as a slot limit (`limitViolations`) in the verdict.
- **A gap in #2646's read-back, closed here because these are its first constrained slots.** The update's dry run
  and its verify read each member as a snapshot, which has no parent, so the read-back could never find the set's SLOT
  property and every constrained slot read as differing forever (`no component set above the slot`). `ReadPorts`
  gained `slotProperty`, which the dry run, Capture and the apply's verify fill from the set's own definitions
  (`withSetSlots`), read only where no set sits above the node. `hostPorts` gained #2646's `componentName` too, which
  it lacked, so a preferred set read UNREADABLE there. Held by `test-update-apply`'s `corpus/in place`: drop the
  fallback and the five sets fail it by name. Also the shim: with `identities` on, a stub component now carries the
  key its instances already read, as a real file's does, so the round-trip resolves a slot's preferred def.
- **`minItems` 1 for Segmented control,** as Q307 A says for all five, although its own rule is two to five. Flagged
  on #2649.
