---
engine: patch
---
The desktop bridge ships in the network build, "Prism3 Studio" (#3147 Phase 1). The agent link's relay
(apps/plugin/src/agent-bridge-relay.ts) moved from behind PRISM3_DEV to behind PRISM3_NETWORK, so it is in the dev
build and in release/, and absent from "Prism3 Studio Offline" (release-offline/), which offers the file mailbox only.
The plugin manifest lists ws://localhost:17331 in allowedDomains, with a reasoning that names the local connection, and
no devAllowedDomains. The bridge server (tools/figma-bridge/server.ts) refuses, with 403 and before the handshake, a
WebSocket upgrade whose Origin is not the plugin iframe's ("null"); it still binds to loopback only, and there is no
pairing (Q3147.2 A revised). The Activity drawer's link word names the transport: "Listening · bridge" or
"Listening · mailbox". The run-code command stays dev-only. AGENT_PROTOCOL_VERSION stays 1. No committed artifact or
component surface moves, and CONTRACT is unchanged.
