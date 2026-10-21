## (2026-10-20) — Every verdict ends with Gaps, and a new mechanism says what it reused (#2850, Q444 A)

**What changed.** Process only, no engine behavior. `CONTRIBUTING.md` §4 now requires every Ready, review, delta and re-gate verdict to end with a `Gaps` section (not done, not checked, risks; `Gaps: none` when empty, never omitted), and requires a PR that adds a new mechanism to say in its body what it reused or why nothing fit. `.claude/commands/review-pr.md` carries the same `Gaps` rule in its verdict section plus a "did the PR re-implement something that exists?" check. The PR template gains one checklist line, `Reuse`, beside the progress and bump lines; the Gates block is untouched, so `lint-doc-gates.ts` is unaffected.

**Not done.** No gate enforces either rule: a verdict is a comment, and "searched for an existing mechanism" is a judgment. Both rest on the reviewer reading for them.
