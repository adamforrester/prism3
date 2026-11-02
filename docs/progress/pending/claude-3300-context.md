## (2026-11-02) — Agent link: a read-only `context` command, what the open file is (#3300 B)

**What landed.** `context` (no args) answers an agent's first question in a file: what it is. It is the owner's Q3300.2 A, a read-only command in #3293's family (`apps/plugin/src/agent-reads.ts`). It returns:
- `file`: name, current page and page count;
- `prism3`: the stored brand (`source: local | none | unreadable`), its id, name and modes, the plugin's engine and the newest engine any set was built with (`lastBuilt`), the variable collections, and whether the file is themed;
- `sets`: present, due with why, and queued. These come from the as-built ledger alone, as the read at open does (`ledgerDue`, now shared with `ledgerSets`), so `partial: true`;
- `protected`: what Q3147.11 protects by default: FINAL pages, locked nodes and `Original · …` copies, each `{ id, name, page }`, with counts;
- `commands`, split into read and write;
- `readFirst`, the bridge's resources (#3300 A);
- `engineMcp`, which points at `prism3-engine` and its `validate_brand`, `theme_brand` and `export_theme` (Q3300.4 A);
- `unreadable` and `truncated`.

It answers over the mailbox and the bridge, posts no verdict, writes nothing, and `AGENT_PROTOCOL_VERSION` stays 1.

**The protected walk.** It is one walk over every page, capped at 20,000 nodes (`truncated`), with at most 50 nodes listed per kind (the rest are counted). A FINAL page is listed and not walked, because all of it is protected. The walk does not go inside a locked node, an original or an instance. The rules are one exported constant, `PROTECTED_DEFAULTS`, for Phase 2b's guard to read too.

**Deviations from the proposal's illustrative example, each on purpose:**
- `protected.locked` and `.originals` are lists with `counts` beside them, not bare counts, because §7 asks for each to be "listed exactly".
- `engine.lastApplied` is `lastBuilt`. The file records no engine version for a theme apply, but the ledger records one per set.
- `protected.note` doesn't say writes refuse these, because the guard is Phase 2b and isn't built yet.
- `readback` is in the read list, because `commands.json` says it writes nothing.

**Version class: `minor`, not the proposal's `patch`.** By the change-note policy, a new command is a behavior change, and `commands.json`, a committed artifact, moves with it. `activity` (#3309) declared the same.

**Tests.**
- **The read loops.** `context` joins the read loops in `test-agent-link.ts` and `test-agent-bridge.ts`: `mailbox/context`, `bridge/context`, `envelope/context` and `no-write/context`, against `contextExpected` in `agent-read-fixture.ts`.
- **The fixture** gains a FINAL page, a locked frame with a locked child, and an `Original · Checkout` frame with a locked instance inside. A child inside a protected node is not listed apart.
- **Mailbox arms.** `context/protected/final`, `/locked` and `/originals` check each list on its own line. `context/brand` checks that a stored brand reads as `local` with its id, name and modes, and that a blob this build can't read says `unreadable`.
- **Bridge arms.** `context/commands` checks the read list against every command `commands.json` (the authored `WRITES` in `emit-agent-reference.ts`) says writes nothing, and the write list against every other. `context/engine-mcp` checks the server against the engine's `SERVER_INFO.name` and each tool against `commands.json`'s MCP tools.
- **Docs.** `commands.json` is regenerated (`emit-agent-reference.ts` isn't part of `regen.ts`). The ecosystem map gains a `read-context` feature. The agent-link guide, the plugin README, the bridge README and the mailbox runbook list the command, and the guides' line citations into `main.ts`, `agent-dispatch.ts` and `agent-protocol.ts` move with the code.

**Mutations, each failing by name:**

| Mutation | Fails |
|---|---|
| The FINAL test dropped | `context/protected/final` |
| The walk going inside a locked node | `context/protected/locked` |
| The `Original · ` test dropped | `context/protected/originals` |
| `page.name` reassigned in the walk | `no-write/context`, on both transports |
| `readback` dropped from the read set | `context/commands` |
| The engine server misnamed `prism3` | `context/engine-mcp` |
| An unreadable brand reported as `none` | `context/brand` |
