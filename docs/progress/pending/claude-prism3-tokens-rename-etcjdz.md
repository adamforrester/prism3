## (2026-11-17) — Register the three #2087 test arms main went red on

Main's `engine` job failed `lint-test-arms` after two PRs crossed. The #2087 PR added named arms to
`apps/plugin/test-agent-link.ts`, `apps/studio/test-host-session.ts` and
`apps/studio/test-write-adapter.ts`, and the test-arms registry (#3905) landed beside it without them.
Each PR passed against its own base, so neither run could see the other's arms. The fix is the
gate's own `--accept`: it adds the three lines to `packages/engine/test-arms.txt` and removes
nothing. No test, suite or engine behavior changes.
