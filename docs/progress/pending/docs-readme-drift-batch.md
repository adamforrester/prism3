## (2026-11-10) — README drift: one-line corrections from the 2026-11-10 scan (#3534)

Docs only, no behavior change. A scan of every README under `apps/` and `packages/` against the code found many false
statements. They are all listed in #3534. This PR fixes only the one-line factual corrections that don't overlap another open PR:

- **`packages/engine/README.md`:** regen "runs all eight" steps. It runs every step in `STEPS`, which is 12 today, so the
  number is dropped. "Covers **88** artifacts" now points to `EXPECTED_ARTIFACTS` in `verify.ts` (229 today), the
  single place that count lives, as CLAUDE.md says. "38 levers, 20 `advanced`" is dropped: the manifest has 64 levers
  and 30 advanced, and a hand-written count goes stale again.
- **`apps/plugin/README.md`:** `src/bridge-ui.ts` does not exist. The UI side posts through
  `apps/studio/src/write-adapter.ts`. The `AGENT_COMMANDS` list now names `panels-clean`
  (`src/agent-protocol.ts:41`).

Everything else in #3534 needs a rewrite or touches a section another PR is editing (the Studio README, #3533). It
stays open there.
