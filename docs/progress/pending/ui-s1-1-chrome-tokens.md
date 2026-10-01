## (2026-10-01) — UI redesign S1.1: chrome token pipeline and embedded fonts

**STATUS: PR open from `ui/s1-1-chrome-tokens`.** UI and build only. No engine change and no emitted artifact moves, so no ENGINE bump, and `CONTRACT_VERSION` is unchanged. Nothing on screen changes: the opening page renders pixel-identical before and after, and only the two chrome fonts become available. The spec is `docs/superpowers/ui-redesign/implementation-plan.md` §3.1 and §3.2.

**What moved.**
- `docs/superpowers/ui-redesign/chrome-tokens.mjs` → `apps/studio/chrome/tokens.mjs` (`git mv`, the name §3.1 gives). Only the header and `FONTS_DIR` changed. The new directory sits at the same depth below the repo root, so `ROOT` did not move. Every export is kept.
- The two woff2 faces and their OFL licenses: `style-tiles/fonts/` → `apps/studio/chrome/fonts/`.
- `V6_VARS`, `VARS_FOR`, `ALIAS`, `PAIRS`, `LAYER_STEP` and `LAYERS` moved verbatim out of `build-v6.mjs` into `apps/studio/chrome/spec.mjs`. §3.1 names four; `VARS_FOR` and `ALIAS` came too, because the product needs the per-theme rows and the chrome-only font names, and a second copy of either would be a fork. `spec.mjs` adds one thing of the product's own: `SHELL_VARS`, the variable names the shipped chrome defines.
- `build-v6.mjs`, `build-v5.mjs` and `style-tiles/build-tiles.mjs` import from the new paths.

**How "nothing forked" was checked.** Each of the three mockups was rebuilt on this branch's base before any change, the outputs were copied aside, and each was rebuilt again after the move. `cmp` reports `concept-v6.html`, `concept-v5.html` and `style-tiles.html` byte-identical, and each build's console report matches line for line. Both runs fell on the same day, so even `builtAt` agrees.

**The plugin.** `apps/studio/chrome/esbuild-plugin.mjs` exports `chromeCss()`, which resolves the virtual import `p3:chrome-css` to text: the `--p3-*` blocks for `:root`/`[data-theme="light"]`, `[data-theme="dark"]` and `[data-theme="system"]` under `prefers-color-scheme`, the two `@font-face` rules as `data:` URIs under `P3 Chrome UI` and `P3 Chrome Mono`, then `apps/studio/src/chrome.css`. Each `SHELL_VARS` name is looked up in the mockup's own rows (`TILE_VARS`, then `V6_VARS`), so the product and the mockup cannot name different tokens for one variable. `src/entry.ts` imports it next to `styles.css`, and `installStyles` gets both in one string, so the class-scope law reads them as one sheet. `prism3-host.d.ts` declares the module.

The studio's `build` and `dev` moved from esbuild CLI calls into `apps/studio/build.mjs` (`dev` serves through an esbuild context), because the CLI cannot load a plugin. With the plugin left out, `build.mjs` reproduces the old CLI bundle and its sourcemap byte for byte, so the move changed nothing else. The plugin is also wired into `apps/plugin/build.mjs` (the UI build only; `main.js` never imports the studio entry), `build-site.mjs` and `vercel-ignore-check.mjs`.

**The checks, each failing the build by name.** The plugin runs v6's checks 4, 6, 7 and 10 on the CSS it produces, plus two for its inputs. Each failure is an esbuild error that starts `p3:chrome-css [<check>]`. Every mutation below ran after a commit, with its diff checked non-empty, and was restored afterward:

| Mutation | Fails with |
|---|---|
| `border-color: #fff` in `chrome.css` | `[raw] apps/studio/src/chrome.css: raw hex color "#fff"` |
| `text-2` added to `SHELL_VARS`, read nowhere | `[variables] mapped but unused variable --p3-text-2` |
| `TILE_VARS` `text` pointed at `color.text.brand` | `[brand] chrome var --p3-text (light) resolves through brand token pds3.color.text.brand`, and again for dark |
| the JetBrains Mono woff2 deleted | `[fonts] chrome font missing: apps/studio/chrome/fonts/jetbrains-mono-latin-wght-normal.woff2 (JetBrains Mono)`, in both the studio and plugin builds |
| `chromeCss()` dropped from each of the four bundlers in turn | `Could not resolve "p3:chrome-css"` in each: `build.mjs`, `apps/plugin/build.mjs`, `build-site.mjs`, `vercel-ignore-check.mjs` |
| `chrome.css` reads `var(--p3-bar-bg)` | `[variables] apps/studio/src/chrome.css: undefined variable --p3-bar-bg` |
| `chrome.css` sets a `url(https://…)` | `[offline] a url() that is not a data: URI` |
| `chrome.css` reads `var(--ink)` | `[raw] … reads --ink, which is not a chrome variable` |
| `SHELL_VARS` names `panel-bg`, which no row maps | `[map] SHELL_VARS names --p3-panel-bg, which no row … maps` |
| `.on { color: var(--p3-text); }` in `chrome.css` (a shared state keying a rule) | the build passes, and boot throws `'.on' key a top-level rule while listed as a shared state`, which proves the shell's sheet goes through the class-scope law |

The checks stay independent of what they check (docs/34). The subject is `chrome.css` and the generated text. The oracles are the scan patterns and `BRAND_RE` in `tokens.mjs`, the alias chain the engine's own tree resolves, and the literal map in `spec.mjs`. The unused check reads the map and asks the stylesheet; the undefined check reads the stylesheet and asks the map. Comments are stripped first, so a variable named only in a comment counts as unread.

**What S1.1 maps: the page ground, the text and the two fonts, as §3.1 says.** `.p3-frame` reads `--p3-bg-page`, `--p3-text` and `--p3-font-ui`; `.p3-value` reads `--p3-font-mono`. Nothing wears either class yet; the frame arrives in S1.2. These are rules with no element today, which this repo usually avoids (`styles.css` leaves `.te-font` alone for that reason). They exist here because the unused-variable check is on from this PR, and a variable needs a reader. The `p3-` scope is new, because `.shell` and `.chrome` are already legacy scopes in `styles.css`.

**Radius, decided by the owner 2026-10-01.** #1852 landed `radius.xl`, `2xl` and `3xl` (8, 12 and 16 at the default scale). The chrome uses `radius.xl` for containers (cards, panels, the drawer) and `radius.lg` for controls (fields, chips, buttons, segments). Both are mapped from the role tokens, never from dimension primitives, so they follow the radius lever. S1.1 maps neither, because it draws no container and no control, and the unused check would refuse them. The decision is recorded beside `SHELL_VARS` in `spec.mjs`. One thing for the slice that adds containers: the mockup's rows have `radius-lg` but no `radius.xl`, so that row becomes the product's own. `tokens.mjs`'s `TILE_VARS` comment still says "no radius above 6px until #1852"; it is left as is, because this PR changes only that module's header and `FONTS_DIR`.

**Neutral 025** is not mapped yet, since nothing draws the levers panel. When it is, it reads `core.palette.neutral.025` through the mockup's `levers-bg` row (D7). The UI lane files the engine role after this lands.

**Measured sizes.** Base is this branch's base commit; gzip is `gzip -c` (level 6), as in the plan.

| Bundle | Before | After | Growth | Gzipped before → after |
|---|---|---|---|---|
| `apps/studio/dist/main.js` | 1,002,567 B | 1,123,126 B | +120,559 B (+12.0%) | 298,456 → 389,569 B (+91,113) |
| `apps/plugin/dist/ui.html` | 1,254,812 B | 1,375,375 B | +120,563 B (+9.6%) | 342,634 → 435,458 B (+92,824) |
| `apps/plugin/dist/main.js` | 1,021,074 B | 1,021,074 B | none | unchanged |

§3.2 estimated +118,216 B of base64 fonts (+11.8% and +9.4%) and 89,428 B gzipped. The measured growth is the fonts plus 2,343 B: two variables in three theme blocks, the font variables, the generated comments and `chrome.css`. The plan's further "about 7.5 KB" is for the full variable map, which arrives slice by slice. `apps/plugin/dist` still holds only `main.js` and `ui.html`, with 0 `node:` builtins.

**What was confirmed in a browser.** The built studio bundle and the bundle from before the change were each served and opened in Chromium at 1280×900, on the start screen and then on the opening page after choosing an example. The full-page screenshots are byte-identical, the CDP `CSS.getPlatformFontsForNode` glyph tally over every element in `#app` is identical (DejaVu Sans 3,202, DejaVu Sans Mono 3,799, Liberation Sans 2), and the page still installs one `<style>`. A probe element carrying `.p3-frame` and `.p3-value` drew in Inter and JetBrains Mono (CDP), on white with `#0d0d0e` text, and `document.fonts` lists both chrome faces as loaded. No request left the page.

**Verify.** `npm run verify`: 67/67 gates PASS, 0 FAIL, 0 SKIP, in 839 s. Run separately on the new bundles, `lint-sandbox-reject`, `lint-bundle-prose`, `lint-us-english` and `lint-voice` pass.

**Review round (orchestrator's independent review, 2026-10-01).** Main was merged in at `b3a41bdf` (the `vercel-ignore-check.mjs` import conflict from #1901). Four findings were addressed in this PR rather than S1.2, because the code is this PR's.
- **Finding 1, the merged tree.** #1903 changed `packages/engine/out/`, which this build reads. On the merged tree the studio and plugin builds are green (`dist/main.js` keeps 0 `node:` builtins, `lint-sandbox-reject` clean), and the brand-leak check still fails by name: `TILE_VARS` `text` pointed at `color.text.link.default` gives `[brand] chrome var --p3-text (light) resolves through brand token pds3.color.text.link.default`, and again for dark.
- **Finding 3, the font license. The owner decided a notice is enough, not the full license text.** The notice now carries each face's copyright line, read from its `OFL-*.txt` beside the woff2 rather than typed into the template, plus the OFL 1.1 URL (https://openfontlicense.org). A new `[license]` check fails the build when either OFL file is missing or has no copyright line, and when the output has no comment line that carries both a face's copyright line and the URL. The check reads the license file, not the template, so editing the template cannot move the oracle with it.
- **Finding 4, the raw-value scan.** `chrome.css` now goes through `scanRawStrict` (`tokens.mjs`): RAW, plus CSS named colors (CSS Color 4's 148, as a literal list), `currentColor`, `var(--x, fallback)`, any `url()` that is not a `data:` URI (inside `image-set()` too), and a bare string source in `image-set()` that is not one. Named colors are matched in declaration values only, after quoted strings are dropped, so a class or property name such as `white-space` is not read as a color. `transparent`, `inherit`, `initial`, `unset` and `none` stay allowed. `currentColor` is refused: nothing needs it yet. The mockups keep `scanRaw` (RAW alone), so their builds do not move.
- **Finding 5, the declared pairs.** A new `[pairs]` check evaluates every `PAIRS` entry whose two variables are both in `SHELL_VARS`, in both themes, at its literal floor, with `tokens.mjs`'s alpha- and NaN-safe `ratio` (a refused ratio fails, it never passes). The floors are literals in `PAIRS`; the colors are the engine's emitted tokens. It also fails on a mapped color variable that takes part in no evaluated pair, unless it is listed in the new `DECORATIVE` (`spec.mjs`, empty today, each future entry to say why). It runs inside the build, so it needs no new CI step and `lint-doc-gates` is unaffected. Today it evaluates `text` on `bg-page` at 4.5 and at 3.

Each mutation ran after a `wip:` commit, with its diff checked non-empty, and was restored from `HEAD`:

| Mutation | Fails with |
|---|---|
| `OFL-Inter.txt` deleted | `[license] font license missing: apps/studio/chrome/fonts/OFL-Inter.txt (Inter)` (and `OFL-JetBrains-Mono.txt` in the plugin build, by the same name) |
| the notice stripped from the template | `[license] the bundled CSS carries no license notice for Inter (want "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)" and https://openfontlicense.org on one comment line)`, and the same for JetBrains Mono |
| `color: black` | `[raw] apps/studio/src/chrome.css: named color "black"` |
| `var(--p3-bg-page, white)` | `[raw] … var() fallback "var(--p3-bg-page, white)"` and `[raw] … named color "white"` |
| `image-set(url(https://x))` | `[raw] … url() that is not a data: URI "url(https://x)"` |
| `image-set("https://x" 1x)` | `[raw] … image-set() source that is not a data: URI "https://x"` |
| `border-color: currentColor` | `[raw] … currentColor "currentColor"` |
| M5: the dark overlay's `color.text.primary` set to neutral 950, the page ground | `[pairs] text on bg-page in dark: 1.00:1 < 4.5:1 (body text on the page)`, and `< 3:1` for the tab underline row |
| `line-1` mapped and read, in no pair | `[pairs] --p3-line-1 is a mapped color in no declared pair whose other side is mapped; declare one in PAIRS or list it in DECORATIVE (spec.mjs)` |

The bundle changes only in the notice comment's text. Nothing on screen moves.

**Traps for whoever re-verifies this.**
- **Do not compare a rebuilt mockup with the committed one.** The committed `concept-v6.html` and `concept-v5.html` are stale against the engine (they embed 0.217.0; this base builds 0.219.0), so a rebuild differs from the committed copy before anything moves. Compare a rebuild before the change with a rebuild after it, on the same tree.
- **CDP `getPlatformFontsForNode` on a container counts its descendants' text.** With a probe appended to `body`, `body` reported Inter while every legacy element drew in DejaVu. A font check must read leaf text nodes, which matters for S1.2's `test:chrome`.
- **The plugin reads `packages/engine/out/*.tokens.json` from disk**, so they never appear in esbuild's metafile. `vercel-ignore.sh` triggers on all of `packages/engine` except a list of `.ts` files, so a regen still triggers a deploy. The studio README's claim that `packages/engine/out/` is not read by the build is corrected.
- **`dev` re-reads `chrome.css`, the token JSON and the fonts on every rebuild** (`watchFiles`), but `spec.mjs` and `tokens.mjs` are ES modules loaded once per process. Restart `dev` after editing either.
- **Nothing sets `data-theme` yet.** The generated `:root` block sets `color-scheme: light`, which is what both hosts already render, so the dark blocks are inert until S1.2's toggle and the plugin's `figma-dark` mapping set the attribute.

**Held for the owner, not decided here.**
- **`font-display: block`** came across from the mockup unchanged. With `data:` faces there is nothing to wait for over the network, but the choice ships in the product now.

**No longer deferred.** The declared pairs are now checked in the build (the review round above), so `lint:contrast` does not need extending for them. Today's one product pair is `text` on `bg-page` (19.42:1 light, 18.13:1 dark).
