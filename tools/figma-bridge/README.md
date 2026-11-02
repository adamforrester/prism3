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

It listens on `ws://localhost:17331`, bound to loopback only. That is the origin the plugin manifest
lists in `networkAccess.allowedDomains` (since #3147 the relay ships in the network build, "Prism3
Studio"; "Prism3 Studio Offline" has no socket and offers the mailbox only), and Figma refuses any origin
it does not list. `--port` (or
`PRISM3_BRIDGE_PORT`) changes the server's port for tests or a collision, but the plugin still
connects to 17331 unless the manifest entry and `BRIDGE_PORT` in
`apps/plugin/src/agent-bridge-relay.ts` change with it.

**Who may connect: pairing (#3204, the owner's Q3204.1 A).** A connection is not the plugin until it
proves a pairing token. A one-time pairing code is issued only when it is asked for (the owner's
Q3204.5 A): by a `figma_status` call while no plugin is connected, or by starting the server with
`--pair`. The server prints it on stderr, such as `pairing code: 7KQ4-M2XR (live for 10 minutes)`, and
`figma_status` names it (`pairingCode`), since an MCP host may not show stderr. A later `figma_status`
keeps a live code rather than replacing it. The first time the plugin connects on a machine it asks for
that code, and the server answers
with a token the plugin keeps in `figma.clientStorage` (per person, per machine; never in the file or
its plugin data). From then on every connection opens with the server's challenge, and the plugin's
hello carries an HMAC of the token over the challenge's nonce. A connection without a valid proof is
closed (4401) before it is sent any command, and it never replaces a paired plugin that is connected.
A wrong code is closed with 4403; after 5 wrong codes the server retires the code and prints a new one.
A code lasts 10 minutes. After 3 codes are retired, pairing closes until the next request. Once a plugin
has proved its token, no code is live, so a paired machine has none.

The token comes from a random secret the server keeps in a user-only file (mode 0600, in a 0700
directory): `$PRISM3_BRIDGE_CONFIG`, else `~/.config/prism3/figma-bridge.json` (`$XDG_CONFIG_HOME`
when set, `%APPDATA%` on Windows), or the path given with `--config`. Pairing survives a restart.
`--rotate` writes a new secret: every paired plugin then asks for a code again.

The other two checks stay as defense in depth. The server binds loopback only, and it refuses with 403,
before the handshake, any upgrade whose `Origin` is not `null` (#3147); a request with no `Origin` is
refused too. That keeps out a page's own script, but not a page's sandboxed iframe, whose origin is
`null` as well: the review of #3204 drove the bridge from one, which is why pairing exists. `run-code`
stays in the dev build only (Q3147.4 A): a release build answers it `unknown-command`.

## Use

1. The owner opens the file, runs the Prism3 plugin (a development import of
   `apps/plugin/manifest.json`, freshly built), and switches **Agent link** on. The first time on a
   machine, the plugin asks for the server's pairing code under the Agent switch: call `figma_status`
   to get one. The Activity drawer
   reads `Listening · bridge` once the plugin has connected. It retries every 2 s, so the server can
   start before or after the plugin. **One plugin holds the bridge at a time** (#3297). With the link on
   in two files, the file that connected last holds it. The server closes the other file's connection with
   4409, and that file reads `Listening · mailbox` until the holder leaves. Its retries back off from 2 s
   to 30 s and send `yield: true`, so they never take the bridge from the holder. A socket that drops and
   comes back within 5 s does not change the word.
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
   request carries a `progressToken`. The plugin's `done` count restarts at every phase (build,
   wire, each reference back-off `retry` pass), so `progress` is a running count across phases
   that only ever increases, as MCP requires. No `total` is sent, since the run's total is not known
   until it ends; `message` carries the phase's own fraction, e.g. `wire 24/48`.

Commands: `status`, `apply-theme {input}`, `build-components {def?}`, `file-setup`,
`style-guide {collections?, types?, tables?}`, `prune {input, confirm}`, `readback`, `update-components`, `capture-baseline`,
`adopt-members`, `draw-specs` — the same as the mailbox, run through the same handlers the panel's buttons reach — and the
four read-only node commands (#3147 Phase 2a), `inspect {ids, depth?, fields?, maxNodes?}`, `component-keys {names?, sets?}`,
`audit-frames {ids, legacy?, nameRule?}` and `snapshot {id, scale?}`, which write nothing and answer in `result.data`
(the full shapes: `docs/public/reference/commands.json`). `prune` with `confirm: true` deletes; send `confirm: false` first and report
the preview. `status` lists every command the running build answers.

**A dev build of the plugin also answers `run-code {code, timeoutMs?}`** (#2530): `code` runs in the plugin's main
thread as the body of an async function, so it may `await` and `return`, and reaches `figma` as a global.
`result.data.value` is the returned value as JSON, `result.logs` the console lines printed while it ran; a syntax
error, a throw or a timeout (30 s by default, `timeoutMs` up to 600000) comes back as `error.code: 'handler-threw'`.
**A timeout stops the waiting, not the code:** the run may still be going, and a write it makes afterwards can still
land, so read the file again before relying on its state. This server needs no change for it: `figma_run` passes any
`cmd` through. A release build answers it `unknown-command`.

One command runs at a time. `figma_run` fails as a tool error (`isError`) only when no result can
come back: no plugin connected, a timeout (default 600 s), or the plugin not coming back after a
mid-run disconnect. A result whose `ok` is false is the action's own verdict and arrives as a normal
result.

**A reconnect mid-run does not lose the result** (#2497). A long command (a large `update-components`
apply runs for minutes) can outlive the plugin's socket. The server keeps the call waiting for up to
`--grace-ms` (default 120000, or `PRISM3_BRIDGE_GRACE_MS`) for the plugin to reconnect; `figma_status`
lists the waiting ids under `awaitingReconnect`. On reconnect the plugin names the commands it holds
and re-sends its last results by command id. The server answers the call with the first copy and
logs any repeat as ignored. It never sends a command twice, so nothing runs twice. A command the
reconnected plugin does not hold (it never arrived, or the plugin was reloaded) fails at once with
that reason. Progress and log lines streamed while the socket was down are not replayed. After a bridge restart, each
result the plugin still keeps logs "a result for a command this bridge is not waiting on"; that is
harmless.

## How it is built

- `server.ts` — the stdio JSON-RPC loop (hand-rolled like `packages/engine/mcp.ts`, reusing its
  protocol constants and its `initialize` rule, `negotiateHandshakeVersion`: a handshake client gets
  `2024-11-05` back, never `2026-07-28`, which Claude Code refuses, #3109) and an RFC 6455 WebSocket server on `node:http` + `node:crypto`, with no `ws`
  package. It binds loopback only (127.0.0.1, and ::1 where available).
- `apps/plugin/src/agent-bridge-relay.ts` — the plugin side. It runs in the UI iframe, since the main
  thread has no network, and relays commands to the main thread's dispatcher.
- `apps/plugin/test-agent-bridge.ts` — the gate, an arm of the plugin's `test` step. It spawns this
  server, speaks MCP to it over stdio (including the shared `initialize` probes in
  `packages/engine/mcp-handshake-probes.ts`), drives its socket with a hand-rolled client (fragmented,
  64-bit-length, ping, unmasked and disconnect cases), then connects the real relay to the real
  `main.ts` and proves a `figma_run` reaches the panel's own handler. Its pairing arms run the server
  on a secret the test writes itself, so the token is derived there independently, and include the
  review's reproduction: a web page in Chromium whose sandboxed iframe opens the socket, refused.

**Not yet verified live:** that Figma's desktop app lets the plugin's iframe open
`ws://localhost:17331` from `allowedDomains`, in a development import and in the org-private
published build (the owner's Phase 1 live checks on #3147). Confirm this on the first run: switch the link on
with the server running, then check that `figma_status` reports `connected: true`.
