## (2026-11-18) — A designer's icon swap is a kept hand edit, and a re-pointed slot reads it as a conflict (#3076)

**The ask.** #3076's owner decision (2026-11-18, A, both) has two halves: a brand icon map, and a designer's hand swap of
an icon inside a generated component, which Update file treats as a kept hand edit (#2956). This is the second half.

**What was already true, measured before writing code.** Three new arms in `apps/plugin/test-hand-edit-survival.ts`
swap an icon instance to a brand-owned, unstamped `icon/checkmark`, one per shape a component holds an icon in: a glyph
that is a nested instance (Tag's check), a glyph inset in a frame (Checkbox's check) and a slot whose default a property
names (Search field's clear). All three already read as hand edits and survived Keep. The as-built record hashes an
instance's main component by name (`member-baseline.ts`, v3), and the executor's two re-point sites
(`write-components.ts`, the slot and the nested instance) skip a kept node.

**The one defect.** Under the "overlap" plan, which re-points the swapped node at another core icon, the dry run read
the Tag and Checkbox swaps as conflicts but called the Search field's swap non-conflicting. `diffAnatomy` holds a slot
only to being an instance (`swapTarget`'s check in `anatomy-readback.ts`: the set's default is a node id the plan has no
side of), so nothing marked the slot as touched, although the apply does move the set's INSTANCE_SWAP default. The fix is
`slotRepoints` in `update-plan.ts`: a slot whose instance is not the component the plan names is touched. It feeds the
conflict flag only. Like every conflict where the plan moved, it can over-report; it never hides one.

**A swapped icon reads as a conflict on every later update of its member** (review on #4056). The dry run compares the
file's icon with the plan's, not the plan's with the previous plan's, so a swapped icon differs from every plan. Any
update that moves anything on that member lists the swap as a conflict, even one that leaves the icon alone (the
"root" plan). That was already true of the Tag and Checkbox glyphs on main; `slotRepoints` brings the slot in line.
Keep still holds the swap. The three arms now assert the conflict reading under both plans (`… root conflict`).

**Independence (docs/34).** The expected main component is typed in the test, and the read-back is the shim node's own
`mainComponent`. Four mutations, each measured, each failing arms by name:
- the instance's main left out of the as-built signature (`member-baseline.ts`) fails all 12 icon-swap assertions;
- the nested instance's `kept` guard dropped (`write-components.ts`) fails `icon swap` and `icon swap inset`, root and overlap;
- the slot's `kept` guard dropped fails `icon swap slot`, root and overlap;
- `slotRepoints` unwired fails `icon swap slot root conflict` and `icon swap slot overlap conflict`.

**Owner decisions (2026-11-18).** The guide row in `update-a-file-safely.md` is approved as drafted. A swapped icon
reading as a conflict on every later update of its member is accepted for now (decision 4, A). Option (c), recording a
swap as a map entry, stays unbuilt until the map PR lands. The shim does not model Figma re-pointing a set's bound
instances when the apply edits an INSTANCE_SWAP property's default; that check runs in real Figma as an off-repo host
job, and any follow-up is filed from its result.
