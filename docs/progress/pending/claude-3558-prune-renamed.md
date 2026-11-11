## (2026-11-11) — Prune reads Prism3's collections where an Apply Theme Rename put them (#3558)

Found in the post-merge review of #3518 (#3569). The Rename fix (#3518) updated the apply's own list of planned
collections, but Prune built its list from the default names. So after a Rename, `color (Prism3)`, which holds only
Prism3's variables, was not a planned name. Prune classed it as stranded and offered to delete it, along with every
component binding into it. The person's own `color` was meanwhile treated as Prism3's, so its modes and orphans got
judged.

`computePrunePlan` (`apps/plugin/src/prune-figma.ts`) now resolves the plan's collection names against the file, using
`ownedCollectionNames`. For each planned `P`:

- If the file's `P` doesn't carry the engine's `modes:owned` stamp, and exactly one stamped `P (Prism3)` exists (the
  suffix can repeat after a second pass), Prism3's collection is that one.
- The person's `P` is then kept. It is never judged for orphans or modes, and never offered as stranded.
- A stamped `P`, or no stamped rename, keeps `P` exactly as before.

The snapshot already carried each collection's `ownedModeIds`, so `main.ts` is unchanged. The rename suffix is spelled
in `prune-figma.ts` (`collision-choice.ts` reaches that module through `preflight.ts`, so importing it back would be a
cycle). The end-to-end arm below holds the two spellings together.

**Status:** plugin only. No engine change, so no change note. Outside the component executor, so `EXECUTOR_REVISION`
stays.

### Test

`test-write-preflight.ts` has a new arm that runs a real apply with `{'collection:color': 'rename'}` over a hand-made
`color` holding a `pds3/…` variable. It then builds the prune input the way `main.ts` does: the same plan builders,
plus each collection's `ownedModeIds`. The arm checks four things:

- `#3558 premise`: `color (Prism3)` is stamped and the person's `color` is not.
- `#3558 prune after rename: no collection is offered for deletion`.
- `… the person's color is judged for no orphan and no mode`.
- A control: an orphan left in `color (Prism3)` is still offered there.

Mutations, each failing by name:

- `ownedCollectionNames` mapping every name to itself → `no collection is offered for deletion`, and the control.
- The `kept` filter dropped from the stranded arm → `no collection is offered for deletion` (the person's `color`).
