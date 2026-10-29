## (2026-10-28) — The figma-bridge MCP server negotiates the handshake like the engine server (#3109)

Claude Code refused to connect to `tools/figma-bridge/server.ts`. Its `initialize` answer kept the fallback #1867
removed from `packages/engine/mcp.ts`: it echoed `2026-07-28` when asked for it, and answered `2026-07-28` to any
version it did not know, including the `2025-11-25` Claude Code sends. `2026-07-28` has no handshake, so a client
that sent `initialize` cannot use that answer.

- **The rule is shared, not copied.** `mcp.ts` exports `negotiateHandshakeVersion`, and both servers call it. The
  bridge already imported `mcp.ts`'s protocol constants; what drifted was the one line it copied. The engine server's
  answers are unchanged.
- **One probe table for every server.** `packages/engine/mcp-handshake-probes.ts` holds four `initialize` probes
  (`2024-11-05`, `2025-06-18`, `2025-11-25`, `2026-07-28`) with LITERAL expected answers, not computed by the rule
  they check (`docs/34` shape 1). `mcp-test.ts` and `apps/plugin/test-agent-bridge.ts` drive them over each server's
  real stdio.
- **A register, checked against the tree.** `MCP_SERVERS` maps each server to its suite. `mcp-test.ts` scans
  `packages/`, `apps/` and `tools/` for `initialize` handlers (a `case 'initialize'` or an `=== 'initialize'`
  comparison) and fails by file on one the register does not name, on a
  registered server the scan cannot find, and on a suite that no longer reads the probes.
- **Where it runs.** No new gate. The bridge was already gated: `test-agent-bridge.ts` is an arm of the plugin's
  `test` step, which `verify.ts` and `ci.yml` both run, and `mcp-test.ts` is an engine gate in both.

**Mutations, each failing by name:** the bridge echoing `2026-07-28` again fails three bridge probes
(`2025-06-18`, `2025-11-25`, `2026-07-28`); dropping the `!== LATEST` clause from the shared rule fails the
`2026-07-28` probe in BOTH suites; an unregistered `case 'initialize'` under `tools/`, an unregistered `=== 'initialize'` handler under `tools/`, and a bridge suite that stops
reading the probes each fail the register check.
