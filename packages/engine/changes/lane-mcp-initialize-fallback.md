---
engine: minor
---
#1867: the MCP server's `initialize` answered a protocol version it did not speak with its newest,
`2026-07-28`. That revision removed the handshake, so no client that sends `initialize` can use it:
Claude Code asks for `2025-11-25` and refused to connect. `initialize` now echoes a version it
speaks, and otherwise answers `2024-11-05` (HANDSHAKE_PROTOCOL_VERSION), the newest revision this
server speaks that still has the handshake. Stateless requests are unchanged. A behavior change to a
shipped server, so an ENGINE bump. CONTRACT STANDS (no token name moves).
