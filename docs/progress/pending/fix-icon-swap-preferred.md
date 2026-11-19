## (2026-11-19) — An icon swap lists the file's icons first (#4164)

Prism3 wrote preferred values for SLOT properties only (#2646), so every INSTANCE_SWAP picker listed every component in the file and its libraries, with no group of icons first. The owner chose A (2026-11-19): every icon swap prefers every core icon the file holds.

### What changed

- **Engine** (`anatomy-figma.ts`): `planSetProperties` marks an INSTANCE_SWAP whose target is a core icon (`iconComponentName('')`, `icon/`) with `preferIcons: true`. In the plugin, whose placeholder is `icon/FPO-default-icon`, that covers 19 sets: the three Button families and their icon-button and flush-icon-button siblings, plus Card number field, Link, List.Item, Password field, Search field, SegmentedControl.Segment, Select, Tab, Tag and Text field. Card number field's card mark is a provider logo and stays open.
- **Both executors** write the list after the slot constraints pass, by the same rule. `write-components.ts` has the ICON SWAPS pass, and the paste payload has `PAYLOAD_ICON_SWAPS`. The list is every COMPONENT whose name shares the target's prefix, in name order, by key, written with `editComponentProperty(key, { preferredValues })` and read back. These are named misses, as for a slot's preferred set: no icon in the file; an icon name held by more than one component (left out); a refused or unkept write. Icons with no key are a host that can't name a component by key (Figma always keys one, but the offline shims don't), so nothing is written there and nothing is reported, as a host without the slot API is left alone.
- `EXECUTOR_REVISION` is 66. Its reach entry names the 19 sets, so Update file makes each due and writes the list onto a set built before this.

### Tests

- `test.ts`: `#4164 projection` (Tag's swaps carry the flag with an `icon/` target and not without one) and `#4164 paste` (the payload writes the three icon components' keys, in name order, and not a provider logo's). The payload stub gained an opt-in `compKeys`, a plain component's key. The `#1392` clean-run sweep sets it, as a real host keys every component. The List.Item property literal gains the flag.
- `test-slot-constraints.ts`: `#4164 icon swaps/written`, `/updated` (an update in place writes the list onto an existing swap) and `/open` (a non-icon target stays open).
- On `main`, `#4164 projection`, `#4164 paste`, `/written` and `/updated` fail by name. Each executor's pass, dropped, fails its own arms.

### Trap

`test-slot-constraints.ts`'s own `SWAP_TARGET` is `FPO-default-icon`, which is not an icon, so a test there needs the plugin's `icon/FPO-default-icon` to see the flag.
