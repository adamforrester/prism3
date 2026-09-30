## (2026-09-30) — MCP server: Claude Code can connect; `initialize` answers a handshake revision, not 2026-07-28 (#1867)

**STATUS: PR from `lane/mcp-initialize-fallback`.** ENGINE → {{ENGINE_VERSION}} (change note `packages/engine/changes/lane-mcp-initialize-fallback.md`, `minor`). CONTRACT stands.

**The defect.** Registered with the current Claude Code CLI, the engine's MCP server failed `claude mcp list` with "Server's protocol version is not supported: 2026-07-28". Claude Code sends `initialize` with `2025-11-25`. The server echoed only versions it speaks and otherwise fell back to `LATEST_PROTOCOL_VERSION`, which is `2026-07-28`. That fallback was backwards: `2026-07-28` removed `initialize`, so any client that sends it is on an earlier revision and cannot use the answer.

**The fix.** `initialize` still echoes a version it speaks. For any other version it now answers `HANDSHAKE_PROTOCOL_VERSION` (`2024-11-05`), the newest revision this server speaks that still has the handshake. `server/discover`, the `_meta` version check on stateless requests, and every response shape are unchanged.

**Why nothing caught it.** Both test files drove `initialize` only with exactly `2024-11-05`, or with no version while asserting the `2026-07-28` answer. So they pinned the bug rather than a real client's negotiation. The hand-run check behind #1866's README section had the same blind spot: it spoke `2024-11-05` directly. The #1866 reviewer found this by running the real `claude` CLI.

**Tests.**
- `test.ts`: `initialize` with no version, and with `2025-03-26`, `2025-06-18` and `2025-11-25`, must each answer `2024-11-05`.
- `mcp-test.ts`: over real stdio, a `2025-11-25` `initialize` shaped like Claude Code's must answer `2024-11-05`.
- Mutation: restoring the `LATEST_PROTOCOL_VERSION` fallback fails both files by name.

**Found alongside, filed separately.** `theme_from_brief` returns no decisions log by default, though its description says it returns the same payload as `theme_brand` (#1868).
