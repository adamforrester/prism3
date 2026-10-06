## (2026-10-05) — the viewport default is written once, and the one-bound path is tested (#2172)

**STATUS: branch `engine/2172-viewport-default-once`.** ENGINE bump class: **none owed**. The deduplicated defaults are the same values (375/1280), so no behavior, artifact, token, name or value moves. `CONTRACT_VERSION` unchanged. **Fixes #2172.**

### What was wrong

`buildTypography` (`theme.ts`) wrote each viewport default twice: once in #2068's comparison (`vpMax = … ?? 1280`) and once in the theme's output (`maxViewport: … ?? 1280`), which the studio reads. Every test passed both bounds explicitly, so the comparison's own default was never exercised. Measured on `main`: changing **only** that default to 1440 left the whole engine suite green, 135286 passed and 0 failed.

### The fix

The output now takes the values the comparison resolved (`minViewport: vpMin, maxViewport: vpMax`), so each default is written once.

### Tests, in `test.ts`'s #2068 block

- **Only `minViewport: 1280`** is refused with exactly "The minimum viewport (1280px) must be smaller than the maximum viewport (1280px)." This pins owner decision Q17 (a): the message names the default it compared against.
- **Only `maxViewport: 375`**, the same in the other direction.
- **Neither set** builds with 375/1280.
- **`theme-schema.json`'s stated defaults** (`"default": 375` / `1280`, a third copy, read by agents) equal what the engine builds.

### Mutations

All 3141 assertion sites ran in each mutated run on this branch.
- **The comparison's default alone, 1280 → 1440, with the duplicate put back** (the issue's scenario): `❌ [#2172] only minViewport 1280 is compared with the default maxViewport, 1280, and refused (got "")`. The default-range and schema arms stay green, correctly: the output still says 1280.
- **The one default, 1280 → 1440, on this branch:** three arms fail, the min-only one, the default range (`got 375/1440`) and the schema pin (`schema 375/1280, engine 375/1440`).
