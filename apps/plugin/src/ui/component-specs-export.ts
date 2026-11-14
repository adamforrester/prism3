/**
 * The plugin's Export component specs (#3425): computed here, in the iframe entry, from the definitions the plugin
 * bundles, and provided to the shared studio UI before it boots (`entry.ts` imports this module first), the same way
 * `component-catalog.ts` provides the catalog. Only the plugin build reads this entry, so the definitions cannot reach
 * the web bundle. The export is the engine's own function, the one `regen`, the CLI and MCP write theirs with.
 */
import { componentDefs, componentDefsFileNames, exportComponentDefs, toSpecsComponents } from '@prism3/engine/components';
import { provideComponentSpecsExporter } from '../../../studio/src/state/component-specs-export';

provideComponentSpecsExporter({
  fileNames: (slug) => { const n = componentDefsFileNames(slug); return [n.defs, n.specs]; },
  files: (input, slug) => {
    const doc = exportComponentDefs(componentDefs, { brand: input });
    const n = componentDefsFileNames(slug);
    return [
      { name: n.defs, text: JSON.stringify(doc, null, 2) + '\n' },
      { name: n.specs, text: JSON.stringify(toSpecsComponents(doc), null, 2) + '\n' },
    ];
  },
});
