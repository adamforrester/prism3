## (2026-10-30) — Desktop bridge: a reconnect mid-run no longer loses the result (#2497)

**Status:** transport only: `apps/plugin/src/agent-bridge-relay.ts`, `tools/figma-bridge/server.ts`, the gate
`apps/plugin/test-agent-bridge.ts`, the bridge README. ENGINE patch (change note). CONTRACT unchanged.
`AGENT_PROTOCOL_VERSION` stays 1. No executor change, so `EXECUTOR_REVISION` stays. Phase 1 of #3147 depends on
this (owner decisions on #3147, 2026-10-30, build order step 2).

### What changed

- **Relay (plugin side).** The commands it delivered survive a lost socket; only switching the link off forgets
  them. It keeps the last 8 results by command id, even ones it sent, because a socket can read OPEN and still be
  dead. On every connect its `hello` carries `held` (ids running or kept) and it re-sends every kept result.
- **Server.** A disconnect no longer fails the call in flight. The call waits `--grace-ms` (default 120000) for the
  plugin to return; `figma_status.awaitingReconnect` lists the ids. At the new connection's `hello`, a held id is
  adopted and an unheld one fails with the reason (it never arrived, or the plugin reloaded). A result resolves its
  call once, by id; a repeat is logged as `a repeated result, already delivered: ignored`. Commands are never
  re-sent, so nothing runs twice.
- **Why the protocol stays at 1:** the command and result envelopes are unchanged. The only wire addition is the
  optional `held` on the relay's `hello`, a server↔relay message outside the envelope. An older relay sends no
  `held`, and the server then fails the orphaned call at the hello, as it did before.

### Gate

`test-agent-bridge.ts` gains `resend/hand` (hand-rolled client: drop without a close frame, reconnect holding the id,
the result sent twice → the MCP call answered once, the command not re-sent, the repeat logged) and `resend/e2e`
(the real relay and the real `main.ts`: a `run-code` that waits 800 ms, the socket dropped at once and kept down until
the main thread has answered → the result arrives after reconnect, exactly one MCP reply, one run). The server now
runs with `--grace-ms 3000` in the test, and `disconnect` asserts the failure names the grace.

Mutations, each failing by name:
- relay re-send removed → `resend/e2e: the result arrives after the reconnect` (timeout);
- relay forgets its commands on a lost socket (the old `mine.clear()`) → the same arm (fails at the hello);
- server ignores `held` → `resend/hand: the re-sent result is the call's answer`, `… logged as a repeat`, and `resend/e2e`.

### Not verified live

The trigger in #2497 (the iframe missing the socket while the main thread is busy) is still not reproduced against
Figma desktop. A drop longer than the grace still fails the call; the plugin's link record keeps the headline.
