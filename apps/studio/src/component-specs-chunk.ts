/**
 * THE COMPONENT SPECS EXPORTER, ONE MODULE FOR BOTH HOSTS (#3425, #3429).
 *
 * The Export dialog's Component specs artifact: the engine's component-defs export for the brand on screen, with the
 * brand's component settings resolved, published as the component contracts with a compatibility copy under the old name
 * (#1325), then the same as a Specs components set. It is computed from the definitions.
 *
 * - The plugin bundles this module into its iframe and provides the exporter before the studio boots
 *   (`apps/plugin/src/ui/component-specs-export.ts`).
 * - The web (owner decision C on #3429) builds it as its OWN bundle, `dist/component-specs.js`, and loads it only when
 *   Download is clicked (`src/web-component-specs.ts`). It is the one place the web carries a definition:
 *   `test-shell-imports.ts` holds the source to that, and `vercel-ignore-check.mjs` the built output.
 *
 * Nothing in the studio imports this module statically.
 */
import { componentDefs, componentDefsFileNames, exportComponentDefs, toSpecsComponents } from '@prism3/engine/components';
import type { ComponentSpecsExporter } from './state/component-specs-export';

export const specsExporter: ComponentSpecsExporter = {
  // #1325 (Q-CC1 A): the contract-named file first, then its compatibility copy under the old name, for one release.
  fileNames: (slug) => { const n = componentDefsFileNames(slug); return [n.contracts, n.defs, n.specs]; },
  files: (input, slug) => {
    const doc = exportComponentDefs(componentDefs, { brand: input });
    const n = componentDefsFileNames(slug);
    const text = JSON.stringify(doc, null, 2) + '\n';
    return [
      { name: n.contracts, text },
      { name: n.defs, text },
      { name: n.specs, text: JSON.stringify(toSpecsComponents(doc), null, 2) + '\n' },
    ];
  },
};
