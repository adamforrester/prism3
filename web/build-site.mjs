/**
 * Site build (#104). Produces the directory Vercel publishes.
 *
 * `npm run build` emits web/dist/ for local use, but the deployable root is a directory
 * *containing* dist/ — index.html loads `/dist/main.js` by absolute path. Publishing web/
 * itself would expose DESIGN-REVIEW.md at the site root (the sourcemap ships source deliberately),
 * so this assembles a clean web/public/ holding only the three files the site actually needs.
 *
 * index.html is copied VERBATIM: its absolute `/dist/main.js` resolves identically under
 * esbuild's `--servedir=.` locally and under Vercel's output root. One file, two hosts, no
 * host-conditional path logic.
 *
 * Vercel runs this via the root vercel.json buildCommand. Run: `node build-site.mjs`
 * (or `npm run build:site`).
 */
import { build } from 'esbuild';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
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

// Same flags as the `build` script — the deployed bundle must be the one we develop against.
await build({
  entryPoints: [resolve(root, 'src/main.ts')],
  outdir: resolve(pub, 'dist'),
  bundle: true,
  format: 'esm',
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: JSON.stringify(buildId) },
  sourcemap: true,
  logLevel: 'info',
});

// Verbatim copy — see the header comment on why the path must not be rewritten.
await cp(resolve(root, 'index.html'), resolve(pub, 'index.html'));

// Enforce the manifest rather than assume it. index.html is copied verbatim and references
// only /dist/main.js, so an emitted-but-unreferenced asset (add a CSS import to src/main.ts
// and esbuild writes dist/main.css) would deploy a broken site on a green build.
const EXPECTED = ['dist/main.js', 'dist/main.js.map', 'index.html'];
const found = (await readdir(pub, { recursive: true, withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => relative(pub, resolve(e.parentPath, e.name)).split('\\').join('/'))
  .sort();
const unexpected = found.filter((f) => !EXPECTED.includes(f));
const missing = EXPECTED.filter((f) => !found.includes(f));
if (unexpected.length || missing.length) {
  console.error('site build FAILED — web/public/ does not match the publishable manifest.');
  if (missing.length) console.error(`  missing:    ${missing.join(', ')}`);
  if (unexpected.length) console.error(`  unexpected: ${unexpected.join(', ')}`);
  console.error('  If this is an intended new asset, reference it from index.html and add it here.');
  process.exit(1);
}

console.log(`site build complete → web/public/ (${found.join(', ')})`);
