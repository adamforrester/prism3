/**
 * The studio's `build` and `dev` (UI redesign S1.1, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.1). Both used to be esbuild CLI calls in `package.json`, and the CLI cannot load a plugin. The
 * bundle now needs one: `src/entry.ts` imports the chrome stylesheet from the virtual module
 * `p3:chrome-css`, which `chrome/esbuild-plugin.mjs` generates from the default theme at bundle time.
 *
 *   node build.mjs          → dist/main.js + dist/main.js.map   (`npm run build`)
 *   node build.mjs --dev    → serves this directory on 127.0.0.1:5173, rebuilding per request (`npm run dev`),
 *                             and `docs/public/` at `/docs/` (#2637)
 *
 * The flags are the CLI's, unchanged: same entry and output name, `format: 'esm'`, `.css` as TEXT
 * (#769), the two defines, a sourcemap for `build` only. Every other esbuild entry that bundles
 * `src/` carries the same plugin: `build-site.mjs`, `vercel-ignore-check.mjs` and
 * `apps/plugin/build.mjs`. One that forgets it fails at bundle time, because nothing else can resolve
 * `p3:chrome-css`.
 */
import * as esbuild from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, request } from 'node:http';
import { chromeCss } from './chrome/esbuild-plugin.mjs';
import { serveDocs } from './docs-route.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');

const options = {
  entryPoints: [{ in: resolve(root, 'src/entry.ts'), out: 'main' }],
  outdir: resolve(root, 'dist'),
  bundle: true,
  format: 'esm',
  loader: { '.css': 'text' },
  // PRISM3_TEST_HOOKS (#2098): `true` only here, the local `dist/` the smoke suite drives. `build-site.mjs`, the
  // deployed bundle, says `false`, so `?p3-test-hooks` cannot turn the hook on in production (`test-prod-bundle.ts`).
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: "'local'", PRISM3_TEST_HOOKS: 'true', PRISM3_NETWORK: 'true' },   // PRISM3_NETWORK: the web may load web fonts (#3138)
  plugins: [chromeCss()],
  logLevel: 'info',
};

if (dev) {
  // esbuild serves this directory on an internal port; the front server on 5173 answers `/docs` from
  // `docs/public/` (#2637, `docs-route.mjs`) and passes every other request through, unchanged.
  const ctx = await esbuild.context(options);
  const inner = await ctx.serve({ servedir: root, host: '127.0.0.1', port: 0 });
  const front = createServer((req, res) => {
    if (serveDocs(req, res)) return;
    const up = request({ host: inner.host, port: inner.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.on('error', (e) => { res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); res.end(`dev server: ${e.message}\n`); });
    req.pipe(up);
  });
  front.listen(5173, '127.0.0.1', () => console.log('studio dev server → http://127.0.0.1:5173/ (docs at /docs/llms.txt)'));
} else {
  await esbuild.build({ ...options, sourcemap: true });
}
