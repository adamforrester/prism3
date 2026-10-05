## (2026-10-05) — typography refuses an empty or reversed viewport range (#2068)

**STATUS: branch `engine/2068-viewport-range-refusal`.** `ENGINE_VERSION` → **{{ENGINE_VERSION}}** (minor, a change note). No emitted artifact moves; `CONTRACT_VERSION` unchanged. **Fixes #2068** (engine side).

### What changed

`fluidClamp` (`tree.ts`) interpolates a fluid size between `typography.responsive.minViewport` and `maxViewport`, and divides by their difference. Nothing checked the pair:
- **800/800** emitted `clamp(2.25rem, -Infinityrem + Infinityvw, 3rem)`, which is invalid CSS, so the browser drops the whole declaration.
- **1280/375** emitted a clamp() whose size shrinks as the viewport grows.

Both built clean.

`buildTypography` (`theme.ts`) now throws when `minViewport >= maxViewport`, with the owner's approved wording (2026-10-05), one sentence for both the equal and the inverted pair:

> The minimum viewport (‹min›px) must be smaller than the maximum viewport (‹max›px).

‹min› and ‹max› are the values as entered. The refusal holds **with `fluid` off too**, which is owner decision Q16 = (a). The pair is what the fluid regime reads, so a brand that turned fluid on later would otherwise inherit the bad range.

**Wording history.** The first push carried two drafted messages for the owner's review, one per arm, each prefixed `typography.responsive:`. The approved sentence replaced both before merge.

### Tests

In the `[#1587]` sizeOverrides block of `test.ts`, which has the `tBrand` / `msgOf` helpers. Each expected message is the approved sentence typed as a literal and compared exactly:
- equal (800/800), refused;
- inverted (1280/375), refused;
- the values as entered (400.5/400 gives `400.5px`, not rounded);
- inverted with `fluid: false`, still refused;
- the default range builds, both omitted and stated explicitly as 375/1280;
- at 375/1280 the emitted tree's clamp() values are all finite. A floor requires at least one to be emitted, so the arm can't pass over an empty set.

### Out of scope

- **Offering the refusal up front in the studio** (`apps/studio/src/state/type-input.ts`, like #2054 / #2055) is the UI lane's follow-up.
