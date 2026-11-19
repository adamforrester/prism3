## (2026-11-18) — The web Studio downloads the component specs from an on-demand chunk (#3429)

**What.** Owner decision C on #3429: the web Studio exports the component specs, loading the definitions and the
exporter as a separate chunk only when Download component specs is clicked. Until now the web drew the artifact off
("In the Figma plugin: …"), because the web bundle carries no definition by rule.

- **One exporter, two hosts.** `apps/studio/src/component-specs-chunk.ts` is the exporter the plugin used to define in
  its iframe entry, moved unchanged; the plugin now provides it from there.
- **The chunk.** The web builds (`build.mjs`, `build-site.mjs`) write two outputs from one esbuild call, configured in
  `apps/studio/component-specs-build.mjs`: `dist/main.js` from the new `src/web-entry.ts`, and
  `dist/component-specs.js` from the chunk module. A small resolve plugin leaves the one specifier
  `./component-specs-chunk.js` as a run-time `import("./component-specs.js")` in main, so the chunk is never bundled
  into it. The chunk runs the plugin's maintainer-prose strip (#1623), as the plugin's bundle does.
- **The loader.** `src/web-component-specs.ts`, imported first by `src/web-entry.ts`, provides the file names at once
  (from `componentDefsFileNames`, now in an import-free engine module, `component-defs-names.ts`, re-exported by
  `@prism3/engine`) and the exporter on demand. `src/entry.ts`, which the plugin bundles into its one offline file, never
  reaches it.
- **The rule still holds.** `test-shell-imports.ts` walks the web entry's static graph and holds it to no definition,
  one run-time import (the loader's), the chunk as the carrier, and the plugin path clear of the loader.
  `vercel-ignore-check.mjs` builds both outputs and reads each on its own: no definition bytes in `main.js`, Button's
  among the chunk's, no third output, and the run-time import present. `build-site.mjs`'s publish manifest lists the
  chunk and its map.
- **The chunk's strip and deploy trigger (review).** A new CI step in the studio job, `lint-bundle-prose.ts --web`, reads
  `dist/component-specs.js` against the real definitions with the plugin gate's three arms: no `notes` or `codeOnly`
  prose, no Prism 2, every summary. Dropping the strip from `build.mjs` fails it ("A component-specs.js: maintainer text
  from icon.notes.contested[0] shipped"). `vercel-ignore.sh` now lists `apps/plugin/strip-maintainer-prose.mjs`, which
  `build-site.mjs` runs over the deployed chunk, and `vercel-ignore-check.mjs` holds a change to it alone to BUILD.

**Measured.** `apps/studio/dist/main.js` (the `build.mjs` output, against the same `main`): 1,747,681 bytes before,
1,748,861 after (+1,180, the loader and the names module); gzipped 515,205 → 515,572 (+367). The chunk is 1,465,501
bytes (376,614 gzipped). `test-smoke.mjs` #3429, per corpus brand on the web: Download component specs is on, the chunk
is requested on the click and not before, and the three files parse (the contracts, their compatibility copy, the same
bytes, and the Specs projection) and hold the same components, Button and List item among them. On main the arm fails "#3429 prism3: on the web, Download component specs is on". Mutations that fail by
name: the resolve plugin dropped from `build.mjs` (the chunk inlined into a 2.9 MB `main.js`) fails "#3429 <brand>: the
component specs chunk is requested on the click, not before (before 0, after 0)"; a static import of the chunk module
from `main.ts` fails `test-shell-imports.ts` "#3429 the web entry's static graph does not reach
src/component-specs-chunk.ts" and `vercel-ignore-check.mjs` "web bundle carries no component definition module".

**The file names.** #1325 (Q-CC1 A) landed on main while this was being built: the export is published as
`<brand>.component-contracts.json`, with `<brand>.component-defs.json` as a compatibility copy for one release, then the
Specs projection. The web downloads the same three, from the same exporter, and `componentDefsFileNames` moved into the
import-free module with the two stems it uses.

**Held for the owner.** A chunk that fails to load downloads nothing and logs it; the dialog has no words for it, which
is copy for the owner.
