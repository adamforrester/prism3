## (2026-11-17) — Seeding a brand from a file's facts: the engine path, the agent path and the comparison (#2075 part 2)

### What landed

- **`packages/engine/file-seed.ts`**, the engine-only path. `seedFromFacts(report)` proposes a primary, an accent, type families, density, `radiusScale` and the action palette (owner decision Q-BK7 A), each with a confidence and its evidence, plus the neutral a compiling input needs. `seedDesignMd` writes the seed as a `design.md` that `cli.ts` already compiles. It's deterministic and node-free, and nothing calls it yet: no plugin UI, no start-screen entry.
- **The agent path**: a "Starting from a file facts report" section in `skills/prism3-theme/SKILL.md`, and four recorded agent outputs under `tools/file-seed-comparison/agent/`.
- **The harness**, `tools/file-seed-comparison/`, scores both paths against a hand-written answer key over four repo rows (the reference brand's and Prism 2's variable exports, and two of the engine's own emissions). It also has six pending rows for non-Prism3 files. Their read-only capture (`scan-script.ts`) runs part 1's own scan inside Figma and returns the report in hashed chunks.
- **Findings**: `docs/superpowers/2075-seed-comparison-findings.md`. On the repo rows the engine matches 26 of 28 checks; the 2 close ones are the accent landing one rung off on its ramp. The agent matches 28 of 28, and also fits extra levers by compiling and comparing. The reference brand's key has no accent (Q-BK6), so both paths' amber scores `extra`. The engine rules were tuned on these rows, and no repo row has layers, so the external rows are the real test.

### Traps for whoever re-verifies

- **Ramp before hue.** Prism 2's two brand hues are 23° apart. Grouping colors by hue alone merged them, then rejected the accent as too close. A color that a stepped variable (`…/650`) holds now joins that ramp's family, and only colors outside any ramp fall back to a 15° hue cluster. The `#2075 seed` arm "a secondary-named ramp 23° from the primary is the accent" fails by name with the old 25° separation.
- **State and inverse roles count half.** Without that, an action role's hover and pressed variants outvote its rest color, and the primary lands two rungs dark.
- **Selection-control sizes are not the control height.** Prism3's own emission has `control/size/md/height` = 20px (a checkbox). Reading it set density to compact. Density and radius skip names with `control`, `checkbox`, `radio`, `switch` or `toggle`.
- **The action palette reads the main action at rest.** Prism 2 also has `action/accent/*` and `action/neutral/*` roles, the emissions have `interactive/destructive/*`, and the reference brand's button text is white. Counting any of them votes the wrong palette, so rank words (`secondary`, `neutral`, `accent`, `destructive`, …), state words and near-white values are left out. The `#2075 seed` arms for the neutral and accent action fail by name when the neutral vote, the rank filter or the near-white skip is removed.
- `test.ts` needs an unshallowed clone (an unrelated arm runs `fold.ts`): `git fetch --unshallow` first in a fresh cloud checkout.
