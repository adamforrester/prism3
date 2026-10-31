## (2026-10-31) — Desktop bridge ships in the network build, with an origin check (#3147 Phase 1)

**Status:** transport and build only: `apps/plugin/src/agent-link-ui.ts` (the relay's gate and the link word),
`apps/plugin/manifest.json`, `tools/figma-bridge/server.ts`, and the gates `test-agent-bridge.ts`,
`test-agent-link.ts`, `test-manifest.ts`, `lint-release-bundle.ts`, `lint-network-reach.ts` and `test-chrome.mjs`
section 31. ENGINE patch (change note). CONTRACT unchanged. `AGENT_PROTOCOL_VERSION` stays 1. No executor change, so
`EXECUTOR_REVISION` stays. Step 3 of the owner's Phase 1 build order on #3147 (Q3147.2 A revised), after #3168 (the
two builds) and #3187 (#2497, results kept across a reconnect).

### What changed

- **Relay.** `if (PRISM3_DEV)` became `if (PRISM3_NETWORK)`. The relay ships in the dev build and "Prism3 Studio"
  (`release/`), and drops from "Prism3 Studio Offline" (`release-offline/`), which offers the mailbox only (Q3147.5 A).
- **Manifest.** `ws://localhost:17331` moved from `devAllowedDomains` to `allowedDomains` (Q3147.3 A: exactly the two
  Google Fonts hosts and the bridge). Figma's manifest docs allow a localhost domain in `allowedDomains` when a
  `reasoning` is given, so the reasoning now names the local connection. DRAFT wording for the owner. The manifest
  lists no `devAllowedDomains` any more; the release build still deletes the key if it comes back.
- **Origin check.** The server answers 403 before the handshake to any upgrade whose `Origin` is not `null`, the
  opaque origin of Figma's sandboxed plugin iframe. A request with no `Origin` is refused too. That is stricter
  than "refuse a web page", and the cost showed up at once: Node's own `WebSocket` sends no `Origin`, so the
  test's real-relay arm now sends `Origin: null` explicitly, as the iframe does. Loopback-only bind kept. No
  pairing (Q3147.2 A revised).
- **Link word.** The Activity drawer's bar-row word names the transport: "Listening · bridge" while the bridge is
  connected, otherwise "Listening · mailbox". DRAFT wording. The full line already named both.
- **No arbitrary code in a release** (Q3147.4 A). `run-code` stays behind `PRISM3_DEV`, and `lint-release-bundle.ts`
  still holds it absent from both releases.

### Gates

- `test-agent-bridge.ts` `origin/refused`: a web page's origin, a localhost page's, and none are each refused with
  403 and never become the plugin. Every other client sends `Origin: null`, so `handshake` is the accepted case.
- `lint-release-bundle.ts`: the relay's two markers moved from `DEV_ONLY` to a new `NETWORK_ONLY` list, which must be
  present in `dist/` and `release/` and absent from `release-offline/`. `run-code` stays in `DEV_ONLY`.
- `lint-network-reach.ts`: `ALLOWED`, the network manifest's list, is an authored literal with the bridge's origin
  in it, and `release/ui.html` must carry the relay's socket, so the offline build's lack of one means something.
- `test-manifest.ts`: the three domains as a literal, no `devAllowedDomains`, and a reasoning that names localhost.
- `test-agent-link.ts` `link/word-transport` and `test-chrome.mjs` section 31: the word, as literals.

### Trap for whoever re-verifies

`openClient(origin = 'null')` with an explicit `undefined` argument takes the default. The first draft of the
"no Origin" arm sent `Origin: null` and the server let it through, which looked like a server bug. The sentinel is
`null` now.

### Not verified live

Whether Figma desktop lets the iframe open `ws://localhost:17331` from `allowedDomains`, in a dev import and in the
org-private published build, and whether the iframe really sends `Origin: null`. Both are among the owner's Phase 1
live checks (Q3147.8 A). If the iframe sends something else, the server refuses it and `figma_status` stays
`connected: false`, so the failure is visible, not silent.
