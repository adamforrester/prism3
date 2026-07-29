/**
 * Site build (#104). Produces the directory Vercel publishes.
 *
 * `npm run build` emits web/dist/ for local use, but the deployable root is a directory
 * *containing* dist/ — index.html loads `/dist/main.js` by absolute path. Publishing web/
 * itself would expose src/main.ts and DESIGN-REVIEW.md at the site root, so this assembles a
 * clean web/public/ holding only the three files the site actually needs.
 *
 * index.html is copied VERBATIM: its absolute `/dist/main.js` resolves identically under
 * esbuild's `--servedir=.` locally and under Vercel's output root. One file, two hosts, no
 * host-conditional path logic.
 *
 * Vercel runs this via the root vercel.json buildCommand. Run: `node build-site.mjs`
 * (or `npm run build:site`).
 */
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = resolve(root, 'public');

// Clean first — a stale file from a previous build must never survive into a deploy.
await rm(pub, { recursive: true, force: true });
await mkdir(pub, { recursive: true });

// Same flags as the `build` script — the deployed bundle must be the one we develop against.
await build({
  entryPoints: [resolve(root, 'src/main.ts')],
  outdir: resolve(pub, 'dist'),
  bundle: true,
  format: 'esm',
  define: { PRISM3_HOST: "'web'" },
  sourcemap: true,
  logLevel: 'info',
});

// Verbatim copy — see the header comment on why the path must not be rewritten.
await cp(resolve(root, 'index.html'), resolve(pub, 'index.html'));

console.log('site build complete → web/public/ (index.html + dist/main.js + .map)');
