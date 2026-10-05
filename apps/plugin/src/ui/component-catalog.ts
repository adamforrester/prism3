/**
 * The plugin's component catalog (UI redesign S8.1): computed here, in the iframe entry, from the definitions the
 * plugin bundles, and provided to the shared studio UI before it boots (`entry.ts` imports this module first).
 *
 * WHY HERE AND NOT IN THE STUDIO'S `main.ts`. The catalog used to be computed in `main.ts` behind
 * `PRISM3_HOST === 'figma'`, which removed the reference from the web bundle but not the definition modules it
 * imported: three of them (Button, IconButton and Icon) survived into `apps/studio/dist`, because their top-level code
 * is not provably side-effect-free. Imported from this entry, which only the plugin build reads, they cannot reach the
 * web bundle at all. The computation is the studio's (`catalogOf`), and the web reads the same function's output as
 * generated data (`apps/studio/gen-component-catalog.ts`).
 *
 * Computed ONCE: the definitions are compiled in and brand-invariant, so the catalog cannot change while the plugin
 * is running.
 */
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { catalogOf, provideCatalog, CATALOG_SWAP_TARGET } from '../../../studio/src/state/component-catalog';

provideCatalog(catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET })));
