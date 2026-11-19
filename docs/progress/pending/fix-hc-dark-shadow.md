## (2026-11-19) — hc-dark takes the reduced dark shadows (#4131)

**What.** The shadow model is full in light and reduced in dark, where surface lightness carries elevation. `hc-dark`
broke it: `tree.ts` writes `modes.dark` unconditionally, and `theme-brand.ts` seeds `shadowByMode` for dark-based
custom modes, but the built-in `hc-dark` is neither, so its overlay had no shadow and fell back to the light `$value`.
Owner decision A (2026-11-19): hc-dark takes the reduced dark layers. One seed beside the custom-mode loop, from the
global dark layers; hc-dark is generate-only, so it never carries an override that seed could clobber. The regression
brand nb is built by `nbThemeFrom`, not `brandTheme`, so it takes the same seed there (`darkShadowSeed` in
`theme-shadow.ts`, shared by both): all five brands, as #4131 says.

**Fallout.** Each brand that generates hc-dark gains `shadow.*` in its hc-dark overlay, a `modes.hc-dark` entry on each
shadow leaf of the canonical tree, and a `shadow-hc-dark/*` Figma effect-style set, named the way `shadow-dark/*` and
custom modes' sets already are. The `.ai.json` `consume` text ("reduced in dark") is now true of every dark mode.

**Test.** `#4131 <brand>` reads the hc-dark overlay a consumer installs, per example brand and for nb, and asserts every
step equals dark's and differs from light's. With the seed removed (main's `theme-brand.ts`) the three example rows
fail by name; with nb's seed removed, `#4131 nb` does.
