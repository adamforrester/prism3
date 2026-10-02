## (2026-10-02) — The plugin's main thread refuses a second write of an operation while one is running (#1957)

**STATUS: PR #1988 open from `plugin/busy-guard-1957`, on `main` after #1956 squash-merged.** Plugin and UI only. No engine change and no emitted artifact moves, so ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. This is #1957's main-thread half. #1956 carries the UI half (busy controls). It is a separate PR because it adds a wire message, a reducer rule and a drawer history entry, and #1956 had already been reviewed.

**What changed.** The panel's buttons and the agent dispatcher both call the `ACTIONS` table in `main.ts`, so that table is where the guard sits. Each write entry is wrapped by `guarded(cmd, fn)`, over a `createRunGuard()` set in the new `run-guard.ts`. A second call of the same operation while one is running posts `{type: 'refused', code: 'busy', cmd, agent, message}` and runs nothing. The busy check and the hold are one step, with no await between them, and the hold is released in a `finally`. Different operations are not serialized. That was not asked for, and the agent link already runs its own commands one at a time.

**Owner decisions (2026-10-02), as built and confirmed on the PR.**
- Error code `busy`; message "‹Operation› is already running. Try again when it finishes."
- The row keeps showing the running write. The refusal goes straight into Earlier results with the verdict "Refused" (not "Failed") and the busy message as its details.
- It is not counted in "N need attention" and does not open the drawer.
- The live line reads "‹Operation› already running; the second request was declined."
- An agent sees the code in its own command result.

**Technical calls.**
- **The agent's command is refused before the brackets.** `Deps.refuse` is asked before `onStart`, so a declined command never posts `agent-started` and never shows as an agent's run. The dispatcher forwards the refusal to the panel and returns `failedResult` with `{code: 'busy'}`.
- **A prune preview is exempt.** It writes nothing, so it is never refused and never holds the prune. Only `confirm: true` is guarded. The read-back is not guarded.
- **The `unpend` rule.** A refusal settles no run and fills no verdict slot, because the running write's verdict is still coming. There is one exception. When the panel's own request is declined behind an agent's run of the same operation (`!agent && agentRun.op === op`), the panel's `pending` gets no verdict, so the reducer clears it. A panel request declined behind the panel's own run leaves `pending` to that run. The ordering makes this decidable: main posts `agent-started` before running the command, so a raced panel refusal reaches the UI after `agentRun` is set.
- `refused.n` increments on every refusal, so two identical ones are still two changes to the drawer.
- The drawer's "run ended with no verdict" revert skips refused history entries.

**Suites.**
- `test-agent-link.ts`: `busy/panel`, `busy/agent`, `busy/agent-first`, `busy/release`. Each held write's verdict is compared byte-for-byte against a baseline from a lone apply.
- `test-host-session.ts`: `refused:` arms.
- `test-write-adapter.ts`: parsing.
- `test-build-verdict.mjs`: a `#1957` arm for the owner's row behavior.

Mutations, each failing by name:
- the guard's `busy` check removed → `busy/panel`, `busy/agent-first`;
- `refuse` removed → `busy/agent`;
- the release moved out of the `finally` → `busy/release`;
- `unpend` dropped, the refusal filling the apply slot as a failure, `n` pinned → `refused:`;
- the adapter accepting any code → `drops refused with another code`;
- the drawer branch removed, or the refusal opening the drawer → `#1957 …`.

**Traps for whoever re-verifies this.**
- The suite's host has no `loadFontAsync`, so an apply there fails synchronously in `fontPreloadApiOf`, before its first await. A gated host read is never reached, and every busy arm then fails for a reason unrelated to the guard. The busy section therefore gives the host a `loadFontAsync` and gates `getLocalTextStylesAsync`, the first host read of an apply, restoring both afterwards.
- The suite's spies wrap the `ACTIONS` entries from outside, so throwing from `duringCall` never reaches the guard's `finally`. `busy/release` therefore drives `createRunGuard` directly with a rejecting write.
- Writing the refusal as the row's *result* is an equivalent mutation in the drawer. A running row shows its run, and the run's own verdict replaces the result, so no arm claims it. Counting a refusal as needing attention can only come from the reducer, because the drawer's counts read the host session's slots. The `refused:` arms catch it there.
