## (2026-11-17) — A test arm lost in a merge now fails by name: `lint-test-arms.ts` (#1834)

**What.** A new engine gate, `lint-test-arms.ts`, wired into CI, `verify.ts` and the three checklists. The repo names
its test arms by issue: an assertion label cites the issue it guards (`#1812: …`). The gate reads every `#NNNN` inside
a string or template literal of each test suite, with comments and regex literals skipped. It holds each pair
(suite, tag) to `packages/engine/test-arms.txt`, an authored registry. A registered arm missing from its suite fails as
`ARM GONE`, naming the suite and the tag. An arm the registry lacks fails as `UNREGISTERED` until `--accept` adds it (the file stays sorted, so two PRs adding arms rarely touch the same line).
`--accept` never removes a line. To retire an arm, delete its line by hand in the same diff, where a reviewer sees it.
Scope: every `test-*.ts` and `test-*.mjs` in `apps/studio` and `apps/plugin`, plus `packages/engine/test.ts` and
`mcp-test.ts`. Each of the four surfaces must contribute a suite and an arm, or the run fails as SCANNED BLIND. The
registry starts at 1238 arms over 118 suites.

**Why a registry and not git history.** The incident's arm was added and lost inside one branch, so a merge-base
comparison never sees it. A previous-commit comparison sees it only at the one merge commit, and CI checks out
shallow. `lint-shape-index.ts` rejects git-history oracles for the same reason. The registry is a file the merge does
not drop along with the suite's lines. `UNREGISTERED` is what makes it work: without it, the PR that adds an arm could
skip registering it, and the incident would pass again.

**Measured.** Replaying the incident (deleting `test-write-components.ts`'s #1812 block) fails
`ARM GONE apps/plugin/test-write-components.ts #1812`. Deleting only the three `ok()` lines that carry the tag, while
four comments still name #1812, fails the same way. A new `ok(true, \`#9876 …\`)` fails `UNREGISTERED` by name. Every
run starts with a self-test of the reader (comments, regex literals, nested templates, escapes), so a reader that broke
cannot report every arm present.

**Its limit.** It proves the arm's name is still in the suite's code, not that the code runs. A collapsed suite is
#1066's assertion floors. An arm that cites no issue is not protected. A suite that keeps one `#1812` label and loses
the rest is not caught, because the registry holds names, not counts. Two all-digit three-character hex colors (`#111`,
`#888`) read as tags; registering them is harmless.
