## (2026-11-10) — File components: `_Section-header` and `_Headings` draw Figma's variant-set border (#1713)

**Status:** plugin only. No engine change, so no change note; CONTRACT unchanged. `file-components.ts` is outside
the executor (`lint-executor-revision.ts` lists its files), so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q130 A (2026-11-10, on #1713):** the two file-component template sets get the same purple dashed
  set border as the projected sets (#1714).
- `file-components.ts` gains `paintSetBorder`, called after `stackVariants` in `buildSectionHeader` and
  `buildHeadings`. On a set the host hands back bare it writes one SOLID #9747FF stroke, 1px, inside, a 10/5 dash
  and a 5px radius: the values `claimDefaults` writes on a projected set. A set the host already stroked keeps its
  own, as `claimDefaults` does.
- **The constant is a copy, on purpose.** `SET_BORDER` lives in `write-components.ts`, which is the executor.
  Importing it would pull `file-components.ts` into the executor's file set and tie these template sets to the
  executor's stamp. The paste twin in `anatomy-figma.ts` is the precedent for a named copy.
- Fresh builds only: an existing file keeps its sets until they are rebuilt, as with #1600's stacking.

### Tests

- `test-file-components.ts`, section `variant-set border (#1713)`: the shim's `combineAsVariants` returns the set
  with no strokes, as the live host does, so a border can only be one the code wrote. The expected values are
  literals, not the subject's constant (docs/34). A third arm checks that a set the host already stroked keeps its
  own border.
- **Mutations:** dropping the stroke write fails `_Section-header: the set carries…` and `_Headings: the set
  carries…` by name; dropping the already-stroked guard fails `a set the host already stroked keeps its own border`.
