## (2026-10-02) — An override is re-rated against its real ground when that ground is a palette step (#2025)

**STATUS: PR open from `engine/override-floor-ground-2025`.** Engine, plus one Studio test fixture. ENGINE minor via `packages/engine/changes/engine-override-floor-ground-2025.md`. No emitted artifact moves, and `CONTRACT_VERSION` is unchanged.

**How it was found.** While fixing #1986, `lint-ratio-truth` started recomputing ratios measured against a palette step. It surfaced 22 rows in its own override sweep, all in light, all against `neutral.050`. Each overridden floor role recorded its contrast on white: for example, `foreground.brand` at `neutral.500` records 4.56 and measures 3.76 on `#e9e9ea`. The #1986 gate PR waits on this one.

**The diagnosis.** The post-derivation override pass in `modes.ts` set `againstRgb = rgbByRole.get(existing.against) ?? baseRgb`. A floor-measured role (`foreground.*`, links, `interactive.<c>.fill.*`) names the contrast floor, a ramp step, as its `against`. That step is never a role, so the lookup always missed and the ratio was taken on the page base. Three things followed from that one line:
- the recorded ratio was false;
- a shortfall that existed only on the floor raised no warning;
- the #1510 link clamp, which reads the same `againstRgb`, cleared the page instead of the floor.

**The fix.** The fix is a `stepRgbOf` that resolves `<palette>.<step>` on the theme's ramps, tried after `rgbByRole` and before the page fallback. The fallback stays for a ground that is neither a role nor a step. None exists today, because `lint-ratio-truth` arm C (after #1986) fails on one.

**The link clamp, measured.** A throwaway probe (not committed) overrode every link role in light and dark to every step of every ramp, on the six corpus brands built from an input (NB is a fixture with no input to override). That gave 31,200 cases, 15,600 of them measured against a step.
- Before the fix, **4,810** were emitted below their contract on the real floor, worst 2.66:1, and every one recorded a ratio that cleared it.
- After the fix, **0** are.

**Suites.**
- `test.ts` gains FO-01. Its expected values are literal hexes (`#e9e9ea` floor, `#ffffff` page, pinned as a precondition) and the shared `contrast` primitive. Nothing is imported from the engine's ground lookup or from the gate's helper. FO-01 asserts that:
  - an overridden `foreground.brand` records its contrast on the floor;
  - a pick short of its bar on the floor only (`neutral.400`: 2.71 on the floor, 3.28 on the page) is warned, and a clearing pick is not;
  - a link override, both one that clears the page only and one below both, is clamped to 4.5:1 on the floor.
- L-06's `groundRgbOf` had the same blindness, falling through to `background.primary` for a step ground. It now reads the step off the brand's ramp.

- Studio's near-floor fixture (`apps/studio/test-verdict-count.ts`, #1930) was built on the bug. It put `text.tertiary` at `neutral.350`, "about 2.82:1 against neutral.050", but 2.82 is that step on white. On the floor it is 2.32, more than the 0.5 the fixture exists to sit within, so #1930's loosened-threshold mutation no longer failed. The fixture now pins `neutral.400`, which is 2.70 on the floor (`#8d8e90` on `#e9e9e9`). The mutation, `r.ratio + 1e-9 < r.min - 0.5` in `src/state/verdict.ts`, fails by name again: `near-floor fixture: the bar reads "1 of 884 below floor, 1 mode" — read "All 884 pairs at or above floor"`. The owner approved this one-line edit in `apps/studio` as fallout of the engine fix.

**Mutation.** Reverting to `?? baseRgb` fails four FO-01 arms by name:
- `FO-01: an overridden foreground.brand under the neutral.050 floor records its contrast on #e9e9ea (records 4.56, measures 3.76 on the floor, 4.56 on the page)`;
- the floor-only warning arm;
- both clamp arms.

**Why minor, not patch.** `regen --check` is clean before and after, so a patch note would pass the gates. The policy, though, is minor for any behavior change, and this is one. A brand that overrides a floor-measured link now emits a different hex, and a floor-only shortfall now warns. Regen is clean only because no corpus brand takes that path.

**Trap for whoever re-verifies this.** A test that picks its link step against `background.primary` is not measuring the link's ground. Read the step off `against`, and resolve it on the ramp when it is not a role. L-06 did this wrong for as long as the engine did, which is why neither caught the other.
