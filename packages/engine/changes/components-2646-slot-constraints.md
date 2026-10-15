---
engine: minor
---
Native slot constraints (#2646, owner decision Q306.1 A). A `contentSlot` part may declare `slotSettings`
(`minChildren`, `maxChildren`, `allowPreferredValuesOnly`, `displayEmptyByDefault`) and `preferred`, a list of def ids.
`validateComponentDef` refuses them off a native slot, a count that is not a whole number, a min above its max, a max of
0, preferred-only with nothing preferred, an unknown setting, and an empty or repeated preferred list. The projection
checks each preferred id against the registry and throws naming one that is unknown, the def itself, a building block,
a def that does not project, one refused alone, or one that builds standalone components. The plan's slot node carries
them (`slotSettings`, `slotPreferred`) and the set's SLOT property plan takes them. Both executors write them on the
SLOT property with `editComponentProperty` after the property phase, each preferred id resolved to the key of the set
built under its name; a preferred def not in the file is a named miss, and a preferred-only slot with none of its
preferred sets built is written open, with a miss. The plugin executor also writes an Update's dropped constraints back
to Figma's defaults. The read-back (`anatomy-readback.ts`) compares both fields off the SLOT property the slot node
references, naming preferred keys through a new optional `componentName` port. No committed def declares a constraint
yet (Accordion's panel stays open, a DRAFT owner item), so no projected component surface or token moves, and CONTRACT
is unchanged. The engine's `{{ENGINE_VERSION}}` stamp moves with the fold as usual.
