/**
 * `PRISM3_NETWORK` for the MAIN-THREAD context (#3218). The UI context reads the same define from
 * `apps/studio/src/prism3-host.d.ts`, which this context does not compile (it is the shared UI's, written for a DOM). `build.mjs`
 * sets it on both entries: `true` in `dist/` and `release/`, `false` in the offline variant (`release-offline/`), where the
 * main thread's bridge-token plumbing drops. A test that imports `main.ts` may set `globalThis.PRISM3_NETWORK`; unset, `main.ts`
 * reads it as the network build.
 */
declare const PRISM3_NETWORK: boolean;
