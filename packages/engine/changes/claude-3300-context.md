---
engine: patch
---
The agent link answers a read-only `context` command (#3300): what the open file is, for an agent's first read. It names
the stored brand and its modes, the variable collections, whether the file is themed, the sets Prism3 built and which
are due (from the as-built ledger, so partial), the commands that read and those that write, where to read more, and the
engine MCP server to use for brand work. It lists what is read-only by default: pages whose name contains FINAL,
locked layers and Original copies, from one capped walk of every page. It writes nothing. AGENT_PROTOCOL_VERSION stays
1, no emitted token artifact moves, and CONTRACT is unchanged.
