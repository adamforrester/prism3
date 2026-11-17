## (2026-11-17) — noUncheckedIndexedAccess, stage 3: the rest of the engine tsconfig's graph clean (#1182)

The third PR of the #1182 lane. It fixes the last 96 errors in the engine tsconfig's import graph, across 12 files. Together with stages 1 and 2 (`component-schema.ts`, then `modes.ts` + `ramp.ts`), `packages/engine/tsconfig.json` will report zero errors under the flag once all three have merged. The PR after them turns the flag on there.

### What the 96 were

- **Adjacent-pair loops** (`for (i = 1…) if (xs[i] < xs[i - 1])`) in `scale.ts`, `theme-brand.ts` and `theme-type.ts` became `for (const [i, cur] of xs.entries()) { const prev = xs[i - 1]; if (prev …) }`. This is equivalent: it skips only `i = 0`.
- **Lookups by a key just walked** became lookups that carry the value. Sign-in-button's `PAIRS` now holds each style's rule beside its name, so the three `RULES[p].styles[s]` reads are gone.
- **Fixed-shape tuples:** a shadow layer is `[offsetY, blur, spread, alpha]`, typed as one.
- **Constants:** the code-input digits are a string read with `charAt`.
- **The first segment of a `split`** is read with a destructuring default that never applies.
- **Everything else** is a local `must(x, what)`, which returns `x` or throws a named error, for a clamped or established index.

One named error is new: `makeSignInButton` over a vocabulary with no glyph for any pair used to throw a bare `TypeError` on `built[0].provider`, and now names why the set would be empty.

### Proof

`regen --check` is in sync (230 artifacts). Every registered def object is byte-identical to `origin/main` (62 digests), and the plan diff matches over 3,038 digests.

### Held from here

The 12 files join `NUIA_CLEAN` in `typecheck-components.ts`, the clean list stage 1 (#3893) added, so each is held clean from this merge rather than from the flag flip. Measured: one unguarded index reintroduced into `scale.ts` (`radiusScale`'s `prev.px` read back as `ramp[i - 1].px`) passed the gate before the files were listed, where only the "elsewhere" count moved from 84 to 85, and fails it by name once they are listed (`packages/engine/scale.ts(…): error TS2532`).
