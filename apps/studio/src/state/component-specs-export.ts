/**
 * EXPORT COMPONENT SPECS (#3425, owner decision Q45 A) — the slot the Export dialog's Component specs artifact reads.
 *
 * The export is the engine's component-defs export for the brand on screen (`@prism3/engine/component-defs-export`):
 * every component definition with the brand's component settings resolved, and the same as a Specs components set. It
 * is computed from the definitions, and the web bundle carries none (`test-shell-imports.ts` holds that in the source,
 * `vercel-ignore-check.mjs` on the built bundle). So, like the component catalog (`component-catalog.ts`), the plugin's
 * iframe entry computes it from the definitions it bundles and PROVIDES it here before the studio boots
 * (`apps/plugin/src/ui/component-specs-export.ts`).
 *
 * The web (#3429, owner decision C) provides a LOADER instead: the file names now, from the engine's import-free
 * `componentDefsFileNames`, and the exporter later, from a separate chunk (`dist/component-specs.js`, built from
 * `src/component-specs-chunk.ts`) that the web entry loads only when Download is clicked (`src/web-component-specs.ts`).
 * The main bundle still carries no definition; the chunk is the one carrier. With neither, the dialog draws the
 * artifact off, with the reason (`main.ts`, `SPECS_WEB_OFF`).
 *
 * Types only from the engine: nothing here reaches a definition at run time.
 */
import type { BrandInput } from '@prism3/engine';

export type ComponentSpecsExporter = {
  /** The files' names for a brand slug, before anything is computed (the dialog lists them). */
  fileNames: (slug: string) => string[];
  /** The files for the brand on screen: the component contracts, their compatibility copy (#1325), then the Specs projection. */
  files: (input: BrandInput, slug: string) => { name: string; text: string }[];
};

/** The web's on-demand exporter (#3429): the file names at once, the exporter from the chunk when asked. */
export type ComponentSpecsLoader = {
  fileNames: (slug: string) => string[];
  load: () => Promise<ComponentSpecsExporter>;
};

let provided: ComponentSpecsExporter | null = null;
let loader: ComponentSpecsLoader | null = null;
/** Called once by the plugin's iframe entry, before the studio evaluates. Never by the web. */
export const provideComponentSpecsExporter = (e: ComponentSpecsExporter): void => { provided = e; };
/** Called once by the web entry, before the studio evaluates (#3429). Never by the plugin. */
export const provideComponentSpecsLoader = (l: ComponentSpecsLoader): void => { loader = l; };
/** The exporter in hand: the plugin's, or the web's once its chunk has loaded; `null` before that, or with neither. */
export const componentSpecsExporter = (): ComponentSpecsExporter | null => provided;
/** The files' names, from whichever the host provided, or `null` when it provided neither. */
export const componentSpecsFileNames = (slug: string): string[] | null => (provided ?? loader)?.fileNames(slug) ?? null;
/** The exporter: the plugin's at once, the web's once its chunk has loaded (kept after the first load), or `null`. */
export const loadComponentSpecsExporter = async (): Promise<ComponentSpecsExporter | null> => {
  if (!provided && loader) provided = await loader.load();
  return provided;
};
