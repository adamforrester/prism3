## (2026-11-19) — The ratio floor keeps an exact step: 4.6 prints as 4.60, not 4.59 (#4211)

`floorRatio` in `packages/engine/color.ts` was `Math.floor(ratio * 100) / 100`. `ratio * 100` carries float error, so 141 of the 2,001 two-decimal values from 1.00 to 21.00 floored one step low (4.6 to 4.59, 4.35 to 4.34, 1.15 to 1.14). Every printed ratio goes through it via `formatRatio`. The fix adds `FLOOR_EPSILON = 1e-9` on the hundredths scale before the floor.

### Why that tolerance, and not a rounding

The float error of `r * 100` for a ratio up to 21 is about 5e-13, so 1e-9 absorbs it with a wide margin. It also lifts only a ratio within 1e-11 of a step, so the reason the floor exists (CR-01, #3697 L3: a failing 4.496 must never read 4.50) still holds. Rounding to N significant digits first would lift a much wider band. Pass and fail never read this value; they read the raw ratio.

### Proof

- `test.ts` (end of the colour math section): literals 4.6, 4.35, 4.5 and 7 print as themselves; a sweep of every two-decimal value 1.00–21.00 floors to itself and re-floors to itself, with the expected string built from the integer step rather than from `floorRatio`; and three near-misses (4.5 - 1e-8, 7 - 1e-8, 3 - 1e-6) still floor below the step. On `main` the first three arms fail by name (141 lose a step).
- Mutation: `FLOOR_EPSILON = 1e-5` fails the near-miss arm by name, so the tolerance cannot quietly grow.
- `regen.ts` writes no changed file: no emitted ratio in any brand sat on one of those float-error steps, as the audit measured.

### The schema says so too (#4214 item 4)

`schema/ai-metadata.schema.json` described `contrast[].ratio` as "to two decimals" without saying it is floored, which #3759 made it. It now reads "floored to two decimals, so it never reads at or above a floor it misses", held by a literal arm next to the floor arms. The rest of #4214 goes to its own PRs.
