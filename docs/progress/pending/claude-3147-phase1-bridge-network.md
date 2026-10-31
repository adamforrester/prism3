## (2026-10-31) — Desktop bridge ships in the network build, with pairing (#3147 Phase 1)

**Status:** transport and build only: `apps/plugin/src/agent-link-ui.ts` (the relay's gate, the link word and the
pairing prompt), `apps/plugin/src/agent-bridge-relay.ts` and `bridge-auth.ts` (pairing), `apps/plugin/manifest.json`,
`tools/figma-bridge/server.ts`, and the gates `test-agent-bridge.ts`,
`test-agent-link.ts`, `test-manifest.ts`, `lint-release-bundle.ts`, `lint-network-reach.ts` and `test-chrome.mjs`
section 31. ENGINE patch (change note). CONTRACT unchanged. `AGENT_PROTOCOL_VERSION` stays 1. No executor change, so
`EXECUTOR_REVISION` stays. Step 3 of the owner's Phase 1 build order on #3147, after #3168 (the two builds) and #3187
(#2497, results kept across a reconnect). Pairing is Q3204.1 A, which supersedes Q3147.2 A (revised): the review of
#3204 showed that an `Origin: null` check does not keep web pages out.

### What changed

- **Relay.** `if (PRISM3_DEV)` became `if (PRISM3_NETWORK)`. The relay ships in the dev build and "Prism3 Studio"
  (`release/`), and drops from "Prism3 Studio Offline" (`release-offline/`), which offers the mailbox only (Q3147.5 A).
- **Manifest.** `ws://localhost:17331` moved from `devAllowedDomains` to `allowedDomains` (Q3147.3 A: exactly the two
  Google Fonts hosts and the bridge). Figma's manifest docs allow a localhost domain in `allowedDomains` when a
  `reasoning` is given, so the reasoning now names the local connection. DRAFT wording for the owner. The manifest
  lists no `devAllowedDomains` any more; the release build still deletes the key if it comes back.
- **Pairing (Q3204.1 A).** The server keeps a random secret in a user-only file (0600, under the user's config
  directory; `--rotate` replaces it) and prints a one-time code (8 characters from a 30-symbol alphabet with no
  look-alikes, about 39 bits) at each start; `figma_status` names it too. Every connection opens with a challenge.
  The plugin asks for the code once per machine, sends an HMAC of it over the nonce, and keeps the token it gets back
  in `figma.clientStorage`, never in the file. Each later hello carries an HMAC of the token over the nonce. A
  connection without a valid proof is closed (4401) before it is sent a command, and it never replaces a paired
  plugin. 5 wrong codes retire the code. The plugin's HMAC-SHA-256 is written in `bridge-auth.ts` (the iframe's
  opaque origin may have no `crypto.subtle`); the server uses `node:crypto`.
- **Origin check, now defense in depth.** The server answers 403 before the handshake to any upgrade whose `Origin`
  is not `null`; a request with no `Origin` is refused too. A page's sandboxed iframe sends `null` as well, so this
  check alone never kept web pages out: the pairing proof does. Node's own `WebSocket` sends no `Origin`, so the
  test's real-relay arm sends `Origin: null` explicitly, as the iframe does. Loopback-only bind kept.
- **Link word.** The Activity drawer's bar-row word names the transport: "Listening · bridge" while the bridge is
  connected, otherwise "Listening · mailbox"; "Prism3 Studio Offline" reads "Listening · mailbox only" (Q3204.2 A).
  The manifest reasoning, these words and the 403 body are approved (Q3204.3 A). The pairing prompt's words are DRAFT.
- **No arbitrary code in a release** (Q3147.4 A). `run-code` stays behind `PRISM3_DEV`, and `lint-release-bundle.ts`
  still holds it absent from both releases.

### Gates

- `test-agent-bridge.ts` `origin/refused`: a web page's origin, a localhost page's, and none are each refused with
  403 and never become the plugin. An `Origin: null` client with no token, and the review's page (a sandboxed iframe
  on an ordinary page, in Chromium), each pass the origin check and are closed with 4401, never become the plugin and
  never receive a command. `pair/*`: the secret file's mode and rotation, a wrong code refused, a paired plugin not
  evicted by an unpaired one, the real relay pairing with the printed code to the token the test derived itself from
  the secret it wrote, and the token never written to the file's plugin data. The plugin's shim tests now run after
  the Chromium install in `ci.yml`, since this arm drives a browser.
- `test-agent-link.ts` `link/word-offline`: the offline build's word.
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
`connected: false`, so the failure is visible, not silent. The pairing prompt has not been seen in Figma either.
