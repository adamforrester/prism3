## (2026-11-10) — docs/inventory/surfaces.md: the desktop bridge ships in the network release (#3514)

Docs only, no behavior change.

- **Transport B's label.** The agent-link transports table called the desktop bridge "dev build only". Since #3147
  Phase 1 the relay sits behind `PRISM3_NETWORK`, so it ships in "Prism3 Studio" (`release/`) and is absent only from
  "Prism3 Studio Offline" (`release-offline/`). The row now reads "dev and network builds; not the offline build".
- **The same claim in the builds paragraph.** The paragraph under the builds table still listed the relay as dev-only
  code that `lint-release-bundle.ts` checks is absent from `release/`. It now splits the gate's markers the way the gate
  does: `DEV_ONLY` (`run-code`, `(0, eval)`, absent from both releases), `NETWORK_ONLY` (the relay's port and factory,
  and since #3218 the pairing-token key, absent from the offline build only), and the two manifest checks.
- **Left for the drift issue:** the manifest table above that paragraph (`allowedDomains: ["none"]`, no permissions)
  and the builds table (no offline build) predate #2879 and #3138. They are a separate fix, filed with this lane's
  README drift scan.
