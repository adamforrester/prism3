## (2026-11-17) — noUncheckedIndexedAccess, stage 5: tree.ts, design-md.ts and emit-figma-color.ts clean (#1182)

The fifth PR of the #1182 lane: 91 errors in three engine files the surfaces reach (`tree.ts` 53, `design-md.ts` 20, `emit-figma-color.ts` 18). The flag stays off.

### Shapes worth knowing for the rest of the lane

- **The nested-path write** (`for i < parts.length - 1: node = node[parts[i]] ??= {}; node[parts[last]] = leaf`) appears three times in `tree.ts`. It became one loop over `parts.entries()` that descends on every segment but the last and writes on the last. It is the same walk with no index read.
- **String indexing is checked too.** `design-md.ts` reads characters with `src[i]` inside `i < src.length`, and those reads became `charAt(i)`, which is identical in range. Its block parser's `while (pos < lines.length && lines[pos]…)` loops became `for (let cur = lines[pos]; cur && …; cur = lines[pos])`. A `continue` runs the update, so this matches the old re-evaluated condition exactly.
- **Faithful fallbacks.** In `parseColor`, a missing channel stays `NaN` (`(p[0] ?? NaN) / 255`), the value `undefined / 255` always produced. A missing path segment in the scope tables looks up `''`, which no table holds, so it falls back exactly as an `undefined` key did.
- **Mandatory regex groups** read through `m?.[1] !== undefined`, which is equivalent to `if (m)` for a non-optional group.
- **`must` placement.** In the glass-alpha mint, the new `must(step)` sits after the white/black-alpha `continue`, so it never runs on a path the old code skipped.

### Proof

`regen --check` is in sync (230 artifacts). The plan diff against the merge base, which now also covers every single-argument export of `design-md.ts` and `emit-figma-color.ts`, is identical over 3,472 digests.

### A handled case kept handled

The review found one site where the rewrite changed behavior. `tree.ts` reads the option row label's body line box per control rung, and a rung with no line box used to get no `label-inset`. A `must` turned that into a throw. The guard stays and the arithmetic moves inside it. A `test.ts` case builds the minimal theme with no `body.xs` composites and holds `control.size.sm` to no `label-inset`. That case failed by name on the rewrite and passes now.

### Held from here

`packages/engine/tsconfig.json` doesn't read these three files, so #3893's `NUIA_CLEAN` can't hold them. `typecheck-components.ts` gains `NUIA_CLEAN_BY_TSCONFIG`, one `--noUncheckedIndexedAccess` run per further tsconfig, the same arm stage 4 (#3913) adds. The three files are listed under `apps/plugin/tsconfig.main.json`, which reads them. Measured: one `must` removed from `tree.ts` passes the gate without the entry and fails it by name with the entry.
