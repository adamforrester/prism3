---
engine: patch
---
The desktop bridge ships in the network build, "Prism3 Studio" (#3147 Phase 1). The agent link's relay
(apps/plugin/src/agent-bridge-relay.ts) moved from behind PRISM3_DEV to behind PRISM3_NETWORK, so it is in the dev
build and in release/, and absent from "Prism3 Studio Offline" (release-offline/), which offers the file mailbox only.
The plugin manifest lists ws://localhost:17331 in allowedDomains, with a reasoning that names the local connection, and
no devAllowedDomains. A connection to the bridge server (tools/figma-bridge/server.ts) becomes the plugin only by
proving a pairing token (#3204, Q3204.1 A): the server issues a one-time code only on demand (a figma_status call while no plugin is
connected, or a --pair start), live for 10 minutes, with at most 3 codes retired by wrong guesses before pairing closes
until the next request (Q3204.5 A). The plugin asks for it once
per machine and keeps the token in figma.clientStorage, and every later connection answers the server's challenge with
an HMAC of the token. The secret behind the token is kept in a user-only file, and --rotate replaces it. The server
still refuses, with 403 before the handshake, an upgrade whose Origin is not "null", and binds to loopback only, as
defense in depth. The Activity drawer's link word names the transport: "Listening · bridge" or "Listening · mailbox",
and "Listening · mailbox only" in "Prism3 Studio Offline". The run-code command stays dev-only. AGENT_PROTOCOL_VERSION stays 1. No committed artifact or
component surface moves, and CONTRACT is unchanged.
