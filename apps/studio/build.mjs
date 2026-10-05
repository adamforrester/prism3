/**
 * The studio's `build` and `dev` (UI redesign S1.1, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.1). Both used to be esbuild CLI calls in `package.json`, and the CLI cannot load a plugin. The
 * bundle now needs one: `src/entry.ts` imports the chrome stylesheet from the virtual module
 * `p3:chrome-css`, which `chrome/esbuild-plugin.mjs` generates from the default theme at bundle time.
 *
 *   node build.mjs          → dist/main.js + dist/main.js.map   (`npm run build`)
 *   node build.mjs --dev    → serves this directory on 127.0.0.1:5173, rebuilding per request (`npm run dev`)
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
import { chromeCss } from './chrome/esbuild-plugin.mjs';

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
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: "'local'", PRISM3_TEST_HOOKS: 'true' },
  plugins: [chromeCss()],
  logLevel: 'info',
};

if (dev) {
  const ctx = await esbuild.context(options);
  const { host, port } = await ctx.serve({ servedir: root, host: '127.0.0.1', port: 5173 });
  console.log(`studio dev server → http://${host}:${port}/`);
} else {
  await esbuild.build({ ...options, sourcemap: true });
}
