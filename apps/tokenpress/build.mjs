/**
 * TokenPress build (port step 4). One esbuild bundle:
 *   • src/code.ts → dist/code.js   — the Figma sandbox controller (manifest.main)
 *
 * There is no second bundle: manifest.ui points at `src/ui.html`, which carries its own inline
 * script and is served as-authored. That is why this is 60 lines and apps/plugin/build.mjs is 95 —
 * TokenPress's UI never needed inlining.
 *
 * REPLACES vite.config.ts + vite.config.simple.ts. The repo runs one bundler (esbuild, as
 * apps/studio and apps/plugin do), and vite was the only thing pulling vite + vitest into the tree.
 * `--watch` keeps it rebuilding. Run: `node build.mjs` (or `npm run build` / `npm run dev`).
 *
 * Four things the vite config was doing had to be carried over deliberately rather than assumed,
 * because each is load-bearing and none is esbuild's default. They are ASSERTED below, not just
 * configured — the output is a gitignored artifact, so a silent regression here is visible nowhere
 * else (the same reasoning as apps/plugin/build.mjs's `</script>` check, #496).
 */
import { build, context } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

// 1. THE VERSION STAMP. exporter.ts writes `__PLUGIN_VERSION__` into every exported tree's
//    $extensions.generator.version. It is a bare identifier with no runtime declaration, so an
//    absent define does not warn — it ships a bundle that throws on first export. Read from
//    package.json, the same source vite's config read, so the two cannot drift.
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

const opts = {
  entryPoints: [resolve(root, 'src/code.ts')],
  outfile: resolve(root, 'dist/code.js'),
  bundle: true,
  // 2. FORMAT. The Figma sandbox is not an ES-module context; an `export` statement in the output
  //    is a load-time syntax error. vite got this from `formats: ['iife']`.
  format: 'iife',
  // 3. TARGET. The sandbox is not a modern browser engine. vite pinned es2018 and disabled
  //    minification with the note that esbuild "doesn't strictly respect ES2018" — so minify stays
  //    off here for exactly that reason, not by oversight.
  target: 'es2018',
  minify: false,
  sourcemap: false,
  define: { __PLUGIN_VERSION__: JSON.stringify(pkg.version) },
  // 4. THE setImmediate SHIM. jszip calls setImmediate, which the Figma sandbox does not provide;
  //    vite injected this via rollup's `output.intro`. It must run BEFORE any bundled code, so it
  //    goes in `banner`, not `footer` or a module.
  banner: {
    js:
      'var setImmediate = setImmediate || function(fn) { ' +
      'var args = Array.prototype.slice.call(arguments, 1); ' +
      'return setTimeout(function() { fn.apply(null, args); }, 0); };',
  },
  logLevel: 'info',
};

/** Assert the four properties above hold in what was actually written. */
const verify = async () => {
  const js = await readFile(opts.outfile, 'utf8');
  const fail = (msg) => {
    throw new Error(`apps/tokenpress/dist/code.js: ${msg}`);
  };
  if (js.includes('__PLUGIN_VERSION__')) {
    fail('__PLUGIN_VERSION__ survived unsubstituted — every export would throw on load.');
  }
  if (!js.includes(JSON.stringify(pkg.version))) {
    fail(`the version stamp ${pkg.version} is absent, so exported trees would carry no generator version.`);
  }
  if (/^\s*(?:export|import)\s/m.test(js)) {
    fail('an ES-module statement reached the output; the Figma sandbox cannot load it (format must be iife).');
  }
  // The check above cannot fail TODAY, and saying so is the point: src/code.ts exports nothing, so
  // flipping format to 'esm' produces a bundle with no export statement and that check stays green
  // (measured — it is what the build's own mutation check caught). The property that actually differs
  // between the two formats is the wrapper: iife encloses the body so its ~2000 top-level `var`s stay
  // out of the sandbox's shared global scope, and esm leaves them there. Assert the wrapper, and keep
  // the statement check for the day something here does start exporting.
  if (!/^"use strict";\n\(\(\) => \{/m.test(js)) {
    fail('the bundle is not wrapped in an IIFE, so its top-level declarations leak into the Figma sandbox global scope (format must be iife).');
  }
  if (!js.startsWith('var setImmediate')) {
    fail("the setImmediate shim is not first — jszip calls it during export and the sandbox has no such global.");
  }
  if (/\brequire\(["']node:/.test(js)) {
    fail('a node: builtin reached the output; nothing exists to resolve it inside Figma.');
  }
  console.log(`  dist/code.js   (iife, es2018, v${pkg.version} stamped, setImmediate shimmed)`);
};

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log('watching apps/tokenpress/src …');
} else {
  await build(opts);
  await verify();
  console.log('tokenpress build complete → apps/tokenpress/dist/');
}
