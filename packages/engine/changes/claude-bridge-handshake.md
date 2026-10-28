---
engine: patch
---
The figma-bridge MCP server (tools/figma-bridge/server.ts) answers initialize by the engine server's rule (#3109): a client asking
for 2025-11-25, 2025-06-18 or 2026-07-28 gets 2024-11-05 back, and 2024-11-05 is echoed. It answered 2026-07-28 before, which
Claude Code refuses, so the plugin's agent link could not be registered. The rule moves into one exported function in mcp.ts,
negotiateHandshakeVersion, which both servers call; the engine server's answers do not change. The probes live in
mcp-handshake-probes.ts with a register of every MCP server, and mcp-test.ts fails on an initialize handler the register does not name.
No committed artifact or component surface moves, so CONTRACT is unchanged.
