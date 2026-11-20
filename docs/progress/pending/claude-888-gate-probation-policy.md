## (2026-11-19) — CONTRIBUTING §3 records the gate probation policy (#888)

**What.** Owner decision #888 A lands as a §3 subsection beside "Adding a gate? Prove it can fail": a new gate fails
builds from the PR that adds it; a gate that genuinely needs probation runs as a separate, non-required job; and a
required gate step never carries `continue-on-error` or a step-level `if:` that skips it.

**Why it was worth writing down.** The measurement behind the rule is not guessable: with `continue-on-error: true`,
GitHub reports the step's own conclusion as `success` when its command exits non-zero, not only the job's (#775). It
had lived in one `ci.yml` comment and the header of `lint-doc-gates.ts`. The enforcement already exists: #3958 made
`lint-doc-gates.ts` fail a gate step carrying either, so this PR is prose only and moves no gate.
