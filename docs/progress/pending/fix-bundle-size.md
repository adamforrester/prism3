## (2026-11-19) — The shipped bundles shrink, and a size budget holds them (#4231, #4232, #4233)

**STATUS: branch `fix/bundle-size`.** Studio site build, chrome CSS generation, plugin release build, one new gate. No engine change, no committed artifact moves, no ENGINE bump. `CONTRACT_VERSION` unchanged.

### Before and after (bytes; raw, and gzip -9 for the site)
| artifact | before | after |
|---|---|---|
| Studio site `main.js`, gzip | 518,918 | **394,924** (−24%) |
| plugin `release/main.js`, raw | 2,643,014 | **2,086,923** (−21%) |
| plugin `release/ui.html`, raw | 2,958,225 | **2,368,493** (−20%) |
| plugin `release-offline/ui.html`, raw | 2,941,755 | **2,355,882** (−20%) |
| generated chrome CSS, raw | 343,364 | **268,875** (−22%) |

### What changed
- **The site build minifies (#4231).** `build-site.mjs` sets `minify: true`. `build.mjs`, the local `dist/` that the smoke and chrome suites drive, does not, so their stack traces and hooks are unchanged. The source map still ships. `test-prod-bundle.ts` now asks for the test hook's name to be absent entirely. Before, an unminified deploy kept the dead `if (false)` branch's text, and the check allowed the name once there. A browser walk of the minified site (start screen, every Theme tab, Components, the specs download) logged no error.
- **`chrome.css`'s comments stay out of the shipped stylesheet (#4231).** `shippedRules()` in `chrome/esbuild-plugin.mjs` drops them, about 72 KB of the 213 KB file, after every check has read the file as written. A comment inside a JS string survives JS minification, so neither minifier ever reached them. The generated header and the font and icon license notices are not part of `chrome.css`, so they stay, and the `[license]` checks still hold them.
- **The release builds whitespace-minify (#4232).** `minifyWhitespace` is added beside #2530's `minifySyntax` in both release bundles. Names are kept, so a release stack trace names the same functions. **The tradeoff:** its line and column no longer match `dist/`. #2530's "no whitespace change" was a technical choice recorded in its entry, not the owner decision Q239 A, which is the release build itself. A release source map is filed in #4336.
- **A trap the minifier sprang:** `build.mjs`'s main-thread scan greps every line for `node:`, broad on purpose, so a false positive gets fixed in the source. Whitespace minifying printed `? node : null` in `update-plan.ts` as `?node:null`, and the release build failed. The local is renamed `child`. `lint-executor-revision` confirms the executor's code is unchanged.

### The budget, `apps/plugin/test-size-budget.ts` (in the plugin's `suites.json`)
- The ceilings are authored in `apps/plugin/size-budget.json`, marked **draft**. They are #4233's "after the minify issues land" numbers and the owner's to confirm. Today's sizes sit at 84–93% of them.
- The gate runs the real builds as child processes: `build-site.mjs`, `build.mjs --release` and `--release --offline` (with `CI=1`, as CI builds), plus `buildChromeCss()`. Each artifact is deleted before its build, so a failed build fails as a missing file and never as the last build's size.
- The artifacts are typed in the gate (`PROMISED`), not read from the budget file. An entry dropped from the file fails as unrepresented, and an extra one fails too. The comparison proves it can fail on a reading one byte over before it reads anything real.
- On main, all five rows fail.
- Mutations, each failing by name:
  - A 400 KB string constant in a module the UI renders fails `plugin-release-ui`, `plugin-offline-ui` and `studio-site-main` (`… is within its ceiling`).
  - `minifyWhitespace` removed from the main-thread build fails `plugin-release-main`.
  - The `chrome-css` entry deleted from the budget fails `chrome-css: size-budget.json gives it a ceiling`.
- **It reaches CI** through the plugin job's `test` step: `ci.yml` is not edited, and `run-suites.ts` runs every `suites.json` file.

Left open and filed in #4336: the release notes and provider marks in the main thread, the web chrome faces as separate files, a release source map, metafile diagnostics on a budget failure, and confirming the ceilings.
