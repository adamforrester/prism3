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
