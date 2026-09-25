# tools/figma-bridge — drive the running plugin from a local Claude Code session

The agent link's **transport B**. A local MCP server that sends commands to the Prism3 plugin running
in the owner's Figma desktop app, and returns the plugin's result envelopes. It speaks the same
protocol as the file mailbox (`tools/figma-mcp/README.md` §5); use it for large sweeps, where a
round trip through the file for every command is too slow.

The plugin does the writing. This server only carries commands in and results out.

## Set up (once, on the owner's machine)

Register the server with Claude Code as a stdio MCP server:

```bash
claude mcp add prism3-figma -- npx tsx /path/to/prism3/tools/figma-bridge/server.ts
```

It listens on `ws://localhost:17331`. That is the one origin the plugin manifest lists under
`networkAccess.devAllowedDomains`, and Figma refuses any origin it does not list. `--port` (or
`PRISM3_BRIDGE_PORT`) changes the server's port for tests or a collision, but the plugin still
connects to 17331 unless the manifest entry and `BRIDGE_PORT` in
`apps/plugin/src/agent-bridge-relay.ts` change with it.

The shipped `allowedDomains: ["none"]` is unchanged. `devAllowedDomains` applies only to a plugin
imported from its manifest for development.

## Use

1. The owner opens the file, runs the Prism3 plugin (a development import of
   `apps/plugin/manifest.json`, freshly built), and switches **Agent link** on. The chip reads
   `+ desktop bridge` once the plugin has connected. It retries every 2 s, so the server can start
   before or after the plugin.
2. `figma_status` — `connected: true`, plus the link state the plugin last reported.
3. `figma_run { cmd: "status" }` — confirms the round trip, the engine version and the plugin build.
4. `figma_run { cmd, args, timeoutMs }` for each command. The result is the protocol's result
   envelope, unchanged: `result.verdict` is the panel's own verdict, `result.data` the structured
   facts, `result.logs` the console lines, `progress` the build readings. A command that was not run
   comes back with `error` (`unknown-command`, `bad-version`, `bad-args`, `link-off`,
   `handler-threw`).
5. `figma_logs { since }` — the console and progress lines streamed during runs. Pass the `last` value
   from the previous call to read only new lines. While a `figma_run` is in flight, the same lines
   arrive as `notifications/message`, and progress arrives as `notifications/progress` when the
   request carries a `progressToken`.

Commands: `status`, `apply-theme {input}`, `build-components {def?}`, `file-setup`,
`prune {input, confirm}`, `readback` — the same six as the mailbox, run through the same handlers the
panel's buttons reach. `prune` with `confirm: true` deletes; send `confirm: false` first and report
the preview.

One command runs at a time. `figma_run` fails as a tool error (`isError`) only when no result can
come back: no plugin connected, a timeout (default 600 s), or the plugin disconnecting mid-run. A
result whose `ok` is false is the action's own verdict and arrives as a normal result.

## How it is built

- `server.ts` — the stdio JSON-RPC loop (hand-rolled like `packages/engine/mcp.ts`, reusing its
  protocol constants) and an RFC 6455 WebSocket server on `node:http` + `node:crypto`, with no `ws`
  package. It binds loopback only (127.0.0.1, and ::1 where available).
- `apps/plugin/src/agent-bridge-relay.ts` — the plugin side. It runs in the UI iframe, since the main
  thread has no network, and relays commands to the main thread's dispatcher.
- `apps/plugin/test-agent-bridge.ts` — the gate, an arm of the plugin's `test` step. It spawns this
  server, speaks MCP to it over stdio, drives its socket with a hand-rolled client (fragmented,
  64-bit-length, ping, unmasked and disconnect cases), then connects the real relay to the real
  `main.ts` and proves a `figma_run` reaches the panel's own handler.

**Not yet verified live:** that Figma's desktop app lets a development plugin's iframe open
`ws://localhost:17331` under `devAllowedDomains`. Confirm this on the first run: switch the link on
with the server running, then check that `figma_status` reports `connected: true`.
