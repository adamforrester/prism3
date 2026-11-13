## (2026-11-12) — One file-wide write hold: Theme, prune, builds and agent writes exclude each other (#3697 R7)

The owner decided R7 (#3697 M2) as recommended: a single file-wide write hold replaces the per-operation one #1957
recorded in `run-guard.ts`. Apply Theme yields between its seven stages, so under the old hold an agent's
`build-components` or prune confirm arriving mid-apply was not refused and ran against a half-written variable layer.

### What changed

- **`createRunGuard` holds one slot.** `busy()` is now "any write holds the file", the check every `guarded` entry,
  the agent dispatcher's `refuse` and the style-guide cleanup make. `held()` names the holder; `holding(cmd)` keeps the
  per-operation questions that were never about refusing (Update's Stop, the style guide's Cancel, the hand-edit
  pass's staleness). Every write command already went through `guarded` or `refuse`, so no command moved; only what
  "busy" means did.
- **A refusal names both.** `refused` keeps `cmd` (the write asked for, which the panel's Activity row and pending
  state are keyed by) and adds `held` (the write holding the file). The panel's reducer used to clear a declined
  request's pending only behind an agent's run of the same operation; it now clears it unless the panel's own run of
  that same operation holds the file, so a build declined behind Theme no longer stays pending forever.
- **Words unchanged.** The refusal still reads "Update file is already running. Try again when it finishes." (#3264
  decision 2). A draft that names the holder is offered in the PR, not shipped.

### For whoever re-verifies

- `test-agent-link.ts`'s `busy/keying` arm asserted the old behavior (a file setup runs mid-apply). It is now
  `busy/one hold`: mid panel apply, the panel's file setup, an agent's build and an agent's prune delete are all
  refused as busy, naming Theme as the holder, and the apply's verdict is the baseline's. Restoring a hold per
  operation fails every `busy/one hold` arm by name.
- `test-host-session.ts` carries the reducer's two new cases (a build declined behind an agent's apply, and behind the
  panel's own).
