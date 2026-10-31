---
engine: patch
---
The desktop bridge keeps a command's result across a plugin reconnect (#2497). A long command, such as a minutes-long
update-components apply, used to fail with "the plugin reconnected while this command was running" while the plugin
finished it anyway, so the result envelope was lost. The plugin's relay (apps/plugin/src/agent-bridge-relay.ts) now keeps
the commands it delivered across a lost socket and its last 8 results by command id. On every connect its hello names the
ids it holds, and it re-sends the kept results. The bridge server (tools/figma-bridge/server.ts) keeps a call waiting for up
to --grace-ms (default 120000) after a disconnect, answers it with the first result that carries its id and logs a repeat
as ignored. It never re-sends a command, so nothing runs twice. A command the reconnected plugin does not hold fails at
the hello with that reason. The wire gains only the optional hello field `held`; the command and result envelopes are
unchanged, so AGENT_PROTOCOL_VERSION stays 1. No committed artifact or component surface moves, and CONTRACT is unchanged.
