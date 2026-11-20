/**
 * Site build (#104). Produces the directory Vercel publishes.
 *
 * `npm run build` emits apps/studio/dist/ for local use, but the deployable root is a directory
 * *containing* dist/ — index.html loads `/dist/main.js` by absolute path. Publishing web/
 * itself would expose DESIGN-REVIEW.md at the site root (the sourcemap ships source deliberately),
 * so this assembles a clean apps/studio/public/ holding only the three files the site actually needs,
 * plus the repo's `docs/public/` at `public/docs/`, served at `/docs` (#2637), a page drawn from each guide's
 * markdown at `public/docs/guides/<name>.html` (#3176), and each hosted brand's shadcn registry item at `public/r/<brand>.json`,
 * served at `/r/<brand>.json` so `npx shadcn add https://<site>/r/<brand>.json` installs it (#2997, Q2997.19 A, #4373).
 *
 * index.html is copied VERBATIM: its absolute `/dist/main.js` resolves identically under
 * esbuild's `--servedir=.` locally and under Vercel's output root. One file, two hosts, no
 * host-conditional path logic.
 *
 * Vercel runs this via the root vercel.json buildCommand. Run: `node build-site.mjs`
 * (or `npm run build:site`).
 */
import { build } from 'esbuild';
import { chromeCss } from './chrome/esbuild-plugin.mjs';
import { webEntryPoints, specsChunkExternal, maintainerProsePlugin, SPECS_CHUNK_FILE } from './component-specs-build.mjs';
import { DOCS_DIR, REQUIRED_DOCS, docsFiles, guidePages } from './docs-route.mjs';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = resolve(root, 'public');

// Clean first — a stale file from a previous build must never survive into a deploy.
await rm(pub, { recursive: true, force: true });
await mkdir(pub, { recursive: true });

// The commit this bundle was built from, rendered in the rail so the live page states its own
// identity (#474). Vercel sets VERCEL_GIT_COMMIT_SHA; a local `npm run build:site` has no commit
// to claim and says so rather than inventing one.
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'local';

// Same options as `build.mjs` — the deployed bundle must be the one we develop against — but for the two marked below.
// `loader` included: `src/entry.ts` imports `src/styles.css` as TEXT (#769), and esbuild's DEFAULT
// `.css` loader would instead emit a `dist/main.css` nothing references — which is precisely the
// unreferenced-asset case the manifest below exists to catch, so the two are wired to agree.
await build({
  // `out: 'main'` keeps the file index.html loads at `/dist/main.js`. Its entry is `src/web-entry.ts` (#3429), which
  // boots `src/entry.ts` (#896); the component specs chunk is the second output, loaded only on Download.
  entryPoints: webEntryPoints(root),
  outdir: resolve(pub, 'dist'),
  bundle: true,
  format: 'esm',
  loader: { '.css': 'text' },
  // `src/entry.ts` imports the virtual `p3:chrome-css` (UI redesign S1.1); only this plugin resolves it.
  plugins: [chromeCss(), specsChunkExternal(), maintainerProsePlugin],
  // PRISM3_TEST_HOOKS is `false` here, and only `build.mjs` (the local `dist/`) says `true` (#2098): the deployed
  // bundle carries no test hook at all, which `test-prod-bundle.ts` checks by running this file. One of two options
  // that differ from `build.mjs` on purpose, beside PRISM3_BUILD; `minify` below is the other.
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: JSON.stringify(buildId), PRISM3_TEST_HOOKS: 'false', PRISM3_NETWORK: 'true' },
  // Minified (#4231): the public page shipped every comment and all the whitespace, 1.75 MB / 516 KB gzip. The other
  // option that differs from `build.mjs` on purpose: the local `dist/` stays unminified, so the smoke and chrome suites'
  // stack traces and DOM hooks read as before. The source map ships, so a deployed stack trace still maps to source.
  // `test-size-budget.ts` (apps/plugin) holds this file's gzip size to its ceiling.
  minify: true,
  sourcemap: true,
  logLevel: 'info',
});

// Verbatim copy — see the header comment on why the path must not be rewritten.
await cp(resolve(root, 'index.html'), resolve(pub, 'index.html'));

// `/docs` (#2637): `docs/public/` copied whole, the same files the dev server answers from (`docs-route.mjs`).
const DOCS = docsFiles();
const missingDocs = REQUIRED_DOCS.filter((f) => !DOCS.includes(f));
if (missingDocs.length) {
  console.error(`site build FAILED — docs/public/ is missing ${missingDocs.join(', ')}, which /docs promises.`);
  process.exit(1);
}
await cp(DOCS_DIR, resolve(pub, 'docs'), { recursive: true, filter: (src) => !src.split(/[\\/]/).pop().startsWith('_') });
// The guide pages (#3176, Q3176.3 A): drawn from each `guides/<name>.md` by the same function the dev server answers
// with, so `/docs/guides/<name>.html` is the same bytes on both. Not committed: the `.md` stays canonical.
const GUIDES = guidePages();
for (const g of GUIDES) await writeFile(resolve(pub, 'docs', g.path), g.html);

// `/r/<brand>.json` (#2997, Q2997.19 A): each HOSTED brand's shadcn registry item, the committed regen artifact
// `packages/engine/out/shadcn/<brand>.registry-item.json`, copied as is, so the site serves the exact bytes `regen --check`
// holds and `npx shadcn add https://<site>/r/<brand>.json` installs that brand's theme. Copied, never re-emitted: the
// engine owns the file and this build only places it. Vercel's ignored build step already rebuilds on any
// `packages/engine/**` change (`vercel-ignore.sh`), so a regenerated item redeploys. `test-shadcn-registry.ts` holds
// the built copies to `out/`, byte for byte.
//
// HOSTED is an allow-list, never "every item in out/shadcn/" (owner decision on #4373, 2026-11-20): the house brand and
// the engine's made-up example brands only. The reference brand and any other real-brand fixture keep their registry
// items in the repo as test fixtures and get no public install address. A brand added to the engine is therefore not
// hosted until it is named here, and `test-shadcn-registry.ts` fails if any brand outside its own copy of this list
// reaches `public/r/`.
const HOSTED = ['aurora', 'harbor', 'prism3'];
const REGISTRY_SRC = resolve(root, '../../packages/engine/out/shadcn');
const REGISTRY_SUFFIX = '.registry-item.json';
const REGISTRY = HOSTED.map((b) => ({ from: resolve(REGISTRY_SRC, `${b}${REGISTRY_SUFFIX}`), path: `r/${b}.json` }));
const unemitted = HOSTED.filter((b) => !existsSync(resolve(REGISTRY_SRC, `${b}${REGISTRY_SUFFIX}`)));
if (unemitted.length) {
  console.error(`site build FAILED — ${relative(root, REGISTRY_SRC)} has no *${REGISTRY_SUFFIX} for ${unemitted.join(', ')}, which /r/ promises.`);
  process.exit(1);
}
await mkdir(resolve(pub, 'r'), { recursive: true });
for (const item of REGISTRY) await cp(item.from, resolve(pub, item.path));

// Enforce the manifest rather than assume it. index.html is copied verbatim and references
// only /dist/main.js, so an emitted-but-unreferenced asset would deploy a broken site on a green
// build. THE EXAMPLE THIS COMMENT USED TO GIVE IS NOW LIVE: `src/entry.ts` does import a CSS file
// (#769). It is loaded as TEXT and travels inside main.js, so the expected set is unchanged — and
// this check is what stands between a dropped `loader` above and a deployed page with no styles at
// all. `build:site` is NOT in ci.yml (it runs on Vercel's preview deploy), so run it by hand.
// The docs are listed from `docs/public/` itself, so this checks the copy landed whole, not which docs exist.
// The component specs chunk (#3429) is the one other script: `main.js` loads it on Download, never index.html.
const EXPECTED = ['dist/main.js', 'dist/main.js.map', `dist/${SPECS_CHUNK_FILE}`, `dist/${SPECS_CHUNK_FILE}.map`, 'index.html', ...DOCS.map((f) => `docs/${f}`), ...GUIDES.map((g) => `docs/${g.path}`), ...REGISTRY.map((item) => item.path)];
const found = (await readdir(pub, { recursive: true, withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => relative(pub, resolve(e.parentPath, e.name)).split('\\').join('/'))
  .sort();
const unexpected = found.filter((f) => !EXPECTED.includes(f));
const missing = EXPECTED.filter((f) => !found.includes(f));
if (unexpected.length || missing.length) {
  console.error('site build FAILED — apps/studio/public/ does not match the publishable manifest.');
  if (missing.length) console.error(`  missing:    ${missing.join(', ')}`);
  if (unexpected.length) console.error(`  unexpected: ${unexpected.join(', ')}`);
  console.error('  If this is an intended new asset, reference it from index.html and add it here.');
  process.exit(1);
}

console.log(`site build complete → apps/studio/public/ (${found.join(', ')})`);
