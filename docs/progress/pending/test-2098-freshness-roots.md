## (2026-10-04) — test:chrome's stale-bundle check also watches the plugin's build script and its prose strip (#2098 item 1)

**STATUS: branch `test/2098-freshness-roots`, PR #2110 open.** Test harness only: no product code changes, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. Part of #2098.

**What was wrong.** The browser suites refuse to start on a bundle older than its sources, so they never test an old UI. Since #2102 they share one check, `assertBundleFresh` in `apps/studio/test-bundle-freshness.mjs`, over literal source directories. Three build scripts shape a bundle from outside every directory, so an edit to any of them let a stale bundle through:
- `apps/plugin/build.mjs`, for `apps/plugin/dist/ui.html`;
- `apps/plugin/strip-maintainer-prose.mjs`, which that build runs over component prose, also for `ui.html`;
- `apps/studio/build.mjs`, which sets `main.js`'s defines.

**What changed.**
- A root may now be one file. It is compared as itself, and a missing one fails by name, as an empty directory does (docs/34 shape 9).
- `PLUGIN_UI_SOURCE_ROOTS` gains the plugin's two files, and `STUDIO_SOURCE_ROOTS` gains `apps/studio/build.mjs`. So `test-smoke.mjs` is covered too.
- The build's other inputs were already covered. The chrome CSS plugin both builds import is under `apps/studio/chrome`, and `src/ui/index.html` is under `apps/plugin/src`.

This PR's first version added an inline check to `test-chrome.mjs`. #2102 replaced that check with the shared module, so the inline edit was dropped in the merge.

**Mutations, each failing by name (exit 1):**
- `touch apps/plugin/build.mjs`, no rebuild → `✗ ui.html freshness: apps/plugin/dist/ui.html is older than apps/plugin/build.mjs`.
- `touch apps/plugin/strip-maintainer-prose.mjs` → the same line, naming that file.
- `touch apps/studio/build.mjs` → `✗ main.js freshness: apps/studio/dist/main.js is older than apps/studio/build.mjs`, from both `test-chrome.mjs` and `test-smoke.mjs`.
- A root renamed to `apps/plugin/build-gone.mjs` → `✗ ui.html freshness: source root apps/plugin/build-gone.mjs is missing or holds no files`.

**Controls.**
- With `main`'s roots and `build.mjs` touched, the check passes. That is the stale case getting through before this PR.
- With the file-root arm removed, a file root refuses as "holds no files". That is the behavior #2110's review found on `main`.

**Trap for whoever re-verifies this.** Each touch leaves its bundle older than the file, so the next run refuses. Rebuild that bundle before running anything else.
