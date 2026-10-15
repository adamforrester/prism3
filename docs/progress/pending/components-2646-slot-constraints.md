## (2026-10-14) — Native slot constraints: min and max children, preferred components, written on Build and Update (#2646)

Owner decision Q306.1 A. Figma's native slots carry constraints on their SLOT property since plugin typings 1.141
(`slotSettings`, `preferredValues`), and Prism3's slots (#2417) set none. Now a `contentSlot` part can declare them, both
executors write them, and the read-back and the round-trip read them back.

**The shape.** `slotSettings` takes four of Figma's five fields: `minChildren`, `maxChildren`, `allowPreferredValuesOnly`,
`displayEmptyByDefault`. `stretchChildOnInsert` is left out because no def needs it, and the validator refuses it by
name so adding it later is a decision. `preferred` is a list of def ids, not keys: the key only exists once the
preferred set is built in a file. The validator works without the registry, so it checks shape: the fields are on a
native slot, the counts are whole numbers, min is not above max, max is not 0, preferred-only has something preferred,
and the preferred list has no duplicate. The registry check is in the projection (`slotPreferredOf`, which throws like
`nestedSwapTarget` does). A preferred id has to be a def that builds one set or one component under its own id. That
rules out a building block (`_`, which a published library leaves out), a def refused alone, and a def that emits
standalone components (Icon, Spinner), whose members have no one key.

**Writing it.** Both executors write after the property phase with `editComponentProperty(key, { slotSettings,
preferredValues })`. `editComponentProperty` is the only route: Figma refuses to add a SLOT property without a default,
so the property only exists once the combine has merged the slot nodes. Each preferred id resolves to the key of the
set built under its name, found fresh at write time. A preferred def not in the file is a named miss (`property
dismiss.preferred -> badge (not in this file — build badge first …)`) and is not prebuilt. A dependency has to be built
for the set to work, and a preferred set does not, so building it unasked would be a surprise. A preferred-only slot
with none of its preferred sets in the file is written OPEN, with its own miss, because preferred-only with an empty
list flags every child a designer adds. The plugin's Update also writes a slot whose def dropped its constraints back
to Figma's defaults (the `hostHas` arm). The paste payload ships its pass only when a set declares constraints (the
`MIN_LINES_SLOT` budget rule), so a re-paste does not clear old constraints. That gap is stated on
`PAYLOAD_SLOT_SETTINGS`.

**Reading it back.** The constraints live on the set's property, not on the slot node, so the two new read-back
predicates (`slotSettings`, `slotPreferred`) walk up from the node to the set and read the property it references. Keys
are named through a new optional port, `componentName`, built from the host's own catalog and never from the plan. A
reader without the port reports a slot that prefers something as UNREADABLE instead of passing it.
`test:roundtrip` gains one test-only row, `tag@slot-constraints`, and asserts both predicates compared something.
Without it they would sit at zero: no committed def constrains a slot yet.

**The shim models what the typings promise, not what a host was measured to do.** `editComponentProperty` takes
`slotSettings` on a SLOT only and `preferredValues` on a SLOT or INSTANCE_SWAP, and a SLOT node reports
`limitViolations` from its own children. None of this has been probed on a real host. A host that refuses the edit is
named (`REFUSED`), and one that takes it and keeps something else is named too (`NOT KEPT`), but whether Figma keeps
`minChildren: null` as "no limit" is unmeasured. That is the first thing to check on a real file.

**The corpus has one native slot, and it stays open.** Only Accordion's panel (`content`) is a native slot. List's items
are eight fixed nested instances behind toggles, not a slot, and Tabs draws no panel. So the proposed "List: only List
item, at least 1" has nowhere to go without turning List's column into a slot, which changes how a designer adds items.
That is a composition call, so it is held for the owner, with a DRAFT note in each def. `test-slot-constraints.ts`
holds a literal row per slot and fails on a slot with no row. Dialog's body (#2609) and Password field (#2317) are being
built in parallel and each needs a row when it lands.

**EXECUTOR_REVISION 22.** Main is 20 and #2648 claims 21, so this takes 22. The typings bump brings the read-side widening
#2635 also makes (`VarType`, `ReadVarValue` with TIMING and EASING values), in the same words, so whichever lands second
gets an identical hunk.

Mutations, each failing by name: Accordion's slot given `minChildren: 1` → `corpus/accordion.content`; min above max in
the def → `corpus/accordion.content` plus registry validation, and the rule dropped → `#2646 validator: min above max`; an
unknown preferred id in the def → `corpus/projects`, and the registry check dropped → `#2646 projection: an unknown
preferred def`; the preferred list dropped from the write → `constraints/written`, `constraints/read back`, and the
round-trip's `every def round-trips — tag@slot-constraints (15)`; the missing-preferred miss dropped → `constraints/missing
preferred named`; the Update clear dropped → `constraints/cleared on update`; the paste pass not shipped → `#2646 paste:
the payload writes …`.
