## (2026-11-07) — Stale prose: the agent protocol's eval rule, docs/45's phase 3 status, the main thread's network (#2686, #2999)

### What changed

Prose only, no behavior change.

- **`apps/plugin/src/agent-protocol.ts` header (#2686.1).** "NO EVAL … nothing in an envelope is ever executed"
  predated #2544. A development build adds `run-code`, which runs its `code` in the main thread. The rule now holds
  for the release build only, and the header names the dev-only command, the `PRISM3_DEV` branch it sits behind and
  `lint-release-bundle.ts`, which checks it is absent from `release/`. `dev-commands.ts` already said so.
- **`docs/45` status line (#2686.2).** "Phase 3 specified here, not built" now says what shipped: border width and
  opacity (#2353), the Effect and Gradient style tables (#2584) and the Grids table (#3171), all in `PHASE_TYPES`.
  It also says what is still a later phase (`LATER_KIND`): motion, font style, paragraph spacing and indent, and
  effect or gradient variables.
- **`docs/18` §1 network row (#2999).** The main thread *has* a network global: Figma's own `fetch`, declared in
  `@figma/plugin-typings` 1.141.0 and documented as a global in Figma's reference. The row and the sentence under the
  table now say so, cited, and say that Prism3's main thread makes no request by design.
  `lint-network-reach.ts` asserts that over `release/main.js`. Whether the manifest's `allowedDomains` gates the
  main-thread `fetch` is written down as not checked live, rather than inferred from a page that names neither
  context.
- **The same claim, three more places.** `agent-bridge-relay.ts`, `apps/plugin/README.md` and
  `docs/inventory/surfaces.md` gave "the main thread has no network" as the reason the iframe holds the bridge's
  socket. The true reason is narrower: the main thread has no WebSocket (the typings declare none). Each now says
  that. The progress archive keeps its historical wording.
