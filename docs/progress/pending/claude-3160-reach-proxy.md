## (2026-11-01) — lint-executor-reach sees a host call the shim lacks (`?.()`), and `reach/missing` tests a gap alone (#3160)

**Status:** gate and test change. ENGINE patch (change note): no committed artifact moves. CONTRACT unchanged.
`EXECUTOR_REVISION` unchanged: the executor's code did not move.

### What changed

- **N1, the `?.()` blind spot.** The executor calls optional host APIs as `node.x?.(…)`. A method the component shim
  does not implement makes that a no-op on both sides of the gate, so a real drawing change through one (the #3154
  review's M-D, `setExplicitVariableModeForCollection?.()` on a nested instance) read `same` and the set stayed
  current after the revision bump.
  - `component-shim.ts` gains `wrapNode`, an opt-in `ShimOpts` hook. `mkNode` builds the literal as `raw` and hands
    back `wrapNode(raw)`, and the shim's own closures use that value too, so a wrapper sees every read. Unset (every
    suite but the reach gate) a node is the plain object it was.
  - `reach-draw.ts` passes `recordUnmodeled`: a `Proxy` whose `get` records each string property a node is asked for
    and lacks (not `then`/`toJSON`) in `_unmodeled`, an enumerable `Set` the serializer reads like any other field.
    A host API NEW asks for and OLD does not reads `changed`. It over-reports by design, which the record allows.
  - The limit that remains is stated in `reach-draw.ts` and `executor-reach.ts`: a method the shim implements as a
    no-op, or a write to a property it carries but does not model.
- **N3.** `reach/all and missing` crossed 13's `"all"` on its way to 14, so it never tested a missing entry alone.
  New `reach/missing` crosses only a gap: `{ floor: 10, reach: { 11: [] } }`, 11 → 12.

### Verification

- M-D (committed first): `EXECUTOR_REVISION` 45 with entry `"45": []`, and
  `setExplicitVariableModeForCollection?.(…)` on the nested instance `write-components.ts` creates. The gate fails by
  name on every set that nests a component. The same mutation with `main`'s `reach-draw.ts` reads clean.
- Control: the revision raised with the executor unchanged reads clean, so the `Proxy` adds no `changed` of its own.
- `reaches` reading a missing entry as reaching nothing (`if (e === undefined) continue;`) fails `reach/missing` by
  name (and `q811/executor`), while `reach/all and missing` still passes: the gap N3 named.
