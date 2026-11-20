/**
 * The plugin's Export component specs (#3425): computed here, in the iframe entry, from the definitions the plugin
 * bundles, and provided to the shared studio UI before it boots (`entry.ts` imports this module first), the same way
 * `component-catalog.ts` provides the catalog. The exporter itself is `apps/studio/src/component-specs-chunk.ts`, the
 * module the web loads as its on-demand chunk (#3429), so both hosts export through one function: the engine's own,
 * the one `regen`, the CLI and MCP write theirs with.
 */
import { specsExporter } from '../../../studio/src/component-specs-chunk';
import { provideComponentSpecsExporter } from '../../../studio/src/state/component-specs-export';

provideComponentSpecsExporter(specsExporter);
