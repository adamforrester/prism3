## (2026-11-17) — The app test chains hold every suite to an assertion floor, and the export-settings battery drives the shipped rules (#1066)

**What.** Two holes in the Studio and plugin unit tests, both from the 2026-08-26 gate sweep.

- **M23 (docs/34 shape 9).** Each suite printed how many assertions it ran, and nothing read the number. With `ok()`
  neutered, `test-provenance.ts` printed `✅ ALL PASS — 0 assertions executed` and exited 0, and the `&&` chain reported
  PASS. Both apps' `test` scripts now run `run-suites.ts` (repo root). It reads the app's `suites.json`, runs each suite in
  the listed order, and reads the count from the suite's last line. A suite fails by name if it exits non-zero, prints no
  count, or counts below the floor written beside it. Every `test-*.ts` in the app must be listed, either as a suite or
  under `elsewhere` with another `package.json` script that runs it. A suite dropped from the chain used to vanish
  silently. 42 plugin suites and 3 Studio suites printed no count it could read, so each gained an `executed` counter in its `ok()`
  and the count on its summary line. Nothing else in them changed.
- **M24 (shape 2, #387's shape).** The export-settings mutation battery checked its mutants with local copies of the
  shipped predicates. With the `unreachable` rule deleted from `export-settings.ts`, the copy still caught MUTANT 2, so the
  suite certified a rule that no longer existed. `export-settings.ts` now exports the per-item rules (`settingDefects`,
  `identifierHits`, `danglingAliases`). `declarationDefects`, `jargonDefects` and `aliasDefects` call them, and so does the
  battery. Only the cross-setting rule (two settings sharing a key) stays in `declarationDefects`.

**`test-build-verdict.mjs`** (named in the issue) runs under `test:verdict`, not the `test` chain. It gets an in-file
`MIN_ASSERTIONS = 425`, #659's shape. With its `ok()` neutered it now fails
`only 0 assertions ran, below this suite's floor of 425`.

**`lint-doc-gates`' test-file arm (#3727)** read the test files from the `&&` chains. A script that runs
`run-suites.ts` now counts as running the suites its `suites.json` lists (not its `elsewhere`). Dropping
`test-run-ended.ts` from the table fails that arm by name too.

**Floors.** Each floor is the suite's count today, written by hand: 41 Studio suites and 61 plugin suites. A suite that
grows passes. One that shrinks fails until its PR lowers the floor, so the diff has to say why. There is no `--accept`. A
gate allowed to rewrite what it reads has no memory. A floor catches a collapse or a shrink, never a swap of one arm for
another of the same size. Which named arm still runs is #1834's question.

**Measured.** Each mutation ran on a commit of its own.
- M23, `ok()` in `test-provenance.ts` given an early return: the runner fails
  `test-provenance.ts: 0 assertions executed, below its floor of 38`. Before, the chain printed ALL PASS at exit 0.
- M24, the `unreachable` rule deleted from `settingDefects`: `test-export-settings.ts` fails
  `✗ MUTANT setting on the unbuilt source only`. Before, the battery's copy still caught it.
- `test-run-ended.ts` dropped from `apps/studio/suites.json`: fails `test-run-ended.ts: a test file this table does not
  list`.
- First run of the plugin table: `test-slot-migration.ts` failed as printing no count it could read (`all 94 pass`). Its
  line now says `— 94 assertions executed` like the rest.
