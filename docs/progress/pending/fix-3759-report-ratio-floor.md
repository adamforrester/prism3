## (2026-11-17) — The engine's reports print contrast ratios floored, through `formatRatio` (#3759)

**What.** `emit-dtcg.ts` wrote each contract row of `modes-report.md` with `r.ratio.toFixed(2)`, which rounds, so a
4.496 pair under a 4.5 floor could print `4.50` beside a ❌ (the #3697 L3 failure, in an artifact). The row is now an
exported pure function, `contractReportRow`, that prints through `formatRatio(r.ratio, { bare: true })`. The two ratio
lines in `nb-regression.ts` (the contract table and the canary cross-check) had the same hand-rolled form and move with
it. Measured plan diff: 1,770 of 3,824 contract cells in `modes-report.md` drop by exactly 0.01, across all four brands
and every mode; no other column, row or mark changes. Eight lines of `nb-regression-report.md` drop by 0.01.

**And the stored ratios (review of #3844).** Four engine sites ROUNDED a ratio to a stored number with
`Math.round(x * 100) / 100`, which the `toFixed` scan could not see. `resolve-preview.ts` was the live one: it stored the
rounded ratio, and Studio's contracts table floored it again, so a 4.496 pair under 4.5 printed `4.50` beside a failing
dot. The preview now stores the raw ratio (re-flooring a floored value can drop a step to float error). `eval.ts`'s
failures, `ai-metadata.ts`'s `contrast_with[].ratio` and its gradient sentence, and the plugin's `set-override` data now
store `floorRatio(raw)`, a new export beside `formatRatio`, which now prints through it. Plan diff: 588 of 1,263
`contrast_with` ratios across the five `.ai.json` files drop by exactly 0.01, none below its floor (the two at their
floor, `nb` `text.on-warning`/`icon.on-warning`, stay); Prism3's `glow` gradient reads 1.87, not 1.88, for black text.
Running Studio's chrome suite on that fix found two more, in the DTCG emission itself, which the chrome oracle reads:
`tree.ts` wrote each semantic color's `contrast` and each primitive's `contrastOnWhite` with `round(x, 2)`, and the
gradient's worst-case pair the same way. They store `floorRatio` too: 2,409 `contrast`, 326 `contrastOnWhite` and 2
`worstOnBlack` values across the five `tokens.json` and Prism3's `gradient-styles.json` drop by at most 0.01; nothing
else moves. #3698 7a's tint check now holds a published contrast to the floor (never above the measured wash, less
than one step below) instead of within ±0.005. No report, `.ai.json` field beyond those above, or contract moves.

**Tests.** `test.ts` drives the row at 4.496/4.5 (prints `4.49`, ❌), reads the committed report back (every printed
contrast agrees with its mark, over all 3,824 rows), and extends the #3750 source scan to `packages/engine`. Gates
(`lint-*.ts`) and tests are out of scope: their messages are diagnostics, not artifacts. Two lines in `modes.ts` are
named exemptions that must still match: the `border.secondary` target (an aim, not a measurement), and the state-label
note's one-place "about N:1", filed as #3840 because its form is a copy decision. The scan now also finds any two-place
`Math.round(… * 100) / 100`, and a `round(…, 2)` helper call on a ratio, contrast or worst case, under `apps/*/src`
and `packages/engine` alike, with a planted self-check (eight shapes, ten decoys); its seven non-ratio matches (three alphas, a measured px, a lever's steps, TokenPress's two px conversions) are named
exemptions that must still match. Mutations: putting main's
`toFixed(2)` back fails the row test and the engine scan by name; putting main's `Math.round` back in
`resolve-preview.ts` fails the scan and the raw-ratio check by name; `round(…, 2)` back in `tree.ts` fails the scan
and #3698 7a by name; main's `nb-regression.ts` fails the scan and the
represented check; one corrupted report cell fails the read-back.

**Left apart.** `tree.ts`'s `floor2` (bare, trimmed zeros, into token descriptions) already floors, so it does not
round a failing pair up; it keeps its own format.
