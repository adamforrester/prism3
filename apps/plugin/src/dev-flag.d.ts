/**
 * `PRISM3_DEV` (#2530, owner Q239 A): the build-time define that separates a dev build from a release build.
 * `build.mjs` sets it `true` in `dist/` (what every lane imports) and `false` in `release/`, where esbuild drops every
 * `if (PRISM3_DEV)` branch. Dev-only code sits behind it: any dev command (`run-code`). The desktop bridge relay sat here
 * until #3147, which moved it behind `PRISM3_NETWORK` so it ships in the network build.
 * `lint-release-bundle.ts` checks the release bundles carry none of it. A test that imports a module reading it sets
 * `globalThis.PRISM3_DEV`, the way the tests set `PRISM3_BUILD`.
 */
declare const PRISM3_DEV: boolean;
