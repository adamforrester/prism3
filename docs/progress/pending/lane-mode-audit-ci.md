## (2026-10-01) — The mode audit gates in CI on its own instrument, until S13 deletes it (#1897)

**STATUS: PR open from `lane/mode-audit-ci`, labeled DO NOT MERGE.** CI and docs only: no ENGINE bump, no CONTRACT bump, no change note. The owner decided on 2026-10-01 to run the audit in CI without `--check-badges` and to remove the step at S13.

**What was wrong.** #1891 moved `apps/studio/mode-audit.mjs` onto `data-p3` hooks under the hook guard (#1829) and made it exit 1 when its own checks fail, but it stayed out of `ci.yml`. Three hooks are read by this audit and nothing else: `section-head`, `section-title` and `mode-scope-badge`. A redesign slice could drop one with every gate green, which is the #1829 risk one level down.

**What changed.**
- **A new `ci.yml` step**, "Studio mode audit can still find what it measures (#1897, removed at S13)", runs `npm run -w @prism3/studio audit:modes`. It comes last, after the smoke suite, and installs Chromium the same way the smoke step does, so it does not depend on step order. It takes about 30s locally.
- **A matching `verify.ts` row** (`mode-audit`, `after: ['build-web', 'smoke']`, the shared Chromium precondition), so the browser preflight covers it too.
- **One line each** in `CLAUDE.md` §4, `CONTRIBUTING.md` §3 and the PR template, which `lint-doc-gates.ts` requires.
- **Each site says the step is removed at S13.** S13 in the implementation plan now names the step, its `verify.ts` row and its three checklist lines. `mode-audit.mjs`'s header said "NOT IN CI, deliberately", so that one comment paragraph is rewritten. No code in the file changed.

**Why without `--check-badges`.** With the flag, the audit is red on `main` over #1887's mismatches. Without it, the table is a report and the run exits 1 only through its own `ok()` checks: a hook it names never rendered, a page's section heads and titles disagree in count, or no control label was read. That is the instrument the hooks hold up, and it is what this step gates.

**Mutations** (each run after a `wip:` commit, with the diff checked non-empty):

| Mutation | Fails | By name |
|---|---|---|
| Drop `section-head` at the Links render site in the built `dist/main.js` | `audit:modes`, exit 1; `verify.ts mode-audit` FAIL | `Interactive: every section title sits in a section the audit can find (7 section head(s), 8 title(s))` |
| Drop `section-head` at all four sites in the bundle | `audit:modes`, exit 1 | the same check on all six bar pages, plus `data-p3 hook "section-head" is used by this suite but never appeared in the rendered DOM` |
| Drop `mode-scope-badge` in the bundle | `audit:modes`, exit 1 | `data-p3 hook "mode-scope-badge" is used by this suite but never appeared in the rendered DOM` |
| Remove the `audit:modes` line from `CLAUDE.md` §4 | `lint-doc-gates.ts` | `"Studio mode audit can still find what it measures (#1897, removed at S13)" is missing from CLAUDE.md §4` |
| Remove the `verify.ts` row | `lint-doc-gates.ts` | `ci.yml runs "Studio mode audit can still find what it measures (#1897, removed at S13)" — verify.ts does NOT` |

The bundle mutations edit the git-ignored build output, so no `apps/studio/src` file was touched. The bundle was rebuilt afterward and compared byte-identical to the original.

**Traps for whoever re-verifies.**
- **The audit holds port 8899.** The smoke suite and both plugin suites use an ephemeral port, and the audit does not. CI runs one job, so this cannot collide there. But two lanes running `npm run verify` on one machine can now both reach `mode-audit` at the same time, and the second fails with `EADDRINUSE`. That is loud, not silent, and it is not about the diff. Filed as #1898, not fixed here, because this lane does not change the audit's code.
- **The "TWO gates here that need a browser" comment on `smoke` in `verify.ts` was already stale** (the plugin verdict and start suites share the precondition too). Left as found.
