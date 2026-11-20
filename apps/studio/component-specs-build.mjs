/**
 * THE WEB'S COMPONENT SPECS CHUNK, AS THE BUILDS SHARE IT (#3429, owner decision C).
 *
 * The web Studio's main bundle carries no component definition. The Component specs export needs them, so the web
 * builds them as a second, self-contained bundle, `dist/component-specs.js`, which `src/web-component-specs.ts` loads
 * with `import()` only when Download is clicked. Read by `build.mjs`, `build-site.mjs` and `vercel-ignore-check.mjs`,
 * so the dev build, the deployed build and the bundle check draw the same two outputs.
 *
 * - `WEB_ENTRY_POINTS`: `main` from `src/web-entry.ts`, and `component-specs` from `src/component-specs-chunk.ts`.
 * - `specsChunkExternal`: the one specifier `./component-specs-chunk.js`, imported only by `src/web-component-specs.ts`,
 *   is left as a run-time `import("./component-specs.js")` instead of being bundled into main. The two outputs sit side
 *   by side in `dist/`, so the relative path holds wherever `dist/` is served.
 * - `maintainerProsePlugin`: the plugin's own transform (#1623), so the definitions' maintainer prose stays out of this
 *   bundle as it stays out of the plugin's.
 */
import { resolve } from 'node:path';
import { maintainerProsePlugin } from '../plugin/strip-maintainer-prose.mjs';

export const SPECS_CHUNK_SPECIFIER = './component-specs-chunk.js';
export const SPECS_CHUNK_FILE = 'component-specs.js';

export const webEntryPoints = (root) => [
  { in: resolve(root, 'src/web-entry.ts'), out: 'main' },
  { in: resolve(root, 'src/component-specs-chunk.ts'), out: 'component-specs' },
];

export const specsChunkExternal = () => ({
  name: 'p3:component-specs-chunk',
  setup(build) {
    build.onResolve({ filter: /^\.\/component-specs-chunk\.js$/ }, (args) =>
      /[\\/]src[\\/]web-component-specs\.ts$/.test(args.importer) ? { path: `./${SPECS_CHUNK_FILE}`, external: true } : undefined);
  },
});

export { maintainerProsePlugin };
