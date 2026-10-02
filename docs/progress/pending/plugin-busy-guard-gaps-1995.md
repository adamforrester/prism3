## (2026-10-02) — The busy guard's untested paths get tests, and a refusal on the agent's sink fails the command (#1995)

**STATUS: PR open from `test/busy-guard-gaps-1995`.** Plugin only, with tests. No engine change and no emitted artifact moves, so ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. No new user-visible strings.

**What was wrong.** The orchestrator's review of #1988 found four mutations that left its suite green. Guarding the prune preview, sharing one hold across every operation, dropping `refuse`, and editing one copy of the operation titles each passed.

**What changed.**
- **`agent-dispatch.ts`.** A `refused` message that reaches the agent's sink now fails the command with its own code and message. Before, it carried no `ok` field, so the success check read it as `ok: true`. `refuse` still declines first, so this is a backstop that is unreachable today.
- **`run-guard.ts`.** `TITLE` is exported, so a test can read it from its own file.

**Suites.** These are `test-agent-link.ts` arms, each failing by name under its mutation:
- `busy/keying`: while an apply is held, a file setup still runs. Under one shared hold, it fails.
- `busy/preview`: while a prune delete is held, a second delete is refused. That is the control. A preview from the panel and a preview from an agent both run to a verdict, unrefused. Three mutations fail it: `writes` returning true for a preview; the panel's prune confirm read as always true; the agent path's confirm read as always true. Unguarding the delete fails the control.
- `busy/sink`: drives `createDispatcher` with a handler that posts the refusal itself, and the command fails as `busy`. Removing the check fails it, with the old `ok: true`.
- `busy/titles`: `TITLE` from `run-guard.ts` against `OP_TITLE` from `shell/activity.ts`, with the key pairing written out in the test. Changing a title in either file fails it.

The issue also asked whether the drawer arm catches a refusal that opens the drawer. Re-run on this base, `#1957 a declined request does not open the drawer — open true` fails by name.

**Why two title tables rather than one.** The plugin's main thread does not import the panel's shell, and `test-shell-imports.ts` holds shell code to its own boundary. A test that reads each table from its own file is the smaller change, and it is independent: neither side is derived from the other.

**Traps for whoever re-verifies this.**
- The prune reads the file's collections, so `busy/preview` gates `getLocalVariableCollectionsAsync` to hold the delete. The previews then wait at the same gate. That is not a refusal, and the arm counts verdicts after the release, not before.
- My first panel-path mutation, `guarded('prune', prune)` with no confirm function, survived. It unguards the delete rather than guarding the preview. That is why the arm now carries the second-delete control.
