## (2026-10-11) — Native Figma slots: a content region a designer fills on an instance (#2417)

Accordion's panel holds the designer's own content (owner decision Q182: "a swappable slot … the build checks whether Figma's native slot feature fits better"). It does fit better, measured on a real host. An instance-swap `slot` swaps a whole component the designer must make first, and its target is one placeholder nominated per file. A native slot takes whatever the designer drops into it, in place. So this PR adds native slots to the engine, as its own PR before Accordion (owner's choice, two PRs). No def uses one yet.

- **The schema.** `PartDef.contentSlot: true`, on a `box` with `layout` that is not the root. Its children are the slot's default content. It projects as plan type `CONTENT_SLOT`, and `planSetProperties` records one `SLOT` property per slot name for the read-back.
- **The batch executor** (`write-components.ts`, `toSlots`). The build makes a frame tree first, and `createSlot` is a COMPONENT's method, so each slot is built as a frame and becomes a SLOT right after `createComponentFromNode`, before the combine. The slot takes the frame's place among its siblings and its children, and then has the plan written onto it the way an update writes a plan onto an existing node (`build` with the slot as the node). A parent's per-child fields (`layoutAlign`, `layoutGrow`, `layoutPositioning`) come over from the frame. An in-place update runs the same conversion after the member's build, so a slot the plan gains, or one a type change rebuilt, becomes a SLOT and the member keeps its id.
- **One SLOT property per name.** The combine merges every member's slot of one name into one property, but a slot made on a member already in a set gets a property of its own. So the property phase keeps the first, re-points every slot of that name at it, and deletes the rest. A SLOT property is verified, never added: the host refuses one without a default.
- **The paste executor** (`__slotsNow` in the payload) makes the same conversion. It cannot write a plan onto an existing node, so it carries the frame's fields, size before any binding, and re-binds the plan's variables by name. Shipped only in a payload whose plans hold a slot, since every byte of the build ships in every chunk: icon-button stays at 16 chunks.
- **A host without `createSlot`** keeps the frame, and the build names it (`<member>/<part>.slot -> NOT MADE …`).
- **A slot's text is literal copy** (`PartDef.characters`). Measured: Figma refuses a component-property reference on a slot sublayer ("Cannot set component property references on slot sublayer"), while plain text in a slot's default content shows on an instance and a designer edits it there. So a `text` part inside a `contentSlot` box carries its own `characters`, which projects as the node's copy. A TEXT property claiming such a part is refused, and so is literal copy anywhere outside a slot, where a TEXT property is still the one way copy is written.
- **`EXECUTOR_REVISION` 10 → 11.**

### Measured on a real host (the scratch file; every probe removed after)

- `createSlot()` appends a SLOT to the component, named `Slot`. On a member already in a set, the set gains a SLOT property at once, named for the node and following its renames.
- Before a combine, each member's slot of one name merges into ONE property, referenced as `slotContentId`. Two members already in a set each making a slot make TWO. A slotted component appended to an existing set merges into its property, so the chunked paste never makes duplicates.
- Re-pointing a slot's `slotContentId` at another SLOT property is accepted, and the left-over property can be deleted. Deleting a slot node leaves its property, orphaned.
- `addComponentProperty(name, 'SLOT')` without a default is refused ("Required value missing").
- A designer's content dropped into an instance's slot survives a switch to another member with the slot, a switch to a member without one (collapsed), and back.
- The shipped `__slotsNow`, run on two slotted Tag members with the real host: each cell a SLOT in its plan place, holding its default glyph, width and height still bound, layout and sizing carried; one property, both referencing it; a designer's rectangle kept across a state switch. The `build` around it was trimmed to fit the call, so this measures the conversion, not the whole payload.

### Tests and mutations

`apps/plugin/test-native-slots.ts` (12 assertions, joined to the plugin's `test`) builds a TEST-ONLY def, Tag with its `dismiss` cell declared a slot, through the plugin executor. `packages/engine/test.ts` runs the paste payload on the same def, and on a host without slots. The three host models (`component-shim.ts`, the engine stub, the real host) now agree on the measured behaviors above. Mutations, each failing by name:
- `toSlots` not called after the conversion → `slots/fresh is a SLOT`, `slots/property`, `slots/read back`, `slots/clean`;
- `toSlots` not called after an in-place member build → `slots/gained on update`, `slots/gained property`;
- the consolidation skipped → `slots/gained property` (15 `dismiss` properties);
- the no-host miss dropped → `slots/no host support named`;
- the payload's slot code never shipped → `#2417 paste: …` (FRAME cells, no property);
- the payload's SLOT skip dropped → `#2417 paste, no native slots: …`;
- the in-slot TEXT-claim rule dropped → `#2417 validator: a TEXT property claiming a part inside a native slot is refused`;
- the outside-a-slot rule dropped → `#2417 validator: literal copy outside a native slot is refused`;
- the projection's literal fallback dropped → `slots/literal text` (the placeholder comes out empty).

### Traps for whoever re-verifies

- The shim's `guardRefs` used to start every node's references at null, which erased the slot reference the host writes at the combine. It is now seeded from what the node holds. The engine stub's twin got the same fix.
- The shim's `appendChild` does not detach a node from its old parent. The conversion moves children with `insertChild`, which does, as the host's own move does.
