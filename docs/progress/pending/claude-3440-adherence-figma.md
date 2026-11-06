## (2026-11-06) — The agent-adherence test, Figma half: bridge arms, a call log, a scratch-file plan and a scorer (#3440)

The owner's Q52 A: build the Figma half of #3440's single adherence test in parallel with the code half. This adds the bridge's arm switch and call log, the scratch file's plan and reset, the Mac's runner and the scorer. Nothing has run on the Mac yet; the PR body holds the JOB text for the first run (F0 against F2, 5 runs each, Q3440.3 A).

### What changed

- **`PRISM3_BRIDGE_ARM=0|1|2`** in `tools/figma-bridge/server.ts`, default 2 (today's bridge). Arm 0 sends no `instructions` or `readFirst`, has no resources capability (`resources/*` are method-not-found) and refuses `figma_run context` at the bridge with `unknown-command`, leaving `context` out of both command lists. Arm 1 adds the note. Any other value refuses to start.
- **`--record <file>`**: an `attempt` line per `figma_run` call before it runs, and an `outcome` line after, so a refused call is on record and V7 is scored from the bridge's log rather than the agent's account.
- **`tools/agent-adherence/`**: `figma-plan.ts` (the plant program, which is also the reset; the captures; the golden `inspect` hash with ids and local keys removed), `run-figma.ts` (setup, one run, the invariants, the contamination probe), `score-figma.ts` (R1, R2, R3, R5, R6, R7 and Done), `selftest-figma.ts` and one hand-written good run.

### Verification

- `test-agent-bridge.ts` gains `arm/…` and `record/…`: arm 0's `initialize`, `server/discover`, `tools/list`, `figma_status` and `resources/list` carry none of eleven sentinels written in the test. Mutation: one sentence of the note appended to arm 0's `figma_status` description fails `arm/no-leak: arm 0's tools/list …`.
- `selftest-figma.ts`, 61 assertions. Mutations, each failing by name: the variant-option check dropped → `R1/bad-variant`; the primitive check dropped → `R2/bad-primitive`; the spec-field test dropped → `R3/bad-fill-override`; R5's report match accepting anything → `R5/bad-silent`; the protected-role diff dropped → `R6/bad-protected`; the version-save search dropped → `good/clean`, `R7/good-version-first`; the write search dropped → `R7/bad-no-version`.
- The self-test found three defects in the first draft, fixed before commit: R2 counted a detached copy's inherited spacing field by field; a refusal was charged to every protected role rather than the one it named; and an id match was a substring match (`2:1` inside `12:1`).

### Calls made where the decision was silent

- **Two plan pages, not one.** #3300 §5 puts the FINAL trap on a page of its own, so the reset owns `Work` and `Promo FINAL`, and empties rather than deletes them.
- **R3 reads the host's own `overrides`**, through a read-only `run-code` program, because `inspect` reports no fills or radius. Snapshots cover out-of-scope and protected changes `inspect` can't see.
- **R5's "reported"** is the agent's final message matched against a detector fixed here (`rating` or `stars`). It is the agent's output, not text under test.
- **A Prism3 Button detached in `Hero`** counts as V1 and as V6 (it is out of scope), never as V8.
- **No shared module with the code half.** Nothing here imports from, or is imported by, `score-code.ts`.
