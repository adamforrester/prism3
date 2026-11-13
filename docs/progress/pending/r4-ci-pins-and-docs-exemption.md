## (2026-11-12) — CI: exact Node and tsx, one regen --check, and a named docs-only exemption (#3698 R4)

**What.** Owner decision R4 on #3698 (F5), three parts.

- **Pins.** Node is the exact version in `.node-version` (22.23.4), which every CI job reads through
  `node-version-file`. `tsx` is an exact root devDependency (4.23.15), so `npm ci` installs the version the
  lockfile names and every `npx tsx` runs it: CI, `verify.ts`, the root scripts, the workspace scripts and
  the push hook. Before, CI named `tsx@4` and Node `22`, both floating, and the workspace scripts' bare
  `npx tsx` fetched the latest release.
- **One `regen --check`.** CI's coverage step ran `regen --check` a second time to read its count.
  `regen.ts --check` now writes the count to `REGEN_CHECK_REPORT` when that is set, and only when in sync.
  The coverage step reads the file, so a drift run leaves nothing and the coverage step fails on reading
  nothing. This is the same shape as `verify.ts`'s `drift-coverage`, which reads the gate's captured output.
- **The docs-only exemption.**
  - A new `changes` job runs `.github/scripts/docs-only.sh`. A pull request whose every changed file is docs
    sets `docs_only=true`, and the five browser jobs carry `if: needs.changes.outputs.docs_only != 'true'`.
  - `gates` (`all-gates.sh`) passes a skipped browser job only when `changes` succeeded and said `true`. It
    prints that job as `EXEMPT` and writes `DOCS-ONLY EXEMPTION (#3698 R4)` to the run summary.
  - Any other skip fails, as before. The `engine` job always runs.

**The gate for it.** `test-docs-only.sh` checks the classifier and the aggregator's half by literal cases.
`classify/docs+app` is the brief's mutation: a docs change that also touches an app file is not exempt. It
runs in the `engine` job, because a job the exemption can skip cannot be where the exemption is checked.

**The shape check.** `lint-doc-gates.ts` gains `exemptionGaps`. The jobs carrying the exemption's `if:` and
`EXEMPT_JOBS` in `all-gates.sh` are authored separately, so they are compared in both directions. Each exempt
job must need `changes` and be a browser job, meaning it installs Chromium or needs an exempt job that does.
The engine job therefore cannot be made skippable by editing both files together.

**Why the docs set is narrower than "docs/** or *.md outside apps/".** Two kinds of path would have exempted
real browser-job inputs:
- `docs/public/` is served by the studio at `/docs`, read by `test-chrome`, `test-docs-route` and plugin
  tests, and scanned by the prose gates in `surfaces`.
- `packages/engine/examples/*.design.md` are bundled by the studio.

So `docs/public/`, `packages/` and `skills/` are not docs here. This is flagged as an owner decision on the PR.

**Review fixes (the verdict at 4adedf12).**
- The root `README.md` is not docs: `lint-us-english` scans it and runs only in `surfaces`, so a README-only PR
  could ship an en-GB spelling past a green `gates`. `test-docs-only.sh` gains `scope/lint-us-english` and
  `scope/lint-voice`: each gate's own `--files` list, classified, must hold no docs file. So a docs-only PR never
  skips a prose gate on what it touched, and a surface either gate adds later is checked too. Mutation: the
  `README.md` line dropped from `docs-only.sh` fails `classify/root-readme` and `scope/lint-us-english`.
- `lint-doc-gates.ts` gains `pinGaps`, so the `package.json` comment's claim now holds. It fails on a tsx range,
  a `.node-version` that is not an exact x.y.z, a setup-node step that does not read `.node-version` or names
  its own version, and a `tsx@` spec on a CI step. Each was mutated and fails by name.
- A new `aggregate/docs-only-absent` case covers `changes` succeeding with no `docs_only` output and a skipped browser job: `gates` fails.
