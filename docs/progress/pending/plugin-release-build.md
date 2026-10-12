## (2026-10-12) — Plugin: a release build with no dev-only code, and the gate that proves it (#2530, Q239 A, PR 1 of 2)

**STATUS: branch `plugin/release-build`.** Plugin build and gates only. No engine change, no committed artifact moves, no ENGINE bump. `CONTRACT_VERSION` unchanged. It's the first half of owner decision Q239 A; PR 2 adds the dev-only "run code" command behind the same flag.

**What it adds:**
- **`npm run -w @prism3/plugin build:release`** writes `apps/plugin/release/` (gitignored), next to `dist/`:
  - `main.js` and `ui.html`, built with `PRISM3_DEV` false;
  - `manifest.json`: the plugin's own, with the bundle paths beside it and no `devAllowedDomains`.
- **`dist/`, the dev build every lane imports, is unchanged** except that it now defines `PRISM3_DEV: true`.
- **The first dev-only code behind the flag** is the agent link's desktop bridge relay (`agent-link-ui.ts`). Its one origin, `ws://localhost:17331`, is listed only under `devAllowedDomains`, which Figma honours only for a development import. So in a release it could only fail. The mailbox transport stays in both builds.
- **`apps/plugin/lint-release-bundle.ts`**, wired into CI and `verify.ts`:
  - each dev-only marker, authored in the gate (docs/34), must be **found in `dist/`**, so it names real code, and **absent from `release/`**;
  - `release/manifest.json` must be `manifest.json` with only the bundle paths and `devAllowedDomains` changed, and `allowedDomains` must be `["none"]`, written as a literal.
- **`lint-sandbox-reject.ts` now scans both `main.js` files**, and fails if either is missing.

**The diagnosis that decided the shape: esbuild without minification keeps a dead branch's text.** `PRISM3_DEV ? createBridgeRelay(…) : null`, and the same as `if (PRISM3_DEV) { … }`, built to `false ? …` / `if (false) { … }`. The call still referenced the module, so tree-shaking kept it: the first release `ui.html` still had `BRIDGE_PORT = 17331` and the relay's factory.
- The studio's deployed build lives with this. `test-prod-bundle.ts` accepts its hook's name once, as the dead body under `if (false) {`.
- For a release, "carries no dev code" should mean absent, not unreachable. So the release build alone sets **`minifySyntax`**, which folds the dead branch away, and tree-shaking then drops the module.
- It's syntax only, with no renaming and no whitespace change. Measured: the release `main.js` is 16,893 lines to the dev build's 21,388, with no `if (false)` left, and it still passes the sandbox scan.
- **The tradeoff, stated:** the release bundles are not byte-for-byte the dev bundles less the dev code. The browser suites drive `dist/` only.

**Mutations, each from a `wip:` commit, rebuilt, failing by name:**
- **the relay's `if (PRISM3_DEV)` guard removed:** `✗ [bridge-relay-url] is absent from release/ui.html` and `✗ [bridge-relay] is absent from release/ui.html`;
- **`minifySyntax` dropped from the release build:** the same two;
- **the manifest's `delete … devAllowedDomains` removed:** `✗ release/manifest.json carries no devAllowedDomains` and the manifest-shape arm;
- **the relay's factory renamed in the source:** `✗ [bridge-relay] is in the dev build's dist/ui.html, so its absence from a release means something`. A stale marker fails rather than checking for code nobody writes.

**For PR 2:** the run-code command and its handler go behind `PRISM3_DEV`, and their markers join `DEV_ONLY` (in `main.js` as well as `ui.html`).
