## (2026-11-17) — The engine's reports print contrast ratios floored, through `formatRatio` (#3759)

**What.** `emit-dtcg.ts` wrote each contract row of `modes-report.md` with `r.ratio.toFixed(2)`, which rounds, so a
4.496 pair under a 4.5 floor could print `4.50` beside a ❌ (the #3697 L3 failure, in an artifact). The row is now an
exported pure function, `contractReportRow`, that prints through `formatRatio(r.ratio, { bare: true })`. The two ratio
lines in `nb-regression.ts` (the contract table and the canary cross-check) had the same hand-rolled form and move with
it. Measured plan diff: 1,770 of 3,824 contract cells in `modes-report.md` drop by exactly 0.01, across all four brands
and every mode; no other column, row or mark changes. Eight lines of `nb-regression-report.md` drop by 0.01. No token,
`.ai.json` or Figma artifact moves.

**Tests.** `test.ts` drives the row at 4.496/4.5 (prints `4.49`, ❌), reads the committed report back (every printed
contrast agrees with its mark, over all 3,824 rows), and extends the #3750 source scan to `packages/engine`. Gates
(`lint-*.ts`) and tests are out of scope: their messages are diagnostics, not artifacts. Two lines in `modes.ts` are
named exemptions that must still match: the `border.secondary` target (an aim, not a measurement), and the state-label
note's one-place "about N:1", filed as #3840 because its form is a copy decision. Mutations: putting main's
`toFixed(2)` back fails the row test and the engine scan by name; main's `nb-regression.ts` fails the scan and the
represented check; one corrupted report cell fails the read-back.

**Left apart.** `tree.ts`'s `floor2` (bare, trimmed zeros, into token descriptions) already floors, so it does not
round a failing pair up; it keeps its own format.
