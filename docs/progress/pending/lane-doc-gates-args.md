## (2026-10-01) — The doc/CI gate check compares each step's arguments, so a flag dropped from ci.yml or verify.ts alone fails by name (#1919)

**STATUS: PR open from `lane/doc-gates-args`, labeled DO NOT MERGE.** Lint only: no ENGINE bump, no CONTRACT bump, no change note. No emitted artifact moves. `ci.yml` and `verify.ts` are unchanged.

**What was wrong.** `lint-doc-gates.ts` paired a `verify.ts` row with a `ci.yml` step by `- name:` and compared nothing else. The review of #1917 confirmed it by mutation: dropping `--check-badges` from the mode-audit step in `ci.yml` alone (R7) left the gate at exit 0. CI and a local `npm run verify` then ran different gates under one name.

**What changed.** A fifth arm, `runnerArgvDiff`. For every runner row with a `cmd` (67 today), it reads the matching step's invocation line and compares it to the row's argv word for word. Choices that were deliberate:
- **The invocation is a line that starts with `npm run`, `npx … tsx` or `sh`.** Other lines are setup, and today that is only `npx playwright install`, which `verify.ts` replaces with a precondition. A step must yield exactly one invocation. That rule also makes an inline env prefix (`GITHUB_EVENT_NAME=push npx tsx …`) fail as "0 invocation lines" instead of being compared with the prefix dropped.
- **Refuse, don't guess.** An invocation line with quotes, `$`, a backslash or a shell operator is a finding. This is a word split, not a shell, the same direction `parseYamlSubset` takes.
- **One normalization only.** `npm run`'s workspace flag (`-w X`, `--workspace X`, `--workspace=X`, before or after the script) collapses to one form. The `--` separator stays literal, because `npm run s --flag` gives the flag to npm. The `tsx@4` pin stays literal too.
- **Environment is not compared.** No step has an `env:` map today. Variables Actions sets itself are not arguments.
- **The normalizer is pinned from outside.** It is the one function both sides go through (`docs/34` shape 11), so its self-checks compare it to literal arrays, never to its output on the other side.

**R6 is not caught, and that is held for the owner.** Dropping the flag from both files leaves the two copies agreeing, and a parity check cannot see that. The three checklists do name `audit:modes -- --check-badges`, so the prose could serve as a third oracle. But that needs a rule for which mention of a gate is its run line. `CONTRIBUTING.md` §3 also documents `token-contract.ts --accept`, and `CLAUDE.md` §4 lists every studio script on one line with the flag in a separate code span. Deciding what the docs must say is a docs-contract decision, not a fix.

**Mutations** (after a `wip:` commit, each diff checked non-empty, restored with `git checkout --`):

| Mutation | Exit | Fails by name |
|---|---|---|
| R7: `--check-badges` dropped from `ci.yml` only | 1 | the mode-audit step, `only in verify.ts: -- --check-badges` |
| R7': dropped from `verify.ts` only | 1 | the mode-audit step, `only in ci.yml: -- --check-badges` |
| R6: dropped from both | 0 | not caught (held, above) |
| `regen.ts --check` → `regen.ts` in `ci.yml` | 1 | "Committed artifacts have not drifted", `only in verify.ts: --check` |
| `tsx@4` → `tsx@5` on one `ci.yml` step | 1 | "Component paint is where the defs say it is" |
| `GITHUB_EVENT_NAME=push` prefix on one `ci.yml` step | 1 | "The emission moved only with ENGINE_VERSION", 0 invocation lines |
| Equivalent: `npm run audit:modes -w @prism3/studio -- --check-badges` | 0 | passes, as it should |
| Equivalent: `npm run test:start --workspace=@prism3/plugin` | 0 | passes, as it should |
| R7 live, arm 5's exit disabled | 0 | none, so arm 5 is why R7 fails |
| `canonicalArgv` normalizes nothing | 1 | self-check: the three equivalent spellings named |
| `canonicalArgv` returns `[]`, with R7 live | 1 | self-check: "misses a flag dropped from ci.yml only — #1919's R7" |

The last row is the shape 11 case. With every argv reduced to nothing, the real comparison would pass R7. Only the literal self-checks catch it.

**Trap for whoever re-verifies.** A new CI step whose `run:` is not plain words (a pipe, a `$VAR`, a quoted argument) now fails this gate if `verify.ts` runs it as a `cmd`. Write the step plainly, or make the row a `derive` the way the drift-count and `node:`-builtin steps are. Do not widen the word split.
