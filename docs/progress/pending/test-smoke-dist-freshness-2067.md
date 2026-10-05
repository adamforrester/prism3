## (2026-10-04) — every suite that drives the studio bundle refuses a stale one, naming the newer source (#2067)

**Status:** test and tooling only: `apps/studio`'s three browser suites, one shared module, and
`regen.ts --check`'s copies. No studio source or emitted change; no ENGINE bump.

### What changed

#2037 made `test-chrome.mjs` refuse a stale `apps/plugin/dist/ui.html`. The web host's bundle,
`apps/studio/dist/main.js`, had the same gap, and three suites drive it:
- `test-smoke.mjs` (`test:smoke`);
- `mode-audit.mjs` (a `verify` gate);
- `test-chrome.mjs`'s web arm.

A studio edit followed by a plugin-only rebuild left each one measuring the old UI.

The check now lives in one module, `apps/studio/test-bundle-freshness.mjs` (`assertBundleFresh`), with the
literal source roots per bundle (`STUDIO_SOURCE_ROOTS`, `PLUGIN_UI_SOURCE_ROOTS`). All three suites call it
for `main.js` at startup, before serving anything. `test-chrome.mjs`'s existing `ui.html` check moved onto the
same module, with the same roots and the same message, so the two can't drift.

### What the check found on its first CI run: `regen --check` moved every artifact's mtime

The first CI run failed with `✗ main.js freshness: apps/studio/dist/main.js is older than
packages/engine/icon-glyphs.ts`. Nothing had edited that file. `regen --check` regenerates every artifact in
place, compares the bytes, then restores its snapshot, and none of those copies kept timestamps. So a clean
check left `icon-glyphs.ts` (which compiles into both bundles), `schema/*` and `out/**` all newer than the
bundles. `verify.ts` runs `regen --check` before the builds, which is why local runs were green. ci.yml also
runs it after them, in the artifact-count step.

The fix is in the gate, not the check: every snapshot and restore copy now passes `preserveTimestamps: true`.
That makes the gate's own claim ("it reports, it never rewrites") true of mtimes too. Reordering ci.yml would
have left a hand-run `--check` after a build tripping the same refusal, and dropping generated files from
the roots would let a real `icon-glyphs.ts` change through.

**A trap for whoever re-verifies this:** the failure only shows when `regen --check` runs between a build and
a suite. `npm run verify` never orders it that way, so a green local verify says nothing about this case.

### Mutations

| Mutation | Result |
|---|---|
| touch `apps/studio/src/main.ts`, rebuild only the plugin | all three suites exit 1: `✗ main.js freshness: apps/studio/dist/main.js is older than apps/studio/src/main.ts, so this suite would test the old UI.` (`test-chrome.mjs`: "so the web host would test the old UI") |
| touch it, rebuild only the studio | `test-chrome.mjs` exits 1: `✗ ui.html freshness: apps/plugin/dist/ui.html is older than apps/studio/src/main.ts, so the figma host would test the old UI.`, as before the move |
| `regen.ts` without `preserveTimestamps`; build the studio, run `regen --check`, then the check | exit 1: `✗ main.js freshness: apps/studio/dist/main.js is older than packages/engine/icon-glyphs.ts, so this suite would test the old UI.`, CI's failure reproduced. With the fix: passes. |
| both bundles fresh | `test-smoke` starts its sweep; `mode-audit` completes with exit 0 |

### Not covered here

The plugin's `test-build-verdict.mjs` and `test-start-screen.mjs` drive `ui.html` with no check. They're out of
this issue's studio-bundle scope, so they're filed as #2101; the shared module makes each a one-line
call.
