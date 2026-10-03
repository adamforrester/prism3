## (2026-10-03) — lint-ratio-truth recomputes ratios measured against a palette step (#1986)

**STATUS: PR open from `gate/1986-ratio-truth-palette-ground`.** Gate only: no engine change, no ENGINE bump, no emitted artifact moves.

**What was wrong.** Arm C accepted an `against` shaped like a palette step (`neutral.050`, the contrast floor) and then `continue`d, so arm A never recomputed it. Every floor-measured ratio was taken on trust: foreground inks, links and `interactive.<c>.fill.*`. That was 1,640 ratios per run in the corpus and 7,544 in the declared-surface and override sweep.

**What changed.** The gate reads the step's hex off `theme.palettes`, the emitted ramp primitive. That is data, not the engine's ground lookup, and it is used as the ground in both of arm A's branches. A step-shaped `against` that is on no ramp now fails instead of being skipped. FLOOR 5 fails the gate if palette-step recomputes drop below about 1,000 in the corpus or vanish from the sweep. The summary line now reports the palette-step count.

**Counts.**
- Before, on origin/main: 40,248 ratios recomputed and 175 below-minimum roles, all confessed.
- After: 49,432 (+9,184, of which 1,640 are in the corpus and 7,544 in the sweep) and 344 below-minimum roles, all confessed.

**It found a real defect first.** On the main of the time, the fixed gate failed 22 rows in its own override sweep. Each was an overridden floor role that recorded its contrast on the page, not the floor: for example, `foreground.brand` at `neutral.500` recorded 4.56 and measured 3.76 on `#e9e9ea`. That was the engine bug #2025, fixed in #2032, which also measured 4,810 link values emitted below contract through the same line. This PR waited for that merge and lands green on top of it. Nothing was loosened or skipped.

**Mutations, each failing by name.**
- `foreground.brand`'s recorded ratio +0.25 in `modes.ts` → 25 arm-A lines, for example `corpus:nb (legacy fixture, nbds.* dialect)/light: 'foreground.brand' records ratio 4.87 against 'neutral.050', but the emitted colors measure 4.62`. The same mutation passes origin/main's gate (40,248 recomputed, clean). That is the gap this closes.
- Arm C back to the pre-#1986 skip → FLOOR 5: `only 0 ratio(s) recomputed on a palette-step ground (0 in the corpus, 0 in the sweep)`.

**Not covered: #2026.** This gate proves a ratio is true for the step the role names. It cannot tell whether that step is the right one. With a declared `surfaces.<mode>.secondary`, the floor should follow the tier. #1972's mutation (b) leaves it behind at `neutral.050`, every ratio stays honest, and this gate stays green. The check that ties the floor to `background.secondary` is #2026.

**Trap for whoever re-verifies this.** To measure the before count, run origin/main's version of the gate (`git show origin/main:packages/engine/lint-ratio-truth.ts` into a temporary file next to it) against the same engine. The branch changes only the gate, so the engine half is identical.
