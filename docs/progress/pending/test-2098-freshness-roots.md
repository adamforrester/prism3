## (2026-10-04) — test:chrome's stale-bundle check also watches the plugin's build script and its prose strip (#2098 item 1)

**STATUS: branch `test/2098-freshness-roots`, PR open.** Test harness only: no product code changes, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. Part of #2098.

**What was wrong.** `test-chrome.mjs` refuses to start when `apps/plugin/dist/ui.html` is older than its inputs, so the figma host never tests an old UI. It compared only four directories (`UI_SOURCE_ROOTS`). `apps/plugin/build.mjs` and `apps/plugin/strip-maintainer-prose.mjs`, which the build runs over component prose, shape the bundle but sit in none of them. An edit to either passed the check with a stale bundle.

**What changed.** A literal `UI_SOURCE_FILES` list holds the two files, compared alongside the roots. The build's other inputs were already covered:
- the chrome CSS plugin it imports is under `apps/studio/chrome`;
- the HTML shell it reads is under `apps/plugin/src`.

A listed file that is missing fails by name, for the same reason an empty root does (docs/34 shape 9): a renamed file would otherwise drop out of the comparison silently.

**Mutations, each failing by name:**
- `touch apps/plugin/build.mjs` with no rebuild → `✗ ui.html freshness: apps/plugin/dist/ui.html is older than …/apps/plugin/build.mjs`, exit 1;
- `touch apps/plugin/strip-maintainer-prose.mjs` → the same line, naming that file;
- an entry renamed to `build-gone.mjs` → `✗ ui.html freshness: source file apps/plugin/build-gone.mjs is missing, so it was not compared`.

The control is `UI_SOURCE_FILES = []` with `build.mjs` touched. The suite ran to completion, 15280/15280 assertions with no freshness line. That is the old check missing exactly this case.

**Trap for whoever re-verifies this.** Each touch leaves the bundle older than the file, so the next run refuses. Rebuild the plugin before running anything else.
