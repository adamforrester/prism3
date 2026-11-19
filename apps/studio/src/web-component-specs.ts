/**
 * THE WEB'S COMPONENT SPECS LOADER (#3429, owner decision C).
 *
 * The web bundle carries no component definition (`test-shell-imports.ts`, `vercel-ignore-check.mjs`), so the web
 * Studio loads the exporter as a separate chunk, `dist/component-specs.js`, only when Download component specs is
 * clicked. The file names come now, from the engine's import-free `componentDefsFileNames`, so the dialog can list them
 * before anything loads.
 *
 * `./component-specs-chunk.js` is NOT bundled into `main.js`: the web builds resolve this one specifier to the sibling
 * chunk file and leave it to load at run time (`component-specs-build.mjs`). Typecheck resolves it to the `.ts` source.
 * Only the web entry (`web-entry.ts`) imports this module; the plugin, which bundles one offline file, never does.
 */
import { componentDefsFileNames } from '@prism3/engine';
import { provideComponentSpecsLoader } from './state/component-specs-export';

provideComponentSpecsLoader({
  // The chunk's own order (#1325): the contracts, their compatibility copy, then the Specs projection.
  fileNames: (slug) => { const n = componentDefsFileNames(slug); return [n.contracts, n.defs, n.specs]; },
  load: async () => (await import('./component-specs-chunk.js')).specsExporter,
});
