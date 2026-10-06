## (2026-10-07) — Engine: a pure gray has no hue, rather than ~89.88° of rounding noise (#2241)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor`, change note `engine-2241-hueless-gray.md`). CONTRACT
unchanged; the brand-input schema is unchanged too (owner decision). `regen` moves no committed artifact. Built on
#2240, whose no-hue rule is the fallback here; opened after #2240 merged.

### What changed

Converting a pure gray (r = g = b) to OKLCH gives chroma ~1e-8 and an atan2 of rounding noise, ~89.88° for every gray.
Code downstream read that as a real hue. It was the root cause of #2240's blocker, where a pinned `#333333` tinted
the shadow olive and the studio read ~90°.

- **The converter (`color.ts`).** `rgbToOklch` returns `OklchMeasured`, whose hue is `null` below `ACHROMATIC_C =
  1e-4` (CSS Color 4's "powerless" hue). Because `null` won't type-check where a number is expected, the typechecker
  listed every consumer, and there are five, all at the brand-input boundary. A `NaN` would have type-checked
  silently and flowed into colors. `ACHROMATIC_C` is the one definition of "no hue": #2240's shadow guard now imports it.
- **The stored form (owner decision).** `storedOklch()` writes a hue-less color with `h: 0`, CSS Color 4's convention
  for a missing hue, so brand files keep the schema's numeric hue. The hex import (`classify-colors.ts`), the studio's
  start from a color (`start-input.ts`) and its color picks (`palette-input.ts` `oklchOf`) all store through it.
- **The fallback is the owner's no-hue rule (Q58 B, Q73 A),** applied at every consumer:
  - the shadow of a gray ramp is untinted;
  - starting from a pure gray gives a **gray neutral** (chroma 0), not one leaning to a noise hue;
  - Color › Palettes reads **None** for a pinned gray's hue (owner decision), on the readout, on the slider's
    value text, and on the pinned color's OKLCH line.
- **Legacy files are covered.** The rule reads chroma, never the stored hue, so a brand file saved before #2241,
  still carrying the 89.88 noise, reads None and stays untinted too.

**Applied beyond the letter of the ruling, flagged for the owner:** the owner ruled on the neutral hue readout. The same
"None" also replaces the hue part of the color field's OKLCH line (`oklchMeta`, `OKLCH 0.321 0.000 None`) wherever a
color has no hue, because it showed the same noise.

### Tests and mutations

**Tests.** The engine and consumer arms both failed by name on the old converter: that is mutation (j).
- **Engine (`test.ts`).** Five pure grays, named as hex (`#000000`, `#333333`, `#7f7f7f`, `#808080`, `#ffffff`), so the
  expectation never comes from the converter itself:
  - the converter reports no hue (`null`) for each;
  - each one's stored form writes hue 0;
  - the faint REAL color `#151415` keeps its hue (≈ 325.67, measured independently), which holds the threshold
    from the other side (docs/34 shape 14);
  - the hex import (`classifyColors`) stores a pure-gray swatch with hue 0.
- **Studio (`test-start-input.ts`).** Starting from `#808080` or `#333333` stores the primary with hue 0, gives a
  gray neutral and untinted shadows, and a pick of either is stored with hue 0. A real color (`#3366cc`) still seeds a
  neutral that leans to its hue.
- **DOM (`test-chrome.mjs`, a new section at the end).** A pinned pure gray in both stored forms, hue 0 and a legacy
  file's 89.88. Each must read None on Color › Palettes' hue readout, the hue slider's value text, and the pinned
  color's OKLCH line, with no 89 or 90 anywhere.
- **#2184's tests now pin through the stored form,** as a real pick does (`storedOklch`, the studio's `oklchOf`), and
  `test.ts`'s sRGB round-trip takes it for white and black.

Each mutation ran from a `wip:` commit, asserted it applied, and was restored with `git checkout --`:

| Arm | Failures | ✗ line |
|---|---|---|
| (j) the converter's no-hue branch removed (the old converter) | `test.ts` 10, `test-start-input` 4 | `#2241 the converter reports no hue for a pure gray (#333333: got hue 89.87556274151122, chroma 1.2e-8)` (and the other four grays, `#000000` included, whose noise hue happens to be 0 but is still a number), `#2241 a pure gray's stored form writes hue 0 (… "h":89.87556274151122)`, `#2241 the hex import stores a pure-gray swatch with hue 0, not the converter noise (2 gray swatches; noisy: Secondary h 89.87556306659991, Neutral h 89.87556300648211)`, and `✗ #2241 starting from #808080: … (got primary hue 89.87556306659991, neutral {"hue":89.87556306659991,"chroma":0.006} …)` |
| (l) start-from-a-gray's fallback dropped | `test-start-input` 2 | `✗ #2241 starting from #808080: the primary stores hue 0, the neutral is gray, and the shadow is untinted (got … neutral {"hue":0,"chroma":0.006}, shadow hue 0)`, and the same for `#333333` |
| (m) the Palettes readout guard dropped | `test:chrome` 2 of 33677 | `✗ #2241 a pinned pure gray (legacy noise hue 89.88) …: … read None, not a hue ({"readout":"90°","aria":"90°","meta":"OKLCH 0.321 0.000 None"})`, and `"0°"` for the stored form |
| (n) the OKLCH line's guard dropped | `test:chrome` 2 of 33677 | `… ({"readout":"None","aria":"None","meta":"OKLCH 0.321 0.000 89.9°"})`, and `0°` for the stored form |

Under (j), the depth-and-motion tests stay green, and should: their pins then carry the noise hue at a tiny chroma,
and the shadow rule reads chroma. That is the legacy-file robustness, observed.

### A trap for whoever re-verifies this

`test.ts` is not typechecked, so a converter caller there gets `null` at run time, not a compile error. That is how
#2184's own tests surfaced (a `toFixed` on null). The typechecker does cover the engine, studio and plugin code, and it
listed all five boundary sites.
