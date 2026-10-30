## (2026-10-30) — Two plugin builds, and a brand face the preview can't show, said (#3138, #3140)

**Status:** plugin build and manifests, a new gate (`lint-network-reach.ts`), the studio's font helpers and five
preview sections, the plugin's font list, the engine's serif tail. ENGINE minor (change note): the example brand's
serif faces move to the serif tail. CONTRACT unchanged: no token is renamed or added.

### What changed

- **The owner's network model (Q2's replacement): two plugins from one codebase.** `build:release` now builds
  "Prism3 Studio" (`release/`, `allowedDomains` exactly the two Google Fonts hosts, no `*`) and "Prism3 Studio Offline"
  (`release-offline/`, `["none"]`), with distinct names and ids so both load at once. `--offline` is a release variant:
  `PRISM3_NETWORK` false, and `manifest-offline.json` supplies the name, id and `networkAccess`. Each manifest's
  `reasoning` says what is sent where, and so does a line at the foot of the Inspect menu.
- **The gates.** `lint-network-reach.ts` (new, in ci.yml, verify.ts, CONTRIBUTING §3, CLAUDE.md and the PR template):
  the offline bundles carry no request primitive and no allowed host; every host the network bundles name is a listed
  domain or a reference-only host with its reason; the manifests carry their names, ids and domains. The `["none"]`
  literal in `lint-release-bundle.ts` moved to the offline build, and both releases are held to the dev-only markers.
  `lint-sandbox-reject.ts` scans the offline `main.js` too.
- **Q1 A:** a line whose face can't load here says so ("shown in a fallback face"); the web studio and the network
  plugin first ask Google Fonts for it (`ui/web-fonts.ts`). **Q3 A:** a face shown without the asked cut draws the
  nearest real cut with `font-synthesis: none`, plus a note. **Q4 A:** the plugin's `font-list` carries style names, so
  the Type settings weight control names the cuts a family has and the weights with none. **Q5 A:** the drafted strings.
- **#3140, Q3138.6 A:** `font-class.ts`, a curated family-name map; a known serif family takes the serif tail.

### Worth knowing

- **esbuild tree-shakes before it drops a dead branch.** The loader's URL first lived in a module constant, then in a
  helper; both survived into the offline bundle with the host in them, because the dead `PRISM3_NETWORK` branch still
  named them when tree-shaking ran. The gate failed on each, by name. The URL is now written inside the gated branch.
- **A failed request logs a console error.** The browser suites count those, so every suite's browser answers the
  Google Fonts hosts with an empty stylesheet (`apps/studio/test-web-fonts-stub.mjs`): the loader reads "not on Google
  Fonts", exactly as offline, and a run never depends on the runner's network. §3138 serves its own fixture.
- **"A face the device already paints" depends on the device.** §3138 first asserted the loader never asks for Inter.
  CI has no Inter installed, and the chrome registers its embedded copy under an alias (`chrome/tokens.mjs`), so a
  brand's Inter is rightly asked of Google there. The arm now reads which families the device painted (CDP, in the web
  arm) and holds the loader to never asking for one of those.
- **CDP reports a variable face by its named instance** (`Inter Medium`), so §3138 compares the drawn name's head.
- **The Google Fonts CSS API (`/css`, not `/css2`)** answers a request for all eighteen cuts with the ones that exist,
  so one request per family also tells the preview the family's cuts.
- **Q3138.7 and Q3138.8** (on #3138): the plugins are named "Prism3 Studio" and "Prism3 Studio Offline", keeping the
  2026-10-04 product name, and the network build keeps the existing id; the privacy line's words are DRAFT, and it
  sits just above the Inspect menu's build stamp, because C3 A keeps the stamp last.
- **Q3138.9:** the owner's 2026-10-02 rule (no "face" in visible copy, held by `test:chrome`) beat the drafted
  "shown in a fallback face"; the notes say "fallback font".
- **A new `styles.css` rule needs a `lint:live-css` re-sweep to accept,** so the type sample's note sets its small
  text inline instead. `chrome.css` refuses raw lengths (`32ch`): its values are tokens.
