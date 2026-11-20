## (2026-11-19) — The token-usage report probes each component's shared keys in one projection, not one per key

`keysNotDrawn` (#3157) found the keys no plan draws by projecting the whole variant set again for each key that shares its token. That is (shared keys) × (members) work, 152,724 member projections at the audit's base (#4229), and the largest single cost in `regen.ts`, which runs twice per `verify` (once in `regen --check`, once in `test.ts`'s fold replay).

### What changed

`keysNotDrawn` points every shared key at its own probe name (`zz-report-probe.<key>`) in ONE projection, and reads which probes the members bind. That matches the per-key answer as long as no projection rule compares two keys' refs. Measured before switching, over all 61 projected defs then (63 on main since, re-checked): identical sets for every one but `banner`, which throws because its projection reads the shared `gap` as a space-ladder value (#3225). A def that throws that way takes the old per-key path, kept as `keysNotDrawnPerKey`, which skips only the refusing key.

Timing, `npx tsx packages/engine/emit-analysis-reports.ts`, twice each on one machine: main 13.5 s and 13.8 s; this branch 1.7 s and 1.5 s. `git status` stays clean after the emitter runs, so every report is byte-identical.

### The arm, and its mutations

A new `test.ts` arm, at the end of the section holding #3157's divider arm, compares the two paths. It covers every def whose answer is not empty, 17 of them (`divider`, `checkbox-row`, `radio-row`, `icon`, `tag`, `badge`, `wallet-button`, the button family with `link`, and the six text fields), plus `banner`, which must report `via per key`, and a banner stub with one key no part binds, so the fallback's answer is checked and not only that banner takes it. It takes about 13 s. It also asserts each compared answer is non-empty, so it is never comparing two empty sets.

- On main's emitter: `#4229: emit-analysis-reports exports keysNotDrawn (one pass) and keysNotDrawnPerKey (the oracle)`.
- With the per-key fallback deleted: `#4229: banner's one-pass probe threw instead of answering: spacePx: 'zz-report-probe.gap' is not a step of the space ladder`.
- With one shared key left un-repointed, which stands in for a rule that compares refs: `#4229: divider's keys no plan draws are the same probed in one projection as one key at a time (…)`, and the same for `icon` and `tag`.

### Trap

A new def whose answer is not empty is not compared until its id joins the arm's list. `regen --check` does not cover it: `regen.ts` rewrites `docs/public/reports/token-usage.*` with the one-pass answer, so a ref-comparing rule that moved only that def's answer shows up only as a report diff in review. The review of #4278 found this gap in the first draft, which left the button family and the fields out of the arm.
