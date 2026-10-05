## (2026-10-05) — UI: the smoke suite's test hook is gated on a build define and left out of the deployed bundle (#2098 item 3)

**STATUS: branch `ui/2098-test-hooks-prod`. Part of #2098 (item 3, from the review of #2074).** UI build and studio
tests only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged, no visible
wording.

**The defect.** `entry.ts` step 8 defines `window.__prism3TestEdit` when the page is opened with `?p3-test-hooks`, so
`test-smoke.mjs` §2d can make an edit no control makes any more. The block shipped in the production web bundle too,
so anyone could turn it on in the deployed Studio with a URL.

**The fix: a build define.** `PRISM3_TEST_HOOKS` (declared in `prism3-host.d.ts`) is `true` only in `build.mjs`, the
local `dist/` the smoke suite drives, and `false` in `build-site.mjs` (Vercel's build command),
`vercel-ignore-check.mjs` (which describes the deployed bundle) and `apps/plugin/build.mjs` (the hook was already
web-only; the define is there so no bare identifier is left). Step 8's condition reads it before the URL.

**What "the prod bundle lacks it" means, measured.** esbuild without minification folds the gate to `if (false) { … }`
but keeps the block's text. The deploy does not minify, and `build-site.mjs`'s header says it must match the local
build it is developed against, so this PR does not turn minification on to delete the text. The result in the
deployed `main.js`: the string `p3-test-hooks` is gone (nothing a visitor sends can turn the hook on), and
`__prism3TestEdit` appears once, as the body of the dead `if (false)` branch. The deployed sourcemap still carries
`entry.ts`'s source text, as it always has (`build-site.mjs` ships the source deliberately); that is not code that runs.

**The test, and why it is independent (docs/34).** `apps/studio/test-prod-bundle.ts` (in `npm test`) runs the real
`build-site.mjs` as a child process and reads the `public/dist/main.js` it writes, so it never restates the build's
options. Its oracle is two literal strings. It first asserts both still appear in `entry.ts`'s code (comments
stripped), so a renamed parameter can't make the absence check vacuous; then that the deployed bundle has no
`p3-test-hooks`, and no `__prism3TestEdit` anywhere but directly under `if (false) {`. The smoke suite (§2d)
separately holds the local `dist/` to having the hook.

**Mutations, each failing by name:** `PRISM3_TEST_HOOKS: 'false'` → `'true'` in `build-site.mjs` → `the deployed
bundle (build-site.mjs) carries no "p3-test-hooks"` and `… carries no reachable "__prism3TestEdit"`; the
`PRISM3_TEST_HOOKS &&` clause removed from `entry.ts` → the same two.
