## (2026-11-01) — The offline plugin's main thread drops the bridge token plumbing (#3218)

**Status:** plugin build and one gate. A follow-up to #3204 (the bridge's pairing), which shipped the plumbing this
removes from the offline build. ENGINE patch (change note): no committed artifact, token or component surface moves, CONTRACT is
unchanged, and `EXECUTOR_REVISION` stays (no executor code moves).

### What changed

- **`build.mjs`'s main-thread entry takes `PRISM3_NETWORK`**, as the UI entry has since #3138: `true` in `dist/` and
  `release/`, `false` in `release-offline/`. The offline variant already built its own `main.js`, so this is one define.
- **`main.ts` guards the three uses of the token** (`sendBridgeToken` on `ui-ready`, and the `agent-bridge-paired` /
  `agent-bridge-unpaired` handlers) on `(typeof PRISM3_NETWORK !== 'boolean' || PRISM3_NETWORK)`, written out at each
  site. Under the offline define it folds to `false`, esbuild drops the branches, and the key and `sendBridgeToken` go
  as unused. The `typeof` arm is the tsx harnesses' fallback: the 14 that import `main.ts` set no `PRISM3_NETWORK`,
  and read as the network build, so none needed an edit.
- **`network-flag.d.ts`** declares the define for the main-thread typecheck context. The UI context already has it
  from `apps/studio/src/prism3-host.d.ts`, which the main context does not compile.
- **`lint-release-bundle.ts` gains `[bridge-token]`**, a `NETWORK_ONLY` marker on `main.js`: in `dist/` and `release/`,
  absent from `release-offline/`.

### Trap

A guard read from a `const` (`const BRIDGE = typeof PRISM3_NETWORK === 'boolean' ? PRISM3_NETWORK : true`) does not
work. esbuild folds the `typeof`, to `BRIDGE = !1`, but does not inline the const, so every branch and the key stay in
the offline bundle. The first try did that, and the new marker caught it. The offline `main.js` still carries the
two message names as empty `case` labels. They hold no token code, and the marker reads the key, not the names.

### Gates

Mutations, each failing by name:
- the three guards replaced with `true` → `[bridge-token] is absent from release-offline/main.js`;
- `PRISM3_NETWORK` dropped from the main entry's define only → the same one arm (the fallback reads it as the network
  build).

`test-agent-bridge.ts` (139 assertions, its `pair/relay` arm reading and writing the token through `main.ts`) and
`test-theme-pref.ts` pass unchanged.
