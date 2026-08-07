/**
 * Plugin build (#107). Two esbuild bundles, one per context (docs/18 §1):
 *   • main.ts → dist/main.js   — the sandbox controller (manifest.main)
 *   • ui/ui.ts → inlined into dist/ui.html — the iframe (manifest.ui)
 *
 * The UI must be a SINGLE self-contained HTML file: a Figma plugin iframe has no server to
 * fetch a separate .js from (and we ship `allowedDomains:["none"]`), so the bundled JS is
 * inlined into a <script> in the HTML template. iife + no network — nothing loads at runtime.
 *
 * `--watch` keeps both rebuilding. Run: `node build.mjs` (or `npm run build` / `npm run watch`).
 */
import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, 'dist');
const watch = process.argv.includes('--watch');

const mainOpts = {
  entryPoints: [resolve(root, 'src/main.ts')],
  outfile: resolve(out, 'main.js'),
  bundle: true,
  format: 'iife',        // the sandbox is not an ES-module context
  target: 'es2020',
  logLevel: 'info',
};

// Bundle the UI to an in-memory JS string, then inline it into the HTML template.
// #110 — the UI IS the shared `studio/src/main.ts` (no fork): the same source the standalone web app
// bundles, built here with PRISM3_HOST='figma' so its commit path posts to the main thread instead
// of downloading. One UI, two outputs. The `../studio/src` engine imports are pure (node-free), so the
// iframe bundle stays self-contained + no-network like the placeholder did.
const WEB_UI = resolve(root, '../studio/src/main.ts');
const htmlTemplate = await readFile(resolve(root, 'src/ui/index.html'), 'utf8');
const buildUiHtml = async () => {
  const res = await build({
    entryPoints: [WEB_UI],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    // PRISM3_BUILD is required by every entry that bundles studio/src (#474) — an absent define leaves a
    // bare identifier that throws at load. The plugin ships inside a versioned manifest rather than
    // from a URL that can go stale, so it has no commit to claim here.
    define: { PRISM3_HOST: '"figma"', PRISM3_BUILD: '"plugin"' },
    write: false,
    logLevel: 'silent',
  });
  const js = res.outputFiles[0].text;
  // Replace the dev-only module script tag with the inlined bundle.
  // The replacement MUST be a function, not a string (#496). A replacement string interprets `$`
  // patterns, and the bundle legitimately contains `'\\$&'` — the standard regex-escape idiom, from
  // `root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` in the shared UI. As a string that `$&` expanded to
  // the MATCHED text, injecting a literal `</script>` mid-bundle and truncating the inlined script:
  // the panel rendered blank, on a build that exited 0 with both typechecks clean.
  const html = htmlTemplate.replace(
    /<script type="module" src="\.\/ui\.ts"><\/script>/,
    () => `<script>${js}</script>`,
  );
  // Assert what the corruption above violated, because nothing else can see it: `dist/` is a
  // gitignored artifact, so the bug lived only in the concatenated output — invisible to typecheck,
  // to lint, and to every source grep. A blank panel in Figma is now a failed build instead.
  const closers = html.split('</script>').length - 1;
  if (closers !== 1) {
    throw new Error(
      `apps/plugin/dist/ui.html: expected exactly 1 </script>, found ${closers}. The inlined bundle ` +
        `closed its own tag early, so the UI will render blank. See #496.`,
    );
  }
  if (html.includes('src="./ui.ts"')) {
    throw new Error('apps/plugin/dist/ui.html: the dev-only module tag survived into the build.');
  }
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'ui.html'), html);
  console.log('  dist/ui.html   (shared studio/src UI inlined, host=figma)');
};

if (watch) {
  const ctx = await context(mainOpts);
  await ctx.watch();
  await buildUiHtml();
  // esbuild's context watch covers main.js; rebuild the inlined UI on any src change — both the
  // plugin's own src (the shell/main-thread) AND the shared studio/src UI (the iframe entry).
  const { watch: fsWatch } = await import('node:fs');
  const rebuild = () => buildUiHtml().catch(console.error);
  fsWatch(resolve(root, 'src'), { recursive: true }, rebuild);
  fsWatch(resolve(root, '../studio/src'), { recursive: true }, rebuild);
  console.log('watching apps/plugin/src + studio/src …');
} else {
  await build(mainOpts);
  await buildUiHtml();
  console.log('plugin build complete → apps/plugin/dist/');
}
