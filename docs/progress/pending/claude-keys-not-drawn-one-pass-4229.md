## (2026-11-19) — The token-usage report probes each component's shared keys in one projection, not one per key

`keysNotDrawn` (#3157) found the keys no plan draws by projecting the whole variant set again for each key that shares its token. That is (shared keys) × (members) work, 152,724 member projections at the audit's base (#4229), and the largest single cost in `regen.ts`, which runs twice per `verify` (once in `regen --check`, once in `test.ts`'s fold replay).

### What changed

`keysNotDrawn` points every shared key at its own probe name (`zz-report-probe.<key>`) in ONE projection, and reads which probes the members bind. That matches the per-key answer as long as no projection rule compares two keys' refs. Measured before switching, over all 61 projected defs: identical sets for 60 of them. The 61st, `banner`, throws, because its projection reads the shared `gap` as a space-ladder value (#3225). A def that throws that way takes the old per-key path, kept as `keysNotDrawnPerKey`, which skips only the refusing key.

Timing, `npx tsx packages/engine/emit-analysis-reports.ts`, twice each on one machine: main 13.5 s and 13.8 s; this branch 1.7 s and 1.5 s. `git status` stays clean after the emitter runs, so every report is byte-identical.

### The arm, and its mutations

A new `test.ts` arm, at the end of the section holding #3157's divider arm, compares the two paths. It covers the seven defs whose answer is not empty and whose sets are cheap to probe per key (`divider`, `checkbox-row`, `radio-row`, `icon`, `tag`, `badge`, `wallet-button`), plus `banner`, which must report `via per key`. It takes about a second. It also asserts each compared answer is non-empty, so it is never comparing two empty sets.

- On main's emitter: `#4229: emit-analysis-reports exports keysNotDrawn (one pass) and keysNotDrawnPerKey (the oracle)`.
- With the per-key fallback deleted: `#4229: banner's one-pass probe threw instead of answering: spacePx: 'zz-report-probe.gap' is not a step of the space ladder`.
- With one shared key left un-repointed, which stands in for a rule that compares refs: `#4229: divider's keys no plan draws are the same probed in one projection as one key at a time (…)`, and the same for `icon` and `tag`.

### Trap

The button family (576 members, 40 probes each) is not in the arm, because probing it per key is the cost this change removes. Its one-pass answer was compared offline with the per-key one and matched. A future rule that compares refs and changes only the button family's answer would move `docs/public/reports/token-usage.*`, so `regen --check` would name the drift, not this arm.
