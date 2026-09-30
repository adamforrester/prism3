## (2026-09-30) — Engine README: how to connect an agent to the local MCP server (#1860)

**STATUS: PR from `docs/mcp-connect-readme`.** Docs only, so no ENGINE bump.

**Why.** The owner asked whether someone outside the repo could connect an agent to the engine today. They can: `packages/engine/mcp.ts` is a dependency-free MCP server over stdio. But the only place that said so was the file's own header comment. `packages/engine/README.md` now has a "Connect an agent (MCP)" section covering:
- what you need: Node 20 or later and a clone, with no `npm install`;
- the Claude Code command, and the config for other stdio clients;
- the six tools, with `list_levers` first;
- where `export_theme` writes;
- what the server doesn't do: no Figma writes, and no hosted endpoint.

**Checked by running it, not from the header.** The server was started over stdio with an `initialize` handshake and a `tools/list` request. It printed the ready line on stderr, reported `prism3-engine` at the current engine version, and listed the six tools the README names.

**Left as its own issue.** A hosted (HTTP) endpoint for clients that can only reach a URL is #1859. The transport is small because `handleRpc` is pure and the current protocol is stateless. The open questions are the owner's: hosting, access, `export_theme` on a server, and cost.
