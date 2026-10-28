/**
 * The `initialize` probes every MCP server in this repo is driven with over its real stdio, and the
 * register of which servers those are (#1867, #3109).
 *
 * The answers are LITERALS, written down here, not computed by `negotiateHandshakeVersion` in `mcp.ts`:
 * a probe whose expectation came from the rule it checks could not fail (`docs/34` shape 1). `2024-11-05`
 * is the one answer a handshake client can use, because `2026-07-28` removed `initialize`; Claude Code
 * asks for `2025-11-25` and refuses a `2026-07-28` answer.
 *
 * `MCP_SERVERS` maps each file that answers `initialize` to the stdio suite that drives it with these
 * probes. `mcp-test.ts` scans the tree for every `initialize` handler and fails, by file, on one this
 * register does not name, or on a suite that no longer reads `HANDSHAKE_PROBES`. So a third MCP server
 * cannot ship with its own copy of the fallback and go unprobed, as the bridge did.
 */
export const HANDSHAKE_PROBES: readonly { asked: string; answer: string; why: string }[] = [
  { asked: '2024-11-05', answer: '2024-11-05', why: 'a handshake revision this server speaks is echoed' },
  { asked: '2025-06-18', answer: '2024-11-05', why: 'an in-between revision gets the newest handshake revision' },
  { asked: '2025-11-25', answer: '2024-11-05', why: 'what Claude Code asks for' },
  { asked: '2026-07-28', answer: '2024-11-05', why: 'a revision with no handshake is never answered' },
];

/** Repo-relative path of each MCP server → the stdio suite that drives it with `HANDSHAKE_PROBES`. */
export const MCP_SERVERS: Readonly<Record<string, string>> = {
  'packages/engine/mcp.ts': 'packages/engine/mcp-test.ts',
  'tools/figma-bridge/server.ts': 'apps/plugin/test-agent-bridge.ts',
};
