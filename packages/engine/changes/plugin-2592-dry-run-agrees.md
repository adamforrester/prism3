---
engine: minor
---
`COMPONENT_RENAMES` holds its first two entries (#2592): Accordion's icon axis, `position` and `iconPosition`, both
renamed to `icon position`. Both names lived only on #2534's branch before it merged, so a set built from either head
now updates in place: its members are renamed and keep their keys and ids, where the update read a removed axis and
refused the set. The ledger speaks the Figma panel's names, so an axis that gains a display name (`variantAxisNames`)
is an axis rename to it, and `lint-component-renames.ts` already demands the entry when that happens on main. No
emitted artifact, token or projected component surface moves, so CONTRACT is unchanged. In the plugin, the update's
dry run and its apply share one refusal test (`setRefusal`): a collapse, an axis change over members not built by
Prism3, and a rename onto another member's name are blockers in the dry run, so the confirm step lists every set the
apply refuses for them. Adopt is refused by the same blockers, except the axis change over members not built by
Prism3, which Adopt clears by claiming them. A set whose only change is renames no longer reads as up to date.
