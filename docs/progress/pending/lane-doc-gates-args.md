## (2026-10-01) — The doc/CI gate check compares each step's arguments, so a flag dropped from ci.yml or verify.ts alone fails by name (#1919)

**STATUS: PR open from `lane/doc-gates-args`, labeled DO NOT MERGE.** Lint only: no ENGINE bump, no CONTRACT bump, no change note. No emitted artifact moves. `ci.yml` and `verify.ts` are unchanged.

**What was wrong.** `lint-doc-gates.ts` paired a `verify.ts` row with a `ci.yml` step by `- name:` and compared nothing else. The review of #1917 confirmed it by mutation: dropping `--check-badges` from the mode-audit step in `ci.yml` alone (R7) left the gate at exit 0. CI and a local `npm run verify` then ran different gates under one name.

**What changed.** A fifth arm, `runnerArgvDiff`. For every runner row with a `cmd` (67 today), it reads the matching step's `run:` and compares its command to the row's argv word for word. Choices that were deliberate:
- **One command line, and nothing unlisted beside it.** The command is a line that starts with `npm run`, `npx … tsx` or `sh`, and a step must have exactly one. Every other line must be blank, a comment, or on `SETUP_LINES`, a hand-written list that today holds only `npx playwright install --with-deps chromium`. The first version skipped non-command lines, and the independent review of #1933 showed that a second command (`node …`, `npx playwright test`, `bash …`, `npm test -w …`, `npm run-script …`, or `set +e` … `true` around the real one) then rode along with the arm green. That is `docs/34` shape 15.
- **Refuse, don't guess.** A command line with quotes, `$`, a backslash or a shell operator is a finding. This is a word split, not a shell, the same direction `parseYamlSubset` takes.
- **One normalization only.** `npm run`'s workspace flag (`-w X`, `--workspace=X`, `--workspace X`, before or after the script) collapses to one form inside this arm. The `--` separator stays literal, because `npm run s --flag` gives the flag to npm. The `tsx@4` pin and the case of every word stay literal too. In the real file, `npm run --workspace X s` never reaches this arm: the older docs arm reads `--workspace` as the script name and fails the step as undocumented. That failure is loud, not silent, and is filed as #1934.
- **Environment: refused inside `run:`, not compared outside it.** An inline prefix (`GITHUB_EVENT_NAME=push npx tsx …`) or an `export` line fails as an unlisted line. A step's `env:` map passes this arm unexamined. No step has one today, and variables Actions sets itself are not arguments.
- **The arm counts what it compared, not its input.** `runnerArgvDiff` returns the steps it reached a verdict on, and the real run asserts that set equals the set of `verify.ts` rows with a command. Before the review, a skip inside the function left the summary line printing 67 over a smaller comparison (`docs/34` shapes 14 and 21).
- **The normalizer is pinned from outside, in mixed case.** It is the one function both sides go through (`docs/34` shape 11), so its self-checks compare it to literal arrays. The review found every literal lowercase, so a normalizer that lowercased everything passed. The literals are now mixed case (`A.ts`, `@prism3/Sample`, `--check-Sample`), and one check asserts that `--check-sample` against `--check-Sample` is a finding.

**R6 is left to review (owner's decision, #1933).** Dropping the flag from both files leaves the two copies agreeing, and a parity check cannot see that. The three checklists name `audit:modes -- --check-badges`, but using them as a third oracle would need a rule for which mention of a gate is its run line (`CONTRIBUTING.md` §3 also documents `token-contract.ts --accept`). The arm's failure message tells anyone who drops a flag to check the checklists. Nothing enforces it.

**Mutations** (after a `wip:` commit, each diff checked non-empty, restored with `git checkout --` and by trap):

| Mutation | Exit | Fails by name |
|---|---|---|
| R7: `--check-badges` dropped from `ci.yml` only | 1 | the mode-audit step, `only in verify.ts: -- --check-badges` |
| R7': dropped from `verify.ts` only | 1 | the mode-audit step, `only in ci.yml: -- --check-badges` |
| R6: dropped from both | 0 | not caught (left to review) |
| F1: `node apps/studio/scripts/extra-gate.mjs` added under the audit step | 1 | the mode-audit step, "neither the step's command nor allow-listed setup" |
| F1: `npx playwright test apps/studio/e2e` | 1 | same |
| F1: `bash tools/extra/gate.sh` | 1 | same |
| F1: `npm test -w @prism3/studio` | 1 | same |
| F1: `npm run-script -w @prism3/studio extra` | 1 | same |
| F1: `set +e` before and `true` after the command | 1 | same, naming `set +e` |
| `export GITHUB_EVENT_NAME=push` line in the audit step | 1 | same |
| `GITHUB_EVENT_NAME=push` prefix on the emission-version step | 1 | "The emission moved only with ENGINE_VERSION" |
| `env:` map on the emission-version step | 0 | not compared, by design |
| F2: `sh` rows skipped in `runnerArgvDiff`, `--quick` added to the `ci.yml` `sh` step | 1 | self-check: "misses an argument added to an `sh` step" |
| F2, with the skip hidden from the self-checks | 1 | "compared 66 of the 67 … The CLAUDE.md-freshness detector still flags a stale checkout … was NOT compared" |
| F2 hidden, with the scope-equality exit disabled | 0 | none; prints 66, so the equality assertion is why the row above fails |
| F3: `canonicalArgv` lowercases every word | 1 | self-checks: the three equivalent spellings, "rewrites an `npx tsx` argv", R7 both ways, "two flags that differ only in case" |
| `regen.ts --check` → `regen.ts` in `ci.yml` | 1 | "Committed artifacts have not drifted" |
| `tsx@4` → `tsx@5` on one `ci.yml` step | 1 | "Component paint is where the defs say it is" |
| Equivalent: `npm run audit:modes -w @prism3/studio -- --check-badges` | 0 | passes, as it should |
| Equivalent: `npm run test:start --workspace=@prism3/plugin` | 0 | passes, as it should |
| `npm run --workspace @prism3/plugin test:start` | 1 | the older docs arm, not this one (#1934) |
| R7 live, arm 5's findings exit disabled | 0 | none, so arm 5 is why R7 fails |

**Trap for whoever re-verifies.** A step paired with a runner command may now hold only its command plus `SETUP_LINES`. A new setup line (a cache restore, a second browser) fails this gate until it is added to that list by hand. That friction is on purpose. Do not widen the list into a pattern, and do not widen the word split. A step that needs shell syntax belongs in a `derive` row, the way the drift-count and `node:`-builtin steps are.
