## (2026-10-06) — Engine: the shadow tint follows the hue that builds the neutral ramp (#2184)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor`, change note `engine-2184-shadow-tint.md`). CONTRACT
unchanged. `regen` moves no committed artifact.
- **Engine:** `theme.ts`, plus tests in `test.ts`.
- **Studio** (owner Q58 B): `domains/depth.ts`, `state/depth-motion-input.ts` and one `chrome.css` rule, plus tests in
  `test-depth-motion-input.ts` and a new section at the end of `test-chrome.mjs`.

**Copy and one visual detail are DRAFTS held for owner approval** (listed below).

### What changed

The owner decided on 2026-10-06 that, with `shadow.tint.hue` unset, the shadow tint follows whichever hue
builds the neutral ramp:

| Neutral source | Shadow tint hue |
|---|---|
| Follow primary (`neutral.auto`) | the primary's hue |
| Custom tint | the custom tint hue |
| Pinned (`neutral.anchor`) | the pinned gray's hue, which also wins over Follow primary, as it does for the ramp |

An explicit `shadow.tint.hue` still wins. `buildShadow` used to take the stored `neutral.hue` at both of
its `brandTheme` call sites, the baseline and the per-mode ramp. Under Follow primary and Pinned, that's a
hue the ramp ignores and the studio doesn't show.

`brandTheme` now derives `neutralRampHue` once (`nAnchor ? nAnchor.h : nHue`) and uses it for the neutral
ramp *and* for both shadow calls, so the two can't drift apart again. The NB legacy fixture's call is left
alone: it is a fixed fixture at `amount: 0`, pure black whatever the hue.

### Which brands change, and by how much

None in the corpus. `regen` moved nothing, and an equivalence run compared every corpus brand's shadow axis,
built from the same input by `main`'s engine and by this branch's:

| brand | neutral source | tint hue, main → branch | shadow axis |
|---|---|---|---|
| prism3 | custom tint, explicit tint 266.75 | 266.75 → 266.75 | identical |
| aurora | custom tint, explicit tint 285 | 285 → 285 | identical |
| harbor | custom tint | 65 → 65 | identical |
| nb-redesign | pinned (anchor hue 325.7 = stored hue) | 325.7 → 325.7 | identical |
| wendys | custom tint | 249.14 → 249.14 | identical |
| nb (legacy fixture) | amount 0, pure black | 243 → 243 | identical |

Where the rule does apply, Harbor with its tint unset shows it:
- **Follow primary:** 65° → 195°, ΔE00 2.15 on the shadow color.
- **A gray pinned at 250°:** 65° → 250°, ΔE00 2.51.
- **Custom tint:** unchanged.

`nb-regression` passes unchanged (mean ΔE00 1.95, 11/11 contracts).

The class is `minor`, not `patch`, although no artifact moved. Principle 5 makes `minor` the class for any
behavior change, and `patch` only *permitted* when nothing moves. Every non-corpus brand under Follow primary
or a pinned gray gets a new shadow color. The token names don't move, so the token contract stands.

### The studio's readout already agrees

Depth & motion's tint hue slider shows the authored `shadow.tint.hue` or, unset, the engine's resolved
`theme.shadow.tint.hue` (`domains/depth.ts` `shadowShown`). Every mode's Auto falls back to the same field
(`state/depth-motion-input.ts` `brandShadowValue`). Nothing in the studio or the plugin derives the hue on its
own, so the readout follows the new rule with no studio change. Under Follow primary, an untouched slider
now reads the primary's hue.

### Tests and mutations

In `test.ts`, one test per source and one for the explicit override:
- **Expected hues are read from the input.** Each expected hue is `primary.h`, `neutral.hue`,
  `neutral.anchor.h` or `shadow.tint.hue`, never read back from the shadow.
- **Every hue in play sits ≥ 30° from every other**, asserted in each test, so a wrong source cannot agree by
  coincidence.
- **Both call sites are held.** Each case carries a dark-mode shadow override, so the per-mode site is
  checked alongside the baseline.
- **The color is checked, not just the field.** The default path's shadow color must equal the color built by
  asking for the expected hue explicitly.

Each mutation ran from a `wip:` commit, asserted it applied, and was restored with `git checkout --`. In
every arm the only failures in `test.ts` were these tests:

| Arm | Failures | ✗ line |
|---|---|---|
| (a1) baseline back to `input.neutral.hue` | 3 | `#2184 Follow primary: the shadow tint takes the primary's hue (expected 195, from the input; got baseline 40, dark mode 195; …)` and both Pinned cases, `got baseline 40` |
| (a2) per-mode back to `input.neutral.hue` | 3 | the same three, `got baseline 195, dark mode 40` / `baseline 250, dark mode 40` |
| (b) Pinned mapped to the stored hue | 2 | `#2184 Pinned: the shadow tint takes the pinned gray's hue (expected 250, from the input; got baseline 40, …)` and `#2184 Pinned, with Follow primary on: …` |
| (c) the explicit-override branch dropped | 1 | `#2184 an explicit shadow.tint.hue still wins over every neutral source (expected 120; got 195/195, 300/300, 250/250)` |

Custom tint passes under (a) and (b), correctly: there, the stored hue *is* the source.

### A pure-gray pin has no hue, so its shadow is untinted (owner Q58 B, 2026-10-06)

Lane D's review found that a pin with r = g = b converts to chroma ~1e-8 and a noise hue of ~89.88° (#2241). The
ramp can't show that noise at chroma ~0, but the shadow tint did: olive, ΔE00 2.23. The studio's hue slider also
read ~90°. The owner ruled that such a ramp has no hue, so the shadow is **untinted**, and an explicit
`shadow.tint.hue` still wins.

- **Detection is by chroma, never by the noise hue.** The shadow's default is `null` below `ACHROMATIC_C = 1e-4`.
  That threshold is four orders of magnitude above the noise, and well below the faintest real pin in the corpus
  (nb-redesign's `#151415`, chroma 0.0025).
- **The render is "no hue, the amount still lifts".** That was the owner's choice of two (the other was pure
  black): chroma 0 at the lightness `amount` sets, so the Amount slider keeps working under the pin. At the default
  amount it is ΔE00 0.44 from pure black.
- **The resolved hue becomes `null`.** `ShadowAxis.tint.hue` is now `number | null`. No token carries the hue,
  only `colorRgb` and the layers, so nothing emitted changes shape.
- **The slider is disabled and reads None.** That was the owner's choice. It keeps its `aria-valuetext` in step,
  and a hint line says why. Every mode's Auto label reads None too. Amount stays enabled.
- **The guard covers the pin only,** as Q58 B scopes it. A Custom tint or Follow-primary neutral at `chroma: 0`
  also builds a gray ramp, but there the hue is a user-set number rather than converter noise. That case is held
  as an open question, not decided here.
- **The converter itself is untouched;** its noise is #2241.

**Drafts held for owner approval** (docs/voice-standard.md):

| # | Where | Text |
|---|---|---|
| C1 | the decisions-log note, for an untinted shadow | `untinted at 0.15, because the pinned gray has no hue` (with ` (pure black)` after the amount when it is 0) |
| C2 | the hue slider's readout | `None` |
| C3 | the line under the disabled hue slider | `The pinned gray has no hue, so shadows are untinted.` |
| V1 | a disabled range's skin (`chrome.css`) | `accent-color: var(--p3-disabled-ink); cursor: not-allowed`, from #2152's disabled-skin family (F1 A) |

The tests:
- **`test.ts`:** `#333333` and `#808080`, built through the real converter, leave the shadow untinted: `tint.hue` null,
  r = g = b, still lifted off black, at the baseline and per mode. An explicit hue still tints both pins. The faint
  real pin `#151415` keeps its own hue, which holds the guard from the other side (docs/34 shape 14).
- **`test-depth-motion-input.ts`:** the slider's source value, `brandShadowValue('tint.hue')`, is null under each
  pin, and an explicit hue then wins.
- **`test-chrome.mjs`:** a new section at the end, outside the four open UI-lane PRs' edits. The hue slider is
  disabled, its readout and `aria-valuetext` read None with no 89 or 90, its hint shows, and Amount stays enabled.

| Arm | Failures | ✗ line |
|---|---|---|
| (d) the guard removed | `test.ts` 2, studio unit 2 | `#2184 Q58 B: a pure-gray pin (#333333) leaves the shadow untinted, with no hue (… got tint.hue 89.87556274151122, color {"r":13,"g":12,"b":10} …)`, the same for `#808080`, and `✗ #333333 pinned (converter hue 89.88): the hue slider's value is null (shown as None), not ~90° … (got hue 89.87556274151122 …)` |
| (e) the threshold raised to 1e-2 | `test.ts` 1 | `#2184 Q58 B: a faint but real pin (#151415, chroma 0.0025) still tints the shadow at its own hue (expected 325.67, got null …)` |
| (f) the studio's disable call dropped | `test:chrome` | 26051/26053, both failures this section's: `✗ #2184 Q58 B: a pure-gray pin (#333333), web light 1280: the hue slider is disabled, reads None (not ~90°), says why, and Amount stays enabled ({"disabled":false,"aria":null,"readout":"None","hint":false,"amountEnabled":true})`, the same for `#808080`. The readout still says None through its own mapping, so the disable assertion is what fires |

### A trap for whoever re-verifies this

The corpus can't show this change, because no corpus brand has a tint-unset Follow-primary or
off-hue pinned neutral. So "`regen --check` clean" is true and proves nothing about the rule. The tests'
synthetic brands are what hold it.
