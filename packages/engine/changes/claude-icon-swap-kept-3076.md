---
engine: patch
---
A designer's icon swap inside a generated component is a kept hand edit, and the dry run lists the swap as a conflict on any later update that moves its member (#3076, owner decision 2026-11-18: A, both). Swapping the icon in a Tag, a Checkbox or a Search field's clear slot to the brand's own icon already read as a hand edit (the as-built record names an instance's main component) and Keep already held it. The hand-edit survival suite now proves that for each of the three shapes. One defect is fixed: where the update moves a slot's default icon, the dry run listed a designer's swap in that slot as conflicting with nothing, because a slot was compared only for being an instance. It is now a conflict. Plugin only; no committed artifact moves.
